export interface GlobalSysBlRecord {
  [column: string]: unknown;
}

export interface GlobalSysConsultaResult {
  found: boolean;
  numeroBl: string;
  record: GlobalSysBlRecord | null;
}
