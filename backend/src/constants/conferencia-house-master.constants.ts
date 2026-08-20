/** Status operacional da Conferência House × Master. */
export const CONFERENCIA_WORKFLOW_STATUS = 'conferencia_house_master' as const;

/** Counterpart ainda em etapa anterior — a conferência precisa esperar. */
export const CONFERENCIA_PAIR_NOT_READY_STATUSES = new Set([
  'apoio_humano',
  'nao_encontrado',
]);

export type ConferenciaCategoria = 'peso' | 'volume' | 'embalagem';

export type ConferenciaResolutionStrategy =
  | 'aceitar_house'
  | 'aceitar_master'
  | 'manual';

export type ConferenciaCampoStatus =
  | 'pendente'
  | 'resolvido_house'
  | 'resolvido_master'
  | 'resolvido_manual';

export type ConferenciaHeaderStatus =
  | 'pendente'
  | 'sem_divergencia'
  | 'resolvido';

export const CONFERENCIA_CAMPO_STATUS = {
  PENDENTE: 'pendente',
  RESOLVIDO_HOUSE: 'resolvido_house',
  RESOLVIDO_MASTER: 'resolvido_master',
  RESOLVIDO_MANUAL: 'resolvido_manual',
} as const;

export const CONFERENCIA_HEADER_STATUS = {
  PENDENTE: 'pendente',
  SEM_DIVERGENCIA: 'sem_divergencia',
  RESOLVIDO: 'resolvido',
} as const;

export const STRATEGY_TO_CAMPO_STATUS: Record<
  ConferenciaResolutionStrategy,
  ConferenciaCampoStatus
> = {
  aceitar_house: 'resolvido_house',
  aceitar_master: 'resolvido_master',
  manual: 'resolvido_manual',
};

export const CAMPO_STATUS_TO_STRATEGY: Partial<
  Record<ConferenciaCampoStatus, ConferenciaResolutionStrategy>
> = {
  resolvido_house: 'aceitar_house',
  resolvido_master: 'aceitar_master',
  resolvido_manual: 'manual',
};

export interface ConferenciaComparableField {
  key: 'GrossWeight' | 'VolumeMeasure' | 'PackingQuantity';
  label: string;
  categoria: ConferenciaCategoria;
  kind: 'decimal' | 'int';
}

/** Campos de peso, volume e quantidade comuns a Master e House. */
export const CONFERENCIA_FIELDS: ConferenciaComparableField[] = [
  {
    key: 'GrossWeight',
    label: 'Peso bruto',
    categoria: 'peso',
    kind: 'decimal',
  },
  {
    key: 'VolumeMeasure',
    label: 'Volume (CBM)',
    categoria: 'volume',
    kind: 'decimal',
  },
  {
    key: 'PackingQuantity',
    label: 'Quantidade de embalagens',
    categoria: 'embalagem',
    kind: 'int',
  },
];

const CONFERENCIA_FIELD_KEYS = new Set<string>(
  CONFERENCIA_FIELDS.map((field) => field.key),
);

export function isConferenciaFieldKey(campoKey: string): boolean {
  return CONFERENCIA_FIELD_KEYS.has(campoKey);
}

export function isCampoPending(status: string): boolean {
  return status === CONFERENCIA_CAMPO_STATUS.PENDENTE;
}

export function isCampoResolved(status: string): boolean {
  return !isCampoPending(status);
}

export function resolveCampoAcceptedValue(params: {
  strategy: ConferenciaResolutionStrategy;
  valorHouse: string;
  valorMaster: string;
  manualValue?: string | null;
}): string {
  switch (params.strategy) {
    case 'aceitar_house':
      return params.valorHouse;
    case 'aceitar_master':
      return params.valorMaster;
    case 'manual':
      return params.manualValue?.trim() ?? '';
    default:
      return '';
  }
}
