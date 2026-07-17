import { BadRequestError, NotFoundError } from '../errors/AppError.js';
import {
  hasCamposPendentes,
  mapHouseApoioHumano,
  mapHistoricoAlteracao,
  mapMasterApoioHumano,
  mergeCamposComRevisoes,
} from '../mappers/apoio-humano.mapper.js';
import { ApoioHumanoRepository } from '../repositories/apoio-humano.repository.js';
import type {
  ApoioHumanoDetailDto,
  ApoioHumanoQueueEntry,
  SaveApoioHumanoRequestDto,
  SaveApoioHumanoResponseDto,
} from '../types/apoio-humano.types.js';
import type { PaginationQuery } from '../types/bl.types.js';
import { getSkipTake } from '../utils/pagination.js';

export class ApoioHumanoService {
  constructor(private readonly repository: ApoioHumanoRepository) {}

  async getQueueItem(
    pagination: PaginationQuery,
  ): Promise<ApoioHumanoDetailDto> {
    const pendingEntries = await this.resolvePendingEntries();
    const total = pendingEntries.length;

    if (total === 0) {
      throw new NotFoundError('Nenhum BL pendente de apoio humano');
    }

    const { skip } = getSkipTake(pagination);
    const entry = pendingEntries[skip];

    if (!entry) {
      throw new NotFoundError(
        `BL não encontrado na página ${pagination.page} de ${Math.max(1, Math.ceil(total / pagination.pageSize))}`,
      );
    }

    const mapped = await this.loadEntryWithPersisted(entry);

    return {
      ...mapped,
      pagination: {
        page: pagination.page,
        pageSize: pagination.pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pagination.pageSize)),
      },
    };
  }

  async saveCampos(
    tipoParam: string,
    blId: number,
    payload: SaveApoioHumanoRequestDto,
  ): Promise<SaveApoioHumanoResponseDto> {
    const tipo = this.parseTipo(tipoParam);

    if (!payload.campos?.length) {
      throw new BadRequestError('Informe ao menos um campo para salvar');
    }

    for (const campo of payload.campos) {
      if (!campo.campoKey?.trim() || !campo.campoLabel?.trim()) {
        throw new BadRequestError('Cada campo deve conter campoKey e campoLabel');
      }

      if (!['pendente', 'confirmado', 'editado'].includes(campo.status)) {
        throw new BadRequestError(`Status inválido para o campo ${campo.campoKey}`);
      }
    }

    try {
      const result = await this.repository.saveCampos({
        tipo,
        blId,
        campos: payload.campos,
      });

      return {
        saved: result.saved,
        completed: result.completed,
        historico: result.historico.map(mapHistoricoAlteracao),
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('não encontrado')) {
        throw new NotFoundError(error.message);
      }

      throw error;
    }
  }

  private async resolvePendingEntries(): Promise<ApoioHumanoQueueEntry[]> {
    const candidates = await this.repository.findQueueCandidates();

    if (candidates.length === 0) {
      return [];
    }

    const masterIds = candidates
      .filter((entry) => entry.tipo === 'Master')
      .map((entry) => entry.id);
    const houseIds = candidates
      .filter((entry) => entry.tipo === 'House')
      .map((entry) => entry.id);

    const [masterRevisoes, houseRevisoes] = await Promise.all([
      this.repository.findRevisoesByMasterIds(masterIds),
      this.repository.findRevisoesByHouseIds(houseIds),
    ]);

    const revisoesByEntry = new Map<string, typeof masterRevisoes>();

    for (const revisao of [...masterRevisoes, ...houseRevisoes]) {
      const tipo = revisao.BlMasterId ? 'Master' : 'House';
      const id = revisao.BlMasterId ?? revisao.BlHouseId;
      if (!id) continue;

      const key = `${tipo}-${id}`;
      const current = revisoesByEntry.get(key) ?? [];
      current.push(revisao);
      revisoesByEntry.set(key, current);
    }

    const pendingEntries: ApoioHumanoQueueEntry[] = [];

    for (const entry of candidates) {
      const mapped = await this.loadEntry(entry);
      const revisoes = revisoesByEntry.get(`${entry.tipo}-${entry.id}`) ?? [];
      const campos = mergeCamposComRevisoes(mapped.campos, revisoes);

      if (hasCamposPendentes(campos)) {
        pendingEntries.push(entry);
      }
    }

    return pendingEntries;
  }

  private parseTipo(value: string): 'Master' | 'House' {
    const normalized = value.trim().toLowerCase();

    if (normalized === 'master') {
      return 'Master';
    }

    if (normalized === 'house') {
      return 'House';
    }

    throw new BadRequestError('Tipo inválido. Use master ou house');
  }

  private async loadEntryWithPersisted(entry: ApoioHumanoQueueEntry) {
    const mapped = await this.loadEntry(entry);
    const [revisoes, historicoRecords] = await Promise.all([
      this.repository.findRevisoesByBl(entry.tipo, entry.id),
      this.repository.findHistoricoByBl(entry.tipo, entry.id),
    ]);

    return {
      ...mapped,
      campos: mergeCamposComRevisoes(mapped.campos, revisoes),
      historico: historicoRecords.map(mapHistoricoAlteracao),
    };
  }

  private async loadEntry(entry: { tipo: 'Master' | 'House'; id: number }) {
    if (entry.tipo === 'Master') {
      const master = await this.repository.findMasterById(entry.id);

      if (!master) {
        throw new NotFoundError(`BL Master ${entry.id} não encontrado`);
      }

      return mapMasterApoioHumano(master);
    }

    const house = await this.repository.findHouseById(entry.id);

    if (!house) {
      throw new NotFoundError(`BL House ${entry.id} não encontrado`);
    }

    return mapHouseApoioHumano(house);
  }
}
