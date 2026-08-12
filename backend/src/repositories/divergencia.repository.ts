import type { Prisma } from '@prisma/client';
import {
  ComparisonCategory,
  type ComparisonDifference,
  type ComparisonResult,
} from '../domain/comparison/comparison.types.js';
import {
  DIVERGENCIA_CAMPO_STATUS,
  DIVERGENCIA_HEADER_STATUS,
} from '../constants/divergencia-resolution.constants.js';
import { prisma } from '../prisma/client.js';

/**
 * Persistência de ComparisonResult no modelo relacional existente:
 * - BL_Divergencia: cabeçalho por documento (substituído a cada comparação)
 * - BL_DivergenciaCampo: um registro por ComparisonDifference
 *
 * Mapeamento semântico:
 * - path → CampoKey
 * - field → CampoLabel
 * - category → Categoria
 * - localValue → ValorBlFinal (OCR)
 * - globalSysValue → ValorGlobalSys
 *
 * Motivo e Severidade não possuem colunas no schema atual;
 * permanecem disponíveis apenas no ComparisonResult retornado ao caller.
 */

const CAMPO_KEY_MAX_LENGTH = 50;
const VALOR_MAX_LENGTH = 500;

function truncate(value: string, maxLength: number): string {
  return value.length <= maxLength ? value : value.slice(0, maxLength);
}

function formatPersistedValue(value: string | number | null): string {
  if (value === null) {
    return '';
  }

  return truncate(String(value), VALOR_MAX_LENGTH);
}

function mapCategory(category: ComparisonCategory): string {
  switch (category) {
    case ComparisonCategory.MASTER:
      return 'master';
    case ComparisonCategory.HOUSE:
      return 'house';
    case ComparisonCategory.CARGO:
      return 'cargo';
    case ComparisonCategory.NCM:
      return 'ncm';
    case ComparisonCategory.PARTY:
      return 'party';
    case ComparisonCategory.PORT:
      return 'port';
    case ComparisonCategory.CONTAINER:
      return 'container';
    case ComparisonCategory.GENERAL:
    default:
      return 'general';
  }
}

function mapDifferenceToCampoRow(
  blDivergenciaId: number,
  difference: ComparisonDifference,
): Prisma.BlDivergenciaCampoCreateManyInput {
  return {
    BlDivergenciaId: blDivergenciaId,
    CampoKey: truncate(difference.path, CAMPO_KEY_MAX_LENGTH),
    CampoLabel: truncate(difference.field, 200),
    ValorBlFinal: formatPersistedValue(difference.localValue),
    ValorGlobalSys: formatPersistedValue(difference.globalSysValue),
    Status: DIVERGENCIA_CAMPO_STATUS.PENDENTE,
    Categoria: truncate(mapCategory(difference.category), 10),
  };
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
        data: result.differences.map((difference) =>
          mapDifferenceToCampoRow(divergencia.Id, difference),
        ),
      });
    };

    if (tx) {
      await persist(tx);
      return;
    }

    await prisma.$transaction(persist);
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
        data: result.differences.map((difference) =>
          mapDifferenceToCampoRow(divergencia.Id, difference),
        ),
      });
    };

    if (tx) {
      await persist(tx);
      return;
    }

    await prisma.$transaction(persist);
  }
}

export const divergenciaRepository = new DivergenciaRepository();
