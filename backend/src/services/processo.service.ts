import { BL_VERSION, type BlVersion } from '../constants/bl-version.constants.js';
import { NotFoundError } from '../errors/AppError.js';
import {
  buildComparacaoEvent,
  buildFinalRecebidoEvent,
  buildOcrIngestaoEvent,
  mapConsultaGlobalSysEvent,
  mapDivergenciaEvent,
  mapHistoricoToTimelineEvent,
  mapProcessoTimelineResponse,
  mapRevisaoEvent,
} from '../mappers/processo.mapper.js';
import { apoioHumanoRepository } from '../repositories/apoio-humano.repository.js';
import { blConsultaGlobalSysRepository } from '../repositories/bl-consulta-globalsys.repository.js';
import { blDivergenciaRepository } from '../repositories/bl-divergencia.repository.js';
import { blHistoricoAlteracaoRepository } from '../repositories/bl-historico-alteracao.repository.js';
import { blProcessoEtapaRepository } from '../repositories/bl-processo-etapa.repository.js';
import { blHouseRepository, blMasterRepository, blWorkflowRepository } from '../repositories/bl.repository.js';
import type { BlDocumentType } from '../types/bl-domain.types.js';
import type { ProcessoTimelineEventDto, ProcessoTimelineResponseDto } from '../types/processo.types.js';

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

    const dynamicEvents: ProcessoTimelineEventDto[] = [];

    dynamicEvents.push(
      buildOcrIngestaoEvent({
        documentType,
        documentNumber,
        occurredAt: documentContext.createdAt,
        hasDraft: draftRecord != null,
        hasFinal: finalRecord != null,
      }),
    );

    if (finalRecord) {
      dynamicEvents.push(
        buildFinalRecebidoEvent({
          documentNumber,
          occurredAt: this.resolveDocumentDate(finalRecord, documentContext.createdAt),
        }),
      );
    }

    for (const revisao of revisoes) {
      dynamicEvents.push(mapRevisaoEvent(revisao));
    }

    for (const consulta of consultas) {
      dynamicEvents.push(mapConsultaGlobalSysEvent(consulta));
    }

    for (const divergencia of divergencias) {
      dynamicEvents.push(mapDivergenciaEvent(divergencia, 'created'));
      dynamicEvents.push(buildComparacaoEvent({ divergencia }));

      if (divergencia.ResolvedAt) {
        dynamicEvents.push(mapDivergenciaEvent(divergencia, 'resolved'));
      }
    }

    for (const item of historico) {
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
          createdAt: this.resolveDocumentDate(draftRecord, new Date()),
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
      createdAt: this.resolveDocumentDate(resolved, new Date()),
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

  private resolveDocumentDate(
    record: { OnboardDate?: Date | null; IssueDate?: Date | null },
    fallback: Date,
  ): Date {
    return record.OnboardDate ?? record.IssueDate ?? fallback;
  }
}

export const processoService = new ProcessoService();
