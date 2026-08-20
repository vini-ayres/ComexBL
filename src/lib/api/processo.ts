import { apiGet } from './client'
import { encodeDocumentNumber, toApiDocumentType } from './document-params'
import type { BlDocumentType, BlVersion, ProcessoTimelineResponseDto } from './types'

export function fetchProcessoTimeline(
  tipo: BlDocumentType,
  documentNumber: string,
  version: BlVersion = 'FINAL',
) {
  return apiGet<ProcessoTimelineResponseDto>(
    `/bl/processo/${toApiDocumentType(tipo)}/${encodeDocumentNumber(documentNumber)}/timeline`,
    { version },
  )
}
