import type {
  BLListItem, BLMaster, BLHouse, BLNaoEncontrado, CampoExtraido, CampoDivergencia,
  HistoricoAlteracao, ProcessoFinalizado, Usuario, GrupoAD, RegistroAuditoria,
  LdapConfig, OneDriveConfig, DbConfig, Permissao, PerfilUsuario, KPI,
} from "@/types"

// ------------------------------------------------------------
// KPIs Dashboard
// ------------------------------------------------------------
export const kpis: KPI[] = [
  { label: "BLs Pendentes", value: 18, delta: 3 },
  { label: "Divergências", value: 7, delta: -2 },
  { label: "Apoio Humano", value: 5, delta: 1 },
  { label: "Processados Hoje", value: 42, delta: 12 },
  { label: "Tempo Médio (min)", value: 6.4, suffix: "min", delta: -0.8 },
]

// ------------------------------------------------------------
// Lista de BLs (Dashboard)
// ------------------------------------------------------------
const navios = ["MSC ISABELLA", "MAERSK ATLANTIC", "CMA CGM AMAZON", "EVERGREEN STAR", "HAPAG PIONEER", "COSCO HARMONY"]
const origens = ["Shanghai, CN", "Rotterdam, NL", "Santos, BR", "Hamburgo, DE", "Ningbo, CN", "Antuérpia, BE"]
const destinos = ["Santos, BR", "Itajaí, BR", "Paranaguá, BR", "Rio Grande, BR", "Suape, BR"]
const responsaveis = ["Ana Ribeiro", "Carlos Mendes", "Fernanda Lima", "João Pedro Alves", "Marcela Santos", null]
const pendencias: Record<string, string[]> = {
  divergencia: ["Peso divergente Master x GlobalSys", "Container não localizado no GlobalSys", "Consignatário divergente"],
  apoio_humano: ["Campo ilegível no documento", "Baixa confiança OCR (< 60%)", "Múltiplos containers não reconhecidos"],
  conferencia_house_master: ["Peso House × Master divergente", "Volume House × Master divergente", "Embalagem House × Master divergente"],
  processando: ["Aguardando consulta GlobalSys", "Em comparação automática", "Extração em andamento"],
  finalizado: ["Nenhuma pendência", "Validado e finalizado"],
  nao_encontrado: ["BL inexistente no GlobalSys", "Aguardando associação manual"],
}

function pick<T>(arr: T[], seed: number): T {
  return arr[seed % arr.length]
}

function genBLList(count: number): BLListItem[] {
  const statuses: BLListItem["status"][] = ["divergencia", "apoio_humano", "conferencia_house_master", "processando", "finalizado", "nao_encontrado"]
  const items: BLListItem[] = []
  for (let i = 0; i < count; i++) {
    const status = pick(statuses, i)
    const tipo = i % 3 === 0 ? "House" : "Master"
    const daysAgo = Math.floor(i / 2)
    const date = new Date()
    date.setDate(date.getDate() - daysAgo)
    date.setHours(8 + (i % 10), (i * 7) % 60)
    items.push({
      id: `bl-${1000 + i}`,
      numeroBL: `${tipo === "Master" ? "MBL" : "HBL"}-${2026000 + i}`,
      tipo,
      status,
      pendencia: pick(pendencias[status], i),
      responsavel: pick(responsaveis, i),
      dataHora: date.toISOString(),
      navio: pick(navios, i),
      viagem: `V${100 + i}${pick(["N", "S", "E", "W"], i)}`,
      origem: pick(origens, i),
      destino: pick(destinos, i),
      confianca: status === "apoio_humano" ? 40 + (i % 40) : undefined,
    })
  }
  return items
}

export const blList: BLListItem[] = genBLList(48)

// ------------------------------------------------------------
// BL Não Encontrado
// ------------------------------------------------------------
export const blsNaoEncontrados: BLNaoEncontrado[] = [
  {
    id: "ne-1",
    numeroBL: "MBL-2026118",
    tipo: "Master",
    data: "2026-07-07T09:24:00",
    documento: { nome: "MBL-2026118_original.pdf", url: "/mock-docs/bl-sample.pdf", tipo: "pdf", paginas: 3 },
    tentativasConsulta: 3,
    ultimaTentativa: "2026-07-08T08:10:00",
  },
  {
    id: "ne-2",
    numeroBL: "HBL-2026221",
    tipo: "House",
    data: "2026-07-06T15:02:00",
    documento: { nome: "HBL-2026221_original.pdf", url: "/mock-docs/bl-sample.pdf", tipo: "pdf", paginas: 2 },
    tentativasConsulta: 1,
    ultimaTentativa: "2026-07-06T15:05:00",
  },
  {
    id: "ne-3",
    numeroBL: "MBL-2026305",
    tipo: "Master",
    data: "2026-07-05T11:40:00",
    documento: { nome: "MBL-2026305_original.pdf", url: "/mock-docs/bl-sample.pdf", tipo: "pdf", paginas: 4 },
    tentativasConsulta: 5,
    ultimaTentativa: "2026-07-08T07:55:00",
  },
]

// ------------------------------------------------------------
// Apoio Humano - Campos extraídos
// ------------------------------------------------------------
export const campoExtraidoMock: CampoExtraido[] = [
  { id: "c1", campo: "Número do BL", valorRecebido: "MBL-2026042", valorManual: null, confianca: 96, status: "confirmado" },
  { id: "c2", campo: "Navio", valorRecebido: "MSC ISABELLA", valorManual: null, confianca: 91, status: "confirmado" },
  { id: "c3", campo: "Viagem", valorRecebido: "V104N", valorManual: null, confianca: 88, status: "confirmado" },
  { id: "c4", campo: "Porto de Origem", valorRecebido: "Shanghai, CN", valorManual: null, confianca: 94, status: "confirmado" },
  { id: "c5", campo: "Porto de Destino", valorRecebido: "Sant0s, BR", valorManual: "Santos, BR", confianca: 52, status: "editado" },
  { id: "c6", campo: "Embarcador", valorRecebido: "GLOBAL TRADING CO LTD", valorManual: null, confianca: 97, status: "confirmado" },
  { id: "c7", campo: "Consignatário", valorRecebido: "IMP0RT BRASIL S/A", valorManual: "IMPORT BRASIL S/A", confianca: 48, status: "editado" },
  { id: "c8", campo: "Peso Bruto Total", valorRecebido: "24.850 KG", valorManual: null, confianca: 76, status: "pendente" },
  { id: "c9", campo: "Volumes", valorRecebido: "1.240", valorManual: null, confianca: 82, status: "pendente" },
  { id: "c10", campo: "Container 1", valorRecebido: "MSCU7?41230", valorManual: null, confianca: 39, status: "pendente" },
  { id: "c11", campo: "Container 2", valorRecebido: "TCLU9184402", valorManual: null, confianca: 85, status: "confirmado" },
  { id: "c12", campo: "Lacre", valorRecebido: "BR445210", valorManual: null, confianca: 90, status: "confirmado" },
]

export const historicoApoioHumano: HistoricoAlteracao[] = [
  { id: "h1", usuario: "Fernanda Lima", dataHora: "2026-07-08T09:12:00", campo: "Porto de Destino", valorAntes: "Sant0s, BR", valorDepois: "Santos, BR" },
  { id: "h2", usuario: "Fernanda Lima", dataHora: "2026-07-08T09:14:00", campo: "Consignatário", valorAntes: "IMP0RT BRASIL S/A", valorDepois: "IMPORT BRASIL S/A" },
]

// ------------------------------------------------------------
// Divergência BL Final x GlobalSys
// ------------------------------------------------------------
export const divergenciaMaster: CampoDivergencia[] = [
  { id: "d1", campo: "Número do BL", valorBLFinal: "MBL-2026042", valorGlobalSys: "MBL-2026042", status: "igual", categoria: "master" },
  { id: "d2", campo: "Navio", valorBLFinal: "MSC ISABELLA", valorGlobalSys: "MSC ISABELLA", status: "igual", categoria: "master" },
  { id: "d3", campo: "Viagem", valorBLFinal: "V104N", valorGlobalSys: "V104S", status: "divergente", categoria: "master" },
  { id: "d4", campo: "Porto de Destino", valorBLFinal: "Santos, BR", valorGlobalSys: "Santos, BR", status: "igual", categoria: "master" },
  { id: "d5", campo: "Peso Bruto Total", valorBLFinal: "24.850 KG", valorGlobalSys: "24.100 KG", status: "divergente", categoria: "master" },
  { id: "d6", campo: "Volumes", valorBLFinal: "1.240", valorGlobalSys: "1.240", status: "igual", categoria: "master" },
  { id: "d7", campo: "Consignatário", valorBLFinal: "IMPORT BRASIL S/A", valorGlobalSys: "IMPORT BRASIL LTDA", status: "divergente", categoria: "master" },
]

export const divergenciaHouse: CampoDivergencia[] = [
  { id: "d8", campo: "Número HBL", valorBLFinal: "HBL-2026042-01", valorGlobalSys: "HBL-2026042-01", status: "igual", categoria: "house" },
  { id: "d9", campo: "Embarcador", valorBLFinal: "GLOBAL TRADING CO", valorGlobalSys: "GLOBAL TRADING CO LTD", status: "divergente", categoria: "house" },
  { id: "d10", campo: "Container 1", valorBLFinal: "MSCU7841230", valorGlobalSys: "MSCU7841230", status: "igual", categoria: "house" },
  { id: "d11", campo: "Peso Bruto", valorBLFinal: "8.200 KG", valorGlobalSys: "8.200 KG", status: "igual", categoria: "house" },
]

export const historicoDivergencia: HistoricoAlteracao[] = [
  { id: "hd1", usuario: "Carlos Mendes", dataHora: "2026-07-08T10:02:00", campo: "Viagem", valorAntes: "V104S", valorDepois: "V104N" },
]

// ------------------------------------------------------------
// Processo Finalizado
// ------------------------------------------------------------
export const processoFinalizado: ProcessoFinalizado = {
  id: "pf-1",
  numeroBL: "MBL-2026018",
  tipo: "Master",
  usuario: "Ana Ribeiro",
  tempoProcessamento: "4min 12s",
  divergenciasEncontradas: 3,
  divergenciasResolvidas: 3,
  finalizadoEm: "2026-07-08T11:32:00",
  timeline: [
    { id: "t1", titulo: "Recebimento", status: "concluido", dataHora: "2026-07-08T11:27:48", descricao: "Documento recebido via OneDrive / OCR n8n" },
    { id: "t2", titulo: "Consulta GlobalSys", status: "concluido", dataHora: "2026-07-08T11:28:50", descricao: "Registro localizado no GlobalSys" },
    { id: "t3", titulo: "Comparação", status: "concluido", dataHora: "2026-07-08T11:29:40", descricao: "3 divergências identificadas" },
    { id: "t4", titulo: "Validação", status: "concluido", dataHora: "2026-07-08T11:31:20", descricao: "Divergências revisadas e aceitas por Ana Ribeiro" },
    { id: "t5", titulo: "Finalização", status: "concluido", dataHora: "2026-07-08T11:32:00", descricao: "BL validado e arquivado" },
  ],
}

// ------------------------------------------------------------
// BL_Master / BL_House (banco local)
// ------------------------------------------------------------
export const blMasterList: BLMaster[] = [
  {
    id: "m-1",
    numeroBL: "MBL-2026042",
    navio: "MSC ISABELLA",
    viagem: "V104N",
    portoOrigem: "Shanghai, CN",
    portoDestino: "Santos, BR",
    embarcador: "GLOBAL TRADING CO LTD",
    consignatario: "IMPORT BRASIL S/A",
    agenteCarga: "MSC BRASIL LOGÍSTICA LTDA",
    dataEmbarque: "2026-06-10",
    dataChegadaPrevista: "2026-07-15",
    pesoBrutoTotal: "24.850 KG",
    volumesTotal: 1240,
    containers: [
      { numero: "MSCU7841230", tipo: "40HC", lacre: "BR445210", pesoBruto: "12.400 KG", volumes: 620 },
      { numero: "TCLU9184402", tipo: "40HC", lacre: "BR445211", pesoBruto: "12.450 KG", volumes: 620 },
    ],
    houses: ["h-1"],
    status: "finalizado",
    origemArquivo: "/OneDrive/BLs/2026/07/MBL-2026042.pdf",
  },
  {
    id: "m-2",
    numeroBL: "MBL-2026057",
    navio: "MAERSK ATLANTIC",
    viagem: "V211E",
    portoOrigem: "Rotterdam, NL",
    portoDestino: "Itajaí, BR",
    embarcador: "EURO EXPORT B.V.",
    consignatario: "SUL COMERCIAL LTDA",
    agenteCarga: "MAERSK BRASIL LTDA",
    dataEmbarque: "2026-06-18",
    dataChegadaPrevista: "2026-07-20",
    pesoBrutoTotal: "18.300 KG",
    volumesTotal: 980,
    containers: [
      { numero: "MAEU2231190", tipo: "20GP", lacre: "NL889012", pesoBruto: "18.300 KG", volumes: 980 },
    ],
    houses: ["h-2", "h-3"],
    status: "divergencia",
    origemArquivo: "/OneDrive/BLs/2026/07/MBL-2026057.pdf",
  },
]

export const blHouseList: BLHouse[] = [
  {
    id: "h-1",
    masterId: "m-1",
    numeroHBL: "HBL-2026042-01",
    embarcador: "GLOBAL TRADING CO LTD",
    consignatario: "IMPORT BRASIL S/A",
    notify: "IMPORT BRASIL S/A",
    descricaoMercadoria: "Peças automotivas diversas",
    pesoBruto: "24.850 KG",
    volumes: 1240,
    containers: [
      { numero: "MSCU7841230", tipo: "40HC", lacre: "BR445210", pesoBruto: "12.400 KG", volumes: 620 },
    ],
    documentos: [{ nome: "HBL-2026042-01.pdf", url: "/mock-docs/bl-sample.pdf", tipo: "pdf" }],
    status: "finalizado",
    origemArquivo: "/OneDrive/BLs/2026/07/HBL-2026042-01.pdf",
  },
  {
    id: "h-2",
    masterId: "m-2",
    numeroHBL: "HBL-2026057-01",
    embarcador: "EURO EXPORT B.V.",
    consignatario: "SUL COMERCIAL LTDA",
    notify: "SUL COMERCIAL LTDA",
    descricaoMercadoria: "Equipamentos industriais",
    pesoBruto: "9.150 KG",
    volumes: 490,
    containers: [
      { numero: "MAEU2231190", tipo: "20GP", lacre: "NL889012", pesoBruto: "9.150 KG", volumes: 490 },
    ],
    documentos: [{ nome: "HBL-2026057-01.pdf", url: "/mock-docs/bl-sample.pdf", tipo: "pdf" }],
    status: "divergencia",
    origemArquivo: "/OneDrive/BLs/2026/07/HBL-2026057-01.pdf",
  },
]

// ------------------------------------------------------------
// Administração - Usuários / AD / RBAC
// ------------------------------------------------------------
export const usuarios: Usuario[] = [
  { id: "u1", nome: "Ana Ribeiro", email: "ana.ribeiro@empresa.com.br", login: "ana.ribeiro", grupoAD: "GG_COMEX_SUPERVISORES", perfil: "Supervisor", status: "ativo", ultimoAcesso: "2026-07-08T11:40:00", sincronizadoEm: "2026-07-08T06:00:00", avatarColor: "#1B3153" },
  { id: "u2", nome: "Carlos Mendes", email: "carlos.mendes@empresa.com.br", login: "carlos.mendes", grupoAD: "GG_COMEX_OPERADORES", perfil: "Operador", status: "ativo", ultimoAcesso: "2026-07-08T10:15:00", sincronizadoEm: "2026-07-08T06:00:00", avatarColor: "#EA8022" },
  { id: "u3", nome: "Fernanda Lima", email: "fernanda.lima@empresa.com.br", login: "fernanda.lima", grupoAD: "GG_COMEX_OPERADORES", perfil: "Operador", status: "ativo", ultimoAcesso: "2026-07-08T09:14:00", sincronizadoEm: "2026-07-08T06:00:00", avatarColor: "#2563EB" },
  { id: "u4", nome: "João Pedro Alves", email: "joao.alves@empresa.com.br", login: "joao.alves", grupoAD: "GG_COMEX_AUDITORIA", perfil: "Auditor", status: "ativo", ultimoAcesso: "2026-07-07T17:22:00", sincronizadoEm: "2026-07-08T06:00:00", avatarColor: "#16A34A" },
  { id: "u5", nome: "Marcela Santos", email: "marcela.santos@empresa.com.br", login: "marcela.santos", grupoAD: "GG_COMEX_ADMIN", perfil: "Administrador", status: "ativo", ultimoAcesso: "2026-07-08T08:05:00", sincronizadoEm: "2026-07-08T06:00:00", avatarColor: "#DC2626" },
  { id: "u6", nome: "Roberto Freitas", email: "roberto.freitas@empresa.com.br", login: "roberto.freitas", grupoAD: "GG_COMEX_OPERADORES", perfil: "Operador", status: "bloqueado", ultimoAcesso: "2026-06-28T14:00:00", sincronizadoEm: "2026-07-08T06:00:00", avatarColor: "#7991B2" },
  { id: "u7", nome: "Patrícia Souza", email: "patricia.souza@empresa.com.br", login: "patricia.souza", grupoAD: "GG_COMEX_SUPERVISORES", perfil: "Supervisor", status: "inativo", ultimoAcesso: "2026-05-30T09:00:00", sincronizadoEm: "2026-07-08T06:00:00", avatarColor: "#CA8A04" },
]

export const gruposAD: GrupoAD[] = [
  { id: "g1", nomeGrupo: "GG_COMEX_ADMIN", dn: "CN=GG_COMEX_ADMIN,OU=Grupos,OU=Comex,DC=empresa,DC=com,DC=br", perfilMapeado: "Administrador", usuarios: 2, sincronizadoEm: "2026-07-08T06:00:00" },
  { id: "g2", nomeGrupo: "GG_COMEX_SUPERVISORES", dn: "CN=GG_COMEX_SUPERVISORES,OU=Grupos,OU=Comex,DC=empresa,DC=com,DC=br", perfilMapeado: "Supervisor", usuarios: 4, sincronizadoEm: "2026-07-08T06:00:00" },
  { id: "g3", nomeGrupo: "GG_COMEX_OPERADORES", dn: "CN=GG_COMEX_OPERADORES,OU=Grupos,OU=Comex,DC=empresa,DC=com,DC=br", perfilMapeado: "Operador", usuarios: 12, sincronizadoEm: "2026-07-08T06:00:00" },
  { id: "g4", nomeGrupo: "GG_COMEX_AUDITORIA", dn: "CN=GG_COMEX_AUDITORIA,OU=Grupos,OU=Comex,DC=empresa,DC=com,DC=br", perfilMapeado: "Auditor", usuarios: 3, sincronizadoEm: "2026-07-08T06:00:00" },
]

export const permissoesPorPerfil: Record<PerfilUsuario, string[]> = {
  Administrador: ["visualizar_bl", "editar_bl", "aprovar_divergencias", "administrar_usuarios", "configurar_integracoes", "auditoria"],
  Supervisor: ["visualizar_bl", "editar_bl", "aprovar_divergencias", "auditoria"],
  Operador: ["visualizar_bl", "editar_bl"],
  Auditor: ["visualizar_bl", "auditoria"],
}

export const permissoesDisponiveis: Permissao[] = [
  { chave: "visualizar_bl", label: "Visualizar BL", descricao: "Acessar dashboard, detalhes e documentos de BL" },
  { chave: "editar_bl", label: "Editar", descricao: "Corrigir campos extraídos e dados de apoio humano" },
  { chave: "aprovar_divergencias", label: "Aprovar Divergências", descricao: "Aceitar, manter ou encaminhar divergências GlobalSys" },
  { chave: "administrar_usuarios", label: "Administrar Usuários", descricao: "Gerenciar usuários, grupos AD e permissões" },
  { chave: "configurar_integracoes", label: "Configurar Integrações", descricao: "LDAP, OneDrive e bancos de dados" },
  { chave: "auditoria", label: "Auditoria", descricao: "Consultar trilha de auditoria do sistema" },
]

// ------------------------------------------------------------
// Auditoria
// ------------------------------------------------------------
export const registrosAuditoria: RegistroAuditoria[] = [
  { id: "a1", usuario: "Fernanda Lima", dataHora: "2026-07-08T09:14:00", acao: "Edição de campo", registro: "MBL-2026042", entidade: "Apoio Humano", valoresAntes: { "Consignatário": "IMP0RT BRASIL S/A" }, valoresDepois: { "Consignatário": "IMPORT BRASIL S/A" }, ip: "10.20.4.112" },
  { id: "a2", usuario: "Carlos Mendes", dataHora: "2026-07-08T10:02:00", acao: "Correção de divergência", registro: "MBL-2026042", entidade: "Divergência", valoresAntes: { "Viagem": "V104S" }, valoresDepois: { "Viagem": "V104N" }, ip: "10.20.4.98" },
  { id: "a3", usuario: "Ana Ribeiro", dataHora: "2026-07-08T11:32:00", acao: "Finalização de processo", registro: "MBL-2026018", entidade: "Processo", ip: "10.20.4.55" },
  { id: "a4", usuario: "Marcela Santos", dataHora: "2026-07-08T08:05:00", acao: "Alteração de permissão", registro: "Roberto Freitas", entidade: "Usuário", valoresAntes: { "Status": "ativo" }, valoresDepois: { "Status": "bloqueado" }, ip: "10.20.4.10" },
  { id: "a5", usuario: "Sistema (n8n)", dataHora: "2026-07-08T07:55:00", acao: "Tentativa de consulta GlobalSys", registro: "MBL-2026305", entidade: "BL Não Encontrado", ip: "10.20.1.5" },
  { id: "a6", usuario: "João Pedro Alves", dataHora: "2026-07-07T17:22:00", acao: "Consulta de auditoria", registro: "-", entidade: "Auditoria", ip: "10.20.4.140" },
]

// ------------------------------------------------------------
// Configurações de Integração
// ------------------------------------------------------------
export const ldapConfig: LdapConfig = {
  servidor: "ldap://ad01.empresa.com.br",
  porta: 389,
  baseDN: "DC=empresa,DC=com,DC=br",
  grupoAD: "GG_COMEX_*",
  bindUser: "svc_comex_ldap",
  usarSSL: true,
  status: "conectado",
  ultimaSincronizacao: "2026-07-08T06:00:00",
}

export const oneDriveConfig: OneDriveConfig = {
  tenantId: "8f2a1c3e-xxxx-xxxx-xxxx-a91b7c3d4e5f",
  clientId: "5c7b9d2a-xxxx-xxxx-xxxx-11ab22cd33ef",
  pastaRaiz: "/BLs/Processados",
  status: "conectado",
  ultimaSincronizacao: "2026-07-08T11:45:00",
  arquivosIndexados: 3842,
}

export const dbConfigs: DbConfig[] = [
  {
    nome: "GlobalSys (SQL Server Externo)",
    host: "globalsys-sql01.empresa.local",
    database: "GLOBALSYS_PROD",
    usuario: "svc_globalsys_ro",
    status: "online",
    latenciaMs: 42,
    ultimaVerificacao: "2026-07-08T11:50:00",
  },
  {
    nome: "Banco Local da Aplicação",
    host: "comexbl-sql02.empresa.local",
    database: "COMEXBL_APP",
    usuario: "svc_comexbl_app",
    status: "online",
    latenciaMs: 8,
    ultimaVerificacao: "2026-07-08T11:50:00",
    tabelas: [
      { nome: "BL_Master", registros: 1284 },
      { nome: "BL_House", registros: 2107 },
      { nome: "Usuarios", registros: 24 },
      { nome: "Auditoria", registros: 15832 },
    ],
  },
]
