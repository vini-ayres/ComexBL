import type { BlHouse, BlMaster } from '@prisma/client';
import type { Decimal } from '@prisma/client/runtime/library';
import type {
  BlHouseDetailDto,
  BlHouseSummaryDto,
  BlMasterDetailDto,
  BlMasterSummaryDto,
  BlStatus,
  ContainerDto,
  DocumentoDto,
} from '../types/bl.types.js';

export type MasterWithHouses = {
  master: BlMaster;
  houses: BlHouse[];
};

export type HouseWithMaster = {
  house: BlHouse;
  master: BlMaster | null;
};

function formatDecimal(
  value: Decimal | number | null | undefined,
  suffix = '',
): string {
  if (value == null) {
    return '-';
  }

  return `${value.toString()}${suffix}`;
}

function formatDateOptional(date: Date | null | undefined): string {
  if (!date) {
    return '-';
  }

  return date.toISOString().slice(0, 10);
}

function mapBooleanStatus(status: boolean): BlStatus {
  return status ? 'finalizado' : 'processando';
}

function buildOrigemArquivo(fileName: string | null): string {
  const name = fileName?.trim();

  if (!name) {
    return '-';
  }

  return `files/${name}`;
}

function mapMasterContainers(master: BlMaster): ContainerDto[] {
  if (!master.ContainerNumber) {
    return [];
  }

  return [
    {
      numero: master.ContainerNumber,
      tipo: master.ContainerType ?? '-',
      lacre: '-',
      pesoBruto: formatDecimal(master.GrossWeight, ' KG'),
      volumes: master.PackingQuantity ?? 0,
    },
  ];
}

function mapHouseContainers(house: BlHouse): ContainerDto[] {
  if (!house.ContainerNumber) {
    return [];
  }

  return [
    {
      numero: house.ContainerNumber,
      tipo: house.ContainerType ?? '-',
      lacre: house.ContainerSealNo1 ?? '-',
      pesoBruto: formatDecimal(house.ContainerGWT ?? house.GrossWeight, ' KG'),
      volumes: house.PackingQuantity ?? house.ContainerQTY ?? 0,
    },
  ];
}

function mapHouseDocumentos(house: BlHouse): DocumentoDto[] {
  const fileName = house.FileName?.trim();

  if (!fileName) {
    return [];
  }

  return [
    {
      nome: fileName,
      url: buildOrigemArquivo(fileName),
      tipo: 'pdf',
    },
  ];
}

export function mapBlMasterSummary(master: BlMaster): BlMasterSummaryDto {
  return {
    id: master.Id,
    numeroBl: master.MasterNumber,
    navio: master.VesselName ?? '-',
    viagem: master.Voyage ?? '-',
    portoOrigem: master.LoadingPortName ?? master.LoadingPortCode ?? '-',
    portoDestino:
      master.DischargePortName ??
      master.DeliveryPortName ??
      master.DischargePortCode ??
      '-',
    status: mapBooleanStatus(master.Status),
    volumesTotal: master.PackingQuantity ?? 0,
    createdAt: (master.OnboardDate ?? new Date(0)).toISOString(),
  };
}

export function mapBlMasterDetail({
  master,
  houses,
}: MasterWithHouses): BlMasterDetailDto {
  return {
    ...mapBlMasterSummary(master),
    embarcador: master.ShipperName ?? '-',
    consignatario: master.ConsigneeName ?? '-',
    agenteCarga: master.CarrierName ?? '-',
    dataEmbarque: formatDateOptional(master.OnboardDate),
    dataChegadaPrevista: formatDateOptional(master.ArrivalDate),
    pesoBrutoTotal: formatDecimal(master.GrossWeight, ' KG'),
    origemArquivo: buildOrigemArquivo(master.FileName),
    updatedAt: (master.ArrivalDate ?? master.OnboardDate ?? new Date(0)).toISOString(),
    containers: mapMasterContainers(master),
    houses: houses.map(mapBlHouseSummary),
  };
}

export function mapBlHouseSummary(house: BlHouse): BlHouseSummaryDto {
  return {
    id: house.Id,
    masterId: house.BLMasterId ?? 0,
    numeroHbl: house.HouseNumber,
    descricaoMercadoria: house.ItemName ?? '-',
    status: mapBooleanStatus(house.Status),
    volumes: house.PackingQuantity ?? house.ContainerQTY ?? 0,
  };
}

export function mapBlHouseDetail({
  house,
  master,
}: HouseWithMaster): BlHouseDetailDto {
  const detail: BlHouseDetailDto = {
    ...mapBlHouseSummary(house),
    embarcador: house.ShipperName ?? '-',
    consignatario: house.ConsigneeName ?? '-',
    notify: house.NotifyName ?? '-',
    pesoBruto: formatDecimal(house.GrossWeight ?? house.ContainerGWT, ' KG'),
    origemArquivo: buildOrigemArquivo(house.FileName),
    createdAt: (house.IssueDate ?? new Date(0)).toISOString(),
    updatedAt: (house.IssueDate ?? new Date(0)).toISOString(),
    containers: mapHouseContainers(house),
    documentos: mapHouseDocumentos(house),
  };

  if (master) {
    detail.master = {
      id: master.Id,
      numeroBl: master.MasterNumber,
      navio: master.VesselName ?? '-',
      viagem: master.Voyage ?? '-',
    };
  }

  return detail;
}
