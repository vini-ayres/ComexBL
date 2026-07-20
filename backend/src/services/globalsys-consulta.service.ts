import { isBlVersion, type BlVersion } from '../constants/bl-version.constants.js';
import { BadRequestError, NotFoundError } from '../errors/AppError.js';
import {
  mapBlNaoEncontradoDetail,
  mapBlNaoEncontradoListItem,
} from '../mappers/bl-nao-encontrado.mapper.js';
import { BlConsultaGlobalSysRepository } from '../repositories/bl-consulta-globalsys.repository.js';
import { BlHouseRepository } from '../repositories/bl-house.repository.js';
import { BlMasterRepository } from '../repositories/bl-master.repository.js';
import { BlNaoEncontradoRepository } from '../repositories/bl-nao-encontrado.repository.js';
import type {
  BlNaoEncontradoDetailDto,
  BlNaoEncontradoListResponse,
  GlobalSysConsultaResponseDto,
} from '../types/bl-nao-encontrado.types.js';
import type { BlDocumentType } from '../types/bl-domain.types.js';
import type { PaginationQuery } from '../types/bl.types.js';
import { buildPaginatedResult, getSkipTake } from '../utils/pagination.js';
import type { GlobalSysService } from './globalsys.service.js';

interface BlDocumentIdentity {
  documentType: BlDocumentType;
  documentNumber: string;
  blVersion: BlVersion;
}

export class GlobalSysConsultaService {
  constructor(
    private readonly localRepository: BlNaoEncontradoRepository,
    private readonly globalSysService: GlobalSysService,
    private readonly consultaRepository: BlConsultaGlobalSysRepository,
    private readonly masterRepository: BlMasterRepository,
    private readonly houseRepository: BlHouseRepository,
  ) {}

  async listNotFound(
    pagination: PaginationQuery,
  ): Promise<BlNaoEncontradoListResponse> {
    const rows = await this.localRepository.findQueueRows();
    const { skip, take } = getSkipTake(pagination);
    const pageRows = rows.slice(skip, skip + take);

    return buildPaginatedResult(
      pageRows.map(mapBlNaoEncontradoListItem),
      rows.length,
      pagination,
    );
  }

  async getNotFoundDetail(
    tipoParam: string,
    blId: number,
  ): Promise<BlNaoEncontradoDetailDto> {
    const tipo = this.parseTipo(tipoParam);
    const rows = await this.localRepository.findQueueRows();
    const row = rows.find((item) => item.tipo === tipo && item.blId === blId);

    if (!row) {
      throw new NotFoundError(
        'BL não encontrado na fila ou última consulta ao GlobalSys foi bem-sucedida',
      );
    }

    return mapBlNaoEncontradoDetail(row);
  }

  async consultar(
    tipoParam: string,
    blId: number,
  ): Promise<GlobalSysConsultaResponseDto> {
    return this.executarConsulta(tipoParam, blId);
  }

  async reprocessar(
    tipoParam: string,
    blId: number,
  ): Promise<GlobalSysConsultaResponseDto> {
    const tipo = this.parseTipo(tipoParam);
    const latestSuccess =
      tipo === 'Master'
        ? await this.consultaRepository.getLatestSuccessByMasterId(blId)
        : await this.consultaRepository.getLatestSuccessByHouseId(blId);

    if (latestSuccess === true) {
      throw new BadRequestError(
        'BL já localizado no GlobalSys na última consulta',
      );
    }

    return this.executarConsulta(tipoParam, blId);
  }

  private async executarConsulta(
    tipoParam: string,
    blId: number,
  ): Promise<GlobalSysConsultaResponseDto> {
    const tipo = this.parseTipo(tipoParam);
    const identity = await this.resolveDocumentIdentity(tipo, blId);
    const user = await this.localRepository.findTestUser();

    if (!user) {
      throw new Error(
        'Usuário de teste "teste" não encontrado. Execute npm run prisma:seed.',
      );
    }

    const result = await this.globalSysService.executeConsulta(
      identity.documentType,
      identity.documentNumber,
      identity.blVersion,
      user.Id,
    );

    return {
      found: result.found,
      tentativaNumero: result.tentativaNumero,
      workflowStatus: result.workflowStatus,
      detalhe: result.detalhe,
      numeroBl: result.numeroBl,
    };
  }

  /**
   * REST continua recebendo Id; domínio resolve para número + BlVersion.
   */
  private async resolveDocumentIdentity(
    tipo: BlDocumentType,
    blId: number,
  ): Promise<BlDocumentIdentity> {
    if (tipo === 'Master') {
      const result = await this.masterRepository.findById(blId);

      if (!result) {
        throw new NotFoundError(`BL Master ${blId} não encontrado`);
      }

      return {
        documentType: 'Master',
        documentNumber: result.master.MasterNumber,
        blVersion: this.parseBlVersion(result.master.BlVersion),
      };
    }

    const house = await this.houseRepository.findById(blId);

    if (!house) {
      throw new NotFoundError(`BL House ${blId} não encontrado`);
    }

    return {
      documentType: 'House',
      documentNumber: house.house.HouseNumber,
      blVersion: this.parseBlVersion(house.house.BlVersion),
    };
  }

  private parseBlVersion(value: string): BlVersion {
    if (!isBlVersion(value)) {
      throw new BadRequestError(`BlVersion inválido no registro: ${value}`);
    }

    return value;
  }

  private parseTipo(value: string): BlDocumentType {
    const normalized = value.trim().toLowerCase();

    if (normalized === 'master') {
      return 'Master';
    }

    if (normalized === 'house') {
      return 'House';
    }

    throw new BadRequestError('Tipo inválido. Use master ou house');
  }
}
