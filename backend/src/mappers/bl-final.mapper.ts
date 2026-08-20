import type { BlCampoRevisao, BlHouseCargo, BlMaster } from '@prisma/client';
import type { Decimal } from '@prisma/client/runtime/library';
import type { BlVersion } from '../constants/bl-version.constants.js';
import type { BlHouseWithRelations } from '../types/bl-domain.types.js';
import type {
  BlFinalHouseDto,
  BlFinalMasterDto,
  BlFinalResponseDto,
} from '../types/bl-final.types.js';

function formatDecimal(value: Decimal | number | null | undefined): string | null {
  if (value == null) {
    return null;
  }

  return value.toString();
}

function formatDate(value: Date | null | undefined): string | null {
  if (!value) {
    return null;
  }

  return value.toISOString().slice(0, 10);
}

function formatString(value: string | null | undefined): string | null {
  if (value == null) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function resolveRevisaoValue(revisao: BlCampoRevisao): string {
  const manual = revisao.ValorManual?.trim();
  if (manual) {
    return manual;
  }

  return revisao.ValorRecebido.trim();
}

function applyRevisoesToMaster(
  master: BlFinalMasterDto,
  revisoes: BlCampoRevisao[],
): BlFinalMasterDto {
  const revisoesByKey = new Map(revisoes.map((item) => [item.CampoKey, item]));
  const next = { ...master };

  const overrides: Record<string, keyof BlFinalMasterDto> = {
    'm-bl': 'masterNumber',
    'm-navio': 'vesselName',
    'm-viagem': 'voyage',
    'm-origem': 'loadingPortName',
    'm-destino': 'dischargePortName',
    'm-embarcador': 'shipperName',
    'm-consignatario': 'consigneeName',
    'm-carrier': 'carrierName',
    'm-peso': 'grossWeight',
    'm-volumes': 'packingQuantity',
    'm-container': 'containerNumber',
    'm-tipo-container': 'containerType',
  };

  for (const [campoKey, targetKey] of Object.entries(overrides)) {
    const revisao = revisoesByKey.get(campoKey);
    if (!revisao) {
      continue;
    }

    const value = resolveRevisaoValue(revisao);

    if (targetKey === 'packingQuantity') {
      const parsed = Number.parseInt(value, 10);
      next.packingQuantity = Number.isNaN(parsed) ? next.packingQuantity : parsed;
      continue;
    }

    (next[targetKey] as string | null) = value || null;
  }

  return next;
}

function applyRevisoesToHouse(
  house: BlFinalHouseDto,
  revisoes: BlCampoRevisao[],
): BlFinalHouseDto {
  const revisoesByKey = new Map(revisoes.map((item) => [item.CampoKey, item]));
  const next = { ...house, container: { ...house.container } };

  const overrides: Record<string, keyof BlFinalHouseDto | `container.${keyof BlFinalHouseDto['container']}`> = {
    'h-bl': 'houseNumber',
    'h-embarcador': 'shipperName',
    'h-consignatario': 'consigneeName',
    'h-notify': 'notifyName',
    'h-mercadoria': 'itemName',
    'h-origem': 'loadingPortName',
    'h-destino': 'dischargePortName',
    'h-peso': 'grossWeight',
    'h-volumes': 'packingQuantity',
    'h-container': 'container.containerNumber',
    'h-lacre': 'container.containerSealNo1',
  };

  for (const [campoKey, targetKey] of Object.entries(overrides)) {
    const revisao = revisoesByKey.get(campoKey);
    if (!revisao) {
      continue;
    }

    const value = resolveRevisaoValue(revisao);

    if (targetKey === 'packingQuantity') {
      const parsed = Number.parseInt(value, 10);
      next.packingQuantity = Number.isNaN(parsed) ? next.packingQuantity : parsed;
      continue;
    }

    if (targetKey.startsWith('container.')) {
      const containerKey = targetKey.replace(
        'container.',
        '',
      ) as keyof BlFinalHouseDto['container'];

      if (containerKey === 'containerQty') {
        const parsed = Number.parseInt(value, 10);
        next.container.containerQty = Number.isNaN(parsed)
          ? next.container.containerQty
          : parsed;
      } else {
        next.container[containerKey] = value || null;
      }
      continue;
    }

    (next[targetKey as keyof BlFinalHouseDto] as string | null) = value || null;
  }

  return next;
}

function mapMasterEntity(master: BlMaster): BlFinalMasterDto {
  return {
    referenceNumber: formatString(master.ReferenceNumber),
    masterNumber: master.MasterNumber,
    blTypeExportImport: formatString(master.BLTypeExportImport),
    vesselName: formatString(master.VesselName),
    voyage: formatString(master.Voyage),
    onboardDate: formatDate(master.OnboardDate),
    arrivalDate: formatDate(master.ArrivalDate),
    hblCount: master.HBLCount,
    shipperName: formatString(master.ShipperName),
    shipperAddress: formatString(master.ShipperAddress),
    consigneeName: formatString(master.ConsigneeName),
    consigneeAddress: formatString(master.ConsigneeAddress),
    notifyName: formatString(master.NotifyName),
    notifyAddress: formatString(master.NotifyAddress),
    carrierScacCode: formatString(master.CarrierSCACCode),
    carrierName: formatString(master.CarrierName),
    cargoTypeLclFclBulk: formatString(master.CargoTypeLclFclBulk),
    loadType: formatString(master.LoadType),
    serviceTerm: formatString(master.ServiceTerm),
    freightTerm: formatString(master.FreightTerm),
    loadingPortCode: formatString(master.LoadingPortCode),
    loadingPortName: formatString(master.LoadingPortName),
    dischargePortCode: formatString(master.DischargePortCode),
    dischargePortName: formatString(master.DischargePortName),
    deliveryPortCode: formatString(master.DeliveryPortCode),
    deliveryPortName: formatString(master.DeliveryPortName),
    finalDestinationPortCode: formatString(master.FinalDestinationPortCode),
    finalDestinationPortName: formatString(master.FinalDestinationPortName),
    containerNumber: formatString(master.ContainerNumber),
    containerSealNo1: formatString(master.ContainerSealNo1),
    containerType: formatString(master.ContainerType),
    packingQuantity: master.PackingQuantity,
    packingQuantityUnitCode: formatString(master.PackingQuantityUnitCode),
    grossWeight: formatDecimal(master.GrossWeight),
    volumeMeasure: formatDecimal(master.VolumeMeasure),
  };
}

export function mapBlFinalHouseDto(
  relations: BlHouseWithRelations,
  revisoes: BlCampoRevisao[],
): BlFinalHouseDto {
  return applyRevisoesToHouse(mapHouseEntity(relations), revisoes);
}

function mapHouseEntity(relations: BlHouseWithRelations): BlFinalHouseDto {
  const house = relations.house;

  return {
    houseNumber: house.HouseNumber,
    shipperName: formatString(house.ShipperName),
    shipperAddress: formatString(house.ShipperAddress),
    consigneeName: formatString(house.ConsigneeName),
    consigneeAddress: formatString(house.ConsigneeAddress),
    notifyName: formatString(house.NotifyName),
    notifyAddress: formatString(house.NotifyAddress),
    blCargoTypeExIm: formatString(house.BLCargoTypeExIm),
    originalBlMethodCode: formatString(house.OriginalBLMethodCode),
    serviceTerm: formatString(house.ServiceTerm),
    freightTerm: formatString(house.FreightTerm),
    receiptPortCode: formatString(house.ReceiptPortCode),
    receiptPortName: formatString(house.ReceiptPortName),
    loadingPortCode: formatString(house.LoadingPortCode),
    loadingPortName: formatString(house.LoadingPortName),
    dischargePortCode: formatString(house.DischargePortCode),
    dischargePortName: formatString(house.DischargePortName),
    deliveryPortCode: formatString(house.DeliveryPortCode),
    deliveryPortName: formatString(house.DeliveryPortName),
    packingQuantity: house.PackingQuantity,
    packingQuantityUnitCode: formatString(house.PackingQuantityUnitCode),
    grossWeight: formatDecimal(house.GrossWeight),
    volumeMeasure: formatDecimal(house.VolumeMeasure),
    issueDate: formatDate(house.IssueDate),
    itemName: formatString(house.ItemName),
    container: {
      containerNumber: formatString(house.ContainerNumber),
      containerSealNo1: formatString(house.ContainerSealNo1),
      containerSealNo2: formatString(house.ContainerSealNo2),
      containerType: formatString(house.ContainerType),
      containerQty: house.ContainerQTY,
      containerUnitCode: formatString(house.ContainerUnitCode),
      containerGwt: formatDecimal(house.ContainerGWT),
      containerCbm: formatDecimal(house.ContainerCBM),
    },
    cargos: relations.cargos.map(mapCargoEntity),
    ncms: relations.ncms.map((item) => item.NcmCode.trim()),
  };
}

function mapCargoEntity(cargo: BlHouseCargo) {
  return {
    brand: formatString(cargo.Brand),
    counterMark: formatString(cargo.CounterMark),
    cargoType: formatString(cargo.CargoType),
    hazardClass: formatString(cargo.HazardClass),
    unNumber: formatString(cargo.UNNumber),
    packaging: formatString(cargo.Packaging),
  };
}

export function mapBlFinalResponse(params: {
  masterNumber: string;
  blVersion: BlVersion;
  master: BlMaster;
  houses: BlHouseWithRelations[];
  masterRevisoes: BlCampoRevisao[];
  houseRevisoesByHouseId: Map<number, BlCampoRevisao[]>;
}): BlFinalResponseDto {
  const masterDto = applyRevisoesToMaster(
    mapMasterEntity(params.master),
    params.masterRevisoes,
  );

  const houses = params.houses
    .filter((item): item is BlHouseWithRelations => item != null)
    .map((relations) =>
      applyRevisoesToHouse(
        mapHouseEntity(relations),
        params.houseRevisoesByHouseId.get(relations.house.Id) ?? [],
      ),
    );

  return {
    masterNumber: params.masterNumber,
    blVersion: params.blVersion,
    master: masterDto,
    houses,
  };
}
