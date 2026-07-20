import type { Request, Response } from 'express';
import type { ProcessoService } from '../services/processo.service.js';
import {
  parseDocumentNumberParam,
  parseDocumentTypeParam,
} from '../utils/bl-http-params.js';
import { parseOptionalBlVersionParam } from '../utils/processo-http-params.js';

export class ProcessoController {
  constructor(private readonly processoService: ProcessoService) {}

  getTimeline = async (req: Request, res: Response): Promise<void> => {
    const documentType = parseDocumentTypeParam(String(req.params.tipo));
    const documentNumber = parseDocumentNumberParam(String(req.params.documentNumber));
    const blVersion = parseOptionalBlVersionParam(req.query.version);

    const result = await this.processoService.getTimelineByDocument(
      documentType,
      documentNumber,
      blVersion,
    );

    res.json(result);
  };
}
