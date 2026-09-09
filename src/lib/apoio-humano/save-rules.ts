import type { CampoExtraidoDto } from "@/lib/api/types"

export const CONTAINER_NUMBER_CAMPO_KEY = "ContainerNumber"

export const APOIO_HUMANO_SAVE_MESSAGES = {
  pendingCampos: "Confirme todos os campos pendentes antes de salvar.",
  containerNumberRequired: "Container Number é obrigatório e não pode ficar vazio.",
} as const

const EMPTY_PLACEHOLDERS = new Set([
  "-",
  "–",
  "—",
  "−",
  ".",
  "n/a",
  "na",
  "null",
  "none",
  "nil",
  "undefined",
  "vazio",
  "empty",
])

export function isEmptyApoioHumanoValue(value: string | null | undefined): boolean {
  if (value == null) {
    return true
  }

  const trimmed = value.replace(/[\s\u200b\u200c\u200d\ufeff]/g, "").trim()

  if (!trimmed) {
    return true
  }

  return EMPTY_PLACEHOLDERS.has(trimmed.toLowerCase())
}

export function isContainerNumberCampoKey(campoKey: string): boolean {
  const compact = campoKey.trim().toLowerCase().replace(/[^a-z0-9.]/g, "")

  return compact === "containernumber" || compact.endsWith(".containernumber")
}

export function isContainerNumberCampo(campo: Pick<CampoExtraidoDto, "id" | "campo">): boolean {
  if (isContainerNumberCampoKey(campo.id)) {
    return true
  }

  return /^container\s*number$/i.test(campo.campo.trim())
}

export function resolveApoioHumanoCampoEffectiveValue(campo: Pick<
  CampoExtraidoDto,
  "valorRecebido" | "valorManual" | "status"
>): string {
  const manual = campo.valorManual?.trim() ?? ""

  if (campo.status === "editado" && !isEmptyApoioHumanoValue(manual)) {
    return manual
  }

  if (!isEmptyApoioHumanoValue(manual)) {
    return manual
  }

  return campo.valorRecebido?.trim() ?? ""
}

export function hasUsableContainerNumber(value: string | null | undefined): boolean {
  if (isEmptyApoioHumanoValue(value)) {
    return false
  }

  return /[A-Za-z0-9]/.test(value ?? "")
}

export function isEmptyContainerNumber(campo: CampoExtraidoDto): boolean {
  return (
    isContainerNumberCampo(campo) &&
    !hasUsableContainerNumber(resolveApoioHumanoCampoEffectiveValue(campo))
  )
}

export function enforceContainerNumberPending(
  campos: CampoExtraidoDto[],
): CampoExtraidoDto[] {
  return campos.map((campo) => {
    if (!isEmptyContainerNumber(campo)) {
      return campo
    }

    return {
      ...campo,
      status: "pendente",
    }
  })
}

export function getApoioHumanoSaveBlockReason(
  campos: CampoExtraidoDto[],
  isEditing = false,
): string | null {
  const normalized = enforceContainerNumberPending(campos)

  if (normalized.some(isEmptyContainerNumber) || !normalized.some(isContainerNumberCampo)) {
    return APOIO_HUMANO_SAVE_MESSAGES.containerNumberRequired
  }

  if (isEditing || normalized.some((campo) => campo.status === "pendente")) {
    return APOIO_HUMANO_SAVE_MESSAGES.pendingCampos
  }

  return null
}
