import { apiGet } from './client'
import { encodeDocumentNumber } from './document-params'
import type { BlFinalResponseDto, BlVersion } from './types'

export function fetchBlFinal(masterNumber: string, version: BlVersion = 'FINAL') {
  return apiGet<BlFinalResponseDto>(
    `/bl/masters/by-number/${encodeDocumentNumber(masterNumber)}/bl-final`,
    { version },
  )
}
