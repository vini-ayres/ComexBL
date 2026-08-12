import type { BlDocumentType, DivergenciaCampoDto } from "@/lib/api/types"

export interface DivergenceDisplayRow {
  id: number
  campoKey: string
  campoLabel: string
  valorBlFinal: string
  valorGlobalSys: string
  status: string
  categoria: DivergenciaCampoDto["categoria"]
  pending: boolean
  sectionKey: string
  indexKey: string
}

export interface DivergenceDisplaySection {
  key: string
  label: string
  rows: DivergenceDisplayRow[]
}

export type DivergenceDocumentTab = "master" | "house" | "cargo" | "ncm"

export function mapCamposToDisplayRows(
  campos: DivergenciaCampoDto[],
): DivergenceDisplayRow[] {
  return campos.map((campo) => ({
    id: campo.id,
    campoKey: campo.campoKey,
    campoLabel: campo.campoLabel,
    valorBlFinal: campo.valorBlFinal,
    valorGlobalSys: campo.valorGlobalSys,
    status: campo.status,
    categoria: campo.categoria,
    pending: campo.status === "pendente",
    sectionKey: resolveSectionKey(campo.campoKey, campo.categoria),
    indexKey: resolveIndexKey(campo.campoKey, campo.categoria),
  }))
}

export function filterRowsForDocumentTab(
  rows: DivergenceDisplayRow[],
  tab: DivergenceDocumentTab,
  documentType: BlDocumentType,
): DivergenceDisplayRow[] {
  if (tab === "cargo") {
    return rows.filter((row) => row.categoria === "cargo")
  }

  if (tab === "ncm") {
    return rows.filter((row) => row.categoria === "ncm")
  }

  if (documentType === "Master") {
    if (tab === "master") {
      return rows.filter((row) => row.categoria === "master")
    }

    return rows.filter((row) => row.categoria === "house")
  }

  if (tab === "master") {
    return []
  }

  return rows.filter((row) => row.categoria === "master" || row.categoria === "house")
}

export function groupRowsBySection(
  rows: DivergenceDisplayRow[],
): DivergenceDisplaySection[] {
  const grouped = new Map<string, DivergenceDisplayRow[]>()

  for (const row of rows) {
    const current = grouped.get(row.sectionKey) ?? []
    current.push(row)
    grouped.set(row.sectionKey, current)
  }

  return [...grouped.entries()].map(([key, sectionRows]) => ({
    key,
    label: key === "geral" ? "Campos gerais" : key,
    rows: sectionRows,
  }))
}

export function groupRowsByIndex(
  rows: DivergenceDisplayRow[],
  kind: "cargo" | "ncm",
): DivergenceDisplaySection[] {
  const grouped = new Map<string, DivergenceDisplayRow[]>()

  for (const row of rows) {
    const current = grouped.get(row.indexKey) ?? []
    current.push(row)
    grouped.set(row.indexKey, current)
  }

  return [...grouped.entries()].map(([key, groupRows]) => ({
    key,
    label: kind === "ncm" ? `NCM ${key}` : `Cargo ${key}`,
    rows: groupRows,
  }))
}

export function resolveFieldLabel(campoKey: string, campoLabel?: string | null): string {
  if (campoLabel?.trim()) {
    return campoLabel.trim()
  }

  return campoKey
}

function resolveSectionKey(
  campoKey: string,
  categoria: DivergenciaCampoDto["categoria"],
): string {
  if (categoria === "house") {
    const match = campoKey.match(/^house\.([^.\s]+)/)
    if (match) {
      return `House ${match[1]}`
    }
  }

  return "geral"
}

function resolveIndexKey(
  campoKey: string,
  categoria: DivergenciaCampoDto["categoria"],
): string {
  if (categoria === "cargo") {
    const match = campoKey.match(/(?:^|\.)cargo\.(.+)\.(Brand|CounterMark|CargoType|HazardClass|UNNumber|Packaging|__presence__)$/)
    if (match) {
      return match[1]
    }
  }

  if (categoria === "ncm") {
    const match = campoKey.match(/(?:^|\.)ncm\.([^.\s]+)$/)
    if (match) {
      return match[1]
    }
  }

  return campoKey
}
