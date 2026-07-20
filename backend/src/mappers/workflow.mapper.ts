import type { BlWorkflowContext } from '../types/bl-domain.types.js';
import type { WorkflowSummaryDto } from '../types/workflow.types.js';

export function mapWorkflowSummary(
  context: BlWorkflowContext,
): WorkflowSummaryDto {
  return {
    id: context.workflow.Id,
    documentType: context.documentType,
    documentNumber: context.documentNumber,
    blVersion: context.blVersion,
    status: context.workflow.Status,
    pendencia: context.workflow.Pendencia,
    responsavelUserId: context.workflow.ResponsavelUserId,
    confianca: context.workflow.Confianca,
    updatedAt: context.workflow.UpdatedAt.toISOString(),
  };
}
