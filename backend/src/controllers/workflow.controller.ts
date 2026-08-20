import type { Request, Response } from 'express';
import { NotFoundError } from '../errors/AppError.js';
import { mapWorkflowSummary } from '../mappers/workflow.mapper.js';
import type { WorkflowService } from '../services/workflow.service.js';
import {
  parseBlVersionQuery,
  parseDocumentNumberParam,
  parseDocumentTypeParam,
} from '../utils/bl-http-params.js';

export class WorkflowController {
  constructor(private readonly workflowService: WorkflowService) {}

  getByDocument = async (req: Request, res: Response): Promise<void> => {
    const documentType = parseDocumentTypeParam(String(req.params.tipo));
    const documentNumber = parseDocumentNumberParam(String(req.params.documentNumber));
    const blVersion = parseBlVersionQuery(req.query.version, { required: true });

    const context = await this.workflowService.getWorkflowByDocument(
      documentType,
      documentNumber,
      blVersion,
    );

    if (!context) {
      throw new NotFoundError(
        `Workflow não encontrado para ${documentType} ${documentNumber} (${blVersion})`,
      );
    }

    res.json(mapWorkflowSummary(context));
  };
}
