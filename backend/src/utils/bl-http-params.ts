import { isBlVersion, type BlVersion } from '../constants/bl-version.constants.js';
import { BadRequestError } from '../errors/AppError.js';
import type { BlDocumentType } from '../types/bl-domain.types.js';

export function parseDocumentTypeParam(value: string): BlDocumentType {
  const normalized = value.trim().toLowerCase();

  if (normalized === 'master') {
    return 'Master';
  }

  if (normalized === 'house') {
    return 'House';
  }

  throw new BadRequestError('Tipo inválido. Use master ou house');
}

export function parseDocumentNumberParam(value: string): string {
  const decoded = decodeURIComponent(value).trim();

  if (!decoded) {
    throw new BadRequestError('Número do documento é obrigatório');
  }

  return decoded;
}

export function parseBlVersionQuery(
  value: unknown,
  options: { required?: boolean; defaultValue?: BlVersion } = {},
): BlVersion {
  if (value == null || value === '') {
    if (options.defaultValue) {
      return options.defaultValue;
    }

    if (options.required) {
      throw new BadRequestError('Query param version é obrigatório (DRAFT ou FINAL)');
    }

    throw new BadRequestError('BlVersion não informado');
  }

  if (typeof value !== 'string' || !isBlVersion(value)) {
    throw new BadRequestError('BlVersion inválido. Use DRAFT ou FINAL');
  }

  return value;
}
