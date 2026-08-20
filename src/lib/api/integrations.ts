import { apiGet, apiPost, apiPut } from './client'
import type { SyncUsersResponse } from './users'

export type IntegrationStatus = 'conectado' | 'desconectado' | 'erro'
export type IntegrationSource = 'database' | 'env'

export interface LdapAdGroupDto {
  id: number
  nomeGrupo: string
  dn: string
  perfilMapeado: string
  usuarios: number
  sincronizadoEm: string | null
}

export interface LdapConfigDto {
  enabled: boolean
  source: IntegrationSource
  status: IntegrationStatus
  servidor: string
  porta: number
  baseDN: string
  grupoAD: string
  bindUser: string
  passwordSet: boolean
  usarSSL: boolean
  ultimaSincronizacao: string | null
  usuariosSincronizados: number
  gruposMapeados: number
  grupos: LdapAdGroupDto[]
}

export interface LdapConfigPayload {
  servidor: string
  porta: number
  baseDN: string
  grupoAD: string
  bindUser: string
  password?: string
  usarSSL: boolean
}

export interface GlobalSysConfigDto {
  enabled: boolean
  source: IntegrationSource
  status: IntegrationStatus
  server: string
  port: number
  database: string
  domain: string
  authMode: string
  user: string
  passwordSet: boolean
  encrypt: boolean
  trustServerCertificate: boolean
  lastCheckAt: string | null
  latencyMs: number | null
  lastError: string | null
}

export interface LocalDbConfigDto extends GlobalSysConfigDto {
  masters: number
  houses: number
}

export interface GlobalSysConfigPayload {
  server: string
  port: number
  database: string
  domain: string
  authMode: string
  user: string
  password?: string
  encrypt: boolean
  trustServerCertificate: boolean
}

export interface IntegrationTestResult {
  connected: boolean
  status: IntegrationStatus
  responseTimeMs: number
  message: string
  authMode?: string
}

export function fetchLdapConfig() {
  return apiGet<LdapConfigDto>('/admin/integrations/ldap')
}

export function saveLdapConfig(payload: LdapConfigPayload) {
  return apiPut<LdapConfigDto>('/admin/integrations/ldap', payload)
}

export function testLdapConfig(payload: LdapConfigPayload) {
  return apiPost<IntegrationTestResult>('/admin/integrations/ldap/test', payload)
}

export function syncLdapUsers() {
  return apiPost<SyncUsersResponse>('/admin/integrations/ldap/sync')
}

export function fetchGlobalSysConfig() {
  return apiGet<GlobalSysConfigDto>('/admin/integrations/globalsys')
}

export function saveGlobalSysConfig(payload: GlobalSysConfigPayload) {
  return apiPut<GlobalSysConfigDto>('/admin/integrations/globalsys', payload)
}

export function testGlobalSysConfig(payload: GlobalSysConfigPayload) {
  return apiPost<IntegrationTestResult>('/admin/integrations/globalsys/test', payload)
}

export function fetchLocalDbConfig() {
  return apiGet<LocalDbConfigDto>('/admin/integrations/local-db')
}

export function saveLocalDbConfig(payload: GlobalSysConfigPayload) {
  return apiPut<LocalDbConfigDto>('/admin/integrations/local-db', payload)
}

export function testLocalDbConfig(payload: GlobalSysConfigPayload) {
  return apiPost<IntegrationTestResult>('/admin/integrations/local-db/test', payload)
}
