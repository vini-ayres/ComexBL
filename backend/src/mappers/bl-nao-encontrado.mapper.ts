import type { BlNaoEncontradoQueueRow } from '../types/bl-nao-encontrado.types.js';
import type {
  BlNaoEncontradoDetailDto,
  BlNaoEncontradoListItemDto,
} from '../types/bl-nao-encontrado.types.js';

function buildDocumento(
  numeroBl: string,
  fileName: string | null,
): BlNaoEncontradoListItemDto['documento'] {
  const nome = fileName?.trim() || `${numeroBl}_original.pdf`;
  const origemPath = fileName?.trim()
    ? `files/${fileName.trim()}`
    : 'files/pendentes';

  return {
    nome,
    paginas: 1,
    origemPath,
    fileName: fileName?.trim() || null,
  };
}

export function mapBlNaoEncontradoListItem(
  row: BlNaoEncontradoQueueRow,
): BlNaoEncontradoListItemDto {
  return {
    id: row.blId,
    tipo: row.tipo,
    numeroBl: row.numeroBl,
    data: (row.dataReferencia ?? row.ultimaTentativa).toISOString(),
    tentativasConsulta: row.tentativasConsulta,
    ultimaTentativa: row.ultimaTentativa.toISOString(),
    documento: buildDocumento(row.numeroBl, row.fileName),
  };
}

export function mapBlNaoEncontradoDetail(
  row: BlNaoEncontradoQueueRow,
): BlNaoEncontradoDetailDto {
  return {
    ...mapBlNaoEncontradoListItem(row),
    ultimoDetalhe: row.ultimoDetalhe,
  };
}
