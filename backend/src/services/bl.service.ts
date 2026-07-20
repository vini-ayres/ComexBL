import type { BlHouse, BlMaster, Prisma } from '@prisma/client';
import { BL_VERSION, isBlVersion, type BlVersion } from '../constants/bl-version.constants.js';
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../errors/AppError.js';
import {
  mapBlHouseDetail,
  mapBlHouseSummary,
  mapBlMasterDetail,
  mapBlMasterSummary,
} from '../mappers/bl.mapper.js';
import {
  BlHouseRepository,
  type BlHouseListFilters,
} from '../repositories/bl-house.repository.js';
import {
  BlMasterRepository,
  type BlMasterListFilters,
} from '../repositories/bl-master.repository.js';
import type {
  BlHouseWithRelations,
  BlMasterWithHouses,
  BlVersionPair,
} from '../types/bl-domain.types.js';
import type {
  BlHouseDetailDto,
  BlHouseSummaryDto,
  BlMasterDetailDto,
  BlMasterSummaryDto,
  PaginatedResult,
  PaginationQuery,
} from '../types/bl.types.js';
import { buildPaginatedResult } from '../utils/pagination.js';
import { RelationshipValidator } from '../validators/relationship-validator.js';

export class BlService {
  constructor(
    private readonly masterRepository: BlMasterRepository,
    private readonly houseRepository: BlHouseRepository,
    private readonly relationshipValidator: RelationshipValidator,
  ) {}

  // ---------------------------------------------------------------------------
  // Consultas legadas (REST — Sprint futura manterá controllers existentes)
  // ---------------------------------------------------------------------------

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

  // ---------------------------------------------------------------------------
  // Sprint 2 — localização por MasterNumber/HouseNumber + BlVersion
  // ---------------------------------------------------------------------------

  async locateMasterDraft(masterNumber: string): Promise<BlMaster | null> {
    return this.masterRepository.findDraftByMasterNumber(masterNumber);
  }

  async locateMasterFinal(masterNumber: string): Promise<BlMaster | null> {
    return this.masterRepository.findFinalByMasterNumber(masterNumber);
  }

  async locateMasterByVersion(
    masterNumber: string,
    blVersion: BlVersion,
  ): Promise<BlMaster | null> {
    this.assertBlVersion(blVersion);
    return this.masterRepository.findByMasterNumberAndVersion(
      masterNumber,
      blVersion,
    );
  }

  async locateMasterWithHouses(
    masterNumber: string,
    blVersion: BlVersion,
  ): Promise<BlMasterWithHouses | null> {
    this.assertBlVersion(blVersion);
    return this.masterRepository.findWithHousesByMasterNumberAndVersion(
      masterNumber,
      blVersion,
    );
  }

  async locateMasterVersionPair(
    masterNumber: string,
  ): Promise<BlVersionPair<BlMasterWithHouses>> {
    const [draft, finalVersion] = await Promise.all([
      this.locateMasterWithHouses(masterNumber, BL_VERSION.DRAFT),
      this.locateMasterWithHouses(masterNumber, BL_VERSION.FINAL),
    ]);

    return { draft, final: finalVersion };
  }

  async locateHouseDraft(houseNumber: string): Promise<BlHouse | null> {
    return this.houseRepository.findDraftByHouseNumber(houseNumber);
  }

  async locateHouseFinal(houseNumber: string): Promise<BlHouse | null> {
    return this.houseRepository.findFinalByHouseNumber(houseNumber);
  }

  async locateHouseByVersion(
    houseNumber: string,
    blVersion: BlVersion,
  ): Promise<BlHouse | null> {
    this.assertBlVersion(blVersion);
    return this.houseRepository.findByHouseNumberAndVersion(
      houseNumber,
      blVersion,
    );
  }

  async locateHouseWithRelations(
    houseNumber: string,
    blVersion: BlVersion,
  ): Promise<BlHouseWithRelations | null> {
    this.assertBlVersion(blVersion);
    return this.houseRepository.findWithRelationsByHouseNumberAndVersion(
      houseNumber,
      blVersion,
    );
  }

  async locateHouseVersionPair(
    houseNumber: string,
  ): Promise<BlVersionPair<BlHouseWithRelations>> {
    const [draft, finalVersion] = await Promise.all([
      this.locateHouseWithRelations(houseNumber, BL_VERSION.DRAFT),
      this.locateHouseWithRelations(houseNumber, BL_VERSION.FINAL),
    ]);

    return { draft, final: finalVersion };
  }

  async locateHousesByMasterAndVersion(
    masterNumber: string,
    blVersion: BlVersion,
  ): Promise<BlHouse[]> {
    this.assertBlVersion(blVersion);
    const master = await this.locateMasterByVersion(masterNumber, blVersion);

    if (!master) {
      throw new NotFoundError(
        `Master ${masterNumber} (${blVersion}) não encontrado`,
      );
    }

    return this.houseRepository.findByMasterIdAndVersion(master.Id, blVersion);
  }

  // ---------------------------------------------------------------------------
  // Sprint 2 — criação DRAFT / FINAL (estrutura preparada; integração futura)
  // ---------------------------------------------------------------------------

  async createMasterDraft(
    data: Omit<Prisma.BlMasterCreateInput, 'BlVersion'>,
  ): Promise<BlMaster> {
    return this.createMaster(BL_VERSION.DRAFT, data);
  }

  async createMasterFinal(
    data: Omit<Prisma.BlMasterCreateInput, 'BlVersion'>,
  ): Promise<BlMaster> {
    return this.createMaster(BL_VERSION.FINAL, data);
  }

  async createHouseDraft(
    data: Omit<Prisma.BlHouseCreateInput, 'BlVersion'>,
  ): Promise<BlHouse> {
    return this.createHouse(BL_VERSION.DRAFT, data);
  }

  async createHouseFinal(
    data: Omit<Prisma.BlHouseCreateInput, 'BlVersion'>,
  ): Promise<BlHouse> {
    return this.createHouse(BL_VERSION.FINAL, data);
  }

  async validateMasterHouseRelationship(
    masterNumber: string,
    houseNumber: string,
    blVersion: BlVersion,
  ) {
    const master = await this.locateMasterByVersion(masterNumber, blVersion);
    const house = await this.locateHouseByVersion(houseNumber, blVersion);

    if (!master) {
      throw new NotFoundError(
        `Master ${masterNumber} (${blVersion}) não encontrado`,
      );
    }

    if (!house) {
      throw new NotFoundError(
        `House ${houseNumber} (${blVersion}) não encontrado`,
      );
    }

    return this.relationshipValidator.validateMasterHouse(master, house);
  }

  async validateConsolidation(masterNumber: string, blVersion: BlVersion) {
    const consolidation = await this.locateMasterWithHouses(
      masterNumber,
      blVersion,
    );

    if (!consolidation) {
      throw new NotFoundError(
        `Master ${masterNumber} (${blVersion}) não encontrado`,
      );
    }

    return this.relationshipValidator.validateConsolidation(
      consolidation.master,
      consolidation.houses,
    );
  }

  private async createMaster(
    blVersion: BlVersion,
    data: Omit<Prisma.BlMasterCreateInput, 'BlVersion'>,
  ): Promise<BlMaster> {
    this.assertBlVersion(blVersion);

    const masterNumber = this.extractMasterNumber(data);
    const existing = await this.masterRepository.findByMasterNumberAndVersion(
      masterNumber,
      blVersion,
    );

    if (existing) {
      throw new ConflictError(
        `Master ${masterNumber} (${blVersion}) já existe`,
      );
    }

    return this.masterRepository.create({
      ...data,
      BlVersion: blVersion,
    });
  }

  private async createHouse(
    blVersion: BlVersion,
    data: Omit<Prisma.BlHouseCreateInput, 'BlVersion'>,
  ): Promise<BlHouse> {
    this.assertBlVersion(blVersion);

    const houseNumber = this.extractHouseNumber(data);
    const existing = await this.houseRepository.findByHouseNumberAndVersion(
      houseNumber,
      blVersion,
    );

    if (existing) {
      throw new ConflictError(
        `House ${houseNumber} (${blVersion}) já existe`,
      );
    }

    if (data.master?.connect?.Id != null) {
      const masterResult = await this.masterRepository.findById(
        data.master.connect.Id,
      );

      if (masterResult) {
        const provisionalHouse = {
          Id: 0,
          BLMasterId: data.master.connect.Id,
          HouseNumber: houseNumber,
          BlVersion: blVersion,
          ContainerNumber:
            typeof data.ContainerNumber === 'string'
              ? data.ContainerNumber
              : null,
        } as BlHouse;

        const validation = this.relationshipValidator.validateMasterHouse(
          masterResult.master,
          provisionalHouse,
        );

        if (!validation.valid) {
          throw new ValidationError(
            'Associação Master/House inválida',
            validation.issues,
          );
        }
      }
    }

    return this.houseRepository.create({
      ...data,
      BlVersion: blVersion,
    });
  }

  private extractMasterNumber(
    data: Omit<Prisma.BlMasterCreateInput, 'BlVersion'>,
  ): string {
    if (typeof data.MasterNumber !== 'string' || !data.MasterNumber.trim()) {
      throw new BadRequestError('MasterNumber é obrigatório para criar Master');
    }

    return data.MasterNumber.trim();
  }

  private extractHouseNumber(
    data: Omit<Prisma.BlHouseCreateInput, 'BlVersion'>,
  ): string {
    if (typeof data.HouseNumber !== 'string' || !data.HouseNumber.trim()) {
      throw new BadRequestError('HouseNumber é obrigatório para criar House');
    }

    return data.HouseNumber.trim();
  }

  private assertBlVersion(blVersion: string): asserts blVersion is BlVersion {
    if (!isBlVersion(blVersion)) {
      throw new BadRequestError(
        `BlVersion inválido: ${blVersion}. Use DRAFT ou FINAL`,
      );
    }
  }
}
