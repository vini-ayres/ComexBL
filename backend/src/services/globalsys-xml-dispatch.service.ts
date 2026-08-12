import type { BlHouse, BlMaster } from '@prisma/client';
import type { BlVersion } from '../constants/bl-version.constants.js';import { logger } from '../config/logger.js';
import { BlHouseRepository } from '../repositories/bl-house.repository.js';
import { BlMasterRepository } from '../repositories/bl-master.repository.js';
import { BlWorkflowRepository } from '../repositories/bl-workflow.repository.js';
import type { BlDocumentType } from '../types/bl-domain.types.js';
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
    private readonly relationshipValidator: RelationshipValidator,
    private readonly webhookUrl: string | undefined,
  ) {}

  async handleWorkflowFinalized(
    documentType: BlDocumentType,
    documentNumber: string,
    blVersion: BlVersion,
  ): Promise<void> {
    if (!this.webhookUrl) {      logger.warn(
        'N8N_WEBHOOK_ENVIAR_XML_GLOBALSYS_URL não configurada — webhook ignorado',
      );
      return;
    }

    if (documentType === 'Master') {
      await this.processMasterFinalized(documentNumber, blVersion);
      return;
    }

    await this.processHouseFinalized(documentNumber, blVersion);
  }

  private async processMasterFinalized(
    masterNumber: string,
    blVersion: BlVersion,
  ): Promise<void> {
    const master = await this.masterRepository.findByMasterNumberAndVersion(
      masterNumber,
      blVersion,
    );

    if (!master) {
      return;
    }

    const containerNumber = normalizeContainerNumber(master.ContainerNumber);

    if (!containerNumber) {
      logger.warn(
        `Master ${masterNumber} (${blVersion}) sem ContainerNumber — agregação ignorada`,
      );
      return;
    }

    const houses = await this.houseRepository.findByContainerNumberAndVersion(
      containerNumber,
      blVersion,
    );

    if (houses.length === 0) {
      logger.info(
        `Master ${masterNumber} finalizado — nenhum House com container ${containerNumber}`,
      );
      return;
    }

    for (const house of houses) {
      await this.tryLinkAndDispatch(master, house);
    }
  }

  private async processHouseFinalized(
    houseNumber: string,
    blVersion: BlVersion,
  ): Promise<void> {
    const house = await this.houseRepository.findByHouseNumberAndVersion(
      houseNumber,
      blVersion,
    );

    if (!house) {
      return;
    }

    const containerNumber = normalizeContainerNumber(house.ContainerNumber);

    if (!containerNumber) {
      logger.warn(
        `House ${houseNumber} (${blVersion}) sem ContainerNumber — agregação ignorada`,
      );
      return;
    }

    const master = await this.masterRepository.findByContainerNumberAndVersion(
      containerNumber,
      blVersion,
    );

    if (!master) {
      logger.info(
        `House ${houseNumber} finalizado — Master com container ${containerNumber} ainda não encontrado`,
      );
      return;
    }

    await this.tryLinkAndDispatch(master, house);
  }

  private async tryLinkAndDispatch(
    master: BlMaster,
    house: BlHouse,
  ): Promise<void> {
    const linkedHouse = await this.ensureLink(master, house);

    if (!linkedHouse) {
      return;
    }

    const validation = this.relationshipValidator.validateMasterHouse(
      master,
      linkedHouse,
    );

    if (!validation.valid) {
      logger.warn('Relacionamento Master/House inválido após agregação', {
        masterId: master.Id,
        houseId: linkedHouse.Id,
        issues: validation.issues,
      });
      return;
    }

    const [masterWorkflow, houseWorkflow] = await Promise.all([
      this.workflowRepository.findByMasterId(master.Id),
      this.workflowRepository.findByHouseId(linkedHouse.Id),
    ]);

    if (
      masterWorkflow?.Status !== 'finalizado' ||
      houseWorkflow?.Status !== 'finalizado'
    ) {
      logger.info(
        `Par Master ${master.Id} / House ${linkedHouse.Id} aguardando finalização do counterpart`,
      );
      return;
    }

    await this.dispatchWebhook(linkedHouse.Id, master.Id);
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

  private async dispatchWebhook(houseId: number, masterId: number): Promise<void> {
    const response = await fetch(this.webhookUrl!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ houseId, masterId }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(
        `Webhook XML GlobalSys retornou ${response.status}: ${body || response.statusText}`,
      );
    }

    logger.info('Webhook XML GlobalSys disparado com sucesso', {
      masterId,
      houseId,
    });
  }
}
