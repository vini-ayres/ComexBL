import type { CampoExtraidoDto } from "@/lib/api/types"

const CARGO_FIELD_SUFFIX =
  /^(Brand|CounterMark|CargoType|HazardClass|UNNumber|Packaging)$/

export interface CargoCampoGroup {
  key: string
  label: string
  campos: CampoExtraidoDto[]
}

export function resolveCargoGroupKey(campoId: string): string {
  const match = campoId.match(/^cargo\.(.+)\.(Brand|CounterMark|CargoType|HazardClass|UNNumber|Packaging)$/)
  return match?.[1] ?? campoId
}

export function splitCargoCampoLabel(campo: string): {
  groupLabel: string
  fieldLabel: string
} {
  const separator = " — "
  const idx = campo.lastIndexOf(separator)

  if (idx >= 0) {
    return {
      groupLabel: campo.slice(0, idx),
      fieldLabel: campo.slice(idx + separator.length),
    }
  }

  return { groupLabel: campo, fieldLabel: campo }
}

export function resolveCargoFieldLabel(campo: CampoExtraidoDto): string {
  const { fieldLabel } = splitCargoCampoLabel(campo.campo)
  return fieldLabel
}

export function groupCargoCampos(campos: CampoExtraidoDto[]): CargoCampoGroup[] {
  const grouped = new Map<string, CampoExtraidoDto[]>()

  for (const campo of campos) {
    const key = resolveCargoGroupKey(campo.id)
    const current = grouped.get(key) ?? []
    current.push(campo)
    grouped.set(key, current)
  }

  return [...grouped.entries()].map(([key, items]) => {
    const { groupLabel } = splitCargoCampoLabel(items[0]?.campo ?? key)

    return {
      key,
      label: groupLabel,
      campos: items,
    }
  })
}

export function isCargoFieldSuffix(value: string): boolean {
  return CARGO_FIELD_SUFFIX.test(value)
}
