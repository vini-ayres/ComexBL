import type { Prisma } from '@prisma/client';
import { resolveDivergenciaCampoCategoria } from '../constants/bl-comparison.constants.js';
import {
  type ComparisonDifference,
  type ComparisonResult,
} from '../domain/comparison/comparison.types.js';
import {
  DIVERGENCIA_CAMPO_STATUS,
  DIVERGENCIA_HEADER_STATUS,
} from '../constants/divergencia-resolution.constants.js';
import { PRISMA_EXTENDED_TRANSACTION_OPTIONS } from '../constants/prisma.constants.js';
import { prisma } from '../prisma/client.js';

/**
 * Persistência de ComparisonResult no modelo relacional existente:
 * - BL_Divergencia: cabeçalho por documento (substituído a cada comparação)
 * - BL_DivergenciaCampo: um registro por ComparisonDifference
 *
 * Mapeamento semântico:
 * - path → CampoKey
 * - field → CampoLabel
 * - path → Categoria (master/house/cargo/ncm; a tela ignora general/container/party/port)
 * - localValue → ValorBlFinal (OCR)
 * - globalSysValue → ValorGlobalSys
 *
 * Motivo e Severidade não possuem colunas no schema atual;
 * permanecem disponíveis apenas no ComparisonResult retornado ao caller.
 */

const CAMPO_KEY_MAX_LENGTH = 200;

function truncate(value: string, maxLength: number): string {
  return value.length <= maxLength ? value : value.slice(0, maxLength);
}

function formatPersistedValue(value: string | number | null): string {
  if (value === null) {
    return '';
  }

  return String(value);
}

function mapDifferenceToCampoRow(
  blDivergenciaId: number,
  difference: ComparisonDifference,
  documentType: 'Master' | 'House',
): Prisma.BlDivergenciaCampoCreateManyInput {
  const campoKey = truncate(difference.path, CAMPO_KEY_MAX_LENGTH);

  return {
    BlDivergenciaId: blDivergenciaId,
    CampoKey: campoKey,
    CampoLabel: truncate(difference.field, 200),
    ValorBlFinal: formatPersistedValue(difference.localValue),
    ValorGlobalSys: formatPersistedValue(difference.globalSysValue),
    Status: DIVERGENCIA_CAMPO_STATUS.PENDENTE,
    Categoria: resolveDivergenciaCampoCategoria(campoKey, documentType),
  };
}

function uniqueCampoRows(
  rows: Prisma.BlDivergenciaCampoCreateManyInput[],
): Prisma.BlDivergenciaCampoCreateManyInput[] {
  const unique = new Map<string, Prisma.BlDivergenciaCampoCreateManyInput>();

  for (const row of rows) {
    unique.set(row.CampoKey, row);
  }

  return [...unique.values()];
}

export class DivergenciaRepository {
  async persistMasterComparison(
    masterId: number,
    result: ComparisonResult,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const persist = async (client: Prisma.TransactionClient) => {
      await client.blDivergencia.deleteMany({
        where: { BlMasterId: masterId },
      });

      if (result.differences.length === 0) {
        return;
      }

      const divergencia = await client.blDivergencia.create({
        data: {
          BlMasterId: masterId,
          BlHouseId: null,
          Status: DIVERGENCIA_HEADER_STATUS.PENDENTE,
        },
      });

      await client.blDivergenciaCampo.createMany({
        data: uniqueCampoRows(
          result.differences.map((difference) =>
            mapDifferenceToCampoRow(divergencia.Id, difference, 'Master'),
          ),
        ),
      });
    };

    if (tx) {
      await persist(tx);
      return;
    }

    await prisma.$transaction(persist, PRISMA_EXTENDED_TRANSACTION_OPTIONS);
  }

  async persistHouseComparison(
    houseId: number,
    result: ComparisonResult,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const persist = async (client: Prisma.TransactionClient) => {
      await client.blDivergencia.deleteMany({
        where: { BlHouseId: houseId },
      });

      if (result.differences.length === 0) {
        return;
      }

      const divergencia = await client.blDivergencia.create({
        data: {
          BlMasterId: null,
          BlHouseId: houseId,
          Status: DIVERGENCIA_HEADER_STATUS.PENDENTE,
        },
      });

      await client.blDivergenciaCampo.createMany({
        data: uniqueCampoRows(
          result.differences.map((difference) =>
            mapDifferenceToCampoRow(divergencia.Id, difference, 'House'),
          ),
        ),
      });
    };

    if (tx) {
      await persist(tx);
      return;
    }

    await prisma.$transaction(persist, PRISMA_EXTENDED_TRANSACTION_OPTIONS);
  }
}

export const divergenciaRepository = new DivergenciaRepository();
