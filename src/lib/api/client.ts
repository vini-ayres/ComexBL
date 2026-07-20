const API_BASE = import.meta.env.VITE_API_URL ?? '/api'

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function parseApiError(response: Response): Promise<never> {
  let message = `Erro ${response.status}`

  try {
    const body = (await response.json()) as { message?: string }
    if (body.message) message = body.message
  } catch {
    // ignore parse errors
  }

  throw new ApiError(response.status, message)
}

export async function apiGet<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
  const url = new URL(`${API_BASE}${path}`, window.location.origin)

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== '') {
        url.searchParams.set(key, String(value))
      }
    }
  }

  const response = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
  })

  if (!response.ok) {
    return parseApiError(response)
  }

  return response.json() as Promise<T>
}

export async function apiPost<T>(
  path: string,
  body: unknown,
): Promise<T> {
  const url = new URL(`${API_BASE}${path}`, window.location.origin)

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    return parseApiError(response)
  }

  return response.json() as Promise<T>
}

export async function apiPatch<T>(
  path: string,
  body: unknown,
): Promise<T> {
  const url = new URL(`${API_BASE}${path}`, window.location.origin)

  const response = await fetch(url.toString(), {
    method: 'PATCH',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    return parseApiError(response)
  }

  return response.json() as Promise<T>
}

export { API_BASE }
