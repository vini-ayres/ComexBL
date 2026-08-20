import type { Request, Response } from 'express';
import type { ConferenciaHouseMasterService } from '../services/conferencia-house-master.service.js';
import { BadRequestError } from '../errors/AppError.js';
import { parseOptionalInt, parsePaginationQuery } from '../utils/pagination.js';
import {
  parseDocumentNumberParam,
  parseDocumentTypeParam,
} from '../utils/bl-http-params.js';
import {
  parseResolveConferenciaBody,
  parseResolveConferenciaCampoBody,
} from '../utils/conferencia-house-master-params.js';
import { BL_VERSION, isBlVersion, type BlVersion } from '../constants/bl-version.constants.js';

export class ConferenciaHouseMasterController {
  constructor(private readonly conferenciaService: ConferenciaHouseMasterService) {}

  getQueueItem = async (req: Request, res: Response): Promise<void> => {
    const parsed = parsePaginationQuery(req.query);
    const pagination = { ...parsed, pageSize: 1 };
    const result = await this.conferenciaService.getQueueItem(pagination);
    res.json(result);
  };

  compare = async (req: Request, res: Response): Promise<void> => {
    const documentType = parseDocumentTypeParam(String(req.params.tipo));
    const documentNumber = parseDocumentNumberParam(String(req.params.documentNumber));
    const blVersion = this.parseOptionalVersion(req.query.blVersion);

    const result = await this.conferenciaService.compare(
      documentType,
      documentNumber,
      blVersion,
    );

    res.json(result);
  };

  compareAndPersist = async (req: Request, res: Response): Promise<void> => {
    const documentType = parseDocumentTypeParam(String(req.params.tipo));
    const documentNumber = parseDocumentNumberParam(String(req.params.documentNumber));
    const blVersion = this.parseOptionalVersion(req.query.blVersion);

    const result = await this.conferenciaService.compareAndPersist(
      documentType,
      documentNumber,
      blVersion,
    );

    res.json(result);
  };

  getLatest = async (req: Request, res: Response): Promise<void> => {
    const documentType = parseDocumentTypeParam(String(req.params.tipo));
    const documentNumber = parseDocumentNumberParam(String(req.params.documentNumber));

    const result = await this.conferenciaService.getLatest(documentType, documentNumber);
    res.json(result);
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    const id = parseOptionalInt(req.params.id);

    if (!id) {
      throw new BadRequestError('ID inválido');
    }

    const result = await this.conferenciaService.getById(id);
    res.json(result);
  };

  resolve = async (req: Request, res: Response): Promise<void> => {
    const id = parseOptionalInt(req.params.id);

    if (!id) {
      throw new BadRequestError('ID inválido');
    }

    const body = parseResolveConferenciaBody(req.body);
    const result = await this.conferenciaService.resolveConferencia(id, body);
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

    const body = parseResolveConferenciaCampoBody(req.body);
    const result = await this.conferenciaService.resolveCampo(id, campoKey, body);
    res.json(result);
  };

  private parseOptionalVersion(value: unknown): BlVersion {
    if (typeof value === 'string' && isBlVersion(value)) {
      return value;
    }

    return BL_VERSION.FINAL;
  }
}
