// ============================================================
// Tipos centrais do domínio Comex / BL
// ============================================================

export type BLStatus = "divergencia" | "apoio_humano" | "processando" | "finalizado" | "nao_encontrado"

export type BLTipo = "Master" | "House"

export interface BLListItem {
  id: string
  numeroBL: string
  tipo: BLTipo
  status: BLStatus
  pendencia: string
  responsavel: string | null
  dataHora: string // ISO
  navio?: string
  viagem?: string
  origem?: string
  destino?: string
  confianca?: number // 0-100
}

export interface KPI {
  label: string
  value: number
  delta?: number
  suffix?: string
}

// ------------------------------------------------------------
// BL Master / House (banco local)
// ------------------------------------------------------------

export interface Container {
  numero: string
  tipo: string // ex: 40HC, 20GP
  lacre: string
  pesoBruto: string
  volumes: number
}

export interface BLMaster {
  id: string
  numeroBL: string
  navio: string
  viagem: string
  portoOrigem: string
  portoDestino: string
  embarcador: string
  consignatario: string
  agenteCarga: string
  dataEmbarque: string
  dataChegadaPrevista: string
  pesoBrutoTotal: string
  volumesTotal: number
  containers: Container[]
  houses: string[] // ids de BLHouse
  status: BLStatus
  origemArquivo: string // files/{FileName}
}

export interface BLHouse {
  id: string
  masterId: string
  numeroHBL: string
  embarcador: string
  consignatario: string
  notify: string
  descricaoMercadoria: string
  pesoBruto: string
  volumes: number
  containers: Container[]
  documentos: { nome: string; url: string; tipo: string }[]
  status: BLStatus
  origemArquivo: string
}

// ------------------------------------------------------------
// Apoio Humano / Divergência
// ------------------------------------------------------------

export interface CampoExtraido {
  id: string
  campo: string
  valorRecebido: string
  valorManual: string | null
  confianca: number // 0-100
  status: "pendente" | "confirmado" | "editado"
}

export interface CampoDivergencia {
  id: string
  campo: string
  valorBLFinal: string
  valorGlobalSys: string
  status: "igual" | "divergente"
  categoria: "master" | "house"
}

export interface HistoricoAlteracao {
  id: string
  usuario: string
  dataHora: string
  campo: string
  valorAntes: string
  valorDepois: string
}

export interface ProcessoTimelineStep {
  id: string
  titulo: string
  status: "concluido" | "atual" | "pendente"
  dataHora?: string
  descricao?: string
}

export interface ProcessoFinalizado {
  id: string
  numeroBL: string
  tipo: BLTipo
  usuario: string
  tempoProcessamento: string
  divergenciasEncontradas: number
  divergenciasResolvidas: number
  timeline: ProcessoTimelineStep[]
  finalizadoEm: string
}

export interface DocumentoOneDrive {
  nome: string
  url: string
  tipo: "pdf" | "imagem"
  paginas: number
}

export interface BLNaoEncontrado {
  id: string
  numeroBL: string
  tipo: BLTipo
  data: string
  documento: DocumentoOneDrive
  tentativasConsulta: number
  ultimaTentativa: string
}

// ------------------------------------------------------------
// Administração / RBAC / LDAP / Auditoria
// ------------------------------------------------------------

export type PerfilUsuario = "Administrador" | "Supervisor" | "Operador" | "Auditor"

export interface Usuario {
  id: string
  nome: string
  email: string
  login: string
  grupoAD: string
  perfil: PerfilUsuario
  status: "ativo" | "inativo" | "bloqueado"
  ultimoAcesso: string
  sincronizadoEm: string
  avatarColor: string
}

export interface Permissao {
  chave: string
  label: string
  descricao: string
}

export interface GrupoAD {
  id: string
  nomeGrupo: string
  dn: string
  perfilMapeado: PerfilUsuario
  usuarios: number
  sincronizadoEm: string
}

export interface RegistroAuditoria {
  id: string
  usuario: string
  dataHora: string
  acao: string
  registro: string
  entidade: string
  valoresAntes?: Record<string, string>
  valoresDepois?: Record<string, string>
  ip?: string
}

export interface LdapConfig {
  servidor: string
  porta: number
  baseDN: string
  grupoAD: string
  bindUser: string
  usarSSL: boolean
  status: "conectado" | "desconectado" | "erro"
  ultimaSincronizacao: string
}

export interface OneDriveConfig {
  tenantId: string
  clientId: string
  pastaRaiz: string
  status: "conectado" | "desconectado" | "erro"
  ultimaSincronizacao: string
  arquivosIndexados: number
}

export interface DbConfig {
  nome: string
  host: string
  database: string
  usuario: string
  status: "online" | "offline" | "instavel"
  latenciaMs: number
  ultimaVerificacao: string
  tabelas?: { nome: string; registros: number }[]
}
