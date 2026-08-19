import type { Prisma } from '@prisma/client';
import { prisma } from '../prisma/client.js';
import {
  CONFERENCIA_FIELDS,
  type ConferenciaComparableField,
} from '../constants/conferencia-house-master.constants.js';

const FIELD_BY_KEY = new Map(CONFERENCIA_FIELDS.map((field) => [field.key, field]));

export function coerceConferenciaFieldValue(
  campoKey: string,
  value: string,
): unknown {
  const field = FIELD_BY_KEY.get(campoKey as ConferenciaComparableField['key']);
  const trimmed = value.trim();

  if (!trimmed || trimmed === '-' || trimmed === 'MISTO') {
    return null;
  }

  if (!field || field.kind === 'text') {
    return trimmed;
  }

  if (field.kind === 'int') {
    const parsed = Number.parseInt(trimmed.replace(',', '.'), 10);
    return Number.isNaN(parsed) ? null : parsed;
  }

  const parsed = Number.parseFloat(trimmed.replace(',', '.'));
  return Number.isNaN(parsed) ? null : parsed;
}

export async function applyConferenciaValueToDocument(
  params: {
    documentType: 'Master' | 'House';
    blId: number;
    campoKey: string;
    value: string;
  },
  client: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<void> {
  if (!FIELD_BY_KEY.has(params.campoKey as ConferenciaComparableField['key'])) {
    return;
  }

  const coerced = coerceConferenciaFieldValue(params.campoKey, params.value);
  const data = { [params.campoKey]: coerced };

  if (params.documentType === 'Master') {
    await client.blMaster.update({
      where: { Id: params.blId },
      data,
    });
    return;
  }

  await client.blHouse.update({
    where: { Id: params.blId },
    data,
  });
}
