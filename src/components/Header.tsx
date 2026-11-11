import React from 'react';
import { Usuario } from '../types';

interface HeaderProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  currentUser: Usuario | null;
  onOpenAuth: () => void;
  onOpenNewLicitacao: () => void;
  isConnected: boolean;
  onOpenDbConfig: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onSelectTab,
  currentUser,
  onOpenAuth,
  onOpenNewLicitacao,
  isConnected,
  onOpenDbConfig,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-[#0d1726]/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single text element wordmark */}
        <button
          onClick={() => onSelectTab('dashboard')}
          className="text-lg font-bold tracking-tight text-white hover:text-sky-400 transition-colors whitespace-nowrap shrink-0 flex items-center gap-2 cursor-pointer"
        >
          <span>SAMS Licitações</span>
        </button>

        {/* Zone 2: Concise single-line text navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          <button
            onClick={() => onSelectTab('dashboard')}
            className={`whitespace-nowrap shrink-0 transition-colors py-1 ${
              currentTab === 'dashboard'
                ? 'text-sky-400 border-b-2 border-sky-400 font-semibold'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Painel
          </button>
          <button
            onClick={() => onSelectTab('licitacoes')}
            className={`whitespace-nowrap shrink-0 transition-colors py-1 ${
              currentTab === 'licitacoes'
                ? 'text-sky-400 border-b-2 border-sky-400 font-semibold'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Licitações
          </button>
          <button
            onClick={() => onSelectTab('produtos')}
            className={`whitespace-nowrap shrink-0 transition-colors py-1 ${
              currentTab === 'produtos'
                ? 'text-sky-400 border-b-2 border-sky-400 font-semibold'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Produtos
          </button>
          <button
            onClick={() => onSelectTab('fornecedores')}
            className={`whitespace-nowrap shrink-0 transition-colors py-1 ${
              currentTab === 'fornecedores'
                ? 'text-sky-400 border-b-2 border-sky-400 font-semibold'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Fornecedores
          </button>
          <button
            onClick={() => onSelectTab('contratos')}
            className={`whitespace-nowrap shrink-0 transition-colors py-1 ${
              currentTab === 'contratos'
                ? 'text-sky-400 border-b-2 border-sky-400 font-semibold'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Contratos
          </button>
          <button
            onClick={() => onSelectTab('auditoria')}
            className={`whitespace-nowrap shrink-0 transition-colors py-1 ${
              currentTab === 'auditoria'
                ? 'text-sky-400 border-b-2 border-sky-400 font-semibold'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Auditoria
          </button>
          <button
            onClick={onOpenDbConfig}
            className={`whitespace-nowrap shrink-0 transition-colors py-1 flex items-center gap-1.5 ${
              currentTab === 'conexao'
                ? 'text-sky-400 border-b-2 border-sky-400 font-semibold'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <span>Banco de Dados</span>
            <span
              className={`inline-block w-2 h-2 rounded-full ${
                isConnected ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
              title={isConnected ? 'PostgreSQL Conectado' : 'Modo Local Sincronizado'}
            />
          </button>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onOpenAuth}
            className="text-xs text-slate-300 hover:text-white px-2.5 py-1.5 rounded-md hover:bg-slate-800 transition-colors hidden sm:block text-right"
          >
            <div className="font-medium text-slate-200 truncate max-w-[140px]">
              {currentUser?.nome || 'Convidado'}
            </div>
            <div className="text-[10px] text-slate-400">
              {currentUser?.papel === 'GESTOR_LICITACOES'
                ? 'Gestor'
                : currentUser?.papel === 'ADMIN'
                ? 'Administrador'
                : currentUser?.papel === 'AUDITOR'
                ? 'Auditor'
                : 'Operador'}
            </div>
          </button>

          <button
            onClick={onOpenNewLicitacao}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 active:bg-sky-700 rounded-lg transition-colors whitespace-nowrap shadow-sm"
          >
            Nova Licitação
          </button>
        </div>
      </div>

      {/* Mobile nav bar */}
      <div className="md:hidden flex items-center gap-2 px-4 py-2 border-t border-slate-800 overflow-x-auto text-xs bg-[#0b1320]">
        <button
          onClick={() => onSelectTab('dashboard')}
          className={`px-2.5 py-1 rounded whitespace-nowrap ${
            currentTab === 'dashboard' ? 'bg-sky-600 text-white' : 'text-slate-300'
          }`}
        >
          Painel
        </button>
        <button
          onClick={() => onSelectTab('licitacoes')}
          className={`px-2.5 py-1 rounded whitespace-nowrap ${
            currentTab === 'licitacoes' ? 'bg-sky-600 text-white' : 'text-slate-300'
          }`}
        >
          Licitações
        </button>
        <button
          onClick={() => onSelectTab('produtos')}
          className={`px-2.5 py-1 rounded whitespace-nowrap ${
            currentTab === 'produtos' ? 'bg-sky-600 text-white' : 'text-slate-300'
          }`}
        >
          Produtos
        </button>
        <button
          onClick={() => onSelectTab('fornecedores')}
          className={`px-2.5 py-1 rounded whitespace-nowrap ${
            currentTab === 'fornecedores' ? 'bg-sky-600 text-white' : 'text-slate-300'
          }`}
        >
          Fornecedores
        </button>
        <button
          onClick={() => onSelectTab('contratos')}
          className={`px-2.5 py-1 rounded whitespace-nowrap ${
            currentTab === 'contratos' ? 'bg-sky-600 text-white' : 'text-slate-300'
          }`}
        >
          Contratos
        </button>
        <button
          onClick={() => onSelectTab('auditoria')}
          className={`px-2.5 py-1 rounded whitespace-nowrap ${
            currentTab === 'auditoria' ? 'bg-sky-600 text-white' : 'text-slate-300'
          }`}
        >
          Auditoria
        </button>
        <button
          onClick={onOpenDbConfig}
          className={`px-2.5 py-1 rounded whitespace-nowrap flex items-center gap-1 ${
            currentTab === 'conexao' ? 'bg-sky-600 text-white' : 'text-slate-300'
          }`}
        >
          <span>PostgreSQL</span>
          <span
            className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-amber-500'}`}
          />
        </button>
      </div>
    </header>
  );
};
