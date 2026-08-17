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
  fileName: string | null
}

export interface ApoioHumanoItemDto {
  id: number
  tipo: "Master" | "House"
  numeroBl: string
  navio: string
  viagem: string
  blVersion: BlVersion
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
  fileName: string | null
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

// ------------------------------------------------------------
// Divergência / Workflow / Processo / BL Final (Sprint 8A)
// ------------------------------------------------------------

export type ComparisonKind = 'DRAFT_FINAL' | 'GLOBALSYS'

export type ComparisonStatus =
  | 'completo_sem_divergencia'
  | 'completo_com_divergencia'
  | 'documento_incompleto'
  | 'erro_comparacao'

export type DivergenciaResolutionStrategy =
  | 'aceitar_bl_final'
  | 'aceitar_globalsys'
  | 'manual'

export type DivergenciaCampoStatus =
  | 'pendente'
  | 'resolvido_bl_final'
  | 'resolvido_globalsys'
  | 'resolvido_manual'

export type ProcessoTimelineItemStatus =
  | 'pendente'
  | 'em_andamento'
  | 'concluido'
  | 'erro'
  | 'nao_aplicavel'

export interface ComparisonOriginDto {
  kind: ComparisonKind
  left: string
  right: string
  label: string
}

export interface WorkflowSummaryDto {
  id: number
  documentType: BlDocumentType
  documentNumber: string
  blVersion: BlVersion
  status: string
  pendencia: string | null
  responsavelUserId: number | null
  confianca: number | null
  updatedAt: string
}

export interface DivergenciaCampoDto {
  id: number
  campoKey: string
  campoLabel: string
  valorDraft: string
  valorFinal: string
  valorBlFinal: string
  valorGlobalSys: string
  status: string
  categoria: 'master' | 'house' | 'cargo' | 'ncm'
}

export interface DivergenciaLatestDetailDto {
  id: number
  documentType: BlDocumentType
  documentNumber: string
  status: string
  createdAt: string
  updatedAt: string
  resolvedAt: string | null
  campos: DivergenciaCampoDto[]
  comparisonKind: ComparisonKind | null
  comparisonStatus: ComparisonStatus
  comparisonDate: string
  origin: ComparisonOriginDto | null
  workflow: WorkflowSummaryDto | null
}

export interface DivergenciaComparisonFieldDto {
  campoKey: string
  campoLabel: string
  valorBlFinal: string | null
  valorGlobalSys: string | null
  divergent: boolean
}

export interface DivergenciaCargoComparisonDto {
  logicalKey: string
  campoKey: string
  valorBlFinal: string | null
  valorGlobalSys: string | null
  divergent: boolean
}

export interface DivergenciaNcmComparisonDto {
  ncmCode: string
  campoKey: string
  presence: 'both' | 'blfinal_only' | 'globalsys_only'
  divergent: boolean
}

export interface DivergenciaGlobalSysComparisonResponseDto {
  documentType: BlDocumentType
  documentNumber: string
  comparisonKind: 'GLOBALSYS'
  origin: ComparisonOriginDto
  comparisonStatus: ComparisonStatus
  hasDivergence: boolean
  divergenciaCount: number
  changedFields: string[]
  summary: string
  missingBlFinal: boolean
  missingGlobalSys: boolean
  fields: DivergenciaComparisonFieldDto[]
  cargo: DivergenciaCargoComparisonDto[]
  ncm: DivergenciaNcmComparisonDto[]
}

export interface DivergenciaGlobalSysPersistResponseDto
  extends DivergenciaGlobalSysComparisonResponseDto {
  divergenciaId: number | null
  divergenciaStatus: string | null
  workflow: WorkflowSummaryDto | null
}

export interface ResolveDivergenciaRequestDto {
  resolutionStrategy: DivergenciaResolutionStrategy
  manualValues?: Record<string, string>
  observacao?: string
  responsavelUserId?: number
  responsavelNome?: string
  resolvedAt?: string
}

export interface ResolveDivergenciaCampoRequestDto {
  resolutionStrategy: DivergenciaResolutionStrategy
  manualValue?: string
  observacao?: string
  responsavelUserId?: number
  responsavelNome?: string
  resolvedAt?: string
}

export interface DivergenciaCampoResolutionDetailDto {
  campoKey: string
  campoLabel: string
  status: string
  resolutionStrategy: DivergenciaResolutionStrategy | null
  resolvedValue: string | null
  valorBlFinal: string
  valorGlobalSys: string
  observacao: string | null
  responsavelUserId: number | null
  responsavelNome: string | null
  resolvedAt: string | null
}

export interface DivergenciaResolutionSummaryDto {
  divergenciaId: number
  status: string
  totalCampos: number
  pendingCampos: number
  resolvedCampos: number
  allResolved: boolean
  resolvedAt: string | null
  resolvedByUserId: number | null
}

export interface DivergenciaResolveResponseDto {
  summary: DivergenciaResolutionSummaryDto
  divergencia: DivergenciaLatestDetailDto
  workflow: WorkflowSummaryDto | null
  campos: DivergenciaCampoResolutionDetailDto[]
}

export interface ProcessoTimelineEventDto {
  id: string
  eventType: string
  titulo: string
  descricao: string | null
  status: ProcessoTimelineItemStatus
  occurredAt: string
  source: 'persistido' | 'dinamico'
  metadata?: Record<string, string | number | boolean | null>
}

export interface ProcessoTimelineEtapaDto {
  ordem: number
  titulo: string
  status: ProcessoTimelineItemStatus
  descricao: string | null
  completedAt: string | null
  source: 'persistido' | 'dinamico'
  events: ProcessoTimelineEventDto[]
}

export interface ProcessoTimelineResponseDto {
  documentType: BlDocumentType
  documentNumber: string
  blVersion: BlVersion
  workflowStatus: string | null
  source: 'persistido' | 'dinamico' | 'misto'
  etapas: ProcessoTimelineEtapaDto[]
  events: ProcessoTimelineEventDto[]
}

export interface BlFinalCargoDto {
  brand: string | null
  counterMark: string | null
  cargoType: string | null
  hazardClass: string | null
  unNumber: string | null
  packaging: string | null
}

export interface BlFinalHouseContainerDto {
  containerNumber: string | null
  containerSealNo1: string | null
  containerSealNo2: string | null
  containerType: string | null
  containerQty: number | null
  containerUnitCode: string | null
  containerGwt: string | null
  containerCbm: string | null
}

export interface BlFinalHouseDto {
  houseNumber: string
  shipperName: string | null
  shipperAddress: string | null
  consigneeName: string | null
  consigneeAddress: string | null
  notifyName: string | null
  notifyAddress: string | null
  blCargoTypeExIm: string | null
  originalBlMethodCode: string | null
  serviceTerm: string | null
  freightTerm: string | null
  receiptPortCode: string | null
  receiptPortName: string | null
  loadingPortCode: string | null
  loadingPortName: string | null
  dischargePortCode: string | null
  dischargePortName: string | null
  deliveryPortCode: string | null
  deliveryPortName: string | null
  packingQuantity: number | null
  packingQuantityUnitCode: string | null
  grossWeight: string | null
  volumeMeasure: string | null
  issueDate: string | null
  itemName: string | null
  container: BlFinalHouseContainerDto
  cargos: BlFinalCargoDto[]
  ncms: string[]
}

export interface BlFinalMasterDto {
  referenceNumber: string | null
  masterNumber: string
  blTypeExportImport: string | null
  vesselName: string | null
  voyage: string | null
  onboardDate: string | null
  arrivalDate: string | null
  hblCount: number | null
  shipperName: string | null
  shipperAddress: string | null
  consigneeName: string | null
  consigneeAddress: string | null
  notifyName: string | null
  notifyAddress: string | null
  carrierScacCode: string | null
  carrierName: string | null
  cargoTypeLclFclBulk: string | null
  loadType: string | null
  serviceTerm: string | null
  freightTerm: string | null
  loadingPortCode: string | null
  loadingPortName: string | null
  dischargePortCode: string | null
  dischargePortName: string | null
  deliveryPortCode: string | null
  deliveryPortName: string | null
  finalDestinationPortCode: string | null
  finalDestinationPortName: string | null
  containerNumber: string | null
  containerSealNo1: string | null
  containerType: string | null
  packingQuantity: number | null
  packingQuantityUnitCode: string | null
  grossWeight: string | null
  volumeMeasure: string | null
}

export interface BlFinalResponseDto {
  masterNumber: string
  blVersion: BlVersion
  master: BlFinalMasterDto
  houses: BlFinalHouseDto[]
}

export type BlDocumentType = 'Master' | 'House'
export type BlVersion = 'DRAFT' | 'FINAL'
