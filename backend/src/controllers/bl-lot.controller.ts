import type { Request, Response } from 'express';
import { isBlVersion } from '../constants/bl-version.constants.js';
import { BadRequestError } from '../errors/AppError.js';
import { BlLotService } from '../services/bl-lot.service.js';
import {
  parseOptionalInt,
  parsePaginationQuery,
} from '../utils/pagination.js';

export class BlLotController {
  constructor(private readonly blLotService: BlLotService) {}

  listMasters = async (req: Request, res: Response): Promise<void> => {
    const pagination = parsePaginationQuery(req.query);
    const search =
      typeof req.query.search === 'string' ? req.query.search : undefined;
    const blVersion =
      typeof req.query.blVersion === 'string' && isBlVersion(req.query.blVersion)
        ? req.query.blVersion
        : undefined;

    const result = await this.blLotService.listMasters(pagination, {
      search,
      blVersion,
    });
    res.json(result);
  };

  getMasterById = async (req: Request, res: Response): Promise<void> => {
    const id = parseOptionalInt(req.params.id);

    if (!id) {
      throw new BadRequestError('ID inválido');
    }

    const lot = await this.blLotService.getMasterLot(id);
    res.json(lot);
  };

  updateHblCount = async (req: Request, res: Response): Promise<void> => {
    const id = parseOptionalInt(req.params.id);

    if (!id) {
      throw new BadRequestError('ID inválido');
    }

    const hblCount = Number((req.body as { hblCount?: unknown })?.hblCount);
    const lot = await this.blLotService.updateHblCount(
      id,
      hblCount,
      this.actor(req),
    );
    res.json(lot);
  };

  unlinkHouse = async (req: Request, res: Response): Promise<void> => {
    const masterId = parseOptionalInt(req.params.id);
    const houseId = parseOptionalInt(req.params.houseId);

    if (!masterId || !houseId) {
      throw new BadRequestError('ID inválido');
    }

    const lot = await this.blLotService.unlinkHouse(
      masterId,
      houseId,
      this.actor(req),
    );
    res.json(lot);
  };

  linkHouse = async (req: Request, res: Response): Promise<void> => {
    const masterId = parseOptionalInt(req.params.id);
    const houseId = parseOptionalInt(req.params.houseId);

    if (!masterId || !houseId) {
      throw new BadRequestError('ID inválido');
    }

    const lot = await this.blLotService.linkHouse(
      masterId,
      houseId,
      this.actor(req),
    );
    res.json(lot);
  };

  dispatchXml = async (req: Request, res: Response): Promise<void> => {
    const id = parseOptionalInt(req.params.id);

    if (!id) {
      throw new BadRequestError('ID inválido');
    }

    const force = Boolean((req.body as { force?: unknown })?.force);
    const result = await this.blLotService.dispatchXml(id, force);
    res.json(result);
  };

  private actor(req: Request) {
    return {
      userId: req.authUser?.id ?? null,
      displayName: req.authUser?.displayName ?? req.authUser?.login ?? 'system',
    };
  }
}
