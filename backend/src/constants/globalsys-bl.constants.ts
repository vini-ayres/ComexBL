/**
 * Colunas/aliases do SELECT GlobalSys expostas na API de lookup (whitelist).
 *
 * Aliases vêm de globalsys-select.queries.ts (JOINs Luciana). Não são
 * necessariamente colunas físicas de TB_BL.
 *
 * Mapeamentos de comparação BL Final × GlobalSys: globalsys-comparison.constants.ts.
 */

export type GlobalSysLookupHomologationStatus = 'confirmed' | 'assumed';

export interface GlobalSysTbBlColumnMapping {
  column: string;
  apiKey: string;
  homologationStatus: GlobalSysLookupHomologationStatus;
  homologationNotes?: string;
}

export const GLOBALSYS_TB_BL_COLUMNS = [
  { column: 'NR_BL', apiKey: 'numeroBl', homologationStatus: 'confirmed' },
  {
    column: 'REFERENCIA_EDI',
    apiKey: 'referenciaEdi',
    homologationStatus: 'confirmed',
    homologationNotes: 'TB_BL.REFERENCIA_EDI (REFERENCE_NUMBER no EDI).',
  },
  {
    column: 'NM_NAVIO',
    apiKey: 'vesselName',
    homologationStatus: 'confirmed',
    homologationNotes: 'TB_NAVIO.NM_NAVIO via ID_NAVIO.',
  },
  { column: 'NR_VIAGEM', apiKey: 'voyage', homologationStatus: 'confirmed' },
  {
    column: 'CD_PORTO_ORIGEM',
    apiKey: 'loadingPortCode',
    homologationStatus: 'confirmed',
    homologationNotes: 'TB_PORTO.CD_SIGLA_MARINHA_MERCANTE via ID_PORTO_ORIGEM.',
  },
  {
    column: 'NM_PORTO_ORIGEM',
    apiKey: 'loadingPortName',
    homologationStatus: 'confirmed',
    homologationNotes: 'TB_PORTO.NM_PORTO via ID_PORTO_ORIGEM.',
  },
  {
    column: 'CD_PORTO_DESTINO',
    apiKey: 'dischargePortCode',
    homologationStatus: 'confirmed',
    homologationNotes: 'TB_PORTO.CD_SIGLA_MARINHA_MERCANTE via ID_PORTO_DESTINO.',
  },
  {
    column: 'NM_PORTO_DESTINO',
    apiKey: 'dischargePortName',
    homologationStatus: 'confirmed',
    homologationNotes: 'TB_PORTO.NM_PORTO via ID_PORTO_DESTINO.',
  },
  {
    column: 'NM_CONSIGNEE',
    apiKey: 'consigneeName',
    homologationStatus: 'confirmed',
    homologationNotes: 'TB_PARCEIRO.NM_RAZAO via ID_PARCEIRO_CNEE.',
  },
  {
    column: 'NM_SHIPPER',
    apiKey: 'shipperName',
    homologationStatus: 'confirmed',
    homologationNotes: 'TB_PARCEIRO.NM_RAZAO via ID_PARCEIRO_SHIPPER (House).',
  },
  {
    column: 'VL_PESO_BRUTO',
    apiKey: 'grossWeight',
    homologationStatus: 'confirmed',
  },
  {
    column: 'VL_M3',
    apiKey: 'volume',
    homologationStatus: 'confirmed',
    homologationNotes: 'Na comparação, blFinalKey é volumeMeasure (mesma coluna VL_M3).',
  },
  {
    column: 'NR_CNTR',
    apiKey: 'containerNumber',
    homologationStatus: 'confirmed',
    homologationNotes: 'TB_CNTR_BL.NR_CNTR via TB_AMR_CNTR_BL.',
  },
] as const satisfies readonly GlobalSysTbBlColumnMapping[];

export type GlobalSysTbBlApiKey = (typeof GLOBALSYS_TB_BL_COLUMNS)[number]['apiKey'];
