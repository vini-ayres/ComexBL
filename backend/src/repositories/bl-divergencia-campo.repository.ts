import type { BlDivergenciaCampo, Prisma } from '@prisma/client';
import { prisma } from '../prisma/client.js';
import type { PersistDivergenciaCampoInput } from '../types/bl-domain.types.js';

export class BlDivergenciaCampoRepository {
  private client(tx?: Prisma.TransactionClient): Prisma.TransactionClient {
    return tx ?? prisma;
  }

  async findByDivergenciaId(
    blDivergenciaId: number,
    tx?: Prisma.TransactionClient,
  ): Promise<BlDivergenciaCampo[]> {
    return this.client(tx).blDivergenciaCampo.findMany({
      where: { BlDivergenciaId: blDivergenciaId },
      orderBy: { CampoKey: 'asc' },
    });
  }

  async deleteByDivergenciaId(
    blDivergenciaId: number,
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    const result = await this.client(tx).blDivergenciaCampo.deleteMany({
      where: { BlDivergenciaId: blDivergenciaId },
    });

    return result.count;
  }

  async replaceCampos(
    blDivergenciaId: number,
    campos: PersistDivergenciaCampoInput[],
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    await this.deleteByDivergenciaId(blDivergenciaId, tx);

    if (campos.length === 0) {
      return 0;
    }

    const result = await this.client(tx).blDivergenciaCampo.createMany({
      data: campos.map((campo) => ({
        BlDivergenciaId: blDivergenciaId,
        CampoKey: campo.campoKey,
        CampoLabel: campo.campoLabel,
        ValorBlFinal: campo.valorBlFinal ?? campo.valorDraft ?? '',
        ValorGlobalSys: campo.valorGlobalSys ?? campo.valorFinal ?? '',
        Status: 'pendente',
        Categoria: campo.categoria,
      })),
    });

    return result.count;
  }

  async findByDivergenciaIdAndCampoKey(
    blDivergenciaId: number,
    campoKey: string,
    tx?: Prisma.TransactionClient,
  ): Promise<BlDivergenciaCampo | null> {
    return this.client(tx).blDivergenciaCampo.findFirst({
      where: {
        BlDivergenciaId: blDivergenciaId,
        CampoKey: campoKey,
      },
    });
  }

  async updateResolution(
    id: number,
    data: {
      status: string;
      valorBlFinal: string;
      valorGlobalSys: string;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<BlDivergenciaCampo> {
    return this.client(tx).blDivergenciaCampo.update({
      where: { Id: id },
      data: {
        Status: data.status,
        ValorBlFinal: data.valorBlFinal,
        ValorGlobalSys: data.valorGlobalSys,
      },
    });
  }
}

export const blDivergenciaCampoRepository = new BlDivergenciaCampoRepository();
