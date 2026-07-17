import { apiGet, apiPost } from './client'
import type {
  BlNaoEncontradoDetailDto,
  BlNaoEncontradoListItemDto,
  GlobalSysConsultaResponseDto,
  PaginatedResult,
} from './types'

export function fetchBlNaoEncontrado(page = 1, pageSize = 50) {
  return apiGet<PaginatedResult<BlNaoEncontradoListItemDto>>('/bl/nao-encontrado', {
    page,
    pageSize,
  })
}

export function fetchBlNaoEncontradoDetail(tipo: 'Master' | 'House', id: number) {
  return apiGet<BlNaoEncontradoDetailDto>(
    `/bl/nao-encontrado/${tipo.toLowerCase()}/${id}`,
  )
}

export function reprocessarConsultaGlobalSys(tipo: 'Master' | 'House', id: number) {
  return apiPost<GlobalSysConsultaResponseDto>(
    `/bl/nao-encontrado/${tipo.toLowerCase()}/${id}/reprocessar`,
  )
}

export function consultarGlobalSys(tipo: 'Master' | 'House', id: number) {
  return apiPost<GlobalSysConsultaResponseDto>(
    `/bl/globalsys/consultar/${tipo.toLowerCase()}/${id}`,
  )
}
