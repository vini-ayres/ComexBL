/**
 * Mapeamentos BL Final ↔ GlobalSys (Microled).
 *
 * IMPORTANTE — Sprint 7A:
 * - Estes mapeamentos são a única fonte de verdade para colunas GlobalSys usadas
 *   na comparação. Não espalhar nomes de coluna hardcoded em outros arquivos.
 * - Campos com `homologationStatus: 'assumed'` dependem de validação em homologação
 *   contra o banco Microled real; não alterar queries para "adivinhar" novas colunas.
 * - `lookup_only`: coluna usada apenas no GET /globalsys/lookup, não na comparação.
 */

export type GlobalSysHomologationStatus = 'confirmed' | 'assumed' | 'lookup_only';

export interface GlobalSysComparisonFieldMapping {
  blFinalKey: string;
  globalSysColumn: string;
  label: string;
  homologationStatus: GlobalSysHomologationStatus;
  homologationNotes?: string;
}

export interface GlobalSysColumnMapping {
  column: string;
  apiKey: string;
  homologationStatus: GlobalSysHomologationStatus;
  homologationNotes?: string;
}

/** Mapeamento campo-a-campo BL Final Master ↔ TB_BL (GlobalSys). Chave de consulta: NR_BL = MasterNumber. */
export const BL_FINAL_MASTER_GLOBALSYS_FIELDS: readonly GlobalSysComparisonFieldMapping[] = [
  {
    blFinalKey: 'referenceNumber',
    globalSysColumn: 'REFERENCIA_EDI',
    label: 'Reference Number',
    homologationStatus: 'assumed',
    homologationNotes:
      'Nome da coluna inferido na Sprint 6; validar valor retornado vs BL Final em homologação.',
  },
  {
    blFinalKey: 'vesselName',
    globalSysColumn: 'NM_NAVIO',
    label: 'Vessel Name',
    homologationStatus: 'assumed',
  },
  {
    blFinalKey: 'voyage',
    globalSysColumn: 'NR_VIAGEM',
    label: 'Voyage',
    homologationStatus: 'assumed',
  },
  {
    blFinalKey: 'loadingPortCode',
    globalSysColumn: 'CD_PORTO_ORIGEM',
    label: 'Loading Port Code',
    homologationStatus: 'assumed',
  },
  {
    blFinalKey: 'loadingPortName',
    globalSysColumn: 'NM_PORTO_ORIGEM',
    label: 'Loading Port Name',
    homologationStatus: 'assumed',
  },
  {
    blFinalKey: 'dischargePortCode',
    globalSysColumn: 'CD_PORTO_DESTINO',
    label: 'Discharge Port Code',
    homologationStatus: 'assumed',
  },
  {
    blFinalKey: 'dischargePortName',
    globalSysColumn: 'NM_PORTO_DESTINO',
    label: 'Discharge Port Name',
    homologationStatus: 'assumed',
  },
  {
    blFinalKey: 'shipperName',
    globalSysColumn: 'NM_EMBARCADOR',
    label: 'Shipper Name',
    homologationStatus: 'assumed',
  },
  {
    blFinalKey: 'consigneeName',
    globalSysColumn: 'NM_CONSIGNATARIO',
    label: 'Consignee Name',
    homologationStatus: 'assumed',
  },
  {
    blFinalKey: 'grossWeight',
    globalSysColumn: 'QT_PESO_BRUTO',
    label: 'Gross Weight',
    homologationStatus: 'assumed',
    homologationNotes: 'Comparação normaliza decimais via serializeComparisonValue.',
  },
  {
    blFinalKey: 'volumeMeasure',
    globalSysColumn: 'QT_VOLUME',
    label: 'Volume Measure',
    homologationStatus: 'assumed',
    homologationNotes:
      'Lookup expõe a mesma coluna como apiKey "volume" (globalsys-bl.constants.ts).',
  },
  {
    blFinalKey: 'containerNumber',
    globalSysColumn: 'NR_CONTAINER',
    label: 'Container Number',
    homologationStatus: 'assumed',
  },
] as const;

/**
 * Mapeamento BL Final House ↔ TB_BL (consulta por NR_BL = HouseNumber).
 * House usa campos adicionais não presentes no lookup de Master.
 */
export const BL_FINAL_HOUSE_GLOBALSYS_FIELDS: readonly GlobalSysComparisonFieldMapping[] = [
  {
    blFinalKey: 'shipperName',
    globalSysColumn: 'NM_EMBARCADOR',
    label: 'Shipper Name',
    homologationStatus: 'assumed',
  },
  {
    blFinalKey: 'consigneeName',
    globalSysColumn: 'NM_CONSIGNATARIO',
    label: 'Consignee Name',
    homologationStatus: 'assumed',
  },
  {
    blFinalKey: 'notifyName',
    globalSysColumn: 'NM_NOTIFICADO',
    label: 'Notify Name',
    homologationStatus: 'assumed',
    homologationNotes:
      'Coluna não exposta no lookup (globalsys-bl.constants.ts); validar existência em TB_BL.',
  },
  {
    blFinalKey: 'loadingPortCode',
    globalSysColumn: 'CD_PORTO_ORIGEM',
    label: 'Loading Port Code',
    homologationStatus: 'assumed',
  },
  {
    blFinalKey: 'loadingPortName',
    globalSysColumn: 'NM_PORTO_ORIGEM',
    label: 'Loading Port Name',
    homologationStatus: 'assumed',
  },
  {
    blFinalKey: 'dischargePortCode',
    globalSysColumn: 'CD_PORTO_DESTINO',
    label: 'Discharge Port Code',
    homologationStatus: 'assumed',
  },
  {
    blFinalKey: 'dischargePortName',
    globalSysColumn: 'NM_PORTO_DESTINO',
    label: 'Discharge Port Name',
    homologationStatus: 'assumed',
  },
  {
    blFinalKey: 'grossWeight',
    globalSysColumn: 'QT_PESO_BRUTO',
    label: 'Gross Weight',
    homologationStatus: 'assumed',
  },
  {
    blFinalKey: 'volumeMeasure',
    globalSysColumn: 'QT_VOLUME',
    label: 'Volume Measure',
    homologationStatus: 'assumed',
  },
  {
    blFinalKey: 'itemName',
    globalSysColumn: 'DS_MERCADORIA',
    label: 'Item Name',
    homologationStatus: 'assumed',
    homologationNotes:
      'Coluna não exposta no lookup; validar correspondência com itemName do BL Final House.',
  },
  {
    blFinalKey: 'containerNumber',
    globalSysColumn: 'NR_CONTAINER',
    label: 'Container Number',
    homologationStatus: 'assumed',
    homologationNotes:
      'BL Final House obtém containerNumber de container.containerNumber (flattenBlFinalHouse).',
  },
] as const;

/**
 * Colunas TB_CARGA_BL usadas na comparação.
 * Nomenclatura Microled assumida na Sprint 6 — validar em homologação.
 * Query: SELECT * FROM TB_CARGA_BL WHERE NR_BL = @numeroBL
 */
export const GLOBALSYS_TB_CARGA_BL_COLUMNS: readonly GlobalSysColumnMapping[] = [
  {
    column: 'NM_MARCA',
    apiKey: 'brand',
    homologationStatus: 'assumed',
    homologationNotes: 'Mapeia para cargo.brand no BL Final.',
  },
  {
    column: 'NM_CONTRAMARCA',
    apiKey: 'counterMark',
    homologationStatus: 'assumed',
  },
  {
    column: 'TP_CARGA',
    apiKey: 'cargoType',
    homologationStatus: 'assumed',
  },
  {
    column: 'CL_RISCO',
    apiKey: 'hazardClass',
    homologationStatus: 'assumed',
    homologationNotes: 'Usado na chave lógica de matching de cargas.',
  },
  {
    column: 'NR_ONU',
    apiKey: 'unNumber',
    homologationStatus: 'assumed',
    homologationNotes: 'Usado na chave lógica de matching de cargas.',
  },
  {
    column: 'NM_EMBALAGEM',
    apiKey: 'packaging',
    homologationStatus: 'assumed',
  },
] as const;

/**
 * Colunas TB_BL_NCM usadas na comparação.
 * Query: SELECT * FROM TB_BL_NCM WHERE NR_BL = @numeroBL
 * Fallback de leitura (NR_NCM, NCM) está em globalsys-comparison.mapper.ts — não duplicar.
 */
export const GLOBALSYS_TB_BL_NCM_COLUMNS: readonly GlobalSysColumnMapping[] = [
  {
    column: 'CD_NCM',
    apiKey: 'ncmCode',
    homologationStatus: 'assumed',
    homologationNotes:
      'Mapper tenta CD_NCM, depois NR_NCM e NCM como fallback; validar coluna correta em homologação.',
  },
] as const;

/** Campos GlobalSys cujo mapeamento ainda depende de homologação (atalho para checklist). */
export const GLOBALSYS_HOMOLOGATION_PENDING = [
  ...BL_FINAL_MASTER_GLOBALSYS_FIELDS,
  ...BL_FINAL_HOUSE_GLOBALSYS_FIELDS,
  ...GLOBALSYS_TB_CARGA_BL_COLUMNS,
  ...GLOBALSYS_TB_BL_NCM_COLUMNS,
].filter((field) => field.homologationStatus === 'assumed');
