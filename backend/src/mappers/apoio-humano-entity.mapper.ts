import type { Prisma } from '@prisma/client';
import type { BlHouseCargo, BlHouseNcm } from '@prisma/client';
import { prisma } from '../prisma/client.js';
import {
  APOIO_HUMANO_MASTER_SCALAR_FIELDS,
  CARGO_COMPARABLE_FIELDS,
  HOUSE_SCALAR_FIELDS,
} from '../constants/bl-comparison.constants.js';
import type { SaveApoioHumanoCampoInput } from '../types/apoio-humano.types.js';
import {
  buildCargoLogicalKey,
  normalizeNcmCode,
} from '../utils/comparison.utils.js';

const MASTER_SCALAR_KEYS = new Set(
  APOIO_HUMANO_MASTER_SCALAR_FIELDS.map((field) => field.key),
);
const HOUSE_SCALAR_KEYS = new Set(HOUSE_SCALAR_FIELDS.map((field) => field.key));

const MASTER_INT_FIELDS = new Set(['PackingQuantity']);
const MASTER_DECIMAL_FIELDS = new Set(['GrossWeight', 'VolumeMeasure']);
const MASTER_DATE_FIELDS = new Set<string>();

const HOUSE_INT_FIELDS = new Set(['PackingQuantity']);
const HOUSE_DECIMAL_FIELDS = new Set(['GrossWeight', 'VolumeMeasure']);
const HOUSE_DATE_FIELDS = new Set(['IssueDate']);

const CARGO_FIELD_SET = new Set<string>(CARGO_COMPARABLE_FIELDS);

function normalizeAppliedValue(value: string | null | undefined): string | null {
  if (value == null) {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed || trimmed === '-') {
    return null;
  }

  return trimmed;
}

function resolveEffectiveValue(campo: SaveApoioHumanoCampoInput): string | null {
  if (campo.status === 'pendente') {
    return null;
  }

  const manual = normalizeAppliedValue(campo.valorManual);

  if (campo.status === 'editado' && manual) {
    return manual;
  }

  if (manual) {
    return manual;
  }

  return normalizeAppliedValue(campo.valorRecebido);
}

function parseDateValue(value: string): Date | null {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

function coerceScalarValue(
  fieldKey: string,
  value: string,
  intFields: Set<string>,
  decimalFields: Set<string>,
  dateFields: Set<string>,
): unknown {
  if (intFields.has(fieldKey)) {
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? null : parsed;
  }

  if (decimalFields.has(fieldKey)) {
    const parsed = Number.parseFloat(value.replace(',', '.'));
    return Number.isNaN(parsed) ? null : parsed;
  }

  if (dateFields.has(fieldKey)) {
    return parseDateValue(value);
  }

  return value;
}

function buildScalarUpdateData(
  campos: SaveApoioHumanoCampoInput[],
  allowedKeys: Set<string>,
  intFields: Set<string>,
  decimalFields: Set<string>,
  dateFields: Set<string>,
): Record<string, unknown> {
  const data: Record<string, unknown> = {};

  for (const campo of campos) {
    if (!allowedKeys.has(campo.campoKey) || campo.status === 'pendente') {
      continue;
    }

    const value = resolveEffectiveValue(campo);

    if (value == null) {
      if (campo.status === 'editado') {
        data[campo.campoKey] = null;
      }
      continue;
    }

    data[campo.campoKey] = coerceScalarValue(
      campo.campoKey,
      value,
      intFields,
      decimalFields,
      dateFields,
    );
  }

  return data;
}

function parseCargoCampoKey(campoKey: string): { logicalKey: string; field: string } | null {
  const match = campoKey.match(/^cargo\.(.+)\.([A-Za-z]+)$/);

  if (!match) {
    return null;
  }

  const [, logicalKey, field] = match;

  if (!CARGO_FIELD_SET.has(field)) {
    return null;
  }

  return { logicalKey, field };
}

function parseNcmCampoKey(campoKey: string): string | null {
  const match = campoKey.match(/^ncm\.(.+)$/);
  return match?.[1] ?? null;
}

export async function applyApoioHumanoCamposToEntity(
  params: {
    tipo: 'Master' | 'House';
    blId: number;
    campos: SaveApoioHumanoCampoInput[];
  },
  client: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<void> {
  if (params.tipo === 'Master') {
    const data = buildScalarUpdateData(
      params.campos,
      MASTER_SCALAR_KEYS,
      MASTER_INT_FIELDS,
      MASTER_DECIMAL_FIELDS,
      MASTER_DATE_FIELDS,
    ) as Prisma.BlMasterUpdateInput;

    if (Object.keys(data).length === 0) {
      return;
    }

    await client.blMaster.update({
      where: { Id: params.blId },
      data,
    });

    return;
  }

  const scalarData = buildScalarUpdateData(
    params.campos,
    HOUSE_SCALAR_KEYS,
    HOUSE_INT_FIELDS,
    HOUSE_DECIMAL_FIELDS,
    HOUSE_DATE_FIELDS,
  ) as Prisma.BlHouseUpdateInput;

  if (Object.keys(scalarData).length > 0) {
    await client.blHouse.update({
      where: { Id: params.blId },
      data: scalarData,
    });
  }

  const [cargos, ncms] = await Promise.all([
    client.blHouseCargo.findMany({
      where: { BlHouseId: params.blId },
      orderBy: { Id: 'asc' },
    }),
    client.blHouseNcm.findMany({
      where: { BlHouseId: params.blId },
      orderBy: { Id: 'asc' },
    }),
  ]);

  await applyCargoCampos(params.campos, cargos, client);
  await applyNcmCampos(params.campos, ncms, client);
}

async function applyCargoCampos(
  campos: SaveApoioHumanoCampoInput[],
  cargos: BlHouseCargo[],
  client: Prisma.TransactionClient | typeof prisma,
): Promise<void> {
  const cargosByKey = new Map(
    cargos.map((cargo) => [buildCargoLogicalKey(cargo), cargo]),
  );
  const updatesByCargoId = new Map<number, Record<string, string | null>>();

  for (const campo of campos) {
    if (campo.status === 'pendente') {
      continue;
    }

    const parsed = parseCargoCampoKey(campo.campoKey);

    if (!parsed) {
      continue;
    }

    const cargo = cargosByKey.get(parsed.logicalKey);

    if (!cargo) {
      continue;
    }

    const value = resolveEffectiveValue(campo);
    const current = updatesByCargoId.get(cargo.Id) ?? {};
    current[parsed.field] = value;
    updatesByCargoId.set(cargo.Id, current);
  }

  await Promise.all(
    [...updatesByCargoId.entries()].map(([cargoId, data]) =>
      client.blHouseCargo.update({
        where: { Id: cargoId },
        data,
      }),
    ),
  );
}

async function applyNcmCampos(
  campos: SaveApoioHumanoCampoInput[],
  ncms: BlHouseNcm[],
  client: Prisma.TransactionClient | typeof prisma,
): Promise<void> {
  const ncmsByCode = new Map(
    ncms.map((ncm) => [normalizeNcmCode(ncm.NcmCode), ncm]),
  );
  const updates: Array<Promise<unknown>> = [];

  for (const campo of campos) {
    if (campo.status === 'pendente') {
      continue;
    }

    const originalCode = parseNcmCampoKey(campo.campoKey);

    if (!originalCode) {
      continue;
    }

    const ncm = ncmsByCode.get(normalizeNcmCode(originalCode));

    if (!ncm) {
      continue;
    }

    const value = resolveEffectiveValue(campo);

    if (!value) {
      continue;
    }

    updates.push(
      client.blHouseNcm.update({
        where: { Id: ncm.Id },
        data: { NcmCode: value },
      }),
    );
  }

  await Promise.all(updates);
}
