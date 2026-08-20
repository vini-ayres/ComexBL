export const XML_DISPATCH_STATUS = {
  PENDENTE: 'pendente',
  ENVIADO: 'enviado',
  FALHOU: 'falhou',
} as const;

export type XmlDispatchRecordStatus =
  (typeof XML_DISPATCH_STATUS)[keyof typeof XML_DISPATCH_STATUS];

/** HBLCount no Master fica fixo em 1. Partlot agrega Houses extras no mesmo Master. */
export const MASTER_HBL_COUNT = 1;

export const LOT_STATUS = {
  COUNT_AUSENTE: 'count_ausente',
  MASTER_NAO_FINALIZADO: 'master_nao_finalizado',
  AGUARDANDO_HOUSE: 'aguardando_house',
  HOUSE_NAO_FINALIZADO: 'house_nao_finalizado',
  PRONTO: 'pronto',
  XML_ENVIADO: 'xml_enviado',
  XML_FALHOU: 'xml_falhou',
} as const;

export type LotStatus = (typeof LOT_STATUS)[keyof typeof LOT_STATUS];

export const XML_DISPATCH_UI_STATUS = {
  NAO_ENVIADO: 'nao_enviado',
  PENDENTE: XML_DISPATCH_STATUS.PENDENTE,
  ENVIADO: XML_DISPATCH_STATUS.ENVIADO,
  FALHOU: XML_DISPATCH_STATUS.FALHOU,
} as const;

export type XmlDispatchUiStatus =
  (typeof XML_DISPATCH_UI_STATUS)[keyof typeof XML_DISPATCH_UI_STATUS];
