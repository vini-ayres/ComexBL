import { BadRequestError } from '../errors/AppError.js';
import type { BlStatus } from '../types/bl.types.js';
import type { DashboardFilters } from '../types/dashboard.types.js';
import { parsePaginationQuery } from './pagination.js';

const VALID_STATUSES: BlStatus[] = [
  'divergencia',
  'apoio_humano',
  'processando',
  'finalizado',
  'nao_encontrado',
];

const VALID_TIPOS = ['Master', 'House'] as const;

const MAX_SEARCH_LENGTH = 100;

export function parseDashboardQuery(
  query: Record<string, unknown>,
): {
  pagination: ReturnType<typeof parsePaginationQuery>;
  filters: DashboardFilters;
} {
  const pagination = parsePaginationQuery(query);
  const filters: DashboardFilters = {};

  if (typeof query.status === 'string' && query.status.trim() !== '') {
    if (query.status === 'todos') {
      // sem filtro
    } else if (VALID_STATUSES.includes(query.status as BlStatus)) {
      filters.status = query.status as BlStatus;
    } else {
      throw new BadRequestError(
        `Status inválido. Valores aceitos: ${VALID_STATUSES.join(', ')}, todos`,
      );
    }
  }

  if (typeof query.tipo === 'string' && query.tipo.trim() !== '') {
    if (query.tipo === 'todos') {
      // sem filtro
    } else if (VALID_TIPOS.includes(query.tipo as (typeof VALID_TIPOS)[number])) {
      filters.tipo = query.tipo as DashboardFilters['tipo'];
    } else {
      throw new BadRequestError(
        `Tipo inválido. Valores aceitos: ${VALID_TIPOS.join(', ')}, todos`,
      );
    }
  }

  if (typeof query.search === 'string') {
    const search = query.search.trim();

    if (search.length > MAX_SEARCH_LENGTH) {
      throw new BadRequestError(
        `Busca deve ter no máximo ${MAX_SEARCH_LENGTH} caracteres`,
      );
    }

    if (search.length > 0) {
      filters.search = search;
    }
  }

  return { pagination, filters };
}
