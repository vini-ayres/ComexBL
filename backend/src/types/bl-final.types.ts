import type { BlVersion } from '../constants/bl-version.constants.js';

export interface BlFinalCargoDto {
  brand: string | null;
  counterMark: string | null;
  cargoType: string | null;
  hazardClass: string | null;
  unNumber: string | null;
  packaging: string | null;
}

export interface BlFinalHouseContainerDto {
  containerNumber: string | null;
  containerSealNo1: string | null;
  containerSealNo2: string | null;
  containerType: string | null;
  containerQty: number | null;
  containerUnitCode: string | null;
  containerGwt: string | null;
  containerCbm: string | null;
}

export interface BlFinalHouseDto {
  houseNumber: string;
  shipperName: string | null;
  shipperAddress: string | null;
  consigneeName: string | null;
  consigneeAddress: string | null;
  notifyName: string | null;
  notifyAddress: string | null;
  blCargoTypeExIm: string | null;
  originalBlMethodCode: string | null;
  serviceTerm: string | null;
  freightTerm: string | null;
  receiptPortCode: string | null;
  receiptPortName: string | null;
  loadingPortCode: string | null;
  loadingPortName: string | null;
  dischargePortCode: string | null;
  dischargePortName: string | null;
  deliveryPortCode: string | null;
  deliveryPortName: string | null;
  packingQuantity: number | null;
  packingQuantityUnitCode: string | null;
  grossWeight: string | null;
  volumeMeasure: string | null;
  issueDate: string | null;
  itemName: string | null;
  container: BlFinalHouseContainerDto;
  cargos: BlFinalCargoDto[];
  ncms: string[];
}

export interface BlFinalMasterDto {
  referenceNumber: string | null;
  masterNumber: string;
  blTypeExportImport: string | null;
  vesselName: string | null;
  voyage: string | null;
  onboardDate: string | null;
  arrivalDate: string | null;
  hblCount: number | null;
  shipperName: string | null;
  shipperAddress: string | null;
  consigneeName: string | null;
  consigneeAddress: string | null;
  notifyName: string | null;
  notifyAddress: string | null;
  carrierScacCode: string | null;
  carrierName: string | null;
  cargoTypeLclFclBulk: string | null;
  loadType: string | null;
  serviceTerm: string | null;
  freightTerm: string | null;
  loadingPortCode: string | null;
  loadingPortName: string | null;
  dischargePortCode: string | null;
  dischargePortName: string | null;
  deliveryPortCode: string | null;
  deliveryPortName: string | null;
  finalDestinationPortCode: string | null;
  finalDestinationPortName: string | null;
  containerNumber: string | null;
  containerSealNo1: string | null;
  containerType: string | null;
  packingQuantity: number | null;
  packingQuantityUnitCode: string | null;
  grossWeight: string | null;
  volumeMeasure: string | null;
}

export interface BlFinalResponseDto {
  masterNumber: string;
  blVersion: BlVersion;
  master: BlFinalMasterDto;
  houses: BlFinalHouseDto[];
}
