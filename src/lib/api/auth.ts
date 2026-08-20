import { apiGet, apiPost, setAuthToken } from './client'
import type { PerfilUsuario } from '@/types'

export interface AuthUserResponse {
  id: number
  login: string
  email: string
  nome: string
  perfil: PerfilUsuario
  grupoAD: string
  permissoes: string[]
  roles?: string[]
}

export interface LoginResponse {
  token: string
  user: AuthUserResponse
}

export async function loginWithActiveDirectory(login: string, password: string): Promise<LoginResponse> {
  const result = await apiPost<LoginResponse>('/auth/login', { login, password })
  setAuthToken(result.token)
  return result
}

export async function fetchCurrentUser(): Promise<AuthUserResponse> {
  return apiGet<AuthUserResponse>('/auth/me')
}

export async function logoutFromApi(): Promise<void> {
  try {
    await apiPost('/auth/logout')
  } finally {
    setAuthToken(null)
  }
}

export function hasPermission(user: AuthUserResponse | null, permission: string): boolean {
  return Boolean(user?.permissoes.includes(permission))
}

export function hasAnyPermission(user: AuthUserResponse | null, permissions: string[]): boolean {
  return permissions.some((permission) => hasPermission(user, permission))
}
