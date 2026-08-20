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

const FIELD_LABELS: Record<string, string> = {
  vesselName: "Vessel Name",
  voyage: "Voyage",
  carrierScacCode: "Carrier SCAC Code",
  carrierName: "Carrier Name",
  freightTerm: "Freight Term",
  containerNumber: "Container Number",
  containerSealNo1: "Container Seal No 1",
  containerType: "Container Type",
  packingQuantity: "Packing Quantity",
  packingQuantityUnitCode: "Packing Quantity Unit Code",
  grossWeight: "Gross Weight",
  volumeMeasure: "Volume Measure",
  shipperName: "Shipper Name",
  ShipperName: "Shipper Name",
  consigneeName: "Consignee Name",
  ConsigneeName: "Consignee Name",
  notifyName: "Notify Name",
  NotifyName: "Notify Name",
  deliveryPortName: "Delivery Port Name",
  DeliveryPortName: "Delivery Port Name",
  itemName: "Item Name",
  ItemName: "Item Name",
  issueDate: "Issue Date",
  IssueDate: "Issue Date",
  Brand: "Brand",
  brand: "Brand",
  CounterMark: "Counter Mark",
  counterMark: "Counter Mark",
  CargoType: "Cargo Type",
  cargoType: "Cargo Type",
  HazardClass: "Hazard Class",
  hazardClass: "Hazard Class",
  UNNumber: "UN Number",
  unNumber: "UN Number",
  Packaging: "Packaging",
  packaging: "Packaging",
}

export function isPresenceCampo(campoKey: string, campoLabel?: string | null): boolean {
  const leaf = getLeafCampoKey(campoKey)
  return (
    leaf === "__presence__"
    || leaf === "__presence"
    || campoKey.includes("__presence")
    || (campoLabel?.includes("__presence") ?? false)
  )
}

export function mapCamposToDisplayRows(
  campos: DivergenciaCampoDto[],
): DivergenceDisplayRow[] {
  return campos
    .filter((campo) => !isPresenceCampo(campo.campoKey, campo.campoLabel))
    .map((campo) => {
      const categoria = resolveUiCategoria(campo.campoKey, campo.categoria)

      return {
        id: campo.id,
        campoKey: campo.campoKey,
        campoLabel: campo.campoLabel,
        valorBlFinal: campo.valorBlFinal,
        valorGlobalSys: campo.valorGlobalSys,
        status: campo.status,
        categoria,
        pending: campo.status === "pendente",
        sectionKey: resolveSectionKey(campo.campoKey, categoria),
        indexKey: resolveIndexKey(campo.campoKey, categoria),
      }
    })
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

export function groupAllDivergenceSections(
  rows: DivergenceDisplayRow[],
): DivergenceDisplaySection[] {
  const pendingFirst = (sectionRows: DivergenceDisplayRow[]) =>
    [...sectionRows].sort((a, b) => Number(b.pending) - Number(a.pending))

  const masterRows = pendingFirst(rows.filter((row) => row.categoria === "master"))
  const houseSections = groupRowsBySection(rows.filter((row) => row.categoria === "house"))
  const cargoGroups = groupRowsByIndex(rows.filter((row) => row.categoria === "cargo"), "cargo")
  const ncmGroups = groupRowsByIndex(rows.filter((row) => row.categoria === "ncm"), "ncm")

  return [
    ...(masterRows.length > 0
      ? [{ key: "master", label: "Master", rows: masterRows }]
      : []),
    ...houseSections.map((section) => ({
      ...section,
      rows: pendingFirst(section.rows),
    })),
    ...cargoGroups.map((section) => ({
      ...section,
      rows: pendingFirst(section.rows),
    })),
    ...ncmGroups.map((section) => ({
      ...section,
      rows: pendingFirst(section.rows),
    })),
  ]
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

  return [...grouped.entries()].map(([key, groupRows], index) => ({
    key,
    label: kind === "ncm" ? formatNcmGroupLabel(key) : formatCargoGroupLabel(key, index),
    rows: groupRows,
  }))
}

export function resolveFieldLabel(campoKey: string, campoLabel?: string | null): string {
  const leaf = getLeafCampoKey(campoKey)

  if (FIELD_LABELS[leaf]) {
    return FIELD_LABELS[leaf]
  }

  if (campoLabel?.trim()) {
    const stripped = stripHousePrefix(campoLabel.trim())
    if (FIELD_LABELS[stripped]) {
      return FIELD_LABELS[stripped]
    }
    if (stripped && !stripped.includes("__presence") && !stripped.startsWith("house.")) {
      return stripped
    }
  }

  return titleizeLeaf(leaf)
}

function getLeafCampoKey(campoKey: string): string {
  const parts = campoKey.split(".")
  return parts[parts.length - 1] ?? campoKey
}

function stripHousePrefix(label: string): string {
  return label.replace(/^house\.[^\s—-]+\s*[—-]\s*/i, "").trim()
}

function titleizeLeaf(leaf: string): string {
  if (!leaf || leaf.includes(":") || leaf.includes("|") || leaf.startsWith("__")) {
    return leaf
  }

  const spaced = leaf
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (char) => char.toUpperCase())
    .trim()

  return spaced || leaf
}

function formatCargoGroupLabel(indexKey: string, index: number): string {
  const ordinal = index + 1

  if (indexKey.startsWith("hazmat:")) {
    const [hazard, un] = indexKey.slice("hazmat:".length).split("|")
    const parts = [
      hazard ? `Classe ${hazard}` : null,
      un ? `UN ${un}` : null,
    ].filter(Boolean)

    return parts.length > 0
      ? `Cargo ${ordinal} · Perigoso · ${parts.join(" · ")}`
      : `Cargo ${ordinal}`
  }

  if (indexKey.startsWith("cargo:id:")) {
    return `Cargo ${ordinal}`
  }

  if (indexKey.startsWith("cargo:")) {
    const [brand, counterMark, cargoType] = indexKey.slice("cargo:".length).split("|")
    const parts = [
      brand ? `Marca ${brand}` : null,
      counterMark ? `Contramarca ${counterMark}` : null,
      cargoType || null,
    ].filter(Boolean)

    return parts.length > 0
      ? `Cargo ${ordinal} · ${parts.join(" · ")}`
      : `Cargo ${ordinal}`
  }

  if (indexKey.includes("__presence") || indexKey.includes("house.")) {
    return `Cargo ${ordinal}`
  }

  return `Cargo ${ordinal}`
}

function formatNcmGroupLabel(indexKey: string): string {
  const code = indexKey.includes(".") ? (indexKey.split(".").pop() ?? indexKey) : indexKey
  return `NCM ${code}`
}

function resolveUiCategoria(
  campoKey: string,
  categoria: string,
): DivergenceDocumentTab {
  if (
    categoria === "master"
    || categoria === "house"
    || categoria === "cargo"
    || categoria === "ncm"
  ) {
    return categoria
  }

  if (campoKey.startsWith("house.") || campoKey.includes(".house.")) {
    return "house"
  }

  if (campoKey.startsWith("cargo.") || campoKey.includes(".cargo.")) {
    return "cargo"
  }

  if (campoKey.startsWith("ncm.") || campoKey.includes(".ncm.")) {
    return "ncm"
  }

  return "master"
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

    return "House"
  }

  return "geral"
}

function resolveIndexKey(
  campoKey: string,
  categoria: DivergenciaCampoDto["categoria"],
): string {
  if (categoria === "cargo") {
    const match = campoKey.match(/(?:^|\.)cargo\.(.+)\.([^.\s]+)$/)
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

