import React, { useState } from 'react';
import { ConnectionStatus } from '../types';
import { api } from '../services/api';

interface DatabaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  connection: ConnectionStatus | null;
  onRefreshStatus: () => void;
}

export const DatabaseConfigModal: React.FC<DatabaseConfigModalProps> = ({
  isOpen,
  onClose,
  connection,
  onRefreshStatus,
}) => {
  const [activeTab, setActiveTab] = useState<'diagnostico' | 'parametros' | 'tunel' | 'scriptSql'>('diagnostico');

  const [host, setHost] = useState(connection?.config.host || 'localhost');
  const [port, setPort] = useState(String(connection?.config.port || '5432'));
  const [database, setDatabase] = useState(connection?.config.database || 'licitacoes_sams');
  const [user, setUser] = useState(connection?.config.user || 'postgres');
  const [password, setPassword] = useState('postgres');

  // Quick tunnel helper
  const [tunnelInput, setTunnelInput] = useState('');

  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; version?: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [sqlContent, setSqlContent] = useState<string | null>(null);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(label);
    setTimeout(() => setCopiedCmd(null), 2500);
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await api.testConnection();
      setTestResult(res);
      onRefreshStatus();
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Falha ao executar teste de conexão.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await api.reconfigureConnection({
        host,
        port: parseInt(port, 10),
        database,
        user,
        password,
      });
      setTestResult({
        success: res.success,
        message: res.message,
      });
      onRefreshStatus();
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Erro ao reconfigurar parâmetros.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleConnectTunnel = async () => {
    if (!tunnelInput.trim()) return;
    let clean = tunnelInput.trim().replace(/^tcp:\/\//, '').replace(/^https?:\/\//, '');
    let newHost = clean;
    let newPort = '5432';

    if (clean.includes(':')) {
      const parts = clean.split(':');
      newHost = parts[0];
      newPort = parts[1] || '5432';
    }

    setHost(newHost);
    setPort(newPort);
    setIsSaving(true);
    try {
      const res = await api.reconfigureConnection({
        host: newHost,
        port: parseInt(newPort, 10),
        database,
        user,
        password,
      });
      setTestResult({
        success: res.success,
        message: res.message,
      });
      onRefreshStatus();
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Erro ao conectar via túnel.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoadSql = async () => {
    try {
      const sql = await api.getSqlScript();
      setSqlContent(sql);
      setActiveTab('scriptSql');
    } catch {
      alert('Não foi possível carregar o arquivo SQL.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs overflow-y-auto">
      <div className="bg-[#0f1a2d] border border-slate-700 w-full max-w-2xl rounded-xl shadow-2xl p-6 text-slate-100 max-h-[92vh] overflow-y-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white">
                Assistente de Conexão com o PostgreSQL
              </h2>
              <span
                className={`text-xs px-2 py-0.5 rounded font-mono font-semibold ${
                  connection?.isConnected
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                    : 'bg-amber-950 text-amber-400 border border-amber-800'
                }`}
              >
                {connection?.isConnected ? 'CONECTADO' : 'NÃO CONECTADO'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Banco solicitado: <span className="font-mono text-white">licitacoes_sams</span> no host <span className="font-mono text-white">localhost:5432</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded"
          >
            ✕
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 border-b border-slate-800 bg-[#0a121f] p-1 rounded-lg text-xs">
          <button
            onClick={() => setActiveTab('diagnostico')}
            className={`py-1.5 px-3 rounded font-medium transition-colors ${
              activeTab === 'diagnostico'
                ? 'bg-sky-600 text-white font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            1. Por que não conecta?
          </button>
          <button
            onClick={() => setActiveTab('tunel')}
            className={`py-1.5 px-3 rounded font-medium transition-colors ${
              activeTab === 'tunel'
                ? 'bg-sky-600 text-white font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            2. Conectar via Túnel (Web)
          </button>
          <button
            onClick={() => setActiveTab('parametros')}
            className={`py-1.5 px-3 rounded font-medium transition-colors ${
              activeTab === 'parametros'
                ? 'bg-sky-600 text-white font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            3. Ajustar Parâmetros
          </button>
          <button
            onClick={() => {
              setActiveTab('scriptSql');
              if (!sqlContent) handleLoadSql();
            }}
            className={`py-1.5 px-3 rounded font-medium transition-colors ${
              activeTab === 'scriptSql'
                ? 'bg-sky-600 text-white font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            4. Script SQL do Banco
          </button>
        </div>

        {/* Test Result Callout if available */}
        {testResult && (
          <div
            className={`p-3 rounded-lg text-xs border ${
              testResult.success
                ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                : 'bg-rose-950/60 border-rose-800 text-rose-300'
            }`}
          >
            <div className="font-semibold flex items-center justify-between">
              <span>{testResult.success ? 'Conexão Realizada com Sucesso!' : 'Falha na Conexão com o PostgreSQL:'}</span>
              <button
                onClick={() => setTestResult(null)}
                className="text-[10px] text-slate-400 hover:text-white"
              >
                Dispensar
              </button>
            </div>
            <div className="mt-1 font-mono text-[11px] whitespace-pre-wrap">{testResult.message}</div>
            {testResult.version && (
              <div className="mt-1 text-[10px] text-slate-400">{testResult.version}</div>
            )}
          </div>
        )}

        {/* TAB 1: DIAGNÓSTICO EXPLICATIVO */}
        {activeTab === 'diagnostico' && (
          <div className="space-y-4 text-xs">
            <div className="bg-[#0a121f] border border-slate-800 rounded-lg p-4 space-y-3">
              <h3 className="font-semibold text-white text-sm flex items-center gap-2">
                <span>🔍</span> Entenda a Causa Técnica
              </h3>
              <p className="text-slate-300 leading-relaxed">
                Você está acessando esta aplicação na nuvem através do endereço <span className="font-mono text-sky-400">ais-dev-...run.app</span> (servidores do Google Cloud Run).
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 py-1">
                <div className="p-3 bg-[#0f1a2d] border border-slate-700 rounded-lg">
                  <div className="font-bold text-sky-400">Servidor da Aplicação (Nuvem)</div>
                  <div className="text-slate-400 text-[11px] mt-1">
                    Ao tentar conectar em <code className="text-white">localhost:5432</code>, a nuvem tenta acessar uma porta dentro do próprio servidor do Google Cloud (onde não existe PostgreSQL).
                  </div>
                </div>
                <div className="p-3 bg-[#0f1a2d] border border-slate-700 rounded-lg">
                  <div className="font-bold text-emerald-400">Seu Computador (Local)</div>
                  <div className="text-slate-400 text-[11px] mt-1">
                    O seu banco <code className="text-white">licitacoes_sams</code> está rodando localmente na sua máquina física, protegida pelo seu firewall e roteador.
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="font-semibold text-white text-sm">Como Resolver: Escolha uma das 2 opções abaixo</div>

              <div className="p-4 bg-sky-950/30 border border-sky-800/60 rounded-lg space-y-2">
                <div className="font-bold text-sky-300">
                  Opção A (Mais Fácil): Expor a porta 5432 do seu computador via Túnel
                </div>
                <p className="text-slate-300">
                  Em 1 minuto você conecta este preview ao seu Postgres local sem alterar código.
                </p>
                <button
                  onClick={() => setActiveTab('tunel')}
                  className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white font-medium rounded transition-colors"
                >
                  Ver Passo a Passo do Túnel →
                </button>
              </div>

              <div className="p-4 bg-emerald-950/30 border border-emerald-800/60 rounded-lg space-y-2">
                <div className="font-bold text-emerald-300">
                  Opção B: Rodar a Aplicação Diretamente na sua Máquina
                </div>
                <p className="text-slate-300 leading-relaxed">
                  Baixe os arquivos deste projeto para sua máquina e rode no terminal:
                </p>
                <div className="flex items-center justify-between p-2 bg-[#080e18] rounded font-mono text-[11px] text-emerald-400 border border-slate-800">
                  <span>npm install && npm start</span>
                  <button
                    onClick={() => handleCopy('npm install && npm start', 'cmd_npm')}
                    className="text-xs text-slate-400 hover:text-white"
                  >
                    {copiedCmd === 'cmd_npm' ? 'Copiado!' : 'Copiar'}
                  </button>
                </div>
                <p className="text-slate-400 text-[11px]">
                  Ao rodar no seu computador, o aplicativo abrirá em <code className="text-slate-200">http://localhost:3000</code> e conectará nativamente e imediatamente no seu PostgreSQL local <code className="text-slate-200">localhost:5432</code>!
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: TÚNEL RÁPIDO */}
        {activeTab === 'tunel' && (
          <div className="space-y-4 text-xs">
            <div className="p-4 bg-[#0a121f] border border-slate-800 rounded-lg space-y-3">
              <div className="font-bold text-white text-sm">
                Passo 1: No terminal do seu computador, execute o comando:
              </div>

              <div className="space-y-2">
                <div>
                  <div className="text-[11px] text-slate-400 mb-1">Via Ngrok (Recomendado):</div>
                  <div className="flex items-center justify-between p-2.5 bg-[#080e18] rounded font-mono text-emerald-400 border border-slate-800">
                    <span>npx ngrok tcp 5432</span>
                    <button
                      onClick={() => handleCopy('npx ngrok tcp 5432', 'cmd_ngrok')}
                      className="text-xs text-slate-400 hover:text-white"
                    >
                      {copiedCmd === 'cmd_ngrok' ? 'Copiado!' : 'Copiar'}
                    </button>
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 pt-1">
                  O Ngrok exibirá uma linha parecida com:
                  <div className="font-mono text-sky-300 mt-0.5">
                    Forwarding: tcp://0.tcp.sa.ngrok.io:12345 -&gt; localhost:5432
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-[#0a121f] border border-slate-800 rounded-lg space-y-3">
              <div className="font-bold text-white text-sm">
                Passo 2: Cole o endereço gerado pelo túnel aqui:
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ex: tcp://0.tcp.sa.ngrok.io:12345 ou 0.tcp.sa.ngrok.io:12345"
                  value={tunnelInput}
                  onChange={(e) => setTunnelInput(e.target.value)}
                  className="flex-1 bg-[#080e18] border border-slate-700 rounded px-3 py-2 text-white font-mono text-xs focus:outline-hidden focus:border-sky-500"
                />
                <button
                  type="button"
                  onClick={handleConnectTunnel}
                  disabled={isSaving || !tunnelInput.trim()}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded transition-colors disabled:opacity-50 whitespace-nowrap"
                >
                  {isSaving ? 'Conectando...' : 'Conectar Agora'}
                </button>
              </div>

              <p className="text-[11px] text-slate-400">
                O aplicativo extrai automaticamente o host e a porta e realiza o teste imediato.
              </p>
            </div>
          </div>
        )}

        {/* TAB 3: PARÂMETROS MANUAIS */}
        {activeTab === 'parametros' && (
          <form onSubmit={handleSaveConfig} className="space-y-3 text-xs">
            <div className="font-semibold text-white">Configuração Manual dos Parâmetros</div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 mb-1">Host (IP / Domínio / Túnel)</label>
                <input
                  type="text"
                  required
                  placeholder="localhost ou IP"
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  className="w-full bg-[#0a121f] border border-slate-700 rounded px-3 py-1.5 text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Porta</label>
                <input
                  type="number"
                  required
                  value={port}
                  onChange={(e) => setPort(e.target.value)}
                  className="w-full bg-[#0a121f] border border-slate-700 rounded px-3 py-1.5 text-white font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-400 mb-1">Database</label>
                <input
                  type="text"
                  required
                  value={database}
                  onChange={(e) => setDatabase(e.target.value)}
                  className="w-full bg-[#0a121f] border border-slate-700 rounded px-3 py-1.5 text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Usuário</label>
                <input
                  type="text"
                  required
                  value={user}
                  onChange={(e) => setUser(e.target.value)}
                  className="w-full bg-[#0a121f] border border-slate-700 rounded px-3 py-1.5 text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Senha</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#0a121f] border border-slate-700 rounded px-3 py-1.5 text-white font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting}
                className="px-3.5 py-1.5 text-xs font-semibold text-sky-400 bg-sky-950/60 hover:bg-sky-900/60 border border-sky-800/60 rounded transition-colors disabled:opacity-50"
              >
                {isTesting ? 'Testando...' : 'Testar Conexão'}
              </button>

              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-medium disabled:opacity-50"
              >
                {isSaving ? 'Salvando...' : 'Salvar e Testar'}
              </button>
            </div>
          </form>
        )}

        {/* TAB 4: SCRIPT SQL */}
        {activeTab === 'scriptSql' && (
          <div className="space-y-3 text-xs">
            <div className="p-3 bg-[#0a121f] border border-slate-800 rounded-lg space-y-2">
              <div className="font-semibold text-white">
                Como criar as tabelas no seu PostgreSQL local:
              </div>
              <p className="text-slate-300">
                Se você ainda não criou as tabelas no seu PostgreSQL local, execute o comando abaixo no terminal da sua máquina:
              </p>
              <div className="flex items-center justify-between p-2.5 bg-[#080e18] rounded font-mono text-emerald-400 border border-slate-800">
                <span>psql -h localhost -p 5432 -U postgres -d licitacoes_sams -f init_licitacoes_sams.sql</span>
                <button
                  onClick={() => handleCopy('psql -h localhost -p 5432 -U postgres -d licitacoes_sams -f init_licitacoes_sams.sql', 'cmd_psql')}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  {copiedCmd === 'cmd_psql' ? 'Copiado!' : 'Copiar'}
                </button>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between pb-1">
                <span className="font-semibold text-slate-300">Conteúdo do DDL (init_licitacoes_sams.sql):</span>
                <button
                  onClick={() => handleCopy(sqlContent || '', 'full_sql')}
                  className="text-sky-400 hover:underline"
                >
                  {copiedCmd === 'full_sql' ? 'Copiado!' : 'Copiar todo o SQL'}
                </button>
              </div>
              <pre className="text-[11px] font-mono text-slate-300 max-h-56 overflow-y-auto p-3 bg-[#080e18] rounded border border-slate-800">
                {sqlContent || 'Carregando script...'}
              </pre>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
          <div className="text-slate-400 text-[11px]">
            Status: <span className={connection?.isConnected ? 'text-emerald-400' : 'text-amber-400'}>
              {connection?.isConnected ? 'Conectado ao PostgreSQL' : 'Modo Réplica Local Ativo (Auditoria Total)'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
