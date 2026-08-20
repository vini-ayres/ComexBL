import { Prisma } from '@prisma/client';
import type { BlWorkflow } from '@prisma/client';
import { prisma } from '../prisma/client.js';
import type {
  UpdateWorkflowInput,
  WorkflowUpsertParams,
} from '../types/bl-domain.types.js';

const WORKFLOW_PENDENCIA_MAX_LENGTH = 500;

export class BlWorkflowRepository {
  private client(tx?: Prisma.TransactionClient): Prisma.TransactionClient {
    return tx ?? prisma;
  }

  async findByMasterId(
    blMasterId: number,
    tx?: Prisma.TransactionClient,
  ): Promise<BlWorkflow | null> {
    return this.client(tx).blWorkflow.findFirst({
      where: { BlMasterId: blMasterId },
    });
  }

  async findByHouseId(
    blHouseId: number,
    tx?: Prisma.TransactionClient,
  ): Promise<BlWorkflow | null> {
    return this.client(tx).blWorkflow.findFirst({
      where: { BlHouseId: blHouseId },
    });
  }

  async findByMasterIds(blMasterIds: number[]): Promise<BlWorkflow[]> {
    if (blMasterIds.length === 0) {
      return [];
    }

    return prisma.blWorkflow.findMany({
      where: { BlMasterId: { in: blMasterIds } },
    });
  }

  async findByHouseIds(blHouseIds: number[]): Promise<BlWorkflow[]> {
    if (blHouseIds.length === 0) {
      return [];
    }

    return prisma.blWorkflow.findMany({
      where: { BlHouseId: { in: blHouseIds } },
    });
  }

  /**
   * DRAFTs sem workflow cujo FINAL já existe — o upsert antigo movia o
   * workflow do DRAFT para o FINAL, e o dashboard mostrava Processando.
   */
  async findOrphanDraftsWithFinalSibling(): Promise<
    Array<{ tipo: 'Master' | 'House'; documentNumber: string }>
  > {
    const rows = await prisma.$queryRaw<
      { tipo: string; documentNumber: string }[]
    >`
      SELECT CAST('Master' AS VARCHAR(10)) AS tipo, d.MasterNumber AS documentNumber
      FROM BL_Master d
      WHERE d.BlVersion = 'DRAFT'
        AND NOT EXISTS (
          SELECT 1 FROM BL_Workflow w WHERE w.BlMasterId = d.Id
        )
        AND EXISTS (
          SELECT 1 FROM BL_Master f
          WHERE f.MasterNumber = d.MasterNumber AND f.BlVersion = 'FINAL'
        )

      UNION ALL

      SELECT CAST('House' AS VARCHAR(10)) AS tipo, d.HouseNumber AS documentNumber
      FROM BL_House d
      WHERE d.BlVersion = 'DRAFT'
        AND NOT EXISTS (
          SELECT 1 FROM BL_Workflow w WHERE w.BlHouseId = d.Id
        )
        AND EXISTS (
          SELECT 1 FROM BL_House f
          WHERE f.HouseNumber = d.HouseNumber AND f.BlVersion = 'FINAL'
        )
    `;

    return rows.map((row) => ({
      tipo: row.tipo as 'Master' | 'House',
      documentNumber: row.documentNumber,
    }));
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
      data: this.buildUpdateData(data),
    });
  }

  async upsert(
    params: WorkflowUpsertParams,
    tx?: Prisma.TransactionClient,
  ): Promise<BlWorkflow> {
    const workflowData = this.buildCreateInput(params);

    if (params.tipoBl === 'Master') {
      if (!params.blMasterId) {
        throw new Error('blMasterId é obrigatório para workflow de Master');
      }

      return this.upsertMasterWorkflow(
        params.blMasterId,
        workflowData,
        params.data,
        tx,
      );
    }

    if (!params.blHouseId) {
      throw new Error('blHouseId é obrigatório para workflow de House');
    }

    return this.upsertHouseWorkflow(
      params.blHouseId,
      workflowData,
      params.data,
      tx,
    );
  }

  private async upsertMasterWorkflow(
    blMasterId: number,
    workflowData: Omit<Prisma.BlWorkflowCreateInput, 'master' | 'house'>,
    data: UpdateWorkflowInput,
    tx?: Prisma.TransactionClient,
  ): Promise<BlWorkflow> {
    const existing = await this.resolveExistingMasterWorkflow(blMasterId, tx);

    if (existing) {
      return this.reconcileMasterWorkflow(existing, blMasterId, data, tx);
    }

    try {
      return await this.create(
        {
          master: { connect: { Id: blMasterId } },
          ...workflowData,
        },
        tx,
      );
    } catch (error) {
      if (!this.isUniqueConstraintError(error)) {
        throw error;
      }

      const concurrent = await this.resolveExistingMasterWorkflow(blMasterId, tx);

      if (!concurrent) {
        throw error;
      }

      return this.reconcileMasterWorkflow(concurrent, blMasterId, data, tx);
    }
  }

  private async upsertHouseWorkflow(
    blHouseId: number,
    workflowData: Omit<Prisma.BlWorkflowCreateInput, 'master' | 'house'>,
    data: UpdateWorkflowInput,
    tx?: Prisma.TransactionClient,
  ): Promise<BlWorkflow> {
    const existing = await this.resolveExistingHouseWorkflow(blHouseId, tx);

    if (existing) {
      return this.reconcileHouseWorkflow(existing, blHouseId, data, tx);
    }

    try {
      return await this.create(
        {
          house: { connect: { Id: blHouseId } },
          ...workflowData,
        },
        tx,
      );
    } catch (error) {
      if (!this.isUniqueConstraintError(error)) {
        throw error;
      }

      const concurrent = await this.resolveExistingHouseWorkflow(blHouseId, tx);

      if (!concurrent) {
        throw error;
      }

      return this.reconcileHouseWorkflow(concurrent, blHouseId, data, tx);
    }
  }

  private async resolveExistingMasterWorkflow(
    blMasterId: number,
    tx?: Prisma.TransactionClient,
  ): Promise<BlWorkflow | null> {
    return this.client(tx).blWorkflow.findFirst({
      where: { BlMasterId: blMasterId },
    });
  }

  private async resolveExistingHouseWorkflow(
    blHouseId: number,
    tx?: Prisma.TransactionClient,
  ): Promise<BlWorkflow | null> {
    return this.client(tx).blWorkflow.findFirst({
      where: { BlHouseId: blHouseId },
    });
  }

  private async reconcileMasterWorkflow(
    existing: BlWorkflow,
    targetBlMasterId: number,
    data: UpdateWorkflowInput,
    tx?: Prisma.TransactionClient,
  ): Promise<BlWorkflow> {
    const client = this.client(tx);
    const updateData = this.buildUpdateData(data);

    if (existing.BlMasterId === targetBlMasterId) {
      return client.blWorkflow.update({
        where: { Id: existing.Id },
        data: updateData,
      });
    }

    return client.blWorkflow.update({
      where: { Id: existing.Id },
      data: {
        ...updateData,
        master: { connect: { Id: targetBlMasterId } },
      },
    });
  }

  private async reconcileHouseWorkflow(
    existing: BlWorkflow,
    targetBlHouseId: number,
    data: UpdateWorkflowInput,
    tx?: Prisma.TransactionClient,
  ): Promise<BlWorkflow> {
    const client = this.client(tx);
    const updateData = this.buildUpdateData(data);

    if (existing.BlHouseId === targetBlHouseId) {
      return client.blWorkflow.update({
        where: { Id: existing.Id },
        data: updateData,
      });
    }

    return client.blWorkflow.update({
      where: { Id: existing.Id },
      data: {
        ...updateData,
        house: { connect: { Id: targetBlHouseId } },
      },
    });
  }

  private buildUpdateData(
    data: UpdateWorkflowInput,
  ): Prisma.BlWorkflowUpdateInput {
    const updateData: Prisma.BlWorkflowUpdateInput = {
      Status: data.status,
      Pendencia: this.truncatePendencia(data.pendencia),
      Confianca: data.confianca,
    };

    if (data.responsavelUserId !== undefined) {
      updateData.responsavel =
        data.responsavelUserId != null
          ? { connect: { Id: data.responsavelUserId } }
          : { disconnect: true };
    }

    return updateData;
  }

  private buildCreateInput(
    params: WorkflowUpsertParams,
  ): Omit<Prisma.BlWorkflowCreateInput, 'master' | 'house'> {
    const responsavelUserId = params.data.responsavelUserId;

    return {
      TipoBl: params.tipoBl,
      Status: params.data.status,
      Pendencia: this.truncatePendencia(params.data.pendencia ?? null),
      Confianca: params.data.confianca ?? null,
      ...(responsavelUserId != null
        ? { responsavel: { connect: { Id: responsavelUserId } } }
        : {}),
    };
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    );
  }

  private truncatePendencia(value: string | null | undefined): string | null {
    if (value == null) {
      return null;
    }

    const compact = value.replace(/\s+/g, ' ').trim();

    if (compact.length <= WORKFLOW_PENDENCIA_MAX_LENGTH) {
      return compact;
    }

    return `${compact.slice(0, WORKFLOW_PENDENCIA_MAX_LENGTH - 1)}…`;
  }
}

export const blWorkflowRepository = new BlWorkflowRepository();
