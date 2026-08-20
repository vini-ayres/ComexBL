import type { BlVersion } from '../constants/bl-version.constants.js';
import type { BlDocumentType } from './bl-domain.types.js';

export interface WorkflowSummaryDto {
  id: number;
  documentType: BlDocumentType;
  documentNumber: string;
  blVersion: BlVersion;
  status: string;
  pendencia: string | null;
  responsavelUserId: number | null;
  confianca: number | null;
  updatedAt: string;
}
