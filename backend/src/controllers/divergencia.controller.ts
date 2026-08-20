import type { Request, Response } from 'express';
import {
  mapDivergenciaComparison,
  mapDivergenciaGlobalSysComparison,
  mapDivergenciaGlobalSysPersist,
  mapDivergenciaLatestDetail,
  mapDivergenciaPersist,
} from '../mappers/divergencia.mapper.js';
import { mapWorkflowSummary } from '../mappers/workflow.mapper.js';
import type { DivergenciaService } from '../services/divergencia.service.js';
import { parseOptionalInt } from '../utils/pagination.js';
import {
  parseDocumentNumberParam,
  parseDocumentTypeParam,
} from '../utils/bl-http-params.js';
import { BadRequestError } from '../errors/AppError.js';
import { parseResolveDivergenciaBody, parseResolveDivergenciaCampoBody } from '../utils/divergencia-resolution-params.js';

export class DivergenciaController {
  constructor(private readonly divergenciaService: DivergenciaService) {}

  compare = async (req: Request, res: Response): Promise<void> => {
    const documentType = parseDocumentTypeParam(String(req.params.tipo));
    const documentNumber = parseDocumentNumberParam(String(req.params.documentNumber));

    const result = await this.divergenciaService.compareDraftAndFinal(
      documentType,
      documentNumber,
    );

    res.json(mapDivergenciaComparison(result));
  };

  compareAndPersist = async (req: Request, res: Response): Promise<void> => {
    const documentType = parseDocumentTypeParam(String(req.params.tipo));
    const documentNumber = parseDocumentNumberParam(String(req.params.documentNumber));

    const result = await this.divergenciaService.compareAndPersist(
      documentType,
      documentNumber,
    );

    res.json(mapDivergenciaPersist(result));
  };

  compareGlobalSys = async (req: Request, res: Response): Promise<void> => {
    const documentType = parseDocumentTypeParam(String(req.params.tipo));
    const documentNumber = parseDocumentNumberParam(String(req.params.documentNumber));

    const result = await this.divergenciaService.compareBlFinalWithGlobalSys(
      documentType,
      documentNumber,
    );

    res.json(mapDivergenciaGlobalSysComparison(result));
  };

  compareGlobalSysAndPersist = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const documentType = parseDocumentTypeParam(String(req.params.tipo));
    const documentNumber = parseDocumentNumberParam(String(req.params.documentNumber));

    const result =
      await this.divergenciaService.compareAndPersistBlFinalWithGlobalSys(
        documentType,
        documentNumber,
      );

    res.json(mapDivergenciaGlobalSysPersist(result));
  };

  getLatest = async (req: Request, res: Response): Promise<void> => {
    const documentType = parseDocumentTypeParam(String(req.params.tipo));
    const documentNumber = parseDocumentNumberParam(String(req.params.documentNumber));

    const result = await this.divergenciaService.getLatestPersistedByDocument(
      documentType,
      documentNumber,
    );

    res.json(
      mapDivergenciaLatestDetail({
        divergencia: result.divergencia,
        documentType: result.documentType,
        documentNumber: result.documentNumber,
        comparisonKind: result.comparisonKind,
        comparisonStatus: result.comparisonStatus,
        comparisonDate: result.comparisonDate,
        origin: result.origin,
        workflow: result.workflow
          ? mapWorkflowSummary({
              workflow: result.workflow.workflow,
              documentType: result.documentType,
              documentNumber: result.documentNumber,
              blVersion: 'FINAL',
            })
          : null,
      }),
    );
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    const id = parseOptionalInt(req.params.id);

    if (!id) {
      throw new BadRequestError('ID inválido');
    }

    const result = await this.divergenciaService.getPersistedById(id);
    res.json(
      mapDivergenciaLatestDetail({
        divergencia: result.divergencia,
        documentType: result.documentType,
        documentNumber: result.documentNumber,
        comparisonKind: result.comparisonKind,
        comparisonStatus: result.comparisonStatus,
        comparisonDate: result.comparisonDate,
        origin: result.origin,
        workflow: result.workflow
          ? mapWorkflowSummary({
              workflow: result.workflow.workflow,
              documentType: result.documentType,
              documentNumber: result.documentNumber,
              blVersion: 'FINAL',
            })
          : null,
      }),
    );
  };

  resolve = async (req: Request, res: Response): Promise<void> => {
    const id = parseOptionalInt(req.params.id);

    if (!id) {
      throw new BadRequestError('ID inválido');
    }

    const body = parseResolveDivergenciaBody(req.body);
    const result = await this.divergenciaService.resolveDivergencia(id, body);

    res.json(result);
  };

  resolveCampo = async (req: Request, res: Response): Promise<void> => {
    const id = parseOptionalInt(req.params.id);

    if (!id) {
      throw new BadRequestError('ID inválido');
    }

    const campoKey = String(req.params.campoKey ?? '');

    if (!campoKey) {
      throw new BadRequestError('campoKey inválido');
    }

    const body = parseResolveDivergenciaCampoBody(req.body);
    const result = await this.divergenciaService.resolveCampo(id, campoKey, body);

    res.json(result);
  };
}
