import type { BlStatus } from '../types/bl.types.js';
import type {
  DashboardBlListItemDto,
  DashboardKpiCounts,
  DashboardKpiDto,
  DashboardOperationalRow,
} from '../types/dashboard.types.js';

const DEFAULT_PENDENCIA: Record<BlStatus, string> = {
  divergencia: 'Divergência pendente de revisão',
  apoio_humano: 'Aguardando revisão humana',
  conferencia_house_master: 'Aguardando conferência House × Master',
  processando: 'Aguardando processamento',
  finalizado: 'Nenhuma pendência',
  nao_encontrado: 'BL não localizado no GlobalSys',
};

function resolvePendencia(status: BlStatus, pendencia: string | null): string {
  if (pendencia?.trim()) {
    return pendencia.trim();
  }

  return DEFAULT_PENDENCIA[status];
}

export function mapDashboardListItem(
  row: DashboardOperationalRow,
): DashboardBlListItemDto {
  const item: DashboardBlListItemDto = {
    id: `${row.tipo}-${row.blId}`,
    blId: row.blId,
    numeroBl: row.numeroBl,
    tipo: row.tipo,
    status: row.status,
    pendencia: resolvePendencia(row.status, row.pendencia),
    blVersion: row.blVersion?.trim() || '-',
    responsavel: row.responsavel,
    dataHora: row.dataHora.toISOString(),
  };

  if (row.navio && row.navio !== '-') {
    item.navio = row.navio;
  }

  if (row.tipo === 'House' && row.masterNumber?.trim()) {
    item.masterNumber = row.masterNumber.trim();
  }

  if (row.viagem && row.viagem !== '-') {
    item.viagem = row.viagem;
  }

  if (row.origem && row.origem !== '-') {
    item.origem = row.origem;
  }

  if (row.destino && row.destino !== '-') {
    item.destino = row.destino;
  }

  if (row.confianca != null) {
    item.confianca = row.confianca;
  }

  return item;
}

export function mapDashboardKpis(counts: DashboardKpiCounts): DashboardKpiDto[] {
  const kpis: DashboardKpiDto[] = [
    { label: 'BLs Pendentes', value: counts.pendentes },
    { label: 'Divergências', value: counts.divergencias },
    { label: 'Apoio Humano', value: counts.apoioHumano },
    { label: 'Processados Hoje', value: counts.processadosHoje },
  ];

  if (counts.tempoMedioMinutos != null) {
    kpis.push({
      label: 'Tempo Médio (min)',
      value: Number(counts.tempoMedioMinutos.toFixed(1)),
      suffix: 'min',
    });
  } else {
    kpis.push({
      label: 'Tempo Médio (min)',
      value: 0,
      suffix: 'min',
    });
  }

  return kpis;
}
