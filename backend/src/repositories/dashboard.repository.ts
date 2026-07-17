import { Prisma } from '@prisma/client';
import { prisma } from '../prisma/client.js';
import type { BlStatus } from '../types/bl.types.js';
import type {
  DashboardFilters,
  DashboardKpiCounts,
  DashboardOperationalRow,
} from '../types/dashboard.types.js';
import type { PaginationQuery } from '../types/bl.types.js';
import { getSkipTake } from '../utils/pagination.js';

interface OperationalDbRow {
  tipo: string;
  blId: number;
  numeroBl: string;
  navio: string | null;
  viagem: string | null;
  origem: string | null;
  destino: string | null;
  status: string;
  pendencia: string | null;
  responsavel: string | null;
  confianca: number | null;
  dataHora: Date;
}

interface KpiDbRow {
  pendentes: number;
  divergencias: number;
  apoioHumano: number;
  processadosHoje: number;
}

function mapOperationalRow(row: OperationalDbRow): DashboardOperationalRow {
  return {
    tipo: row.tipo as 'Master' | 'House',
    blId: row.blId,
    numeroBl: row.numeroBl,
    navio: row.navio,
    viagem: row.viagem,
    origem: row.origem,
    destino: row.destino,
    status: row.status as BlStatus,
    pendencia: row.pendencia,
    responsavel: row.responsavel,
    confianca: row.confianca,
    dataHora: row.dataHora,
  };
}

function buildFilterSql(filters: DashboardFilters) {
  const statusFilter = filters.status
    ? Prisma.sql`AND op.status = ${filters.status}`
    : Prisma.empty;

  const tipoFilter = filters.tipo
    ? Prisma.sql`AND op.tipo = ${filters.tipo}`
    : Prisma.empty;

  const searchFilter = filters.search
    ? Prisma.sql`AND (
        op.numeroBl LIKE ${`%${filters.search}%`}
        OR op.navio LIKE ${`%${filters.search}%`}
        OR op.responsavel LIKE ${`%${filters.search}%`}
      )`
    : Prisma.empty;

  return { statusFilter, tipoFilter, searchFilter };
}

export class DashboardRepository {
  private readonly operationalCte = Prisma.sql`
    WITH operational AS (
      SELECT
        CAST('Master' AS VARCHAR(10)) AS tipo,
        m.Id AS blId,
        m.MasterNumber AS numeroBl,
        COALESCE(m.VesselName, '-') AS navio,
        COALESCE(m.Voyage, '-') AS viagem,
        COALESCE(m.LoadingPortName, m.LoadingPortCode, '-') AS origem,
        COALESCE(m.DischargePortName, m.DeliveryPortName, m.DischargePortCode, '-') AS destino,
        CASE
          WHEN w.Status IS NOT NULL THEN w.Status
          WHEN m.Status = 1 THEN 'finalizado'
          ELSE 'processando'
        END AS status,
        w.Pendencia AS pendencia,
        u.DisplayName AS responsavel,
        w.Confianca AS confianca,
        COALESCE(w.UpdatedAt, m.OnboardDate, SYSUTCDATETIME()) AS dataHora
      FROM BL_Master m
      LEFT JOIN BL_Workflow w ON w.BlMasterId = m.Id
      LEFT JOIN APP_User u ON u.Id = w.ResponsavelUserId

      UNION ALL

      SELECT
        CAST('House' AS VARCHAR(10)) AS tipo,
        h.Id AS blId,
        h.HouseNumber AS numeroBl,
        COALESCE(m2.VesselName, '-') AS navio,
        COALESCE(m2.Voyage, '-') AS viagem,
        COALESCE(h.LoadingPortName, h.LoadingPortCode, '-') AS origem,
        COALESCE(h.DischargePortName, h.DeliveryPortName, h.DischargePortCode, '-') AS destino,
        CASE
          WHEN w.Status IS NOT NULL THEN w.Status
          WHEN h.Status = 1 THEN 'finalizado'
          ELSE 'processando'
        END AS status,
        w.Pendencia AS pendencia,
        u.DisplayName AS responsavel,
        w.Confianca AS confianca,
        COALESCE(w.UpdatedAt, h.IssueDate, SYSUTCDATETIME()) AS dataHora
      FROM BL_House h
      LEFT JOIN BL_Master m2 ON m2.Id = h.BLMasterId
      LEFT JOIN BL_Workflow w ON w.BlHouseId = h.Id
      LEFT JOIN APP_User u ON u.Id = w.ResponsavelUserId
    )
  `;

  async findOperationalItems(
    pagination: PaginationQuery,
    filters: DashboardFilters = {},
  ): Promise<{ items: DashboardOperationalRow[]; total: number }> {
    const { skip, take } = getSkipTake(pagination);
    const { statusFilter, tipoFilter, searchFilter } = buildFilterSql(filters);

    const [rows, countRows] = await prisma.$transaction([
      prisma.$queryRaw<OperationalDbRow[]>`
        ${this.operationalCte}
        SELECT
          op.tipo,
          op.blId,
          op.numeroBl,
          op.navio,
          op.viagem,
          op.origem,
          op.destino,
          op.status,
          op.pendencia,
          op.responsavel,
          op.confianca,
          op.dataHora
        FROM operational op
        WHERE 1 = 1
        ${statusFilter}
        ${tipoFilter}
        ${searchFilter}
        ORDER BY op.dataHora DESC
        OFFSET ${skip} ROWS FETCH NEXT ${take} ROWS ONLY
      `,
      prisma.$queryRaw<{ total: number }[]>`
        ${this.operationalCte}
        SELECT COUNT(*) AS total
        FROM operational op
        WHERE 1 = 1
        ${statusFilter}
        ${tipoFilter}
        ${searchFilter}
      `,
    ]);

    return {
      items: rows.map(mapOperationalRow),
      total: Number(countRows[0]?.total ?? 0),
    };
  }

  async getKpiCounts(): Promise<DashboardKpiCounts> {
    const [kpiRows, tempoRows] = await prisma.$transaction([
      prisma.$queryRaw<KpiDbRow[]>`
        ${this.operationalCte}
        SELECT
          SUM(CASE WHEN op.status <> 'finalizado' THEN 1 ELSE 0 END) AS pendentes,
          SUM(CASE WHEN op.status = 'divergencia' THEN 1 ELSE 0 END) AS divergencias,
          SUM(CASE WHEN op.status = 'apoio_humano' THEN 1 ELSE 0 END) AS apoioHumano,
          SUM(CASE
            WHEN op.status = 'finalizado'
              AND CAST(op.dataHora AS DATE) = CAST(SYSUTCDATETIME() AS DATE)
            THEN 1 ELSE 0
          END) AS processadosHoje
        FROM operational op
      `,
      prisma.$queryRaw<{ tempoMedioMinutos: number | null }[]>`
        SELECT
          AVG(CAST(DATEDIFF(MINUTE, w.CreatedAt, w.UpdatedAt) AS FLOAT)) AS tempoMedioMinutos
        FROM BL_Workflow w
        WHERE w.Status = 'finalizado'
          AND w.CreatedAt IS NOT NULL
          AND w.UpdatedAt IS NOT NULL
          AND w.UpdatedAt >= w.CreatedAt
      `,
    ]);

    const counts = kpiRows[0];

    return {
      pendentes: Number(counts?.pendentes ?? 0),
      divergencias: Number(counts?.divergencias ?? 0),
      apoioHumano: Number(counts?.apoioHumano ?? 0),
      processadosHoje: Number(counts?.processadosHoje ?? 0),
      tempoMedioMinutos: tempoRows[0]?.tempoMedioMinutos ?? null,
    };
  }
}

export const dashboardRepository = new DashboardRepository();
