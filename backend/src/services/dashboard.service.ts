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
import type { WorkflowService } from './workflow.service.js';

export class DashboardService {
  constructor(
    private readonly repository: DashboardRepository,
    private readonly apoioHumanoService: ApoioHumanoService,
    private readonly workflowService: WorkflowService,
  ) {}

  async getDashboard(
    pagination: PaginationQuery,
    filters: DashboardFilters = {},
  ): Promise<DashboardResponseDto> {
    await this.syncOperationalWorkflows();

    const [kpiCounts, listResult] = await Promise.all([
      this.repository.getKpiCounts(),
      this.repository.findOperationalItems(pagination, filters),
    ]);

    const kpis = mapDashboardKpis(kpiCounts);
    const items = this.buildListResult(listResult.items, listResult.total, pagination);

    return { kpis, items };
  }

  async getKpis(): Promise<DashboardKpiDto[]> {
    await this.syncOperationalWorkflows();
    const counts = await this.repository.getKpiCounts();
    return mapDashboardKpis(counts);
  }

  async listOperationalItems(
    pagination: PaginationQuery,
    filters: DashboardFilters = {},
  ): Promise<PaginatedResult<DashboardBlListItemDto>> {
    await this.syncOperationalWorkflows();

    const { items, total } = await this.repository.findOperationalItems(
      pagination,
      filters,
    );

    return this.buildListResult(items, total, pagination);
  }

  private async syncOperationalWorkflows(): Promise<void> {
    await this.workflowService.restoreOrphanDraftWorkflows();
    await this.apoioHumanoService.syncPendingWorkflowStatus();
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
