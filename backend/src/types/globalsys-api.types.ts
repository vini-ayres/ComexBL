import type { BlDocumentType } from './bl-domain.types.js';
import type { DivergenciaGlobalSysPersistResponseDto } from './divergencia.types.js';
import type { WorkflowSummaryDto } from './workflow.types.js';

export interface GlobalSysBlLookupDto {
  numeroBl: string | null;
  referenciaEdi: string | null;
  vesselName: string | null;
  voyage: string | null;
  loadingPortCode: string | null;
  loadingPortName: string | null;
  dischargePortCode: string | null;
  dischargePortName: string | null;
  consigneeName: string | null;
  shipperName: string | null;
  grossWeight: string | null;
  volume: string | null;
  containerNumber: string | null;
}

export interface GlobalSysLookupResponseDto {
  found: boolean;
  numeroBl: string;
  bl: GlobalSysBlLookupDto | null;
}

export interface GlobalSysFinalContextResponseDto {
  documentType: BlDocumentType;
  documentNumber: string;
  hasDraft: boolean;
  hasFinal: boolean;
  consultaGlobalSys: {
    found: boolean;
    numeroBl: string;
  } | null;
}

export interface GlobalSysFinalReceivedResponseDto {
  documentType: BlDocumentType;
  documentNumber: string;
  /** Resumo da comparação BL Final × GlobalSys (ex.: contagem de divergências). */
  message: string;
  /**
   * Resultado completo da comparação BL Final consolidado × GlobalSys.
   * Inclui comparisonKind: "GLOBALSYS", comparisonStatus, campos divergentes e workflow.
   *
   * Fluxo (Sprint 6+):
   * 1. FINAL recebido (documento local já existente)
   * 2. BL Final consolidado (FINAL + revisões Apoio Humano)
   * 3. Comparação BL Final × GlobalSys (TB_BL / TB_CARGA_BL / TB_BL_NCM)
   * 4. Persistência em BL_Divergencia / BL_DivergenciaCampo
   * 5. Atualização de workflow
   *
   * Não executa comparação DRAFT × FINAL.
   */
  comparison: DivergenciaGlobalSysPersistResponseDto;
  workflow: WorkflowSummaryDto | null;
}
