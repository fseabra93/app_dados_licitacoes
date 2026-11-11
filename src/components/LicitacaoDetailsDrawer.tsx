import React, { useState, useEffect } from 'react';
import { Licitacao, ItemLicitacao, Contrato, LogAuditoria, Fornecedor } from '../types';
import { api } from '../services/api';
import { formatMoney, formatDate, formatDateTime, MODALIDADES_MAP, STATUS_MAP, ACAO_AUDITORIA_MAP } from '../utils/formatters';

interface LicitacaoDetailsDrawerProps {
  licitacaoId: number | null;
  onClose: () => void;
  onEdit: (licitacao: Licitacao) => void;
  onDelete: (licitacao: Licitacao) => void;
  fornecedores: Fornecedor[];
}

export const LicitacaoDetailsDrawer: React.FC<LicitacaoDetailsDrawerProps> = ({
  licitacaoId,
  onClose,
  onEdit,
  onDelete,
  fornecedores,
}) => {
  const [data, setData] = useState<{
    licitacao: Licitacao;
    itens: ItemLicitacao[];
    contratos: Contrato[];
    historicoAuditoria: LogAuditoria[];
  } | null>(null);
  const [activeTab, setActiveTab] = useState<'geral' | 'fases' | 'itens' | 'empenhos' | 'auditoria'>('geral');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Status transition state
  const [isAdvancingStatus, setIsAdvancingStatus] = useState(false);
  const [nextStatusId, setNextStatusId] = useState<number>(6);
  const [statusObs, setStatusObs] = useState('');

  // New item form
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [itemNome, setItemNome] = useState('');
  const [itemDesc, setItemDesc] = useState('');
  const [itemCatmat, setItemCatmat] = useState('');
  const [itemClasse, setItemClasse] = useState('HOSPITALAR');
  const [itemUnidade, setItemUnidade] = useState('UN');
  const [itemQtd, setItemQtd] = useState('10');
  const [itemValorEst, setItemValorEst] = useState('');
  const [itemValorHom, setItemValorHom] = useState('');
  const [itemFornecedorId, setItemFornecedorId] = useState('');

  const loadDetails = async () => {
    if (!licitacaoId) return;
    setIsLoading(true);
    setError('');
    try {
      const res = await api.getLicitacaoById(licitacaoId);
      setData(res);
      if (res.licitacao.id_status) {
        setNextStatusId(Math.min(7, res.licitacao.id_status + 1));
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar detalhes do processo.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDetails();
  }, [licitacaoId]);

  if (!licitacaoId) return null;

  const handleAdvanceStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!licitacaoId) return;
    try {
      await api.avancarFase(licitacaoId, nextStatusId, statusObs.trim() || undefined);
      setIsAdvancingStatus(false);
      setStatusObs('');
      loadDetails();
    } catch (err: any) {
      alert(err.message || 'Erro ao atualizar fase.');
    }
  };

  const handleToggleEmpenhoPago = async (emp: Contrato) => {
    try {
      await api.updateContratoStatus(emp.id, {
        pagamento_concluido: !emp.pagamento_concluido,
      });
      loadDetails();
    } catch (err: any) {
      alert(err.message || 'Erro ao atualizar empenho.');
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemNome.trim() || !itemQtd) return;
    try {
      await api.addItem(licitacaoId, {
        nome_produto: itemNome.trim(),
        descricao_produto: itemDesc.trim(),
        descricao: itemNome.trim() + (itemDesc ? ' - ' + itemDesc : ''),
        codigo_catmat: itemCatmat.trim() || undefined,
        nome_classe: itemClasse,
        unidade_medida: itemUnidade,
        quantidade: parseFloat(itemQtd) || 1,
        valor_unitario_estimado: parseFloat(itemValorEst) || 0,
        valor_unitario_homologado: itemValorHom ? parseFloat(itemValorHom) : null,
        fornecedor_vencedor_id: itemFornecedorId ? parseInt(itemFornecedorId, 10) : null,
      });
      setIsAddingItem(false);
      setItemNome('');
      setItemDesc('');
      setItemCatmat('');
      setItemValorEst('');
      setItemValorHom('');
      loadDetails();
    } catch (err: any) {
      alert(err.message || 'Erro ao adicionar item ao TR.');
    }
  };

  const handleDeleteItem = async (itemId: number) => {
    if (!confirm('Deseja excluir este item do Termo de Referência? A ação será auditada.')) return;
    try {
      await api.deleteItem(itemId);
      loadDetails();
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir item.');
    }
  };

  const licitacao = data?.licitacao;
  const statusInfo = licitacao ? STATUS_MAP[licitacao.status] : null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs">
      <div className="bg-[#0c1626] border-l border-slate-800 w-full max-w-3xl h-full shadow-2xl flex flex-col text-slate-100 overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-base font-bold text-white">
                {licitacao?.num_proc_selecao ? `Proc. ${licitacao.num_proc_selecao}` : licitacao?.numero_licitacao || 'Processo SAMS'}
              </span>
              {licitacao?.codigo_pca && (
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-sky-950/80 border border-sky-800 text-sky-300">
                  {licitacao.codigo_pca}
                </span>
              )}
              {statusInfo && (
                <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${statusInfo.badgeBg}`}>
                  {statusInfo.label}
                </span>
              )}
            </div>
            <div className="text-xs text-slate-400 mt-1 flex items-center gap-3">
              {licitacao?.num_pregao && <span>Pregão: <strong className="font-mono text-slate-200">{licitacao.num_pregao}</strong></span>}
              {licitacao?.num_etp && <span>ETP: <strong className="font-mono text-slate-200">{licitacao.num_etp}</strong></span>}
              {licitacao?.termo_referencia && <span>TR: <strong className="font-mono text-slate-200">{licitacao.termo_referencia.num_tr}</strong></span>}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {licitacao && (
              <>
                <button
                  onClick={() => onEdit(licitacao)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded transition-colors"
                >
                  Editar
                </button>
                <button
                  onClick={() => onDelete(licitacao)}
                  className="px-3 py-1.5 text-xs font-medium text-rose-300 bg-rose-950/60 hover:bg-rose-900/60 rounded transition-colors"
                >
                  Excluir
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded hover:bg-slate-800 text-lg ml-2"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 px-5 border-b border-slate-800 bg-[#0a121f] text-xs overflow-x-auto">
          <button
            onClick={() => setActiveTab('geral')}
            className={`py-3 px-3 font-medium transition-colors border-b-2 whitespace-nowrap ${
              activeTab === 'geral'
                ? 'border-sky-500 text-sky-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Ficha do Processo
          </button>
          <button
            onClick={() => setActiveTab('fases')}
            className={`py-3 px-3 font-medium transition-colors border-b-2 whitespace-nowrap ${
              activeTab === 'fases'
                ? 'border-sky-500 text-sky-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Fases SAMS ({licitacao?.historico?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('itens')}
            className={`py-3 px-3 font-medium transition-colors border-b-2 whitespace-nowrap ${
              activeTab === 'itens'
                ? 'border-sky-500 text-sky-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Itens do TR ({data?.itens.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('empenhos')}
            className={`py-3 px-3 font-medium transition-colors border-b-2 whitespace-nowrap ${
              activeTab === 'empenhos'
                ? 'border-sky-500 text-sky-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Empenhos ({data?.contratos.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('auditoria')}
            className={`py-3 px-3 font-medium transition-colors border-b-2 whitespace-nowrap ${
              activeTab === 'auditoria'
                ? 'border-sky-500 text-sky-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Auditoria ({data?.historicoAuditoria.length || 0})
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {isLoading ? (
            <div className="text-center py-16 text-slate-400 text-xs">
              Carregando dados autênticos do processo...
            </div>
          ) : error ? (
            <div className="p-3 bg-rose-950/60 border border-rose-800 rounded text-xs text-rose-300">
              {error}
            </div>
          ) : !licitacao ? null : (
            <>
              {/* TAB 1: GERAL */}
              {activeTab === 'geral' && (
                <div className="space-y-5 text-xs">
                  <div>
                    <span className="font-semibold text-slate-400 block uppercase tracking-wider text-[10px]">
                      Objeto da Contratação
                    </span>
                    <p className="mt-1 text-slate-100 text-sm leading-relaxed bg-[#0a121f] p-3.5 rounded-lg border border-slate-800">
                      {licitacao.objeto}
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-[#0f1a2d] p-3 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                        Previsão PCA
                      </span>
                      <span className="font-mono text-base font-bold text-sky-400 block mt-1 tabular-nums">
                        {formatMoney(licitacao.valor_pca || licitacao.valor_estimado)}
                      </span>
                    </div>

                    <div className="bg-[#0f1a2d] p-3 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                        Total Empenhado
                      </span>
                      <span className="font-mono text-base font-bold text-emerald-400 block mt-1 tabular-nums">
                        {formatMoney(licitacao.total_empenhado || licitacao.valor_homologado || 0)}
                      </span>
                    </div>

                    <div className="bg-[#0f1a2d] p-3 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                        Notas de Empenho
                      </span>
                      <span className="font-mono text-base font-bold text-white block mt-1 tabular-nums">
                        {data?.contratos.length || 0} notas
                      </span>
                    </div>
                  </div>

                  <div className="bg-[#0f1a2d] p-4 rounded-lg border border-slate-800 space-y-3">
                    <span className="font-semibold text-white block text-xs border-b border-slate-800 pb-2">
                      Parâmetros Oficiais do Processo SAMS
                    </span>
                    <div className="grid grid-cols-2 gap-y-2.5 gap-x-4">
                      <div>
                        <span className="text-slate-400 block">Código PCA</span>
                        <span className="text-sky-300 font-mono font-medium">{licitacao.codigo_pca || 'Não informado'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Modalidade de Licitação</span>
                        <span className="text-white font-medium">{MODALIDADES_MAP[licitacao.modalidade] || licitacao.modalidade}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Processo de Seleção</span>
                        <span className="text-white font-mono">{licitacao.num_proc_selecao || '—'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Processo de Planejamento</span>
                        <span className="text-white font-mono">{licitacao.num_proc_planejamento || '—'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Número do Pregão</span>
                        <span className="text-white font-mono">{licitacao.num_pregao || '—'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Estudo Técnico Preliminar (ETP)</span>
                        <span className="text-white font-mono">{licitacao.num_etp || '—'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Termo de Referência (TR)</span>
                        <span className="text-white font-mono">{licitacao.termo_referencia ? `TR ${licitacao.termo_referencia.num_tr}` : '—'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Setor Responsável</span>
                        <span className="text-white font-medium">{licitacao.orgao_setor}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Data de Criação</span>
                        <span className="text-slate-200 font-mono">{formatDate(licitacao.created_at)}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Pregoeiro / Responsável</span>
                        <span className="text-slate-200">{licitacao.pregoeiro_responsavel}</span>
                      </div>
                    </div>
                  </div>

                  {licitacao.observacoes && (
                    <div className="pt-1">
                      <span className="text-slate-400 block">Observações do Registro</span>
                      <p className="text-slate-300 mt-1 bg-[#0a121f] p-2.5 rounded border border-slate-800">{licitacao.observacoes}</p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: FASES DO SAMS */}
              {activeTab === 'fases' && (
                <div className="space-y-5 text-xs">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div>
                      <h3 className="font-semibold text-white">Evolução do Processo pelas 7 Fases</h3>
                      <p className="text-slate-400 text-[11px] mt-0.5">Histórico completo de tramitação registrado no banco</p>
                    </div>
                    {!isAdvancingStatus && (
                      <button
                        onClick={() => setIsAdvancingStatus(true)}
                        className="px-3 py-1.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded transition-colors shadow-sm"
                      >
                        + Avançar Fase
                      </button>
                    )}
                  </div>

                  {isAdvancingStatus && (
                    <form onSubmit={handleAdvanceStatus} className="p-4 bg-[#0a121f] border border-sky-800/80 rounded-lg space-y-3">
                      <span className="font-semibold text-white block">Registrar Mudança de Fase no Banco</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-slate-400 mb-1">Nova Fase *</label>
                          <select
                            value={nextStatusId}
                            onChange={(e) => setNextStatusId(parseInt(e.target.value, 10))}
                            className="w-full bg-[#0f1a2d] border border-slate-700 rounded px-2.5 py-1.5 text-white"
                          >
                            <option value={1}>1. ETP E GR EM ELABORAÇÃO</option>
                            <option value={2}>2. ETP E GR ENVIADOS PARA SETEC</option>
                            <option value={3}>3. TR ENVIADO PARA SETEC</option>
                            <option value={4}>4. INICIADA SELEÇÃO FORNECEDOR</option>
                            <option value={5}>5. PROPOSTAS ANALISADAS</option>
                            <option value={6}>6. EMPENHOS EMITIDOS</option>
                            <option value={7}>7. PROCESSO ARQUIVADO</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-slate-400 mb-1">Observação do Despacho</label>
                          <input
                            type="text"
                            placeholder="Ex: Conclusão das assinaturas ou parecer da SETEC..."
                            value={statusObs}
                            onChange={(e) => setStatusObs(e.target.value)}
                            className="w-full bg-[#0f1a2d] border border-slate-700 rounded px-2.5 py-1.5 text-white"
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setIsAdvancingStatus(false)}
                          className="px-3 py-1 text-slate-400 hover:text-white"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          className="px-3 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded font-medium"
                        >
                          Confirmar Mudança
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Timeline list */}
                  <div className="space-y-3 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
                    {(licitacao.historico || []).map((h, idx) => (
                      <div key={idx} className="relative pl-8 space-y-1">
                        <div className="absolute left-1.5 top-1.5 w-3 h-3 rounded-full bg-sky-500 border-2 border-[#0c1626]" />
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-white">
                            {h.id_status_processo}. {h.nome_status}
                          </span>
                          <span className="font-mono text-[11px] text-slate-400">
                            {formatDateTime(h.data_status)}
                          </span>
                        </div>
                        {h.observacao && (
                          <p className="text-slate-300 text-xs bg-[#0a121f] p-2 rounded border border-slate-800">
                            {h.observacao}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 3: ITENS DO TR */}
              {activeTab === 'itens' && (
                <div className="space-y-4 text-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-white">
                        Produtos Cadastrados no Termo de Referência
                      </span>
                      <p className="text-slate-400 text-[11px] mt-0.5">
                        {data?.itens.length || 0} produtos associados a este processo
                      </p>
                    </div>
                    {!isAddingItem && (
                      <button
                        onClick={() => setIsAddingItem(true)}
                        className="px-2.5 py-1 text-xs text-sky-400 bg-sky-950/40 hover:bg-sky-900/60 border border-sky-800/60 rounded transition-colors"
                      >
                        + Adicionar Item ao TR
                      </button>
                    )}
                  </div>

                  {isAddingItem && (
                    <form onSubmit={handleAddItem} className="p-4 bg-[#0a121f] border border-slate-700 rounded-lg space-y-3">
                      <div className="font-semibold text-white">Novo Item do Termo de Referência</div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-slate-400 mb-1">Nome do Produto *</label>
                          <input
                            type="text"
                            required
                            value={itemNome}
                            onChange={(e) => setItemNome(e.target.value)}
                            className="w-full bg-[#0f1a2d] border border-slate-700 rounded px-2.5 py-1.5 text-white"
                            placeholder="Ex: Luva cirúrgica estéril..."
                          />
                        </div>
                        <div>
                          <label className="block text-slate-400 mb-1">Código CATMAT</label>
                          <input
                            type="text"
                            value={itemCatmat}
                            onChange={(e) => setItemCatmat(e.target.value)}
                            className="w-full bg-[#0f1a2d] border border-slate-700 rounded px-2.5 py-1.5 text-white font-mono"
                            placeholder="Ex: 456789"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-slate-400 mb-1">Descrição / Especificação</label>
                        <input
                          type="text"
                          value={itemDesc}
                          onChange={(e) => setItemDesc(e.target.value)}
                          className="w-full bg-[#0f1a2d] border border-slate-700 rounded px-2.5 py-1.5 text-white"
                          placeholder="Ex: Confeccionada em látex natural com pó bioabsorvível..."
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block text-slate-400 mb-1">Classe</label>
                          <select
                            value={itemClasse}
                            onChange={(e) => setItemClasse(e.target.value)}
                            className="w-full bg-[#0f1a2d] border border-slate-700 rounded px-2.5 py-1.5 text-white"
                          >
                            <option value="HOSPITALAR">HOSPITALAR</option>
                            <option value="ODONTOLÓGICO">ODONTOLÓGICO</option>
                            <option value="MEDICAMENTO">MEDICAMENTO</option>
                            <option value="OUTROS">OUTROS</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-slate-400 mb-1">Unidade</label>
                          <input
                            type="text"
                            value={itemUnidade}
                            onChange={(e) => setItemUnidade(e.target.value)}
                            className="w-full bg-[#0f1a2d] border border-slate-700 rounded px-2.5 py-1.5 text-white font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-400 mb-1">Quantidade *</label>
                          <input
                            type="number"
                            required
                            value={itemQtd}
                            onChange={(e) => setItemQtd(e.target.value)}
                            className="w-full bg-[#0f1a2d] border border-slate-700 rounded px-2.5 py-1.5 text-white font-mono"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-slate-400 mb-1">Valor Estimado Unitário (R$)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={itemValorEst}
                            onChange={(e) => setItemValorEst(e.target.value)}
                            className="w-full bg-[#0f1a2d] border border-slate-700 rounded px-2.5 py-1.5 text-white font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-400 mb-1">Valor Homologado Unitário (R$)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={itemValorHom}
                            onChange={(e) => setItemValorHom(e.target.value)}
                            className="w-full bg-[#0f1a2d] border border-slate-700 rounded px-2.5 py-1.5 text-white font-mono"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                        <button
                          type="button"
                          onClick={() => setIsAddingItem(false)}
                          className="px-3 py-1 text-slate-400 hover:text-white"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded font-medium"
                        >
                          Salvar Item
                        </button>
                      </div>
                    </form>
                  )}

                  <div className="space-y-2">
                    {data?.itens.map((it) => (
                      <div
                        key={it.id}
                        className="bg-[#0f1a2d] border border-slate-800 rounded-lg p-3 hover:border-slate-700 transition-colors space-y-1.5"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-slate-800 font-mono font-bold flex items-center justify-center text-[10px] text-sky-400 shrink-0">
                              {it.numero_item}
                            </span>
                            <span className="font-medium text-white text-xs">{it.nome_produto}</span>
                            {it.codigo_catmat && (
                              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                                CATMAT: {it.codigo_catmat}
                              </span>
                            )}
                            {it.nome_classe && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800/80 text-sky-300">
                                {it.nome_classe}
                              </span>
                            )}
                          </div>

                          <button
                            onClick={() => handleDeleteItem(it.id)}
                            className="text-slate-500 hover:text-rose-400 p-1 text-[11px]"
                            title="Remover Item"
                          >
                            Excluir
                          </button>
                        </div>

                        {it.descricao_produto && (
                          <p className="text-[11px] text-slate-400 pl-7 leading-relaxed">
                            {it.descricao_produto}
                          </p>
                        )}

                        {it.marcas_referencia && it.marcas_referencia.length > 0 && (
                          <div className="text-[10px] text-slate-400 pl-7">
                            Marcas de referência: <span className="text-slate-300">{it.marcas_referencia.join(', ')} ou similar</span>
                          </div>
                        )}

                        <div className="flex items-center justify-between text-[11px] pt-1 pl-7 border-t border-slate-800/60 font-mono">
                          <span className="text-slate-400">
                            Quantidade: <strong className="text-slate-200">{it.quantidade} {it.unidade}</strong>
                          </span>
                          <span className="text-slate-400">
                            Estimado: <strong className="text-slate-200">{formatMoney(it.valor_unitario_estimado)}</strong>
                          </span>
                          {it.valor_unitario_homologado !== null && (
                            <span className="text-emerald-400 font-semibold">
                              Homologado: {formatMoney(it.valor_unitario_homologado)}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 4: EMPENHOS */}
              {activeTab === 'empenhos' && (
                <div className="space-y-4 text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <div>
                      <span className="font-semibold text-white">Notas de Empenho Vinculadas</span>
                      <p className="text-slate-400 text-[11px] mt-0.5">Execução financeira deste processo licitatório</p>
                    </div>
                    <span className="font-mono font-bold text-emerald-400 text-sm">
                      Total: {formatMoney(licitacao.total_empenhado || 0)}
                    </span>
                  </div>

                  {data?.contratos.length === 0 ? (
                    <div className="py-8 text-center text-slate-400">
                      Nenhum empenho emitido ainda para este processo.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {data?.contratos.map((emp) => (
                        <div
                          key={emp.id}
                          className="bg-[#0f1a2d] border border-slate-800 rounded-lg p-3.5 space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-white text-xs">
                                {emp.numero_empenho}
                              </span>
                              <span className="text-slate-500">·</span>
                              <span className="text-slate-300 font-medium">{emp.fornecedor_nome}</span>
                            </div>
                            <span className="font-mono font-bold text-emerald-400 text-sm">
                              {formatMoney(emp.valor_empenho)}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
                            <div>
                              <span>Envio ao Fornecedor: </span>
                              <span className={emp.enviado ? 'text-emerald-300 font-semibold' : 'text-amber-300'}>
                                {emp.enviado ? '✅ ENVIADO' : '⏳ PENDENTE'}
                              </span>
                              {emp.data_envio && <span className="font-mono text-slate-500"> ({formatDate(emp.data_envio)})</span>}
                            </div>
                            <div>
                              <span>Pagamento: </span>
                              <span className={emp.pagamento_concluido ? 'text-teal-300 font-semibold' : 'text-amber-400'}>
                                {emp.pagamento_concluido ? '✓ CONCLUÍDO' : '⏳ EM LIQUIDAÇÃO'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-1">
                            <span className="font-mono text-[10px] text-slate-400">
                              {emp.num_processo_pagamento ? `Proc. Pagamento: ${emp.num_processo_pagamento}` : 'Sem processo de pagamento associado'}
                            </span>
                            <button
                              onClick={() => handleToggleEmpenhoPago(emp)}
                              className="px-2.5 py-1 rounded text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
                            >
                              Alternar Pagamento ({emp.pagamento_concluido ? 'Marcar Pendente' : 'Marcar Pago'})
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 5: AUDITORIA */}
              {activeTab === 'auditoria' && (
                <div className="space-y-3 text-xs">
                  <div className="pb-2 border-b border-slate-800">
                    <span className="font-semibold text-white">Trilha de Auditoria Deste Processo</span>
                    <p className="text-slate-400 text-[11px] mt-0.5">Logs rastreando quem alterou, inseriu ou evoluiu fases</p>
                  </div>

                  {data?.historicoAuditoria.length === 0 ? (
                    <div className="py-8 text-center text-slate-400">
                      Nenhum registro de auditoria específico arquivado para este processo.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {data?.historicoAuditoria.map((a) => {
                        const acaoInfo = ACAO_AUDITORIA_MAP[a.acao] || {
                          label: a.acao,
                          textClass: 'text-slate-300',
                        };
                        return (
                          <div key={a.id} className="bg-[#0f1a2d] border border-slate-800 rounded p-3 space-y-1">
                            <div className="flex items-center justify-between">
                              <span className={`font-semibold ${acaoInfo.textClass}`}>
                                [{acaoInfo.label}]
                              </span>
                              <span className="font-mono text-[11px] text-slate-400">
                                {formatDateTime(a.timestamp)}
                              </span>
                            </div>
                            <div className="text-slate-300 text-xs">
                              Operador: <strong className="text-white">{a.usuario_nome}</strong> ({a.usuario_papel})
                            </div>
                            <pre className="text-[10px] font-mono text-slate-400 bg-[#0a121f] p-2 rounded overflow-x-auto">
                              {JSON.stringify(a.detalhes, null, 2)}
                            </pre>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
