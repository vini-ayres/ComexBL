import type { BlDivergencia, BlDivergenciaCampo, Prisma } from '@prisma/client';
import { prisma } from '../prisma/client.js';

export interface UpsertDivergenciaInput {
  blMasterId?: number | null;
  blHouseId?: number | null;
  status: string;
}

export class BlDivergenciaRepository {
  private client(tx?: Prisma.TransactionClient): Prisma.TransactionClient {
    return tx ?? prisma;
  }

  async findByMasterId(blMasterId: number): Promise<BlDivergencia[]> {
    return prisma.blDivergencia.findMany({
      where: { BlMasterId: blMasterId },
      orderBy: { CreatedAt: 'desc' },
    });
  }

  async findByHouseId(blHouseId: number): Promise<BlDivergencia[]> {
    return prisma.blDivergencia.findMany({
      where: { BlHouseId: blHouseId },
      orderBy: { CreatedAt: 'desc' },
    });
  }

  async findLatestByMasterId(
    blMasterId: number,
    tx?: Prisma.TransactionClient,
  ): Promise<BlDivergencia | null> {
    return this.client(tx).blDivergencia.findFirst({
      where: { BlMasterId: blMasterId },
      orderBy: { CreatedAt: 'desc' },
    });
  }

  async findLatestByHouseId(
    blHouseId: number,
    tx?: Prisma.TransactionClient,
  ): Promise<BlDivergencia | null> {
    return this.client(tx).blDivergencia.findFirst({
      where: { BlHouseId: blHouseId },
      orderBy: { CreatedAt: 'desc' },
    });
  }

  async findByIdWithCampos(
    id: number,
    tx?: Prisma.TransactionClient,
  ): Promise<(BlDivergencia & { campos: BlDivergenciaCampo[] }) | null> {
    return this.client(tx).blDivergencia.findUnique({
      where: { Id: id },
      include: { campos: true },
    });
  }

  async create(
    input: UpsertDivergenciaInput,
    tx?: Prisma.TransactionClient,
  ): Promise<BlDivergencia> {
    return this.client(tx).blDivergencia.create({
      data: {
        BlMasterId: input.blMasterId ?? null,
        BlHouseId: input.blHouseId ?? null,
        Status: input.status,
      },
    });
  }

  async updateStatus(
    id: number,
    status: string,
    tx?: Prisma.TransactionClient,
    resolvedByUserId?: number | null,
    resolvedAt?: Date | null,
  ): Promise<BlDivergencia> {
    const isResolved = status === 'resolvido';

    return this.client(tx).blDivergencia.update({
      where: { Id: id },
      data: {
        Status: status,
        ResolvedByUserId: isResolved ? (resolvedByUserId ?? null) : null,
        ResolvedAt: isResolved ? (resolvedAt ?? new Date()) : null,
      },
    });
  }

  async upsert(
    input: UpsertDivergenciaInput,
    tx?: Prisma.TransactionClient,
  ): Promise<BlDivergencia> {
    const existing =
      input.blMasterId != null
        ? await this.findLatestByMasterId(input.blMasterId, tx)
        : input.blHouseId != null
          ? await this.findLatestByHouseId(input.blHouseId, tx)
          : null;

    if (existing) {
      return this.updateStatus(existing.Id, input.status, tx);
    }

    return this.create(input, tx);
  }
}

export const blDivergenciaRepository = new BlDivergenciaRepository();
