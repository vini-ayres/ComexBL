import type {
  CanonicalCargo,
  CanonicalContainer,
  CanonicalNcm,
  CanonicalParty,
  CanonicalPort,
} from './canonical-shared.types.js';

export interface CanonicalHouseBl {
  houseNumber: string;
  shipper: CanonicalParty;
  consignee: CanonicalParty;
  notify: CanonicalParty;
  blCargoTypeExIm: string | null;
  originalBlMethodCode: string | null;
  serviceTerm: string | null;
  freightTerm: string | null;
  receiptPort: CanonicalPort;
  loadingPort: CanonicalPort;
  dischargePort: CanonicalPort;
  deliveryPort: CanonicalPort;
  packingQuantity: string | null;
  packingQuantityUnitCode: string | null;
  grossWeight: string | null;
  volumeMeasure: string | null;
  issueDate: string | null;
  itemName: string | null;
  container: CanonicalContainer;
  cargo: CanonicalCargo[];
  ncm: CanonicalNcm[];
}
