import {
  mapDashboardKpis,
  mapDashboardListItem,
} from '../mappers/dashboard.mapper.js';
import { DashboardRepository } from '../repositories/dashboard.repository.js';
import type { PaginatedResult, PaginationQuery } from '../types/bl.types.js';
import type {
  DashboardFilters,
  DashboardKpiDto,
  DashboardBlListItemDto,
  DashboardResponseDto,
} from '../types/dashboard.types.js';
import { buildPaginatedResult } from '../utils/pagination.js';
import type { ApoioHumanoService } from './apoio-humano.service.js';

export class DashboardService {
  constructor(
    private readonly repository: DashboardRepository,
    private readonly apoioHumanoService: ApoioHumanoService,
  ) {}

  async getDashboard(
    pagination: PaginationQuery,
    filters: DashboardFilters = {},
  ): Promise<DashboardResponseDto> {
    await this.apoioHumanoService.syncPendingWorkflowStatus();

    const [kpiCounts, listResult] = await Promise.all([
      this.repository.getKpiCounts(),
      this.repository.findOperationalItems(pagination, filters),
    ]);

    const kpis = mapDashboardKpis(kpiCounts);
    const items = this.buildListResult(listResult.items, listResult.total, pagination);

    return { kpis, items };
  }

  async getKpis(): Promise<DashboardKpiDto[]> {
    await this.apoioHumanoService.syncPendingWorkflowStatus();
    const counts = await this.repository.getKpiCounts();
    return mapDashboardKpis(counts);
  }

  async listOperationalItems(
    pagination: PaginationQuery,
    filters: DashboardFilters = {},
  ): Promise<PaginatedResult<DashboardBlListItemDto>> {
    await this.apoioHumanoService.syncPendingWorkflowStatus();

    const { items, total } = await this.repository.findOperationalItems(
      pagination,
      filters,
    );

    return this.buildListResult(items, total, pagination);
  }

  private buildListResult(
    items: Parameters<typeof mapDashboardListItem>[0][],
    total: number,
    pagination: PaginationQuery,
  ): PaginatedResult<DashboardBlListItemDto> {
    return buildPaginatedResult(
      items.map(mapDashboardListItem),
      total,
      pagination,
    );
  }
}
