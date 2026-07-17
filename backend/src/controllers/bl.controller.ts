import type { Request, Response } from 'express';
import { BlService } from '../services/bl.service.js';
import {
  parseOptionalInt,
  parsePaginationQuery,
} from '../utils/pagination.js';

export class BlController {
  constructor(private readonly blService: BlService) {}

  listMasters = async (req: Request, res: Response): Promise<void> => {
    const pagination = parsePaginationQuery(req.query);
    const filters = {
      status: typeof req.query.status === 'string' ? req.query.status : undefined,
      search: typeof req.query.search === 'string' ? req.query.search : undefined,
    };

    const result = await this.blService.listMasters(pagination, filters);
    res.json(result);
  };

  getMasterById = async (req: Request, res: Response): Promise<void> => {
    const id = parseOptionalInt(req.params.id);

    if (!id) {
      res.status(400).json({ status: 'error', message: 'ID inválido' });
      return;
    }

    const master = await this.blService.getMasterById(id);
    res.json(master);
  };

  listHouses = async (req: Request, res: Response): Promise<void> => {
    const pagination = parsePaginationQuery(req.query);
    const filters = {
      masterId: parseOptionalInt(req.query.masterId),
      status: typeof req.query.status === 'string' ? req.query.status : undefined,
      search: typeof req.query.search === 'string' ? req.query.search : undefined,
    };

    const result = await this.blService.listHouses(pagination, filters);
    res.json(result);
  };

  getHouseById = async (req: Request, res: Response): Promise<void> => {
    const id = parseOptionalInt(req.params.id);

    if (!id) {
      res.status(400).json({ status: 'error', message: 'ID inválido' });
      return;
    }

    const house = await this.blService.getHouseById(id);
    res.json(house);
  };

  getStats = async (_req: Request, res: Response): Promise<void> => {
    const stats = await this.blService.getDatabaseStats();
    res.json(stats);
  };
}
