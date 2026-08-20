import { apiGet } from './client'
import { encodeDocumentNumber } from './document-params'
import type { BlDocumentType, BlFinalResponseDto, BlVersion } from './types'

export function fetchBlFinal(masterNumber: string, version: BlVersion = 'FINAL') {
  return apiGet<BlFinalResponseDto>(
    `/bl/masters/by-number/${encodeDocumentNumber(masterNumber)}/bl-final`,
    { version },
  )
}

export function fetchHouseBlFinal(houseNumber: string, version: BlVersion = 'FINAL') {
  return apiGet<BlFinalResponseDto>(
    `/bl/houses/by-number/${encodeDocumentNumber(houseNumber)}/bl-final`,
    { version },
  )
}

export function fetchDocumentBlFinal(
  tipo: BlDocumentType,
  documentNumber: string,
  masterNumber?: string,
  version: BlVersion = 'FINAL',
) {
  if (tipo === 'House') {
    if (masterNumber && masterNumber !== documentNumber) {
      return fetchBlFinal(masterNumber, version)
    }

    return fetchHouseBlFinal(documentNumber, version)
  }

  return fetchBlFinal(documentNumber, version)
}
