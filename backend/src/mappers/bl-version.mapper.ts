import type { BlHouse, BlMaster } from '@prisma/client';
import type {
  BlHouseWithRelations,
  BlMasterWithHouses,
  BlVersionPair,
  RelationshipValidationResult,
} from '../types/bl-domain.types.js';
import type {
  BlVersionHouseDetailDto,
  BlVersionMasterDetailDto,
  BlVersionPairResponseDto,
  ConsolidationValidationResponseDto,
  MasterHouseValidationResponseDto,
} from '../types/bl-version-api.types.js';

function mapMasterSummary(master: BlMaster) {
  return {
    id: master.Id,
    blVersion: master.BlVersion as 'DRAFT' | 'FINAL',
    masterNumber: master.MasterNumber,
    containerNumber: master.ContainerNumber,
    referenceNumber: master.ReferenceNumber,
  };
}

function mapHouseSummary(house: BlHouse) {
  return {
    id: house.Id,
    blVersion: house.BlVersion as 'DRAFT' | 'FINAL',
    houseNumber: house.HouseNumber,
    containerNumber: house.ContainerNumber,
  };
}

export function mapBlVersionMasterDetail(
  data: BlMasterWithHouses,
): BlVersionMasterDetailDto {
  return {
    master: mapMasterSummary(data.master),
    houses: data.houses.map(mapHouseSummary),
  };
}

export function mapBlVersionHouseDetail(
  data: BlHouseWithRelations,
): BlVersionHouseDetailDto {
  return {
    house: mapHouseSummary(data.house),
    master: data.master ? mapMasterSummary(data.master) : null,
    cargoCount: data.cargos.length,
    ncmCount: data.ncms.length,
  };
}

export function mapBlVersionPair<TInput, TOutput>(
  pair: BlVersionPair<TInput>,
  mapper: (value: TInput) => TOutput,
): BlVersionPairResponseDto<TOutput> {
  return {
    draft: pair.draft ? mapper(pair.draft) : null,
    final: pair.final ? mapper(pair.final) : null,
  };
}

export function mapConsolidationValidation(
  masterNumber: string,
  blVersion: 'DRAFT' | 'FINAL',
  result: RelationshipValidationResult,
): ConsolidationValidationResponseDto {
  return {
    masterNumber,
    blVersion,
    valid: result.valid,
    issues: result.issues,
  };
}

export function mapMasterHouseValidation(
  masterNumber: string,
  houseNumber: string,
  blVersion: 'DRAFT' | 'FINAL',
  result: RelationshipValidationResult,
): MasterHouseValidationResponseDto {
  return {
    masterNumber,
    houseNumber,
    blVersion,
    valid: result.valid,
    issues: result.issues,
  };
}
