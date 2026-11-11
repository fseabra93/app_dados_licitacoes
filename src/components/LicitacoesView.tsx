import React, { useState } from 'react';
import { Licitacao, Fornecedor } from '../types';
import { formatMoney, formatDate, MODALIDADES_MAP, STATUS_MAP } from '../utils/formatters';
import { LicitacaoModal } from './LicitacaoModal';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { LicitacaoDetailsDrawer } from './LicitacaoDetailsDrawer';
import { api } from '../services/api';

interface LicitacoesViewProps {
  licitacoes: Licitacao[];
  fornecedores: Fornecedor[];
  isLoading: boolean;
  onRefresh: () => void;
  onOpenNewModal: () => void;
  isNewModalOpen: boolean;
  onCloseNewModal: () => void;
  defaultPregoeiro?: string;
}

export const LicitacoesView: React.FC<LicitacoesViewProps> = ({
  licitacoes,
  fornecedores,
  isLoading,
  onRefresh,
  onOpenNewModal,
  isNewModalOpen,
  onCloseNewModal,
  defaultPregoeiro,
}) => {
  // Filters & State
  const [searchTerm, setSearchTerm] = useState('');
  const [modalidadeFilter, setModalidadeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [anoFilter, setAnoFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState<'id' | 'valor_estimado' | 'data_abertura'>('id');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // Modals
  const [editingLicitacao, setEditingLicitacao] = useState<Licitacao | null>(null);
  const [deletingLicitacao, setDeletingLicitacao] = useState<Licitacao | null>(null);
  const [viewingLicitacaoId, setViewingLicitacaoId] = useState<number | null>(null);

  // Filter logic
  const filtered = licitacoes.filter((l) => {
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchText =
        l.numero_licitacao.toLowerCase().includes(q) ||
        l.numero_processo.toLowerCase().includes(q) ||
        l.objeto.toLowerCase().includes(q) ||
        l.pregoeiro_responsavel.toLowerCase().includes(q) ||
        l.orgao_setor.toLowerCase().includes(q);
      if (!matchText) return false;
    }

    if (modalidadeFilter !== 'ALL' && l.modalidade !== modalidadeFilter) return false;
    if (statusFilter !== 'ALL' && l.status !== statusFilter) return false;
    if (anoFilter !== 'ALL' && l.ano.toString() !== anoFilter) return false;

    return true;
  });

  // Sort logic
  filtered.sort((a, b) => {
    const factor = sortOrder === 'asc' ? 1 : -1;
    if (sortBy === 'valor_estimado') {
      return (a.valor_estimado - b.valor_estimado) * factor;
    }
    if (sortBy === 'data_abertura') {
      const da = a.data_abertura ? new Date(a.data_abertura).getTime() : 0;
      const db = b.data_abertura ? new Date(b.data_abertura).getTime() : 0;
      return (da - db) * factor;
    }
    return (a.id - b.id) * factor;
  });

  // Handlers
  const handleCreateLicitacao = async (data: any) => {
    await api.createLicitacao(data);
    onRefresh();
  };

  const handleUpdateLicitacao = async (data: any) => {
    if (!editingLicitacao) return;
    await api.updateLicitacao(editingLicitacao.id, data);
    setEditingLicitacao(null);
    onRefresh();
  };

  const handleDeleteLicitacao = async (id: number, motivo: string) => {
    await api.deleteLicitacao(id, motivo);
    setDeletingLicitacao(null);
    if (viewingLicitacaoId === id) setViewingLicitacaoId(null);
    onRefresh();
  };

  const handleExportCsv = () => {
    window.location.href = api.exportCsvUrl();
  };

  return (
    <div className="space-y-6">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            Gestão de Licitações (Tabela licitacoes)
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Inserções, atualizações, cancelamentos e consultas auditadas no banco de dados local
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCsv}
            className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded transition-colors whitespace-nowrap"
          >
            Exportar CSV
          </button>
          <button
            onClick={onOpenNewModal}
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded transition-colors whitespace-nowrap shadow-sm"
          >
            + Nova Licitação
          </button>
        </div>
      </div>

      {/* Advanced Filter Toolbar */}
      <div className="bg-[#0f1a2d] border border-slate-800 rounded-lg p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          {/* Search */}
          <div className="lg:col-span-2">
            <label className="block text-slate-400 mb-1">Busca Textual</label>
            <input
              type="text"
              placeholder="Buscar por nº da licitação, processo, objeto ou pregoeiro..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#0a121f] border border-slate-700 rounded px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-sky-500"
            />
          </div>

          {/* Modalidade */}
          <div>
            <label className="block text-slate-400 mb-1">Modalidade</label>
            <select
              value={modalidadeFilter}
              onChange={(e) => setModalidadeFilter(e.target.value)}
              className="w-full bg-[#0a121f] border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white focus:outline-hidden focus:border-sky-500"
            >
              <option value="ALL">Todas as modalidades</option>
              {Object.entries(MODALIDADES_MAP).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-slate-400 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-[#0a121f] border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white focus:outline-hidden focus:border-sky-500"
            >
              <option value="ALL">Todos os status</option>
              {Object.entries(STATUS_MAP).map(([key, info]) => (
                <option key={key} value={key}>
                  {info.label}
                </option>
              ))}
            </select>
          </div>

          {/* Ano */}
          <div>
            <label className="block text-slate-400 mb-1">Exercício / Ano</label>
            <select
              value={anoFilter}
              onChange={(e) => setAnoFilter(e.target.value)}
              className="w-full bg-[#0a121f] border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white focus:outline-hidden focus:border-sky-500"
            >
              <option value="ALL">Todos os anos</option>
              <option value="2026">2026</option>
              <option value="2025">2025</option>
              <option value="2024">2024</option>
            </select>
          </div>
        </div>

        {/* Sorting and reset */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-800/80 text-xs text-slate-400">
          <div>
            Exibindo <span className="font-semibold text-white tabular-nums">{filtered.length}</span> de{' '}
            <span className="font-semibold text-white tabular-nums">{licitacoes.length}</span> licitações encontradas
          </div>

          <div className="flex items-center gap-3">
            <span className="text-slate-400">Ordenar por:</span>
            <button
              onClick={() => {
                if (sortBy === 'id') setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
                else { setSortBy('id'); setSortOrder('desc'); }
              }}
              className={`hover:text-white transition-colors ${sortBy === 'id' ? 'text-sky-400 font-semibold' : ''}`}
            >
              Cadastro {sortBy === 'id' ? (sortOrder === 'desc' ? '↓' : '↑') : ''}
            </button>
            <button
              onClick={() => {
                if (sortBy === 'valor_estimado') setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
                else { setSortBy('valor_estimado'); setSortOrder('desc'); }
              }}
              className={`hover:text-white transition-colors ${sortBy === 'valor_estimado' ? 'text-sky-400 font-semibold' : ''}`}
            >
              Valor {sortBy === 'valor_estimado' ? (sortOrder === 'desc' ? '↓' : '↑') : ''}
            </button>
            <button
              onClick={() => {
                if (sortBy === 'data_abertura') setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
                else { setSortBy('data_abertura'); setSortOrder('desc'); }
              }}
              className={`hover:text-white transition-colors ${sortBy === 'data_abertura' ? 'text-sky-400 font-semibold' : ''}`}
            >
              Abertura {sortBy === 'data_abertura' ? (sortOrder === 'desc' ? '↓' : '↑') : ''}
            </button>

            {(searchTerm || modalidadeFilter !== 'ALL' || statusFilter !== 'ALL' || anoFilter !== 'ALL') && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setModalidadeFilter('ALL');
                  setStatusFilter('ALL');
                  setAnoFilter('ALL');
                }}
                className="text-sky-400 hover:underline ml-2"
              >
                Limpar filtros
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Table View */}
      <div className="bg-[#0f1a2d] border border-slate-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#0a121f] text-slate-400 border-b border-slate-800 font-medium">
                <th className="py-3 px-4 whitespace-nowrap">Licitação / Processo</th>
                <th className="py-3 px-4 whitespace-nowrap">Modalidade & Setor</th>
                <th className="py-3 px-4 min-w-[260px]">Objeto da Contratação</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Estimado</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Homologado</th>
                <th className="py-3 px-4 whitespace-nowrap">Status</th>
                <th className="py-3 px-4 whitespace-nowrap">Abertura</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Consultando registros no banco de dados...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <p className="text-sm font-medium text-slate-300">Nenhuma licitação encontrada</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Ajuste os filtros de pesquisa ou cadastre uma nova licitação.
                    </p>
                    <button
                      onClick={onOpenNewModal}
                      className="mt-3 px-3.5 py-1.5 text-xs text-sky-400 hover:text-white bg-slate-800 rounded transition-colors"
                    >
                      Cadastrar Primeira Licitação
                    </button>
                  </td>
                </tr>
              ) : (
                filtered.map((l) => {
                  const statusInfo = STATUS_MAP[l.status] || {
                    label: l.status,
                    textClass: 'text-slate-300',
                  };
                  const modLabel = MODALIDADES_MAP[l.modalidade] || l.modalidade;

                  return (
                    <tr
                      key={l.id}
                      className="hover:bg-slate-800/40 transition-colors group cursor-pointer"
                      onClick={() => setViewingLicitacaoId(l.id)}
                    >
                      <td className="py-3 px-4">
                        <div className="font-mono font-bold text-white whitespace-nowrap">
                          {l.numero_licitacao}
                        </div>
                        <div className="font-mono text-[11px] text-slate-400 whitespace-nowrap">
                          Proc: {l.numero_processo}
                        </div>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-medium text-slate-200">{modLabel}</div>
                        <div className="text-[11px] text-slate-400">{l.orgao_setor}</div>
                      </td>

                      <td className="py-3 px-4">
                        <p className="text-slate-300 line-clamp-2 leading-relaxed" title={l.objeto}>
                          {l.objeto}
                        </p>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Pregoeiro: <span className="text-slate-300">{l.pregoeiro_responsavel}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right font-mono font-medium text-slate-200 tabular-nums whitespace-nowrap">
                        {formatMoney(l.valor_estimado)}
                      </td>

                      <td className="py-3 px-4 text-right font-mono font-bold tabular-nums whitespace-nowrap">
                        {l.valor_homologado !== null ? (
                          <span className="text-emerald-400">{formatMoney(l.valor_homologado)}</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`font-semibold ${statusInfo.textClass}`}>
                          {statusInfo.label}
                        </span>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px] text-slate-300">
                        {formatDate(l.data_abertura)}
                      </td>

                      <td
                        className="py-3 px-4 text-right whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setViewingLicitacaoId(l.id)}
                            className="px-2 py-1 text-[11px] text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded transition-colors"
                            title="Ver Detalhes, Itens e Contratos"
                          >
                            Detalhes
                          </button>
                          <button
                            onClick={() => setEditingLicitacao(l)}
                            className="px-2 py-1 text-[11px] text-sky-400 hover:text-sky-300 bg-sky-950/40 hover:bg-sky-900/60 border border-sky-800/60 rounded transition-colors"
                            title="Editar Dados da Licitação"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => setDeletingLicitacao(l)}
                            className="px-2 py-1 text-[11px] text-rose-400 hover:text-rose-300 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 rounded transition-colors"
                            title="Excluir do Banco com Justificativa"
                          >
                            Excluir
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Insert Modal */}
      <LicitacaoModal
        isOpen={isNewModalOpen}
        onClose={onCloseNewModal}
        onSubmit={handleCreateLicitacao}
        defaultPregoeiro={defaultPregoeiro}
      />

      {/* Edit Modal */}
      <LicitacaoModal
        isOpen={Boolean(editingLicitacao)}
        onClose={() => setEditingLicitacao(null)}
        onSubmit={handleUpdateLicitacao}
        initialData={editingLicitacao}
        defaultPregoeiro={defaultPregoeiro}
      />

      {/* Delete Confirmation with Audit Reason */}
      <DeleteConfirmModal
        isOpen={Boolean(deletingLicitacao)}
        licitacao={deletingLicitacao}
        onClose={() => setDeletingLicitacao(null)}
        onConfirm={handleDeleteLicitacao}
      />

      {/* Details Drawer */}
      <LicitacaoDetailsDrawer
        licitacaoId={viewingLicitacaoId}
        onClose={() => setViewingLicitacaoId(null)}
        onEdit={(lic) => {
          setViewingLicitacaoId(null);
          setEditingLicitacao(lic);
        }}
        onDelete={(lic) => {
          setViewingLicitacaoId(null);
          setDeletingLicitacao(lic);
        }}
        fornecedores={fornecedores}
      />
    </div>
  );
};
