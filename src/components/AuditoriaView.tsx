import React, { useState } from 'react';
import { LogAuditoria } from '../types';
import { formatDateTime, ACAO_AUDITORIA_MAP } from '../utils/formatters';

interface AuditoriaViewProps {
  logs: LogAuditoria[];
  isLoading: boolean;
  onRefresh: () => void;
}

export const AuditoriaView: React.FC<AuditoriaViewProps> = ({
  logs,
  isLoading,
  onRefresh,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [acaoFilter, setAcaoFilter] = useState('ALL');
  const [entidadeFilter, setEntidadeFilter] = useState('ALL');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const filtered = logs.filter((l) => {
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const match =
        l.usuario_nome.toLowerCase().includes(q) ||
        l.usuario_email.toLowerCase().includes(q) ||
        l.registro_identificador.toLowerCase().includes(q) ||
        JSON.stringify(l.detalhes).toLowerCase().includes(q) ||
        l.ip_origem.toLowerCase().includes(q);
      if (!match) return false;
    }

    if (acaoFilter !== 'ALL' && l.acao !== acaoFilter) return false;
    if (entidadeFilter !== 'ALL' && l.entidade !== entidadeFilter) return false;

    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            Trilha Imutável de Auditoria (Tabela logs_auditoria)
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Registro cronológico integral de todas as inserções, edições, exclusões, consultas e conexões no banco
          </p>
        </div>

        <button
          onClick={onRefresh}
          className="px-3.5 py-1.5 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded transition-colors whitespace-nowrap"
        >
          Atualizar Trilha
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-[#0f1a2d] border border-slate-800 rounded-lg p-4 space-y-3 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-slate-400 mb-1">Pesquisar Operação</label>
            <input
              type="text"
              placeholder="Operador, processo, detalhe ou IP..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#0a121f] border border-slate-700 rounded px-3 py-1.5 text-white placeholder-slate-500 focus:outline-hidden focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1">Tipo de Ação</label>
            <select
              value={acaoFilter}
              onChange={(e) => setAcaoFilter(e.target.value)}
              className="w-full bg-[#0a121f] border border-slate-700 rounded px-2.5 py-1.5 text-white focus:outline-hidden focus:border-sky-500"
            >
              <option value="ALL">Todas as ações</option>
              {Object.entries(ACAO_AUDITORIA_MAP).map(([key, info]) => (
                <option key={key} value={key}>
                  {info.label} ({key})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-400 mb-1">Entidade / Tabela</label>
            <select
              value={entidadeFilter}
              onChange={(e) => setEntidadeFilter(e.target.value)}
              className="w-full bg-[#0a121f] border border-slate-700 rounded px-2.5 py-1.5 text-white focus:outline-hidden focus:border-sky-500"
            >
              <option value="ALL">Todas as tabelas</option>
              <option value="licitacoes">licitacoes</option>
              <option value="itens_licitacao">itens_licitacao</option>
              <option value="fornecedores">fornecedores</option>
              <option value="contratos">contratos</option>
              <option value="conexao">conexao</option>
              <option value="sistema">sistema</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-slate-400">
          <div>
            Exibindo <span className="font-semibold text-white tabular-nums">{filtered.length}</span> registros de auditoria
          </div>
          {(searchTerm || acaoFilter !== 'ALL' || entidadeFilter !== 'ALL') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setAcaoFilter('ALL');
                setEntidadeFilter('ALL');
              }}
              className="text-sky-400 hover:underline"
            >
              Limpar filtros
            </button>
          )}
        </div>
      </div>

      {/* Audit Log Stream */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            Consultando logs de auditoria no banco...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs bg-[#0f1a2d] border border-slate-800 rounded-lg">
            Nenhum evento registrado com os filtros selecionados.
          </div>
        ) : (
          filtered.map((log) => {
            const isExpanded = expandedId === log.id;
            const acaoInfo = ACAO_AUDITORIA_MAP[log.acao] || {
              label: log.acao,
              textClass: 'text-slate-300',
            };

            return (
              <div
                key={log.id}
                className="bg-[#0f1a2d] border border-slate-800 rounded-lg p-4 text-xs transition-colors hover:border-slate-700"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-start sm:items-center gap-2.5">
                    <span className={`font-bold uppercase tracking-wider text-[11px] ${acaoInfo.textClass}`}>
                      [{acaoInfo.label}]
                    </span>
                    <span className="font-semibold text-white">
                      {log.registro_identificador}
                    </span>
                    <span className="text-slate-400">·</span>
                    <span className="font-mono text-slate-300">
                      tabela: {log.entidade}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 font-mono text-[11px] text-slate-400">
                    <span>{formatDateTime(log.timestamp)}</span>
                    <span>·</span>
                    <span className="text-slate-400">IP: {log.ip_origem}</span>
                  </div>
                </div>

                <div className="mt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-slate-300 pt-2 border-t border-slate-800/80">
                  <div>
                    Operador:{' '}
                    <span className="font-medium text-white">{log.usuario_nome}</span>{' '}
                    <span className="text-slate-400 font-mono text-[11px]">
                      ({log.usuario_email})
                    </span>{' '}
                    <span className="text-slate-400">[{log.usuario_papel}]</span>
                  </div>

                  <button
                    onClick={() => setExpandedId(isExpanded ? null : log.id)}
                    className="text-sky-400 hover:text-sky-300 text-left font-medium"
                  >
                    {isExpanded ? 'Ocultar Detalhes / Diff' : 'Ver Detalhes / Alterações'}
                  </button>
                </div>

                {isExpanded && (
                  <div className="mt-3 p-3 bg-[#080e18] border border-slate-800 rounded-md space-y-2">
                    <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      Payload Auditado (Registro #{log.id} · Ref ID: {log.registro_id})
                    </div>
                    <pre className="text-[11px] font-mono text-slate-300 overflow-x-auto p-2 bg-[#050910] rounded border border-slate-900 leading-relaxed whitespace-pre-wrap">
                      {JSON.stringify(log.detalhes, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
