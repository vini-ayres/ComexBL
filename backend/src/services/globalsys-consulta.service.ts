import { BadRequestError, NotFoundError } from '../errors/AppError.js';
import {
  mapBlNaoEncontradoDetail,
  mapBlNaoEncontradoListItem,
} from '../mappers/bl-nao-encontrado.mapper.js';
import { BlNaoEncontradoRepository } from '../repositories/bl-nao-encontrado.repository.js';
import { GlobalSysBlRepository } from '../repositories/globalsys-bl.repository.js';
import type {
  BlNaoEncontradoDetailDto,
  BlNaoEncontradoListResponse,
  GlobalSysConsultaResponseDto,
} from '../types/bl-nao-encontrado.types.js';
import type { PaginationQuery } from '../types/bl.types.js';
import { buildPaginatedResult, getSkipTake } from '../utils/pagination.js';

export class GlobalSysConsultaService {
  constructor(
    private readonly localRepository: BlNaoEncontradoRepository,
    private readonly globalSysRepository: GlobalSysBlRepository,
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
    const latestSuccess = await this.localRepository.getLatestConsultaSuccess(
      tipo,
      blId,
    );

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
    const numeroBl = await this.resolveNumeroBl(tipo, blId);
    const consulta = await this.globalSysRepository.findByNumeroBl(numeroBl);

    const detalhe = consulta.found
      ? 'BL localizado no GlobalSys'
      : 'Não encontrado no GlobalSys';

    const result = await this.localRepository.recordConsulta({
      tipo,
      blId,
      found: consulta.found,
      detalhe,
    });

    return {
      found: consulta.found,
      tentativaNumero: result.tentativaNumero,
      workflowStatus: result.workflowStatus,
      detalhe,
      numeroBl,
    };
  }

  private async resolveNumeroBl(
    tipo: 'Master' | 'House',
    blId: number,
  ): Promise<string> {
    if (tipo === 'Master') {
      const master = await this.localRepository.findMasterById(blId);

      if (!master) {
        throw new NotFoundError(`BL Master ${blId} não encontrado`);
      }

      return master.MasterNumber;
    }

    const house = await this.localRepository.findHouseById(blId);

    if (!house) {
      throw new NotFoundError(`BL House ${blId} não encontrado`);
    }

    return house.HouseNumber;
  }

  private parseTipo(value: string): 'Master' | 'House' {
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
