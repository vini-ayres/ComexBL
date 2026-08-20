import { BL_VERSION, isBlVersion, type BlVersion } from '../constants/bl-version.constants.js';
import { BadRequestError } from '../errors/AppError.js';

export function parseOptionalBlVersionParam(value: unknown): BlVersion {
  if (value == null || value === '') {
    return BL_VERSION.FINAL;
  }

  const normalized = String(value).trim().toUpperCase();

  if (!isBlVersion(normalized)) {
    throw new BadRequestError(`BlVersion inválido: ${String(value)}`);
  }

  return normalized;
}
