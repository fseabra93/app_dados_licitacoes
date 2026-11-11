import { useState, useEffect, useCallback } from 'react';
import {
  Usuario,
  Licitacao,
  Fornecedor,
  Contrato,
  LogAuditoria,
  DashboardStats,
  ConnectionStatus,
  ProdutoCatalogo,
} from './types';
import { api } from './services/api';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { LicitacoesView } from './components/LicitacoesView';
import { ProdutosView } from './components/ProdutosView';
import { FornecedoresView } from './components/FornecedoresView';
import { ContratosView } from './components/ContratosView';
import { AuditoriaView } from './components/AuditoriaView';
import { DatabaseConfigModal } from './components/DatabaseConfigModal';
import { AuthModal } from './components/AuthModal';
import { AtualizarBancoSqlModal } from './components/AtualizarBancoSqlModal';

export default function App() {
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [currentUser, setCurrentUser] = useState<Usuario | null>(null);

  // Data states
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [licitacoes, setLicitacoes] = useState<Licitacao[]>([]);
  const [produtos, setProdutos] = useState<ProdutoCatalogo[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [auditoriaLogs, setAuditoriaLogs] = useState<LogAuditoria[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null);

  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isNewLicitacaoOpen, setIsNewLicitacaoOpen] = useState(false);
  const [isDbConfigOpen, setIsDbConfigOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isAtualizarSqlOpen, setIsAtualizarSqlOpen] = useState(false);

  // Initial load & user authentication
  const loadInitialData = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Fetch current user
      try {
        const userRes = await api.getMe();
        setCurrentUser(userRes.user);
      } catch {
        // Fallback to default
        setCurrentUser({
          id: 'usr-1',
          nome: 'Flávio Seabra',
          email: 'flavio.seabra@tre-rn.jus.br',
          cargo: 'Assessor de Licitações e Contratos',
          orgao: 'Tribunal Regional Eleitoral do RN (TRE-RN)',
          papel: 'GESTOR_LICITACOES',
        });
      }

      // 2. Fetch connection status
      const conn = await api.getConnectionStatus().catch(() => null);
      if (conn) setConnectionStatus(conn);

      // 3. Parallel fetch core entities
      const [statsRes, licRes, prodRes, fornRes, contRes, audRes] = await Promise.all([
        api.getDashboardStats().catch(() => null),
        api.getLicitacoes().catch(() => ({ data: [], total: 0 })),
        api.getProdutos().then((r) => r.data).catch(() => []),
        api.getFornecedores().catch(() => []),
        api.getContratos().catch(() => []),
        api.getAuditoria({ limit: 100 }).catch(() => ({ data: [], total: 0 })),
      ]);

      if (statsRes) setStats(statsRes);
      setLicitacoes(licRes.data);
      setProdutos(prodRes);
      setFornecedores(fornRes);
      setContratos(contRes);
      setAuditoriaLogs(audRes.data);
    } catch (e) {
      console.error('Erro ao carregar dados iniciais:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const refreshAll = async () => {
    await loadInitialData();
  };

  return (
    <div className="min-h-screen bg-[#0b1320] text-slate-100 flex flex-col font-sans selection:bg-sky-500/30 selection:text-sky-200">
      {/* 3-Zone Header Contract */}
      <Header
        currentTab={currentTab}
        onSelectTab={(tab) => {
          if (tab === 'conexao') {
            setIsDbConfigOpen(true);
          } else {
            setCurrentTab(tab);
          }
        }}
        currentUser={currentUser}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenNewLicitacao={() => {
          setCurrentTab('licitacoes');
          setIsNewLicitacaoOpen(true);
        }}
        isConnected={Boolean(connectionStatus?.isConnected)}
        onOpenDbConfig={() => setIsDbConfigOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {currentTab === 'dashboard' && (
          <DashboardView
            stats={stats}
            connection={connectionStatus}
            recentLogs={auditoriaLogs}
            onNavigateToTab={(tab) => setCurrentTab(tab)}
            onOpenNewLicitacao={() => {
              setCurrentTab('licitacoes');
              setIsNewLicitacaoOpen(true);
            }}
            onOpenDbConfig={() => setIsDbConfigOpen(true)}
            onOpenAtualizarSql={() => setIsAtualizarSqlOpen(true)}
            onRefresh={refreshAll}
            isLoading={isLoading}
          />
        )}

        {currentTab === 'licitacoes' && (
          <LicitacoesView
            licitacoes={licitacoes}
            fornecedores={fornecedores}
            isLoading={isLoading}
            onRefresh={refreshAll}
            onOpenNewModal={() => setIsNewLicitacaoOpen(true)}
            isNewModalOpen={isNewLicitacaoOpen}
            onCloseNewModal={() => setIsNewLicitacaoOpen(false)}
            defaultPregoeiro={currentUser?.nome || 'Flávio Seabra'}
          />
        )}

        {currentTab === 'produtos' && (
          <ProdutosView
            produtos={produtos}
            isLoading={isLoading}
            onRefresh={refreshAll}
            currentUser={currentUser}
          />
        )}

        {currentTab === 'fornecedores' && (
          <FornecedoresView
            fornecedores={fornecedores}
            isLoading={isLoading}
            onRefresh={refreshAll}
          />
        )}

        {currentTab === 'contratos' && (
          <ContratosView
            contratos={contratos}
            licitacoes={licitacoes}
            fornecedores={fornecedores}
            isLoading={isLoading}
            onRefresh={refreshAll}
            defaultFiscal={currentUser?.nome || 'Flávio Seabra'}
          />
        )}

        {currentTab === 'auditoria' && (
          <AuditoriaView
            logs={auditoriaLogs}
            isLoading={isLoading}
            onRefresh={refreshAll}
          />
        )}
      </main>

      {/* Quiet Footer */}
      <footer className="border-t border-slate-800/80 bg-[#080e18] py-4 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-400">SAMS Licitações</span>
            <span>·</span>
            <span>Tribunal Regional Eleitoral (TRE-RN)</span>
            <span>·</span>
            <span className="font-mono text-[11px] text-slate-400">
              BD: licitacoes_sams@localhost:5432
            </span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <button
              onClick={() => setIsDbConfigOpen(true)}
              className="hover:text-slate-300 transition-colors"
            >
              Parâmetros de Conexão
            </button>
            <button
              onClick={() => setCurrentTab('auditoria')}
              className="hover:text-slate-300 transition-colors"
            >
              Auditoria Geral
            </button>
            <button
              onClick={() => setIsAuthOpen(true)}
              className="hover:text-slate-300 transition-colors"
            >
              Operador Atual
            </button>
          </div>
        </div>
      </footer>

      {/* Global Modals */}
      <DatabaseConfigModal
        isOpen={isDbConfigOpen}
        onClose={() => setIsDbConfigOpen(false)}
        connection={connectionStatus}
        onRefreshStatus={refreshAll}
      />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        currentUser={currentUser}
        onUserChanged={(user) => {
          setCurrentUser(user);
          refreshAll();
        }}
      />

      <AtualizarBancoSqlModal
        isOpen={isAtualizarSqlOpen}
        onClose={() => setIsAtualizarSqlOpen(false)}
        onUpdated={refreshAll}
        currentUser={currentUser}
      />
    </div>
  );
}
