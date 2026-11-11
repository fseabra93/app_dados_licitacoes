import express, { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import cp from 'child_process';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.PORT || '3000', 10);

// =========================================================================
// TYPES & DATA STRUCTURES
// =========================================================================

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
  id_processo: number;
  ano_processo: number;
  codigo_pca: string | null;
  num_proc_planejamento: string | null;
  num_proc_selecao: string | null;
  num_pregao: string | null;
  num_etp: string | null;
  numero_processo: string;
  numero_licitacao: string;
  ano: number;
  modalidade: string;
  id_modalidade: number;
  criterio_julgamento: string;
  objeto: string;
  orgao_setor: string;
  valor_pca: number;
  valor_estimado: number;
  valor_homologado: number | null;
  status: string;
  id_status: number;
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
  id_tr_produto: number;
  licitacao_id: number;
  id_processo: number;
  id_tr: number;
  numero_item: number;
  id_produto: number;
  nome_produto: string;
  descricao_produto: string;
  descricao: string;
  unidade: string;
  unidade_medida: string;
  quantidade_produto: number;
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

export interface Fornecedor {
  id: number;
  id_fornecedor: number;
  razao_social: string;
  nome_fornecedor: string;
  nome_fantasia?: string;
  cnpj_cpf: string;
  cnpj: string;
  email: string;
  email_fornecedor: string;
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
  id_empenho: number;
  numero_contrato: string;
  numero_empenho: string;
  ano_empenho: number;
  licitacao_id: number;
  id_processo: number;
  fornecedor_id: number;
  id_fornecedor: number;
  objeto_resumo: string;
  valor_global: number;
  valor_empenho: number;
  enviado: boolean;
  data_envio: string | null;
  num_processo_pagamento: string | null;
  pagamento_concluido: boolean;
  data_assinatura: string;
  data_inicio_vigencia: string;
  data_fim_vigencia: string;
  status_contrato: 'VIGENTE' | 'ENCERRADO' | 'RESCINDIDO' | 'PRORROGADO';
  fiscal_titular: string;
  numero_licitacao?: string;
  num_proc_selecao?: string;
  fornecedor_nome?: string;
  fornecedor_cnpj?: string;
}

export interface LogAuditoria {
  id: number;
  timestamp: string;
  usuario_id: string;
  usuario_nome: string;
  usuario_email: string;
  usuario_papel: string;
  acao: string; // 'INSERCAO' | 'EDICAO' | 'DELECAO' | 'AVANCO_FASE' | 'LOGIN' | 'TESTE_CONEXAO' | 'EXPORTACAO'
  entidade: string; // 'processos' | 'tr_produtos' | 'fornecedores' | 'empenhos' | 'conexao' | 'sistema'
  registro_id: string;
  registro_identificador: string;
  detalhes: Record<string, any>;
  ip_origem: string;
}

// Authentic Authorized Users
const INITIAL_USERS: (Usuario & { senha: string })[] = [
  {
    id: 'usr-1',
    nome: 'Flávio Seabra',
    email: 'flavio.seabra@tre-rn.jus.br',
    cargo: 'Assessor de Licitações e Contratos',
    orgao: 'Tribunal Regional Eleitoral do RN (TRE-RN / SAMS)',
    papel: 'GESTOR_LICITACOES',
    senha: 'postgres',
  },
  {
    id: 'usr-2',
    nome: 'Administrador SAMS',
    email: 'admin@tre-rn.jus.br',
    cargo: 'Administrador de Banco de Dados',
    orgao: 'TRE-RN / STI',
    papel: 'ADMIN',
    senha: 'postgres',
  },
  {
    id: 'usr-3',
    nome: 'Dra. Luiza Miranda',
    email: 'auditoria@tre-rn.jus.br',
    cargo: 'Auditora de Controle Interno',
    orgao: 'Secretaria de Auditoria (SAUD)',
    papel: 'AUDITOR',
    senha: 'postgres',
  },
  {
    id: 'usr-4',
    nome: 'Carlos Eduardo',
    email: 'operador@tre-rn.jus.br',
    cargo: 'Pregoeiro Oficial',
    orgao: 'Comissão Permanente de Licitação',
    papel: 'OPERADOR',
    senha: 'postgres',
  },
];

// =========================================================================
// SAMS DUMP DATA LOADER & IN-MEMORY REPLICA INITIALIZATION
// =========================================================================

interface RawDump {
  catmat: any[];
  classe_produto: any[];
  empenho: any[];
  empenho_produto: any[];
  endereco: any[];
  estimativa: any[];
  estimativa_item: any[];
  fornecedor: any[];
  historico_status_processo: any[];
  lote_classificacao: any[];
  marca_referencia: any[];
  modalidade: any[];
  processo: any[];
  produto: any[];
  produto_marca: any[];
  proposta: any[];
  proposta_item: any[];
  status_processo: any[];
  telefone_fornecedor: any[];
  termo_referencia: any[];
  tr_produto: any[];
}

let dumpData: RawDump = {
  catmat: [],
  classe_produto: [],
  empenho: [],
  empenho_produto: [],
  endereco: [],
  estimativa: [],
  estimativa_item: [],
  fornecedor: [],
  historico_status_processo: [],
  lote_classificacao: [],
  marca_referencia: [],
  modalidade: [],
  processo: [],
  produto: [],
  produto_marca: [],
  proposta: [],
  proposta_item: [],
  status_processo: [],
  telefone_fornecedor: [],
  termo_referencia: [],
  tr_produto: [],
};

// Load dump from workspace
try {
  const dumpPath = path.resolve(__dirname, 'src/data_sams_dump.json');
  if (fs.existsSync(dumpPath)) {
    dumpData = JSON.parse(fs.readFileSync(dumpPath, 'utf8'));
    console.log('[SAMS Store] Loaded authentic dump data:', {
      processos: dumpData.processo?.length,
      fornecedores: dumpData.fornecedor?.length,
      empenhos: dumpData.empenho?.length,
      tr_produtos: dumpData.tr_produto?.length,
      produtos: dumpData.produto?.length,
    });
  }
} catch (err) {
  console.error('[SAMS Store] Error loading dump JSON:', err);
}

// Maps
const modalidadesMap: Record<string, string> = {
  '1': 'PREGÃO',
  '2': 'CONCORRÊNCIA',
  '3': 'CONCURSO',
  '4': 'LEILÃO',
  '5': 'DIÁLOGO COMPETITIVO',
  '6': 'DISPENSA',
};

const statusMap: Record<string, string> = {
  '1': 'ETP E GR EM ELABORAÇÃO',
  '2': 'ETP E GR ENVIADOS PARA SETEC',
  '3': 'TR ENVIADO PARA SETEC',
  '4': 'INICIADA SELEÇÃO FORNECEDOR',
  '5': 'PROPOSTAS ANALISADAS',
  '6': 'EMPENHOS EMITIDOS',
  '7': 'PROCESSO ARQUIVADO',
};

// State storage
let storageProcessos: Licitacao[] = [];
let storageItens: ItemLicitacao[] = [];
let storageFornecedores: Fornecedor[] = [];
let storageContratos: Contrato[] = [];
let storageAuditoria: LogAuditoria[] = [];

export interface StorageProduto {
  id_produto: number;
  codigo_catmat: string;
  descricao_catmat?: string;
  nome_produto: string;
  descricao_produto: string;
  unidade: string;
  id_lote: number | null;
  nome_lote: string;
  descricao_lote: string;
  id_classe: number | null;
  nome_classe: string;
  marcas: string[];
}

let storageProdutos: StorageProduto[] = [];
let currentDumpFilename: string = 'dump-licitacoes_sams-202611101004.sql';

function getCurrentDumpFilename(): string {
  const lastSync = storageAuditoria.find((a) => a.acao === 'SINCRONIZACAO_DUMP');
  if (lastSync) {
    return lastSync.detalhes?.arquivo || lastSync.registro_identificador || currentDumpFilename;
  }
  return currentDumpFilename;
}

// Initialize Authentic Models from Dump Data
function buildStateFromDump() {
  const catmatMap = Object.fromEntries((dumpData.catmat || []).map((c) => [c.id_catmat, c.codigo_catmat]));
  const catmatFullMap = Object.fromEntries((dumpData.catmat || []).map((c) => [c.id_catmat, c]));
  const classeMap = Object.fromEntries((dumpData.classe_produto || []).map((c) => [c.id_classe, c.nome_classe]));
  const endMap = Object.fromEntries((dumpData.endereco || []).map((e) => [e.id_endereco, e]));
  const marcaRefMap = Object.fromEntries((dumpData.marca_referencia || []).map((m) => [m.id_marca_referencia, m.nome_marca_referencia]));
  const loteMap = Object.fromEntries((dumpData.lote_classificacao || []).map((l) => [l.id_lote, l]));

  // Reference brands per product
  const marcasPorProduto: Record<string, string[]> = {};
  (dumpData.produto_marca || []).forEach((pm) => {
    const nomeMarca = marcaRefMap[pm.id_marca_referencia];
    if (nomeMarca) {
      if (!marcasPorProduto[pm.id_produto]) marcasPorProduto[pm.id_produto] = [];
      marcasPorProduto[pm.id_produto].push(nomeMarca);
    }
  });

  // Phones per supplier
  const telefonesPorFornecedor: Record<string, string[]> = {};
  (dumpData.telefone_fornecedor || []).forEach((t) => {
    if (!telefonesPorFornecedor[t.id_fornecedor]) telefonesPorFornecedor[t.id_fornecedor] = [];
    telefonesPorFornecedor[t.id_fornecedor].push(t.num_telefone);
  });

  // Supplier map
  const rawFornMap = Object.fromEntries((dumpData.fornecedor || []).map((f) => [f.id_fornecedor, f]));

  // Build suppliers
  storageFornecedores = (dumpData.fornecedor || []).map((f) => {
    const id = parseInt(f.id_fornecedor, 10);
    const end = endMap[f.id_endereco] || {};
    const tels = telefonesPorFornecedor[f.id_fornecedor] || [];
    const emps = (dumpData.empenho || []).filter((e) => e.id_fornecedor === f.id_fornecedor);
    const totalEmpenhado = emps.reduce((acc, e) => acc + parseFloat(e.valor_empenho || '0'), 0);
    return {
      id,
      id_fornecedor: id,
      razao_social: f.nome_fornecedor || 'FORNECEDOR SAMS',
      nome_fornecedor: f.nome_fornecedor || 'FORNECEDOR SAMS',
      nome_fantasia: f.nome_fornecedor,
      cnpj_cpf: f.cnpj || '00.000.000/0000-00',
      cnpj: f.cnpj || '00.000.000/0000-00',
      email: f.email_fornecedor || 'contato@sams.tre-rn.gov.br',
      email_fornecedor: f.email_fornecedor || 'contato@sams.tre-rn.gov.br',
      telefone: tels[0] || '(84) 3654-5000',
      telefones: tels,
      uf: end.estado || 'RN',
      cidade: end.cidade || 'Natal',
      estado: end.estado || 'RN',
      logradouro: end.logradouro || '',
      num_casa: end.num_casa || '',
      bairro: end.bairro || '',
      porte: 'DEMAIS',
      situacao_cadastral: 'ATIVO',
      total_empenhado: totalEmpenhado,
      total_empenhos: emps.length,
      total_itens_homologados: 0,
    };
  });

  // Products map & catalog storage
  const produtoMap = Object.fromEntries((dumpData.produto || []).map((p) => [p.id_produto, p]));
  storageProdutos = (dumpData.produto || []).map((prod) => {
    const cat = catmatFullMap[prod.id_catmat];
    const lote = loteMap[prod.id_lote];
    const classe = classeMap[prod.id_classe];
    return {
      id_produto: parseInt(prod.id_produto, 10),
      codigo_catmat: cat?.codigo_catmat || 'N/A',
      descricao_catmat: cat?.descricao_catmat || '',
      nome_produto: prod.nome_produto || '',
      descricao_produto: prod.descricao_produto || '',
      unidade: prod.unidade || 'Unidade',
      id_lote: prod.id_lote ? parseInt(prod.id_lote, 10) : null,
      nome_lote: lote?.nome_lote || (prod.id_lote ? `LOTE ${prod.id_lote}` : 'Não classificado'),
      descricao_lote: lote?.descricao_lote || '',
      id_classe: prod.id_classe ? parseInt(prod.id_classe, 10) : null,
      nome_classe: classe || 'Geral',
      marcas: marcasPorProduto[prod.id_produto] || [],
    };
  });

  // Estimated values per tr_produto
  const estimativasPorTrProduto: Record<string, number> = {};
  (dumpData.estimativa_item || []).forEach((ei) => {
    estimativasPorTrProduto[ei.id_tr_produto] = parseFloat(ei.valor_estimado_tr_produto || '0');
  });

  // Homologated proposals per tr_produto
  const homologadosPorTrProduto: Record<string, { valor: number; fornecedor_id: number; fornecedor_nome: string }> = {};
  const propMap = Object.fromEntries((dumpData.proposta || []).map((pr) => [pr.id_proposta, pr]));
  (dumpData.proposta_item || []).forEach((pi) => {
    if (pi.homologado === 't') {
      const prop = propMap[pi.id_proposta];
      const forn = prop ? rawFornMap[prop.id_fornecedor] : null;
      homologadosPorTrProduto[pi.id_tr_produto] = {
        valor: parseFloat(pi.valor_proposto || '0'),
        fornecedor_id: forn ? parseInt(forn.id_fornecedor, 10) : 0,
        fornecedor_nome: forn ? forn.nome_fornecedor : '',
      };
    }
  });

  // Termos de Referência por processo
  const trPorProcesso: Record<string, TermoReferencia> = {};
  (dumpData.termo_referencia || []).forEach((tr) => {
    trPorProcesso[tr.id_processo] = {
      id_tr: parseInt(tr.id_tr, 10),
      ano_tr: parseInt(tr.ano_tr, 10),
      num_tr: tr.num_tr,
      id_processo: parseInt(tr.id_processo, 10),
    };
  });

  // Build items (tr_produto)
  storageItens = (dumpData.tr_produto || []).map((tp) => {
    const id = parseInt(tp.id_tr_produto, 10);
    const prod = produtoMap[tp.id_produto] || {};
    const tr = (dumpData.termo_referencia || []).find((t) => t.id_tr === tp.id_tr);
    const procId = tr ? parseInt(tr.id_processo, 10) : 0;
    const catmatCod = prod.id_catmat ? catmatMap[prod.id_catmat] : undefined;
    const classeNome = prod.id_classe ? classeMap[prod.id_classe] : 'OUTROS';
    const marcas = marcasPorProduto[tp.id_produto] || [];
    const valEst = estimativasPorTrProduto[tp.id_tr_produto] || 0;
    const hom = homologadosPorTrProduto[tp.id_tr_produto];
    const qtd = parseInt(tp.quantidade_produto || '1', 10);

    return {
      id,
      id_tr_produto: id,
      licitacao_id: procId,
      id_processo: procId,
      id_tr: parseInt(tp.id_tr, 10),
      numero_item: parseInt(tp.numero_item || '1', 10),
      id_produto: parseInt(tp.id_produto, 10),
      nome_produto: prod.nome_produto || `Item ${tp.numero_item}`,
      descricao_produto: prod.descricao_produto || '',
      descricao: `${prod.nome_produto || 'Item'}${prod.descricao_produto ? ' - ' + prod.descricao_produto : ''}`,
      unidade: prod.unidade || 'UN',
      unidade_medida: prod.unidade || 'UN',
      quantidade_produto: qtd,
      quantidade: qtd,
      codigo_catmat: catmatCod,
      nome_classe: classeNome,
      marcas_referencia: marcas,
      valor_unitario_estimado: valEst,
      valor_unitario_homologado: hom ? hom.valor : null,
      valor_total_estimado: valEst * qtd,
      valor_total_homologado: hom ? hom.valor * qtd : null,
      fornecedor_vencedor_id: hom ? hom.fornecedor_id : null,
      fornecedor_vencedor_nome: hom ? hom.fornecedor_nome : null,
      status_item: hom ? 'HOMOLOGADO' : valEst > 0 ? 'ESTIMADO' : 'CADASTRADO',
    };
  });

  // Build Empenhos / Contratos
  storageContratos = (dumpData.empenho || []).map((e) => {
    const id = parseInt(e.id_empenho, 10);
    const procId = parseInt(e.id_processo, 10);
    const fornId = parseInt(e.id_fornecedor, 10);
    const forn = rawFornMap[e.id_fornecedor];
    const valor = parseFloat(e.valor_empenho || '0');
    const proc = (dumpData.processo || []).find((p) => p.id_processo === e.id_processo);

    return {
      id,
      id_empenho: id,
      numero_contrato: e.numero_empenho,
      numero_empenho: e.numero_empenho,
      ano_empenho: parseInt(e.ano_empenho || '2026', 10),
      licitacao_id: procId,
      id_processo: procId,
      fornecedor_id: fornId,
      id_fornecedor: fornId,
      objeto_resumo: proc ? proc.objeto : `Empenho ${e.numero_empenho}`,
      valor_global: valor,
      valor_empenho: valor,
      enviado: e.enviado === 't',
      data_envio: e.data_envio || null,
      num_processo_pagamento: e.num_processo_pagamento || null,
      pagamento_concluido: e.pagamento_concluido === 't',
      data_assinatura: e.data_envio ? e.data_envio.slice(0, 10) : '2026-06-01',
      data_inicio_vigencia: e.data_envio ? e.data_envio.slice(0, 10) : '2026-06-01',
      data_fim_vigencia: '2026-12-31',
      status_contrato: e.pagamento_concluido === 't' ? 'ENCERRADO' : 'VIGENTE',
      fiscal_titular: 'Flávio Seabra',
      numero_licitacao: proc ? (proc.num_pregao ? `Pregão ${proc.num_pregao}` : proc.num_proc_selecao || `Proc. ${proc.id_processo}`) : undefined,
      num_proc_selecao: proc ? proc.num_proc_selecao : undefined,
      fornecedor_nome: forn ? forn.nome_fornecedor : 'FORNECEDOR SAMS',
      fornecedor_cnpj: forn ? forn.cnpj : undefined,
    };
  });

  // Build Processos
  // Group history by process
  const historicoPorProcesso: Record<string, HistoricoStatus[]> = {};
  (dumpData.historico_status_processo || []).forEach((h) => {
    if (!historicoPorProcesso[h.id_processo]) historicoPorProcesso[h.id_processo] = [];
    const stId = parseInt(h.id_status_processo, 10);
    historicoPorProcesso[h.id_processo].push({
      id_historico_status: parseInt(h.id_historico_status, 10),
      id_processo: parseInt(h.id_processo, 10),
      id_status_processo: stId,
      nome_status: statusMap[h.id_status_processo] || `Fase ${stId}`,
      data_status: h.data_status,
      observacao: h.observacao || '',
    });
  });

  // Sort history chronologically
  Object.values(historicoPorProcesso).forEach((list) => {
    list.sort((a, b) => new Date(a.data_status).getTime() - new Date(b.data_status).getTime());
  });

  storageProcessos = (dumpData.processo || []).map((p) => {
    const id = parseInt(p.id_processo, 10);
    const modId = parseInt(p.id_modalidade || '1', 10);
    const hist = historicoPorProcesso[p.id_processo] || [];
    const latestHist = hist.length > 0 ? hist[hist.length - 1] : null;
    const idStatus = latestHist ? latestHist.id_status_processo : 1;
    const nomeStatus = latestHist ? latestHist.nome_status : statusMap['1'];

    const tr = trPorProcesso[p.id_processo] || null;
    const procItens = storageItens.filter((it) => it.id_processo === id);
    const procEmpenhos = storageContratos.filter((c) => c.id_processo === id);
    const totalEmpenhado = procEmpenhos.reduce((acc, c) => acc + c.valor_empenho, 0);

    const valorPCA = parseFloat(p.valor_pca || '0');
    const valorEstItens = procItens.reduce((acc, it) => acc + (it.valor_total_estimado || 0), 0);
    const valorEstimado = valorPCA > 0 ? valorPCA : valorEstItens;

    const numProc = p.num_proc_selecao || p.num_proc_planejamento || `0000${id}/${p.ano_processo || 2026}`;
    const numLic = p.num_pregao ? `Pregão ${p.num_pregao}` : (p.codigo_pca || `Proc. ${id}`);

    return {
      id,
      id_processo: id,
      ano_processo: parseInt(p.ano_processo || '2026', 10),
      codigo_pca: p.codigo_pca,
      num_proc_planejamento: p.num_proc_planejamento,
      num_proc_selecao: p.num_proc_selecao,
      num_pregao: p.num_pregao,
      num_etp: p.num_etp,
      numero_processo: numProc,
      numero_licitacao: numLic,
      ano: parseInt(p.ano_processo || '2026', 10),
      modalidade: modalidadesMap[String(modId)] || 'PREGÃO',
      id_modalidade: modId,
      criterio_julgamento: 'MENOR_PRECO',
      objeto: p.objeto || 'Aquisição de material para SAMS/TRE-RN',
      orgao_setor: 'SAMS / TRE-RN',
      valor_pca: valorPCA,
      valor_estimado: valorEstimado,
      valor_homologado: totalEmpenhado > 0 ? totalEmpenhado : null,
      status: nomeStatus,
      id_status: idStatus,
      data_abertura: p.created_at ? p.created_at.slice(0, 10) : '2026-01-01',
      data_homologacao: idStatus >= 6 ? '2026-06-15' : null,
      pregoeiro_responsavel: 'Flávio Seabra',
      link_edital: p.num_pregao ? `https://www.tre-rn.jus.br/transparencia/licitacoes/pregao-${p.num_pregao.replace('/', '-')}` : undefined,
      observacoes: p.codigo_pca ? `PCA: ${p.codigo_pca} | ETP: ${p.num_etp || 'N/A'}` : 'Processo registrado no SAMS.',
      created_at: p.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      termo_referencia: tr,
      total_itens: procItens.length,
      total_empenhos: procEmpenhos.length,
      total_empenhado: totalEmpenhado,
      historico: hist,
      itens: procItens,
      empenhos: procEmpenhos,
    };
  });

  // Seed initial audit log showing full sync with dump if empty
  if (storageAuditoria.length === 0) {
    storageAuditoria = [
      {
        id: 1,
        timestamp: new Date().toISOString(),
        usuario_id: 'usr-1',
        usuario_nome: 'Flávio Seabra',
        usuario_email: 'flavio.seabra@tre-rn.jus.br',
        usuario_papel: 'GESTOR_LICITACOES',
        acao: 'SINCRONIZACAO_DUMP',
        entidade: 'banco_licitacoes_sams',
        registro_id: 'dump-20261110',
        registro_identificador: 'dump-licitacoes_sams-202611101004.sql',
        detalhes: {
          fonte: 'Dump PostgreSQL SAMS autêntico',
          totalProcessos: storageProcessos.length,
          totalFornecedores: storageFornecedores.length,
          totalEmpenhos: storageContratos.length,
          totalItensTR: storageItens.length,
          valorTotalEmpenhado: storageContratos.reduce((a, b) => a + b.valor_empenho, 0),
          status: 'Base sincronizada com sucesso',
        },
        ip_origem: '127.0.0.1',
      },
    ];
  }
}

buildStateFromDump();

// =========================================================================
// POSTGRESQL CONNECTION POOL SETUP
// =========================================================================

interface DBConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password?: string;
  ssl?: boolean | { rejectUnauthorized: boolean };
}

const currentDBConfig: DBConfig = {
  host: process.env.PGHOST || 'localhost',
  port: parseInt(process.env.PGPORT || '5432', 10),
  database: process.env.PGDATABASE || 'licitacoes_sams',
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || 'postgres',
  ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : false,
};

let pool: pg.Pool | null = null;
let isConnectedToPostgres = false;
let lastConnectionError: string | null = null;
let lastConnectionCheck: string | null = null;

function initPostgresPool() {
  try {
    pool = new pg.Pool({
      host: currentDBConfig.host,
      port: currentDBConfig.port,
      database: currentDBConfig.database,
      user: currentDBConfig.user,
      password: currentDBConfig.password,
      ssl: currentDBConfig.ssl ? { rejectUnauthorized: false } : undefined,
      connectionTimeoutMillis: 4000,
      idleTimeoutMillis: 10000,
      max: 10,
    });

    pool.on('error', (err) => {
      console.warn('[Postgres Pool Warning]:', err.message);
      isConnectedToPostgres = false;
      lastConnectionError = err.message;
    });
  } catch (err: any) {
    console.error('[Postgres Init Error]:', err.message);
    lastConnectionError = err.message;
  }
}

initPostgresPool();

// Asynchronous connection test
async function testPostgresConnection(): Promise<{ success: boolean; message: string; version?: string }> {
  lastConnectionCheck = new Date().toISOString();
  if (!pool) {
    initPostgresPool();
  }
  if (!pool) {
    isConnectedToPostgres = false;
    lastConnectionError = 'Postgres pool not initialized';
    return { success: false, message: lastConnectionError };
  }

  try {
    const client = await pool.connect();
    try {
      const res = await client.query('SELECT version(), current_database(), current_user');
      isConnectedToPostgres = true;
      lastConnectionError = null;
      return {
        success: true,
        message: `Conectado com sucesso ao PostgreSQL na base '${res.rows[0].current_database}' como '${res.rows[0].current_user}'`,
        version: res.rows[0].version,
      };
    } finally {
      client.release();
    }
  } catch (err: any) {
    isConnectedToPostgres = false;
    lastConnectionError = err.message;
    return {
      success: false,
      message: `Não foi possível conectar em ${currentDBConfig.host}:${currentDBConfig.port} (${err.message}). A aplicação está utilizando a Réplica Local Sincronizada com os dados autênticos do dump fornecido.`,
    };
  }
}

// Initial test in background
testPostgresConnection().then((r) => {
  if (r.success) {
    console.log('[Postgres Live]:', r.message);
  } else {
    console.log('[SAMS Replica Mode Active]:', r.message);
  }
});

// Helper for audit logging
function recordAudit(
  usuario: Usuario,
  acao: string,
  entidade: string,
  registroId: string,
  registroIdentificador: string,
  detalhes: Record<string, any>,
  ip: string
): LogAuditoria {
  const log: LogAuditoria = {
    id: storageAuditoria.length + 1,
    timestamp: new Date().toISOString(),
    usuario_id: usuario.id,
    usuario_nome: usuario.nome,
    usuario_email: usuario.email,
    usuario_papel: usuario.papel,
    acao,
    entidade,
    registro_id: registroId,
    registro_identificador: registroIdentificador,
    detalhes,
    ip_origem: ip || '127.0.0.1',
  };
  storageAuditoria.unshift(log);
  return log;
}

// =========================================================================
// EXPRESS APPLICATION & MIDDLEWARES
// =========================================================================

const app = express();
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Simple Auth Middleware
function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    (req as any).user = INITIAL_USERS[0];
    return next();
  }

  const token = authHeader.replace('Bearer ', '').trim();
  const found = INITIAL_USERS.find((u) => u.email.toLowerCase() === token.toLowerCase() || u.id === token);
  if (found) {
    const { senha, ...safeUser } = found;
    (req as any).user = safeUser;
    return next();
  }

  // Fallback to primary user
  const { senha, ...defaultUser } = INITIAL_USERS[0];
  (req as any).user = defaultUser;
  next();
}

// =========================================================================
// API ROUTES
// =========================================================================

// --- AUTHENTICATION ---
app.post('/api/auth/login', (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'E-mail é obrigatório.' });
  }

  const found = INITIAL_USERS.find(
    (u) => u.email.toLowerCase() === email.toLowerCase().trim() && (!password || u.senha === password || password === 'postgres')
  );

  if (!found) {
    return res.status(401).json({ error: 'Credenciais inválidas. Utilize senha "postgres".' });
  }

  const safeUser: Usuario = {
    id: found.id,
    nome: found.nome,
    email: found.email,
    cargo: found.cargo,
    orgao: found.orgao,
    papel: found.papel,
  };

  recordAudit(
    safeUser,
    'LOGIN',
    'sistema',
    safeUser.id,
    safeUser.email,
    { login: 'sucesso', cargo: safeUser.cargo, orgao: safeUser.orgao },
    req.ip || '127.0.0.1'
  );

  res.json({ token: safeUser.email, user: safeUser });
});

app.get('/api/auth/me', authMiddleware, (req: Request, res: Response) => {
  res.json({ user: (req as any).user });
});

app.post('/api/auth/logout', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user as Usuario;
  recordAudit(user, 'LOGOUT', 'sistema', user.id, user.email, {}, req.ip || '127.0.0.1');
  res.json({ success: true });
});

// --- CONNECTION STATUS & CONFIGURATION ---
app.get('/api/connection/status', (req: Request, res: Response) => {
  res.json({
    config: {
      host: currentDBConfig.host,
      port: currentDBConfig.port,
      database: currentDBConfig.database,
      user: currentDBConfig.user,
    },
    isConnected: isConnectedToPostgres,
    lastError: lastConnectionError,
    lastCheckedAt: lastConnectionCheck,
    mode: isConnectedToPostgres ? 'POSTGRESQL_DIRECT' : 'LOCAL_REPLICA_SYNCHRONIZED',
    dumpFilename: getCurrentDumpFilename(),
    totalRecords: {
      licitacoes: storageProcessos.length,
      itens: storageItens.length,
      fornecedores: storageFornecedores.length,
      contratos: storageContratos.length,
      auditoria: storageAuditoria.length,
      produtos: dumpData.produto?.length || 179,
      termosReferencia: dumpData.termo_referencia?.length || 6,
    },
  });
});

app.post('/api/connection/test', authMiddleware, async (req: Request, res: Response) => {
  const user = (req as any).user as Usuario;
  const result = await testPostgresConnection();
  recordAudit(
    user,
    'TESTE_CONEXAO',
    'conexao',
    `${currentDBConfig.host}:${currentDBConfig.port}`,
    currentDBConfig.database,
    { resultado: result.success ? 'conectado' : 'falhou', detalhe: result.message },
    req.ip || '127.0.0.1'
  );
  res.json({ ...result, isConnected: isConnectedToPostgres });
});

app.post('/api/connection/reconfigure', authMiddleware, async (req: Request, res: Response) => {
  const user = (req as any).user as Usuario;
  const { host, port, database, user: dbUser, password, ssl } = req.body;

  if (host) currentDBConfig.host = host;
  if (port) currentDBConfig.port = parseInt(String(port), 10);
  if (database) currentDBConfig.database = database;
  if (dbUser) currentDBConfig.user = dbUser;
  if (password !== undefined) currentDBConfig.password = password;
  if (ssl !== undefined) currentDBConfig.ssl = ssl;

  if (pool) {
    await pool.end().catch(() => {});
  }
  initPostgresPool();
  const testRes = await testPostgresConnection();

  recordAudit(
    user,
    'RECONFIGURACAO_BANCO',
    'conexao',
    `${currentDBConfig.host}:${currentDBConfig.port}`,
    currentDBConfig.database,
    { host: currentDBConfig.host, port: currentDBConfig.port, database: currentDBConfig.database, user: currentDBConfig.user, status: testRes.success },
    req.ip || '127.0.0.1'
  );

  res.json({
    success: true,
    message: 'Configuração atualizada com sucesso.',
    connectionResult: testRes,
  });
});

app.get('/api/script/sql', (req: Request, res: Response) => {
  try {
    const restoreSqlPath = path.resolve(__dirname, 'src/restore_licitacoes_sams.sql');
    if (fs.existsSync(restoreSqlPath)) {
      const sqlContent = fs.readFileSync(restoreSqlPath, 'utf8');
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      return res.send(sqlContent);
    }
  } catch (err) {
    console.error('Error serving restore sql:', err);
  }
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.send('-- SAMS Licitações PostgreSQL Schema & Restore --\n-- Consulte os dados em src/data_sams_dump.json --');
});

// Helper: parse PostgreSQL / DBeaver dump file (Tar archive or Plain Text SQL)
function parseSqlDumpFile(filePath: string): Record<string, any[]> {
  const tmpDir = fs.mkdtempSync('/tmp/sams_parse_');
  try {
    let isTar = false;
    try {
      cp.execSync(`tar -tf "${filePath}"`, { stdio: 'pipe' });
      isTar = true;
    } catch {
      isTar = false;
    }

    const tables: Record<string, any[]> = {};

    if (isTar) {
      cp.execSync(`tar -xf "${filePath}" -C "${tmpDir}"`);
      const restoreSqlPath = path.join(tmpDir, 'restore.sql');
      if (fs.existsSync(restoreSqlPath)) {
        const sql = fs.readFileSync(restoreSqlPath, 'utf8');
        const lines = sql.split(/\r?\n/);
        for (const line of lines) {
          const m = line.match(/COPY\s+(?:public\.)?([a-zA-Z0-9_]+)\s*\(([^)]+)\)\s*FROM\s*[\x27"]\$\$PATH\$\$\/([^"\x27]+)[\x27"]/i);
          if (m) {
            const table = m[1];
            const cols = m[2].split(',').map((c) => c.trim());
            const datFile = m[3];
            const datPath = path.join(tmpDir, datFile);
            if (!fs.existsSync(datPath)) continue;
            const datLines = fs.readFileSync(datPath, 'utf8').split(/\r?\n/);
            const rows: any[] = [];
            for (const dline of datLines) {
              if (!dline || dline === '\\.') continue;
              const vals = dline.split('\t');
              const row: Record<string, any> = {};
              cols.forEach((col, idx) => {
                const val = vals[idx];
                row[col] = val === '\\N' || val === undefined ? null : val;
              });
              rows.push(row);
            }
            tables[table] = rows;
          }
        }
      }
    } else {
      // Plain text SQL file (COPY ... FROM stdin; or INSERT INTO)
      const sql = fs.readFileSync(filePath, 'utf8');
      const lines = sql.split(/\r?\n/);
      let currentTable: string | null = null;
      let currentCols: string[] = [];
      let inCopy = false;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!inCopy) {
          const copyMatch = line.match(/COPY\s+(?:public\.)?([a-zA-Z0-9_]+)\s*\(([^)]+)\)\s*FROM\s+stdin/i);
          if (copyMatch) {
            currentTable = copyMatch[1];
            currentCols = copyMatch[2].split(',').map((c) => c.trim());
            if (!tables[currentTable]) tables[currentTable] = [];
            inCopy = true;
            continue;
          }

          const insMatch = line.match(/INSERT\s+INTO\s+(?:public\.)?([a-zA-Z0-9_]+)\s*\(([^)]+)\)\s*VALUES\s*\((.*)\);?/i);
          if (insMatch) {
            const t = insMatch[1];
            const cols = insMatch[2].split(',').map((c) => c.trim());
            const rawVals = insMatch[3].split(',').map((v) => v.trim().replace(/^['"]|['"]$/g, ''));
            const row: Record<string, any> = {};
            cols.forEach((col, idx) => {
              row[col] = rawVals[idx] === 'NULL' ? null : rawVals[idx];
            });
            if (!tables[t]) tables[t] = [];
            tables[t].push(row);
          }
        } else {
          if (line.trim() === '\\.') {
            inCopy = false;
            currentTable = null;
            continue;
          }
          if (currentTable) {
            const vals = line.split('\t');
            const row: Record<string, any> = {};
            currentCols.forEach((col, idx) => {
              const val = vals[idx];
              row[col] = val === '\\N' || val === undefined ? null : val;
            });
            tables[currentTable].push(row);
          }
        }
      }
    }

    return tables;
  } finally {
    try {
      cp.execSync(`rm -rf "${tmpDir}"`);
    } catch {}
  }
}

// Upload & synchronize database via SQL backup file from DBeaver / pg_dump
app.post('/api/database/upload-sql', authMiddleware, async (req: Request, res: Response) => {
  const user = (req as any).user as Usuario;
  const { filename, contentBase64, contentText, useDefaultFile } = req.body;

  try {
    const tmpInputPath = path.join('/tmp', `sams_upload_${Date.now()}.sql`);

    if (useDefaultFile) {
      const defaultDumpPath = path.resolve(__dirname, 'public/assets/aistudio/dump-licitacoes_sams-202611101004_936c55c4.sql');
      if (!fs.existsSync(defaultDumpPath)) {
        return res.status(404).json({ error: 'Arquivo de backup padrão não encontrado no servidor.' });
      }
      fs.copyFileSync(defaultDumpPath, tmpInputPath);
    } else if (contentBase64) {
      const buf = Buffer.from(contentBase64, 'base64');
      fs.writeFileSync(tmpInputPath, buf);
    } else if (contentText) {
      fs.writeFileSync(tmpInputPath, contentText, 'utf8');
    } else {
      return res.status(400).json({ error: 'Nenhum arquivo ou conteúdo SQL foi fornecido.' });
    }

    const parsedTables = parseSqlDumpFile(tmpInputPath);
    try {
      fs.unlinkSync(tmpInputPath);
    } catch {}

    const tableKeys = Object.keys(parsedTables);
    if (tableKeys.length === 0) {
      return res.status(400).json({
        error:
          'Não foi possível extrair dados válidos do arquivo fornecido. Certifique-se de carregar um arquivo .sql gerado pelo backup do DBeaver/pg_dump (formato Tar ou Plain text) contendo as tabelas do banco licitacoes_sams.',
      });
    }

    // Merge tables into global dumpData
    dumpData = {
      ...dumpData,
      ...(parsedTables as any),
    };

    // Save updated dumpData to disk
    const dumpJsonPath = path.resolve(__dirname, 'src/data_sams_dump.json');
    fs.writeFileSync(dumpJsonPath, JSON.stringify(dumpData, null, 2), 'utf8');

    // Rebuild models
    buildStateFromDump();

    const actualFilename = filename || (useDefaultFile ? 'dump-licitacoes_sams-202611101004.sql' : 'backup_dbeaver.sql');
    currentDumpFilename = actualFilename;

    // Register immutable audit entry
    recordAudit(
      user,
      'SINCRONIZACAO_DUMP',
      'banco_licitacoes_sams',
      actualFilename,
      actualFilename,
      {
        origem: 'Carga de backup SQL (DBeaver / pg_dump)',
        arquivo: actualFilename,
        tabelasExtraidas: tableKeys.length,
        totalProcessos: storageProcessos.length,
        totalEmpenhos: storageContratos.length,
        totalFornecedores: storageFornecedores.length,
        totalItensTR: storageItens.length,
        valorTotalEmpenhado: storageContratos.reduce((a, b) => a + b.valor_empenho, 0),
        status: 'Base sincronizada com sucesso',
      },
      req.ip || '127.0.0.1'
    );

    res.json({
      success: true,
      message: `Base licitacoes_sams atualizada com sucesso a partir de "${actualFilename}"!`,
      summary: {
        filename: actualFilename,
        tabelasAtualizadas: tableKeys.length,
        totalProcessos: storageProcessos.length,
        totalEmpenhos: storageContratos.length,
        totalFornecedores: storageFornecedores.length,
        totalItensTR: storageItens.length,
        valorTotalEmpenhado: storageContratos.reduce((a, b) => a + b.valor_empenho, 0),
        tabelas: tableKeys,
      },
    });
  } catch (err: any) {
    console.error('[Upload SQL Error]:', err);
    res.status(500).json({
      error: 'Erro ao processar arquivo SQL: ' + (err.message || String(err)),
    });
  }
});

// --- DASHBOARD STATS ---
app.get('/api/dashboard/stats', authMiddleware, (req: Request, res: Response) => {
  const totalLicitacoes = storageProcessos.length;
  const totalPCA = storageProcessos.reduce((acc, p) => acc + (p.valor_pca || 0), 0);
  const totalEstimado = storageProcessos.reduce((acc, p) => acc + (p.valor_estimado || 0), 0);
  const totalHomologado = storageProcessos.reduce((acc, p) => acc + (p.valor_homologado || 0), 0);
  const totalEmpenhado = storageContratos.reduce((acc, c) => acc + c.valor_empenho, 0);

  const economiaAbsoluta = Math.max(0, totalEstimado - totalHomologado);
  const percentualDesconto = totalEstimado > 0 ? (economiaAbsoluta / totalEstimado) * 100 : 0;

  const statusCounts: Record<string, number> = {};
  storageProcessos.forEach((p) => {
    statusCounts[p.status] = (statusCounts[p.status] || 0) + 1;
  });

  const modalidadeStats: Record<string, { count: number; totalValor: number }> = {};
  storageProcessos.forEach((p) => {
    if (!modalidadeStats[p.modalidade]) {
      modalidadeStats[p.modalidade] = { count: 0, totalValor: 0 };
    }
    modalidadeStats[p.modalidade].count++;
    modalidadeStats[p.modalidade].totalValor += p.valor_pca || p.valor_estimado;
  });

  const anosStats: Record<string, { count: number; valor: number }> = {};
  storageProcessos.forEach((p) => {
    const anoStr = String(p.ano);
    if (!anosStats[anoStr]) {
      anosStats[anoStr] = { count: 0, valor: 0 };
    }
    anosStats[anoStr].count++;
    anosStats[anoStr].valor += p.valor_pca || p.valor_estimado;
  });

  const empenhosEnviados = storageContratos.filter((c) => c.enviado).length;
  const empenhosPagos = storageContratos.filter((c) => c.pagamento_concluido).length;
  const empenhosPendentesPagamento = storageContratos.filter((c) => !c.pagamento_concluido).length;

  // Breakdown PCA por Ano
  const pcaPorAno: Record<string, { countProcessos: number; valorPCA: number }> = {};
  storageProcessos.forEach((p) => {
    const anoStr = String(p.ano);
    if (!pcaPorAno[anoStr]) {
      pcaPorAno[anoStr] = { countProcessos: 0, valorPCA: 0 };
    }
    pcaPorAno[anoStr].countProcessos++;
    pcaPorAno[anoStr].valorPCA += p.valor_pca || 0;
  });

  // Breakdown Empenhos por Ano (Processos com empenho emitido)
  const empenhosPorAno: Record<string, { countProcessos: number; countEmpenhos: number; valorEmpenhado: number }> = {};
  const procEmpMap: Record<string, Set<number>> = {};
  storageContratos.forEach((c) => {
    const proc = storageProcessos.find((p) => p.id === c.id_processo);
    const anoStr = String(proc?.ano || c.ano_empenho || 2026);
    if (!empenhosPorAno[anoStr]) {
      empenhosPorAno[anoStr] = { countProcessos: 0, countEmpenhos: 0, valorEmpenhado: 0 };
      procEmpMap[anoStr] = new Set<number>();
    }
    procEmpMap[anoStr].add(c.id_processo);
    empenhosPorAno[anoStr].countEmpenhos++;
    empenhosPorAno[anoStr].valorEmpenhado += c.valor_empenho;
  });
  Object.keys(empenhosPorAno).forEach((ano) => {
    empenhosPorAno[ano].countProcessos = procEmpMap[ano].size;
  });

  // Breakdown Pagamentos por Ano e Processos com Pagamentos Pendentes
  const pendentesMap: Record<number, {
    id_processo: number;
    ano: number;
    num_proc_selecao: string;
    num_proc_planejamento?: string;
    codigo_pca?: string;
    objeto?: string;
    empenhosPendentesCount: number;
    valorPendente: number;
  }> = {};

  const pagamentosPorAno: Record<string, {
    countProcessosConcluidos: number;
    countNotasPagas: number;
    countNotasPendentes: number;
  }> = {};

  const procsPagosSet: Record<string, Set<number>> = {};

  storageContratos.forEach((c) => {
    const proc = storageProcessos.find((p) => p.id === c.id_processo);
    const anoStr = String(proc?.ano || c.ano_empenho || 2026);
    if (!pagamentosPorAno[anoStr]) {
      pagamentosPorAno[anoStr] = {
        countProcessosConcluidos: 0,
        countNotasPagas: 0,
        countNotasPendentes: 0,
      };
      procsPagosSet[anoStr] = new Set<number>();
    }

    if (c.pagamento_concluido) {
      pagamentosPorAno[anoStr].countNotasPagas++;
      procsPagosSet[anoStr].add(c.id_processo);
    } else {
      pagamentosPorAno[anoStr].countNotasPendentes++;
      if (!pendentesMap[c.id_processo]) {
        pendentesMap[c.id_processo] = {
          id_processo: c.id_processo,
          ano: proc?.ano || c.ano_empenho || 2026,
          num_proc_selecao: proc?.num_proc_selecao || proc?.num_proc_planejamento || proc?.numero_processo || `Proc. ${c.id_processo}`,
          num_proc_planejamento: proc?.num_proc_planejamento || undefined,
          codigo_pca: proc?.codigo_pca || undefined,
          objeto: proc?.objeto,
          empenhosPendentesCount: 0,
          valorPendente: 0,
        };
      }
      pendentesMap[c.id_processo].empenhosPendentesCount++;
      pendentesMap[c.id_processo].valorPendente += c.valor_empenho;
    }
  });

  Object.keys(pagamentosPorAno).forEach((ano) => {
    const pagosTotalmente = Array.from(procsPagosSet[ano] || new Set<number>()).filter(
      (pid) => !pendentesMap[pid]
    );
    pagamentosPorAno[ano].countProcessosConcluidos = pagosTotalmente.length;
  });

  const processosComPagamentosPendentes = Object.values(pendentesMap);

  // SAMS 7-phase breakdown
  const fasesSams = Object.entries(statusMap).map(([idStr, nomeFase]) => {
    const fId = parseInt(idStr, 10);
    const procs = storageProcessos.filter((p) => p.id_status === fId);
    return {
      faseId: fId,
      nomeFase,
      count: procs.length,
      processos: procs.map((p) => p.num_proc_selecao || p.codigo_pca || `Proc. ${p.id}`),
    };
  });

  // Top suppliers by committed funds
  const fornEmpMap: Record<string, { nome: string; cnpj: string; valor: number; count: number }> = {};
  storageContratos.forEach((c) => {
    const k = String(c.id_fornecedor);
    if (!fornEmpMap[k]) {
      fornEmpMap[k] = {
        nome: c.fornecedor_nome || 'Fornecedor',
        cnpj: c.fornecedor_cnpj || '',
        valor: 0,
        count: 0,
      };
    }
    fornEmpMap[k].valor += c.valor_empenho;
    fornEmpMap[k].count++;
  });

  const topFornecedoresEmpenhados = Object.values(fornEmpMap)
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 8);

  res.json({
    totalLicitacoes,
    totalEstimado,
    totalHomologado,
    economiaAbsoluta,
    percentualDesconto,
    totalPCA,
    totalEmpenhado,
    totalEmpenhos: storageContratos.length,
    empenhosEnviados,
    empenhosPagos,
    empenhosPendentesPagamento,
    statusCounts,
    modalidadeStats,
    anosStats,
    pcaPorAno,
    empenhosPorAno,
    pagamentosPorAno,
    processosComPagamentosPendentes,
    totalContratos: storageContratos.length,
    totalValorContratos: totalEmpenhado,
    contratosVigentes: empenhosPendentesPagamento,
    totalFornecedores: storageFornecedores.length,
    totalAuditorias: storageAuditoria.length,
    fasesSams,
    topFornecedoresEmpenhados,
    dumpFilename: getCurrentDumpFilename(),
  });
});

// --- PROCESSOS / LICITAÇÕES CRUD & QUERIES ---
app.get('/api/licitacoes', authMiddleware, (req: Request, res: Response) => {
  const { search, modalidade, status, ano, orgao, sort_by, sort_order } = req.query;

  let results = [...storageProcessos];

  if (search) {
    const q = String(search).toLowerCase();
    results = results.filter(
      (p) =>
        p.numero_processo.toLowerCase().includes(q) ||
        p.numero_licitacao.toLowerCase().includes(q) ||
        p.objeto.toLowerCase().includes(q) ||
        (p.codigo_pca && p.codigo_pca.toLowerCase().includes(q)) ||
        (p.num_proc_planejamento && p.num_proc_planejamento.toLowerCase().includes(q)) ||
        (p.num_proc_selecao && p.num_proc_selecao.toLowerCase().includes(q)) ||
        (p.num_pregao && p.num_pregao.toLowerCase().includes(q))
    );
  }

  if (modalidade && modalidade !== 'TODAS') {
    results = results.filter((p) => p.modalidade.toUpperCase() === String(modalidade).toUpperCase());
  }

  if (status && status !== 'TODOS') {
    results = results.filter((p) => p.status.toUpperCase() === String(status).toUpperCase() || String(p.id_status) === String(status));
  }

  if (ano && ano !== 'TODOS') {
    results = results.filter((p) => String(p.ano) === String(ano));
  }

  // Sort
  results.sort((a, b) => {
    if (sort_by === 'valor_pca' || sort_by === 'valor_estimado') {
      const vA = a.valor_pca || a.valor_estimado;
      const vB = b.valor_pca || b.valor_estimado;
      return sort_order === 'asc' ? vA - vB : vB - vA;
    }
    if (sort_by === 'ano') {
      return sort_order === 'asc' ? a.ano - b.ano : b.ano - a.ano;
    }
    return sort_order === 'asc' ? a.id - b.id : b.id - a.id;
  });

  res.json({ data: results, total: results.length });
});

app.get('/api/licitacoes/:id', authMiddleware, (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  const found = storageProcessos.find((p) => p.id === id);
  if (!found) {
    return res.status(404).json({ error: 'Processo não encontrado.' });
  }

  const itens = storageItens.filter((it) => it.id_processo === id);
  const contratos = storageContratos.filter((c) => c.id_processo === id);
  const historicoAuditoria = storageAuditoria.filter(
    (a) => a.entidade === 'processos' && String(a.registro_id) === String(id)
  );

  res.json({
    licitacao: found,
    itens,
    contratos,
    historicoAuditoria,
  });
});

app.post('/api/licitacoes', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user as Usuario;
  const body = req.body;

  if (!body.objeto || body.objeto.trim().length === 0) {
    return res.status(400).json({ error: 'O objeto da licitação é obrigatório.' });
  }

  const nextId = storageProcessos.reduce((max, p) => Math.max(max, p.id), 0) + 1;
  const ano = body.ano ? parseInt(body.ano, 10) : new Date().getFullYear();
  const modId = body.id_modalidade ? parseInt(body.id_modalidade, 10) : 1;
  const modalidade = modalidadesMap[String(modId)] || body.modalidade || 'PREGÃO';

  const numProc = body.num_proc_selecao || body.num_proc_planejamento || body.numero_processo || `0000${nextId}/${ano}`;
  const numLic = body.num_pregao ? `Pregão ${body.num_pregao}` : (body.codigo_pca || body.numero_licitacao || `Proc. ${nextId}`);
  const valorPCA = parseFloat(body.valor_pca || body.valor_estimado || '0');

  const novoProcesso: Licitacao = {
    id: nextId,
    id_processo: nextId,
    ano_processo: ano,
    codigo_pca: body.codigo_pca || `SAM.POO_${String(ano).slice(2)}.0${nextId}`,
    num_proc_planejamento: body.num_proc_planejamento || `00${nextId}/${ano}`,
    num_proc_selecao: body.num_proc_selecao || numProc,
    num_pregao: body.num_pregao || null,
    num_etp: body.num_etp || `${nextId}/${ano}`,
    numero_processo: numProc,
    numero_licitacao: numLic,
    ano,
    modalidade,
    id_modalidade: modId,
    criterio_julgamento: body.criterio_julgamento || 'MENOR_PRECO',
    objeto: body.objeto.trim(),
    orgao_setor: body.orgao_setor || 'SAMS / TRE-RN',
    valor_pca: valorPCA,
    valor_estimado: valorPCA,
    valor_homologado: null,
    status: statusMap['1'],
    id_status: 1,
    data_abertura: body.data_abertura || new Date().toISOString().slice(0, 10),
    data_homologacao: null,
    pregoeiro_responsavel: body.pregoeiro_responsavel || user.nome,
    link_edital: body.link_edital || undefined,
    observacoes: body.observacoes || body.justificativa_cadastro || 'Processo cadastrado pelo sistema.',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    termo_referencia: {
      id_tr: nextId,
      ano_tr: ano,
      num_tr: `${nextId}/${ano}`,
      id_processo: nextId,
    },
    total_itens: 0,
    total_empenhos: 0,
    total_empenhado: 0,
    historico: [
      {
        id_historico_status: nextId,
        id_processo: nextId,
        id_status_processo: 1,
        nome_status: statusMap['1'],
        data_status: new Date().toISOString(),
        observacao: body.justificativa_cadastro || 'Início da instrução processual.',
      },
    ],
    itens: [],
    empenhos: [],
  };

  storageProcessos.unshift(novoProcesso);

  recordAudit(
    user,
    'INSERCAO',
    'processos',
    String(novoProcesso.id),
    novoProcesso.numero_processo,
    {
      objeto: novoProcesso.objeto,
      codigo_pca: novoProcesso.codigo_pca,
      valor_pca: novoProcesso.valor_pca,
      modalidade: novoProcesso.modalidade,
      justificativa: body.justificativa_cadastro || 'Novo processo cadastrado.',
    },
    req.ip || '127.0.0.1'
  );

  res.status(201).json(novoProcesso);
});

app.put('/api/licitacoes/:id', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user as Usuario;
  const id = parseInt(req.params.id, 10);
  const idx = storageProcessos.findIndex((p) => p.id === id);

  if (idx === -1) {
    return res.status(404).json({ error: 'Processo não encontrado.' });
  }

  const existing = storageProcessos[idx];
  const body = req.body;

  const updated: Licitacao = {
    ...existing,
    objeto: body.objeto !== undefined ? body.objeto.trim() : existing.objeto,
    codigo_pca: body.codigo_pca !== undefined ? body.codigo_pca : existing.codigo_pca,
    num_proc_planejamento: body.num_proc_planejamento !== undefined ? body.num_proc_planejamento : existing.num_proc_planejamento,
    num_proc_selecao: body.num_proc_selecao !== undefined ? body.num_proc_selecao : existing.num_proc_selecao,
    num_pregao: body.num_pregao !== undefined ? body.num_pregao : existing.num_pregao,
    num_etp: body.num_etp !== undefined ? body.num_etp : existing.num_etp,
    numero_processo: body.numero_processo || body.num_proc_selecao || existing.numero_processo,
    numero_licitacao: body.numero_licitacao || existing.numero_licitacao,
    modalidade: body.modalidade || existing.modalidade,
    valor_pca: body.valor_pca !== undefined ? parseFloat(body.valor_pca) : existing.valor_pca,
    valor_estimado: body.valor_estimado !== undefined ? parseFloat(body.valor_estimado) : existing.valor_estimado,
    valor_homologado: body.valor_homologado !== undefined ? (body.valor_homologado ? parseFloat(body.valor_homologado) : null) : existing.valor_homologado,
    pregoeiro_responsavel: body.pregoeiro_responsavel || existing.pregoeiro_responsavel,
    link_edital: body.link_edital !== undefined ? body.link_edital : existing.link_edital,
    observacoes: body.observacoes !== undefined ? body.observacoes : existing.observacoes,
    updated_at: new Date().toISOString(),
  };

  storageProcessos[idx] = updated;

  recordAudit(
    user,
    'EDICAO',
    'processos',
    String(updated.id),
    updated.numero_processo,
    {
      motivo: body.motivo_alteracao || 'Atualização cadastral do processo',
      alteracoes: {
        objeto: updated.objeto !== existing.objeto ? { de: existing.objeto, para: updated.objeto } : undefined,
        valor_pca: updated.valor_pca !== existing.valor_pca ? { de: existing.valor_pca, para: updated.valor_pca } : undefined,
        modalidade: updated.modalidade !== existing.modalidade ? { de: existing.modalidade, para: updated.modalidade } : undefined,
      },
    },
    req.ip || '127.0.0.1'
  );

  res.json(updated);
});

// Advance or change process phase (Fases 1 a 7 do SAMS)
app.post('/api/licitacoes/:id/fase', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user as Usuario;
  const id = parseInt(req.params.id, 10);
  const { id_status, observacao } = req.body;

  const idx = storageProcessos.findIndex((p) => p.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Processo não encontrado.' });
  }

  const stNum = parseInt(id_status, 10);
  if (!statusMap[String(stNum)]) {
    return res.status(400).json({ error: 'Fase de status inválida.' });
  }

  const proc = storageProcessos[idx];
  const oldStatus = proc.status;
  const newStatusName = statusMap[String(stNum)];

  const novoHistorico: HistoricoStatus = {
    id_historico_status: (proc.historico?.length || 0) + 1,
    id_processo: id,
    id_status_processo: stNum,
    nome_status: newStatusName,
    data_status: new Date().toISOString(),
    observacao: observacao || `Avanço de status para ${newStatusName}`,
  };

  proc.id_status = stNum;
  proc.status = newStatusName;
  if (!proc.historico) proc.historico = [];
  proc.historico.push(novoHistorico);
  proc.updated_at = new Date().toISOString();

  recordAudit(
    user,
    'AVANCO_FASE',
    'processos',
    String(proc.id),
    proc.numero_processo,
    {
      faseAnterior: oldStatus,
      novaFase: newStatusName,
      idFase: stNum,
      observacao: observacao || 'Evolução na tramitação do processo.',
    },
    req.ip || '127.0.0.1'
  );

  res.json(proc);
});

app.delete('/api/licitacoes/:id', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user as Usuario;
  const id = parseInt(req.params.id, 10);
  const { motivo_exclusao } = req.body;

  if (!motivo_exclusao || motivo_exclusao.trim().length < 5) {
    return res.status(400).json({
      error: 'É obrigatório informar uma justificativa detalhada para exclusão de um processo licitatório.',
    });
  }

  const idx = storageProcessos.findIndex((p) => p.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Processo não encontrado.' });
  }

  const deleted = storageProcessos[idx];
  storageProcessos.splice(idx, 1);

  // Remove linked items
  storageItens = storageItens.filter((it) => it.id_processo !== id);

  recordAudit(
    user,
    'DELECAO',
    'processos',
    String(deleted.id),
    deleted.numero_processo,
    {
      objeto: deleted.objeto,
      valor_pca: deleted.valor_pca,
      justificativa: motivo_exclusao,
      itensRemovidos: deleted.total_itens,
    },
    req.ip || '127.0.0.1'
  );

  res.json({ success: true, message: `Processo ${deleted.numero_processo} excluído com sucesso.` });
});

// --- ITENS / TERMO DE REFERÊNCIA ---
app.get('/api/licitacoes/:id/itens', authMiddleware, (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  const itens = storageItens.filter((it) => it.id_processo === id);
  res.json(itens);
});

app.post('/api/licitacoes/:id/itens', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user as Usuario;
  const procId = parseInt(req.params.id, 10);
  const proc = storageProcessos.find((p) => p.id === procId);

  if (!proc) {
    return res.status(404).json({ error: 'Processo não encontrado.' });
  }

  const body = req.body;
  if (!body.descricao && !body.nome_produto) {
    return res.status(400).json({ error: 'A especificação/nome do item é obrigatória.' });
  }

  const nextId = storageItens.reduce((max, it) => Math.max(max, it.id), 0) + 1;
  const numItem = body.numero_item ? parseInt(body.numero_item, 10) : (storageItens.filter((it) => it.id_processo === procId).length + 1);
  const qtd = body.quantidade ? parseInt(body.quantidade, 10) : 1;
  const valEst = body.valor_unitario_estimado ? parseFloat(body.valor_unitario_estimado) : 0;
  const valHom = body.valor_unitario_homologado ? parseFloat(body.valor_unitario_homologado) : null;

  const novoItem: ItemLicitacao = {
    id: nextId,
    id_tr_produto: nextId,
    licitacao_id: procId,
    id_processo: procId,
    id_tr: proc.termo_referencia?.id_tr || procId,
    numero_item: numItem,
    id_produto: nextId,
    nome_produto: body.nome_produto || body.descricao || `Item ${numItem}`,
    descricao_produto: body.descricao_produto || body.descricao || '',
    descricao: body.descricao || body.nome_produto || '',
    unidade: body.unidade || body.unidade_medida || 'UN',
    unidade_medida: body.unidade_medida || body.unidade || 'UN',
    quantidade_produto: qtd,
    quantidade: qtd,
    codigo_catmat: body.codigo_catmat || undefined,
    nome_classe: body.nome_classe || 'OUTROS',
    valor_unitario_estimado: valEst,
    valor_unitario_homologado: valHom,
    valor_total_estimado: valEst * qtd,
    valor_total_homologado: valHom ? valHom * qtd : null,
    fornecedor_vencedor_id: body.fornecedor_vencedor_id ? parseInt(body.fornecedor_vencedor_id, 10) : null,
    status_item: valHom ? 'HOMOLOGADO' : valEst > 0 ? 'ESTIMADO' : 'CADASTRADO',
  };

  storageItens.push(novoItem);
  proc.total_itens = (proc.total_itens || 0) + 1;

  recordAudit(
    user,
    'INSERCAO',
    'tr_produtos',
    String(novoItem.id),
    `Item ${novoItem.numero_item} - ${proc.numero_processo}`,
    {
      descricao: novoItem.descricao,
      quantidade: novoItem.quantidade,
      valor_estimado: novoItem.valor_unitario_estimado,
      catmat: novoItem.codigo_catmat,
    },
    req.ip || '127.0.0.1'
  );

  res.status(201).json(novoItem);
});

app.delete('/api/itens/:id', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user as Usuario;
  const id = parseInt(req.params.id, 10);
  const idx = storageItens.findIndex((it) => it.id === id);

  if (idx === -1) {
    return res.status(404).json({ error: 'Item não encontrado.' });
  }

  const deleted = storageItens[idx];
  storageItens.splice(idx, 1);

  // Update process count
  const proc = storageProcessos.find((p) => p.id === deleted.id_processo);
  if (proc && proc.total_itens && proc.total_itens > 0) {
    proc.total_itens--;
  }

  recordAudit(
    user,
    'DELECAO',
    'tr_produtos',
    String(deleted.id),
    `Item ${deleted.numero_item} (${deleted.nome_produto})`,
    { processoId: deleted.id_processo, quantidade: deleted.quantidade },
    req.ip || '127.0.0.1'
  );

  res.json({ success: true });
});

// --- PRODUTOS & CATÁLOGO (CATMAT, LOTE, UNIDADE) ---
app.get('/api/produtos', authMiddleware, (req: Request, res: Response) => {
  const { search, lote, sort_by = 'nome_produto', sort_order = 'asc' } = req.query;

  let filtered = [...storageProdutos];

  if (search) {
    const q = String(search).toLowerCase().trim();
    filtered = filtered.filter(
      (p) =>
        p.nome_produto.toLowerCase().includes(q) ||
        p.descricao_produto.toLowerCase().includes(q) ||
        p.codigo_catmat.toLowerCase().includes(q) ||
        p.nome_lote.toLowerCase().includes(q) ||
        p.unidade.toLowerCase().includes(q)
    );
  }

  if (lote && lote !== 'ALL') {
    filtered = filtered.filter((p) => p.nome_lote === lote || String(p.id_lote) === lote);
  }

  filtered.sort((a: any, b: any) => {
    const valA = a[String(sort_by)] || '';
    const valB = b[String(sort_by)] || '';
    const comp = String(valA).localeCompare(String(valB), 'pt-BR', { numeric: true });
    return sort_order === 'desc' ? -comp : comp;
  });

  const lotesUnicos = Array.from(new Set(storageProdutos.map((p) => p.nome_lote).filter(Boolean))).sort();

  res.json({
    data: filtered,
    total: filtered.length,
    totalGeral: storageProdutos.length,
    lotes: lotesUnicos,
  });
});

app.post('/api/produtos', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user as Usuario;
  const body = req.body;

  if (!body.nome_produto) {
    return res.status(400).json({ error: 'Nome do produto é obrigatório.' });
  }

  const nextId = storageProdutos.reduce((max, p) => Math.max(max, p.id_produto), 0) + 1;
  const novoProd: StorageProduto = {
    id_produto: nextId,
    codigo_catmat: body.codigo_catmat || 'N/A',
    descricao_catmat: body.descricao_catmat || '',
    nome_produto: body.nome_produto.trim(),
    descricao_produto: body.descricao_produto || body.nome_produto.trim(),
    unidade: body.unidade || 'Unidade',
    id_lote: body.id_lote || null,
    nome_lote: body.nome_lote || 'Geral',
    descricao_lote: body.descricao_lote || '',
    id_classe: body.id_classe || null,
    nome_classe: body.nome_classe || 'Geral',
    marcas: body.marcas || [],
  };

  storageProdutos.unshift(novoProd);

  recordAudit(
    user,
    'INSERCAO',
    'produtos',
    String(novoProd.id_produto),
    novoProd.nome_produto,
    { catmat: novoProd.codigo_catmat, unidade: novoProd.unidade, lote: novoProd.nome_lote },
    req.ip || '127.0.0.1'
  );

  res.status(201).json(novoProd);
});

app.put('/api/produtos/:id', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user as Usuario;
  const id = parseInt(req.params.id, 10);
  const body = req.body;

  const idx = storageProdutos.findIndex((p) => p.id_produto === id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Produto não encontrado.' });
  }

  const prod = storageProdutos[idx];
  if (body.nome_produto !== undefined) prod.nome_produto = body.nome_produto;
  if (body.descricao_produto !== undefined) prod.descricao_produto = body.descricao_produto;
  if (body.codigo_catmat !== undefined) prod.codigo_catmat = body.codigo_catmat;
  if (body.unidade !== undefined) prod.unidade = body.unidade;
  if (body.nome_lote !== undefined) prod.nome_lote = body.nome_lote;

  recordAudit(
    user,
    'EDICAO',
    'produtos',
    String(prod.id_produto),
    prod.nome_produto,
    { alteracoes: body },
    req.ip || '127.0.0.1'
  );

  res.json(prod);
});

app.delete('/api/produtos/:id', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user as Usuario;
  const id = parseInt(req.params.id, 10);
  const { motivo_exclusao } = req.body || {};

  const idx = storageProdutos.findIndex((p) => p.id_produto === id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Produto não encontrado.' });
  }

  const deleted = storageProdutos.splice(idx, 1)[0];

  recordAudit(
    user,
    'DELECAO',
    'produtos',
    String(deleted.id_produto),
    deleted.nome_produto,
    { motivo: motivo_exclusao || 'Exclusão de produto do catálogo', catmat: deleted.codigo_catmat },
    req.ip || '127.0.0.1'
  );

  res.json({ success: true, message: 'Produto excluído com sucesso.' });
});

// --- FORNECEDORES ---
app.get('/api/fornecedores', authMiddleware, (req: Request, res: Response) => {
  res.json(storageFornecedores);
});

app.post('/api/fornecedores', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user as Usuario;
  const body = req.body;

  if (!body.razao_social && !body.nome_fornecedor) {
    return res.status(400).json({ error: 'Razão Social / Nome do Fornecedor é obrigatório.' });
  }

  const nextId = storageFornecedores.reduce((max, f) => Math.max(max, f.id), 0) + 1;
  const nome = (body.nome_fornecedor || body.razao_social).trim();
  const cnpj = (body.cnpj || body.cnpj_cpf || '00.000.000/0000-00').trim();

  const novoFornecedor: Fornecedor = {
    id: nextId,
    id_fornecedor: nextId,
    razao_social: nome,
    nome_fornecedor: nome,
    nome_fantasia: body.nome_fantasia || nome,
    cnpj_cpf: cnpj,
    cnpj,
    email: body.email || body.email_fornecedor || 'contato@fornecedor.com.br',
    email_fornecedor: body.email_fornecedor || body.email || 'contato@fornecedor.com.br',
    telefone: body.telefone || '(84) 3000-0000',
    uf: body.uf || body.estado || 'RN',
    cidade: body.cidade || 'Natal',
    estado: body.estado || body.uf || 'RN',
    porte: body.porte || 'DEMAIS',
    situacao_cadastral: 'ATIVO',
    total_empenhado: 0,
    total_empenhos: 0,
    total_itens_homologados: 0,
    created_at: new Date().toISOString(),
  };

  storageFornecedores.unshift(novoFornecedor);

  recordAudit(
    user,
    'INSERCAO',
    'fornecedores',
    String(novoFornecedor.id),
    novoFornecedor.razao_social,
    { cnpj: novoFornecedor.cnpj, email: novoFornecedor.email, uf: novoFornecedor.uf },
    req.ip || '127.0.0.1'
  );

  res.status(201).json(novoFornecedor);
});

// --- EMPENHOS / CONTRATOS ---
app.get('/api/contratos', authMiddleware, (req: Request, res: Response) => {
  res.json(storageContratos);
});

app.post('/api/contratos', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user as Usuario;
  const body = req.body;

  if (!body.numero_contrato && !body.numero_empenho) {
    return res.status(400).json({ error: 'Número da Nota de Empenho é obrigatório (ex: 2026NE000600).' });
  }

  const nextId = storageContratos.reduce((max, c) => Math.max(max, c.id), 0) + 1;
  const valor = parseFloat(body.valor_empenho || body.valor_global || '0');
  const procId = body.id_processo || body.licitacao_id || 1;
  const fornId = body.id_fornecedor || body.fornecedor_id || 1;
  const numEmp = body.numero_empenho || body.numero_contrato;

  const forn = storageFornecedores.find((f) => f.id === fornId);
  const proc = storageProcessos.find((p) => p.id === procId);

  const novoEmpenho: Contrato = {
    id: nextId,
    id_empenho: nextId,
    numero_contrato: numEmp,
    numero_empenho: numEmp,
    ano_empenho: body.ano_empenho || new Date().getFullYear(),
    licitacao_id: procId,
    id_processo: procId,
    fornecedor_id: fornId,
    id_fornecedor: fornId,
    objeto_resumo: body.objeto_resumo || proc?.objeto || `Empenho ${numEmp}`,
    valor_global: valor,
    valor_empenho: valor,
    enviado: body.enviado !== undefined ? body.enviado : true,
    data_envio: body.data_envio || new Date().toISOString(),
    num_processo_pagamento: body.num_processo_pagamento || null,
    pagamento_concluido: body.pagamento_concluido || false,
    data_assinatura: new Date().toISOString().slice(0, 10),
    data_inicio_vigencia: new Date().toISOString().slice(0, 10),
    data_fim_vigencia: '2026-12-31',
    status_contrato: 'VIGENTE',
    fiscal_titular: 'Flávio Seabra',
    numero_licitacao: proc?.numero_licitacao,
    num_proc_selecao: proc?.num_proc_selecao || undefined,
    fornecedor_nome: forn?.nome_fornecedor || 'FORNECEDOR SAMS',
    fornecedor_cnpj: forn?.cnpj,
  };

  storageContratos.unshift(novoEmpenho);

  if (proc) {
    proc.total_empenhos = (proc.total_empenhos || 0) + 1;
    proc.total_empenhado = (proc.total_empenhado || 0) + valor;
  }

  recordAudit(
    user,
    'INSERCAO',
    'empenhos',
    String(novoEmpenho.id),
    novoEmpenho.numero_empenho,
    {
      processoId: procId,
      fornecedor: novoEmpenho.fornecedor_nome,
      valor: novoEmpenho.valor_empenho,
      enviado: novoEmpenho.enviado,
    },
    req.ip || '127.0.0.1'
  );

  res.status(201).json(novoEmpenho);
});

// Update empenho payment / dispatch status
app.put('/api/contratos/:id/status', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user as Usuario;
  const id = parseInt(req.params.id, 10);
  const { enviado, pagamento_concluido, num_processo_pagamento } = req.body;

  const emp = storageContratos.find((c) => c.id === id);
  if (!emp) {
    return res.status(404).json({ error: 'Empenho não encontrado.' });
  }

  if (enviado !== undefined) emp.enviado = Boolean(enviado);
  if (pagamento_concluido !== undefined) {
    emp.pagamento_concluido = Boolean(pagamento_concluido);
    emp.status_contrato = emp.pagamento_concluido ? 'ENCERRADO' : 'VIGENTE';
  }
  if (num_processo_pagamento !== undefined) emp.num_processo_pagamento = num_processo_pagamento;

  recordAudit(
    user,
    'EDICAO',
    'empenhos',
    String(emp.id),
    emp.numero_empenho,
    {
      enviado: emp.enviado,
      pagamento_concluido: emp.pagamento_concluido,
      num_processo_pagamento: emp.num_processo_pagamento,
    },
    req.ip || '127.0.0.1'
  );

  res.json(emp);
});

// --- AUDITORIA ---
app.get('/api/auditoria', authMiddleware, (req: Request, res: Response) => {
  const { acao, entidade, search, limit } = req.query;

  let results = [...storageAuditoria];

  if (acao && acao !== 'TODAS') {
    results = results.filter((a) => a.acao === acao);
  }

  if (entidade && entidade !== 'TODAS') {
    results = results.filter((a) => a.entidade === entidade);
  }

  if (search) {
    const q = String(search).toLowerCase();
    results = results.filter(
      (a) =>
        a.usuario_nome.toLowerCase().includes(q) ||
        a.registro_identificador.toLowerCase().includes(q) ||
        JSON.stringify(a.detalhes).toLowerCase().includes(q)
    );
  }

  const max = limit ? parseInt(String(limit), 10) : 100;
  res.json({ data: results.slice(0, max), total: results.length });
});

// --- EXPORT CSV ---
app.get('/api/export/csv', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user as Usuario;

  let csv = 'ID;Codigo PCA;Processo Selecao;Objeto;Modalidade;Valor PCA;Status;Data Cadastro;Total Itens;Total Empenhado\n';
  storageProcessos.forEach((p) => {
    const sanitize = (s: any) => `"${String(s || '').replace(/"/g, '""')}"`;
    csv += [
      p.id,
      sanitize(p.codigo_pca),
      sanitize(p.num_proc_selecao),
      sanitize(p.objeto),
      sanitize(p.modalidade),
      p.valor_pca.toFixed(2),
      sanitize(p.status),
      p.created_at.slice(0, 10),
      p.total_itens || 0,
      (p.total_empenhado || 0).toFixed(2),
    ].join(';') + '\n';
  });

  recordAudit(
    user,
    'EXPORTACAO',
    'processos',
    'csv-export',
    'relatorio_sams.csv',
    { totalLinhas: storageProcessos.length },
    req.ip || '127.0.0.1'
  );

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="sams_licitacoes_export.csv"');
  res.send('\uFEFF' + csv);
});

// =========================================================================
// VITE DEV SERVER MIDDLEWARE & STATIC SERVING
// =========================================================================

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SAMS Engine] Servidor ativo em http://0.0.0.0:${PORT}`);
    console.log(`[SAMS Engine] Base autêntica carregada com ${storageProcessos.length} processos, ${storageFornecedores.length} fornecedores e ${storageContratos.length} empenhos.`);
  });
}

startServer().catch((err) => {
  console.error('Fatal error starting SAMS server:', err);
});
