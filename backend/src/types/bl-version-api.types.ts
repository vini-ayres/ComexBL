import type { BlVersion } from '../constants/bl-version.constants.js';
import type {
  RelationshipValidationIssue,
} from './bl-domain.types.js';

export interface BlVersionDocumentSummaryDto {
  id: number;
  blVersion: BlVersion;
  masterNumber?: string;
  houseNumber?: string;
  containerNumber: string | null;
  referenceNumber?: string | null;
}

export interface BlVersionMasterDetailDto {
  master: BlVersionDocumentSummaryDto;
  houses: BlVersionDocumentSummaryDto[];
}

export interface BlVersionHouseDetailDto {
  house: BlVersionDocumentSummaryDto;
  master: BlVersionDocumentSummaryDto | null;
  cargoCount: number;
  ncmCount: number;
}

export interface BlVersionPairResponseDto<T> {
  draft: T | null;
  final: T | null;
}

export interface ConsolidationValidationResponseDto {
  masterNumber: string;
  blVersion: BlVersion;
  valid: boolean;
  issues: RelationshipValidationIssue[];
}

export interface MasterHouseValidationResponseDto {
  masterNumber: string;
  houseNumber: string;
  blVersion: BlVersion;
  valid: boolean;
  issues: RelationshipValidationIssue[];
}
