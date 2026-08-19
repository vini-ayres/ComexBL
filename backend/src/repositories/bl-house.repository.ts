import type { BlHouse, BlMaster, Prisma } from '@prisma/client';
import { BL_VERSION, type BlVersion } from '../constants/bl-version.constants.js';
import { prisma } from '../prisma/client.js';
import type { BlHouseWithRelations } from '../types/bl-domain.types.js';
import type { PaginationQuery } from '../types/bl.types.js';
import { getSkipTake } from '../utils/pagination.js';

export interface BlHouseListFilters {
  masterId?: number;
  masterNumber?: string;
  blVersion?: BlVersion;
  status?: string;
  search?: string;
}

export class BlHouseRepository {
  async findByHouseNumberAndVersion(
    houseNumber: string,
    blVersion: BlVersion,
  ): Promise<BlHouse | null> {
    return prisma.blHouse.findUnique({
      where: {
        HouseNumber_BlVersion: { HouseNumber: houseNumber, BlVersion: blVersion },
      },
    });
  }

  async findDraftByHouseNumber(houseNumber: string): Promise<BlHouse | null> {
    return this.findByHouseNumberAndVersion(houseNumber, BL_VERSION.DRAFT);
  }

  async findFinalByHouseNumber(houseNumber: string): Promise<BlHouse | null> {
    return this.findByHouseNumberAndVersion(houseNumber, BL_VERSION.FINAL);
  }

  async findByContainerNumberAndVersion(
    containerNumber: string,
    blVersion: BlVersion,
  ): Promise<BlHouse[]> {
    return prisma.blHouse.findMany({
      where: {
        ContainerNumber: containerNumber.trim(),
        BlVersion: blVersion,
      },
      orderBy: { HouseNumber: 'asc' },
    });
  }

  async linkToMaster(houseId: number, masterId: number): Promise<BlHouse> {
    return prisma.blHouse.update({
      where: { Id: houseId },
      data: { BLMasterId: masterId },
    });
  }

  async unlinkFromMaster(houseId: number): Promise<BlHouse> {
    return prisma.blHouse.update({
      where: { Id: houseId },
      data: { BLMasterId: null },
    });
  }

  async findByMasterIdAndVersion(
    masterId: number,
    blVersion: BlVersion,
  ): Promise<BlHouse[]> {
    return prisma.blHouse.findMany({
      where: { BLMasterId: masterId, BlVersion: blVersion },
      orderBy: { HouseNumber: 'asc' },
    });
  }

  async findWithRelationsByHouseNumberAndVersion(
    houseNumber: string,
    blVersion: BlVersion,
  ): Promise<BlHouseWithRelations | null> {
    const house = await this.findByHouseNumberAndVersion(houseNumber, blVersion);

    if (!house) {
      return null;
    }

    const [master, cargos, ncms] = await Promise.all([
      house.BLMasterId
        ? prisma.blMaster.findUnique({ where: { Id: house.BLMasterId } })
        : Promise.resolve(null),
      prisma.blHouseCargo.findMany({
        where: { BlHouseId: house.Id },
        orderBy: { Id: 'asc' },
      }),
      prisma.blHouseNcm.findMany({
        where: { BlHouseId: house.Id },
        orderBy: { Id: 'asc' },
      }),
    ]);

    return { house, master, cargos, ncms };
  }

  async create(data: Prisma.BlHouseCreateInput): Promise<BlHouse> {
    return prisma.blHouse.create({ data });
  }

  async findMany(
    pagination: PaginationQuery,
    filters: BlHouseListFilters = {},
  ): Promise<{ items: BlHouse[]; total: number }> {
    const { skip, take } = getSkipTake(pagination);
    const where = await this.buildWhere(filters);

    const [items, total] = await prisma.$transaction([
      prisma.blHouse.findMany({
        where,
        orderBy: { Id: 'desc' },
        skip,
        take,
      }),
      prisma.blHouse.count({ where }),
    ]);

    return { items, total };
  }

  async findById(id: number): Promise<{
    house: BlHouse;
    master: BlMaster | null;
  } | null> {
    const house = await prisma.blHouse.findUnique({
      where: { Id: id },
    });

    if (!house) {
      return null;
    }

    const master = house.BLMasterId
      ? await prisma.blMaster.findUnique({
          where: { Id: house.BLMasterId },
        })
      : null;

    return { house, master };
  }

  async findByMasterId(masterId: number): Promise<BlHouse[]> {
    return prisma.blHouse.findMany({
      where: { BLMasterId: masterId },
      orderBy: { HouseNumber: 'asc' },
    });
  }

  async findByMasterIds(masterIds: number[]): Promise<BlHouse[]> {
    if (masterIds.length === 0) {
      return [];
    }

    return prisma.blHouse.findMany({
      where: { BLMasterId: { in: masterIds } },
      orderBy: { HouseNumber: 'asc' },
    });
  }

  async count(): Promise<number> {
    return prisma.blHouse.count();
  }

  private async buildWhere(
    filters: BlHouseListFilters,
  ): Promise<Prisma.BlHouseWhereInput | undefined> {
    const conditions: Prisma.BlHouseWhereInput[] = [];

    if (filters.masterId) {
      conditions.push({ BLMasterId: filters.masterId });
    }

    if (filters.masterNumber && filters.blVersion) {
      const master = await prisma.blMaster.findUnique({
        where: {
          MasterNumber_BlVersion: {
            MasterNumber: filters.masterNumber,
            BlVersion: filters.blVersion,
          },
        },
        select: { Id: true },
      });

      if (master) {
        conditions.push({ BLMasterId: master.Id });
      } else {
        conditions.push({ Id: -1 });
      }
    }

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
          { HouseNumber: { contains: filters.search } },
          { ItemName: { contains: filters.search } },
        ],
      });
    }

    if (conditions.length === 0) {
      return undefined;
    }

    return { AND: conditions };
  }
}

export const blHouseRepository = new BlHouseRepository();
