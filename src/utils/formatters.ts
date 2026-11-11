export const formatMoney = (val: number | null | undefined): string => {
  if (val === null || val === undefined || isNaN(val)) return '—';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(val);
};

export const formatDate = (val: string | null | undefined): string => {
  if (!val) return '—';
  try {
    const parts = val.split('T')[0].split(' ')[0].split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return new Date(val).toLocaleDateString('pt-BR');
  } catch {
    return val;
  }
};

export const formatDateTime = (val: string | null | undefined): string => {
  if (!val) return '—';
  try {
    const d = new Date(val);
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return val;
  }
};

export const MODALIDADES_MAP: Record<string, string> = {
  PREGÃO: 'Pregão Eletrônico',
  PREGAO: 'Pregão',
  PREGAO_ELETRONICO: 'Pregão Eletrônico',
  DISPENSA: 'Dispensa de Licitação',
  DISPENSA_LICITACAO: 'Dispensa de Licitação',
  CONCORRÊNCIA: 'Concorrência',
  CONCORRENCIA: 'Concorrência',
  CONCURSO: 'Concurso',
  LEILÃO: 'Leilão',
  LEILAO: 'Leilão',
  'DIÁLOGO COMPETITIVO': 'Diálogo Competitivo',
  DIALOGO_COMPETITIVO: 'Diálogo Competitivo',
  INEXIGIBILIDADE: 'Inexigibilidade',
};

export const STATUS_MAP: Record<string, { label: string; textClass: string; badgeBg: string }> = {
  // SAMS Official 7-Phase Workflow
  'ETP E GR EM ELABORAÇÃO': {
    label: '1. ETP e GR em Elaboração',
    textClass: 'text-amber-400',
    badgeBg: 'bg-amber-950/40 border-amber-800/60 text-amber-300',
  },
  'ETP E GR ENVIADOS PARA SETEC': {
    label: '2. ETP e GR enviados p/ SETEC',
    textClass: 'text-amber-300',
    badgeBg: 'bg-amber-950/40 border-amber-700/60 text-amber-200',
  },
  'TR ENVIADO PARA SETEC': {
    label: '3. TR enviado p/ SETEC',
    textClass: 'text-sky-400',
    badgeBg: 'bg-sky-950/40 border-sky-800/60 text-sky-300',
  },
  'INICIADA SELEÇÃO FORNECEDOR': {
    label: '4. Iniciada Seleção Fornecedor',
    textClass: 'text-indigo-400',
    badgeBg: 'bg-indigo-950/40 border-indigo-800/60 text-indigo-300',
  },
  'PROPOSTAS ANALISADAS': {
    label: '5. Propostas Analisadas',
    textClass: 'text-cyan-400',
    badgeBg: 'bg-cyan-950/40 border-cyan-800/60 text-cyan-300',
  },
  'EMPENHOS EMITIDOS': {
    label: '6. Empenhos Emitidos',
    textClass: 'text-emerald-400',
    badgeBg: 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300',
  },
  'PROCESSO ARQUIVADO': {
    label: '7. Processo Arquivado',
    textClass: 'text-slate-400',
    badgeBg: 'bg-slate-900 border-slate-700 text-slate-300',
  },

  // Generic / Compatibility fallbacks
  EM_ANDAMENTO: {
    label: 'Em Andamento',
    textClass: 'text-amber-400',
    badgeBg: 'bg-amber-950/40 border-amber-800/60 text-amber-300',
  },
  PUBLICADA: {
    label: 'Publicada',
    textClass: 'text-sky-400',
    badgeBg: 'bg-sky-950/40 border-sky-800/60 text-sky-300',
  },
  HOMOLOGADA: {
    label: 'Homologada',
    textClass: 'text-emerald-400',
    badgeBg: 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300',
  },
  CONCLUIDA: {
    label: 'Concluída',
    textClass: 'text-teal-300',
    badgeBg: 'bg-teal-950/40 border-teal-800/60 text-teal-300',
  },
  REVOGADA: {
    label: 'Revogada',
    textClass: 'text-rose-400',
    badgeBg: 'bg-rose-950/40 border-rose-800/60 text-rose-300',
  },
  FRACASSADA: {
    label: 'Fracassada',
    textClass: 'text-rose-400',
    badgeBg: 'bg-rose-950/40 border-rose-800/60 text-rose-300',
  },
  DESERTA: {
    label: 'Deserta',
    textClass: 'text-amber-500',
    badgeBg: 'bg-amber-950/40 border-amber-800/60 text-amber-300',
  },
};

export const CONTRATO_STATUS_MAP: Record<string, { label: string; textClass: string; badgeBg: string }> = {
  VIGENTE: { label: 'Vigente', textClass: 'text-emerald-400', badgeBg: 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300' },
  ENCERRADO: { label: 'Concluído / Pago', textClass: 'text-teal-400', badgeBg: 'bg-teal-950/40 border-teal-800/60 text-teal-300' },
  RESCINDIDO: { label: 'Rescindido', textClass: 'text-rose-400', badgeBg: 'bg-rose-950/40 border-rose-800/60 text-rose-300' },
  PRORROGADO: { label: 'Prorrogado', textClass: 'text-indigo-400', badgeBg: 'bg-indigo-950/40 border-indigo-800/60 text-indigo-300' },
};

export const ACAO_AUDITORIA_MAP: Record<string, { label: string; textClass: string }> = {
  INSERCAO: { label: 'Inserção', textClass: 'text-emerald-400' },
  EDICAO: { label: 'Edição', textClass: 'text-sky-400' },
  DELECAO: { label: 'Exclusão', textClass: 'text-rose-400' },
  AVANCO_FASE: { label: 'Avanço de Fase', textClass: 'text-purple-400' },
  SINCRONIZACAO_DUMP: { label: 'Carga de Dump', textClass: 'text-teal-300' },
  CONSULTA_AVANCADA: { label: 'Consulta', textClass: 'text-slate-300' },
  EXPORTACAO: { label: 'Exportação', textClass: 'text-amber-400' },
  LOGIN: { label: 'Autenticação', textClass: 'text-indigo-400' },
  LOGOUT: { label: 'Logout', textClass: 'text-slate-400' },
  TESTE_CONEXAO: { label: 'Teste BD', textClass: 'text-cyan-400' },
  RECONFIGURACAO_BANCO: { label: 'Config BD', textClass: 'text-purple-400' },
};
