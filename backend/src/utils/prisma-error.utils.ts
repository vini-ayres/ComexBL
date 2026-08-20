/** Mensagens curtas para persistir em BL_Workflow.Pendencia (NVARCHAR(500)). */

export function formatGlobalSysPersistError(error: unknown): string {
  const message = error instanceof Error ? error.message : '';

  if (/Unique constraint failed/i.test(message) && /BL_DivergenciaCampo/i.test(message)) {
    return 'Não foi possível gravar os campos da divergência (chave duplicada). Recompare o documento.';
  }

  if (/Unique constraint failed/i.test(message)) {
    return 'Não foi possível gravar a divergência por conflito de chave única. Recompare o documento.';
  }

  const firstLine = message.split('\n')[0]?.trim() ?? '';

  if (
    firstLine &&
    firstLine.length <= 180 &&
    !/invocation in/i.test(firstLine) &&
    !/^Invalid `/i.test(firstLine)
  ) {
    return firstLine;
  }

  return 'Falha ao persistir a comparação BL Final × GlobalSys. Tente recomparar.';
}

export function truncatePendencia(value: string, maxLength = 500): string {
  const compact = value.replace(/\s+/g, ' ').trim();

  if (compact.length <= maxLength) {
    return compact;
  }

  return `${compact.slice(0, maxLength - 1)}…`;
}
