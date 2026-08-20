import { apiGet, apiPatch, apiPost } from './client'
import type { PerfilUsuario, Usuario } from '@/types'

interface UsersListResponse {
  users: Array<{
    id: number
    login: string
    email: string
    nome: string
    grupoAD: string
    perfil: string
    status: Usuario['status']
    ultimoAcesso: string | null
    sincronizadoEm: string | null
    avatarColor: string | null
  }>
  lastSyncAt: string | null
}

export interface SyncUsersResponse {
  syncedAt: string
  groupsProcessed: number
  usersCreated: number
  usersUpdated: number
  usersDeactivated: number
  totalActiveUsers: number
}

function mapUser(item: UsersListResponse['users'][number]): Usuario {
  return {
    id: String(item.id),
    nome: item.nome,
    email: item.email,
    login: item.login,
    grupoAD: item.grupoAD,
    perfil: item.perfil as PerfilUsuario,
    status: item.status,
    ultimoAcesso: item.ultimoAcesso ?? '',
    sincronizadoEm: item.sincronizadoEm ?? '',
    avatarColor: item.avatarColor ?? '#1B3153',
  }
}

export async function fetchUsers(): Promise<{ users: Usuario[]; lastSyncAt: string | null }> {
  const response = await apiGet<UsersListResponse>('/admin/users')
  return {
    users: response.users.map(mapUser),
    lastSyncAt: response.lastSyncAt,
  }
}

export async function syncUsersFromAd(): Promise<SyncUsersResponse> {
  return apiPost<SyncUsersResponse>('/admin/users/sync')
}

export async function updateUserStatus(userId: string, status: Usuario['status']): Promise<void> {
  await apiPatch(`/admin/users/${userId}/status`, { status })
}
