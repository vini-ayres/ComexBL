import type { Request, Response } from 'express';
import {
  mapGlobalSysFinalContext,
  mapGlobalSysFinalReceived,
  mapGlobalSysLookup,
} from '../mappers/globalsys-api.mapper.js';
import type { GlobalSysService } from '../services/globalsys.service.js';
import {
  parseDocumentNumberParam,
  parseDocumentTypeParam,
} from '../utils/bl-http-params.js';

export class GlobalSysController {
  constructor(private readonly globalSysService: GlobalSysService) {}

  lookup = async (req: Request, res: Response): Promise<void> => {
    const numeroBl = parseDocumentNumberParam(String(req.params.numeroBl));
    const result = await this.globalSysService.consultGlobalSys(numeroBl);

    res.json(mapGlobalSysLookup(numeroBl, result));
  };

  getFinalContext = async (req: Request, res: Response): Promise<void> => {
    const documentType = parseDocumentTypeParam(String(req.params.tipo));
    const documentNumber = parseDocumentNumberParam(String(req.params.documentNumber));

    const context = await this.globalSysService.prepareFinalOverwriteContext(
      documentType,
      documentNumber,
    );

    res.json(mapGlobalSysFinalContext(context));
  };

  /**
   * FINAL recebido — compara BL Final consolidado × GlobalSys e persiste divergências.
   * Pré-requisito: FINAL local existente. Não executa DRAFT × FINAL.
   */
  onFinalReceived = async (req: Request, res: Response): Promise<void> => {
    const documentType = parseDocumentTypeParam(String(req.params.tipo));
    const documentNumber = parseDocumentNumberParam(String(req.params.documentNumber));

    const result = await this.globalSysService.onFinalReceived(
      documentType,
      documentNumber,
    );

    res.json(mapGlobalSysFinalReceived(result));
  };
}
