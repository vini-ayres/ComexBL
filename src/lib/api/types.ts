export type BlStatus =
  | 'divergencia'
  | 'apoio_humano'
  | 'processando'
  | 'finalizado'
  | 'nao_encontrado'

export interface ContainerDto {
  numero: string
  tipo: string
  lacre: string
  pesoBruto: string
  volumes: number
}

export interface BlMasterSummaryDto {
  id: number
  numeroBl: string
  navio: string
  viagem: string
  portoOrigem: string
  portoDestino: string
  status: BlStatus
  volumesTotal: number
  createdAt: string
}

export interface BlMasterDetailDto extends BlMasterSummaryDto {
  embarcador: string
  consignatario: string
  agenteCarga: string
  dataEmbarque: string
  dataChegadaPrevista: string
  pesoBrutoTotal: string
  origemArquivo: string
  updatedAt: string
  containers: ContainerDto[]
  houses: BlHouseSummaryDto[]
}

export interface BlHouseSummaryDto {
  id: number
  masterId: number
  numeroHbl: string
  descricaoMercadoria: string
  status: BlStatus
  volumes: number
}

export interface PaginatedResult<T> {
  data: T[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

export interface ApoioHumanoDetailDto {
  item: ApoioHumanoItemDto
  documento: ApoioHumanoDocumentoDto
  campos: CampoExtraidoDto[]
  historico: HistoricoAlteracaoDto[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

export interface CampoExtraidoDto {
  id: string
  campo: string
  valorRecebido: string
  valorManual: string | null
  confianca: number
  status: "pendente" | "confirmado" | "editado"
}

export interface HistoricoAlteracaoDto {
  id: string
  usuario: string
  dataHora: string
  campo: string
  valorAntes: string
  valorDepois: string
}

export interface ApoioHumanoDocumentoDto {
  nome: string
  paginas: number
  origemPath: string
}

export interface ApoioHumanoItemDto {
  id: number
  tipo: "Master" | "House"
  numeroBl: string
  navio: string
  viagem: string
}

export interface SaveApoioHumanoCampoInput {
  campoKey: string
  campoLabel: string
  valorRecebido: string
  valorManual: string | null
  confianca: number
  status: "pendente" | "confirmado" | "editado"
}

export interface SaveApoioHumanoRequest {
  campos: SaveApoioHumanoCampoInput[]
}

export interface SaveApoioHumanoResponse {
  saved: number
  completed: boolean
  historico: HistoricoAlteracaoDto[]
}

export interface BlStatsDto {
  masters: number
  houses: number
}

export interface DashboardKpiDto {
  label: string
  value: number
  delta?: number
  suffix?: string
}

export interface DashboardBlListItemDto {
  id: string
  blId: number
  numeroBl: string
  tipo: "Master" | "House"
  status: BlStatus
  pendencia: string
  responsavel: string | null
  dataHora: string
  navio?: string
  viagem?: string
  origem?: string
  destino?: string
  confianca?: number
}

export interface DashboardResponseDto {
  kpis: DashboardKpiDto[]
  items: PaginatedResult<DashboardBlListItemDto>
}

export interface DashboardQueryParams {
  page?: number
  pageSize?: number
  status?: string
  tipo?: string
  search?: string
}

export interface HealthResponse {
  status: 'ok' | 'degraded'
  timestamp: string
  uptime: number
  environment: string
  api: { status: 'ok' }
  database: {
    status: 'connected' | 'disconnected'
    server: string
    database: string
    encrypt: boolean
    trustServerCertificate: boolean
    responseTimeMs: number
    error?: string
  }
}

export interface BlNaoEncontradoDocumentoDto {
  nome: string
  paginas: number
  origemPath: string
}

export interface BlNaoEncontradoListItemDto {
  id: number
  tipo: "Master" | "House"
  numeroBl: string
  data: string
  tentativasConsulta: number
  ultimaTentativa: string
  documento: BlNaoEncontradoDocumentoDto
}

export interface BlNaoEncontradoDetailDto extends BlNaoEncontradoListItemDto {
  ultimoDetalhe: string | null
}

export interface GlobalSysConsultaResponseDto {
  found: boolean
  tentativaNumero: number
  workflowStatus: string
  detalhe: string
  numeroBl: string
}
