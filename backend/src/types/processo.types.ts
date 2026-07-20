import type {
  ProcessoTimelineEventType,
  ProcessoTimelineItemStatus,
} from '../constants/processo-timeline.constants.js';
import type { BlDocumentType } from './bl-domain.types.js';
import type { BlVersion } from '../constants/bl-version.constants.js';

export interface ProcessoTimelineEventDto {
  id: string;
  eventType: ProcessoTimelineEventType;
  titulo: string;
  descricao: string | null;
  status: ProcessoTimelineItemStatus;
  occurredAt: string;
  source: 'persistido' | 'dinamico';
  metadata?: Record<string, string | number | boolean | null>;
}

export interface ProcessoTimelineEtapaDto {
  ordem: number;
  titulo: string;
  status: ProcessoTimelineItemStatus;
  descricao: string | null;
  completedAt: string | null;
  source: 'persistido' | 'dinamico';
  events: ProcessoTimelineEventDto[];
}

export interface ProcessoTimelineResponseDto {
  documentType: BlDocumentType;
  documentNumber: string;
  blVersion: BlVersion;
  workflowStatus: string | null;
  source: 'persistido' | 'dinamico' | 'misto';
  etapas: ProcessoTimelineEtapaDto[];
  events: ProcessoTimelineEventDto[];
}
