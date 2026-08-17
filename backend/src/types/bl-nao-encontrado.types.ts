import type { PaginatedResult } from './bl.types.js';

export interface BlNaoEncontradoDocumentoDto {
  nome: string;
  paginas: number;
  /** Caminho lógico para exibição, ex.: files/MBL-123.pdf */
  origemPath: string;
  /** Nome do arquivo em /files (null se ainda não associado) */
  fileName: string | null;
}

export interface BlNaoEncontradoListItemDto {
  id: number;
  tipo: 'Master' | 'House';
  numeroBl: string;
  data: string;
  tentativasConsulta: number;
  ultimaTentativa: string;
  documento: BlNaoEncontradoDocumentoDto;
}

export interface BlNaoEncontradoDetailDto extends BlNaoEncontradoListItemDto {
  ultimoDetalhe: string | null;
}

export type BlNaoEncontradoListResponse = PaginatedResult<BlNaoEncontradoListItemDto>;

export interface GlobalSysConsultaResponseDto {
  found: boolean;
  tentativaNumero: number;
  workflowStatus: string;
  detalhe: string;
  numeroBl: string;
}

export interface BlNaoEncontradoQueueRow {
  tipo: 'Master' | 'House';
  blId: number;
  numeroBl: string;
  tentativasConsulta: number;
  ultimaTentativa: Date;
  ultimoDetalhe: string | null;
  fileName: string | null;
  dataReferencia: Date | null;
}
