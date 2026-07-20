import { apiGet } from './client'
import { encodeDocumentNumber, toApiDocumentType } from './document-params'
import type { BlDocumentType, BlVersion, WorkflowSummaryDto } from './types'

export function fetchWorkflow(
  tipo: BlDocumentType,
  documentNumber: string,
  version: BlVersion = 'FINAL',
) {
  return apiGet<WorkflowSummaryDto>(
    `/bl/workflow/${toApiDocumentType(tipo)}/${encodeDocumentNumber(documentNumber)}`,
    { version },
  )
}
