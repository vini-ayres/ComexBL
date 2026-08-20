import type { BlHouse, BlMaster } from '@prisma/client';
import { BL_VERSION } from '../constants/bl-version.constants.js';
import type {
  RelationshipValidationIssue,
  RelationshipValidationResult,
} from '../types/bl-domain.types.js';

function normalize(value: string | null | undefined): string | null {
  if (value == null) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function valuesMatch(
  left: string | null | undefined,
  right: string | null | undefined,
): boolean {
  return normalize(left) === normalize(right);
}

export class RelationshipValidator {
  validateMasterHouseAssociation(
    master: BlMaster,
    house: BlHouse,
  ): RelationshipValidationIssue[] {
    const issues: RelationshipValidationIssue[] = [];

    if (house.BLMasterId == null) {
      issues.push({
        code: 'HOUSE_WITHOUT_MASTER_FK',
        message: `House ${house.HouseNumber} (${house.BlVersion}) não possui BLMasterId`,
        field: 'BLMasterId',
      });
      return issues;
    }

    if (house.BLMasterId !== master.Id) {
      issues.push({
        code: 'HOUSE_MASTER_FK_MISMATCH',
        message: `House ${house.HouseNumber} referencia Master Id ${house.BLMasterId}, esperado ${master.Id}`,
        field: 'BLMasterId',
      });
    }

    return issues;
  }

  validateBlVersion(master: BlMaster, house: BlHouse): RelationshipValidationIssue[] {
    const issues: RelationshipValidationIssue[] = [];

    if (master.BlVersion !== house.BlVersion) {
      issues.push({
        code: 'BL_VERSION_MISMATCH',
        message: `House ${house.BlVersion} não pode estar associado a Master ${master.BlVersion}`,
        field: 'BlVersion',
      });
    }

    if (
      master.BlVersion === BL_VERSION.DRAFT &&
      house.BlVersion === BL_VERSION.FINAL
    ) {
      issues.push({
        code: 'DRAFT_FINAL_CROSS_VERSION',
        message: 'Proibido: House FINAL associado a Master DRAFT',
        field: 'BlVersion',
      });
    }

    if (
      master.BlVersion === BL_VERSION.FINAL &&
      house.BlVersion === BL_VERSION.DRAFT
    ) {
      issues.push({
        code: 'FINAL_DRAFT_CROSS_VERSION',
        message: 'Proibido: House DRAFT associado a Master FINAL',
        field: 'BlVersion',
      });
    }

    return issues;
  }

  validateContainerNumber(
    master: BlMaster,
    house: BlHouse,
  ): RelationshipValidationIssue[] {
    const masterContainer = normalize(master.ContainerNumber);
    const houseContainer = normalize(house.ContainerNumber);

    if (masterContainer == null && houseContainer == null) {
      return [];
    }

    if (!valuesMatch(masterContainer, houseContainer)) {
      return [
        {
          code: 'CONTAINER_NUMBER_MISMATCH',
          message: `ContainerNumber do House (${houseContainer ?? 'vazio'}) difere do Master (${masterContainer ?? 'vazio'})`,
          field: 'ContainerNumber',
        },
      ];
    }

    return [];
  }

  validateDocumentConsistency(
    _master: BlMaster,
    houses: BlHouse[],
  ): RelationshipValidationIssue[] {
    const issues: RelationshipValidationIssue[] = [];

    const houseNumbers = new Set<string>();
    for (const house of houses) {
      if (houseNumbers.has(house.HouseNumber)) {
        issues.push({
          code: 'DUPLICATE_HOUSE_NUMBER',
          message: `HouseNumber duplicado na consolidação: ${house.HouseNumber}`,
          field: 'HouseNumber',
        });
      }
      houseNumbers.add(house.HouseNumber);
    }

    return issues;
  }

  validateMasterHouse(
    master: BlMaster,
    house: BlHouse,
  ): RelationshipValidationResult {
    const issues = [
      ...this.validateMasterHouseAssociation(master, house),
      ...this.validateBlVersion(master, house),
      ...this.validateContainerNumber(master, house),
    ];

    return { valid: issues.length === 0, issues };
  }

  validateConsolidation(
    master: BlMaster,
    houses: BlHouse[],
  ): RelationshipValidationResult {
    const issues: RelationshipValidationIssue[] = [
      ...this.validateDocumentConsistency(master, houses),
    ];

    for (const house of houses) {
      const houseValidation = this.validateMasterHouse(master, house);
      issues.push(...houseValidation.issues);
    }

    return { valid: issues.length === 0, issues };
  }
}

export const relationshipValidator = new RelationshipValidator();
