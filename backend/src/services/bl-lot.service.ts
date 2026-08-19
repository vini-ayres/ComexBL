import type { BlHouse, BlMaster, BlWorkflow, BlXmlDispatch } from '@prisma/client';
import { isBlVersion, type BlVersion } from '../constants/bl-version.constants.js';
import { logger } from '../config/logger.js';
import { BadRequestError, NotFoundError } from '../errors/AppError.js';
import { computeLotStatus } from '../domain/lot/lot-status.js';
import {
  asWorkflowStatus,
  formatMasterCreatedAt,
  groupHousesByMasterId,
  indexByMasterId,
  indexWorkflowsByHouseId,
  mapLotHouse,
  xmlDispatchFromRecord,
} from '../mappers/bl-lot.mapper.js';
import { BlHistoricoAlteracaoRepository } from '../repositories/bl-historico-alteracao.repository.js';
import { BlHouseRepository } from '../repositories/bl-house.repository.js';
import { BlMasterRepository } from '../repositories/bl-master.repository.js';
import { BlWorkflowRepository } from '../repositories/bl-workflow.repository.js';
import { BlXmlDispatchRepository } from '../repositories/bl-xml-dispatch.repository.js';
import type {
  BlLotDetailDto,
  BlLotHouseDto,
  BlLotSummaryDto,
  XmlDispatchEvaluationDto,
} from '../types/bl-lot.types.js';
import type { PaginatedResult, PaginationQuery } from '../types/bl.types.js';
import { buildPaginatedResult } from '../utils/pagination.js';
import type { GlobalSysXmlDispatchService } from './globalsys-xml-dispatch.service.js';

function normalizeContainerNumber(value: string | null | undefined): string | null {
  if (value == null) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export interface LotActor {
  userId: number | null;
  displayName: string;
}

export class BlLotService {
  constructor(
    private readonly masterRepository: BlMasterRepository,
    private readonly houseRepository: BlHouseRepository,
    private readonly workflowRepository: BlWorkflowRepository,
    private readonly xmlDispatchRepository: BlXmlDispatchRepository,
    private readonly historicoRepository: BlHistoricoAlteracaoRepository,
    private readonly xmlDispatchService: GlobalSysXmlDispatchService,
  ) {}

  async listMasters(
    pagination: PaginationQuery,
    filters: { search?: string; blVersion?: BlVersion } = {},
  ): Promise<PaginatedResult<BlLotSummaryDto>> {
    const { items, total } = await this.masterRepository.findMany(pagination, {
      search: filters.search,
      blVersion: filters.blVersion,
    });

    const summaries = await this.enrichMasters(items);
    return buildPaginatedResult(summaries, total, pagination);
  }

  async getMasterLot(id: number): Promise<BlLotDetailDto> {
    const found = await this.masterRepository.findById(id);

    if (!found) {
      throw new NotFoundError(`BL Master ${id} não encontrado`);
    }

    const summary = (await this.enrichMasters([found.master]))[0];
    const blVersion = isBlVersion(found.master.BlVersion)
      ? found.master.BlVersion
      : null;
    const linked = found.houses;
    const houseWorkflows = await this.workflowRepository.findByHouseIds(
      linked.map((house) => house.Id),
    );
    const workflowByHouseId = indexWorkflowsByHouseId(houseWorkflows);
    const xmlDispatch = await this.xmlDispatchRepository.findByMasterId(id);

    const houses = linked.map((house) =>
      mapLotHouse(house, workflowByHouseId.get(house.Id), { candidate: false }),
    );

    const candidateHouses = await this.findCandidateHouses(
      found.master,
      blVersion,
      new Set(linked.map((house) => house.Id)),
      workflowByHouseId,
    );

    return {
      ...summary,
      embarcador: found.master.ShipperName ?? '-',
      consignatario: found.master.ConsigneeName ?? '-',
      agenteCarga: found.master.CarrierName ?? '-',
      dataEmbarque: found.master.OnboardDate
        ? found.master.OnboardDate.toISOString().slice(0, 10)
        : '-',
      dataChegadaPrevista: found.master.ArrivalDate
        ? found.master.ArrivalDate.toISOString().slice(0, 10)
        : '-',
      pesoBrutoTotal:
        found.master.GrossWeight != null
          ? `${found.master.GrossWeight.toString()} KG`
          : '-',
      origemArquivo: found.master.FileName?.trim()
        ? `files/${found.master.FileName.trim()}`
        : '-',
      updatedAt: (
        found.master.ArrivalDate ??
        found.master.OnboardDate ??
        new Date(0)
      ).toISOString(),
      houses,
      candidateHouses,
      xmlDispatchError: xmlDispatch?.LastError ?? null,
      xmlDispatchedAt: xmlDispatch?.DispatchedAt?.toISOString() ?? null,
    };
  }

  async updateHblCount(
    masterId: number,
    hblCount: number,
    actor: LotActor,
  ): Promise<BlLotDetailDto> {
    if (!Number.isInteger(hblCount) || hblCount < 1) {
      throw new BadRequestError('HBLCount deve ser um inteiro maior que zero');
    }

    const found = await this.masterRepository.findById(masterId);

    if (!found) {
      throw new NotFoundError(`BL Master ${masterId} não encontrado`);
    }

    const previous = found.master.HBLCount;
    await this.masterRepository.updateHblCount(masterId, hblCount);
    await this.historicoRepository.create({
      blMasterId: masterId,
      userId: actor.userId,
      usuario: actor.displayName,
      campo: 'HBLCount',
      valorAntes: previous == null ? '' : String(previous),
      valorDepois: String(hblCount),
      acao: 'correcao_lote',
    });

    await this.xmlDispatchService.evaluateAndDispatchByMasterId(masterId, {
      force: false,
    });

    return this.getMasterLot(masterId);
  }

  async unlinkHouse(
    masterId: number,
    houseId: number,
    actor: LotActor,
  ): Promise<BlLotDetailDto> {
    const house = await this.requireHouseOfMaster(masterId, houseId);
    await this.houseRepository.unlinkFromMaster(houseId);
    await this.historicoRepository.create({
      blMasterId: masterId,
      blHouseId: houseId,
      userId: actor.userId,
      usuario: actor.displayName,
      campo: 'BLMasterId',
      valorAntes: String(masterId),
      valorDepois: '',
      acao: 'desvincular_house',
    });
    logger.info('House desvinculado do Master no lote', {
      houseId,
      houseNumber: house.HouseNumber,
      masterId,
    });
    return this.getMasterLot(masterId);
  }

  async linkHouse(
    masterId: number,
    houseId: number,
    actor: LotActor,
  ): Promise<BlLotDetailDto> {
    const found = await this.masterRepository.findById(masterId);

    if (!found) {
      throw new NotFoundError(`BL Master ${masterId} não encontrado`);
    }

    const houseRecord = await this.houseRepository.findById(houseId);

    if (!houseRecord) {
      throw new NotFoundError(`BL House ${houseId} não encontrado`);
    }

    const house = houseRecord.house;

    if (house.BLMasterId != null && house.BLMasterId !== masterId) {
      throw new BadRequestError(
        `House ${house.HouseNumber} já está vinculado a outro Master`,
      );
    }

    if (house.BlVersion !== found.master.BlVersion) {
      throw new BadRequestError(
        'House e Master precisam ter a mesma BlVersion',
      );
    }

    await this.houseRepository.linkToMaster(houseId, masterId);
    await this.historicoRepository.create({
      blMasterId: masterId,
      blHouseId: houseId,
      userId: actor.userId,
      usuario: actor.displayName,
      campo: 'BLMasterId',
      valorAntes: house.BLMasterId == null ? '' : String(house.BLMasterId),
      valorDepois: String(masterId),
      acao: 'vincular_house',
    });

    await this.xmlDispatchService.evaluateAndDispatchByMasterId(masterId, {
      force: false,
    });

    return this.getMasterLot(masterId);
  }

  async dispatchXml(
    masterId: number,
    force: boolean,
  ): Promise<{ lot: BlLotDetailDto; evaluation: XmlDispatchEvaluationDto }> {
    const evaluation = await this.xmlDispatchService.evaluateAndDispatchByMasterId(
      masterId,
      { force },
    );
    const lot = await this.getMasterLot(masterId);
    return { lot, evaluation };
  }

  private async enrichMasters(masters: BlMaster[]): Promise<BlLotSummaryDto[]> {
    if (masters.length === 0) {
      return [];
    }

    const masterIds = masters.map((master) => master.Id);
    const [masterWorkflows, xmlDispatches, linkedHouses] = await Promise.all([
      this.workflowRepository.findByMasterIds(masterIds),
      this.xmlDispatchRepository.findByMasterIds(masterIds),
      this.houseRepository.findByMasterIds(masterIds),
    ]);

    const workflowByMasterId = indexByMasterId(masterWorkflows);
    const xmlByMasterId = new Map<number, BlXmlDispatch>();
    for (const item of xmlDispatches) {
      xmlByMasterId.set(item.BlMasterId, item);
    }

    const housesByMasterId = groupHousesByMasterId(linkedHouses);
    const houseWorkflows = await this.workflowRepository.findByHouseIds(
      linkedHouses.map((house) => house.Id),
    );
    const workflowByHouseId = indexWorkflowsByHouseId(houseWorkflows);

    return masters.map((master) => {
      const houses = housesByMasterId.get(master.Id) ?? [];
      const finalizedHouseCount = houses.filter(
        (house) => workflowByHouseId.get(house.Id)?.Status === 'finalizado',
      ).length;
      const masterWorkflow = workflowByMasterId.get(master.Id);
      const xmlStatus = xmlDispatchFromRecord(xmlByMasterId.get(master.Id));
      const hblCount = master.HBLCount;
      const lotStatus = computeLotStatus({
        hblCount,
        masterFinalized: masterWorkflow?.Status === 'finalizado',
        linkedCount: houses.length,
        finalizedHouseCount,
        xmlStatus,
      });

      return {
        id: master.Id,
        numeroBl: master.MasterNumber,
        navio: master.VesselName ?? '-',
        viagem: master.Voyage ?? '-',
        portoOrigem: master.LoadingPortName ?? master.LoadingPortCode ?? '-',
        portoDestino:
          master.DischargePortName ??
          master.DeliveryPortName ??
          master.DischargePortCode ??
          '-',
        status: asWorkflowStatus(masterWorkflow?.Status),
        volumesTotal: master.PackingQuantity ?? 0,
        createdAt: formatMasterCreatedAt(master),
        blVersion: master.BlVersion,
        hblCount,
        containerNumber: master.ContainerNumber,
        houseCount: houses.length,
        finalizedHouseCount,
        workflowStatus: asWorkflowStatus(masterWorkflow?.Status),
        xmlDispatchStatus: xmlStatus,
        lotStatus,
        partlot: (hblCount ?? 0) > 1,
      };
    });
  }

  private async findCandidateHouses(
    master: BlMaster,
    blVersion: BlVersion | null,
    linkedIds: Set<number>,
    workflowByHouseId: Map<number, BlWorkflow>,
  ): Promise<BlLotHouseDto[]> {
    const containerNumber = normalizeContainerNumber(master.ContainerNumber);

    if (!containerNumber || !blVersion) {
      return [];
    }

    const sameContainer = await this.houseRepository.findByContainerNumberAndVersion(
      containerNumber,
      blVersion,
    );

    const candidates = sameContainer.filter(
      (house) => house.BLMasterId == null && !linkedIds.has(house.Id),
    );
    const candidateWorkflows = await this.workflowRepository.findByHouseIds(
      candidates.map((house) => house.Id),
    );
    const candidateWorkflowById = indexWorkflowsByHouseId(candidateWorkflows);

    return candidates.map((house) =>
      mapLotHouse(
        house,
        candidateWorkflowById.get(house.Id) ?? workflowByHouseId.get(house.Id),
        { candidate: true },
      ),
    );
  }

  private async requireHouseOfMaster(
    masterId: number,
    houseId: number,
  ): Promise<BlHouse> {
    const record = await this.houseRepository.findById(houseId);

    if (!record) {
      throw new NotFoundError(`BL House ${houseId} não encontrado`);
    }

    if (record.house.BLMasterId !== masterId) {
      throw new BadRequestError('House não está vinculado a este Master');
    }

    return record.house;
  }
}
