/** Estratégia de resolução informada pela API. */
export type DivergenciaResolutionStrategy =
  | 'aceitar_bl_final'
  | 'aceitar_globalsys'
  | 'manual';

/** Status persistido em BL_DivergenciaCampo.Status (sem migration). */
export type DivergenciaCampoResolutionStatus =
  | 'pendente'
  | 'resolvido_bl_final'
  | 'resolvido_globalsys'
  | 'resolvido_manual';

export const DIVERGENCIA_CAMPO_STATUS = {
  PENDENTE: 'pendente',
  RESOLVIDO_BL_FINAL: 'resolvido_bl_final',
  RESOLVIDO_GLOBALSYS: 'resolvido_globalsys',
  RESOLVIDO_MANUAL: 'resolvido_manual',
} as const;

export const DIVERGENCIA_HEADER_STATUS = {
  PENDENTE: 'pendente',
  SEM_DIVERGENCIA: 'sem_divergencia',
  RESOLVIDO: 'resolvido',
} as const;

export const STRATEGY_TO_CAMPO_STATUS: Record<
  DivergenciaResolutionStrategy,
  DivergenciaCampoResolutionStatus
> = {
  aceitar_bl_final: 'resolvido_bl_final',
  aceitar_globalsys: 'resolvido_globalsys',
  manual: 'resolvido_manual',
};

export const CAMPO_STATUS_TO_STRATEGY: Partial<
  Record<DivergenciaCampoResolutionStatus, DivergenciaResolutionStrategy>
> = {
  resolvido_bl_final: 'aceitar_bl_final',
  resolvido_globalsys: 'aceitar_globalsys',
  resolvido_manual: 'manual',
};

export function isCampoPending(status: string): boolean {
  return status === DIVERGENCIA_CAMPO_STATUS.PENDENTE;
}

export function isCampoResolved(status: string): boolean {
  return !isCampoPending(status);
}
