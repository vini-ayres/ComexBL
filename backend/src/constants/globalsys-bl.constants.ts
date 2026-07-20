/**

 * Colunas TB_BL expostas na API de lookup (whitelist — demais colunas não vazam).

 *

 * IMPORTANTE — Sprint 7A:

 * - Este arquivo cobre apenas GET /bl/globalsys/lookup/:numeroBl.

 * - Mapeamentos de comparação BL Final × GlobalSys estão em globalsys-comparison.constants.ts.

 * - Não usar estas colunas como referência para comparação; conjuntos são distintos.

 */



export type GlobalSysLookupHomologationStatus = 'confirmed' | 'assumed';



export interface GlobalSysTbBlColumnMapping {

  column: string;

  apiKey: string;

  homologationStatus: GlobalSysLookupHomologationStatus;

  homologationNotes?: string;

}



export const GLOBALSYS_TB_BL_COLUMNS = [

  { column: 'NR_BL', apiKey: 'numeroBl', homologationStatus: 'assumed' },

  {

    column: 'REFERENCIA_EDI',

    apiKey: 'referenciaEdi',

    homologationStatus: 'assumed',

    homologationNotes: 'Na comparação, mapeia blFinalKey referenceNumber.',

  },

  { column: 'NM_NAVIO', apiKey: 'vesselName', homologationStatus: 'assumed' },

  { column: 'NR_VIAGEM', apiKey: 'voyage', homologationStatus: 'assumed' },

  { column: 'CD_PORTO_ORIGEM', apiKey: 'loadingPortCode', homologationStatus: 'assumed' },

  { column: 'NM_PORTO_ORIGEM', apiKey: 'loadingPortName', homologationStatus: 'assumed' },

  { column: 'CD_PORTO_DESTINO', apiKey: 'dischargePortCode', homologationStatus: 'assumed' },

  { column: 'NM_PORTO_DESTINO', apiKey: 'dischargePortName', homologationStatus: 'assumed' },

  { column: 'NM_CONSIGNATARIO', apiKey: 'consigneeName', homologationStatus: 'assumed' },

  { column: 'NM_EMBARCADOR', apiKey: 'shipperName', homologationStatus: 'assumed' },

  {

    column: 'QT_PESO_BRUTO',

    apiKey: 'grossWeight',

    homologationStatus: 'assumed',

  },

  {

    column: 'QT_VOLUME',

    apiKey: 'volume',

    homologationStatus: 'assumed',

    homologationNotes:

      'Na comparação, blFinalKey é volumeMeasure (mesma coluna QT_VOLUME).',

  },

  { column: 'NR_CONTAINER', apiKey: 'containerNumber', homologationStatus: 'assumed' },
] as const satisfies readonly GlobalSysTbBlColumnMapping[];



/** Colunas usadas na comparação House mas ausentes deste lookup — validar em homologação. */

export const GLOBALSYS_LOOKUP_MISSING_FOR_COMPARISON = [

  { globalSysColumn: 'NM_NOTIFICADO', blFinalKey: 'notifyName', scope: 'House' },

  { globalSysColumn: 'DS_MERCADORIA', blFinalKey: 'itemName', scope: 'House' },

] as const;



export type GlobalSysTbBlApiKey =

  (typeof GLOBALSYS_TB_BL_COLUMNS)[number]['apiKey'];


