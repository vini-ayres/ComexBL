import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { normalizeDocumentType } from '@/lib/api/document-params'
import type { BlDocumentType } from '@/lib/api/types'

export interface DocumentParams {
  tipo: BlDocumentType
  documentNumber: string
  masterNumber: string
  isValid: boolean
}

export function useDocumentParams(): DocumentParams {
  const [searchParams] = useSearchParams()

  return useMemo(() => {
    const tipo = normalizeDocumentType(searchParams.get('tipo'))
    const documentNumber = searchParams.get('documentNumber')?.trim() ?? ''
    const masterNumber = searchParams.get('masterNumber')?.trim() || documentNumber

    return {
      tipo,
      documentNumber,
      masterNumber,
      isValid: documentNumber.length > 0,
    }
  }, [searchParams])
}

export function buildDocumentSearchParams(input: {
  tipo: BlDocumentType
  documentNumber: string
  masterNumber?: string
}): string {
  const params = new URLSearchParams({
    tipo: input.tipo,
    documentNumber: input.documentNumber,
  })

  if (input.masterNumber && input.masterNumber !== input.documentNumber) {
    params.set('masterNumber', input.masterNumber)
  }

  return params.toString()
}
