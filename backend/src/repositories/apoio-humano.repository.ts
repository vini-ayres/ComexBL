import type { Prisma } from '@prisma/client';
import { Prisma as PrismaNamespace } from '@prisma/client';
import type { BlCampoRevisao, BlHistoricoAlteracao } from '@prisma/client';
import { applyApoioHumanoCamposToEntity } from '../mappers/apoio-humano-entity.mapper.js';
import { prisma } from '../prisma/client.js';
import type { ApoioHumanoQueueEntry } from '../types/apoio-humano.types.js';
import type { SaveApoioHumanoCampoInput } from '../types/apoio-humano.types.js';

const TEST_USER_LOGIN = 'teste';

export interface SaveApoioHumanoParams {
  tipo: 'Master' | 'House';
  blId: number;
  campos: SaveApoioHumanoCampoInput[];
  userId: number;
  userDisplayName: string;
}

export class ApoioHumanoRepository {
  async findQueueCandidates(): Promise<ApoioHumanoQueueEntry[]> {
    const rows = await prisma.$queryRaw<{ tipo: string; Id: number }[]>`
      SELECT tipo, Id FROM (
        SELECT 'Master' AS tipo, m.Id
        FROM BL_Master m
        LEFT JOIN BL_Workflow w ON w.BlMasterId = m.Id
        WHERE w.Id IS NULL OR w.Status IN ('apoio_humano', 'processando')

        UNION ALL

        SELECT 'House' AS tipo, h.Id
        FROM BL_House h
        LEFT JOIN BL_Workflow w ON w.BlHouseId = h.Id
        WHERE w.Id IS NULL OR w.Status IN ('apoio_humano', 'processando')
      ) q
      ORDER BY Id
    `;

    return rows.map((row) => ({
      tipo: row.tipo as 'Master' | 'House',
      id: row.Id,
    }));
  }

  async findRevisoesByMasterIds(ids: number[]) {
    if (ids.length === 0) {
      return [];
    }

    return prisma.blCampoRevisao.findMany({
      where: { BlMasterId: { in: ids } },
    });
  }

  async findRevisoesByHouseIds(ids: number[]) {
    if (ids.length === 0) {
      return [];
    }

    return prisma.blCampoRevisao.findMany({
      where: { BlHouseId: { in: ids } },
    });
  }

  async findHistoricoByBl(tipo: 'Master' | 'House', blId: number) {
    if (tipo === 'Master') {
      return prisma.blHistoricoAlteracao.findMany({
        where: { BlMasterId: blId },
        orderBy: { CreatedAt: 'desc' },
      });
    }

    return prisma.blHistoricoAlteracao.findMany({
      where: { BlHouseId: blId },
      orderBy: { CreatedAt: 'desc' },
    });
  }

  async findMasterById(id: number) {
    return prisma.blMaster.findUnique({ where: { Id: id } });
  }

  async findHouseById(id: number) {
    return prisma.blHouse.findUnique({ where: { Id: id } });
  }

  async findHouseWithRelationsById(id: number) {
    const house = await this.findHouseById(id);

    if (!house) {
      return null;
    }

    const [cargos, ncms] = await Promise.all([
      prisma.blHouseCargo.findMany({
        where: { BlHouseId: house.Id },
        orderBy: { Id: 'asc' },
      }),
      prisma.blHouseNcm.findMany({
        where: { BlHouseId: house.Id },
        orderBy: { Id: 'asc' },
      }),
    ]);

    return { house, cargos, ncms };
  }

  async findTestUser() {
    return prisma.appUser.findUnique({
      where: { Login: TEST_USER_LOGIN },
    });
  }

  async findRevisoesByBl(
    tipo: 'Master' | 'House',
    blId: number,
    client: Prisma.TransactionClient | typeof prisma = prisma,
  ) {
    if (tipo === 'Master') {
      return client.blCampoRevisao.findMany({
        where: { BlMasterId: blId },
      });
    }

    return client.blCampoRevisao.findMany({
      where: { BlHouseId: blId },
    });
  }

  async saveCampos(params: SaveApoioHumanoParams): Promise<{
    saved: number;
    completed: boolean;
    historico: BlHistoricoAlteracao[];
  }> {
    const saveStartedAt = new Date();

    const blExists =
      params.tipo === 'Master'
        ? await prisma.blMaster.findUnique({ where: { Id: params.blId } })
        : await prisma.blHouse.findUnique({ where: { Id: params.blId } });

    if (!blExists) {
      throw new Error(`BL ${params.tipo} ${params.blId} não encontrado`);
    }

    const existingRevisoes = await this.findRevisoesByBl(params.tipo, params.blId);
    const existingByKey = new Map(
      existingRevisoes.map((item) => [item.CampoKey, item]),
    );

    const camposByKey = new Map<string, SaveApoioHumanoCampoInput>();

    for (const campo of params.campos) {
      camposByKey.set(campo.campoKey, campo);
    }

    const changedCampos = [...camposByKey.values()].filter((campo) => {
      const existing = existingByKey.get(campo.campoKey);
      return !existing || this.hasCampoChanged(existing, campo);
    });

    const historicoCreates: Prisma.BlHistoricoAlteracaoCreateManyInput[] = [];

    for (const campo of changedCampos) {
      if (campo.status !== 'pendente') {
        historicoCreates.push({
          BlMasterId: params.tipo === 'Master' ? params.blId : null,
          BlHouseId: params.tipo === 'House' ? params.blId : null,
          UserId: params.userId,
          Usuario: params.userDisplayName,
          Campo: campo.campoLabel,
          ValorAntes: this.resolveValorAntes(
            existingByKey.get(campo.campoKey),
            campo,
          ),
          ValorDepois: this.resolveValorDepois(campo),
          Acao: campo.status === 'confirmado' ? 'confirmacao' : 'edicao',
        });
      }
    }

    await Promise.all(
      changedCampos.map(async (campo) => {
        const existing = existingByKey.get(campo.campoKey);
        await this.upsertCampoRevisao(params, campo, existing);
      }),
    );

    const saved = changedCampos.length;

    if (historicoCreates.length > 0) {
      await prisma.blHistoricoAlteracao.createMany({ data: historicoCreates });
    }

    await applyApoioHumanoCamposToEntity(params, prisma);

    const historicoRecords =
      historicoCreates.length > 0
        ? await prisma.blHistoricoAlteracao.findMany({
            where: {
              ...(params.tipo === 'Master'
                ? { BlMasterId: params.blId }
                : { BlHouseId: params.blId }),
              CreatedAt: { gte: saveStartedAt },
            },
            orderBy: { CreatedAt: 'desc' },
            take: historicoCreates.length,
          })
        : [];

    const completed = !params.campos.some((campo) => campo.status === 'pendente');

    return { saved, completed, historico: historicoRecords };
  }

  private async upsertCampoRevisao(
    params: SaveApoioHumanoParams,
    campo: SaveApoioHumanoCampoInput,
    existing?: BlCampoRevisao,
  ): Promise<BlCampoRevisao> {
    const revisionData = {
      CampoLabel: campo.campoLabel,
      ValorRecebido: campo.valorRecebido,
      ValorManual: campo.valorManual,
      Confianca: campo.confianca,
      Status: campo.status,
    };

    if (existing) {
      return prisma.blCampoRevisao.update({
        where: { Id: existing.Id },
        data: {
          ...revisionData,
          updatedBy: { connect: { Id: params.userId } },
        },
      });
    }

    try {
      return await prisma.blCampoRevisao.create({
        data: {
          BlMasterId: params.tipo === 'Master' ? params.blId : null,
          BlHouseId: params.tipo === 'House' ? params.blId : null,
          CampoKey: campo.campoKey,
          ...revisionData,
          UpdatedByUserId: params.userId,
        },
      });
    } catch (error) {
      if (!this.isUniqueConstraintError(error)) {
        throw error;
      }

      const concurrent = await prisma.blCampoRevisao.findFirst({
        where: {
          CampoKey: campo.campoKey,
          ...(params.tipo === 'Master'
            ? { BlMasterId: params.blId }
            : { BlHouseId: params.blId }),
        },
      });

      if (!concurrent) {
        throw error;
      }

      return prisma.blCampoRevisao.update({
        where: { Id: concurrent.Id },
        data: {
          ...revisionData,
          updatedBy: { connect: { Id: params.userId } },
        },
      });
    }
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return (
      error instanceof PrismaNamespace.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    );
  }

  private hasCampoChanged(
    existing: BlCampoRevisao | undefined,
    incoming: SaveApoioHumanoCampoInput,
  ): boolean {
    if (!existing) {
      return true;
    }

    return (
      existing.Status !== incoming.status ||
      existing.ValorManual !== incoming.valorManual ||
      existing.ValorRecebido !== incoming.valorRecebido ||
      existing.Confianca !== incoming.confianca
    );
  }

  private resolveValorAntes(
    existing: BlCampoRevisao | undefined,
    campo: SaveApoioHumanoCampoInput,
  ): string {
    if (existing?.ValorManual) {
      return existing.ValorManual;
    }

    return existing?.ValorRecebido ?? campo.valorRecebido;
  }

  private resolveValorDepois(campo: SaveApoioHumanoCampoInput): string {
    return campo.valorManual ?? campo.valorRecebido;
  }
}

export const apoioHumanoRepository = new ApoioHumanoRepository();
