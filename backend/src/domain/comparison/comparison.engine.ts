import type { CanonicalHouseBl } from '../canonical/canonical-house-bl.js';
import type { CanonicalMasterBl } from '../canonical/canonical-master-bl.js';
import type {
  CanonicalCargo,
  CanonicalContainer,
  CanonicalNcm,
  CanonicalParty,
  CanonicalPort,
} from '../canonical/canonical-shared.types.js';
import {
  ComparisonCategory,
  ComparisonDifferenceReason,
  ComparisonSeverity,
  type ComparisonDifference,
  type ComparisonResult,
} from './comparison.types.js';

interface ScalarFieldSpec {
  path: string;
  field: string;
  category: ComparisonCategory;
  read: (document: CanonicalMasterBl | CanonicalHouseBl) => string | number | null;
}

interface PortFieldSpec {
  pathPrefix: string;
  read: (document: CanonicalMasterBl | CanonicalHouseBl) => CanonicalPort;
}

interface PartyFieldSpec {
  pathPrefix: string;
  read: (document: CanonicalMasterBl | CanonicalHouseBl) => CanonicalParty;
}

const MASTER_SCALAR_FIELDS: readonly ScalarFieldSpec[] = [
  {
    path: 'masterNumber',
    field: 'MasterNumber',
    category: ComparisonCategory.MASTER,
    read: (document) => (document as CanonicalMasterBl).masterNumber,
  },
  {
    path: 'referenceNumber',
    field: 'ReferenceNumber',
    category: ComparisonCategory.GENERAL,
    read: (document) => (document as CanonicalMasterBl).referenceNumber,
  },
  {
    path: 'blTypeExportImport',
    field: 'BlTypeExportImport',
    category: ComparisonCategory.GENERAL,
    read: (document) => (document as CanonicalMasterBl).blTypeExportImport,
  },
  {
    path: 'vesselName',
    field: 'VesselName',
    category: ComparisonCategory.GENERAL,
    read: (document) => (document as CanonicalMasterBl).vesselName,
  },
  {
    path: 'voyage',
    field: 'Voyage',
    category: ComparisonCategory.GENERAL,
    read: (document) => (document as CanonicalMasterBl).voyage,
  },
  {
    path: 'onboardDate',
    field: 'OnboardDate',
    category: ComparisonCategory.GENERAL,
    read: (document) => (document as CanonicalMasterBl).onboardDate,
  },
  {
    path: 'arrivalDate',
    field: 'ArrivalDate',
    category: ComparisonCategory.GENERAL,
    read: (document) => (document as CanonicalMasterBl).arrivalDate,
  },
  {
    path: 'hblCount',
    field: 'HblCount',
    category: ComparisonCategory.GENERAL,
    read: (document) => (document as CanonicalMasterBl).hblCount,
  },
  {
    path: 'carrierScacCode',
    field: 'CarrierScacCode',
    category: ComparisonCategory.GENERAL,
    read: (document) => (document as CanonicalMasterBl).carrierScacCode,
  },
  {
    path: 'carrierName',
    field: 'CarrierName',
    category: ComparisonCategory.GENERAL,
    read: (document) => (document as CanonicalMasterBl).carrierName,
  },
  {
    path: 'cargoTypeLclFclBulk',
    field: 'CargoTypeLclFclBulk',
    category: ComparisonCategory.GENERAL,
    read: (document) => (document as CanonicalMasterBl).cargoTypeLclFclBulk,
  },
  {
    path: 'loadType',
    field: 'LoadType',
    category: ComparisonCategory.GENERAL,
    read: (document) => (document as CanonicalMasterBl).loadType,
  },
  {
    path: 'serviceTerm',
    field: 'ServiceTerm',
    category: ComparisonCategory.GENERAL,
    read: (document) => (document as CanonicalMasterBl).serviceTerm,
  },
  {
    path: 'freightTerm',
    field: 'FreightTerm',
    category: ComparisonCategory.GENERAL,
    read: (document) => (document as CanonicalMasterBl).freightTerm,
  },
  {
    path: 'packingQuantity',
    field: 'PackingQuantity',
    category: ComparisonCategory.GENERAL,
    read: (document) => (document as CanonicalMasterBl).packingQuantity,
  },
  {
    path: 'packingQuantityUnitCode',
    field: 'PackingQuantityUnitCode',
    category: ComparisonCategory.GENERAL,
    read: (document) => (document as CanonicalMasterBl).packingQuantityUnitCode,
  },
  {
    path: 'grossWeight',
    field: 'GrossWeight',
    category: ComparisonCategory.GENERAL,
    read: (document) => (document as CanonicalMasterBl).grossWeight,
  },
  {
    path: 'volumeMeasure',
    field: 'VolumeMeasure',
    category: ComparisonCategory.GENERAL,
    read: (document) => (document as CanonicalMasterBl).volumeMeasure,
  },
];

const MASTER_PARTY_FIELDS: readonly PartyFieldSpec[] = [
  {
    pathPrefix: 'shipper',
    read: (document) => (document as CanonicalMasterBl).shipper,
  },
  {
    pathPrefix: 'consignee',
    read: (document) => (document as CanonicalMasterBl).consignee,
  },
  {
    pathPrefix: 'notify',
    read: (document) => (document as CanonicalMasterBl).notify,
  },
];

const MASTER_PORT_FIELDS: readonly PortFieldSpec[] = [
  {
    pathPrefix: 'loadingPort',
    read: (document) => (document as CanonicalMasterBl).loadingPort,
  },
  {
    pathPrefix: 'dischargePort',
    read: (document) => (document as CanonicalMasterBl).dischargePort,
  },
  {
    pathPrefix: 'deliveryPort',
    read: (document) => (document as CanonicalMasterBl).deliveryPort,
  },
  {
    pathPrefix: 'finalDestinationPort',
    read: (document) => (document as CanonicalMasterBl).finalDestinationPort,
  },
];

const HOUSE_SCALAR_FIELDS: readonly ScalarFieldSpec[] = [
  {
    path: 'houseNumber',
    field: 'HouseNumber',
    category: ComparisonCategory.HOUSE,
    read: (document) => (document as CanonicalHouseBl).houseNumber,
  },
  {
    path: 'blCargoTypeExIm',
    field: 'BlCargoTypeExIm',
    category: ComparisonCategory.GENERAL,
    read: (document) => (document as CanonicalHouseBl).blCargoTypeExIm,
  },
  {
    path: 'originalBlMethodCode',
    field: 'OriginalBlMethodCode',
    category: ComparisonCategory.GENERAL,
    read: (document) => (document as CanonicalHouseBl).originalBlMethodCode,
  },
  {
    path: 'serviceTerm',
    field: 'ServiceTerm',
    category: ComparisonCategory.GENERAL,
    read: (document) => (document as CanonicalHouseBl).serviceTerm,
  },
  {
    path: 'freightTerm',
    field: 'FreightTerm',
    category: ComparisonCategory.GENERAL,
    read: (document) => (document as CanonicalHouseBl).freightTerm,
  },
  {
    path: 'packingQuantity',
    field: 'PackingQuantity',
    category: ComparisonCategory.GENERAL,
    read: (document) => (document as CanonicalHouseBl).packingQuantity,
  },
  {
    path: 'packingQuantityUnitCode',
    field: 'PackingQuantityUnitCode',
    category: ComparisonCategory.GENERAL,
    read: (document) => (document as CanonicalHouseBl).packingQuantityUnitCode,
  },
  {
    path: 'grossWeight',
    field: 'GrossWeight',
    category: ComparisonCategory.GENERAL,
    read: (document) => (document as CanonicalHouseBl).grossWeight,
  },
  {
    path: 'volumeMeasure',
    field: 'VolumeMeasure',
    category: ComparisonCategory.GENERAL,
    read: (document) => (document as CanonicalHouseBl).volumeMeasure,
  },
  {
    path: 'issueDate',
    field: 'IssueDate',
    category: ComparisonCategory.GENERAL,
    read: (document) => (document as CanonicalHouseBl).issueDate,
  },
  {
    path: 'itemName',
    field: 'ItemName',
    category: ComparisonCategory.GENERAL,
    read: (document) => (document as CanonicalHouseBl).itemName,
  },
];

const HOUSE_PARTY_FIELDS: readonly PartyFieldSpec[] = [
  {
    pathPrefix: 'shipper',
    read: (document) => (document as CanonicalHouseBl).shipper,
  },
  {
    pathPrefix: 'consignee',
    read: (document) => (document as CanonicalHouseBl).consignee,
  },
  {
    pathPrefix: 'notify',
    read: (document) => (document as CanonicalHouseBl).notify,
  },
];

const HOUSE_PORT_FIELDS: readonly PortFieldSpec[] = [
  {
    pathPrefix: 'receiptPort',
    read: (document) => (document as CanonicalHouseBl).receiptPort,
  },
  {
    pathPrefix: 'loadingPort',
    read: (document) => (document as CanonicalHouseBl).loadingPort,
  },
  {
    pathPrefix: 'dischargePort',
    read: (document) => (document as CanonicalHouseBl).dischargePort,
  },
  {
    pathPrefix: 'deliveryPort',
    read: (document) => (document as CanonicalHouseBl).deliveryPort,
  },
];

const CONTAINER_FIELDS: readonly {
  pathSuffix: string;
  field: string;
  read: (container: CanonicalContainer) => string | number | null;
}[] = [
  {
    pathSuffix: 'number',
    field: 'ContainerNumber',
    read: (container) => container.number,
  },
  {
    pathSuffix: 'type',
    field: 'ContainerType',
    read: (container) => container.type,
  },
  {
    pathSuffix: 'seal1',
    field: 'SealNo1',
    read: (container) => container.sealNo1,
  },
  {
    pathSuffix: 'seal2',
    field: 'SealNo2',
    read: (container) => container.sealNo2,
  },
  {
    pathSuffix: 'quantity',
    field: 'Quantity',
    read: (container) => container.quantity,
  },
  {
    pathSuffix: 'unitCode',
    field: 'UnitCode',
    read: (container) => container.unitCode,
  },
  {
    pathSuffix: 'grossWeight',
    field: 'GrossWeight',
    read: (container) => container.grossWeight,
  },
  {
    pathSuffix: 'cbm',
    field: 'CBM',
    read: (container) => container.volume,
  },
];

const CARGO_FIELDS: readonly {
  pathSuffix: string;
  field: string;
  read: (cargo: CanonicalCargo) => string | number | null;
}[] = [
  { pathSuffix: 'brand', field: 'Brand', read: (cargo) => cargo.brand },
  {
    pathSuffix: 'counterMark',
    field: 'CounterMark',
    read: (cargo) => cargo.counterMark,
  },
  {
    pathSuffix: 'cargoType',
    field: 'CargoType',
    read: (cargo) => cargo.cargoType,
  },
  {
    pathSuffix: 'hazardClass',
    field: 'HazardClass',
    read: (cargo) => cargo.hazardClass,
  },
  { pathSuffix: 'unNumber', field: 'UNNumber', read: (cargo) => cargo.unNumber },
  {
    pathSuffix: 'packaging',
    field: 'Packaging',
    read: (cargo) => cargo.packaging,
  },
];

function buildResult(differences: ComparisonDifference[]): ComparisonResult {
  return {
    equal: differences.length === 0,
    differenceCount: differences.length,
    differences,
  };
}

function resolveDifferenceReason(
  localValue: string | number | null,
  globalSysValue: string | number | null,
): ComparisonDifferenceReason {
  if (localValue === null && globalSysValue !== null) {
    return ComparisonDifferenceReason.MISSING_LOCAL;
  }

  if (localValue !== null && globalSysValue === null) {
    return ComparisonDifferenceReason.MISSING_GLOBAL;
  }

  return ComparisonDifferenceReason.VALUE_MISMATCH;
}

function compareScalar(
  path: string,
  field: string,
  category: ComparisonCategory,
  localValue: string | number | null,
  globalSysValue: string | number | null,
  differences: ComparisonDifference[],
): void {
  if (localValue === globalSysValue) {
    return;
  }

  differences.push({
    path,
    field,
    category,
    severity: ComparisonSeverity.WARNING,
    reason: resolveDifferenceReason(localValue, globalSysValue),
    localValue,
    globalSysValue,
  });
}

function compareParty(
  pathPrefix: string,
  local: CanonicalParty,
  globalSys: CanonicalParty,
  differences: ComparisonDifference[],
): void {
  compareScalar(
    `${pathPrefix}.name`,
    'Name',
    ComparisonCategory.PARTY,
    local.name,
    globalSys.name,
    differences,
  );
  compareScalar(
    `${pathPrefix}.address`,
    'Address',
    ComparisonCategory.PARTY,
    local.address,
    globalSys.address,
    differences,
  );
}

function comparePort(
  pathPrefix: string,
  local: CanonicalPort,
  globalSys: CanonicalPort,
  differences: ComparisonDifference[],
): void {
  compareScalar(
    `${pathPrefix}.code`,
    'Code',
    ComparisonCategory.PORT,
    local.code,
    globalSys.code,
    differences,
  );
  compareScalar(
    `${pathPrefix}.name`,
    'Name',
    ComparisonCategory.PORT,
    local.name,
    globalSys.name,
    differences,
  );
}

function compareContainer(
  local: CanonicalContainer,
  globalSys: CanonicalContainer,
  differences: ComparisonDifference[],
): void {
  for (const spec of CONTAINER_FIELDS) {
    compareScalar(
      `container.${spec.pathSuffix}`,
      spec.field,
      ComparisonCategory.CONTAINER,
      spec.read(local),
      spec.read(globalSys),
      differences,
    );
  }
}

function compareCargoCollections(
  local: CanonicalCargo[],
  globalSys: CanonicalCargo[],
  differences: ComparisonDifference[],
): void {
  const itemCount = Math.max(local.length, globalSys.length);

  for (let index = 0; index < itemCount; index += 1) {
    const localCargo = local[index] ?? null;
    const globalSysCargo = globalSys[index] ?? null;

    for (const spec of CARGO_FIELDS) {
      compareScalar(
        `cargo[${index}].${spec.pathSuffix}`,
        spec.field,
        ComparisonCategory.CARGO,
        localCargo ? spec.read(localCargo) : null,
        globalSysCargo ? spec.read(globalSysCargo) : null,
        differences,
      );
    }
  }
}

function compareNcmCollections(
  local: CanonicalNcm[],
  globalSys: CanonicalNcm[],
  differences: ComparisonDifference[],
): void {
  const itemCount = Math.max(local.length, globalSys.length);

  for (let index = 0; index < itemCount; index += 1) {
    const localNcm = local[index] ?? null;
    const globalSysNcm = globalSys[index] ?? null;

    compareScalar(
      `ncm[${index}].code`,
      'Code',
      ComparisonCategory.NCM,
      localNcm?.code ?? null,
      globalSysNcm?.code ?? null,
      differences,
    );
  }
}

export class ComparisonEngine {
  compareMaster(
    local: CanonicalMasterBl,
    globalSys: CanonicalMasterBl,
  ): ComparisonResult {
    const differences: ComparisonDifference[] = [];

    for (const spec of MASTER_SCALAR_FIELDS) {
      compareScalar(
        spec.path,
        spec.field,
        spec.category,
        spec.read(local),
        spec.read(globalSys),
        differences,
      );
    }

    for (const spec of MASTER_PARTY_FIELDS) {
      compareParty(spec.pathPrefix, spec.read(local), spec.read(globalSys), differences);
    }

    for (const spec of MASTER_PORT_FIELDS) {
      comparePort(spec.pathPrefix, spec.read(local), spec.read(globalSys), differences);
    }

    compareContainer(local.container, globalSys.container, differences);

    return buildResult(differences);
  }

  compareHouse(
    local: CanonicalHouseBl,
    globalSys: CanonicalHouseBl,
  ): ComparisonResult {
    const differences: ComparisonDifference[] = [];

    for (const spec of HOUSE_SCALAR_FIELDS) {
      compareScalar(
        spec.path,
        spec.field,
        spec.category,
        spec.read(local),
        spec.read(globalSys),
        differences,
      );
    }

    for (const spec of HOUSE_PARTY_FIELDS) {
      compareParty(spec.pathPrefix, spec.read(local), spec.read(globalSys), differences);
    }

    for (const spec of HOUSE_PORT_FIELDS) {
      comparePort(spec.pathPrefix, spec.read(local), spec.read(globalSys), differences);
    }

    compareContainer(local.container, globalSys.container, differences);
    compareCargoCollections(local.cargo, globalSys.cargo, differences);
    compareNcmCollections(local.ncm, globalSys.ncm, differences);

    return buildResult(differences);
  }
}

export const comparisonEngine = new ComparisonEngine();
