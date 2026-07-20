import { BL_VERSION, type BlVersion } from '../constants/bl-version.constants.js';
import { NotFoundError } from '../errors/AppError.js';
import { mapBlFinalHouseDto, mapBlFinalResponse } from '../mappers/bl-final.mapper.js';
import { ApoioHumanoRepository } from '../repositories/apoio-humano.repository.js';
import { BlHouseRepository } from '../repositories/bl-house.repository.js';
import { BlMasterRepository } from '../repositories/bl-master.repository.js';
import type { BlFinalHouseDto, BlFinalResponseDto } from '../types/bl-final.types.js';

export class BlFinalService {
  constructor(
    private readonly masterRepository: BlMasterRepository,
    private readonly houseRepository: BlHouseRepository,
    private readonly apoioHumanoRepository: ApoioHumanoRepository,
  ) {}

  async getMasterBlFinal(
    masterNumber: string,
    blVersion: BlVersion = BL_VERSION.FINAL,
  ): Promise<BlFinalResponseDto> {
    const consolidation =
      await this.masterRepository.findWithHousesByMasterNumberAndVersion(
        masterNumber,
        blVersion,
      );

    if (!consolidation) {
      throw new NotFoundError(
        `Master ${masterNumber} (${blVersion}) não encontrado`,
      );
    }

    const [masterRevisoes, houseRevisoes] = await Promise.all([
      this.apoioHumanoRepository.findRevisoesByMasterIds([consolidation.master.Id]),
      this.apoioHumanoRepository.findRevisoesByHouseIds(
        consolidation.houses.map((house) => house.Id),
      ),
    ]);

    const housesWithRelations = await Promise.all(
      consolidation.houses.map((house) =>
        this.houseRepository.findWithRelationsByHouseNumberAndVersion(
          house.HouseNumber,
          blVersion,
        ),
      ),
    );

    const houseRevisoesByHouseId = new Map<number, typeof houseRevisoes>();
    for (const revisao of houseRevisoes) {
      if (revisao.BlHouseId == null) {
        continue;
      }

      const current = houseRevisoesByHouseId.get(revisao.BlHouseId) ?? [];
      current.push(revisao);
      houseRevisoesByHouseId.set(revisao.BlHouseId, current);
    }

    return mapBlFinalResponse({
      masterNumber,
      blVersion,
      master: consolidation.master,
      houses: housesWithRelations.filter(
        (item): item is NonNullable<typeof item> => item != null,
      ),
      masterRevisoes,
      houseRevisoesByHouseId,
    });
  }

  async getConsolidatedHouse(
    houseNumber: string,
    blVersion: BlVersion = BL_VERSION.FINAL,
  ): Promise<BlFinalHouseDto> {
    const relations =
      await this.houseRepository.findWithRelationsByHouseNumberAndVersion(
        houseNumber,
        blVersion,
      );

    if (!relations) {
      throw new NotFoundError(
        `House ${houseNumber} (${blVersion}) não encontrado`,
      );
    }

    const houseRevisoes = await this.apoioHumanoRepository.findRevisoesByHouseIds(
      [relations.house.Id],
    );

    return mapBlFinalHouseDto(relations, houseRevisoes);
  }

  async getHouseBlFinal(
    houseNumber: string,
    blVersion: BlVersion = BL_VERSION.FINAL,
  ): Promise<BlFinalResponseDto> {
    const relations =
      await this.houseRepository.findWithRelationsByHouseNumberAndVersion(
        houseNumber,
        blVersion,
      );

    if (!relations) {
      throw new NotFoundError(
        `House ${houseNumber} (${blVersion}) não encontrado`,
      );
    }

    let master = relations.master;

    if (!master && relations.house.BLMasterId != null) {
      const masterRecord = await this.masterRepository.findById(
        relations.house.BLMasterId,
      );
      master = masterRecord?.master ?? null;
    }

    if (!master) {
      throw new NotFoundError(
        `Master vinculado ao House ${houseNumber} (${blVersion}) não encontrado`,
      );
    }

    const masterNumber = master.MasterNumber;

    const [masterRevisoes, houseRevisoes] = await Promise.all([
      this.apoioHumanoRepository.findRevisoesByMasterIds([master.Id]),
      this.apoioHumanoRepository.findRevisoesByHouseIds([relations.house.Id]),
    ]);

    const houseRevisoesByHouseId = new Map<number, typeof houseRevisoes>([
      [relations.house.Id, houseRevisoes],
    ]);

    return mapBlFinalResponse({
      masterNumber,
      blVersion,
      master,
      houses: [relations],
      masterRevisoes,
      houseRevisoesByHouseId,
    });
  }
}
