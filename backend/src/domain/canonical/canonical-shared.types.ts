export interface CanonicalParty {
  name: string | null;
  address: string | null;
}

export interface CanonicalPort {
  code: string | null;
  name: string | null;
}

export interface CanonicalContainer {
  number: string | null;
  sealNo1: string | null;
  sealNo2: string | null;
  type: string | null;
  quantity: string | null;
  unitCode: string | null;
  grossWeight: string | null;
  volume: string | null;
}

export interface CanonicalCargo {
  brand: string | null;
  counterMark: string | null;
  cargoType: string | null;
  hazardClass: string | null;
  unNumber: string | null;
  packaging: string | null;
}

export interface CanonicalNcm {
  code: string | null;
}

export function emptyParty(): CanonicalParty {
  return { name: null, address: null };
}

export function emptyPort(): CanonicalPort {
  return { code: null, name: null };
}

export function emptyContainer(): CanonicalContainer {
  return {
    number: null,
    sealNo1: null,
    sealNo2: null,
    type: null,
    quantity: null,
    unitCode: null,
    grossWeight: null,
    volume: null,
  };
}
