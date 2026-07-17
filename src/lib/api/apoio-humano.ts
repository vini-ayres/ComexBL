import { apiGet, apiPost } from './client'
import type {
  ApoioHumanoDetailDto,
  SaveApoioHumanoRequest,
  SaveApoioHumanoResponse,
} from './types'

export function fetchApoioHumano(page = 1) {
  return apiGet<ApoioHumanoDetailDto>('/bl/apoio-humano', { page, pageSize: 1 })
}

export function saveApoioHumanoCampos(
  tipo: 'Master' | 'House',
  id: number,
  payload: SaveApoioHumanoRequest,
) {
  return apiPost<SaveApoioHumanoResponse>(
    `/bl/apoio-humano/${tipo.toLowerCase()}/${id}/campos`,
    payload,
  )
}
