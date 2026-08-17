import type { BlHouse, BlHouseCargo, BlHouseNcm, BlMaster } from '@prisma/client';
import type { Decimal } from '@prisma/client/runtime/library';
import {
  CARGO_COMPARABLE_FIELDS,
  HOUSE_SCALAR_FIELDS,
  MASTER_SCALAR_FIELDS,
} from '../constants/bl-comparison.constants.js';
import type {
  ApoioHumanoDocumentoDto,
  ApoioHumanoItemDto,
  CampoExtraidoDto,
  CampoExtraidoStatus,
  HistoricoAlteracaoDto,
} from '../types/apoio-humano.types.js';
import {
  buildCargoLogicalKey,
  formatCargoDisplayTitle,
  normalizeNcmCode,
} from '../utils/comparison.utils.js';

const CARGO_FIELD_LABELS: Record<(typeof CARGO_COMPARABLE_FIELDS)[number], string> = {
  Brand: 'Brand',
  CounterMark: 'Counter Mark',
  CargoType: 'Cargo Type',
  HazardClass: 'Hazard Class',
  UNNumber: 'UN Number',
  Packaging: 'Packaging',
};

function formatValue(
  value: string | number | Decimal | Date | null | undefined,
): string {
  if (value == null) {
    return '';
  }

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
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
  fileName: string | null,
): ApoioHumanoDocumentoDto {
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

function mapScalarCampos(
  entity: Record<string, unknown>,
  fields: readonly { key: string; label: string }[],
): CampoExtraidoDto[] {
  return fields.map(({ key, label }) =>
    buildCampo(key, label, formatValue(entity[key] as string | number | Date | null)),
  );
}

function mapCargoCampos(
  cargos: BlHouseCargo[],
  keyPrefix = '',
): CampoExtraidoDto[] {
  const prefix = keyPrefix ? `${keyPrefix}.` : '';
  const campos: CampoExtraidoDto[] = [];

  cargos.forEach((cargo, index) => {
    const logicalKey = buildCargoLogicalKey(cargo);
    const displayTitle = formatCargoDisplayTitle(cargo, index);
    const labelPrefix = keyPrefix ? `${keyPrefix} — ` : '';

    for (const field of CARGO_COMPARABLE_FIELDS) {
      const campoKey = `${prefix}cargo.${logicalKey}.${field}`;
      const label = `${labelPrefix}${displayTitle} — ${CARGO_FIELD_LABELS[field]}`;

      campos.push(
        buildCampo(campoKey, label, formatValue(cargo[field])),
      );
    }
  });

  return campos;
}

function mapNcmCampos(ncms: BlHouseNcm[], keyPrefix = ''): CampoExtraidoDto[] {
  const prefix = keyPrefix ? `${keyPrefix}.` : '';

  return ncms.map((ncm) => {
    const ncmCode = normalizeNcmCode(ncm.NcmCode);
    const campoKey = `${prefix}ncm.${ncmCode}`;

    return buildCampo(campoKey, `NCM ${ncmCode}`, ncmCode);
  });
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
      blVersion: master.BlVersion,
    },
    documento: buildDocumento(master.MasterNumber, master.FileName),
    campos: mapScalarCampos(master, MASTER_SCALAR_FIELDS),
  };
}

export function mapHouseApoioHumano(
  house: BlHouse,
  relations: { cargos: BlHouseCargo[]; ncms: BlHouseNcm[] } = {
    cargos: [],
    ncms: [],
  },
): {
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
      blVersion: house.BlVersion,
    },
    documento: buildDocumento(house.HouseNumber, house.FileName),
    campos: [
      ...mapScalarCampos(house, HOUSE_SCALAR_FIELDS),
      ...mapCargoCampos(relations.cargos),
      ...mapNcmCampos(relations.ncms),
    ],
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
