const API_BASE = import.meta.env.VITE_API_URL ?? '/api'

const TOKEN_KEY = 'comexbl_auth_token'

let unauthorizedHandler: (() => void) | null = null

export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setAuthToken(token: string | null): void {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token)
  } else {
    localStorage.removeItem(TOKEN_KEY)
  }
}

function buildHeaders(includeJson = false): HeadersInit {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  }

  if (includeJson) {
    headers['Content-Type'] = 'application/json'
  }

  const token = getAuthToken()
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  return headers
}

async function parseApiError(response: Response): Promise<never> {
  let message = `Erro ${response.status}`

  try {
    const body = (await response.json()) as { message?: string }
    if (body.message) message = body.message
  } catch {
    // ignore parse errors
  }

  if (response.status === 401) {
    unauthorizedHandler?.()
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
    headers: buildHeaders(),
  })

  if (!response.ok) {
    return parseApiError(response)
  }

  return response.json() as Promise<T>
}

export async function apiPost<T>(
  path: string,
  body?: unknown,
): Promise<T> {
  const url = new URL(`${API_BASE}${path}`, window.location.origin)

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: buildHeaders(body !== undefined),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (!response.ok) {
    return parseApiError(response)
  }

  if (response.status === 204) {
    return undefined as T
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
    headers: buildHeaders(true),
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    return parseApiError(response)
  }

  return response.json() as Promise<T>
}

export async function apiPut<T>(
  path: string,
  body: unknown,
): Promise<T> {
  const url = new URL(`${API_BASE}${path}`, window.location.origin)

  const response = await fetch(url.toString(), {
    method: 'PUT',
    headers: buildHeaders(true),
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    return parseApiError(response)
  }

  return response.json() as Promise<T>
}

export { API_BASE }
