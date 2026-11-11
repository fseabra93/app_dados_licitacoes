import React, { useState, useRef } from 'react';
import { api } from '../services/api';
import { Usuario } from '../types';
import { formatMoney } from '../utils/formatters';

interface AtualizarBancoSqlModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
  currentUser: Usuario | null;
}

export const AtualizarBancoSqlModal: React.FC<AtualizarBancoSqlModalProps> = ({
  isOpen,
  onClose,
  onUpdated,
  currentUser,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<{
    message: string;
    summary: {
      filename: string;
      tabelasAtualizadas: number;
      totalProcessos: number;
      totalEmpenhos: number;
      totalFornecedores: number;
      totalItensTR: number;
      valorTotalEmpenhado: number;
      tabelas?: string[];
    };
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleReset = () => {
    setSelectedFile(null);
    setError(null);
    setSuccessResult(null);
    setIsLoading(false);
  };

  const handleClose = () => {
    if (successResult) {
      onUpdated();
    }
    handleReset();
    onClose();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      validateAndSetFile(file);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (file: File) => {
    setError(null);
    setSuccessResult(null);
    const validExtensions = ['.sql', '.tar', '.dump'];
    const hasValidExt = validExtensions.some((ext) => file.name.toLowerCase().endsWith(ext));
    if (!hasValidExt) {
      setError(`O arquivo selecionado "${file.name}" não possui extensão .sql, .tar ou .dump.`);
      return;
    }
    setSelectedFile(file);
  };

  const handleProcessFile = async () => {
    if (!selectedFile) return;

    setIsLoading(true);
    setError(null);
    setSuccessResult(null);

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const result = reader.result as string;
        const base64Data = result.includes(',') ? result.split(',')[1] : result;

        const res = await api.uploadSqlBackup({
          filename: selectedFile.name,
          contentBase64: base64Data,
        });

        localStorage.setItem('sams_current_dump_filename', res.summary.filename);
        setSuccessResult(res);
        onUpdated();
      } catch (err: any) {
        setError(err.message || 'Erro ao processar o arquivo de dump.');
      } finally {
        setIsLoading(false);
      }
    };

    reader.onerror = () => {
      setError('Erro ao ler os bytes do arquivo no navegador.');
      setIsLoading(false);
    };

    reader.readAsDataURL(selectedFile);
  };

  const handleLoadDefaultDump = async () => {
    setIsLoading(true);
    setError(null);
    setSuccessResult(null);
    setSelectedFile(null);

    try {
      const res = await api.uploadSqlBackup({
        useDefaultFile: true,
        filename: 'dump-licitacoes_sams-202611101004.sql',
      });
      localStorage.setItem('sams_current_dump_filename', res.summary.filename);
      setSuccessResult(res);
      onUpdated();
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar dump padrão.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' bytes';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div className="bg-[#0f172a] border border-slate-700 w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">
                Atualizar Base de Dados via Dump (.sql)
              </h3>
              <p className="text-xs text-slate-400">
                Sincronize processos, TRs, fornecedores e empenhos a partir do backup PostgreSQL / DBeaver
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Success Banner */}
          {successResult ? (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-950/60 border border-emerald-600/60 rounded-lg flex items-start gap-3 text-emerald-200">
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-white">
                    Base de dados sincronizada com sucesso!
                  </h4>
                  <p className="text-xs text-emerald-300">
                    O arquivo <strong className="font-mono text-white">{successResult.summary.filename}</strong> foi processado e todos os indicadores, licitações, fornecedores e contratos foram atualizados.
                  </p>
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-lg text-center">
                  <div className="text-[11px] text-slate-400 font-medium">Processos de Compra</div>
                  <div className="text-lg font-bold font-mono text-sky-400 mt-0.5">
                    {successResult.summary.totalProcessos}
                  </div>
                </div>

                <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-lg text-center">
                  <div className="text-[11px] text-slate-400 font-medium">Itens de TR</div>
                  <div className="text-lg font-bold font-mono text-sky-400 mt-0.5">
                    {successResult.summary.totalItensTR}
                  </div>
                </div>

                <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-lg text-center">
                  <div className="text-[11px] text-slate-400 font-medium">Fornecedores</div>
                  <div className="text-lg font-bold font-mono text-emerald-400 mt-0.5">
                    {successResult.summary.totalFornecedores}
                  </div>
                </div>

                <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-lg text-center">
                  <div className="text-[11px] text-slate-400 font-medium">Empenhos Emitidos</div>
                  <div className="text-lg font-bold font-mono text-amber-400 mt-0.5">
                    {successResult.summary.totalEmpenhos}
                  </div>
                </div>

                <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-lg text-center sm:col-span-2">
                  <div className="text-[11px] text-slate-400 font-medium">Total Empenhado</div>
                  <div className="text-lg font-bold font-mono text-emerald-300 mt-0.5">
                    {formatMoney(successResult.summary.valorTotalEmpenhado)}
                  </div>
                </div>
              </div>

              {/* Audit Confirmation */}
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-300 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>Trilha de Auditoria atualizada com evento <strong>[SINCRONIZACAO_DUMP]</strong></span>
                </div>
                <span className="text-[11px] font-mono text-slate-400">
                  {currentUser?.nome || 'Flávio Seabra'}
                </span>
              </div>
            </div>
          ) : (
            <>
              {/* Error Banner */}
              {error && (
                <div className="p-3.5 bg-red-950/60 border border-red-800 rounded-lg text-xs text-red-200 flex items-start gap-2.5">
                  <svg className="w-4 h-4 text-red-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              {/* Drag and Drop Zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-sky-500 bg-sky-950/30'
                    : selectedFile
                    ? 'border-emerald-500/80 bg-emerald-950/20'
                    : 'border-slate-700 hover:border-slate-500 bg-slate-900/40 hover:bg-slate-900/70'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".sql,.tar,.dump"
                  onChange={handleFileInputChange}
                  className="hidden"
                />

                {selectedFile ? (
                  <div className="space-y-2">
                    <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="font-semibold text-white text-sm break-all font-mono">
                      {selectedFile.name}
                    </div>
                    <div className="text-xs text-slate-400">
                      Tamanho: <span className="font-mono text-slate-200">{formatFileSize(selectedFile.size)}</span> · Clique para escolher outro arquivo
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="w-12 h-12 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-400 flex items-center justify-center mx-auto">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">
                        Arraste e solte o arquivo <span className="text-sky-400 font-mono">.sql</span> aqui
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        ou clique para navegar pelos arquivos do seu computador
                      </p>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Formatos aceitos: Backup do DBeaver / pg_dump (Tar ou Plain text SQL)
                    </div>
                  </div>
                )}
              </div>

              {/* Option to load workspace dump */}
              <div className="flex items-center justify-between p-3.5 bg-slate-900/60 border border-slate-800 rounded-lg text-xs">
                <div className="space-y-0.5">
                  <div className="font-medium text-slate-200">
                    Backup padrão do sistema SAMS
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    dump-licitacoes_sams-202611101004.sql (Disponível no servidor)
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleLoadDefaultDump}
                  disabled={isLoading}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-sky-300 hover:text-white border border-slate-700 rounded text-xs font-medium transition-colors disabled:opacity-50"
                >
                  {isLoading ? 'Carregando...' : 'Carregar Este Arquivo'}
                </button>
              </div>

              {/* Operator info and audit notice */}
              <div className="p-3 bg-sky-950/20 border border-sky-900/40 rounded-lg text-xs text-slate-400 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-sky-400" />
                  <span>Operador: <strong className="text-slate-200">{currentUser?.nome || 'Flávio Seabra'}</strong> ({currentUser?.papel || 'GESTOR_LICITACOES'})</span>
                </div>
                <span className="text-[11px] text-slate-500">
                  Auditoria automática ativa
                </span>
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-between bg-slate-900/60">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-md transition-colors"
          >
            {successResult ? 'Fechar' : 'Cancelar'}
          </button>

          {successResult ? (
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-md shadow-sm transition-colors flex items-center gap-1.5"
            >
              <span>Concluir e Ver Painel</span>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleProcessFile}
              disabled={!selectedFile || isLoading}
              className="px-5 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed rounded-md shadow-sm transition-all flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Sincronizando Base de Dados...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  <span>Sincronizar e Atualizar Dados</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
