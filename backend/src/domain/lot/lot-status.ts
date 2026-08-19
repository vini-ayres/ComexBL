import {
  LOT_STATUS,
  XML_DISPATCH_UI_STATUS,
  type LotStatus,
  type XmlDispatchUiStatus,
} from '../../constants/xml-dispatch.constants.js';

export interface LotStatusInput {
  hblCount: number | null;
  masterFinalized: boolean;
  linkedCount: number;
  finalizedHouseCount: number;
  xmlStatus: XmlDispatchUiStatus;
}

export function isLotReadyForDispatch(input: LotStatusInput): boolean {
  return computeLotStatus({
    ...input,
    xmlStatus: XML_DISPATCH_UI_STATUS.NAO_ENVIADO,
  }) === LOT_STATUS.PRONTO;
}

export function computeLotStatus(input: LotStatusInput): LotStatus {
  if (input.xmlStatus === XML_DISPATCH_UI_STATUS.ENVIADO) {
    return LOT_STATUS.XML_ENVIADO;
  }

  if (input.hblCount == null || input.hblCount < 1) {
    return LOT_STATUS.COUNT_AUSENTE;
  }

  if (!input.masterFinalized) {
    return LOT_STATUS.MASTER_NAO_FINALIZADO;
  }

  if (input.linkedCount < input.hblCount) {
    return LOT_STATUS.AGUARDANDO_HOUSE;
  }

  if (input.finalizedHouseCount < input.hblCount) {
    return LOT_STATUS.HOUSE_NAO_FINALIZADO;
  }

  if (input.linkedCount !== input.hblCount) {
    return LOT_STATUS.AGUARDANDO_HOUSE;
  }

  if (input.xmlStatus === XML_DISPATCH_UI_STATUS.FALHOU) {
    return LOT_STATUS.XML_FALHOU;
  }

  return LOT_STATUS.PRONTO;
}
