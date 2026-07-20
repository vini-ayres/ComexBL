import type { BlConsultaGlobalSys, Prisma } from '@prisma/client';
import { prisma } from '../prisma/client.js';
import type { RecordConsultaGlobalSysInput } from '../types/bl-domain.types.js';

export class BlConsultaGlobalSysRepository {
  private client(tx?: Prisma.TransactionClient): Prisma.TransactionClient {
    return tx ?? prisma;
  }
  async findByMasterId(blMasterId: number): Promise<BlConsultaGlobalSys[]> {
    return prisma.blConsultaGlobalSys.findMany({
      where: { BlMasterId: blMasterId },
      orderBy: { ExecutadoEm: 'desc' },
    });
  }

  async findByHouseId(blHouseId: number): Promise<BlConsultaGlobalSys[]> {
    return prisma.blConsultaGlobalSys.findMany({
      where: { BlHouseId: blHouseId },
      orderBy: { ExecutadoEm: 'desc' },
    });
  }

  async countByMasterId(
    blMasterId: number,
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    return this.client(tx).blConsultaGlobalSys.count({
      where: { BlMasterId: blMasterId },
    });
  }

  async countByHouseId(
    blHouseId: number,
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    return this.client(tx).blConsultaGlobalSys.count({
      where: { BlHouseId: blHouseId },
    });
  }

  async getLatestByMasterId(
    blMasterId: number,
  ): Promise<BlConsultaGlobalSys | null> {
    return prisma.blConsultaGlobalSys.findFirst({
      where: { BlMasterId: blMasterId },
      orderBy: { ExecutadoEm: 'desc' },
    });
  }

  async getLatestByHouseId(
    blHouseId: number,
  ): Promise<BlConsultaGlobalSys | null> {
    return prisma.blConsultaGlobalSys.findFirst({
      where: { BlHouseId: blHouseId },
      orderBy: { ExecutadoEm: 'desc' },
    });
  }

  async getLatestSuccessByMasterId(blMasterId: number): Promise<boolean | null> {
    const latest = await this.getLatestByMasterId(blMasterId);
    return latest?.Sucesso ?? null;
  }

  async getLatestSuccessByHouseId(blHouseId: number): Promise<boolean | null> {
    const latest = await this.getLatestByHouseId(blHouseId);
    return latest?.Sucesso ?? null;
  }

  async record(
    input: RecordConsultaGlobalSysInput,
    tx?: Prisma.TransactionClient,
  ): Promise<BlConsultaGlobalSys> {
    const tentativaNumero =
      input.blMasterId != null
        ? (await this.countByMasterId(input.blMasterId, tx)) + 1
        : input.blHouseId != null
          ? (await this.countByHouseId(input.blHouseId, tx)) + 1
          : 1;

    return this.client(tx).blConsultaGlobalSys.create({
      data: {
        BlMasterId: input.blMasterId ?? null,
        BlHouseId: input.blHouseId ?? null,
        TentativaNumero: tentativaNumero,
        Sucesso: input.sucesso,
        Detalhe: input.detalhe ?? null,
      },
    });
  }
}

export const blConsultaGlobalSysRepository = new BlConsultaGlobalSysRepository();
