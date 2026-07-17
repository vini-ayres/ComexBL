import { apiGet } from './client'
import type { HealthResponse } from './types'

export function fetchHealth() {
  return apiGet<HealthResponse>('/health')
}
