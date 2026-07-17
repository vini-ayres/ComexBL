import { NotFoundError } from '../errors/AppError.js';
import {
  mapBlHouseDetail,
  mapBlHouseSummary,
  mapBlMasterDetail,
  mapBlMasterSummary,
} from '../mappers/bl.mapper.js';
import {
  BlHouseRepository,
  BlMasterRepository,
  type BlHouseListFilters,
  type BlMasterListFilters,
} from '../repositories/bl.repository.js';
import type {
  BlHouseDetailDto,
  BlHouseSummaryDto,
  BlMasterDetailDto,
  BlMasterSummaryDto,
  PaginatedResult,
  PaginationQuery,
} from '../types/bl.types.js';
import { buildPaginatedResult } from '../utils/pagination.js';

export class BlService {
  constructor(
    private readonly masterRepository: BlMasterRepository,
    private readonly houseRepository: BlHouseRepository,
  ) {}

  async listMasters(
    pagination: PaginationQuery,
    filters: BlMasterListFilters,
  ): Promise<PaginatedResult<BlMasterSummaryDto>> {
    const { items, total } = await this.masterRepository.findMany(
      pagination,
      filters,
    );

    return buildPaginatedResult(
      items.map(mapBlMasterSummary),
      total,
      pagination,
    );
  }

  async getMasterById(id: number): Promise<BlMasterDetailDto> {
    const result = await this.masterRepository.findById(id);

    if (!result) {
      throw new NotFoundError(`BL Master ${id} não encontrado`);
    }

    return mapBlMasterDetail(result);
  }

  async listHouses(
    pagination: PaginationQuery,
    filters: BlHouseListFilters,
  ): Promise<PaginatedResult<BlHouseSummaryDto>> {
    const { items, total } = await this.houseRepository.findMany(
      pagination,
      filters,
    );

    return buildPaginatedResult(
      items.map(mapBlHouseSummary),
      total,
      pagination,
    );
  }

  async getHouseById(id: number): Promise<BlHouseDetailDto> {
    const result = await this.houseRepository.findById(id);

    if (!result) {
      throw new NotFoundError(`BL House ${id} não encontrado`);
    }

    return mapBlHouseDetail(result);
  }

  async getDatabaseStats(): Promise<{ masters: number; houses: number }> {
    const [masters, houses] = await Promise.all([
      this.masterRepository.count(),
      this.houseRepository.count(),
    ]);

    return { masters, houses };
  }
}
