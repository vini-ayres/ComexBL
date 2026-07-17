import type { Prisma } from '@prisma/client';
import { prisma } from '../prisma/client.js';
import type { BlNaoEncontradoQueueRow } from '../types/bl-nao-encontrado.types.js';

const TEST_USER_LOGIN = 'teste';

export interface RecordConsultaParams {
  tipo: 'Master' | 'House';
  blId: number;
  found: boolean;
  detalhe: string;
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

  async findMasterById(id: number) {
    return prisma.blMaster.findUnique({ where: { Id: id } });
  }

  async findHouseById(id: number) {
    return prisma.blHouse.findUnique({ where: { Id: id } });
  }

  async countConsultas(tipo: 'Master' | 'House', blId: number): Promise<number> {
    if (tipo === 'Master') {
      return prisma.blConsultaGlobalSys.count({
        where: { BlMasterId: blId },
      });
    }

    return prisma.blConsultaGlobalSys.count({
      where: { BlHouseId: blId },
    });
  }

  async getLatestConsultaSuccess(
    tipo: 'Master' | 'House',
    blId: number,
  ): Promise<boolean | null> {
    const latest = await prisma.blConsultaGlobalSys.findFirst({
      where:
        tipo === 'Master'
          ? { BlMasterId: blId }
          : { BlHouseId: blId },
      orderBy: { ExecutadoEm: 'desc' },
      select: { Sucesso: true },
    });

    return latest?.Sucesso ?? null;
  }

  async findTestUser() {
    return prisma.appUser.findUnique({
      where: { Login: TEST_USER_LOGIN },
    });
  }

  async recordConsulta(params: RecordConsultaParams): Promise<{
    tentativaNumero: number;
    workflowStatus: string;
  }> {
    const user = await this.findTestUser();

    if (!user) {
      throw new Error(
        `Usuário de teste "${TEST_USER_LOGIN}" não encontrado. Execute npm run prisma:seed.`,
      );
    }

    const tentativaNumero = (await this.countConsultas(params.tipo, params.blId)) + 1;
    const workflowStatus = params.found ? 'processando' : 'nao_encontrado';
    const pendencia = params.found
      ? 'BL localizado no GlobalSys'
      : 'BL não localizado no GlobalSys';

    await prisma.$transaction(async (tx) => {
      await tx.blConsultaGlobalSys.create({
        data: {
          BlMasterId: params.tipo === 'Master' ? params.blId : null,
          BlHouseId: params.tipo === 'House' ? params.blId : null,
          TentativaNumero: tentativaNumero,
          Sucesso: params.found,
          Detalhe: params.detalhe,
        },
      });

      await this.upsertWorkflow(tx, {
        tipo: params.tipo,
        blId: params.blId,
        status: workflowStatus,
        pendencia,
        userId: user.Id,
      });
    });

    return { tentativaNumero, workflowStatus };
  }

  private async upsertWorkflow(
    tx: Prisma.TransactionClient,
    params: {
      tipo: 'Master' | 'House';
      blId: number;
      status: string;
      pendencia: string;
      userId: number;
    },
  ): Promise<void> {
    const workflowData = {
      TipoBl: params.tipo,
      Status: params.status,
      Pendencia: params.pendencia,
      ResponsavelUserId: params.userId,
    };

    if (params.tipo === 'Master') {
      const existing = await tx.blWorkflow.findUnique({
        where: { BlMasterId: params.blId },
      });

      if (existing) {
        await tx.blWorkflow.update({
          where: { Id: existing.Id },
          data: workflowData,
        });
        return;
      }

      await tx.blWorkflow.create({
        data: {
          BlMasterId: params.blId,
          ...workflowData,
        },
      });
      return;
    }

    const existing = await tx.blWorkflow.findUnique({
      where: { BlHouseId: params.blId },
    });

    if (existing) {
      await tx.blWorkflow.update({
        where: { Id: existing.Id },
        data: workflowData,
      });
      return;
    }

    await tx.blWorkflow.create({
      data: {
        BlHouseId: params.blId,
        ...workflowData,
      },
    });
  }
}

export const blNaoEncontradoRepository = new BlNaoEncontradoRepository();
