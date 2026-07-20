import type { Prisma } from '@prisma/client';
import type { BlCampoRevisao, BlHistoricoAlteracao } from '@prisma/client';
import { prisma } from '../prisma/client.js';
import type { ApoioHumanoQueueEntry } from '../types/apoio-humano.types.js';
import type { SaveApoioHumanoCampoInput } from '../types/apoio-humano.types.js';

const TEST_USER_LOGIN = 'teste';

export interface SaveApoioHumanoParams {
  tipo: 'Master' | 'House';
  blId: number;
  campos: SaveApoioHumanoCampoInput[];
}

export class ApoioHumanoRepository {
  async findQueueCandidates(): Promise<ApoioHumanoQueueEntry[]> {
    const rows = await prisma.$queryRaw<{ tipo: string; Id: number }[]>`
      SELECT tipo, Id FROM (
        SELECT 'Master' AS tipo, m.Id
        FROM BL_Master m
        LEFT JOIN BL_Workflow w ON w.BlMasterId = m.Id
        WHERE w.Id IS NULL OR w.Status = 'apoio_humano'

        UNION ALL

        SELECT 'House' AS tipo, h.Id
        FROM BL_House h
        LEFT JOIN BL_Workflow w ON w.BlHouseId = h.Id
        WHERE w.Id IS NULL OR w.Status = 'apoio_humano'
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

  async findTestUser() {
    return prisma.appUser.findUnique({
      where: { Login: TEST_USER_LOGIN },
    });
  }

  async findRevisoesByBl(tipo: 'Master' | 'House', blId: number) {
    if (tipo === 'Master') {
      return prisma.blCampoRevisao.findMany({
        where: { BlMasterId: blId },
      });
    }

    return prisma.blCampoRevisao.findMany({
      where: { BlHouseId: blId },
    });
  }

  async saveCampos(
    params: SaveApoioHumanoParams,
    tx?: Prisma.TransactionClient,
  ): Promise<{
    saved: number;
    completed: boolean;
    historico: BlHistoricoAlteracao[];
  }> {
    const client = tx ?? prisma;
    const user = await this.findTestUser();

    if (!user) {
      throw new Error(
        `Usuário de teste "${TEST_USER_LOGIN}" não encontrado. Execute npm run prisma:seed.`,
      );
    }

    const blExists =
      params.tipo === 'Master'
        ? await this.findMasterById(params.blId)
        : await this.findHouseById(params.blId);

    if (!blExists) {
      throw new Error(`BL ${params.tipo} ${params.blId} não encontrado`);
    }

    const existingRevisoes = await this.findRevisoesByBl(params.tipo, params.blId);
    const existingByKey = new Map(
      existingRevisoes.map((item) => [item.CampoKey, item]),
    );

    const historicoRecords: BlHistoricoAlteracao[] = [];
    let saved = 0;

    for (const campo of params.campos) {
      const existing = existingByKey.get(campo.campoKey);
      const hasChange = this.hasCampoChanged(existing, campo);

      const revision = existing
        ? await client.blCampoRevisao.update({
            where: { Id: existing.Id },
            data: {
              CampoLabel: campo.campoLabel,
              ValorRecebido: campo.valorRecebido,
              ValorManual: campo.valorManual,
              Confianca: campo.confianca,
              Status: campo.status,
              UpdatedByUserId: user.Id,
            },
          })
        : await client.blCampoRevisao.create({
            data: {
              BlMasterId: params.tipo === 'Master' ? params.blId : null,
              BlHouseId: params.tipo === 'House' ? params.blId : null,
              CampoKey: campo.campoKey,
              CampoLabel: campo.campoLabel,
              ValorRecebido: campo.valorRecebido,
              ValorManual: campo.valorManual,
              Confianca: campo.confianca,
              Status: campo.status,
              UpdatedByUserId: user.Id,
            },
          });

      existingByKey.set(campo.campoKey, revision);

      if (!hasChange) {
        continue;
      }

      saved += 1;

      const historico = await client.blHistoricoAlteracao.create({
        data: {
          BlMasterId: params.tipo === 'Master' ? params.blId : null,
          BlHouseId: params.tipo === 'House' ? params.blId : null,
          UserId: user.Id,
          Usuario: user.DisplayName,
          Campo: campo.campoLabel,
          ValorAntes: this.resolveValorAntes(existing, campo),
          ValorDepois: this.resolveValorDepois(campo),
          Acao: campo.status === 'confirmado' ? 'confirmacao' : 'edicao',
        },
      });

      historicoRecords.push(historico);
    }

    const completed = !params.campos.some((campo) => campo.status === 'pendente');

    return { saved, completed, historico: historicoRecords };
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
