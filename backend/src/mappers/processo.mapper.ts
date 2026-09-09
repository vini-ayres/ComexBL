import type {
  BlConsultaGlobalSys,
  BlConferencia,
  BlDivergencia,
  BlHistoricoAlteracao,
  BlProcessoEtapa,
  BlWorkflow,
} from '@prisma/client';
import type { BlCampoRevisao } from '@prisma/client';
import {
  DEFAULT_PROCESSO_ETAPAS,
  type ProcessoTimelineEventType,
  type ProcessoTimelineItemStatus,
} from '../constants/processo-timeline.constants.js';
import {
  XML_DISPATCH_UI_STATUS,
  type XmlDispatchUiStatus,
} from '../constants/xml-dispatch.constants.js';
import type { BlDocumentType } from '../types/bl-domain.types.js';
import type { BlVersion } from '../constants/bl-version.constants.js';
import type {
  ProcessoTimelineEtapaDto,
  ProcessoTimelineEventDto,
  ProcessoTimelineResponseDto,
} from '../types/processo.types.js';

function mapEtapaStatus(status: string): ProcessoTimelineItemStatus {
  switch (status) {
    case 'concluido':
    case 'concluída':
    case 'finalizado':
      return 'concluido';
    case 'erro':
    case 'falha':
      return 'erro';
    case 'em_andamento':
    case 'processando':
      return 'em_andamento';
    case 'pendente':
      return 'pendente';
    default:
      return 'pendente';
  }
}

function mapWorkflowStatusToTimeline(status: string): ProcessoTimelineItemStatus {
  switch (status) {
    case 'finalizado':
      return 'concluido';
    case 'divergencia':
    case 'nao_encontrado':
      return 'erro';
    case 'processando':
    case 'apoio_humano':
    case 'conferencia_house_master':
      return 'em_andamento';
    default:
      return 'pendente';
  }
}

export function mapPersistedProcessoEtapa(
  etapa: BlProcessoEtapa,
): ProcessoTimelineEtapaDto {
  return {
    ordem: etapa.Ordem,
    titulo: etapa.Titulo,
    status: mapEtapaStatus(etapa.Status),
    descricao: etapa.Descricao,
    completedAt: etapa.CompletedAt?.toISOString() ?? null,
    source: 'persistido',
    events: etapa.CompletedAt
      ? [
          {
            id: `etapa-${etapa.Id}`,
            eventType: 'processo_etapa',
            titulo: etapa.Titulo,
            descricao: etapa.Descricao,
            status: mapEtapaStatus(etapa.Status),
            occurredAt: etapa.CompletedAt.toISOString(),
            source: 'persistido',
          },
        ]
      : [],
  };
}

export function mapHistoricoToTimelineEvent(
  historico: BlHistoricoAlteracao,
): ProcessoTimelineEventDto {
  const isResolucaoDivergencia = historico.Acao.startsWith('resolucao_divergencia');
  const isResolucaoConferencia = historico.Acao.startsWith('resolucao_conferencia');

  return {
    id: `historico-${historico.Id}`,
    eventType: isResolucaoDivergencia
      ? 'resolucao_divergencia'
      : isResolucaoConferencia
        ? 'conferencia_house_master'
        : 'apoio_humano',
    titulo: isResolucaoDivergencia
      ? 'Resolução de divergência'
      : isResolucaoConferencia
        ? 'Conferência House/Master'
        : historico.Acao,
    descricao: `${historico.Campo}: ${historico.ValorDepois}`,
    status: 'concluido',
    occurredAt: historico.CreatedAt.toISOString(),
    source: 'dinamico',
    metadata: {
      usuario: historico.Usuario,
      acao: historico.Acao,
    },
  };
}

export function mapConsultaGlobalSysEvent(
  consulta: BlConsultaGlobalSys,
): ProcessoTimelineEventDto {
  return {
    id: `globalsys-${consulta.Id}`,
    eventType: 'consulta_globalsys',
    titulo: consulta.Sucesso
      ? 'Consulta GlobalSys bem-sucedida'
      : 'Consulta GlobalSys sem resultado',
    descricao: consulta.Detalhe,
    status: consulta.Sucesso ? 'concluido' : 'erro',
    occurredAt: consulta.ExecutadoEm.toISOString(),
    source: 'dinamico',
    metadata: {
      tentativa: consulta.TentativaNumero,
      sucesso: consulta.Sucesso,
    },
  };
}

export function mapConferenciaEvent(
  conferencia: BlConferencia,
  kind: 'created' | 'resolved',
): ProcessoTimelineEventDto {
  if (kind === 'resolved' && conferencia.ResolvedAt) {
    return {
      id: `conferencia-resolved-${conferencia.Id}`,
      eventType: 'conferencia_house_master',
      titulo: 'Conferência House/Master resolvida',
      descricao: `Conferência ${conferencia.Id} marcada como resolvida`,
      status: 'concluido',
      occurredAt: conferencia.ResolvedAt.toISOString(),
      source: 'dinamico',
    };
  }

  return {
    id: `conferencia-created-${conferencia.Id}`,
    eventType: 'conferencia_house_master',
    titulo: 'Conferência House/Master',
    descricao: `Comparação de peso, volume e embalagem (${conferencia.Status})`,
    status:
      conferencia.Status === 'resolvido' || conferencia.Status === 'sem_divergencia'
        ? 'concluido'
        : 'em_andamento',
    occurredAt: conferencia.CreatedAt.toISOString(),
    source: 'dinamico',
  };
}

export function mapDivergenciaEvent(
  divergencia: BlDivergencia,
  kind: 'created' | 'resolved',
): ProcessoTimelineEventDto {
  if (kind === 'resolved' && divergencia.ResolvedAt) {
    return {
      id: `divergencia-resolved-${divergencia.Id}`,
      eventType: 'resolucao_divergencia',
      titulo: 'Divergências resolvidas',
      descricao: `Divergência ${divergencia.Id} marcada como resolvida`,
      status: 'concluido',
      occurredAt: divergencia.ResolvedAt.toISOString(),
      source: 'dinamico',
    };
  }

  return {
    id: `divergencia-created-${divergencia.Id}`,
    eventType: 'divergencia',
    titulo: 'Divergências identificadas',
    descricao: `Registro de divergência ${divergencia.Id} (${divergencia.Status})`,
    status: divergencia.Status === 'resolvido' ? 'concluido' : 'erro',
    occurredAt: divergencia.CreatedAt.toISOString(),
    source: 'dinamico',
  };
}

export function mapWorkflowEvent(workflow: BlWorkflow): ProcessoTimelineEventDto {
  return {
    id: `workflow-${workflow.Id}`,
    eventType: 'workflow',
    titulo: `Workflow: ${workflow.Status}`,
    descricao: workflow.Pendencia,
    status: mapWorkflowStatusToTimeline(workflow.Status),
    occurredAt: workflow.UpdatedAt.toISOString(),
    source: 'dinamico',
    metadata: {
      status: workflow.Status,
    },
  };
}

export function mapRevisaoEvent(revisao: BlCampoRevisao): ProcessoTimelineEventDto {
  return {
    id: `revisao-${revisao.Id}`,
    eventType: 'apoio_humano',
    titulo: `Revisão: ${revisao.CampoLabel}`,
    descricao: resolveRevisaoValor(revisao),
    status: revisao.Status === 'pendente' ? 'em_andamento' : 'concluido',
    occurredAt: revisao.UpdatedAt.toISOString(),
    source: 'dinamico',
  };
}

function resolveRevisaoValor(revisao: BlCampoRevisao): string | null {
  const manual = revisao.ValorManual?.trim();
  if (manual && manual !== '-') {
    return manual;
  }

  const recebido = revisao.ValorRecebido?.trim();
  if (recebido && recebido !== '-') {
    return recebido;
  }

  return null;
}

const XML_EVENT_COPY: Record<
  XmlDispatchUiStatus,
  { titulo: string; descricao: string; status: ProcessoTimelineItemStatus }
> = {
  [XML_DISPATCH_UI_STATUS.SUCESSO]: {
    titulo: 'XML integrado',
    descricao: 'Integrado no GlobalSys',
    status: 'concluido',
  },
  [XML_DISPATCH_UI_STATUS.ERRO]: {
    titulo: 'Erro na integração XML',
    descricao: 'XML não integrou no GlobalSys',
    status: 'erro',
  },
  [XML_DISPATCH_UI_STATUS.ENVIADO]: {
    titulo: 'XML enviado',
    descricao: 'Aguardando processamento no GlobalSys',
    status: 'em_andamento',
  },
  [XML_DISPATCH_UI_STATUS.FALHOU]: {
    titulo: 'Falha no envio do XML',
    descricao: 'Falha ao enviar o XML ao GlobalSys',
    status: 'erro',
  },
  [XML_DISPATCH_UI_STATUS.PENDENTE]: {
    titulo: 'Enviando XML',
    descricao: 'Envio do XML em andamento',
    status: 'em_andamento',
  },
  [XML_DISPATCH_UI_STATUS.NAO_ENVIADO]: {
    titulo: 'XML não enviado',
    descricao: 'Aguardando envio do XML',
    status: 'pendente',
  },
};

export function mapXmlDispatchEvent(params: {
  documentType: BlDocumentType;
  documentNumber: string;
  status: XmlDispatchUiStatus;
  occurredAt: Date;
  error: string | null;
}): ProcessoTimelineEventDto {
  const copy = XML_EVENT_COPY[params.status];

  return {
    id: `xml-dispatch-${params.documentType}-${params.documentNumber}`,
    eventType: 'xml_dispatch',
    titulo: copy.titulo,
    descricao: params.error?.trim() || copy.descricao,
    status: copy.status,
    occurredAt: params.occurredAt.toISOString(),
    source: 'dinamico',
    metadata: {
      xmlStatus: params.status,
    },
  };
}

function isProcessoFinalizadoEtapa(etapa: ProcessoTimelineEtapaDto): boolean {
  const titulo = etapa.titulo.trim().toLowerCase();
  return titulo === 'processo finalizado' || titulo === 'finalizado';
}

function hasXmlEtapa(etapas: ProcessoTimelineEtapaDto[]): boolean {
  return etapas.some(
    (etapa) =>
      etapa.events.some((event) => event.eventType === 'xml_dispatch') ||
      /xml|integra/i.test(etapa.titulo),
  );
}

function insertXmlEtapa(
  etapas: ProcessoTimelineEtapaDto[],
  xmlEvent: ProcessoTimelineEventDto | undefined,
): ProcessoTimelineEtapaDto[] {
  if (!xmlEvent || hasXmlEtapa(etapas)) {
    return etapas;
  }

  const xmlEtapa: ProcessoTimelineEtapaDto = {
    ordem: 0,
    titulo: 'Integração XML',
    status: xmlEvent.status,
    descricao: xmlEvent.descricao,
    completedAt: xmlEvent.status === 'concluido' ? xmlEvent.occurredAt : null,
    source: 'dinamico',
    events: [xmlEvent],
  };

  const next = [...etapas];
  const finalIdx = next.findIndex(isProcessoFinalizadoEtapa);
  if (finalIdx >= 0) {
    next.splice(finalIdx, 0, xmlEtapa);
  } else {
    next.push(xmlEtapa);
  }

  return next.map((etapa, index) => ({ ...etapa, ordem: index + 1 }));
}

function applyXmlIntegrationGate(
  etapas: ProcessoTimelineEtapaDto[],
  xmlEvent: ProcessoTimelineEventDto | undefined,
): ProcessoTimelineEtapaDto[] {
  const xmlStatus =
    typeof xmlEvent?.metadata?.xmlStatus === 'string'
      ? xmlEvent.metadata.xmlStatus
      : null;
  const hasNamedFinal = etapas.some(isProcessoFinalizadoEtapa);

  return etapas.map((etapa, index) => {
    const isTarget =
      isProcessoFinalizadoEtapa(etapa) ||
      (!hasNamedFinal && index === etapas.length - 1);

    if (!isTarget) {
      return etapa;
    }

    if (xmlStatus === XML_DISPATCH_UI_STATUS.SUCESSO) {
      return {
        ...etapa,
        status: 'concluido',
        completedAt: xmlEvent?.occurredAt ?? etapa.completedAt,
        descricao: 'Todos os passos foram concluídos com sucesso',
      };
    }

    if (
      xmlStatus === XML_DISPATCH_UI_STATUS.ERRO ||
      xmlStatus === XML_DISPATCH_UI_STATUS.FALHOU
    ) {
      return {
        ...etapa,
        status: 'erro',
        completedAt: null,
        descricao: xmlEvent?.descricao ?? 'XML não integrou no GlobalSys',
      };
    }

    if (
      xmlStatus === XML_DISPATCH_UI_STATUS.ENVIADO ||
      xmlStatus === XML_DISPATCH_UI_STATUS.PENDENTE
    ) {
      return {
        ...etapa,
        status: 'em_andamento',
        completedAt: null,
        descricao: xmlEvent?.descricao ?? 'Aguardando integração do XML no GlobalSys',
      };
    }

    if (etapa.status === 'concluido') {
      return {
        ...etapa,
        status: 'em_andamento',
        completedAt: null,
        descricao: 'Aguardando envio e integração do XML',
      };
    }

    return etapa;
  });
}

function findXmlDispatchEvent(
  events: ProcessoTimelineEventDto[],
): ProcessoTimelineEventDto | undefined {
  return [...events].reverse().find((event) => event.eventType === 'xml_dispatch');
}

function buildDynamicEtapa(
  template: (typeof DEFAULT_PROCESSO_ETAPAS)[number],
  events: ProcessoTimelineEventDto[],
): ProcessoTimelineEtapaDto {
  const etapaEvents = events.filter((event) => event.eventType === template.eventType);

  let status: ProcessoTimelineItemStatus = 'pendente';
  if (etapaEvents.some((event) => event.status === 'erro')) {
    status = 'erro';
  } else if (etapaEvents.some((event) => event.status === 'em_andamento')) {
    status = 'em_andamento';
  } else if (etapaEvents.length > 0) {
    status = 'concluido';
  }

  const completedAt =
    status === 'concluido' && etapaEvents.length > 0
      ? etapaEvents[etapaEvents.length - 1].occurredAt
      : null;

  return {
    ordem: template.ordem,
    titulo: template.titulo,
    status,
    descricao: etapaEvents.at(-1)?.descricao ?? null,
    completedAt,
    source: 'dinamico',
    events: etapaEvents,
  };
}

export function mapProcessoTimelineResponse(params: {
  documentType: BlDocumentType;
  documentNumber: string;
  blVersion: BlVersion;
  workflow: BlWorkflow | null;
  persistedEtapas: BlProcessoEtapa[];
  dynamicEvents: ProcessoTimelineEventDto[];
}): ProcessoTimelineResponseDto {
  const hasPersisted = params.persistedEtapas.length > 0;
  const dynamicEvents = [...params.dynamicEvents];

  if (params.workflow) {
    const workflowEvent = mapWorkflowEvent(params.workflow);
    if (!dynamicEvents.some((event) => event.id === workflowEvent.id)) {
      dynamicEvents.push(workflowEvent);
    }
  }

  const xmlEvent = findXmlDispatchEvent(dynamicEvents);

  const etapas: ProcessoTimelineEtapaDto[] = applyXmlIntegrationGate(
    insertXmlEtapa(
      hasPersisted
        ? params.persistedEtapas.map(mapPersistedProcessoEtapa)
        : DEFAULT_PROCESSO_ETAPAS.map((template) =>
            buildDynamicEtapa(template, dynamicEvents),
          ),
      xmlEvent,
    ),
    xmlEvent,
  );

  const events = [...dynamicEvents].sort(
    (a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime(),
  );

  return {
    documentType: params.documentType,
    documentNumber: params.documentNumber,
    blVersion: params.blVersion,
    workflowStatus: params.workflow?.Status ?? null,
    source: hasPersisted ? 'persistido' : 'dinamico',
    etapas,
    events,
  };
}

export function buildOcrIngestaoEvent(params: {
  documentType: BlDocumentType;
  documentNumber: string;
  occurredAt: Date;
  hasDraft: boolean;
  hasFinal: boolean;
}): ProcessoTimelineEventDto {
  return {
    id: `ocr-${params.documentType}-${params.documentNumber}`,
    eventType: 'ocr_ingestao',
    titulo: 'Ingestão OCR',
    descricao: `DRAFT: ${params.hasDraft ? 'sim' : 'não'} | FINAL: ${params.hasFinal ? 'sim' : 'não'}`,
    status: params.hasDraft || params.hasFinal ? 'concluido' : 'pendente',
    occurredAt: params.occurredAt.toISOString(),
    source: 'dinamico',
  };
}

export function buildFinalRecebidoEvent(params: {
  documentNumber: string;
  occurredAt: Date;
}): ProcessoTimelineEventDto {
  return {
    id: `final-${params.documentNumber}`,
    eventType: 'final_recebido',
    titulo: 'FINAL recebido',
    descricao: `Documento FINAL ${params.documentNumber} disponível`,
    status: 'concluido',
    occurredAt: params.occurredAt.toISOString(),
    source: 'dinamico',
  };
}

export function buildComparacaoEvent(params: {
  divergencia: BlDivergencia;
}): ProcessoTimelineEventDto {
  return {
    id: `comparacao-${params.divergencia.Id}`,
    eventType: 'comparacao',
    titulo: 'Comparação executada',
    descricao: `Resultado: ${params.divergencia.Status}`,
    status:
      params.divergencia.Status === 'sem_divergencia'
        ? 'concluido'
        : params.divergencia.Status === 'resolvido'
          ? 'concluido'
          : 'erro',
    occurredAt: params.divergencia.UpdatedAt.toISOString(),
    source: 'dinamico',
  };
}

export type { ProcessoTimelineEventType };
