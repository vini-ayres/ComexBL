import type { BlConferencia, BlConferenciaCampo, Prisma } from '@prisma/client';
import { prisma } from '../prisma/client.js';

export interface UpsertConferenciaInput {
  blMasterId?: number | null;
  blHouseId?: number | null;
  status: string;
}

export class BlConferenciaRepository {
  private client(tx?: Prisma.TransactionClient): Prisma.TransactionClient {
    return tx ?? prisma;
  }

  async findByMasterId(blMasterId: number): Promise<BlConferencia[]> {
    return prisma.blConferencia.findMany({
      where: { BlMasterId: blMasterId },
      orderBy: { CreatedAt: 'desc' },
    });
  }

  async findByHouseId(blHouseId: number): Promise<BlConferencia[]> {
    return prisma.blConferencia.findMany({
      where: { BlHouseId: blHouseId },
      orderBy: { CreatedAt: 'desc' },
    });
  }

  /**
   * Só Houses com Master do mesmo container (ou já vinculado) fora de
   * Apoio Humano / não encontrado. Sem o par, a conferência espera.
   */
  async findQueueCandidates(): Promise<
    Array<{ tipo: 'House'; id: number; documentNumber: string; blVersion: string }>
  > {
    const rows = await prisma.$queryRaw<
      { tipo: string; id: number; documentNumber: string; blVersion: string }[]
    >`
      SELECT
        CAST('House' AS VARCHAR(10)) AS tipo,
        h.Id AS id,
        h.HouseNumber AS documentNumber,
        h.BlVersion AS blVersion
      FROM BL_House h
      INNER JOIN BL_Workflow w ON w.BlHouseId = h.Id
      WHERE w.Status = 'conferencia_house_master'
        AND EXISTS (
          SELECT 1
          FROM BL_Master m
          INNER JOIN BL_Workflow wm ON wm.BlMasterId = m.Id
          WHERE m.BlVersion = h.BlVersion
            AND (
              (h.BLMasterId IS NOT NULL AND m.Id = h.BLMasterId)
              OR (
                h.ContainerNumber IS NOT NULL
                AND LTRIM(RTRIM(h.ContainerNumber)) <> ''
                AND LTRIM(RTRIM(ISNULL(m.ContainerNumber, ''))) = LTRIM(RTRIM(h.ContainerNumber))
              )
            )
            AND wm.Status NOT IN ('apoio_humano', 'nao_encontrado')
        )
      ORDER BY h.Id
    `;

    return rows.map((row) => ({
      tipo: 'House' as const,
      id: row.id,
      documentNumber: row.documentNumber,
      blVersion: row.blVersion,
    }));
  }

  async findMastersInConferencia(): Promise<
    Array<{ id: number; documentNumber: string; blVersion: string }>
  > {
    const rows = await prisma.$queryRaw<
      { id: number; documentNumber: string; blVersion: string }[]
    >`
      SELECT
        m.Id AS id,
        m.MasterNumber AS documentNumber,
        m.BlVersion AS blVersion
      FROM BL_Master m
      INNER JOIN BL_Workflow w ON w.BlMasterId = m.Id
      WHERE w.Status = 'conferencia_house_master'
      ORDER BY m.Id
    `;

    return rows;
  }

  async findLatestByMasterId(
    blMasterId: number,
    tx?: Prisma.TransactionClient,
  ): Promise<BlConferencia | null> {
    return this.client(tx).blConferencia.findFirst({
      where: { BlMasterId: blMasterId },
      orderBy: { CreatedAt: 'desc' },
    });
  }

  async findLatestByHouseId(
    blHouseId: number,
    tx?: Prisma.TransactionClient,
  ): Promise<BlConferencia | null> {
    return this.client(tx).blConferencia.findFirst({
      where: { BlHouseId: blHouseId },
      orderBy: { CreatedAt: 'desc' },
    });
  }

  async findByIdWithCampos(
    id: number,
    tx?: Prisma.TransactionClient,
  ): Promise<(BlConferencia & { campos: BlConferenciaCampo[] }) | null> {
    return this.client(tx).blConferencia.findUnique({
      where: { Id: id },
      include: { campos: { orderBy: { CampoKey: 'asc' } } },
    });
  }

  async findLatestByMasterIdWithCampos(
    blMasterId: number,
  ): Promise<(BlConferencia & { campos: BlConferenciaCampo[] }) | null> {
    return prisma.blConferencia.findFirst({
      where: { BlMasterId: blMasterId },
      include: { campos: { orderBy: { CampoKey: 'asc' } } },
      orderBy: { CreatedAt: 'desc' },
    });
  }

  async findLatestByHouseIdWithCampos(
    blHouseId: number,
  ): Promise<(BlConferencia & { campos: BlConferenciaCampo[] }) | null> {
    return prisma.blConferencia.findFirst({
      where: { BlHouseId: blHouseId },
      include: { campos: { orderBy: { CampoKey: 'asc' } } },
      orderBy: { CreatedAt: 'desc' },
    });
  }

  async create(
    input: UpsertConferenciaInput,
    tx?: Prisma.TransactionClient,
  ): Promise<BlConferencia> {
    return this.client(tx).blConferencia.create({
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
  ): Promise<BlConferencia> {
    const isResolved = status === 'resolvido';

    return this.client(tx).blConferencia.update({
      where: { Id: id },
      data: {
        Status: status,
        ResolvedByUserId: isResolved ? (resolvedByUserId ?? null) : null,
        ResolvedAt: isResolved ? (resolvedAt ?? new Date()) : null,
      },
    });
  }

  async upsert(
    input: UpsertConferenciaInput,
    tx?: Prisma.TransactionClient,
  ): Promise<BlConferencia> {
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

export const blConferenciaRepository = new BlConferenciaRepository();
