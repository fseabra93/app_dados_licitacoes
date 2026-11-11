import React, { useState } from 'react';
import { Usuario } from '../types';
import { api } from '../services/api';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: Usuario | null;
  onUserChanged: (user: Usuario) => void;
}

const PRESET_USERS = [
  {
    nome: 'Flávio Seabra',
    email: 'flavio.seabra@tre-rn.jus.br',
    cargo: 'Assessor de Licitações e Contratos',
    orgao: 'TRE-RN / Presidência',
    papel: 'GESTOR_LICITACOES',
    senhaPadrao: 'postgres',
    descricao: 'Permissão para inserções, edições, homologações e formalização de contratos.',
  },
  {
    nome: 'Administrador SAMS',
    email: 'admin@tre-rn.jus.br',
    cargo: 'Administrador de Banco de Dados',
    orgao: 'TRE-RN / STI',
    papel: 'ADMIN',
    senhaPadrao: 'postgres',
    descricao: 'Acesso irrestrito a configurações de banco, deleções e auditoria.',
  },
  {
    nome: 'Dra. Luiza Miranda',
    email: 'auditoria@tre-rn.jus.br',
    cargo: 'Auditora de Controle Interno',
    orgao: 'Secretaria de Auditoria (SAUD)',
    papel: 'AUDITOR',
    senhaPadrao: 'postgres',
    descricao: 'Fiscalização estrita de conformidade, consulta e emissão de relatórios.',
  },
  {
    nome: 'Carlos Eduardo',
    email: 'operador@tre-rn.jus.br',
    cargo: 'Pregoeiro Oficial',
    orgao: 'Comissão Permanente de Licitação',
    papel: 'OPERADOR',
    senhaPadrao: 'postgres',
    descricao: 'Condução de sessões de lances, inserção de itens e registros de atas.',
  },
];

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUserChanged,
}) => {
  const [email, setEmail] = useState(currentUser?.email || 'flavio.seabra@tre-rn.jus.br');
  const [password, setPassword] = useState('postgres');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');
    try {
      const res = await api.login(email.trim(), password);
      onUserChanged(res.user);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Falha na autenticação.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectPreset = async (presetEmail: string, presetSenha: string) => {
    setEmail(presetEmail);
    setPassword(presetSenha);
    setIsSubmitting(true);
    setErrorMsg('');
    try {
      const res = await api.login(presetEmail, presetSenha);
      onUserChanged(res.user);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Falha na autenticação.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div className="bg-[#0f1a2d] border border-slate-700 w-full max-w-lg rounded-xl shadow-2xl p-6 text-slate-100 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h2 className="text-base font-bold text-white">
              Autenticação Segura & Controle de Acesso (RBAC)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Identificação do operador para conformidade de auditoria
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded"
          >
            ✕
          </button>
        </div>

        {errorMsg && (
          <div className="p-2.5 bg-rose-950/60 border border-rose-800 rounded text-xs text-rose-300">
            {errorMsg}
          </div>
        )}

        {/* Current logged user card */}
        {currentUser && (
          <div className="p-3 bg-[#0a121f] border border-slate-800 rounded-lg text-xs space-y-1">
            <div className="text-slate-400">Usuário Atualmente Autenticado:</div>
            <div className="font-bold text-white text-sm">{currentUser.nome}</div>
            <div className="text-slate-400 font-mono">{currentUser.email}</div>
            <div className="text-slate-300">
              {currentUser.cargo} · <span className="text-sky-400">{currentUser.orgao}</span>
            </div>
          </div>
        )}

        {/* Quick Operator Switch */}
        <div className="space-y-2 text-xs">
          <div className="text-slate-300 font-semibold">
            Alternar Perfil de Acesso do Tribunal:
          </div>
          <div className="space-y-2">
            {PRESET_USERS.map((u) => {
              const isCurrent = currentUser?.email.toLowerCase() === u.email.toLowerCase();
              return (
                <div
                  key={u.email}
                  onClick={() => handleSelectPreset(u.email, u.senhaPadrao)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    isCurrent
                      ? 'bg-sky-950/40 border-sky-600'
                      : 'bg-[#0a121f] border-slate-800 hover:border-slate-700 hover:bg-[#0c1626]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white">{u.nome}</span>
                    <span className="text-[11px] font-mono text-sky-400">{u.papel}</span>
                  </div>
                  <div className="text-slate-400 text-[11px] mt-0.5">{u.email} · {u.cargo}</div>
                  <div className="text-slate-400 text-[11px] mt-1">{u.descricao}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Manual Login */}
        <form onSubmit={handleLogin} className="space-y-3 pt-3 border-t border-slate-800 text-xs">
          <div className="font-semibold text-white">Login Personalizado</div>
          <div>
            <label className="block text-slate-400 mb-1">E-mail Institucional</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#0a121f] border border-slate-700 rounded px-3 py-1.5 text-white"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1">Senha</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#0a121f] border border-slate-700 rounded px-3 py-1.5 text-white font-mono"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-slate-400 hover:text-white"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded font-medium disabled:opacity-50"
            >
              {isSubmitting ? 'Autenticando...' : 'Entrar no Sistema'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
