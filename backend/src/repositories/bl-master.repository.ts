import type { BlHouse, BlMaster, Prisma } from '@prisma/client';
import { BL_VERSION, type BlVersion } from '../constants/bl-version.constants.js';
import { prisma } from '../prisma/client.js';
import type { BlMasterWithHouses } from '../types/bl-domain.types.js';
import type { PaginationQuery } from '../types/bl.types.js';
import { getSkipTake } from '../utils/pagination.js';

export interface BlMasterListFilters {
  status?: string;
  search?: string;
  blVersion?: BlVersion;
}


export class BlMasterRepository {
  async findByMasterNumberAndVersion(
    masterNumber: string,
    blVersion: BlVersion,
  ): Promise<BlMaster | null> {
    return prisma.blMaster.findUnique({
      where: {
        MasterNumber_BlVersion: { MasterNumber: masterNumber, BlVersion: blVersion },
      },
    });
  }

  async findDraftByMasterNumber(masterNumber: string): Promise<BlMaster | null> {
    return this.findByMasterNumberAndVersion(masterNumber, BL_VERSION.DRAFT);
  }

  async findFinalByMasterNumber(masterNumber: string): Promise<BlMaster | null> {
    return this.findByMasterNumberAndVersion(masterNumber, BL_VERSION.FINAL);
  }

  async findByContainerNumberAndVersion(
    containerNumber: string,
    blVersion: BlVersion,
  ): Promise<BlMaster | null> {
    return prisma.blMaster.findFirst({
      where: {
        ContainerNumber: containerNumber.trim(),
        BlVersion: blVersion,
      },
      orderBy: { Id: 'asc' },
    });
  }

  async findWithHousesByMasterNumberAndVersion(
    masterNumber: string,
    blVersion: BlVersion,
  ): Promise<BlMasterWithHouses | null> {
    const master = await this.findByMasterNumberAndVersion(masterNumber, blVersion);

    if (!master) {
      return null;
    }

    const houses = await prisma.blHouse.findMany({
      where: { BLMasterId: master.Id, BlVersion: blVersion },
      orderBy: { HouseNumber: 'asc' },
    });

    return { master, houses };
  }

  async create(data: Prisma.BlMasterCreateInput): Promise<BlMaster> {
    return prisma.blMaster.create({ data });
  }

  async findMany(
    pagination: PaginationQuery,
    filters: BlMasterListFilters = {},
  ): Promise<{ items: BlMaster[]; total: number }> {
    const { skip, take } = getSkipTake(pagination);
    const where = this.buildWhere(filters);

    const [items, total] = await prisma.$transaction([
      prisma.blMaster.findMany({
        where,
        orderBy: { Id: 'desc' },
        skip,
        take,
      }),
      prisma.blMaster.count({ where }),
    ]);

    return { items, total };
  }

  async findById(id: number): Promise<{
    master: BlMaster;
    houses: BlHouse[];
  } | null> {
    const master = await prisma.blMaster.findUnique({
      where: { Id: id },
    });

    if (!master) {
      return null;
    }

    const houses = await prisma.blHouse.findMany({
      where: { BLMasterId: id },
      orderBy: { HouseNumber: 'asc' },
    });

    return { master, houses };
  }

  async count(): Promise<number> {
    return prisma.blMaster.count();
  }

  async updateHblCount(id: number, hblCount: number): Promise<BlMaster> {
    return prisma.blMaster.update({
      where: { Id: id },
      data: { HBLCount: hblCount },
    });
  }

  private buildWhere(filters: BlMasterListFilters): Prisma.BlMasterWhereInput | undefined {
    const conditions: Prisma.BlMasterWhereInput[] = [];

    if (filters.blVersion) {
      conditions.push({ BlVersion: filters.blVersion });
    }

    if (filters.status === 'finalizado') {
      conditions.push({ Status: true });
    } else if (filters.status === 'processando') {
      conditions.push({ Status: false });
    }

    if (filters.search) {
      conditions.push({
        OR: [
          { MasterNumber: { contains: filters.search } },
          { VesselName: { contains: filters.search } },
          { Voyage: { contains: filters.search } },
        ],
      });
    }

    if (conditions.length === 0) {
      return undefined;
    }

    return { AND: conditions };
  }
}

export const blMasterRepository = new BlMasterRepository();
