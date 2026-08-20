import type { Request, Response } from 'express';
import type { BlFinalService } from '../services/bl-final.service.js';
import { parseBlVersionQuery, parseDocumentNumberParam } from '../utils/bl-http-params.js';
import { BL_VERSION } from '../constants/bl-version.constants.js';

export class BlFinalController {
  constructor(private readonly blFinalService: BlFinalService) {}

  getMasterBlFinal = async (req: Request, res: Response): Promise<void> => {
    const masterNumber = parseDocumentNumberParam(String(req.params.masterNumber));
    const blVersion = parseBlVersionQuery(req.query.version, {
      defaultValue: BL_VERSION.FINAL,
    });

    const result = await this.blFinalService.getMasterBlFinal(
      masterNumber,
      blVersion,
    );

    res.json(result);
  };

  getHouseBlFinal = async (req: Request, res: Response): Promise<void> => {
    const houseNumber = parseDocumentNumberParam(String(req.params.houseNumber));
    const blVersion = parseBlVersionQuery(req.query.version, {
      defaultValue: BL_VERSION.FINAL,
    });

    const result = await this.blFinalService.getHouseBlFinal(
      houseNumber,
      blVersion,
    );

    res.json(result);
  };
}
