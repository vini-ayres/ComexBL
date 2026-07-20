/** Identificador do fluxo de comparação que originou a divergência persistida. */
export type ComparisonKind = 'DRAFT_FINAL' | 'GLOBALSYS';

export interface ComparisonOriginDto {
  kind: ComparisonKind;
  left: string;
  right: string;
  label: string;
}

export const COMPARISON_ORIGIN_BY_KIND: Record<ComparisonKind, ComparisonOriginDto> = {
  DRAFT_FINAL: {
    kind: 'DRAFT_FINAL',
    left: 'DRAFT',
    right: 'FINAL',
    label: 'DRAFT × FINAL',
  },
  GLOBALSYS: {
    kind: 'GLOBALSYS',
    left: 'BL Final',
    right: 'GlobalSys',
    label: 'BL Final × GlobalSys',
  },
};
