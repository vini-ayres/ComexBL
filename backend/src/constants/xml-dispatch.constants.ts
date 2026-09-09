export const XML_DISPATCH_STATUS = {
  PENDENTE: 'pendente',
  ENVIADO: 'enviado',
  FALHOU: 'falhou',
  /** n8n: XML integrou no GlobalSys */
  SUCESSO: 'sucesso',
  /** n8n: XML não integrou no GlobalSys */
  ERRO: 'erro',
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
  XML_SUCESSO: 'xml_sucesso',
  XML_ERRO: 'xml_erro',
} as const;

export type LotStatus = (typeof LOT_STATUS)[keyof typeof LOT_STATUS];

export const XML_DISPATCH_UI_STATUS = {
  NAO_ENVIADO: 'nao_enviado',
  PENDENTE: XML_DISPATCH_STATUS.PENDENTE,
  ENVIADO: XML_DISPATCH_STATUS.ENVIADO,
  FALHOU: XML_DISPATCH_STATUS.FALHOU,
  SUCESSO: XML_DISPATCH_STATUS.SUCESSO,
  ERRO: XML_DISPATCH_STATUS.ERRO,
} as const;

export type XmlDispatchUiStatus =
  (typeof XML_DISPATCH_UI_STATUS)[keyof typeof XML_DISPATCH_UI_STATUS];

/** XML já saiu daqui: enviado ao n8n ou já integrado no GlobalSys. */
export function isXmlDispatchSent(status: XmlDispatchUiStatus): boolean {
  return (
    status === XML_DISPATCH_UI_STATUS.ENVIADO ||
    status === XML_DISPATCH_UI_STATUS.SUCESSO
  );
}

export function isXmlDispatchIntegrated(status: XmlDispatchUiStatus): boolean {
  return status === XML_DISPATCH_UI_STATUS.SUCESSO;
}

export function isXmlRecordAlreadySent(status: string | null | undefined): boolean {
  return (
    status === XML_DISPATCH_STATUS.ENVIADO ||
    status === XML_DISPATCH_STATUS.SUCESSO
  );
}
