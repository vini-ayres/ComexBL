/**
 * Mapeamentos BL Final ↔ GlobalSys (Microled) para a tela de Divergências.
 *
 * Colunas = aliases de SQL_FIND_MASTER_DIVERGENCIA / SQL_FIND_HOUSE_DIVERGENCIA.
 * Consultas GlobalSys são SOMENTE SELECT. Nunca INSERT/UPDATE nesse banco.
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

/** Master: SQL_FIND_MASTER_DIVERGENCIA. NR_BL = MasterNumber. */
export const BL_FINAL_MASTER_GLOBALSYS_FIELDS: readonly GlobalSysComparisonFieldMapping[] = [
  {
    blFinalKey: 'vesselName',
    globalSysColumn: 'VesselName',
    label: 'Vessel Name',
    homologationStatus: 'confirmed',
    homologationNotes: 'TB_BL.ID_NAVIO → TB_NAVIO.NM_NAVIO.',
  },
  {
    blFinalKey: 'voyage',
    globalSysColumn: 'Voyage',
    label: 'Voyage',
    homologationStatus: 'confirmed',
    homologationNotes: 'TB_BL.NR_VIAGEM.',
  },
  {
    blFinalKey: 'carrierScacCode',
    globalSysColumn: 'CarrierSCACCode',
    label: 'Carrier SCAC Code',
    homologationStatus: 'confirmed',
    homologationNotes: 'Não há SCAC operacional em TB_BL. A query devolve NULL.',
  },
  {
    blFinalKey: 'carrierName',
    globalSysColumn: 'CarrierName',
    label: 'Carrier Name',
    homologationStatus: 'confirmed',
    homologationNotes: 'TB_BL.ID_PARCEIRO_TRANSPORTADOR → TB_PARCEIRO.NM_RAZAO.',
  },
  {
    blFinalKey: 'freightTerm',
    globalSysColumn: 'FreightTerm',
    label: 'Freight Term',
    homologationStatus: 'confirmed',
    homologationNotes:
      'TB_TIPO_PAGAMENTO.NM_TIPO_PAGAMENTO (PREPAID/COLLECT), com fallback P/C → texto.',
  },
  {
    blFinalKey: 'containerNumber',
    globalSysColumn: 'ContainerNumber',
    label: 'Container Number',
    homologationStatus: 'confirmed',
    homologationNotes: 'TB_AMR_CNTR_BL → TB_CNTR_BL.NR_CNTR.',
  },
  {
    blFinalKey: 'containerSealNo1',
    globalSysColumn: 'ContainerSealNo1',
    label: 'Container Seal No 1',
    homologationStatus: 'confirmed',
    homologationNotes: 'TB_CNTR_BL.NR_LACRE.',
  },
  {
    blFinalKey: 'containerType',
    globalSysColumn: 'ContainerType',
    label: 'Container Type',
    homologationStatus: 'confirmed',
    homologationNotes: 'TB_CNTR_BL.ID_TIPO_CNTR → TB_TIPO_CONTAINER.NM_TIPO_CONTAINER.',
  },
] as const;

/** House: SQL_FIND_HOUSE_DIVERGENCIA. NR_BL = HouseNumber. */
export const BL_FINAL_HOUSE_GLOBALSYS_FIELDS: readonly GlobalSysComparisonFieldMapping[] = [
  {
    blFinalKey: 'shipperName',
    globalSysColumn: 'ShipperName',
    label: 'Shipper Name',
    homologationStatus: 'confirmed',
    homologationNotes: 'TB_BL.ID_PARCEIRO_SHIPPER → TB_PARCEIRO.NM_RAZAO.',
  },
  {
    blFinalKey: 'consigneeName',
    globalSysColumn: 'ConsigneeName',
    label: 'Consignee Name',
    homologationStatus: 'confirmed',
    homologationNotes: 'TB_BL.ID_PARCEIRO_CNEE → TB_PARCEIRO.NM_RAZAO.',
  },
  {
    blFinalKey: 'notifyName',
    globalSysColumn: 'NotifyName',
    label: 'Notify Name',
    homologationStatus: 'confirmed',
    homologationNotes: 'TB_BL.ID_PARCEIRO_NOTIFY → TB_PARCEIRO.NM_RAZAO.',
  },
  {
    blFinalKey: 'deliveryPortName',
    globalSysColumn: 'DeliveryPortName',
    label: 'Delivery Port Name',
    homologationStatus: 'confirmed',
    homologationNotes:
      'Manifesto DELIVERY_PORT_NAME, com fallback TB_CIDADE / TB_PORTO destino.',
  },
  {
    blFinalKey: 'packingQuantity',
    globalSysColumn: 'PackingQuantity',
    label: 'Packing Quantity',
    homologationStatus: 'confirmed',
    homologationNotes: 'TB_BL.QT_MERCADORIA.',
  },
  {
    blFinalKey: 'grossWeight',
    globalSysColumn: 'GrossWeight',
    label: 'Gross Weight',
    homologationStatus: 'confirmed',
    homologationNotes: 'TB_BL.VL_PESO_BRUTO.',
  },
  {
    blFinalKey: 'volumeMeasure',
    globalSysColumn: 'VolumeMeasure',
    label: 'Volume Measure',
    homologationStatus: 'confirmed',
    homologationNotes: 'TB_BL.VL_M3.',
  },
  {
    blFinalKey: 'itemName',
    globalSysColumn: 'ItemName',
    label: 'Item Name',
    homologationStatus: 'confirmed',
    homologationNotes:
      'TB_CARGA_BL.DS_MERCADORIA, com fallback DS_MERCADORIA_GERAL / NM_RESUMO_MERCADORIA.',
  },
  {
    blFinalKey: 'issueDate',
    globalSysColumn: 'IssueDate',
    label: 'Issue Date',
    homologationStatus: 'confirmed',
    homologationNotes:
      'Manifesto ISSUE_DATE, com fallback DT_EMISSAO_BL / DT_EMISSAO_CONHECIMENTO.',
  },
] as const;

/** Colunas de carga da query House de divergência. */
export const GLOBALSYS_TB_CARGA_BL_COLUMNS: readonly GlobalSysColumnMapping[] = [
  {
    column: 'Brand',
    apiKey: 'brand',
    homologationStatus: 'confirmed',
    homologationNotes: 'TB_CARGA_BL.MARCA AS Brand.',
  },
  {
    column: 'ConterMark',
    apiKey: 'counterMark',
    homologationStatus: 'confirmed',
    homologationNotes: 'TB_CARGA_BL.CONTRAMARCA AS ConterMark (alias da query operacional).',
  },
  {
    column: 'CargoType',
    apiKey: 'cargoType',
    homologationStatus: 'confirmed',
    homologationNotes: 'ID_TIPO_CARGA → TB_TIPO_CARGA.NM_TIPO_CARGA.',
  },
  {
    column: 'HazardClass',
    apiKey: 'hazardClass',
    homologationStatus: 'confirmed',
    homologationNotes: 'TB_CARGA_BL.CLASSE_PERIGO.',
  },
  {
    column: 'UNNumber',
    apiKey: 'unNumber',
    homologationStatus: 'confirmed',
    homologationNotes: 'TB_CARGA_BL.COD_CARGA_PERIGOSA.',
  },
  {
    column: 'Packaging',
    apiKey: 'packaging',
    homologationStatus: 'confirmed',
    homologationNotes: 'ID_EMBALAGEM → TB_MERCADORIA.NM_MERCADORIA.',
  },
] as const;

/** NCM: STRING_AGG(TB_NCM.CD_NCM) AS NcmCode na query House. */
export const GLOBALSYS_TB_BL_NCM_COLUMNS: readonly GlobalSysColumnMapping[] = [
  {
    column: 'NcmCode',
    apiKey: 'ncmCode',
    homologationStatus: 'confirmed',
    homologationNotes: 'STRING_AGG dos CD_NCM distintos de TB_BL_NCM → TB_NCM.',
  },
] as const;

/** Campos GlobalSys cujo mapeamento ainda depende de homologação. */
export const GLOBALSYS_HOMOLOGATION_PENDING = [
  ...BL_FINAL_MASTER_GLOBALSYS_FIELDS,
  ...BL_FINAL_HOUSE_GLOBALSYS_FIELDS,
  ...GLOBALSYS_TB_CARGA_BL_COLUMNS,
  ...GLOBALSYS_TB_BL_NCM_COLUMNS,
].filter((field) => field.homologationStatus === 'assumed');
