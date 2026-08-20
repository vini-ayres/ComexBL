export type CampoExtraidoStatus = 'pendente' | 'confirmado' | 'editado';

export interface CampoExtraidoDto {
  id: string;
  campo: string;
  valorRecebido: string;
  valorManual: string | null;
  confianca: number;
  status: CampoExtraidoStatus;
}

export interface HistoricoAlteracaoDto {
  id: string;
  usuario: string;
  dataHora: string;
  campo: string;
  valorAntes: string;
  valorDepois: string;
}

export interface ApoioHumanoDocumentoDto {
  nome: string;
  paginas: number;
  /** Caminho lógico para exibição, ex.: files/MBL-123.pdf */
  origemPath: string;
  /** Nome do arquivo em /files (null se ainda não associado) */
  fileName: string | null;
}

export interface ApoioHumanoItemDto {
  id: number;
  tipo: 'Master' | 'House';
  numeroBl: string;
  navio: string;
  viagem: string;
  blVersion: string;
}

export interface ApoioHumanoDetailDto {
  item: ApoioHumanoItemDto;
  documento: ApoioHumanoDocumentoDto;
  campos: CampoExtraidoDto[];
  historico: HistoricoAlteracaoDto[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface ApoioHumanoQueueEntry {
  tipo: 'Master' | 'House';
  id: number;
}

export interface SaveApoioHumanoCampoInput {
  campoKey: string;
  campoLabel: string;
  valorRecebido: string;
  valorManual: string | null;
  confianca: number;
  status: CampoExtraidoStatus;
}

export interface SaveApoioHumanoRequestDto {
  campos: SaveApoioHumanoCampoInput[];
}

export interface SaveApoioHumanoResponseDto {
  saved: number;
  completed: boolean;
  historico: HistoricoAlteracaoDto[];
}
