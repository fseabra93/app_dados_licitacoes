import React, { useState, useEffect } from 'react';
import { Licitacao } from '../types';
import { MODALIDADES_MAP, STATUS_MAP } from '../utils/formatters';

interface LicitacaoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<Licitacao> & { justificativa_cadastro?: string; motivo_alteracao?: string }) => Promise<void>;
  initialData?: Licitacao | null;
  defaultPregoeiro?: string;
}

export const LicitacaoModal: React.FC<LicitacaoModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  defaultPregoeiro = 'Flávio Seabra',
}) => {
  const isEditing = Boolean(initialData);

  const [numeroProcesso, setNumeroProcesso] = useState('');
  const [numeroLicitacao, setNumeroLicitacao] = useState('');
  const [codigoPca, setCodigoPca] = useState('');
  const [numEtp, setNumEtp] = useState('');
  const [numProcPlanejamento, setNumProcPlanejamento] = useState('');
  const [numProcSelecao, setNumProcSelecao] = useState('');
  const [numPregao, setNumPregao] = useState('');
  const [ano, setAno] = useState(new Date().getFullYear());
  const [modalidade, setModalidade] = useState('PREGÃO');
  const [criterioJulgamento, setCriterioJulgamento] = useState('MENOR_PRECO');
  const [objeto, setObjeto] = useState('');
  const [orgaoSetor, setOrgaoSetor] = useState('SAMS / TRE-RN');
  const [valorPca, setValorPca] = useState('');
  const [valorHomologado, setValorHomologado] = useState('');
  const [status, setStatus] = useState<string>('ETP E GR EM ELABORAÇÃO');
  const [dataAbertura, setDataAbertura] = useState('');
  const [dataHomologacao, setDataHomologacao] = useState('');
  const [pregoeiro, setPregoeiro] = useState(defaultPregoeiro);
  const [linkEdital, setLinkEdital] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [motivoAuditoria, setMotivoAuditoria] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      setNumeroProcesso(initialData.numero_processo || '');
      setNumeroLicitacao(initialData.numero_licitacao || '');
      setCodigoPca(initialData.codigo_pca || '');
      setNumEtp(initialData.num_etp || '');
      setNumProcPlanejamento(initialData.num_proc_planejamento || '');
      setNumProcSelecao(initialData.num_proc_selecao || '');
      setNumPregao(initialData.num_pregao || '');
      setAno(initialData.ano || new Date().getFullYear());
      setModalidade(initialData.modalidade || 'PREGÃO');
      setCriterioJulgamento(initialData.criterio_julgamento || 'MENOR_PRECO');
      setObjeto(initialData.objeto || '');
      setOrgaoSetor(initialData.orgao_setor || 'SAMS / TRE-RN');
      setValorPca(String(initialData.valor_pca || initialData.valor_estimado || ''));
      setValorHomologado(initialData.valor_homologado ? String(initialData.valor_homologado) : '');
      setStatus(initialData.status || 'ETP E GR EM ELABORAÇÃO');
      setDataAbertura(initialData.data_abertura ? initialData.data_abertura.split('T')[0] : '');
      setDataHomologacao(initialData.data_homologacao ? initialData.data_homologacao.split('T')[0] : '');
      setPregoeiro(initialData.pregoeiro_responsavel || defaultPregoeiro);
      setLinkEdital(initialData.link_edital || '');
      setObservacoes(initialData.observacoes || '');
      setMotivoAuditoria('');
    } else {
      setNumeroProcesso('');
      setNumeroLicitacao('');
      setCodigoPca('SAM.POO_26.04');
      setNumEtp('80/2026');
      setNumProcPlanejamento('');
      setNumProcSelecao('');
      setNumPregao('90040/2026');
      setAno(2026);
      setModalidade('PREGÃO');
      setCriterioJulgamento('MENOR_PRECO');
      setObjeto('');
      setOrgaoSetor('SAMS / TRE-RN');
      setValorPca('25000.00');
      setValorHomologado('');
      setStatus('ETP E GR EM ELABORAÇÃO');
      setDataAbertura(new Date().toISOString().split('T')[0]);
      setDataHomologacao('');
      setPregoeiro(defaultPregoeiro);
      setLinkEdital('');
      setObservacoes('');
      setMotivoAuditoria('');
    }
    setErrorMsg('');
  }, [initialData, isOpen, defaultPregoeiro]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!objeto.trim()) {
      setErrorMsg('Por favor informe o objeto do processo de contratação.');
      return;
    }

    const valPca = parseFloat(valorPca);
    if (isNaN(valPca) || valPca < 0) {
      setErrorMsg('O valor PCA / Estimado deve ser um número válido maior ou igual a zero.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        objeto: objeto.trim(),
        codigo_pca: codigoPca.trim() || undefined,
        num_etp: numEtp.trim() || undefined,
        num_proc_planejamento: numProcPlanejamento.trim() || undefined,
        num_proc_selecao: numProcSelecao.trim() || undefined,
        num_pregao: numPregao.trim() || undefined,
        numero_processo: (numProcSelecao.trim() || numProcPlanejamento.trim() || numeroProcesso.trim() || `0000/${ano}`),
        numero_licitacao: (numPregao.trim() ? `Pregão ${numPregao.trim()}` : (codigoPca.trim() || numeroLicitacao.trim() || 'Proc. SAMS')),
        ano: Number(ano),
        modalidade,
        criterio_julgamento: criterioJulgamento,
        orgao_setor: orgaoSetor,
        valor_pca: valPca,
        valor_estimado: valPca,
        valor_homologado: valorHomologado ? parseFloat(valorHomologado) : null,
        status,
        data_abertura: dataAbertura || null,
        data_homologacao: dataHomologacao || null,
        pregoeiro_responsavel: pregoeiro.trim(),
        link_edital: linkEdital.trim() || undefined,
        observacoes: observacoes.trim() || undefined,
        ...(isEditing
          ? { motivo_alteracao: motivoAuditoria.trim() || 'Atualização cadastral do processo SAMS.' }
          : { justificativa_cadastro: motivoAuditoria.trim() || 'Cadastro de novo processo de aquisição no banco licitacoes_sams.' }),
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao salvar o processo no banco.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-[#0f1a2d] border border-slate-700 w-full max-w-3xl rounded-xl shadow-2xl p-6 my-8 text-slate-100 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-white">
              {isEditing ? `Editar Processo SAMS: ${initialData?.numero_processo || initialData?.codigo_pca}` : 'Novo Processo SAMS (Inserção no Banco)'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Tabela: <span className="font-mono text-slate-300">processo</span> · Sistema de Licitações SAMS / TRE-RN
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 text-lg"
          >
            ✕
          </button>
        </div>

        {errorMsg && (
          <div className="mt-4 p-3 bg-rose-950/60 border border-rose-800/80 rounded-md text-xs text-rose-300">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Identificadores SAMS */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Código PCA (Plano de Contratações)
              </label>
              <input
                type="text"
                placeholder="Ex: SAM.POO_26.04"
                value={codigoPca}
                onChange={(e) => setCodigoPca(e.target.value)}
                className="w-full bg-[#0a121f] border border-slate-700 rounded px-3 py-2 text-xs text-white focus:outline-hidden focus:border-sky-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Nº Processo Seleção
              </label>
              <input
                type="text"
                placeholder="Ex: 05020/2026"
                value={numProcSelecao}
                onChange={(e) => setNumProcSelecao(e.target.value)}
                className="w-full bg-[#0a121f] border border-slate-700 rounded px-3 py-2 text-xs text-white focus:outline-hidden focus:border-sky-500 font-mono font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Nº Pregão / Edital
              </label>
              <input
                type="text"
                placeholder="Ex: 90023/2026"
                value={numPregao}
                onChange={(e) => setNumPregao(e.target.value)}
                className="w-full bg-[#0a121f] border border-slate-700 rounded px-3 py-2 text-xs text-white focus:outline-hidden focus:border-sky-500 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Nº ETP (Estudo Técnico)
              </label>
              <input
                type="text"
                placeholder="Ex: 75/2026"
                value={numEtp}
                onChange={(e) => setNumEtp(e.target.value)}
                className="w-full bg-[#0a121f] border border-slate-700 rounded px-3 py-2 text-xs text-white focus:outline-hidden focus:border-sky-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Nº Processo Planejamento
              </label>
              <input
                type="text"
                placeholder="Ex: 00634/2026"
                value={numProcPlanejamento}
                onChange={(e) => setNumProcPlanejamento(e.target.value)}
                className="w-full bg-[#0a121f] border border-slate-700 rounded px-3 py-2 text-xs text-white focus:outline-hidden focus:border-sky-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Exercício / Ano *
              </label>
              <input
                type="number"
                required
                value={ano}
                onChange={(e) => setAno(Number(e.target.value))}
                className="w-full bg-[#0a121f] border border-slate-700 rounded px-3 py-2 text-xs text-white focus:outline-hidden focus:border-sky-500 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Modalidade Legal *
              </label>
              <select
                value={modalidade}
                onChange={(e) => setModalidade(e.target.value)}
                className="w-full bg-[#0a121f] border border-slate-700 rounded px-3 py-2 text-xs text-white focus:outline-hidden focus:border-sky-500"
              >
                <option value="PREGÃO">PREGÃO</option>
                <option value="DISPENSA">DISPENSA</option>
                <option value="CONCORRÊNCIA">CONCORRÊNCIA</option>
                <option value="CONCURSO">CONCURSO</option>
                <option value="LEILÃO">LEILÃO</option>
                <option value="DIÁLOGO COMPETITIVO">DIÁLOGO COMPETITIVO</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Critério de Julgamento
              </label>
              <select
                value={criterioJulgamento}
                onChange={(e) => setCriterioJulgamento(e.target.value)}
                className="w-full bg-[#0a121f] border border-slate-700 rounded px-3 py-2 text-xs text-white focus:outline-hidden focus:border-sky-500"
              >
                <option value="MENOR_PRECO">Menor Preço por Item</option>
                <option value="MAIOR_DESCONTO">Maior Desconto</option>
                <option value="MENOR_PRECO_GLOBAL">Menor Preço Global</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Setor Demandante
              </label>
              <select
                value={orgaoSetor}
                onChange={(e) => setOrgaoSetor(e.target.value)}
                className="w-full bg-[#0a121f] border border-slate-700 rounded px-3 py-2 text-xs text-white focus:outline-hidden focus:border-sky-500"
              >
                <option value="SAMS / TRE-RN">SAMS / TRE-RN (Atenção à Saúde)</option>
                <option value="TRE-RN / STI">TRE-RN / STI (Tecnologia)</option>
                <option value="TRE-RN / SAO">TRE-RN / SAO (Administração)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Objeto da Contratação *
            </label>
            <textarea
              required
              rows={3}
              placeholder="Ex: Aquisição de material hospitalar e odontológico para o Setor de Atenção à Saúde..."
              value={objeto}
              onChange={(e) => setObjeto(e.target.value)}
              className="w-full bg-[#0a121f] border border-slate-700 rounded px-3 py-2 text-xs text-white focus:outline-hidden focus:border-sky-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Valor PCA / Orçamento Previsto (R$) *
              </label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="0.00"
                value={valorPca}
                onChange={(e) => setValorPca(e.target.value)}
                className="w-full bg-[#0a121f] border border-slate-700 rounded px-3 py-2 text-xs text-white focus:outline-hidden focus:border-sky-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Valor Homologado / Empenhado (R$)
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="Calculado a partir dos empenhos"
                value={valorHomologado}
                onChange={(e) => setValorHomologado(e.target.value)}
                className="w-full bg-[#0a121f] border border-slate-700 rounded px-3 py-2 text-xs text-white focus:outline-hidden focus:border-sky-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Fase de Status SAMS *
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full bg-[#0a121f] border border-slate-700 rounded px-3 py-2 text-xs text-white focus:outline-hidden focus:border-sky-500"
              >
                {Object.entries(STATUS_MAP).map(([key, info]) => (
                  <option key={key} value={key}>
                    {info.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Pregoeiro / Responsável
              </label>
              <input
                type="text"
                value={pregoeiro}
                onChange={(e) => setPregoeiro(e.target.value)}
                className="w-full bg-[#0a121f] border border-slate-700 rounded px-3 py-2 text-xs text-white focus:outline-hidden focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Link do Edital / Portal
              </label>
              <input
                type="url"
                placeholder="https://www.tre-rn.jus.br/transparencia/..."
                value={linkEdital}
                onChange={(e) => setLinkEdital(e.target.value)}
                className="w-full bg-[#0a121f] border border-slate-700 rounded px-3 py-2 text-xs text-white focus:outline-hidden focus:border-sky-500"
              />
            </div>
          </div>

          {/* Justificativa Obrigatória para Auditoria */}
          <div className="pt-2 border-t border-slate-800">
            <label className="block text-xs font-medium text-amber-300 mb-1">
              Justificativa / Motivo da Operação (Exigido pelo Registro de Auditoria)
            </label>
            <input
              type="text"
              placeholder={isEditing ? 'Descreva o motivo da alteração das informações do processo...' : 'Ex: Abertura de certame conforme PCA 2026 e demanda do SAMS...'}
              value={motivoAuditoria}
              onChange={(e) => setMotivoAuditoria(e.target.value)}
              className="w-full bg-[#0a121f] border border-amber-900/60 rounded px-3 py-2 text-xs text-white focus:outline-hidden focus:border-amber-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded transition-colors shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? 'Gravando no Banco...' : isEditing ? 'Salvar Alterações' : 'Cadastrar Processo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
