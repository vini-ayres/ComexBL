import type {
  CanonicalContainer,
  CanonicalParty,
  CanonicalPort,
} from './canonical-shared.types.js';

export interface CanonicalMasterBl {
  masterNumber: string;
  referenceNumber: string | null;
  blTypeExportImport: string | null;
  vesselName: string | null;
  voyage: string | null;
  onboardDate: string | null;
  arrivalDate: string | null;
  hblCount: string | null;
  shipper: CanonicalParty;
  consignee: CanonicalParty;
  notify: CanonicalParty;
  carrierScacCode: string | null;
  carrierName: string | null;
  cargoTypeLclFclBulk: string | null;
  loadType: string | null;
  serviceTerm: string | null;
  freightTerm: string | null;
  loadingPort: CanonicalPort;
  dischargePort: CanonicalPort;
  deliveryPort: CanonicalPort;
  finalDestinationPort: CanonicalPort;
  container: CanonicalContainer;
  packingQuantity: string | null;
  packingQuantityUnitCode: string | null;
  grossWeight: string | null;
  volumeMeasure: string | null;
}
