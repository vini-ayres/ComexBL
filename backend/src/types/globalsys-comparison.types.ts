import type { GlobalSysBlRecord } from './globalsys.types.js';

export interface GlobalSysCargoRecord {
  [column: string]: unknown;
}

export interface GlobalSysNcmRecord {
  [column: string]: unknown;
}

export interface GlobalSysBlBundle {
  numeroBl: string;
  blFound: boolean;
  blRecord: GlobalSysBlRecord | null;
  cargos: GlobalSysCargoRecord[];
  ncms: GlobalSysNcmRecord[];
}

export interface GlobalSysComparableCargo {
  Brand: string | null;
  CounterMark: string | null;
  CargoType: string | null;
  HazardClass: string | null;
  UNNumber: string | null;
  Packaging: string | null;
  Id: number;
}

export interface GlobalSysComparableNcm {
  NcmCode: string;
}
