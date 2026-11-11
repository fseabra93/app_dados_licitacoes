import {
  Usuario,
  Licitacao,
  ItemLicitacao,
  Fornecedor,
  Contrato,
  LogAuditoria,
  DashboardStats,
  ConnectionStatus,
  ProdutoCatalogo,
} from '../types';

const TOKEN_KEY = 'sams_auth_token';

export const getAuthToken = (): string => {
  return localStorage.getItem(TOKEN_KEY) || 'flavio.seabra@tre-rn.jus.br';
};

export const setAuthToken = (token: string) => {
  localStorage.setItem(TOKEN_KEY, token);
};

export const removeAuthToken = () => {
  localStorage.removeItem(TOKEN_KEY);
};

const getHeaders = () => {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const api = {
  // Auth
  async login(email: string, password: string):Promise<{ token: string; user: Usuario }> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Falha ao autenticar.');
    }
    const data = await res.json();
    setAuthToken(data.token);
    return data;
  },

  async getMe(): Promise<{ user: Usuario }> {
    const res = await fetch('/api/auth/me', { headers: getHeaders() });
    if (!res.ok) throw new Error('Não autenticado');
    return res.json();
  },

  async logout(): Promise<void> {
    try {
      await fetch('/api/auth/logout', { method: 'POST', headers: getHeaders() });
    } finally {
      removeAuthToken();
    }
  },

  // Connection
  async getConnectionStatus(): Promise<ConnectionStatus> {
    const res = await fetch('/api/connection/status', { headers: getHeaders() });
    if (!res.ok) throw new Error('Falha ao obter status da conexão.');
    return res.json();
  },

  async testConnection(): Promise<{ success: boolean; message: string; version?: string; isConnected: boolean }> {
    const res = await fetch('/api/connection/test', { method: 'POST', headers: getHeaders() });
    return res.json();
  },

  async reconfigureConnection(config: { host?: string; port?: number; database?: string; user?: string; password?: string }): Promise<any> {
    const res = await fetch('/api/connection/reconfigure', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(config),
    });
    return res.json();
  },

  async getSqlScript(): Promise<string> {
    const res = await fetch('/api/script/sql');
    return res.text();
  },

  async uploadSqlBackup(payload: {
    filename?: string;
    contentBase64?: string;
    contentText?: string;
    useDefaultFile?: boolean;
  }): Promise<{
    success: boolean;
    message: string;
    summary: {
      filename: string;
      tabelasAtualizadas: number;
      totalProcessos: number;
      totalEmpenhos: number;
      totalFornecedores: number;
      totalItensTR: number;
      valorTotalEmpenhado: number;
      tabelas: string[];
    };
  }> {
    const res = await fetch('/api/database/upload-sql', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Falha ao atualizar base a partir do arquivo SQL.');
    }
    return data;
  },

  // Produtos & Catálogo SAMS (CATMAT, Lote, Unidade)
  async getProdutos(params?: {
    search?: string;
    lote?: string;
    sort_by?: string;
    sort_order?: string;
  }): Promise<{ data: ProdutoCatalogo[]; total: number; totalGeral: number; lotes: string[] }> {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val) query.set(key, val);
      });
    }
    const res = await fetch(`/api/produtos?${query.toString()}`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Falha ao buscar produtos.');
    return res.json();
  },

  async createProduto(produto: Partial<ProdutoCatalogo>): Promise<ProdutoCatalogo> {
    const res = await fetch('/api/produtos', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(produto),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Falha ao cadastrar produto.');
    }
    return res.json();
  },

  async updateProduto(id: number, produto: Partial<ProdutoCatalogo>): Promise<ProdutoCatalogo> {
    const res = await fetch(`/api/produtos/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(produto),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Falha ao atualizar produto.');
    }
    return res.json();
  },

  async deleteProduto(id: number, motivo_exclusao?: string): Promise<void> {
    const res = await fetch(`/api/produtos/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
      body: JSON.stringify({ motivo_exclusao }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Falha ao excluir produto.');
    }
  },

  // Dashboard
  async getDashboardStats(): Promise<DashboardStats> {
    const res = await fetch('/api/dashboard/stats', { headers: getHeaders() });
    if (!res.ok) throw new Error('Falha ao carregar métricas.');
    return res.json();
  },

  // Licitações
  async getLicitacoes(params?: {
    search?: string;
    modalidade?: string;
    status?: string;
    ano?: string;
    orgao?: string;
    sort_by?: string;
    sort_order?: string;
  }): Promise<{ data: Licitacao[]; total: number }> {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val) query.set(key, val);
      });
    }
    const res = await fetch(`/api/licitacoes?${query.toString()}`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Falha ao buscar licitações.');
    return res.json();
  },

  async getLicitacaoById(id: number): Promise<{
    licitacao: Licitacao;
    itens: ItemLicitacao[];
    contratos: Contrato[];
    historicoAuditoria: LogAuditoria[];
  }> {
    const res = await fetch(`/api/licitacoes/${id}`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Licitação não encontrada.');
    return res.json();
  },

  async createLicitacao(data: Partial<Licitacao> & { justificativa_cadastro?: string }): Promise<Licitacao> {
    const res = await fetch('/api/licitacoes', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Erro ao cadastrar licitação.');
    }
    return res.json();
  },

  async updateLicitacao(id: number, data: Partial<Licitacao> & { motivo_alteracao?: string }): Promise<Licitacao> {
    const res = await fetch(`/api/licitacoes/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Erro ao atualizar licitação.');
    }
    return res.json();
  },

  async deleteLicitacao(id: number, motivo_exclusao: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`/api/licitacoes/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
      body: JSON.stringify({ motivo_exclusao }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Erro ao excluir licitação.');
    }
    return res.json();
  },

  async avancarFase(id: number, id_status: number, observacao?: string): Promise<Licitacao> {
    const res = await fetch(`/api/licitacoes/${id}/fase`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ id_status, observacao }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Erro ao avançar fase do processo.');
    }
    return res.json();
  },

  async updateContratoStatus(
    id: number,
    data: { enviado?: boolean; data_envio?: string | null; pagamento_concluido?: boolean; num_processo_pagamento?: string }
  ): Promise<Contrato> {
    const res = await fetch(`/api/contratos/${id}/status`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Erro ao atualizar status do empenho.');
    }
    return res.json();
  },

  // Itens
  async addItem(licitacaoId: number, item: Partial<ItemLicitacao>): Promise<ItemLicitacao> {
    const res = await fetch(`/api/licitacoes/${licitacaoId}/itens`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(item),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Erro ao adicionar item.');
    }
    return res.json();
  },

  async deleteItem(id: number): Promise<void> {
    const res = await fetch(`/api/itens/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Erro ao excluir item.');
  },

  // Fornecedores
  async getFornecedores(): Promise<Fornecedor[]> {
    const res = await fetch('/api/fornecedores', { headers: getHeaders() });
    if (!res.ok) throw new Error('Falha ao listar fornecedores.');
    return res.json();
  },

  async createFornecedor(fornecedor: Partial<Fornecedor>): Promise<Fornecedor> {
    const res = await fetch('/api/fornecedores', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(fornecedor),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Erro ao cadastrar fornecedor.');
    }
    return res.json();
  },

  // Contratos
  async getContratos(): Promise<Contrato[]> {
    const res = await fetch('/api/contratos', { headers: getHeaders() });
    if (!res.ok) throw new Error('Falha ao listar contratos.');
    return res.json();
  },

  async createContrato(contrato: Partial<Contrato>): Promise<Contrato> {
    const res = await fetch('/api/contratos', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(contrato),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Erro ao cadastrar contrato.');
    }
    return res.json();
  },

  // Auditoria
  async getAuditoria(params?: { acao?: string; entidade?: string; search?: string; limit?: number }): Promise<{
    data: LogAuditoria[];
    total: number;
  }> {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val) query.set(key, String(val));
      });
    }
    const res = await fetch(`/api/auditoria?${query.toString()}`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Falha ao listar logs de auditoria.');
    return res.json();
  },

  // Export
  exportCsvUrl(): string {
    return '/api/export/csv';
  },
};
