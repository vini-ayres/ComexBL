import { apiGet, apiPatch, apiPost } from './client'
import type {
  BlMasterDetailDto,
  BlMasterSummaryDto,
  BlStatsDto,
  PaginatedResult,
  XmlDispatchEvaluationDto,
} from './types'

export function fetchBlMasters(
  page = 1,
  pageSize = 100,
  params: { search?: string; blVersion?: string } = {},
) {
  return apiGet<PaginatedResult<BlMasterSummaryDto>>('/bl/masters', {
    page,
    pageSize,
    search: params.search,
    blVersion: params.blVersion,
  })
}

export function fetchBlMasterById(id: number) {
  return apiGet<BlMasterDetailDto>(`/bl/masters/${id}`)
}

export function updateMasterHblCount(id: number, hblCount: number) {
  return apiPatch<BlMasterDetailDto>(`/bl/masters/${id}/hbl-count`, { hblCount })
}

export function dispatchMasterXml(id: number, force = false) {
  return apiPost<{ lot: BlMasterDetailDto; evaluation: XmlDispatchEvaluationDto }>(
    `/bl/masters/${id}/xml-dispatch`,
    { force },
  )
}

export function linkHouseToMaster(masterId: number, houseId: number) {
  return apiPost<BlMasterDetailDto>(`/bl/masters/${masterId}/houses/${houseId}/link`)
}

export function unlinkHouseFromMaster(masterId: number, houseId: number) {
  return apiPost<BlMasterDetailDto>(`/bl/masters/${masterId}/houses/${houseId}/unlink`)
}

export function fetchBlStats() {
  return apiGet<BlStatsDto>('/bl/stats')
}
