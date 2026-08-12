import type { CanonicalHouseBl } from '../domain/canonical/canonical-house-bl.js';
import type { CanonicalMasterBl } from '../domain/canonical/canonical-master-bl.js';
import type {
  CanonicalCargo,
  CanonicalContainer,
  CanonicalNcm,
  CanonicalParty,
  CanonicalPort,
} from '../domain/canonical/canonical-shared.types.js';
import {
  emptyContainer,
  emptyParty,
  emptyPort,
} from '../domain/canonical/canonical-shared.types.js';
import { toCanonicalString } from '../domain/canonical/canonical-value.utils.js';
import type {
  GlobalSysCargoDto,
  GlobalSysHouseAggregateDto,
  GlobalSysHouseDto,
  GlobalSysMasterAggregateDto,
  GlobalSysMasterDto,
  GlobalSysNcmDto,
} from '../types/globalsys-comparacao.types.js';

function mapParty(name: string | null | undefined): CanonicalParty {
  return {
    name: toCanonicalString(name),
    address: null,
  };
}

function mapPort(
  code: string | null | undefined,
  name: string | null | undefined,
): CanonicalPort {
  return {
    code: toCanonicalString(code),
    name: toCanonicalString(name),
  };
}

function mapMasterContainer(
  containerNumber: string | null | undefined,
): CanonicalContainer {
  return {
    ...emptyContainer(),
    number: toCanonicalString(containerNumber),
  };
}

function mapHouseContainer(
  containerNumber: string | null | undefined,
): CanonicalContainer {
  return {
    ...emptyContainer(),
    number: toCanonicalString(containerNumber),
  };
}

function mapCargo(cargo: GlobalSysCargoDto): CanonicalCargo {
  return {
    brand: toCanonicalString(cargo.brand),
    counterMark: toCanonicalString(cargo.counterMark),
    cargoType: toCanonicalString(cargo.cargoType),
    hazardClass: toCanonicalString(cargo.hazardClass),
    unNumber: toCanonicalString(cargo.unNumber),
    packaging: toCanonicalString(cargo.packaging),
  };
}

function mapNcm(ncm: GlobalSysNcmDto): CanonicalNcm {
  return { code: toCanonicalString(ncm.ncmCode) };
}

function mapMasterDto(master: GlobalSysMasterDto): CanonicalMasterBl {
  return {
    masterNumber: master.numeroBl,
    referenceNumber: toCanonicalString(master.referenceNumber),
    blTypeExportImport: null,
    vesselName: toCanonicalString(master.vesselName),
    voyage: toCanonicalString(master.voyage),
    onboardDate: null,
    arrivalDate: null,
    hblCount: null,
    shipper: mapParty(master.shipperName),
    consignee: mapParty(master.consigneeName),
    notify: emptyParty(),
    carrierScacCode: null,
    carrierName: null,
    cargoTypeLclFclBulk: null,
    loadType: null,
    serviceTerm: null,
    freightTerm: null,
    loadingPort: mapPort(master.loadingPortCode, master.loadingPortName),
    dischargePort: mapPort(master.dischargePortCode, master.dischargePortName),
    deliveryPort: emptyPort(),
    finalDestinationPort: emptyPort(),
    container: mapMasterContainer(master.containerNumber),
    packingQuantity: null,
    packingQuantityUnitCode: null,
    grossWeight: toCanonicalString(master.grossWeight),
    volumeMeasure: toCanonicalString(master.volumeMeasure),
  };
}

function mapHouseDto(
  house: GlobalSysHouseDto,
  cargo: GlobalSysCargoDto[],
  ncm: GlobalSysNcmDto[],
): CanonicalHouseBl {
  return {
    houseNumber: house.numeroBl,
    shipper: mapParty(house.shipperName),
    consignee: mapParty(house.consigneeName),
    notify: mapParty(house.notifyName),
    blCargoTypeExIm: null,
    originalBlMethodCode: null,
    serviceTerm: null,
    freightTerm: null,
    receiptPort: emptyPort(),
    loadingPort: mapPort(house.loadingPortCode, house.loadingPortName),
    dischargePort: mapPort(house.dischargePortCode, house.dischargePortName),
    deliveryPort: emptyPort(),
    packingQuantity: null,
    packingQuantityUnitCode: null,
    grossWeight: toCanonicalString(house.grossWeight),
    volumeMeasure: toCanonicalString(house.volumeMeasure),
    issueDate: null,
    itemName: toCanonicalString(house.itemName),
    container: mapHouseContainer(house.containerNumber),
    cargo: cargo.map(mapCargo),
    ncm: ncm.map(mapNcm),
  };
}

export class GlobalSysCanonicalMapper {
  static fromMaster(aggregate: GlobalSysMasterAggregateDto): CanonicalMasterBl | null {
    if (!aggregate.master) {
      return null;
    }

    return mapMasterDto(aggregate.master);
  }

  static fromHouse(aggregate: GlobalSysHouseAggregateDto): CanonicalHouseBl | null {
    if (!aggregate.house) {
      return null;
    }

    return mapHouseDto(aggregate.house, aggregate.cargo, aggregate.ncm);
  }
}
