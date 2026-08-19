import type { BlHouse, BlMaster } from '@prisma/client';
import type { BlVersion } from '../constants/bl-version.constants.js';
import { isBlVersion } from '../constants/bl-version.constants.js';
import {
  XML_DISPATCH_STATUS,
  XML_DISPATCH_UI_STATUS,
  type XmlDispatchUiStatus,
} from '../constants/xml-dispatch.constants.js';
import { logger } from '../config/logger.js';
import { NotFoundError } from '../errors/AppError.js';
import {
  computeLotStatus,
  isLotReadyForDispatch,
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
  ): Promise<void> {
    const master = await this.resolveMaster(documentType, documentNumber, blVersion);

    if (!master) {
      logger.info(
        `${documentType} ${documentNumber} (${blVersion}) finalizado — Master do lote ainda não encontrado`,
      );
      return;
    }

    await this.evaluateAndDispatch(master, { force: false });
  }

  async evaluateAndDispatchByMasterId(
    masterId: number,
    options: { force?: boolean } = {},
  ): Promise<XmlDispatchEvaluationDto> {
    const found = await this.masterRepository.findById(masterId);

    if (!found) {
      throw new NotFoundError(`BL Master ${masterId} não encontrado`);
    }

    return this.evaluateAndDispatch(found.master, { force: Boolean(options.force) });
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
    options: { force: boolean },
  ): Promise<XmlDispatchEvaluationDto> {
    await this.linkOrphanHouses(master);

    const snapshot = await this.buildLotSnapshot(master);
    const lotStatus = computeLotStatus(snapshot);
    const ready = isLotReadyForDispatch(snapshot);

    if (!ready) {
      logger.info(
        `Master ${master.MasterNumber} (${master.BlVersion}) — lote ${lotStatus} (${snapshot.finalizedHouseCount}/${snapshot.hblCount ?? '-'} Houses)`,
      );
      return this.toEvaluation(snapshot, false, `Lote ${lotStatus}`);
    }

    if (!this.webhookUrl) {
      logger.warn(
        'N8N_WEBHOOK_ENVIAR_XML_GLOBALSYS_URL não configurada — webhook ignorado',
      );
      return this.toEvaluation(
        snapshot,
        false,
        'Webhook n8n não configurado',
      );
    }

    const claim = await this.xmlDispatchRepository.claimForDispatch(
      master.Id,
      options.force,
    );

    if (claim === 'already_sent') {
      return this.toEvaluation(
        { ...snapshot, xmlStatus: XML_DISPATCH_UI_STATUS.ENVIADO },
        false,
        'XML já enviado para esta versão',
      );
    }

    if (claim === 'in_progress') {
      return this.toEvaluation(
        snapshot,
        false,
        'Envio de XML já em andamento',
      );
    }

    try {
      await this.dispatchWebhook(master.Id);
      await this.xmlDispatchRepository.markEnviado(master.Id);
      logger.info('Webhook XML GlobalSys consolidado disparado com sucesso', {
        masterId: master.Id,
        masterNumber: master.MasterNumber,
        blVersion: master.BlVersion,
        hblCount: snapshot.hblCount,
      });
      return this.toEvaluation(
        { ...snapshot, xmlStatus: XML_DISPATCH_UI_STATUS.ENVIADO },
        true,
        'XML consolidado enviado',
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.xmlDispatchRepository.markFalhou(master.Id, message);
      throw error;
    }
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

  private async buildLotSnapshot(master: BlMaster): Promise<LotStatusInput> {
    const blVersion = isBlVersion(master.BlVersion) ? master.BlVersion : null;
    const linked = blVersion
      ? await this.houseRepository.findByMasterIdAndVersion(master.Id, blVersion)
      : await this.houseRepository.findByMasterId(master.Id);

    const [masterWorkflow, houseWorkflows, xmlDispatch] = await Promise.all([
      this.workflowRepository.findByMasterId(master.Id),
      this.workflowRepository.findByHouseIds(linked.map((house) => house.Id)),
      this.xmlDispatchRepository.findByMasterId(master.Id),
    ]);

    const houseWorkflowById = new Map(
      houseWorkflows
        .filter((workflow) => workflow.BlHouseId != null)
        .map((workflow) => [workflow.BlHouseId!, workflow]),
    );

    let finalizedHouseCount = 0;
    for (const house of linked) {
      const validation = this.relationshipValidator.validateMasterHouse(master, house);
      if (!validation.valid) {
        continue;
      }

      if (houseWorkflowById.get(house.Id)?.Status === 'finalizado') {
        finalizedHouseCount += 1;
      }
    }

    return {
      hblCount: master.HBLCount,
      masterFinalized: masterWorkflow?.Status === 'finalizado',
      linkedCount: linked.length,
      finalizedHouseCount,
      xmlStatus: this.toUiXmlStatus(xmlDispatch?.Status),
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

  private async dispatchWebhook(masterId: number): Promise<void> {
    const response = await fetch(this.webhookUrl!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ masterId }),
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

  private toEvaluation(
    snapshot: LotStatusInput,
    dispatched: boolean,
    reason: string,
  ): XmlDispatchEvaluationDto {
    return {
      dispatched,
      lotStatus: computeLotStatus(snapshot),
      reason,
      hblCount: snapshot.hblCount,
      linkedCount: snapshot.linkedCount,
      finalizedHouseCount: snapshot.finalizedHouseCount,
      masterFinalized: snapshot.masterFinalized,
      xmlDispatchStatus: snapshot.xmlStatus,
    };
  }
}
