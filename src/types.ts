export interface Usuario {
  id: string;
  nome: string;
  email: string;
  cargo: string;
  orgao: string;
  papel: 'ADMIN' | 'GESTOR_LICITACOES' | 'AUDITOR' | 'OPERADOR';
}

export interface HistoricoStatus {
  id_historico_status: number;
  id_processo: number;
  id_status_processo: number;
  nome_status: string;
  data_status: string;
  observacao: string;
}

export interface TermoReferencia {
  id_tr: number;
  ano_tr: number;
  num_tr: string;
  id_processo: number;
}

export interface Licitacao {
  id: number;
  id_processo?: number;
  ano_processo?: number;
  codigo_pca?: string | null;
  num_proc_planejamento?: string | null;
  num_proc_selecao?: string | null;
  num_pregao?: string | null;
  num_etp?: string | null;
  numero_processo: string;
  numero_licitacao: string;
  ano: number;
  modalidade: string;
  id_modalidade?: number;
  criterio_julgamento: string;
  objeto: string;
  orgao_setor: string;
  valor_pca?: number;
  valor_estimado: number;
  valor_homologado: number | null;
  status: string;
  id_status?: number;
  data_abertura: string | null;
  data_homologacao: string | null;
  pregoeiro_responsavel: string;
  link_edital?: string;
  observacoes?: string;
  created_at: string;
  updated_at: string;
  termo_referencia?: TermoReferencia | null;
  total_itens?: number;
  total_empenhos?: number;
  total_empenhado?: number;
  historico?: HistoricoStatus[];
  itens?: ItemLicitacao[];
  empenhos?: Contrato[];
}

export interface ItemLicitacao {
  id: number;
  id_tr_produto?: number;
  licitacao_id: number;
  id_processo?: number;
  id_tr?: number;
  numero_item: number;
  id_produto?: number;
  nome_produto?: string;
  descricao_produto?: string;
  descricao: string;
  unidade?: string;
  unidade_medida: string;
  quantidade_produto?: number;
  quantidade: number;
  codigo_catmat?: string;
  nome_classe?: string;
  marcas_referencia?: string[];
  valor_unitario_estimado: number;
  valor_unitario_homologado: number | null;
  valor_total_estimado?: number;
  valor_total_homologado?: number | null;
  fornecedor_vencedor_id: number | null;
  fornecedor_vencedor_nome?: string | null;
  status_item: string;
  created_at?: string;
}

export interface ProdutoCatalogo {
  id_produto: number;
  codigo_catmat: string;
  descricao_catmat?: string;
  nome_produto: string;
  descricao_produto: string;
  unidade: string;
  id_lote?: number | null;
  nome_lote?: string;
  descricao_lote?: string;
  id_classe?: number | null;
  nome_classe?: string;
  marcas?: string[];
}

export interface Fornecedor {
  id: number;
  id_fornecedor?: number;
  razao_social: string;
  nome_fornecedor?: string;
  nome_fantasia?: string;
  cnpj_cpf: string;
  cnpj?: string;
  email: string;
  email_fornecedor?: string;
  telefone: string;
  telefones?: string[];
  uf: string;
  cidade?: string;
  estado?: string;
  logradouro?: string;
  bairro?: string;
  num_casa?: string;
  porte: string;
  situacao_cadastral: string;
  total_empenhado?: number;
  total_empenhos?: number;
  total_itens_homologados?: number;
  created_at?: string;
}

export interface Contrato {
  id: number;
  id_empenho?: number;
  numero_contrato: string;
  numero_empenho?: string;
  ano_empenho?: number;
  licitacao_id: number;
  id_processo?: number;
  fornecedor_id: number;
  id_fornecedor?: number;
  objeto_resumo: string;
  valor_global: number;
  valor_empenho?: number;
  enviado?: boolean;
  data_envio?: string | null;
  num_processo_pagamento?: string | null;
  pagamento_concluido?: boolean;
  data_assinatura: string;
  data_inicio_vigencia: string;
  data_fim_vigencia: string;
  status_contrato: 'VIGENTE' | 'ENCERRADO' | 'RESCINDIDO' | 'PRORROGADO';
  fiscal_titular: string;
  numero_licitacao?: string;
  num_proc_selecao?: string;
  fornecedor_nome?: string;
  fornecedor_cnpj?: string;
  itens_empenhados?: {
    id_empenho_produto: number;
    numero_item: number;
    nome_produto: string;
    quantidade: number;
    valor_unitario: number;
    valor_total: number;
  }[];
}

export interface LogAuditoria {
  id: number;
  timestamp: string;
  usuario_id: string;
  usuario_nome: string;
  usuario_email: string;
  usuario_papel: string;
  acao: string;
  entidade: string;
  registro_id: string;
  registro_identificador: string;
  detalhes: Record<string, any>;
  ip_origem: string;
}

export interface DashboardStats {
  totalLicitacoes: number;
  totalEstimado: number;
  totalHomologado: number;
  economiaAbsoluta: number;
  percentualDesconto: number;
  totalPCA: number;
  totalEmpenhado: number;
  totalEmpenhos: number;
  empenhosEnviados: number;
  empenhosPagos: number;
  empenhosPendentesPagamento: number;
  statusCounts: Record<string, number>;
  modalidadeStats: Record<string, { count: number; totalValor: number }>;
  anosStats: Record<string, { count: number; valor: number }>;
  totalContratos: number;
  totalValorContratos: number;
  contratosVigentes: number;
  totalFornecedores: number;
  totalAuditorias: number;
  fasesSams: {
    faseId: number;
    nomeFase: string;
    count: number;
    processos: string[];
  }[];
  topFornecedoresEmpenhados: {
    nome: string;
    cnpj: string;
    valor: number;
    countEmpenhos: number;
  }[];
  pcaPorAno?: Record<string, { countProcessos: number; valorPCA: number }>;
  empenhosPorAno?: Record<string, { countProcessos: number; countEmpenhos: number; valorEmpenhado: number }>;
  pagamentosPorAno?: Record<
    string,
    {
      countProcessosConcluidos: number;
      countNotasPagas: number;
      countNotasPendentes: number;
    }
  >;
  processosComPagamentosPendentes?: {
    id_processo: number;
    ano: number;
    num_proc_selecao: string;
    num_proc_planejamento?: string;
    codigo_pca?: string;
    objeto?: string;
    empenhosPendentesCount: number;
    valorPendente: number;
  }[];
  dumpFilename?: string;
}

export interface ConnectionStatus {
  config: {
    host: string;
    port: number;
    database: string;
    user: string;
  };
  isConnected: boolean;
  lastError: string | null;
  lastCheckedAt: string | null;
  mode: 'POSTGRESQL_DIRECT' | 'LOCAL_REPLICA_SYNCHRONIZED';
  dumpFilename?: string;
  totalRecords: {
    licitacoes: number;
    itens: number;
    fornecedores: number;
    contratos: number;
    auditoria: number;
    produtos?: number;
    termosReferencia?: number;
  };
}
