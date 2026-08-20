import { apiGet } from './client'

export interface RbacPermissao {
  chave: string
  label: string
  descricao: string
  modulo: string | null
}

export interface RbacPerfil {
  nome: string
  descricao: string
  permissoes: string[]
  usuarios: number
  gruposAD: string[]
}

export interface RbacAdGroup {
  id: number
  nomeGrupo: string
  dn: string
  perfilMapeado: string
  usuarios: number
  sincronizadoEm: string | null
}

interface PermissionsResponse {
  permissoes: RbacPermissao[]
  perfis: RbacPerfil[]
}

interface AdGroupsResponse {
  groups: RbacAdGroup[]
}

export interface RbacOverview {
  permissoes: RbacPermissao[]
  perfis: RbacPerfil[]
  grupos: RbacAdGroup[]
}

export async function fetchAdGroups(): Promise<RbacAdGroup[]> {
  const response = await apiGet<AdGroupsResponse>('/admin/rbac/ad-groups')
  return response.groups
}

export async function fetchRbacOverview(): Promise<RbacOverview> {
  const [permissions, grupos] = await Promise.all([
    apiGet<PermissionsResponse>('/admin/rbac/permissions'),
    fetchAdGroups(),
  ])

  return {
    permissoes: permissions.permissoes,
    perfis: permissions.perfis,
    grupos,
  }
}
