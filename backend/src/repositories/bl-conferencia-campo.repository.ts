import type { BlConferenciaCampo, Prisma } from '@prisma/client';
import { prisma } from '../prisma/client.js';
import type { ConferenciaCategoria } from '../constants/conferencia-house-master.constants.js';

export interface PersistConferenciaCampoInput {
  campoKey: string;
  campoLabel: string;
  valorHouse: string;
  valorMaster: string;
  categoria: ConferenciaCategoria;
  status?: string;
}

export class BlConferenciaCampoRepository {
  private client(tx?: Prisma.TransactionClient): Prisma.TransactionClient {
    return tx ?? prisma;
  }

  async findByConferenciaId(
    blConferenciaId: number,
    tx?: Prisma.TransactionClient,
  ): Promise<BlConferenciaCampo[]> {
    return this.client(tx).blConferenciaCampo.findMany({
      where: { BlConferenciaId: blConferenciaId },
      orderBy: { CampoKey: 'asc' },
    });
  }

  async deleteByConferenciaId(
    blConferenciaId: number,
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    const result = await this.client(tx).blConferenciaCampo.deleteMany({
      where: { BlConferenciaId: blConferenciaId },
    });

    return result.count;
  }

  async replaceCampos(
    blConferenciaId: number,
    campos: PersistConferenciaCampoInput[],
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    await this.deleteByConferenciaId(blConferenciaId, tx);

    if (campos.length === 0) {
      return 0;
    }

    const result = await this.client(tx).blConferenciaCampo.createMany({
      data: campos.map((campo) => ({
        BlConferenciaId: blConferenciaId,
        CampoKey: campo.campoKey,
        CampoLabel: campo.campoLabel,
        ValorHouse: campo.valorHouse,
        ValorMaster: campo.valorMaster,
        Status: campo.status ?? 'pendente',
        Categoria: campo.categoria,
      })),
    });

    return result.count;
  }

  async updateResolution(
    id: number,
    data: {
      status: string;
      valorHouse: string;
      valorMaster: string;
      valorManual?: string | null;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<BlConferenciaCampo> {
    return this.client(tx).blConferenciaCampo.update({
      where: { Id: id },
      data: {
        Status: data.status,
        ValorHouse: data.valorHouse,
        ValorMaster: data.valorMaster,
        ValorManual: data.valorManual ?? null,
      },
    });
  }
}

export const blConferenciaCampoRepository = new BlConferenciaCampoRepository();
