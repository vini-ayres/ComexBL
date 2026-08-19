import type { BlHouse, BlMaster, BlWorkflow, BlXmlDispatch } from '@prisma/client';
import type { BlStatus } from '../types/bl.types.js';
import type { BlLotHouseDto } from '../types/bl-lot.types.js';
import {
  XML_DISPATCH_UI_STATUS,
  type XmlDispatchUiStatus,
} from '../constants/xml-dispatch.constants.js';

const WORKFLOW_STATUSES: BlStatus[] = [
  'divergencia',
  'apoio_humano',
  'conferencia_house_master',
  'processando',
  'finalizado',
  'nao_encontrado',
];

export function asWorkflowStatus(status: string | null | undefined): BlStatus {
  if (status && WORKFLOW_STATUSES.includes(status as BlStatus)) {
    return status as BlStatus;
  }

  return 'processando';
}

export function asXmlDispatchUiStatus(
  status: string | null | undefined,
): XmlDispatchUiStatus {
  if (status === 'enviado') return XML_DISPATCH_UI_STATUS.ENVIADO;
  if (status === 'falhou') return XML_DISPATCH_UI_STATUS.FALHOU;
  if (status === 'pendente') return XML_DISPATCH_UI_STATUS.PENDENTE;
  return XML_DISPATCH_UI_STATUS.NAO_ENVIADO;
}

export function mapLotHouse(
  house: BlHouse,
  workflow: BlWorkflow | null | undefined,
  options: { candidate: boolean },
): BlLotHouseDto {
  return {
    id: house.Id,
    masterId: house.BLMasterId ?? 0,
    numeroHbl: house.HouseNumber,
    descricaoMercadoria: house.ItemName ?? '-',
    status: asWorkflowStatus(workflow?.Status),
    volumes: house.PackingQuantity ?? house.ContainerQTY ?? 0,
    blVersion: house.BlVersion,
    containerNumber: house.ContainerNumber,
    linked: house.BLMasterId != null,
    candidate: options.candidate,
  };
}

export function indexByMasterId<T extends { BlMasterId: number | null }>(
  items: T[],
): Map<number, T> {
  const map = new Map<number, T>();
  for (const item of items) {
    if (item.BlMasterId != null) {
      map.set(item.BlMasterId, item);
    }
  }
  return map;
}

export function indexWorkflowsByHouseId(
  workflows: BlWorkflow[],
): Map<number, BlWorkflow> {
  const map = new Map<number, BlWorkflow>();
  for (const workflow of workflows) {
    if (workflow.BlHouseId != null) {
      map.set(workflow.BlHouseId, workflow);
    }
  }
  return map;
}

export function groupHousesByMasterId(houses: BlHouse[]): Map<number, BlHouse[]> {
  const map = new Map<number, BlHouse[]>();
  for (const house of houses) {
    if (house.BLMasterId == null) {
      continue;
    }
    const list = map.get(house.BLMasterId) ?? [];
    list.push(house);
    map.set(house.BLMasterId, list);
  }
  return map;
}

export function xmlDispatchFromRecord(
  record: BlXmlDispatch | null | undefined,
): XmlDispatchUiStatus {
  return asXmlDispatchUiStatus(record?.Status);
}

export function formatMasterCreatedAt(master: BlMaster): string {
  return (master.OnboardDate ?? new Date(0)).toISOString();
}
