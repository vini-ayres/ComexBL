import type { Request, Response } from 'express';
import { BadRequestError } from '../errors/AppError.js';
import { GlobalSysConsultaService } from '../services/globalsys-consulta.service.js';
import { parseOptionalInt, parsePaginationQuery } from '../utils/pagination.js';

export class BlNaoEncontradoController {
  constructor(private readonly service: GlobalSysConsultaService) {}

  list = async (req: Request, res: Response): Promise<void> => {
    const pagination = parsePaginationQuery(req.query);
    const result = await this.service.listNotFound(pagination);
    res.json(result);
  };

  getDetail = async (req: Request, res: Response): Promise<void> => {
    const blId = parseOptionalInt(req.params.id);

    if (!blId) {
      throw new BadRequestError('ID inválido');
    }

    const result = await this.service.getNotFoundDetail(
      String(req.params.tipo),
      blId,
    );

    res.json(result);
  };

  reprocessar = async (req: Request, res: Response): Promise<void> => {
    const blId = parseOptionalInt(req.params.id);

    if (!blId) {
      throw new BadRequestError('ID inválido');
    }

    const result = await this.service.reprocessar(String(req.params.tipo), blId);
    res.json(result);
  };

  consultar = async (req: Request, res: Response): Promise<void> => {
    const blId = parseOptionalInt(req.params.id);

    if (!blId) {
      throw new BadRequestError('ID inválido');
    }

    const result = await this.service.consultar(String(req.params.tipo), blId);
    res.json(result);
  };
}
