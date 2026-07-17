import type { Request, Response } from 'express';
import { BadRequestError } from '../errors/AppError.js';
import { ApoioHumanoService } from '../services/apoio-humano.service.js';
import { parseOptionalInt, parsePaginationQuery } from '../utils/pagination.js';
import type { SaveApoioHumanoRequestDto } from '../types/apoio-humano.types.js';

export class ApoioHumanoController {
  constructor(private readonly apoioHumanoService: ApoioHumanoService) {}

  getQueueItem = async (req: Request, res: Response): Promise<void> => {
    const parsed = parsePaginationQuery(req.query);
    const pagination = { ...parsed, pageSize: 1 };

    const result = await this.apoioHumanoService.getQueueItem(pagination);
    res.json(result);
  };

  saveCampos = async (req: Request, res: Response): Promise<void> => {
    const blId = parseOptionalInt(req.params.id);

    if (!blId) {
      throw new BadRequestError('ID inválido');
    }

    const payload = req.body as SaveApoioHumanoRequestDto;
    const result = await this.apoioHumanoService.saveCampos(
      String(req.params.tipo),
      blId,
      payload,
    );

    res.json(result);
  };
}
