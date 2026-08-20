import type { BlHouse, BlMaster, BlWorkflow, Prisma } from '@prisma/client';
import { isBlVersion, type BlVersion } from '../constants/bl-version.constants.js';
import { MASTER_HBL_COUNT } from '../constants/xml-dispatch.constants.js';
import {
  CONFERENCIA_CAMPO_STATUS,
  CONFERENCIA_HEADER_STATUS,
} from '../constants/conferencia-house-master.constants.js';
import {
  DIVERGENCIA_CAMPO_STATUS,
  DIVERGENCIA_HEADER_STATUS,
} from '../constants/divergencia-resolution.constants.js';
import { PRISMA_EXTENDED_TRANSACTION_OPTIONS } from '../constants/prisma.constants.js';
import { logger } from '../config/logger.js';
import { BadRequestError, NotFoundError } from '../errors/AppError.js';
import { computeLotStatus } from '../domain/lot/lot-status.js';
import {
  aggregateXmlDispatchStatus,
  asWorkflowStatus,
  formatMasterCreatedAt,
  groupHousesByMasterId,
  groupXmlDispatchesByMasterId,
  indexByMasterId,
  indexXmlDispatchesByHouseId,
  indexWorkflowsByHouseId,
  mapLotHouse,
  xmlDispatchFromRecord,
} from '../mappers/bl-lot.mapper.js';
import { prisma } from '../prisma/client.js';
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
import type { WorkflowService } from './workflow.service.js';

const VALIDACAO_MANUAL_PENDENCIA =
  'Validação manual — corrigido no GlobalSys';

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
    private readonly workflowService: WorkflowService,
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
    const xmlDispatches = await this.xmlDispatchRepository.findByMasterId(id);
    const xmlByHouseId = indexXmlDispatchesByHouseId(xmlDispatches);

    const houses = linked.map((house) =>
      mapLotHouse(house, workflowByHouseId.get(house.Id), {
        candidate: false,
        xmlDispatch: xmlByHouseId.get(house.Id),
      }),
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
      xmlDispatchError:
        xmlDispatches.find((item) => item.LastError)?.LastError ?? null,
      xmlDispatchedAt:
        xmlDispatches
          .map((item) => item.DispatchedAt)
          .filter((value): value is Date => value != null)
          .sort((a, b) => b.getTime() - a.getTime())[0]
          ?.toISOString() ?? null,
    };
  }

  async updateHblCount(
    masterId: number,
    _hblCount: number,
    actor: LotActor,
  ): Promise<BlLotDetailDto> {
    const found = await this.masterRepository.findById(masterId);

    if (!found) {
      throw new NotFoundError(`BL Master ${masterId} não encontrado`);
    }

    const previous = found.master.HBLCount;
    await this.masterRepository.updateHblCount(masterId, MASTER_HBL_COUNT);
    await this.historicoRepository.create({
      blMasterId: masterId,
      userId: actor.userId,
      usuario: actor.displayName,
      campo: 'HBLCount',
      valorAntes: previous == null ? '' : String(previous),
      valorDepois: String(MASTER_HBL_COUNT),
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
    houseId?: number,
  ): Promise<{ lot: BlLotDetailDto; evaluation: XmlDispatchEvaluationDto }> {
    const evaluation = await this.xmlDispatchService.evaluateAndDispatchByMasterId(
      masterId,
      { force, houseId },
    );
    const lot = await this.getMasterLot(masterId);
    return { lot, evaluation };
  }

  async validacaoManual(
    masterId: number,
    actor: LotActor,
  ): Promise<BlLotDetailDto> {
    const found = await this.masterRepository.findById(masterId);

    if (!found) {
      throw new NotFoundError(`BL Master ${masterId} não encontrado`);
    }

    if (!isBlVersion(found.master.BlVersion)) {
      throw new BadRequestError(
        `BlVersion inválido no Master ${found.master.MasterNumber}`,
      );
    }

    const blVersion = found.master.BlVersion;
    const linkedHouses = found.houses;
    const [masterWorkflow, houseWorkflows] = await Promise.all([
      this.workflowRepository.findByMasterId(masterId),
      this.workflowRepository.findByHouseIds(linkedHouses.map((house) => house.Id)),
    ]);
    const workflowByHouseId = indexWorkflowsByHouseId(houseWorkflows);
    const housesAlreadyFinalized = linkedHouses.every(
      (house) => workflowByHouseId.get(house.Id)?.Status === 'finalizado',
    );

    if (masterWorkflow?.Status === 'finalizado' && housesAlreadyFinalized) {
      throw new BadRequestError('Este lote já está concluído');
    }

    const previousStatus = masterWorkflow?.Status ?? 'processando';
    const workflowData = {
      status: 'finalizado',
      pendencia: VALIDACAO_MANUAL_PENDENCIA,
      skipXmlDispatch: true,
      ...(actor.userId != null ? { responsavelUserId: actor.userId } : {}),
    };
    const resolvedAt = new Date();

    await prisma.$transaction(async (tx) => {
      await this.workflowService.updateWorkflowByMasterNumberAndVersion(
        found.master.MasterNumber,
        blVersion,
        workflowData,
        tx,
      );

      for (const house of linkedHouses) {
        if (workflowByHouseId.get(house.Id)?.Status === 'finalizado') {
          continue;
        }

        if (!isBlVersion(house.BlVersion)) {
          throw new BadRequestError(
            `BlVersion inválido no House ${house.HouseNumber}`,
          );
        }

        await this.workflowService.updateWorkflowByHouseNumberAndVersion(
          house.HouseNumber,
          house.BlVersion,
          workflowData,
          tx,
        );
      }

      await this.closePendingOperationalRecords(
        tx,
        masterId,
        linkedHouses.map((house) => house.Id),
        actor,
        resolvedAt,
      );

      await this.historicoRepository.create(
        {
          blMasterId: masterId,
          userId: actor.userId,
          usuario: actor.displayName,
          campo: 'Workflow.Status',
          valorAntes: previousStatus,
          valorDepois: 'finalizado',
          acao: 'validacao_manual',
          createdAt: resolvedAt,
        },
        tx,
      );
    }, PRISMA_EXTENDED_TRANSACTION_OPTIONS);

    logger.info('Validação manual concluída no lote Master/House', {
      masterId,
      masterNumber: found.master.MasterNumber,
      blVersion,
      previousStatus,
      houseCount: linkedHouses.length,
      usuario: actor.displayName,
    });

    return this.getMasterLot(masterId);
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
    const xmlByMasterId = groupXmlDispatchesByMasterId(xmlDispatches);
    const xmlByHouseId = indexXmlDispatchesByHouseId(xmlDispatches);

    const housesByMasterId = groupHousesByMasterId(linkedHouses);
    const houseWorkflows = await this.workflowRepository.findByHouseIds(
      linkedHouses.map((house) => house.Id),
    );
    const workflowByHouseId = indexWorkflowsByHouseId(houseWorkflows);

    return masters.map((master) => {
      const houses = housesByMasterId.get(master.Id) ?? [];
      const masterXml = xmlByMasterId.get(master.Id) ?? [];
      const finalizedHouseCount = houses.filter(
        (house) => workflowByHouseId.get(house.Id)?.Status === 'finalizado',
      ).length;
      const masterWorkflow = workflowByMasterId.get(master.Id);
      const xmlStatus = aggregateXmlDispatchStatus(masterXml, houses.length);
      const lotStatus = computeLotStatus({
        masterFinalized: masterWorkflow?.Status === 'finalizado',
        houses: houses.map((house) => ({
          houseFinalized: workflowByHouseId.get(house.Id)?.Status === 'finalizado',
          xmlStatus: xmlDispatchFromRecord(xmlByHouseId.get(house.Id)),
        })),
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
        hblCount: MASTER_HBL_COUNT,
        containerNumber: master.ContainerNumber,
        houseCount: houses.length,
        finalizedHouseCount,
        workflowStatus: asWorkflowStatus(masterWorkflow?.Status),
        xmlDispatchStatus: xmlStatus,
        lotStatus,
        partlot: houses.length > 1,
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

  private async closePendingOperationalRecords(
    tx: Prisma.TransactionClient,
    masterId: number,
    houseIds: number[],
    actor: LotActor,
    resolvedAt: Date,
  ): Promise<void> {
    const documentFilter = {
      OR: [
        { BlMasterId: masterId },
        ...(houseIds.length > 0 ? [{ BlHouseId: { in: houseIds } }] : []),
      ],
    };

    const divergencias = await tx.blDivergencia.findMany({
      where: {
        ...documentFilter,
        Status: { not: DIVERGENCIA_HEADER_STATUS.RESOLVIDO },
      },
      select: { Id: true },
    });

    if (divergencias.length > 0) {
      const ids = divergencias.map((item) => item.Id);
      await tx.blDivergenciaCampo.updateMany({
        where: {
          BlDivergenciaId: { in: ids },
          Status: DIVERGENCIA_CAMPO_STATUS.PENDENTE,
        },
        data: { Status: DIVERGENCIA_CAMPO_STATUS.RESOLVIDO_GLOBALSYS },
      });
      await tx.blDivergencia.updateMany({
        where: { Id: { in: ids } },
        data: {
          Status: DIVERGENCIA_HEADER_STATUS.RESOLVIDO,
          ResolvedAt: resolvedAt,
          ResolvedByUserId: actor.userId,
        },
      });
    }

    const conferencias = await tx.blConferencia.findMany({
      where: {
        ...documentFilter,
        Status: { not: CONFERENCIA_HEADER_STATUS.RESOLVIDO },
      },
      select: { Id: true },
    });

    if (conferencias.length > 0) {
      const ids = conferencias.map((item) => item.Id);
      await tx.blConferenciaCampo.updateMany({
        where: {
          BlConferenciaId: { in: ids },
          Status: CONFERENCIA_CAMPO_STATUS.PENDENTE,
        },
        data: { Status: CONFERENCIA_CAMPO_STATUS.RESOLVIDO_MANUAL },
      });
      await tx.blConferencia.updateMany({
        where: { Id: { in: ids } },
        data: {
          Status: CONFERENCIA_HEADER_STATUS.RESOLVIDO,
          ResolvedAt: resolvedAt,
          ResolvedByUserId: actor.userId,
        },
      });
    }
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
