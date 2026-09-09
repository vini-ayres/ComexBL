export const CONTAINER_NUMBER_CAMPO_KEY = 'ContainerNumber';

export const APOIO_HUMANO_SAVE_MESSAGES = {
  pendingCampos: 'Confirme todos os campos pendentes antes de salvar.',
  containerNumberRequired:
    'Container Number é obrigatório e não pode ficar vazio.',
} as const;

const EMPTY_PLACEHOLDERS = new Set([
  '-',
  '–',
  '—',
  '−',
  '.',
  'n/a',
  'na',
  'null',
  'none',
  'nil',
  'undefined',
  'vazio',
  'empty',
]);

export interface ApoioHumanoSaveCampo {
  campoKey: string;
  campoLabel?: string;
  valorRecebido: string;
  valorManual: string | null;
  status: string;
}

export function isEmptyApoioHumanoValue(
  value: string | null | undefined,
): boolean {
  if (value == null) {
    return true;
  }

  const trimmed = value.replace(/[\s\u200b\u200c\u200d\ufeff]/g, '').trim();

  if (!trimmed) {
    return true;
  }

  return EMPTY_PLACEHOLDERS.has(trimmed.toLowerCase());
}

export function isContainerNumberCampoKey(campoKey: string): boolean {
  const compact = campoKey.trim().toLowerCase().replace(/[^a-z0-9.]/g, '');

  return compact === 'containernumber' || compact.endsWith('.containernumber');
}

export function isContainerNumberCampo(campo: {
  campoKey?: string;
  id?: string;
  campo?: string;
  campoLabel?: string;
}): boolean {
  const key = campo.campoKey ?? campo.id ?? '';

  if (isContainerNumberCampoKey(key)) {
    return true;
  }

  const label = (campo.campoLabel ?? campo.campo ?? '').trim();
  return /^container\s*number$/i.test(label);
}

export function resolveApoioHumanoCampoEffectiveValue(
  campo: Pick<ApoioHumanoSaveCampo, 'valorRecebido' | 'valorManual' | 'status'>,
): string {
  const manual = campo.valorManual?.trim() ?? '';

  if (campo.status === 'editado' && !isEmptyApoioHumanoValue(manual)) {
    return manual;
  }

  if (!isEmptyApoioHumanoValue(manual)) {
    return manual;
  }

  return campo.valorRecebido?.trim() ?? '';
}

export function hasUsableContainerNumber(
  value: string | null | undefined,
): boolean {
  if (isEmptyApoioHumanoValue(value)) {
    return false;
  }

  return /[A-Za-z0-9]/.test(value ?? '');
}

export function findContainerNumberCampo<T extends { campoKey?: string; id?: string; campo?: string; campoLabel?: string }>(
  campos: T[],
): T | undefined {
  return campos.find((campo) => isContainerNumberCampo(campo));
}

export function validateApoioHumanoSave(
  campos: ApoioHumanoSaveCampo[],
  currentContainerNumber?: string | null,
): string | null {
  if (campos.some((campo) => campo.status === 'pendente')) {
    return APOIO_HUMANO_SAVE_MESSAGES.pendingCampos;
  }

  const containerCampo = findContainerNumberCampo(
    campos.map((campo) => ({
      ...campo,
      id: campo.campoKey,
      campo: campo.campoLabel,
    })),
  );

  const fromCampo = containerCampo
    ? resolveApoioHumanoCampoEffectiveValue(containerCampo)
    : '';

  const resolved = hasUsableContainerNumber(fromCampo)
    ? fromCampo
    : currentContainerNumber;

  if (!hasUsableContainerNumber(resolved)) {
    return APOIO_HUMANO_SAVE_MESSAGES.containerNumberRequired;
  }

  return null;
}
