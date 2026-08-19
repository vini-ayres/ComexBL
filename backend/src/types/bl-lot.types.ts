import type { BlStatus } from './bl.types.js';
import type { LotStatus, XmlDispatchUiStatus } from '../constants/xml-dispatch.constants.js';

export interface XmlDispatchEvaluationDto {
  dispatched: boolean;
  lotStatus: LotStatus;
  reason: string;
  hblCount: number | null;
  linkedCount: number;
  finalizedHouseCount: number;
  masterFinalized: boolean;
  xmlDispatchStatus: XmlDispatchUiStatus;
}

export interface BlLotHouseDto {
  id: number;
  masterId: number;
  numeroHbl: string;
  descricaoMercadoria: string;
  status: BlStatus;
  volumes: number;
  blVersion: string;
  containerNumber: string | null;
  linked: boolean;
  candidate: boolean;
}

export interface BlLotSummaryDto {
  id: number;
  numeroBl: string;
  navio: string;
  viagem: string;
  portoOrigem: string;
  portoDestino: string;
  status: BlStatus;
  volumesTotal: number;
  createdAt: string;
  blVersion: string;
  hblCount: number | null;
  containerNumber: string | null;
  houseCount: number;
  finalizedHouseCount: number;
  workflowStatus: BlStatus;
  xmlDispatchStatus: XmlDispatchUiStatus;
  lotStatus: LotStatus;
  partlot: boolean;
}

export interface BlLotDetailDto extends BlLotSummaryDto {
  embarcador: string;
  consignatario: string;
  agenteCarga: string;
  dataEmbarque: string;
  dataChegadaPrevista: string;
  pesoBrutoTotal: string;
  origemArquivo: string;
  updatedAt: string;
  houses: BlLotHouseDto[];
  candidateHouses: BlLotHouseDto[];
  xmlDispatchError: string | null;
  xmlDispatchedAt: string | null;
}
