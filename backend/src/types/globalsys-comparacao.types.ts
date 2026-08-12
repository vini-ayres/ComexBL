/**
 * DTOs de leitura GlobalSys para comparação de divergências.
 * Representam dados de TB_BL, TB_CARGA_BL e TB_BL_NCM — independentes das entidades OCR.
 */

export interface GlobalSysMasterDto {
  numeroBl: string;
  referenceNumber: string | null;
  vesselName: string | null;
  voyage: string | null;
  loadingPortCode: string | null;
  loadingPortName: string | null;
  dischargePortCode: string | null;
  dischargePortName: string | null;
  shipperName: string | null;
  consigneeName: string | null;
  grossWeight: string | null;
  volumeMeasure: string | null;
  containerNumber: string | null;
}

export interface GlobalSysHouseDto {
  numeroBl: string;
  shipperName: string | null;
  consigneeName: string | null;
  notifyName: string | null;
  loadingPortCode: string | null;
  loadingPortName: string | null;
  dischargePortCode: string | null;
  dischargePortName: string | null;
  grossWeight: string | null;
  volumeMeasure: string | null;
  itemName: string | null;
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
