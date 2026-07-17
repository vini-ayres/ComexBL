import { apiGet } from './client'
import type {
  BlMasterDetailDto,
  BlMasterSummaryDto,
  BlStatsDto,
  PaginatedResult,
} from './types'

export function fetchBlMasters(page = 1, pageSize = 100) {
  return apiGet<PaginatedResult<BlMasterSummaryDto>>('/bl/masters', {
    page,
    pageSize,
  })
}

export function fetchBlMasterById(id: number) {
  return apiGet<BlMasterDetailDto>(`/bl/masters/${id}`)
}

export function fetchBlStats() {
  return apiGet<BlStatsDto>('/bl/stats')
}
