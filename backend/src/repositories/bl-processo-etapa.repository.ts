import type { BlProcessoEtapa } from '@prisma/client';
import { prisma } from '../prisma/client.js';

export class BlProcessoEtapaRepository {
  async findByMasterId(blMasterId: number): Promise<BlProcessoEtapa[]> {
    return prisma.blProcessoEtapa.findMany({
      where: { BlMasterId: blMasterId },
      orderBy: { Ordem: 'asc' },
    });
  }

  async findByHouseId(blHouseId: number): Promise<BlProcessoEtapa[]> {
    return prisma.blProcessoEtapa.findMany({
      where: { BlHouseId: blHouseId },
      orderBy: { Ordem: 'asc' },
    });
  }

  async countByMasterId(blMasterId: number): Promise<number> {
    return prisma.blProcessoEtapa.count({
      where: { BlMasterId: blMasterId },
    });
  }

  async countByHouseId(blHouseId: number): Promise<number> {
    return prisma.blProcessoEtapa.count({
      where: { BlHouseId: blHouseId },
    });
  }
}

export const blProcessoEtapaRepository = new BlProcessoEtapaRepository();
