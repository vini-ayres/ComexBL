import type { BlNaoEncontradoQueueRow } from '../types/bl-nao-encontrado.types.js';
import type { BlDocumentType } from '../types/bl-domain.types.js';
import { prisma } from '../prisma/client.js';

const TEST_USER_LOGIN = 'teste';

export interface BlDocumentPendingConsulta {
  tipo: BlDocumentType;
  blId: number;
}

export class BlNaoEncontradoRepository {
  async findQueueRows(): Promise<BlNaoEncontradoQueueRow[]> {
    const rows = await prisma.$queryRaw<
      {
        tipo: string;
        blId: number;
        numeroBl: string;
        tentativasConsulta: number;
        ultimaTentativa: Date;
        ultimoDetalhe: string | null;
        driveId: string | null;
        dataReferencia: Date | null;
      }[]
    >`
      WITH LatestConsulta AS (
        SELECT
          c.BlMasterId,
          c.BlHouseId,
          c.Sucesso,
          c.Detalhe,
          c.ExecutadoEm,
          ROW_NUMBER() OVER (
            PARTITION BY
              CASE
                WHEN c.BlMasterId IS NOT NULL THEN CONCAT('M', c.BlMasterId)
                ELSE CONCAT('H', c.BlHouseId)
              END
            ORDER BY c.ExecutadoEm DESC
          ) AS rn
        FROM BL_ConsultaGlobalSys c
      )
      SELECT
        q.tipo,
        q.blId,
        q.numeroBl,
        q.tentativasConsulta,
        q.ultimaTentativa,
        q.ultimoDetalhe,
        q.driveId,
        q.dataReferencia
      FROM (
        SELECT
          'Master' AS tipo,
          m.Id AS blId,
          m.MasterNumber AS numeroBl,
          (
            SELECT COUNT(*)
            FROM BL_ConsultaGlobalSys c
            WHERE c.BlMasterId = m.Id
          ) AS tentativasConsulta,
          lc.ExecutadoEm AS ultimaTentativa,
          lc.Detalhe AS ultimoDetalhe,
          m.DriveId AS driveId,
          COALESCE(m.OnboardDate, m.ArrivalDate) AS dataReferencia
        FROM BL_Master m
        INNER JOIN LatestConsulta lc ON lc.BlMasterId = m.Id AND lc.rn = 1
        WHERE lc.Sucesso = 0

        UNION ALL

        SELECT
          'House' AS tipo,
          h.Id AS blId,
          h.HouseNumber AS numeroBl,
          (
            SELECT COUNT(*)
            FROM BL_ConsultaGlobalSys c
            WHERE c.BlHouseId = h.Id
          ) AS tentativasConsulta,
          lc.ExecutadoEm AS ultimaTentativa,
          lc.Detalhe AS ultimoDetalhe,
          h.DriveId AS driveId,
          COALESCE(h.IssueDate, GETDATE()) AS dataReferencia
        FROM BL_House h
        INNER JOIN LatestConsulta lc ON lc.BlHouseId = h.Id AND lc.rn = 1
        WHERE lc.Sucesso = 0
      ) q
      ORDER BY q.ultimaTentativa DESC
    `;

    return rows.map((row) => ({
      tipo: row.tipo as 'Master' | 'House',
      blId: row.blId,
      numeroBl: row.numeroBl,
      tentativasConsulta: Number(row.tentativasConsulta),
      ultimaTentativa: row.ultimaTentativa,
      ultimoDetalhe: row.ultimoDetalhe,
      driveId: row.driveId,
      dataReferencia: row.dataReferencia,
    }));
  }

  async findDocumentsPendingConsulta(): Promise<BlDocumentPendingConsulta[]> {
    const rows = await prisma.$queryRaw<
      { tipo: string; blId: number }[]
    >`
      SELECT 'Master' AS tipo, m.Id AS blId
      FROM BL_Master m
      WHERE NOT EXISTS (
        SELECT 1 FROM BL_ConsultaGlobalSys c WHERE c.BlMasterId = m.Id
      )

      UNION ALL

      SELECT 'House' AS tipo, h.Id AS blId
      FROM BL_House h
      WHERE NOT EXISTS (
        SELECT 1 FROM BL_ConsultaGlobalSys c WHERE c.BlHouseId = h.Id
      )
    `;

    return rows.map((row) => ({
      tipo: row.tipo as BlDocumentType,
      blId: row.blId,
    }));
  }

  async findTestUser() {
    return prisma.appUser.findUnique({
      where: { Login: TEST_USER_LOGIN },
    });
  }
}

export const blNaoEncontradoRepository = new BlNaoEncontradoRepository();
