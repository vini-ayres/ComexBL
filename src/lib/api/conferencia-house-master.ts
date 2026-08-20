import { apiGet, apiPatch, apiPost } from './client'
import { encodeDocumentNumber, toApiDocumentType } from './document-params'
import type {
  BlDocumentType,
  ConferenciaLatestDetailDto,
  ConferenciaQueueItemDto,
  ConferenciaResolveResponseDto,
  ResolveConferenciaCampoRequestDto,
  ResolveConferenciaRequestDto,
} from './types'

function conferenciaPath(tipo: BlDocumentType, documentNumber: string): string {
  return `/bl/conferencia-house-master/${toApiDocumentType(tipo)}/${encodeDocumentNumber(documentNumber)}`
}

export function fetchConferenciaQueue(page = 1) {
  return apiGet<ConferenciaQueueItemDto>('/bl/conferencia-house-master', {
    page,
    pageSize: 1,
  })
}

export function fetchConferenciaLatest(tipo: BlDocumentType, documentNumber: string) {
  return apiGet<ConferenciaLatestDetailDto>(`${conferenciaPath(tipo, documentNumber)}/latest`)
}

export function compareAndPersistConferencia(tipo: BlDocumentType, documentNumber: string) {
  return apiPost<unknown>(
    `${conferenciaPath(tipo, documentNumber)}/compare-and-persist`,
    {},
  )
}

export function resolveConferencia(id: number, payload: ResolveConferenciaRequestDto) {
  return apiPatch<ConferenciaResolveResponseDto>(
    `/bl/conferencia-house-master/${id}/resolve`,
    payload,
  )
}

export function resolveConferenciaCampo(
  id: number,
  campoKey: string,
  payload: ResolveConferenciaCampoRequestDto,
) {
  return apiPatch<ConferenciaResolveResponseDto>(
    `/bl/conferencia-house-master/${id}/campos/${encodeURIComponent(campoKey)}/resolve`,
    payload,
  )
}
