import { getAuthToken } from './client'

/** URL da rota de arquivo (requer Authorization — não use direto em iframe/img). */
export function buildLocalFileUrl(fileName: string): string {
  const encoded = encodeURIComponent(fileName)
  return `${import.meta.env.VITE_API_URL ?? '/api'}/files/${encoded}`
}

/** Stream do arquivo associado a um BL Master/House. */
export function buildLocalFileUrlByBl(
  tipo: 'Master' | 'House',
  id: number,
): string {
  return `${import.meta.env.VITE_API_URL ?? '/api'}/files/by-bl/${tipo.toLowerCase()}/${id}`
}

export async function fetchAuthenticatedFile(url: string): Promise<Blob> {
  const token = getAuthToken()

  if (!token) {
    throw new Error('Token de autenticação ausente.')
  }

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    let message = `Erro ${response.status}`

    try {
      const body = (await response.json()) as { message?: string }
      if (body.message) message = body.message
    } catch {
      // resposta pode ser binária ou vazia
    }

    throw new Error(message)
  }

  return response.blob()
}

export async function fetchAuthenticatedFileObjectUrl(url: string): Promise<string> {
  const blob = await fetchAuthenticatedFile(url)
  return URL.createObjectURL(blob)
}
