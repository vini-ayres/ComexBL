import type { BlHouse, BlMaster } from '@prisma/client';
import type { BlVersion } from '../constants/bl-version.constants.js';
import { isBlVersion } from '../constants/bl-version.constants.js';
import {
  MASTER_HBL_COUNT,
  XML_DISPATCH_STATUS,
  XML_DISPATCH_UI_STATUS,
  type XmlDispatchUiStatus,
} from '../constants/xml-dispatch.constants.js';
import { logger } from '../config/logger.js';
import { NotFoundError } from '../errors/AppError.js';
import {
  computeLotStatus,
  isHouseReadyForDispatch,
  type HouseDispatchState,
  type LotStatusInput,
} from '../domain/lot/lot-status.js';
import { BlHouseRepository } from '../repositories/bl-house.repository.js';
import { BlMasterRepository } from '../repositories/bl-master.repository.js';
import { BlWorkflowRepository } from '../repositories/bl-workflow.repository.js';
import { BlXmlDispatchRepository } from '../repositories/bl-xml-dispatch.repository.js';
import type { BlDocumentType } from '../types/bl-domain.types.js';
import type { XmlDispatchEvaluationDto } from '../types/bl-lot.types.js';
import { RelationshipValidator } from '../validators/relationship-validator.js';

function normalizeContainerNumber(value: string | null | undefined): string | null {
  if (value == null) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

interface HouseLotSnapshot extends HouseDispatchState {
  house: BlHouse;
  valid: boolean;
}

interface MasterLotSnapshot {
  master: BlMaster;
  masterFinalized: boolean;
  houses: HouseLotSnapshot[];
}

export class GlobalSysXmlDispatchService {
  constructor(
    private readonly masterRepository: BlMasterRepository,
    private readonly houseRepository: BlHouseRepository,
    private readonly workflowRepository: BlWorkflowRepository,
    private readonly xmlDispatchRepository: BlXmlDispatchRepository,
    private readonly relationshipValidator: RelationshipValidator,
    private readonly webhookUrl: string | undefined,
  ) {}

  async handleWorkflowFinalized(
    documentType: BlDocumentType,
    documentNumber: string,
    blVersion: BlVersion,
    options: { force?: boolean } = {},
  ): Promise<void> {
    const master = await this.resolveMaster(documentType, documentNumber, blVersion);

    if (!master) {
      logger.info(
        `${documentType} ${documentNumber} (${blVersion}) finalizado — Master do lote ainda não encontrado`,
      );
      return;
    }

    const houseId =
      documentType === 'House'
        ? (await this.houseRepository.findByHouseNumberAndVersion(
            documentNumber,
            blVersion,
          ))?.Id
        : undefined;

    await this.evaluateAndDispatch(master, {
      force: Boolean(options.force),
      houseId,
    });
  }

  async evaluateAndDispatchByMasterId(
    masterId: number,
    options: { force?: boolean; houseId?: number } = {},
  ): Promise<XmlDispatchEvaluationDto> {
    const found = await this.masterRepository.findById(masterId);

    if (!found) {
      throw new NotFoundError(`BL Master ${masterId} não encontrado`);
    }

    return this.evaluateAndDispatch(found.master, {
      force: Boolean(options.force),
      houseId: options.houseId,
    });
  }

  private async resolveMaster(
    documentType: BlDocumentType,
    documentNumber: string,
    blVersion: BlVersion,
  ): Promise<BlMaster | null> {
    if (documentType === 'Master') {
      return this.masterRepository.findByMasterNumberAndVersion(
        documentNumber,
        blVersion,
      );
    }

    const house = await this.houseRepository.findByHouseNumberAndVersion(
      documentNumber,
      blVersion,
    );

    if (!house) {
      return null;
    }

    if (house.BLMasterId != null) {
      const linked = await this.masterRepository.findById(house.BLMasterId);
      return linked?.master ?? null;
    }

    const containerNumber = normalizeContainerNumber(house.ContainerNumber);

    if (!containerNumber) {
      return null;
    }

    return this.masterRepository.findByContainerNumberAndVersion(
      containerNumber,
      blVersion,
    );
  }

  private async evaluateAndDispatch(
    master: BlMaster,
    options: { force: boolean; houseId?: number },
  ): Promise<XmlDispatchEvaluationDto> {
    master = await this.ensureHblCount(master);
    await this.linkOrphanHouses(master);

    const snapshot = await this.buildLotSnapshot(master);
    const lotInput = this.toLotStatusInput(snapshot);
    const lotStatus = computeLotStatus(lotInput);
    const targets = snapshot.houses.filter((item) =>
      options.houseId == null ? true : item.house.Id === options.houseId,
    );

    if (options.houseId != null && targets.length === 0) {
      return this.toEvaluation(lotInput, false, 0, 'House não vinculado a este Master');
    }

    let dispatchedCount = 0;
    let lastReason = `Lote ${lotStatus}`;

    for (const item of targets) {
      const result = await this.dispatchHouseIfReady(master, item, snapshot, options.force);
      if (result.dispatched) {
        dispatchedCount += 1;
      }
      lastReason = result.reason;
    }

    const refreshed = await this.buildLotSnapshot(master);
    return this.toEvaluation(
      this.toLotStatusInput(refreshed),
      dispatchedCount > 0,
      dispatchedCount,
      dispatchedCount > 0
        ? dispatchedCount === 1
          ? 'XML enviado para o House'
          : `XML enviado para ${dispatchedCount} Houses`
        : lastReason,
    );
  }

  private async dispatchHouseIfReady(
    master: BlMaster,
    item: HouseLotSnapshot,
    snapshot: MasterLotSnapshot,
    force: boolean,
  ): Promise<{ dispatched: boolean; reason: string }> {
    if (!item.valid) {
      return {
        dispatched: false,
        reason: `House ${item.house.HouseNumber} inválido para o Master`,
      };
    }

    if (
      !isHouseReadyForDispatch({
        masterFinalized: snapshot.masterFinalized,
        houseFinalized: item.houseFinalized,
      })
    ) {
      return {
        dispatched: false,
        reason: `House ${item.house.HouseNumber} ainda não está pronto para XML`,
      };
    }

    if (!this.webhookUrl) {
      logger.warn(
        'N8N_WEBHOOK_ENVIAR_XML_GLOBALSYS_URL não configurada — webhook ignorado',
      );
      return { dispatched: false, reason: 'Webhook n8n não configurado' };
    }

    const claim = await this.xmlDispatchRepository.claimForDispatch(
      master.Id,
      item.house.Id,
      force,
    );

    if (claim === 'already_sent') {
      return {
        dispatched: false,
        reason: `XML já enviado para o House ${item.house.HouseNumber}`,
      };
    }

    if (claim === 'in_progress') {
      return {
        dispatched: false,
        reason: `Envio de XML já em andamento para o House ${item.house.HouseNumber}`,
      };
    }

    try {
      await this.dispatchWebhook(master.Id, item.house.Id);
      await this.xmlDispatchRepository.markEnviado(item.house.Id);
      logger.info('Webhook XML GlobalSys disparado com sucesso', {
        masterId: master.Id,
        masterNumber: master.MasterNumber,
        houseId: item.house.Id,
        houseNumber: item.house.HouseNumber,
        blVersion: master.BlVersion,
        hblCount: MASTER_HBL_COUNT,
      });
      return {
        dispatched: true,
        reason: `XML enviado para o House ${item.house.HouseNumber}`,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.xmlDispatchRepository.markFalhou(item.house.Id, message);
      throw error;
    }
  }

  private async ensureHblCount(master: BlMaster): Promise<BlMaster> {
    if (master.HBLCount === MASTER_HBL_COUNT) {
      return master;
    }

    return this.masterRepository.updateHblCount(master.Id, MASTER_HBL_COUNT);
  }

  private async linkOrphanHouses(master: BlMaster): Promise<void> {
    const containerNumber = normalizeContainerNumber(master.ContainerNumber);
    const blVersion = isBlVersion(master.BlVersion) ? master.BlVersion : null;

    if (!containerNumber || !blVersion) {
      return;
    }

    const houses = await this.houseRepository.findByContainerNumberAndVersion(
      containerNumber,
      blVersion,
    );

    for (const house of houses) {
      await this.ensureLink(master, house);
    }
  }

  private async buildLotSnapshot(master: BlMaster): Promise<MasterLotSnapshot> {
    const blVersion = isBlVersion(master.BlVersion) ? master.BlVersion : null;
    const linked = blVersion
      ? await this.houseRepository.findByMasterIdAndVersion(master.Id, blVersion)
      : await this.houseRepository.findByMasterId(master.Id);

    const [masterWorkflow, houseWorkflows, xmlDispatches] = await Promise.all([
      this.workflowRepository.findByMasterId(master.Id),
      this.workflowRepository.findByHouseIds(linked.map((house) => house.Id)),
      this.xmlDispatchRepository.findByHouseIds(linked.map((house) => house.Id)),
    ]);

    const houseWorkflowById = new Map(
      houseWorkflows
        .filter((workflow) => workflow.BlHouseId != null)
        .map((workflow) => [workflow.BlHouseId!, workflow]),
    );
    const xmlByHouseId = new Map(
      xmlDispatches.map((item) => [item.BlHouseId, item]),
    );

    const houses: HouseLotSnapshot[] = linked.map((house) => {
      const validation = this.relationshipValidator.validateMasterHouse(master, house);
      return {
        house,
        valid: validation.valid,
        houseFinalized: houseWorkflowById.get(house.Id)?.Status === 'finalizado',
        xmlStatus: this.toUiXmlStatus(xmlByHouseId.get(house.Id)?.Status),
      };
    });

    return {
      master,
      masterFinalized: masterWorkflow?.Status === 'finalizado',
      houses,
    };
  }

  private async ensureLink(
    master: BlMaster,
    house: BlHouse,
  ): Promise<BlHouse | null> {
    if (house.BLMasterId === master.Id) {
      return house;
    }

    if (house.BLMasterId != null && house.BLMasterId !== master.Id) {
      logger.warn(
        `House ${house.Id} já vinculado ao Master ${house.BLMasterId} — não reassociando ao Master ${master.Id}`,
      );
      return null;
    }

    return this.houseRepository.linkToMaster(house.Id, master.Id);
  }

  private async dispatchWebhook(masterId: number, houseId: number): Promise<void> {
    const response = await fetch(this.webhookUrl!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ masterId, houseId }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(
        `Webhook XML GlobalSys retornou ${response.status}: ${body || response.statusText}`,
      );
    }
  }

  private toUiXmlStatus(status: string | null | undefined): XmlDispatchUiStatus {
    if (status === XML_DISPATCH_STATUS.ENVIADO) {
      return XML_DISPATCH_UI_STATUS.ENVIADO;
    }
    if (status === XML_DISPATCH_STATUS.FALHOU) {
      return XML_DISPATCH_UI_STATUS.FALHOU;
    }
    if (status === XML_DISPATCH_STATUS.PENDENTE) {
      return XML_DISPATCH_UI_STATUS.PENDENTE;
    }
    return XML_DISPATCH_UI_STATUS.NAO_ENVIADO;
  }

  private toLotStatusInput(snapshot: MasterLotSnapshot): LotStatusInput {
    return {
      masterFinalized: snapshot.masterFinalized,
      houses: snapshot.houses.map((item) => ({
        houseFinalized: item.houseFinalized,
        xmlStatus: item.xmlStatus,
      })),
    };
  }

  private toEvaluation(
    snapshot: LotStatusInput,
    dispatched: boolean,
    dispatchedCount: number,
    reason: string,
  ): XmlDispatchEvaluationDto {
    const finalizedHouseCount = snapshot.houses.filter((house) => house.houseFinalized).length;

    return {
      dispatched,
      dispatchedCount,
      lotStatus: computeLotStatus(snapshot),
      reason,
      hblCount: MASTER_HBL_COUNT,
      linkedCount: snapshot.houses.length,
      finalizedHouseCount,
      masterFinalized: snapshot.masterFinalized,
      xmlDispatchStatus: this.aggregateXmlStatus(snapshot),
    };
  }

  private aggregateXmlStatus(snapshot: LotStatusInput): XmlDispatchUiStatus {
    if (snapshot.houses.length === 0) {
      return XML_DISPATCH_UI_STATUS.NAO_ENVIADO;
    }
    if (snapshot.houses.every((house) => house.xmlStatus === XML_DISPATCH_UI_STATUS.ENVIADO)) {
      return XML_DISPATCH_UI_STATUS.ENVIADO;
    }
    if (snapshot.houses.some((house) => house.xmlStatus === XML_DISPATCH_UI_STATUS.FALHOU)) {
      return XML_DISPATCH_UI_STATUS.FALHOU;
    }
    if (snapshot.houses.some((house) => house.xmlStatus === XML_DISPATCH_UI_STATUS.PENDENTE)) {
      return XML_DISPATCH_UI_STATUS.PENDENTE;
    }
    return XML_DISPATCH_UI_STATUS.NAO_ENVIADO;
  }
}
