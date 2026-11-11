import React, { useState } from 'react';
import { Contrato, Licitacao, Fornecedor } from '../types';
import { formatMoney, formatDate } from '../utils/formatters';
import { api } from '../services/api';

interface ContratosViewProps {
  contratos: Contrato[];
  licitacoes: Licitacao[];
  fornecedores: Fornecedor[];
  isLoading: boolean;
  onRefresh: () => void;
  defaultFiscal?: string;
}

export const ContratosView: React.FC<ContratosViewProps> = ({
  contratos,
  licitacoes,
  fornecedores,
  isLoading,
  onRefresh,
  defaultFiscal = 'Flávio Seabra',
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusPagamentoFilter, setStatusPagamentoFilter] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [numeroEmpenho, setNumeroEmpenho] = useState('');
  const [licitacaoId, setLicitacaoId] = useState('');
  const [fornecedorId, setFornecedorId] = useState('');
  const [objetoResumo, setObjetoResumo] = useState('');
  const [valorGlobal, setValorGlobal] = useState('');
  const [dataEnvio, setDataEnvio] = useState(new Date().toISOString().split('T')[0]);
  const [procPagamento, setProcPagamento] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const filtered = contratos.filter((c) => {
    if (statusPagamentoFilter === 'PAGO' && !c.pagamento_concluido) return false;
    if (statusPagamentoFilter === 'PENDENTE' && c.pagamento_concluido) return false;

    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      (c.numero_empenho && c.numero_empenho.toLowerCase().includes(q)) ||
      (c.numero_contrato && c.numero_contrato.toLowerCase().includes(q)) ||
      c.objeto_resumo.toLowerCase().includes(q) ||
      (c.fornecedor_nome && c.fornecedor_nome.toLowerCase().includes(q)) ||
      (c.num_proc_selecao && c.num_proc_selecao.toLowerCase().includes(q)) ||
      (c.num_processo_pagamento && c.num_processo_pagamento.toLowerCase().includes(q))
    );
  });

  const handleTogglePagamento = async (emp: Contrato) => {
    try {
      await api.updateContratoStatus(emp.id, {
        pagamento_concluido: !emp.pagamento_concluido,
      });
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Erro ao atualizar pagamento do empenho.');
    }
  };

  const handleToggleEnvio = async (emp: Contrato) => {
    try {
      await api.updateContratoStatus(emp.id, {
        enviado: !emp.enviado,
        data_envio: !emp.enviado ? new Date().toISOString() : null,
      });
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Erro ao atualizar envio do empenho.');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!numeroEmpenho.trim() || !licitacaoId || !fornecedorId || !valorGlobal) {
      setErrorMsg('Preencha os campos obrigatórios (Nº Empenho, Processo, Fornecedor e Valor).');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');
    try {
      await api.createContrato({
        numero_contrato: numeroEmpenho.trim(),
        numero_empenho: numeroEmpenho.trim(),
        licitacao_id: parseInt(licitacaoId, 10),
        id_processo: parseInt(licitacaoId, 10),
        fornecedor_id: parseInt(fornecedorId, 10),
        id_fornecedor: parseInt(fornecedorId, 10),
        objeto_resumo: objetoResumo.trim(),
        valor_global: parseFloat(valorGlobal) || 0,
        valor_empenho: parseFloat(valorGlobal) || 0,
        enviado: true,
        data_envio: dataEnvio,
        num_processo_pagamento: procPagamento.trim() || undefined,
        pagamento_concluido: false,
        status_contrato: 'VIGENTE',
        fiscal_titular: defaultFiscal,
      });
      setIsModalOpen(false);
      setNumeroEmpenho('');
      setObjetoResumo('');
      setValorGlobal('');
      setProcPagamento('');
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao cadastrar empenho.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalValor = filtered.reduce((acc, c) => acc + (c.valor_empenho || c.valor_global || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-white">
              Execução Financeira & Notas de Empenho (Tabela empenho)
            </h1>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-800 text-emerald-300">
              24 Notas Autênticas
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Acompanhamento de emissão, envio ao fornecedor e liquidação de pagamentos do SAMS/TRE-RN
          </p>
        </div>

        <button
          onClick={() => {
            setNumeroEmpenho(`2026NE000${600 + contratos.length}`);
            setLicitacaoId(licitacoes.length > 0 ? String(licitacoes[0].id) : '');
            setFornecedorId(fornecedores.length > 0 ? String(fornecedores[0].id) : '');
            setIsModalOpen(true);
          }}
          className="px-3.5 py-1.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded transition-colors whitespace-nowrap shadow-sm"
        >
          + Emitir Nota de Empenho
        </button>
      </div>

      {/* Search Toolbar */}
      <div className="bg-[#0f1a2d] border border-slate-800 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:max-w-2xl">
          <input
            type="text"
            placeholder="Buscar por nº do empenho, processo, fornecedor ou proc. de pagamento..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#0a121f] border border-slate-700 rounded px-3 py-1.5 text-white placeholder-slate-500 focus:outline-hidden focus:border-sky-500"
          />

          <select
            value={statusPagamentoFilter}
            onChange={(e) => setStatusPagamentoFilter(e.target.value)}
            className="bg-[#0a121f] border border-slate-700 rounded px-3 py-1.5 text-white shrink-0"
          >
            <option value="ALL">Todos os pagamentos</option>
            <option value="PAGO">Pagamento Concluído</option>
            <option value="PENDENTE">Pendente de Pagamento</option>
          </select>
        </div>

        <div className="text-slate-400 text-xs flex items-center gap-3 shrink-0">
          <span>Total: <strong className="text-white tabular-nums">{filtered.length}</strong> empenhos</span>
          <span>·</span>
          <span>Soma: <strong className="text-emerald-400 font-mono tabular-nums">{formatMoney(totalValor)}</strong></span>
        </div>
      </div>

      {/* Empenhos Table */}
      <div className="bg-[#0f1a2d] border border-slate-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#0a121f] text-slate-400 border-b border-slate-800 font-medium">
                <th className="py-3 px-4 whitespace-nowrap">Nº Empenho / Ano</th>
                <th className="py-3 px-4 whitespace-nowrap">Processo Seleção</th>
                <th className="py-3 px-4 whitespace-nowrap">Fornecedor Contratado</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Valor do Empenho</th>
                <th className="py-3 px-4 whitespace-nowrap">Envio Fornecedor</th>
                <th className="py-3 px-4 whitespace-nowrap">Proc. Pagamento</th>
                <th className="py-3 px-4 whitespace-nowrap">Status Pagamento</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Carregando notas de empenho...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Nenhum empenho encontrado.
                  </td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-mono font-bold text-white text-xs">{c.numero_empenho}</div>
                      <div className="text-[10px] text-slate-400 font-mono">Exercício {c.ano_empenho || 2026}</div>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap font-mono text-slate-300">
                      <div>{c.num_proc_selecao || c.numero_licitacao || `Proc. ${c.id_processo}`}</div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-200">{c.fornecedor_nome}</div>
                      {c.fornecedor_cnpj && (
                        <div className="text-[10px] text-slate-400 font-mono">CNPJ: {c.fornecedor_cnpj}</div>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400 tabular-nums whitespace-nowrap">
                      {formatMoney(c.valor_empenho || c.valor_global)}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <button
                        onClick={() => handleToggleEnvio(c)}
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded border transition-colors ${
                          c.enviado
                            ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300 hover:bg-emerald-900/60'
                            : 'bg-amber-950/40 border-amber-800 text-amber-300 hover:bg-amber-900/60'
                        }`}
                        title="Clique para alternar envio"
                      >
                        {c.enviado ? '✅ ENVIADO' : '⏳ PENDENTE'}
                      </button>
                      {c.data_envio && (
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">{formatDate(c.data_envio)}</div>
                      )}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap font-mono text-slate-300">
                      {c.num_processo_pagamento ? (
                        <span className="text-sky-300">{c.num_processo_pagamento}</span>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <button
                        onClick={() => handleTogglePagamento(c)}
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded border transition-colors ${
                          c.pagamento_concluido
                            ? 'bg-teal-950/40 border-teal-800 text-teal-300 hover:bg-teal-900/60'
                            : 'bg-amber-950/40 border-amber-800 text-amber-300 hover:bg-amber-900/60'
                        }`}
                        title="Clique para alternar pagamento concluído"
                      >
                        {c.pagamento_concluido ? '✓ CONCLUÍDO' : '⏳ EM LIQUIDAÇÃO'}
                      </button>
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => handleTogglePagamento(c)}
                        className="px-2 py-1 text-[11px] text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded transition-colors"
                      >
                        {c.pagamento_concluido ? 'Reabrir' : 'Dar Baixa'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Empenho Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-[#0f1a2d] border border-slate-700 w-full max-w-lg rounded-xl shadow-2xl p-6 text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-base font-bold text-white">Emitir Nova Nota de Empenho</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded"
              >
                ✕
              </button>
            </div>

            {errorMsg && (
              <div className="mt-3 p-2 bg-rose-950/60 border border-rose-800 rounded text-xs text-rose-300">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreate} className="mt-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Nº Nota de Empenho *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: 2026NE000620"
                    value={numeroEmpenho}
                    onChange={(e) => setNumeroEmpenho(e.target.value)}
                    className="w-full bg-[#0a121f] border border-slate-700 rounded px-3 py-1.5 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">Valor do Empenho (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={valorGlobal}
                    onChange={(e) => setValorGlobal(e.target.value)}
                    className="w-full bg-[#0a121f] border border-slate-700 rounded px-3 py-1.5 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Processo de Compra *</label>
                <select
                  required
                  value={licitacaoId}
                  onChange={(e) => setLicitacaoId(e.target.value)}
                  className="w-full bg-[#0a121f] border border-slate-700 rounded px-3 py-1.5 text-white"
                >
                  <option value="">Selecione o processo...</option>
                  {licitacoes.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.num_proc_selecao || l.numero_processo} — {l.objeto.slice(0, 50)}...
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Fornecedor Favorecido *</label>
                <select
                  required
                  value={fornecedorId}
                  onChange={(e) => setFornecedorId(e.target.value)}
                  className="w-full bg-[#0a121f] border border-slate-700 rounded px-3 py-1.5 text-white"
                >
                  <option value="">Selecione o fornecedor...</option>
                  {fornecedores.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.nome_fornecedor || f.razao_social} ({f.cnpj})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Data de Envio</label>
                  <input
                    type="date"
                    value={dataEnvio}
                    onChange={(e) => setDataEnvio(e.target.value)}
                    className="w-full bg-[#0a121f] border border-slate-700 rounded px-3 py-1.5 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">Proc. de Pagamento (Opcional)</label>
                  <input
                    type="text"
                    placeholder="Ex: 02656/2026"
                    value={procPagamento}
                    onChange={(e) => setProcPagamento(e.target.value)}
                    className="w-full bg-[#0a121f] border border-slate-700 rounded px-3 py-1.5 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Descrição / Objeto do Empenho</label>
                <input
                  type="text"
                  placeholder="Ex: Fornecimento de materiais de consumo médico..."
                  value={objetoResumo}
                  onChange={(e) => setObjetoResumo(e.target.value)}
                  className="w-full bg-[#0a121f] border border-slate-700 rounded px-3 py-1.5 text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded font-medium disabled:opacity-50"
                >
                  {isSubmitting ? 'Gravando...' : 'Gravar Empenho'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
