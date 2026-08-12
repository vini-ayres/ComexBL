import type { BlHouse, BlHouseCargo, BlHouseNcm, BlMaster } from '@prisma/client';
import type { CanonicalHouseBl } from '../domain/canonical/canonical-house-bl.js';
import type { CanonicalMasterBl } from '../domain/canonical/canonical-master-bl.js';
import type {
  CanonicalCargo,
  CanonicalContainer,
  CanonicalNcm,
  CanonicalParty,
  CanonicalPort,
} from '../domain/canonical/canonical-shared.types.js';
import { toCanonicalString } from '../domain/canonical/canonical-value.utils.js';

function mapParty(name: unknown, address: unknown): CanonicalParty {
  return {
    name: toCanonicalString(name),
    address: toCanonicalString(address),
  };
}

function mapPort(code: unknown, name: unknown): CanonicalPort {
  return {
    code: toCanonicalString(code),
    name: toCanonicalString(name),
  };
}

function mapMasterContainer(master: BlMaster): CanonicalContainer {
  return {
    number: toCanonicalString(master.ContainerNumber),
    sealNo1: toCanonicalString(master.ContainerSealNo1),
    sealNo2: null,
    type: toCanonicalString(master.ContainerType),
    quantity: toCanonicalString(master.PackingQuantity),
    unitCode: toCanonicalString(master.PackingQuantityUnitCode),
    grossWeight: null,
    volume: null,
  };
}

function mapHouseContainer(house: BlHouse): CanonicalContainer {
  return {
    number: toCanonicalString(house.ContainerNumber),
    sealNo1: toCanonicalString(house.ContainerSealNo1),
    sealNo2: toCanonicalString(house.ContainerSealNo2),
    type: toCanonicalString(house.ContainerType),
    quantity: toCanonicalString(house.ContainerQTY),
    unitCode: toCanonicalString(house.ContainerUnitCode),
    grossWeight: toCanonicalString(house.ContainerGWT),
    volume: toCanonicalString(house.ContainerCBM),
  };
}

function mapCargo(cargo: BlHouseCargo): CanonicalCargo {
  return {
    brand: toCanonicalString(cargo.Brand),
    counterMark: toCanonicalString(cargo.CounterMark),
    cargoType: toCanonicalString(cargo.CargoType),
    hazardClass: toCanonicalString(cargo.HazardClass),
    unNumber: toCanonicalString(cargo.UNNumber),
    packaging: toCanonicalString(cargo.Packaging),
  };
}

function mapNcm(ncm: BlHouseNcm): CanonicalNcm {
  return { code: toCanonicalString(ncm.NcmCode) };
}

export class OcrCanonicalMapper {
  static fromMaster(master: BlMaster): CanonicalMasterBl {
    return {
      masterNumber: master.MasterNumber,
      referenceNumber: toCanonicalString(master.ReferenceNumber),
      blTypeExportImport: toCanonicalString(master.BLTypeExportImport),
      vesselName: toCanonicalString(master.VesselName),
      voyage: toCanonicalString(master.Voyage),
      onboardDate: toCanonicalString(master.OnboardDate),
      arrivalDate: toCanonicalString(master.ArrivalDate),
      hblCount: toCanonicalString(master.HBLCount),
      shipper: mapParty(master.ShipperName, master.ShipperAddress),
      consignee: mapParty(master.ConsigneeName, master.ConsigneeAddress),
      notify: mapParty(master.NotifyName, master.NotifyAddress),
      carrierScacCode: toCanonicalString(master.CarrierSCACCode),
      carrierName: toCanonicalString(master.CarrierName),
      cargoTypeLclFclBulk: toCanonicalString(master.CargoTypeLclFclBulk),
      loadType: toCanonicalString(master.LoadType),
      serviceTerm: toCanonicalString(master.ServiceTerm),
      freightTerm: toCanonicalString(master.FreightTerm),
      loadingPort: mapPort(master.LoadingPortCode, master.LoadingPortName),
      dischargePort: mapPort(master.DischargePortCode, master.DischargePortName),
      deliveryPort: mapPort(master.DeliveryPortCode, master.DeliveryPortName),
      finalDestinationPort: mapPort(
        master.FinalDestinationPortCode,
        master.FinalDestinationPortName,
      ),
      container: mapMasterContainer(master),
      packingQuantity: toCanonicalString(master.PackingQuantity),
      packingQuantityUnitCode: toCanonicalString(master.PackingQuantityUnitCode),
      grossWeight: toCanonicalString(master.GrossWeight),
      volumeMeasure: toCanonicalString(master.VolumeMeasure),
    };
  }

  static fromHouse(
    house: BlHouse,
    cargos: BlHouseCargo[],
    ncms: BlHouseNcm[],
  ): CanonicalHouseBl {
    return {
      houseNumber: house.HouseNumber,
      shipper: mapParty(house.ShipperName, house.ShipperAddress),
      consignee: mapParty(house.ConsigneeName, house.ConsigneeAddress),
      notify: mapParty(house.NotifyName, house.NotifyAddress),
      blCargoTypeExIm: toCanonicalString(house.BLCargoTypeExIm),
      originalBlMethodCode: toCanonicalString(house.OriginalBLMethodCode),
      serviceTerm: toCanonicalString(house.ServiceTerm),
      freightTerm: toCanonicalString(house.FreightTerm),
      receiptPort: mapPort(house.ReceiptPortCode, house.ReceiptPortName),
      loadingPort: mapPort(house.LoadingPortCode, house.LoadingPortName),
      dischargePort: mapPort(house.DischargePortCode, house.DischargePortName),
      deliveryPort: mapPort(house.DeliveryPortCode, house.DeliveryPortName),
      packingQuantity: toCanonicalString(house.PackingQuantity),
      packingQuantityUnitCode: toCanonicalString(house.PackingQuantityUnitCode),
      grossWeight: toCanonicalString(house.GrossWeight),
      volumeMeasure: toCanonicalString(house.VolumeMeasure),
      issueDate: toCanonicalString(house.IssueDate),
      itemName: toCanonicalString(house.ItemName),
      container: mapHouseContainer(house),
      cargo: cargos.map(mapCargo),
      ncm: ncms.map(mapNcm),
    };
  }
}
