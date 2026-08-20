import type { BlStatus, PaginatedResult, PaginationQuery } from './bl.types.js';

export interface DashboardKpiDto {
  label: string;
  value: number;
  delta?: number;
  suffix?: string;
}

export interface DashboardBlListItemDto {
  id: string;
  blId: number;
  numeroBl: string;
  tipo: 'Master' | 'House';
  status: BlStatus;
  pendencia: string;
  blVersion: string;
  responsavel: string | null;
  dataHora: string;
  masterNumber?: string;
  navio?: string;
  viagem?: string;
  origem?: string;
  destino?: string;
  confianca?: number;
}

export interface DashboardFilters {
  status?: BlStatus;
  tipo?: 'Master' | 'House';
  search?: string;
}

export interface DashboardQuery extends PaginationQuery {
  filters: DashboardFilters;
}

export interface DashboardResponseDto {
  kpis: DashboardKpiDto[];
  items: PaginatedResult<DashboardBlListItemDto>;
}

export interface DashboardOperationalRow {
  tipo: 'Master' | 'House';
  blId: number;
  numeroBl: string;
  masterNumber: string | null;
  navio: string | null;
  viagem: string | null;
  origem: string | null;
  destino: string | null;
  status: BlStatus;
  pendencia: string | null;
  blVersion: string | null;
  responsavel: string | null;
  confianca: number | null;
  dataHora: Date;
}

export interface DashboardKpiCounts {
  pendentes: number;
  divergencias: number;
  apoioHumano: number;
  processadosHoje: number;
  tempoMedioMinutos: number | null;
}
