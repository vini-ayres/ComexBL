import { apiGet } from './client'
import type { DashboardQueryParams, DashboardResponseDto } from './types'

export function fetchDashboard(params: DashboardQueryParams = {}) {
  return apiGet<DashboardResponseDto>('/bl/dashboard', {
    page: params.page ?? 1,
    pageSize: params.pageSize ?? 100,
    status: params.status,
    tipo: params.tipo,
    search: params.search,
  })
}
