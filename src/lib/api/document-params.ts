export type ApiDocumentType = 'master' | 'house'
export type BlDocumentType = 'Master' | 'House'
export type BlVersion = 'DRAFT' | 'FINAL'

export function normalizeDocumentType(value: string | null | undefined): BlDocumentType {
  return value?.toLowerCase() === 'house' ? 'House' : 'Master'
}

export function toApiDocumentType(tipo: BlDocumentType): ApiDocumentType {
  return tipo === 'House' ? 'house' : 'master'
}

export function encodeDocumentNumber(documentNumber: string): string {
  return encodeURIComponent(documentNumber)
}
