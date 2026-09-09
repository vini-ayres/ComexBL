import {
  LOT_STATUS,
  XML_DISPATCH_UI_STATUS,
  isXmlDispatchIntegrated,
  isXmlDispatchSent,
  type LotStatus,
  type XmlDispatchUiStatus,
} from '../../constants/xml-dispatch.constants.js';

export interface HouseDispatchState {
  houseFinalized: boolean;
  xmlStatus: XmlDispatchUiStatus;
}

export interface LotStatusInput {
  masterFinalized: boolean;
  houses: HouseDispatchState[];
}

export function isHouseReadyForDispatch(input: {
  masterFinalized: boolean;
  houseFinalized: boolean;
}): boolean {
  return input.masterFinalized && input.houseFinalized;
}

export function isLotReadyForDispatch(input: LotStatusInput): boolean {
  if (!input.masterFinalized) {
    return false;
  }

  return input.houses.some((house) =>
    isHouseReadyForDispatch({
      masterFinalized: true,
      houseFinalized: house.houseFinalized,
    }),
  );
}

export function computeLotStatus(input: LotStatusInput): LotStatus {
  if (!input.masterFinalized) {
    return LOT_STATUS.MASTER_NAO_FINALIZADO;
  }

  if (input.houses.length === 0) {
    return LOT_STATUS.AGUARDANDO_HOUSE;
  }

  const allIntegrated =
    input.houses.length > 0 &&
    input.houses.every((house) => isXmlDispatchIntegrated(house.xmlStatus));

  if (allIntegrated) {
    return LOT_STATUS.XML_SUCESSO;
  }

  const allSent =
    input.houses.length > 0 &&
    input.houses.every((house) => isXmlDispatchSent(house.xmlStatus));

  if (allSent) {
    return LOT_STATUS.XML_ENVIADO;
  }

  if (input.houses.some((house) => !house.houseFinalized)) {
    return LOT_STATUS.HOUSE_NAO_FINALIZADO;
  }

  if (input.houses.some((house) => house.xmlStatus === XML_DISPATCH_UI_STATUS.ERRO)) {
    return LOT_STATUS.XML_ERRO;
  }

  if (
    input.houses.some((house) => house.xmlStatus === XML_DISPATCH_UI_STATUS.FALHOU)
  ) {
    return LOT_STATUS.XML_FALHOU;
  }

  return LOT_STATUS.PRONTO;
}
