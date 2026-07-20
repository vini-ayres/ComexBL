import { apiGet, apiPatch, apiPost } from './client'
import { encodeDocumentNumber, toApiDocumentType } from './document-params'
import type {
  BlDocumentType,
  DivergenciaGlobalSysComparisonResponseDto,
  DivergenciaGlobalSysPersistResponseDto,
  DivergenciaLatestDetailDto,
  DivergenciaResolveResponseDto,
  ResolveDivergenciaCampoRequestDto,
  ResolveDivergenciaRequestDto,
} from './types'

function divergenciaPath(tipo: BlDocumentType, documentNumber: string): string {
  return `/bl/divergencia/${toApiDocumentType(tipo)}/${encodeDocumentNumber(documentNumber)}`
}

export function fetchDivergenciaLatest(tipo: BlDocumentType, documentNumber: string) {
  return apiGet<DivergenciaLatestDetailDto>(`${divergenciaPath(tipo, documentNumber)}/latest`)
}

export function fetchDivergenciaById(id: number) {
  return apiGet<DivergenciaLatestDetailDto>(`/bl/divergencia/by-id/${id}`)
}

export function compareDivergenciaGlobalSys(tipo: BlDocumentType, documentNumber: string) {
  return apiGet<DivergenciaGlobalSysComparisonResponseDto>(
    `${divergenciaPath(tipo, documentNumber)}/compare-globalsys`,
  )
}

export function compareAndPersistDivergenciaGlobalSys(
  tipo: BlDocumentType,
  documentNumber: string,
) {
  return apiPost<DivergenciaGlobalSysPersistResponseDto>(
    `${divergenciaPath(tipo, documentNumber)}/compare-globalsys-and-persist`,
    {},
  )
}

export function resolveDivergencia(id: number, payload: ResolveDivergenciaRequestDto) {
  return apiPatch<DivergenciaResolveResponseDto>(`/bl/divergencia/${id}/resolve`, payload)
}

export function resolveDivergenciaCampo(
  id: number,
  campoKey: string,
  payload: ResolveDivergenciaCampoRequestDto,
) {
  return apiPatch<DivergenciaResolveResponseDto>(
    `/bl/divergencia/${id}/campos/${encodeURIComponent(campoKey)}/resolve`,
    payload,
  )
}
