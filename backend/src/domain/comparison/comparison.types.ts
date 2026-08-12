export enum ComparisonCategory {
  MASTER = 'MASTER',
  HOUSE = 'HOUSE',
  PARTY = 'PARTY',
  PORT = 'PORT',
  CONTAINER = 'CONTAINER',
  CARGO = 'CARGO',
  NCM = 'NCM',
  GENERAL = 'GENERAL',
}

export enum ComparisonSeverity {
  ERROR = 'ERROR',
  WARNING = 'WARNING',
}

export enum ComparisonDifferenceReason {
  VALUE_MISMATCH = 'VALUE_MISMATCH',
  MISSING_LOCAL = 'MISSING_LOCAL',
  MISSING_GLOBAL = 'MISSING_GLOBAL',
}

export interface ComparisonDifference {
  path: string;
  field: string;
  category: ComparisonCategory;
  severity: ComparisonSeverity;
  reason: ComparisonDifferenceReason;
  localValue: string | number | null;
  globalSysValue: string | number | null;
}

export interface ComparisonResult {
  equal: boolean;
  differenceCount: number;
  differences: ComparisonDifference[];
}
