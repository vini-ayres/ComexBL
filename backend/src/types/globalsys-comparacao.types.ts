/**
 * DTOs de leitura GlobalSys para comparação de divergências.
 * Representam o SELECT operacional (TB_BL + JOINs Luciana) — independentes das entidades OCR.
 */

export interface GlobalSysMasterDto {
  numeroBl: string;
  referenceNumber: string | null;
  vesselName: string | null;
  voyage: string | null;
  carrierName: string | null;
  carrierScacCode: string | null;
  serviceTerm: string | null;
  freightTerm: string | null;
  loadingPortCode: string | null;
  loadingPortName: string | null;
  dischargePortCode: string | null;
  dischargePortName: string | null;
  shipperName: string | null;
  consigneeName: string | null;
  packingQuantity: string | null;
  packingQuantityUnitCode: string | null;
  grossWeight: string | null;
  volumeMeasure: string | null;
  containerNumber: string | null;
  containerSealNo1: string | null;
  containerType: string | null;
}

export interface GlobalSysHouseDto {
  numeroBl: string;
  shipperName: string | null;
  consigneeName: string | null;
  notifyName: string | null;
  serviceTerm: string | null;
  loadingPortCode: string | null;
  loadingPortName: string | null;
  dischargePortCode: string | null;
  dischargePortName: string | null;
  deliveryPortName: string | null;
  packingQuantity: string | null;
  grossWeight: string | null;
  volumeMeasure: string | null;
  itemName: string | null;
  issueDate: string | null;
  containerNumber: string | null;
}

export interface GlobalSysCargoDto {
  brand: string | null;
  counterMark: string | null;
  cargoType: string | null;
  hazardClass: string | null;
  unNumber: string | null;
  packaging: string | null;
}

export interface GlobalSysNcmDto {
  ncmCode: string;
}

export interface GlobalSysMasterAggregateDto {
  master: GlobalSysMasterDto | null;
}

export interface GlobalSysHouseAggregateDto {
  house: GlobalSysHouseDto | null;
  cargo: GlobalSysCargoDto[];
  ncm: GlobalSysNcmDto[];
}
