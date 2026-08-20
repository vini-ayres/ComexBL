import type { BlDivergenciaCampo, Prisma } from '@prisma/client';
import { prisma } from '../prisma/client.js';
import type { PersistDivergenciaCampoInput } from '../types/bl-domain.types.js';

const CAMPO_KEY_MAX_LENGTH = 200;
const CAMPO_LABEL_MAX_LENGTH = 200;

function truncate(value: string, maxLength: number): string {
  return value.length <= maxLength ? value : value.slice(0, maxLength);
}

function dedupeCamposByKey(
  campos: PersistDivergenciaCampoInput[],
): PersistDivergenciaCampoInput[] {
  const unique = new Map<string, PersistDivergenciaCampoInput>();

  for (const campo of campos) {
    const campoKey = truncate(campo.campoKey, CAMPO_KEY_MAX_LENGTH);
    unique.set(campoKey, {
      ...campo,
      campoKey,
      campoLabel: truncate(campo.campoLabel, CAMPO_LABEL_MAX_LENGTH),
    });
  }

  return [...unique.values()];
}

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

    const uniqueCampos = dedupeCamposByKey(campos);

    if (uniqueCampos.length === 0) {
      return 0;
    }

    const result = await this.client(tx).blDivergenciaCampo.createMany({
      data: uniqueCampos.map((campo) => ({
        BlDivergenciaId: blDivergenciaId,
        CampoKey: campo.campoKey,
        CampoLabel: campo.campoLabel,
        ValorBlFinal: campo.valorBlFinal ?? campo.valorDraft ?? '',
        ValorGlobalSys: campo.valorGlobalSys ?? campo.valorFinal ?? '',
        Status: campo.status ?? 'pendente',
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
    },
    tx?: Prisma.TransactionClient,
  ): Promise<BlDivergenciaCampo> {
    return this.client(tx).blDivergenciaCampo.update({
      where: { Id: id },
      data: {
        Status: data.status,
      },
    });
  }
}

export const blDivergenciaCampoRepository = new BlDivergenciaCampoRepository();
