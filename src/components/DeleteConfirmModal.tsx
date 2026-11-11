import React, { useState } from 'react';
import { Licitacao } from '../types';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  licitacao: Licitacao | null;
  onClose: () => void;
  onConfirm: (id: number, motivo: string) => Promise<void>;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  licitacao,
  onClose,
  onConfirm,
}) => {
  const [motivo, setMotivo] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen || !licitacao) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!motivo.trim() || motivo.trim().length < 8) {
      setErrorMsg('Por exigência de auditoria e conformidade legal, informe uma justificativa de pelo menos 8 caracteres.');
      return;
    }

    setIsDeleting(true);
    setErrorMsg('');
    try {
      await onConfirm(licitacao.id, motivo.trim());
      setMotivo('');
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao processar exclusão.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div className="bg-[#0f1a2d] border border-rose-900/60 w-full max-w-lg rounded-xl shadow-2xl p-6 text-slate-100">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-rose-500 font-bold text-lg">⚠️</span>
            <h2 className="text-base font-bold text-white">
              Confirmar Exclusão de Licitação
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 p-3 bg-rose-950/40 border border-rose-900/50 rounded-lg text-xs space-y-1">
          <div className="font-semibold text-rose-300">
            Atenção: Ação Irreversível registrada na Auditoria
          </div>
          <div className="text-slate-300">
            Você está prestes a excluir do banco <span className="font-mono font-medium text-white">licitacoes_sams</span>:
          </div>
          <div className="font-mono text-white text-xs mt-1">
            {licitacao.numero_licitacao} (Processo: {licitacao.numero_processo})
          </div>
          <div className="text-[11px] text-slate-400 mt-1 line-clamp-2">
            {licitacao.objeto}
          </div>
        </div>

        {errorMsg && (
          <div className="mt-3 p-2.5 bg-rose-950/80 border border-rose-700 rounded text-xs text-rose-200">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-200 mb-1">
              Justificativa Obrigatória para o Log de Auditoria *
            </label>
            <textarea
              required
              rows={3}
              placeholder="Ex: Cancelamento administrativo do processo por decisão da Diretoria-Geral conforme despacho nos autos nº..."
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="w-full bg-[#0a121f] border border-slate-700 rounded px-3 py-2 text-xs text-white focus:outline-hidden focus:border-rose-500"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Este motivo será gravado de forma imutável com seu usuário, timestamp e IP.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isDeleting}
              className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 active:bg-rose-700 rounded transition-colors disabled:opacity-50"
            >
              {isDeleting ? 'Excluindo...' : 'Confirmar e Gravar Auditoria'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
