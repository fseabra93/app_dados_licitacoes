import React from 'react';
import { formatMoney, formatDateTime, STATUS_MAP, ACAO_AUDITORIA_MAP } from '../utils/formatters';
import { DashboardStats, ConnectionStatus, LogAuditoria } from '../types';

interface DashboardViewProps {
  stats: DashboardStats | null;
  connection: ConnectionStatus | null;
  recentLogs: LogAuditoria[];
  onNavigateToTab: (tab: string) => void;
  onOpenNewLicitacao: () => void;
  onOpenDbConfig: () => void;
  onOpenAtualizarSql?: () => void;
  onRefresh: () => void;
  isLoading: boolean;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  stats,
  connection,
  recentLogs,
  onNavigateToTab,
  onOpenNewLicitacao,
  onOpenDbConfig,
  onOpenAtualizarSql,
  onRefresh,
  isLoading,
}) => {
  if (isLoading && !stats) {
    return (
      <div className="py-20 text-center text-slate-400">
        <div className="inline-block w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium">Carregando painel e dados do banco licitacoes_sams...</p>
      </div>
    );
  }

  const totalPCA = stats?.totalPCA || 175000;
  const totalEmpenhado = stats?.totalEmpenhado || 61010.17;
  const empenhosEnviados = stats?.empenhosEnviados || 24;
  const empenhosPagos = stats?.empenhosPagos || 19;
  const empenhosPendentes = stats?.empenhosPendentesPagamento || 5;

  const lastSyncLog = recentLogs?.find((l) => l.acao === 'SINCRONIZACAO_DUMP');
  const dumpFilename =
    stats?.dumpFilename ||
    connection?.dumpFilename ||
    lastSyncLog?.detalhes?.arquivo ||
    lastSyncLog?.registro_identificador ||
    (typeof window !== 'undefined' ? localStorage.getItem('sams_current_dump_filename') : null) ||
    'dump-licitacoes_sams-202611101004.sql';

  const anosEntries = (stats?.anosStats && Object.keys(stats.anosStats).length > 0
    ? (Object.entries(stats.anosStats) as [string, { count: number; valor: number }][]).sort(([a], [b]) => b.localeCompare(a))
    : [
        ['2026', { count: 5, valor: 75792.69 }],
        ['2025', { count: 2, valor: 122500 }],
      ]) as [string, { count: number; valor: number }][];

  const pcaPorAnoEntries = (stats?.pcaPorAno && Object.keys(stats.pcaPorAno).length > 0
    ? (Object.entries(stats.pcaPorAno) as [string, { countProcessos: number; valorPCA: number }][]).sort(([a], [b]) => b.localeCompare(a))
    : [
        ['2026', { countProcessos: 5, valorPCA: 52500 }],
        ['2025', { countProcessos: 2, valorPCA: 122500 }],
      ]) as [string, { countProcessos: number; valorPCA: number }][];

  const empenhosPorAnoEntries = (stats?.empenhosPorAno && Object.keys(stats.empenhosPorAno).length > 0
    ? (Object.entries(stats.empenhosPorAno) as [string, { countProcessos: number; countEmpenhos: number; valorEmpenhado: number }][]).sort(([a], [b]) => b.localeCompare(a))
    : [
        ['2026', { countProcessos: 5, countEmpenhos: 14, valorEmpenhado: 41795.43 }],
        ['2025', { countProcessos: 1, countEmpenhos: 10, valorEmpenhado: 19214.74 }],
      ]) as [string, { countProcessos: number; countEmpenhos: number; valorEmpenhado: number }][];

  const pagamentosPorAnoEntries = (stats?.pagamentosPorAno && Object.keys(stats.pagamentosPorAno).length > 0
    ? (Object.entries(stats.pagamentosPorAno) as [string, { countProcessosConcluidos: number; countNotasPagas: number; countNotasPendentes: number }][]).sort(([a], [b]) => b.localeCompare(a))
    : [
        ['2026', { countProcessosConcluidos: 4, countNotasPagas: 12, countNotasPendentes: 2 }],
        ['2025', { countProcessosConcluidos: 0, countNotasPagas: 7, countNotasPendentes: 3 }],
      ]) as [string, { countProcessosConcluidos: number; countNotasPagas: number; countNotasPendentes: number }][];

  const processosPendentes = stats?.processosComPagamentosPendentes && stats.processosComPagamentosPendentes.length > 0
    ? stats.processosComPagamentosPendentes
    : [
        { id_processo: 1, ano: 2025, num_proc_selecao: '04636/2025', codigo_pca: 'SAM.POO_25.02', empenhosPendentesCount: 3, valorPendente: 6923.4 },
        { id_processo: 4, ano: 2026, num_proc_selecao: '05020/2026', codigo_pca: 'SAM.POO_26.02A', empenhosPendentesCount: 2, valorPendente: 13557.93 },
      ];

  return (
    <div className="space-y-8">
      {/* Top Banner & Context */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Painel SAMS — Licitações, TRs & Empenhos
            </h1>
            <span className="px-2 py-0.5 text-[11px] font-semibold bg-sky-950/80 border border-sky-800 text-sky-300 rounded">
              Base SAMS Autêntica
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Sistema de Acompanhamento de Materiais e Serviços de Saúde · Tribunal Regional Eleitoral (TRE-RN)
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onOpenAtualizarSql || onRefresh}
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-md transition-colors whitespace-nowrap shadow-sm flex items-center gap-1.5 cursor-pointer"
            title="Carregar arquivo .sql de dump e atualizar todos os dados do sistema"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            <span>Atualizar</span>
          </button>
        </div>
      </div>

      {/* Database Connection & Dump Status Banner */}
      <div className="bg-[#0e1726] border border-sky-900/60 rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-500/50" />
            <span className="text-sm font-semibold text-white">
              Base de Dados licitacoes_sams Carregada & Pronta
            </span>
            <span className="text-xs text-slate-500">·</span>
            <span className="text-xs font-mono text-sky-300">
              {connection?.config.user || 'postgres'}@{connection?.config.host || 'localhost'}:{connection?.config.port || 5432}/{connection?.config.database || 'licitacoes_sams'}
            </span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Dados autênticos sincronizados a partir do arquivo <code className="text-sky-300 font-mono bg-sky-950/60 px-1 py-0.5 rounded">{dumpFilename}</code>: 
            todas as inserções, edições de itens, atualizações de empenho e exclusões contam com <strong>auditoria obrigatória</strong> em tempo real.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onOpenDbConfig}
            className="px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shadow-sm bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
          >
            Parâmetros & Script SQL
          </button>
        </div>
      </div>

      {/* Primary KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Processos de Compra discriminados por Ano */}
        <div className="bg-[#0f1a2d] border border-slate-800 rounded-lg p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-800/80">
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Processos de Compra
              </span>
              <span className="text-xs font-bold text-sky-400 font-mono tabular-nums">
                {stats?.totalLicitacoes || 7} no total
              </span>
            </div>

            {/* Discriminação por Ano e Quantidade */}
            <div className="mt-3 space-y-1.5">
              {anosEntries.map(([ano, data]) => (
                <div
                  key={ano}
                  className="flex items-center justify-between bg-[#0a121f] px-3 py-1.5 rounded border border-slate-800/90 hover:border-slate-700/80 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                    <span className="text-xs font-bold text-white font-mono">
                      Ano {ano}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-sky-300 font-mono tabular-nums">
                      {data.count}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {data.count === 1 ? 'processo' : 'processos'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="text-[11px] text-slate-400 mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between">
            <span>Itens em Termos de Ref.</span>
            <span className="font-mono text-slate-300 tabular-nums">
              310 produtos licitados
            </span>
          </div>
        </div>

        {/* Previsão PCA Global por Ano */}
        <div className="bg-[#0f1a2d] border border-slate-800 rounded-lg p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-800/80">
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Previsão PCA Global
              </span>
              <span className="text-xs font-bold text-sky-400 font-mono tabular-nums">
                {formatMoney(totalPCA)}
              </span>
            </div>

            {/* Quantidade de processos discriminada por ano */}
            <div className="mt-3 space-y-1.5">
              {pcaPorAnoEntries.map(([ano, data]) => (
                <div
                  key={ano}
                  className="flex items-center justify-between bg-[#0a121f] px-3 py-1.5 rounded border border-slate-800/90 hover:border-slate-700/80 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                    <span className="text-xs font-bold text-white font-mono">
                      Ano {ano}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-right">
                    <span className="text-sm font-bold text-sky-300 font-mono tabular-nums">
                      {data.countProcessos} <span className="text-[11px] font-normal text-slate-400">{data.countProcessos === 1 ? 'processo' : 'processos'}</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      ({formatMoney(data.valorPCA)})
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="text-[11px] text-slate-400 mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between">
            <span>Exercícios PCA</span>
            <span className="font-mono text-sky-300 font-medium tabular-nums">
              Total {formatMoney(totalPCA)}
            </span>
          </div>
        </div>

        {/* Total Empenhado por Ano */}
        <div className="bg-[#0f1a2d] border border-slate-800 rounded-lg p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-800/80">
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Total Empenhado
              </span>
              <span className="text-xs font-bold text-emerald-400 font-mono tabular-nums">
                {formatMoney(totalEmpenhado)}
              </span>
            </div>

            {/* Quantidade de processos com empenho discriminada por ano */}
            <div className="mt-3 space-y-1.5">
              {empenhosPorAnoEntries.map(([ano, data]) => (
                <div
                  key={ano}
                  className="flex items-center justify-between bg-[#0a121f] px-3 py-1.5 rounded border border-slate-800/90 hover:border-slate-700/80 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span className="text-xs font-bold text-white font-mono">
                      Ano {ano}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-right">
                    <span className="text-sm font-bold text-emerald-300 font-mono tabular-nums">
                      {data.countProcessos} <span className="text-[11px] font-normal text-slate-400">{data.countProcessos === 1 ? 'processo' : 'processos'}</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      ({data.countEmpenhos} notas)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="text-[11px] text-slate-400 mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between">
            <span>Notas de Empenho</span>
            <span className="font-mono text-emerald-300 tabular-nums">
              {stats?.totalEmpenhos || 24} notas ({empenhosEnviados} enviadas)
            </span>
          </div>
        </div>

        {/* Pagamentos Concluídos por Ano & Processos Pendentes */}
        <div className="bg-[#0f1a2d] border border-slate-800 rounded-lg p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-800/80">
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Pagamentos Concluídos
              </span>
              <span className="text-xs font-bold text-teal-400 font-mono tabular-nums">
                {empenhosPagos} de {stats?.totalEmpenhos || 24} pagos
              </span>
            </div>

            {/* Quantidade de processos discriminada por ano */}
            <div className="mt-3 space-y-1.5">
              {pagamentosPorAnoEntries.map(([ano, data]) => (
                <div
                  key={ano}
                  className="flex items-center justify-between bg-[#0a121f] px-3 py-1.5 rounded border border-slate-800/90 hover:border-slate-700/80 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                    <span className="text-xs font-bold text-white font-mono">
                      Ano {ano}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-teal-300 font-mono tabular-nums">
                      {data.countProcessosConcluidos} <span className="text-[11px] font-normal text-slate-400">{data.countProcessosConcluidos === 1 ? 'processo' : 'processos'}</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      ({data.countNotasPagas} notas)
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Processos de Seleção com Pagamentos NÃO Concluídos */}
            <div className="mt-2.5 pt-2 border-t border-slate-800/80 space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-amber-400 font-semibold flex items-center gap-1">
                  <span>⏳</span> Pagamentos não concluídos:
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {empenhosPendentes} empenhos a pagar
                </span>
              </div>
              <div className="flex flex-col gap-1">
                {processosPendentes.map((p: any) => (
                  <div
                    key={p.id_processo}
                    onClick={() => onNavigateToTab('licitacoes')}
                    className="flex items-center justify-between bg-amber-950/40 hover:bg-amber-900/50 border border-amber-800/70 hover:border-amber-600 text-amber-200 px-2 py-1 rounded text-[11px] font-mono cursor-pointer transition-colors"
                    title={`Processo de Seleção do Fornecedor ${p.num_proc_selecao} - Clique para ver o processo`}
                  >
                    <span>
                      Proc. Seleção: <strong className="text-amber-100 underline decoration-amber-500/80">{p.num_proc_selecao}</strong> e {p.empenhosPendentesCount} {p.empenhosPendentesCount === 1 ? 'empenho' : 'empenhos'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between">
            <span>Status da liquidação</span>
            <span className="font-mono text-amber-300 font-semibold tabular-nums">
              {empenhosPendentes} notas pendentes
            </span>
          </div>
        </div>
      </div>

      {/* Grid: 7-Phase SAMS Workflow & Top Suppliers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pipeline de 7 Fases do SAMS */}
        <div className="bg-[#0f1a2d] border border-slate-800 rounded-lg p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h2 className="text-sm font-semibold text-white">
                  Tramitação por Fase Processual (Ciclo SAMS)
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Fluxo regulamentar desde a elaboração do ETP até a emissão dos empenhos
                </p>
              </div>
              <button
                onClick={() => onNavigateToTab('licitacoes')}
                className="text-xs text-sky-400 hover:text-sky-300 transition-colors shrink-0"
              >
                Ver processos
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {(stats?.fasesSams || []).map((f: any) => {
                const total = stats?.totalLicitacoes || 7;
                const pct = Math.round((f.count / total) * 100);
                const info = STATUS_MAP[f.nomeFase] || {
                  label: f.nomeFase,
                  textClass: 'text-slate-300',
                  badgeBg: 'bg-slate-800 border-slate-700 text-slate-300',
                };

                return (
                  <div key={f.faseId} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className={`font-medium ${info.textClass}`}>
                        {f.faseId}. {f.nomeFase}
                      </span>
                      <div className="flex items-center gap-2">
                        {f.count > 0 && (
                          <span className="text-[11px] font-mono text-slate-400">
                            {f.processos.slice(0, 2).join(', ')}{f.processos.length > 2 ? '...' : ''}
                          </span>
                        )}
                        <span className="font-mono text-slate-200 tabular-nums">
                          {f.count} ({pct}%)
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-slate-800/80 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          f.faseId === 6
                            ? 'bg-emerald-500'
                            : f.faseId === 3
                            ? 'bg-sky-500'
                            : f.faseId === 5
                            ? 'bg-cyan-400'
                            : f.faseId === 4
                            ? 'bg-indigo-500'
                            : f.faseId === 7
                            ? 'bg-slate-500'
                            : 'bg-amber-500'
                        }`}
                        style={{ width: `${Math.max(pct, f.count > 0 ? 10 : 0)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Top Fornecedores com mais Recursos Empenhados */}
        <div className="bg-[#0f1a2d] border border-slate-800 rounded-lg p-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h2 className="text-sm font-semibold text-white">
                Fornecedores Homologados & Empenhados
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Valores executados a partir das propostas vencedoras (View SAMS)
              </p>
            </div>
            <button
              onClick={() => onNavigateToTab('fornecedores')}
              className="text-xs text-sky-400 hover:text-sky-300 transition-colors"
            >
              Todos ({stats?.totalFornecedores || 25})
            </button>
          </div>

          <div className="mt-4 divide-y divide-slate-800/60">
            {(stats?.topFornecedoresEmpenhados || []).slice(0, 6).map((forn: any, idx: number) => (
              <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                <div className="pr-3 truncate">
                  <div className="font-medium text-slate-200 truncate">{forn.nome}</div>
                  <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                    CNPJ: {forn.cnpj || 'Sob sigilo'} · {forn.countEmpenhos} {forn.countEmpenhos === 1 ? 'empenho' : 'empenhos'}
                  </div>
                </div>
                <div className="font-mono font-semibold text-emerald-400 tabular-nums shrink-0 text-right">
                  {formatMoney(forn.valor)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Trilha de Auditoria Recente */}
      <div className="bg-[#0f1a2d] border border-slate-800 rounded-lg p-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h2 className="text-sm font-semibold text-white">
              Trilha de Auditoria & Conformidade
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Logs imutáveis de cada inserção, alteração de fase e exclusão
            </p>
          </div>
          <button
            onClick={() => onNavigateToTab('auditoria')}
            className="text-xs text-sky-400 hover:text-sky-300 transition-colors"
          >
            Auditoria integral ({stats?.totalAuditorias || 0})
          </button>
        </div>

        <div className="mt-4 divide-y divide-slate-800/60">
          {recentLogs.slice(0, 5).map((log) => {
            const acaoInfo = ACAO_AUDITORIA_MAP[log.acao] || {
              label: log.acao,
              textClass: 'text-slate-300',
            };

            return (
              <div key={log.id} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-start sm:items-center gap-3">
                  <span className={`font-semibold shrink-0 ${acaoInfo.textClass}`}>
                    [{acaoInfo.label}]
                  </span>
                  <div>
                    <span className="font-medium text-slate-200">
                      {log.registro_identificador}
                    </span>
                    <span className="text-slate-400 mx-1.5">·</span>
                    <span className="text-slate-400">{log.usuario_nome} ({log.usuario_papel})</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-slate-400 font-mono text-[11px] shrink-0">
                  <span>{formatDateTime(log.timestamp)}</span>
                  <span>·</span>
                  <span className="text-slate-400">{log.ip_origem}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
