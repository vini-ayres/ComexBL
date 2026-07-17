import type { Request, Response } from 'express';
import { HealthService } from '../services/health.service.js';

export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  getHealth = async (_req: Request, res: Response): Promise<void> => {
    const health = await this.healthService.getHealthStatus();
    const statusCode = health.status === 'ok' ? 200 : 503;

    res.status(statusCode).json(health);
  };
}
