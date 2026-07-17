import type { BlHouse, BlMaster } from '@prisma/client';
import type { Decimal } from '@prisma/client/runtime/library';
import type {
  ApoioHumanoDocumentoDto,
  ApoioHumanoItemDto,
  CampoExtraidoDto,
  CampoExtraidoStatus,
  HistoricoAlteracaoDto,
} from '../types/apoio-humano.types.js';

interface FieldDefinition {
  id: string;
  label: string;
  getValue: (entity: BlMaster | BlHouse) => string | null | undefined;
}

function formatValue(value: string | number | Decimal | null | undefined): string {
  if (value == null) {
    return '';
  }

  return String(value).trim();
}

function computeConfidence(value: string): number {
  if (!value) {
    return 42;
  }

  if (/[?]/.test(value)) {
    return 39;
  }

  if (/0/.test(value) && /[A-Za-z]/.test(value)) {
    return 48;
  }

  if (value.length < 4) {
    return 58;
  }

  return Math.min(97, 82 + (value.length % 15));
}

function computeStatus(confianca: number): CampoExtraidoStatus {
  return confianca >= 80 ? 'confirmado' : 'pendente';
}

function buildCampo(id: string, label: string, rawValue: string): CampoExtraidoDto {
  const valorRecebido = rawValue || '-';
  const confianca = computeConfidence(rawValue);

  return {
    id,
    campo: label,
    valorRecebido,
    valorManual: null,
    confianca,
    status: computeStatus(confianca),
  };
}

function buildDocumento(
  numeroBl: string,
  driveId: string | null,
): ApoioHumanoDocumentoDto {
  const origemPath = driveId ? `/BLs/${driveId}` : '/BLs/pendentes';

  return {
    nome: `${numeroBl}_original.pdf`,
    paginas: 1,
    origemPath,
  };
}

const masterFields: FieldDefinition[] = [
  { id: 'm-bl', label: 'Número do BL', getValue: (e) => (e as BlMaster).MasterNumber },
  { id: 'm-navio', label: 'Navio', getValue: (e) => (e as BlMaster).VesselName },
  { id: 'm-viagem', label: 'Viagem', getValue: (e) => (e as BlMaster).Voyage },
  {
    id: 'm-origem',
    label: 'Porto de Origem',
    getValue: (e) => (e as BlMaster).LoadingPortName ?? (e as BlMaster).LoadingPortCode,
  },
  {
    id: 'm-destino',
    label: 'Porto de Destino',
    getValue: (e) =>
      (e as BlMaster).DischargePortName ??
      (e as BlMaster).DeliveryPortName ??
      (e as BlMaster).DischargePortCode,
  },
  { id: 'm-embarcador', label: 'Embarcador', getValue: (e) => (e as BlMaster).ShipperName },
  { id: 'm-consignatario', label: 'Consignatário', getValue: (e) => (e as BlMaster).ConsigneeName },
  { id: 'm-carrier', label: 'Agente de Carga', getValue: (e) => (e as BlMaster).CarrierName },
  {
    id: 'm-peso',
    label: 'Peso Bruto Total',
    getValue: (e) => formatValue((e as BlMaster).GrossWeight),
  },
  {
    id: 'm-volumes',
    label: 'Volumes',
    getValue: (e) => formatValue((e as BlMaster).PackingQuantity),
  },
  { id: 'm-container', label: 'Container', getValue: (e) => (e as BlMaster).ContainerNumber },
  { id: 'm-tipo-container', label: 'Tipo Container', getValue: (e) => (e as BlMaster).ContainerType },
];

const houseFields: FieldDefinition[] = [
  { id: 'h-bl', label: 'Número HBL', getValue: (e) => (e as BlHouse).HouseNumber },
  { id: 'h-embarcador', label: 'Embarcador', getValue: (e) => (e as BlHouse).ShipperName },
  { id: 'h-consignatario', label: 'Consignatário', getValue: (e) => (e as BlHouse).ConsigneeName },
  { id: 'h-notify', label: 'Notify', getValue: (e) => (e as BlHouse).NotifyName },
  { id: 'h-mercadoria', label: 'Mercadoria', getValue: (e) => (e as BlHouse).ItemName },
  {
    id: 'h-origem',
    label: 'Porto de Origem',
    getValue: (e) => (e as BlHouse).LoadingPortName ?? (e as BlHouse).LoadingPortCode,
  },
  {
    id: 'h-destino',
    label: 'Porto de Destino',
    getValue: (e) =>
      (e as BlHouse).DischargePortName ??
      (e as BlHouse).DeliveryPortName ??
      (e as BlHouse).DischargePortCode,
  },
  {
    id: 'h-peso',
    label: 'Peso Bruto',
    getValue: (e) => formatValue((e as BlHouse).GrossWeight ?? (e as BlHouse).ContainerGWT),
  },
  {
    id: 'h-volumes',
    label: 'Volumes',
    getValue: (e) => formatValue((e as BlHouse).PackingQuantity ?? (e as BlHouse).ContainerQTY),
  },
  { id: 'h-container', label: 'Container', getValue: (e) => (e as BlHouse).ContainerNumber },
  { id: 'h-lacre', label: 'Lacre', getValue: (e) => (e as BlHouse).ContainerSealNo1 },
];

function mapCampos(
  entity: BlMaster | BlHouse,
  fields: FieldDefinition[],
): CampoExtraidoDto[] {
  return fields.map((field) =>
    buildCampo(field.id, field.label, formatValue(field.getValue(entity))),
  );
}

export function mapMasterApoioHumano(master: BlMaster): {
  item: ApoioHumanoItemDto;
  documento: ApoioHumanoDocumentoDto;
  campos: CampoExtraidoDto[];
} {
  return {
    item: {
      id: master.Id,
      tipo: 'Master',
      numeroBl: master.MasterNumber,
      navio: master.VesselName ?? '-',
      viagem: master.Voyage ?? '-',
    },
    documento: buildDocumento(master.MasterNumber, master.DriveId),
    campos: mapCampos(master, masterFields),
  };
}

export function mapHouseApoioHumano(house: BlHouse): {
  item: ApoioHumanoItemDto;
  documento: ApoioHumanoDocumentoDto;
  campos: CampoExtraidoDto[];
} {
  return {
    item: {
      id: house.Id,
      tipo: 'House',
      numeroBl: house.HouseNumber,
      navio: '-',
      viagem: '-',
    },
    documento: buildDocumento(house.HouseNumber, house.DriveId),
    campos: mapCampos(house, houseFields),
  };
}

export function mergeCamposComRevisoes(
  campos: CampoExtraidoDto[],
  revisoes: Array<{
    CampoKey: string;
    ValorManual: string | null;
    Confianca: number;
    Status: string;
  }>,
): CampoExtraidoDto[] {
  const revisoesByKey = new Map(revisoes.map((item) => [item.CampoKey, item]));

  return campos.map((campo) => {
    const revisao = revisoesByKey.get(campo.id);

    if (!revisao) {
      return campo;
    }

    return {
      ...campo,
      valorManual: revisao.ValorManual,
      confianca: revisao.Confianca,
      status: revisao.Status as CampoExtraidoStatus,
    };
  });
}

export function hasCamposPendentes(campos: CampoExtraidoDto[]): boolean {
  return campos.some((campo) => campo.status === 'pendente');
}

export function mapHistoricoAlteracao(record: {
  Id: number;
  Usuario: string;
  Campo: string;
  ValorAntes: string;
  ValorDepois: string;
  CreatedAt: Date;
}): HistoricoAlteracaoDto {
  return {
    id: String(record.Id),
    usuario: record.Usuario,
    dataHora: record.CreatedAt.toISOString(),
    campo: record.Campo,
    valorAntes: record.ValorAntes,
    valorDepois: record.ValorDepois,
  };
}
