import type { BlHouse, BlMaster, BlWorkflow } from '@prisma/client';
import { BL_VERSION, type BlVersion } from '../constants/bl-version.constants.js';
import { NotFoundError } from '../errors/AppError.js';
import {
  buildComparacaoEvent,
  buildFinalRecebidoEvent,
  buildOcrIngestaoEvent,
  mapConsultaGlobalSysEvent,
  mapConferenciaEvent,
  mapDivergenciaEvent,
  mapHistoricoToTimelineEvent,
  mapProcessoTimelineResponse,
  mapRevisaoEvent,
} from '../mappers/processo.mapper.js';
import { apoioHumanoRepository } from '../repositories/apoio-humano.repository.js';
import { blConsultaGlobalSysRepository } from '../repositories/bl-consulta-globalsys.repository.js';
import { blConferenciaRepository } from '../repositories/bl-conferencia.repository.js';
import { blDivergenciaRepository } from '../repositories/bl-divergencia.repository.js';
import { blHistoricoAlteracaoRepository } from '../repositories/bl-historico-alteracao.repository.js';
import { blProcessoEtapaRepository } from '../repositories/bl-processo-etapa.repository.js';
import { blHouseRepository, blMasterRepository, blWorkflowRepository } from '../repositories/bl.repository.js';
import type { BlDocumentType } from '../types/bl-domain.types.js';
import type { ProcessoTimelineEventDto, ProcessoTimelineResponseDto } from '../types/processo.types.js';

type BlVersionRecord = BlMaster | BlHouse;

function earliestDate(dates: Array<Date | null | undefined>): Date | null {
  let earliest: Date | null = null;

  for (const value of dates) {
    if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
      continue;
    }

    if (!earliest || value < earliest) {
      earliest = value;
    }
  }

  return earliest;
}

export class ProcessoService {
  async getTimelineByDocument(
    documentType: BlDocumentType,
    documentNumber: string,
    blVersion: BlVersion = BL_VERSION.FINAL,
  ): Promise<ProcessoTimelineResponseDto> {
    const documentContext = await this.resolveDocumentContext(
      documentType,
      documentNumber,
      blVersion,
    );

    const [
      persistedEtapas,
      workflow,
      divergencias,
      conferencias,
      consultas,
      historico,
      revisoes,
      draftRecord,
      finalRecord,
    ] = await Promise.all([
      documentType === 'Master'
        ? blProcessoEtapaRepository.findByMasterId(documentContext.recordId)
        : blProcessoEtapaRepository.findByHouseId(documentContext.recordId),
      documentType === 'Master'
        ? blWorkflowRepository.findByMasterId(documentContext.recordId)
        : blWorkflowRepository.findByHouseId(documentContext.recordId),
      documentType === 'Master'
        ? blDivergenciaRepository.findByMasterId(documentContext.recordId)
        : blDivergenciaRepository.findByHouseId(documentContext.recordId),
      documentType === 'Master'
        ? blConferenciaRepository.findByMasterId(documentContext.recordId)
        : blConferenciaRepository.findByHouseId(documentContext.recordId),
      documentType === 'Master'
        ? blConsultaGlobalSysRepository.findByMasterId(documentContext.recordId)
        : blConsultaGlobalSysRepository.findByHouseId(documentContext.recordId),
      documentType === 'Master'
        ? blHistoricoAlteracaoRepository.findByMasterId(documentContext.recordId)
        : blHistoricoAlteracaoRepository.findByHouseId(documentContext.recordId),
      documentType === 'Master'
        ? apoioHumanoRepository.findRevisoesByMasterIds([documentContext.recordId])
        : apoioHumanoRepository.findRevisoesByHouseIds([documentContext.recordId]),
      this.findVersionRecord(documentType, documentNumber, BL_VERSION.DRAFT),
      this.findVersionRecord(documentType, documentNumber, BL_VERSION.FINAL),
    ]);

    const ocrOccurredAt = await this.resolveOcrIngestedAt({
      documentType,
      currentRecordId: documentContext.recordId,
      currentWorkflow: workflow,
      draftRecord,
      finalRecord,
      consultas: consultas.map((item) => item.ExecutadoEm),
      historico: historico.map((item) => item.CreatedAt),
      revisoes: revisoes.map((item) => item.CreatedAt),
    });

    const dynamicEvents: ProcessoTimelineEventDto[] = [];

    dynamicEvents.push(
      buildOcrIngestaoEvent({
        documentType,
        documentNumber,
        occurredAt: ocrOccurredAt,
        hasDraft: draftRecord != null,
        hasFinal: finalRecord != null,
      }),
    );

    if (finalRecord) {
      dynamicEvents.push(
        buildFinalRecebidoEvent({
          documentNumber,
          occurredAt: await this.resolveFinalReceivedAt({
            documentType,
            finalRecord,
            currentRecordId: documentContext.recordId,
            currentWorkflow: workflow,
            ocrOccurredAt,
          }),
        }),
      );
    }

    for (const revisao of revisoes) {
      if (revisao.Status === 'pendente') {
        continue;
      }

      dynamicEvents.push(mapRevisaoEvent(revisao));
    }

    for (const consulta of consultas) {
      dynamicEvents.push(mapConsultaGlobalSysEvent(consulta));
    }

    for (const conferencia of conferencias) {
      dynamicEvents.push(mapConferenciaEvent(conferencia, 'created'));

      if (conferencia.ResolvedAt) {
        dynamicEvents.push(mapConferenciaEvent(conferencia, 'resolved'));
      }
    }

    for (const divergencia of divergencias) {
      dynamicEvents.push(mapDivergenciaEvent(divergencia, 'created'));
      dynamicEvents.push(buildComparacaoEvent({ divergencia }));

      if (divergencia.ResolvedAt) {
        dynamicEvents.push(mapDivergenciaEvent(divergencia, 'resolved'));
      }
    }

    for (const item of historico) {
      if (item.Acao === 'edicao' || item.Acao === 'confirmacao') {
        continue;
      }

      dynamicEvents.push(mapHistoricoToTimelineEvent(item));
    }

    return mapProcessoTimelineResponse({
      documentType,
      documentNumber,
      blVersion: documentContext.blVersion,
      workflow,
      persistedEtapas,
      dynamicEvents,
    });
  }

  private async resolveDocumentContext(
    documentType: BlDocumentType,
    documentNumber: string,
    blVersion: BlVersion,
  ) {
    const resolved = await this.findVersionRecord(
      documentType,
      documentNumber,
      blVersion,
    );

    if (!resolved && blVersion === BL_VERSION.FINAL) {
      const draftRecord = await this.findVersionRecord(
        documentType,
        documentNumber,
        BL_VERSION.DRAFT,
      );

      if (draftRecord) {
        return {
          recordId: draftRecord.Id,
          blVersion: BL_VERSION.DRAFT,
        };
      }
    }

    if (!resolved) {
      throw new NotFoundError(
        `${documentType} ${documentNumber} (${blVersion}) não encontrado`,
      );
    }

    return {
      recordId: resolved.Id,
      blVersion,
    };
  }

  private async findVersionRecord(
    documentType: BlDocumentType,
    documentNumber: string,
    blVersion: BlVersion,
  ) {
    if (documentType === 'Master') {
      return blMasterRepository.findByMasterNumberAndVersion(
        documentNumber,
        blVersion,
      );
    }

    return blHouseRepository.findByHouseNumberAndVersion(
      documentNumber,
      blVersion,
    );
  }

  /**
   * Ingestão OCR = início real do processo (workflow/consulta/histórico).
   * OnboardDate e IssueDate são datas do BL, sem hora — não servem aqui.
   */
  private async resolveOcrIngestedAt(params: {
    documentType: BlDocumentType;
    currentRecordId: number;
    currentWorkflow: BlWorkflow | null;
    draftRecord: BlVersionRecord | null;
    finalRecord: BlVersionRecord | null;
    consultas: Date[];
    historico: Date[];
    revisoes: Date[];
  }): Promise<Date> {
    const counterpartId = [params.draftRecord?.Id, params.finalRecord?.Id].find(
      (id) => id != null && id !== params.currentRecordId,
    );
    const counterpartWorkflow =
      counterpartId != null
        ? await this.findWorkflowByRecord(params.documentType, counterpartId)
        : null;

    return (
      earliestDate([
        params.currentWorkflow?.CreatedAt,
        counterpartWorkflow?.CreatedAt,
        ...params.consultas,
        ...params.historico,
        ...params.revisoes,
      ]) ?? new Date()
    );
  }

  private async resolveFinalReceivedAt(params: {
    documentType: BlDocumentType;
    finalRecord: BlVersionRecord;
    currentRecordId: number;
    currentWorkflow: BlWorkflow | null;
    ocrOccurredAt: Date;
  }): Promise<Date> {
    const finalWorkflow =
      params.finalRecord.Id === params.currentRecordId
        ? params.currentWorkflow
        : await this.findWorkflowByRecord(
            params.documentType,
            params.finalRecord.Id,
          );
    const candidate = finalWorkflow?.CreatedAt ?? params.ocrOccurredAt;

    return candidate < params.ocrOccurredAt ? params.ocrOccurredAt : candidate;
  }

  private async findWorkflowByRecord(
    documentType: BlDocumentType,
    recordId: number,
  ): Promise<BlWorkflow | null> {
    return documentType === 'Master'
      ? blWorkflowRepository.findByMasterId(recordId)
      : blWorkflowRepository.findByHouseId(recordId);
  }
}

export const processoService = new ProcessoService();
