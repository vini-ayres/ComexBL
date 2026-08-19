import type { BlHistoricoAlteracao, Prisma } from '@prisma/client';
import { prisma } from '../prisma/client.js';

export interface CreateHistoricoAlteracaoInput {
  blMasterId?: number | null;
  blHouseId?: number | null;
  userId?: number | null;
  usuario: string;
  campo: string;
  valorAntes: string;
  valorDepois: string;
  acao: string;
  createdAt?: Date;
}

export class BlHistoricoAlteracaoRepository {
  private client(tx?: Prisma.TransactionClient): Prisma.TransactionClient {
    return tx ?? prisma;
  }

  async findByMasterId(blMasterId: number): Promise<BlHistoricoAlteracao[]> {
    return prisma.blHistoricoAlteracao.findMany({
      where: { BlMasterId: blMasterId },
      orderBy: { CreatedAt: 'asc' },
    });
  }

  async findByHouseId(blHouseId: number): Promise<BlHistoricoAlteracao[]> {
    return prisma.blHistoricoAlteracao.findMany({
      where: { BlHouseId: blHouseId },
      orderBy: { CreatedAt: 'asc' },
    });
  }

  async findDivergenciaResolucoesByMasterId(
    blMasterId: number,
  ): Promise<BlHistoricoAlteracao[]> {
    return prisma.blHistoricoAlteracao.findMany({
      where: {
        BlMasterId: blMasterId,
        Acao: { in: ['resolucao_divergencia', 'resolucao_divergencia_campo'] },
      },
      orderBy: { CreatedAt: 'asc' },
    });
  }

  async findDivergenciaResolucoesByHouseId(
    blHouseId: number,
  ): Promise<BlHistoricoAlteracao[]> {
    return prisma.blHistoricoAlteracao.findMany({
      where: {
        BlHouseId: blHouseId,
        Acao: { in: ['resolucao_divergencia', 'resolucao_divergencia_campo'] },
      },
      orderBy: { CreatedAt: 'asc' },
    });
  }

  async findLatestCampoResolucao(
    blMasterId: number | null,
    blHouseId: number | null,
    campoKey: string,
    acao = 'resolucao_divergencia_campo',
  ): Promise<BlHistoricoAlteracao | null> {
    return prisma.blHistoricoAlteracao.findFirst({
      where: {
        BlMasterId: blMasterId,
        BlHouseId: blHouseId,
        Acao: acao,
        Campo: { startsWith: `${campoKey}|` },
      },
      orderBy: { CreatedAt: 'desc' },
    });
  }

  async create(
    input: CreateHistoricoAlteracaoInput,
    tx?: Prisma.TransactionClient,
  ): Promise<BlHistoricoAlteracao> {
    return this.client(tx).blHistoricoAlteracao.create({
      data: {
        BlMasterId: input.blMasterId ?? null,
        BlHouseId: input.blHouseId ?? null,
        UserId: input.userId ?? null,
        Usuario: input.usuario,
        Campo: input.campo,
        ValorAntes: input.valorAntes,
        ValorDepois: input.valorDepois,
        Acao: input.acao,
        CreatedAt: input.createdAt,
      },
    });
  }
}

export const blHistoricoAlteracaoRepository = new BlHistoricoAlteracaoRepository();
