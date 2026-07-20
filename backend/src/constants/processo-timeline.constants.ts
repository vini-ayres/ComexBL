/** Tipos de evento na timeline dinâmica do processo. */
export type ProcessoTimelineEventType =
  | 'ocr_ingestao'
  | 'apoio_humano'
  | 'final_recebido'
  | 'comparacao'
  | 'divergencia'
  | 'resolucao_divergencia'
  | 'consulta_globalsys'
  | 'workflow'
  | 'processo_etapa';

/** Status visual de um item da timeline. */
export type ProcessoTimelineItemStatus =
  | 'pendente'
  | 'em_andamento'
  | 'concluido'
  | 'erro'
  | 'nao_aplicavel';

/** Etapas padrão quando BL_ProcessoEtapa não possui registros. */
export const DEFAULT_PROCESSO_ETAPAS = [
  { ordem: 1, titulo: 'Ingestão OCR', eventType: 'ocr_ingestao' as const },
  { ordem: 2, titulo: 'Apoio Humano', eventType: 'apoio_humano' as const },
  { ordem: 3, titulo: 'FINAL recebido', eventType: 'final_recebido' as const },
  { ordem: 4, titulo: 'Comparação', eventType: 'comparacao' as const },
  { ordem: 5, titulo: 'Divergências', eventType: 'divergencia' as const },
  { ordem: 6, titulo: 'Resolução', eventType: 'resolucao_divergencia' as const },
  { ordem: 7, titulo: 'Processo finalizado', eventType: 'workflow' as const },
] as const;
