import type { BlNaoEncontradoQueueRow } from '../types/bl-nao-encontrado.types.js';
import type {
  BlNaoEncontradoDetailDto,
  BlNaoEncontradoListItemDto,
} from '../types/bl-nao-encontrado.types.js';

function buildDocumento(
  numeroBl: string,
  driveId: string | null,
): BlNaoEncontradoListItemDto['documento'] {
  const origemPath = driveId ? `/BLs/${driveId}` : '/BLs/Pendentes';

  return {
    nome: `${numeroBl}_original.pdf`,
    paginas: 1,
    origemPath,
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
    documento: buildDocumento(row.numeroBl, row.driveId),
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
