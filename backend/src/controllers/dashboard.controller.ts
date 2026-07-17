import type { Request, Response } from 'express';
import { DashboardService } from '../services/dashboard.service.js';
import { parseDashboardQuery } from '../utils/dashboard-query.js';

export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  getDashboard = async (req: Request, res: Response): Promise<void> => {
    const { pagination, filters } = parseDashboardQuery(req.query);

    const result = await this.dashboardService.getDashboard(pagination, filters);
    res.json(result);
  };

  getKpis = async (_req: Request, res: Response): Promise<void> => {
    const kpis = await this.dashboardService.getKpis();
    res.json({ kpis });
  };

  listItems = async (req: Request, res: Response): Promise<void> => {
    const { pagination, filters } = parseDashboardQuery(req.query);

    const items = await this.dashboardService.listOperationalItems(
      pagination,
      filters,
    );
    res.json(items);
  };
}
