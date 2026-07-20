import type { BlWorkflow, Prisma } from '@prisma/client';
import { prisma } from '../prisma/client.js';
import type {
  UpdateWorkflowInput,
  WorkflowUpsertParams,
} from '../types/bl-domain.types.js';

export class BlWorkflowRepository {
  private client(tx?: Prisma.TransactionClient): Prisma.TransactionClient {
    return tx ?? prisma;
  }

  async findByMasterId(
    blMasterId: number,
    tx?: Prisma.TransactionClient,
  ): Promise<BlWorkflow | null> {
    return this.client(tx).blWorkflow.findUnique({
      where: { BlMasterId: blMasterId },
    });
  }

  async findByHouseId(
    blHouseId: number,
    tx?: Prisma.TransactionClient,
  ): Promise<BlWorkflow | null> {
    return this.client(tx).blWorkflow.findUnique({
      where: { BlHouseId: blHouseId },
    });
  }

  async create(
    data: Prisma.BlWorkflowCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<BlWorkflow> {
    return this.client(tx).blWorkflow.create({ data });
  }

  async update(
    id: number,
    data: UpdateWorkflowInput,
    tx?: Prisma.TransactionClient,
  ): Promise<BlWorkflow> {
    return this.client(tx).blWorkflow.update({
      where: { Id: id },
      data: {
        Status: data.status,
        Pendencia: data.pendencia,
        ResponsavelUserId: data.responsavelUserId,
        Confianca: data.confianca,
      },
    });
  }

  async upsert(
    params: WorkflowUpsertParams,
    tx?: Prisma.TransactionClient,
  ): Promise<BlWorkflow> {
    const workflowData = {
      TipoBl: params.tipoBl,
      Status: params.data.status,
      Pendencia: params.data.pendencia ?? null,
      ResponsavelUserId: params.data.responsavelUserId ?? null,
      Confianca: params.data.confianca ?? null,
    };

    if (params.tipoBl === 'Master') {
      if (!params.blMasterId) {
        throw new Error('blMasterId é obrigatório para workflow de Master');
      }

      const existing = await this.findByMasterId(params.blMasterId, tx);

      if (existing) {
        return this.update(existing.Id, params.data, tx);
      }

      return this.create(
        {
          master: { connect: { Id: params.blMasterId } },
          ...workflowData,
        },
        tx,
      );
    }

    if (!params.blHouseId) {
      throw new Error('blHouseId é obrigatório para workflow de House');
    }

    const existing = await this.findByHouseId(params.blHouseId, tx);

    if (existing) {
      return this.update(existing.Id, params.data, tx);
    }

    return this.create(
      {
        house: { connect: { Id: params.blHouseId } },
        ...workflowData,
      },
      tx,
    );
  }
}

export const blWorkflowRepository = new BlWorkflowRepository();
