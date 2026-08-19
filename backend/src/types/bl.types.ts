export type BlStatus =
  | 'divergencia'
  | 'apoio_humano'
  | 'conferencia_house_master'
  | 'processando'
  | 'finalizado'
  | 'nao_encontrado';

export interface ContainerDto {
  numero: string;
  tipo: string;
  lacre: string;
  pesoBruto: string;
  volumes: number;
}

export interface DocumentoDto {
  nome: string;
  url: string;
  tipo: string;
}

export interface BlMasterSummaryDto {
  id: number;
  numeroBl: string;
  navio: string;
  viagem: string;
  portoOrigem: string;
  portoDestino: string;
  status: BlStatus;
  volumesTotal: number;
  createdAt: string;
}

export interface BlMasterDetailDto extends BlMasterSummaryDto {
  embarcador: string;
  consignatario: string;
  agenteCarga: string;
  dataEmbarque: string;
  dataChegadaPrevista: string;
  pesoBrutoTotal: string;
  origemArquivo: string;
  updatedAt: string;
  containers: ContainerDto[];
  houses: BlHouseSummaryDto[];
}

export interface BlHouseSummaryDto {
  id: number;
  masterId: number;
  numeroHbl: string;
  descricaoMercadoria: string;
  status: BlStatus;
  volumes: number;
}

export interface BlHouseDetailDto extends BlHouseSummaryDto {
  embarcador: string;
  consignatario: string;
  notify: string;
  pesoBruto: string;
  origemArquivo: string;
  createdAt: string;
  updatedAt: string;
  containers: ContainerDto[];
  documentos: DocumentoDto[];
  master?: Pick<BlMasterSummaryDto, 'id' | 'numeroBl' | 'navio' | 'viagem'>;
}

export interface PaginationQuery {
  page: number;
  pageSize: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}
