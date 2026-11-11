import React, { useState, useMemo } from 'react';
import { ProdutoCatalogo, Usuario } from '../types';
import { api } from '../services/api';

interface ProdutosViewProps {
  produtos: ProdutoCatalogo[];
  isLoading: boolean;
  onRefresh: () => void;
  currentUser?: Usuario | null;
}

export const ProdutosView: React.FC<ProdutosViewProps> = ({
  produtos,
  isLoading,
  onRefresh,
  currentUser,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLote, setSelectedLote] = useState('ALL');
  const [sortField, setSortField] = useState<'codigo_catmat' | 'nome_produto' | 'unidade' | 'nome_lote'>('nome_produto');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  // Modals state
  const [selectedProductDetails, setSelectedProductDetails] = useState<ProdutoCatalogo | null>(null);
  const [editingProduct, setEditingProduct] = useState<ProdutoCatalogo | null>(null);
  const [isNewProductOpen, setIsNewProductOpen] = useState(false);
  const [deletingProduct, setDeletingProduct] = useState<ProdutoCatalogo | null>(null);
  const [deleteJustification, setDeleteJustification] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedCatmat, setCopiedCatmat] = useState<string | null>(null);

  // Form state for New / Edit
  const [formNome, setFormNome] = useState('');
  const [formCatmat, setFormCatmat] = useState('');
  const [formDescricao, setFormDescricao] = useState('');
  const [formUnidade, setFormUnidade] = useState('');
  const [formLote, setFormLote] = useState('');

  // Extract distinct lotes
  const lotesList = useMemo(() => {
    const set = new Set<string>();
    produtos.forEach((p) => {
      if (p.nome_lote && p.nome_lote.trim() !== '') {
        set.add(p.nome_lote.trim());
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR', { numeric: true }));
  }, [produtos]);

  // Filter and sort
  const filteredProdutos = useMemo(() => {
    let result = produtos.filter((p) => {
      const q = searchTerm.toLowerCase().trim();
      const matchSearch =
        !q ||
        (p.codigo_catmat && p.codigo_catmat.toLowerCase().includes(q)) ||
        (p.nome_produto && p.nome_produto.toLowerCase().includes(q)) ||
        (p.descricao_produto && p.descricao_produto.toLowerCase().includes(q)) ||
        (p.unidade && p.unidade.toLowerCase().includes(q)) ||
        (p.nome_lote && p.nome_lote.toLowerCase().includes(q));

      const matchLote = selectedLote === 'ALL' || p.nome_lote === selectedLote;

      return matchSearch && matchLote;
    });

    result.sort((a, b) => {
      const valA = String(a[sortField] || '').toLowerCase();
      const valB = String(b[sortField] || '').toLowerCase();
      const comp = valA.localeCompare(valB, 'pt-BR', { numeric: true });
      return sortOrder === 'desc' ? -comp : comp;
    });

    return result;
  }, [produtos, searchTerm, selectedLote, sortField, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(filteredProdutos.length / itemsPerPage) || 1;
  const paginatedProdutos = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredProdutos.slice(start, start + itemsPerPage);
  }, [filteredProdutos, currentPage]);

  const handleSort = (field: 'codigo_catmat' | 'nome_produto' | 'unidade' | 'nome_lote') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handleCopyCatmat = (catmat: string) => {
    navigator.clipboard.writeText(catmat);
    setCopiedCatmat(catmat);
    setTimeout(() => setCopiedCatmat(null), 2000);
  };

  const handleOpenNew = () => {
    setFormNome('');
    setFormCatmat('');
    setFormDescricao('');
    setFormUnidade('Unidade');
    setFormLote(lotesList[0] || 'LOTE 1H');
    setIsNewProductOpen(true);
  };

  const handleOpenEdit = (p: ProdutoCatalogo) => {
    setEditingProduct(p);
    setFormNome(p.nome_produto);
    setFormCatmat(p.codigo_catmat);
    setFormDescricao(p.descricao_produto);
    setFormUnidade(p.unidade);
    setFormLote(p.nome_lote || 'Geral');
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNome.trim()) return;

    setIsSubmitting(true);
    try {
      if (editingProduct) {
        await api.updateProduto(editingProduct.id_produto, {
          nome_produto: formNome.trim(),
          codigo_catmat: formCatmat.trim() || 'N/A',
          descricao_produto: formDescricao.trim() || formNome.trim(),
          unidade: formUnidade.trim() || 'Unidade',
          nome_lote: formLote.trim() || 'Geral',
        });
        setEditingProduct(null);
      } else {
        await api.createProduto({
          nome_produto: formNome.trim(),
          codigo_catmat: formCatmat.trim() || 'N/A',
          descricao_produto: formDescricao.trim() || formNome.trim(),
          unidade: formUnidade.trim() || 'Unidade',
          nome_lote: formLote.trim() || 'Geral',
        });
        setIsNewProductOpen(false);
      }
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar produto.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProduct = async () => {
    if (!deletingProduct) return;
    if (!deleteJustification.trim()) {
      alert('Por favor, informe a justificativa da exclusão para fins de auditoria.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.deleteProduto(deletingProduct.id_produto, deleteJustification.trim());
      setDeletingProduct(null);
      setDeleteJustification('');
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir produto.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExportCsv = () => {
    const headers = ['ID', 'Código CATMAT', 'Nome do Produto', 'Descrição', 'Unidade', 'Lote'];
    const rows = filteredProdutos.map((p) => [
      p.id_produto,
      `"${p.codigo_catmat || ''}"`,
      `"${(p.nome_produto || '').replace(/"/g, '""')}"`,
      `"${(p.descricao_produto || '').replace(/"/g, '""')}"`,
      `"${p.unidade || ''}"`,
      `"${p.nome_lote || ''}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `catalogo_produtos_sams_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Catálogo de Produtos SAMS
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold bg-sky-950/80 border border-sky-800 text-sky-300 rounded-full font-mono">
              {produtos.length} {produtos.length === 1 ? 'produto' : 'produtos'}
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Padronização de materiais de saúde, odontologia e medicamentos · Tribunal Regional Eleitoral (TRE-RN)
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={handleExportCsv}
            disabled={filteredProdutos.length === 0}
            className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Exportar listagem em formato CSV"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Exportar CSV</span>
          </button>

          <button
            onClick={handleOpenNew}
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-md transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Novo Produto</span>
          </button>
        </div>
      </div>

      {/* Metrics overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[#0f1a2d] border border-slate-800 rounded-lg p-3.5">
          <div className="text-[11px] text-slate-400 font-medium">Total de Produtos</div>
          <div className="text-xl font-bold font-mono text-sky-400 mt-1">{produtos.length}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Cadastrados no banco SAMS</div>
        </div>

        <div className="bg-[#0f1a2d] border border-slate-800 rounded-lg p-3.5">
          <div className="text-[11px] text-slate-400 font-medium">Lotes de Classificação</div>
          <div className="text-xl font-bold font-mono text-emerald-400 mt-1">{lotesList.length}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Lotes hospitalares e odontológicos</div>
        </div>

        <div className="bg-[#0f1a2d] border border-slate-800 rounded-lg p-3.5">
          <div className="text-[11px] text-slate-400 font-medium">Classificados com CATMAT</div>
          <div className="text-xl font-bold font-mono text-cyan-300 mt-1">
            {produtos.filter((p) => p.codigo_catmat && p.codigo_catmat !== 'N/A').length}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Códigos federais vinculados</div>
        </div>

        <div className="bg-[#0f1a2d] border border-slate-800 rounded-lg p-3.5">
          <div className="text-[11px] text-slate-400 font-medium">Produtos Filtrados</div>
          <div className="text-xl font-bold font-mono text-amber-400 mt-1">
            {filteredProdutos.length}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Exibidos na tabela atual</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#0f1a2d] border border-slate-800 rounded-lg p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Filtrar por código CATMAT, nome do produto, descrição, unidade ou lote..."
            className="w-full pl-9 pr-8 py-2 bg-slate-900 border border-slate-700/80 rounded-md text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-colors"
          />
          {searchTerm && (
            <button
              onClick={() => {
                setSearchTerm('');
                setCurrentPage(1);
              }}
              className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-white"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <label className="text-xs text-slate-400 whitespace-nowrap">Filtrar por Lote:</label>
          <select
            value={selectedLote}
            onChange={(e) => {
              setSelectedLote(e.target.value);
              setCurrentPage(1);
            }}
            className="bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-md px-2.5 py-2 focus:outline-none focus:border-sky-500 transition-colors"
          >
            <option value="ALL">Todos os Lotes ({produtos.length})</option>
            {lotesList.map((lote) => {
              const count = produtos.filter((p) => p.nome_lote === lote).length;
              return (
                <option key={lote} value={lote}>
                  {lote} ({count})
                </option>
              );
            })}
          </select>

          {(searchTerm || selectedLote !== 'ALL') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedLote('ALL');
                setCurrentPage(1);
              }}
              className="px-2.5 py-2 text-xs text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md transition-colors"
              title="Limpar todos os filtros"
            >
              Limpar
            </button>
          )}
        </div>
      </div>

      {/* Main Table Structure */}
      <div className="bg-[#0f1a2d] border border-slate-800 rounded-lg overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-900/80 border-b border-slate-800 text-slate-400 font-semibold select-none">
                <th
                  onClick={() => handleSort('codigo_catmat')}
                  className="py-3 px-4 cursor-pointer hover:text-white whitespace-nowrap w-32"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Código CATMAT</span>
                    {sortField === 'codigo_catmat' && (
                      <span className="text-sky-400">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('nome_produto')}
                  className="py-3 px-4 cursor-pointer hover:text-white min-w-[240px]"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Nome do Produto</span>
                    {sortField === 'nome_produto' && (
                      <span className="text-sky-400">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th className="py-3 px-4 min-w-[320px] max-w-md">
                  <span>Descrição do Produto</span>
                </th>
                <th
                  onClick={() => handleSort('unidade')}
                  className="py-3 px-4 cursor-pointer hover:text-white whitespace-nowrap w-40"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Unidade</span>
                    {sortField === 'unidade' && (
                      <span className="text-sky-400">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('nome_lote')}
                  className="py-3 px-4 cursor-pointer hover:text-white whitespace-nowrap w-36"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Lote</span>
                    {sortField === 'nome_lote' && (
                      <span className="text-sky-400">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th className="py-3 px-4 text-right whitespace-nowrap w-24">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <div className="inline-block w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin mb-2" />
                    <div>Carregando catálogo de produtos...</div>
                  </td>
                </tr>
              ) : paginatedProdutos.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <p className="text-sm font-medium">Nenhum produto encontrado</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Tente ajustar seus termos de busca ou remover o filtro de lote.
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedProdutos.map((p) => {
                  const isOdonto = p.nome_lote?.includes('OD');
                  const isHospitalar = p.nome_lote?.includes('H');

                  return (
                    <tr
                      key={p.id_produto}
                      className="hover:bg-slate-800/40 transition-colors group"
                    >
                      {/* Código CATMAT */}
                      <td className="py-3 px-4 font-mono font-medium text-slate-200 whitespace-nowrap align-top">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="bg-slate-900 px-2 py-0.5 rounded border border-slate-700/80 text-sky-300 font-semibold text-[11px]"
                            title="Código oficial CATMAT do Governo Federal"
                          >
                            {p.codigo_catmat || 'N/A'}
                          </span>
                          {p.codigo_catmat && p.codigo_catmat !== 'N/A' && (
                            <button
                              onClick={() => handleCopyCatmat(p.codigo_catmat)}
                              className="text-slate-500 hover:text-sky-300 p-0.5 transition-colors"
                              title="Copiar código CATMAT"
                            >
                              {copiedCatmat === p.codigo_catmat ? (
                                <span className="text-[10px] text-emerald-400">✓</span>
                              ) : (
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                              )}
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Nome do Produto */}
                      <td className="py-3 px-4 font-medium text-white align-top">
                        <div className="font-semibold text-slate-100 group-hover:text-sky-300 transition-colors">
                          {p.nome_produto}
                        </div>
                        {p.nome_classe && p.nome_classe !== 'Geral' && (
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Classe: <span className="text-slate-300">{p.nome_classe}</span>
                          </div>
                        )}
                      </td>

                      {/* Descrição do Produto */}
                      <td className="py-3 px-4 text-slate-300 leading-relaxed align-top">
                        <div className="line-clamp-2 text-xs text-slate-300" title={p.descricao_produto}>
                          {p.descricao_produto}
                        </div>
                        {p.descricao_produto && p.descricao_produto.length > 120 && (
                          <button
                            onClick={() => setSelectedProductDetails(p)}
                            className="text-[10px] text-sky-400 hover:text-sky-300 mt-0.5 font-medium inline-block cursor-pointer"
                          >
                            Ver descrição completa
                          </button>
                        )}
                      </td>

                      {/* Unidade */}
                      <td className="py-3 px-4 text-slate-300 font-mono text-[11px] whitespace-nowrap align-top">
                        <span className="bg-slate-900/90 border border-slate-700/60 px-2 py-0.5 rounded text-slate-300">
                          {p.unidade || 'Unidade'}
                        </span>
                      </td>

                      {/* Lote */}
                      <td className="py-3 px-4 whitespace-nowrap align-top">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${
                            isOdonto
                              ? 'bg-amber-950/60 text-amber-300 border-amber-800/80'
                              : isHospitalar
                              ? 'bg-sky-950/60 text-sky-300 border-sky-800/80'
                              : 'bg-slate-800 text-slate-300 border-slate-700'
                          }`}
                        >
                          {p.nome_lote || 'Geral'}
                        </span>
                      </td>

                      {/* Ações */}
                      <td className="py-3 px-4 text-right whitespace-nowrap align-top">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedProductDetails(p)}
                            className="p-1 text-slate-400 hover:text-sky-300 hover:bg-slate-800 rounded transition-colors"
                            title="Ver detalhes do produto"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleOpenEdit(p)}
                            className="p-1 text-slate-400 hover:text-amber-300 hover:bg-slate-800 rounded transition-colors"
                            title="Editar produto"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => setDeletingProduct(p)}
                            className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors"
                            title="Excluir produto"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        {filteredProdutos.length > itemsPerPage && (
          <div className="px-4 py-3 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between text-xs text-slate-400">
            <div>
              Mostrando <span className="font-semibold text-slate-200">{(currentPage - 1) * itemsPerPage + 1}</span> a{' '}
              <span className="font-semibold text-slate-200">
                {Math.min(currentPage * itemsPerPage, filteredProdutos.length)}
              </span>{' '}
              de <span className="font-semibold text-slate-200">{filteredProdutos.length}</span> produtos
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed rounded text-slate-300 transition-colors"
              >
                Anterior
              </button>

              <span className="px-2 py-1 text-slate-300 font-mono">
                {currentPage} / {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed rounded text-slate-300 transition-colors"
              >
                Próxima
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL: Detalhes do Produto */}
      {selectedProductDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-[#0f172a] border border-slate-700 w-full max-w-xl rounded-xl shadow-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Especificação do Produto</h3>
                  <p className="text-[11px] text-slate-400 font-mono">ID #{selectedProductDetails.id_produto}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedProductDetails(null)}
                className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Nome do Produto
                </label>
                <div className="text-base font-bold text-white mt-0.5">
                  {selectedProductDetails.nome_produto}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg">
                  <span className="text-[10px] text-slate-400 block font-medium">Código CATMAT</span>
                  <div className="font-mono text-sm font-bold text-sky-400 mt-0.5">
                    {selectedProductDetails.codigo_catmat || 'N/A'}
                  </div>
                </div>

                <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg">
                  <span className="text-[10px] text-slate-400 block font-medium">Unidade de Medida</span>
                  <div className="font-mono text-sm font-bold text-slate-200 mt-0.5">
                    {selectedProductDetails.unidade}
                  </div>
                </div>

                <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg col-span-2">
                  <span className="text-[10px] text-slate-400 block font-medium">Lote de Classificação</span>
                  <div className="text-sm font-semibold text-amber-300 mt-0.5">
                    {selectedProductDetails.nome_lote || 'Não classificado'}
                  </div>
                  {selectedProductDetails.descricao_lote && (
                    <p className="text-xs text-slate-400 mt-1">
                      {selectedProductDetails.descricao_lote}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Descrição Técnica Completa
                </label>
                <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-300 leading-relaxed max-h-48 overflow-y-auto">
                  {selectedProductDetails.descricao_produto}
                </div>
              </div>

              {selectedProductDetails.descricao_catmat && (
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                    Descrição no Padrão CATMAT / SIASG
                  </label>
                  <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg text-[11px] text-slate-400 leading-relaxed font-mono">
                    {selectedProductDetails.descricao_catmat}
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-3 border-t border-slate-800 bg-slate-900/60 flex items-center justify-end">
              <button
                onClick={() => setSelectedProductDetails(null)}
                className="px-4 py-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 rounded-md transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Novo / Editar Produto */}
      {(isNewProductOpen || editingProduct) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-[#0f172a] border border-slate-700 w-full max-w-lg rounded-xl shadow-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
              <h3 className="text-sm font-semibold text-white">
                {editingProduct ? 'Editar Produto' : 'Cadastrar Novo Produto'}
              </h3>
              <button
                onClick={() => {
                  setIsNewProductOpen(false);
                  setEditingProduct(null);
                }}
                className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800 transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Nome do Produto *
                </label>
                <input
                  type="text"
                  required
                  value={formNome}
                  onChange={(e) => setFormNome(e.target.value)}
                  placeholder="Ex: Luva Cirúrgica Estéril nº 7,5"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Código CATMAT
                  </label>
                  <input
                    type="text"
                    value={formCatmat}
                    onChange={(e) => setFormCatmat(e.target.value)}
                    placeholder="Ex: 620090"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Unidade de Medida *
                  </label>
                  <input
                    type="text"
                    required
                    value={formUnidade}
                    onChange={(e) => setFormUnidade(e.target.value)}
                    placeholder="Ex: Caixa com 50 pares, Frasco, Unidade"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Lote de Classificação *
                </label>
                <input
                  type="text"
                  required
                  value={formLote}
                  onChange={(e) => setFormLote(e.target.value)}
                  placeholder="Ex: LOTE 1H, LOTE 9OD"
                  list="lotes-datalist"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
                <datalist id="lotes-datalist">
                  {lotesList.map((l) => (
                    <option key={l} value={l} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Descrição Detalhada do Produto
                </label>
                <textarea
                  rows={4}
                  value={formDescricao}
                  onChange={(e) => setFormDescricao(e.target.value)}
                  placeholder="Especificações técnicas, características adicionais, composição e aplicação..."
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsNewProductOpen(false);
                    setEditingProduct(null);
                  }}
                  className="px-3.5 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-md transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !formNome.trim()}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 disabled:opacity-50 rounded-md transition-colors shadow-sm"
                >
                  {isSubmitting ? 'Salvando...' : editingProduct ? 'Salvar Alterações' : 'Cadastrar Produto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Excluir Produto com Auditoria */}
      {deletingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-[#0f172a] border border-slate-700 w-full max-w-md rounded-xl shadow-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
              <h3 className="text-sm font-semibold text-rose-400">Excluir Produto do Catálogo</h3>
              <button
                onClick={() => setDeletingProduct(null)}
                className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-300">
                Tem certeza que deseja excluir o produto{' '}
                <strong className="text-white">"{deletingProduct.nome_produto}"</strong> (CATMAT:{' '}
                <span className="font-mono text-sky-400">{deletingProduct.codigo_catmat}</span>)?
              </p>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Justificativa Obrigatória (Auditoria SAMS) *
                </label>
                <textarea
                  required
                  rows={3}
                  value={deleteJustification}
                  onChange={(e) => setDeleteJustification(e.target.value)}
                  placeholder="Informe o motivo da exclusão para registro na trilha de conformidade..."
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setDeletingProduct(null)}
                  className="px-3.5 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-md transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleDeleteProduct}
                  disabled={isSubmitting || !deleteJustification.trim()}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 disabled:opacity-50 rounded-md transition-colors shadow-sm"
                >
                  {isSubmitting ? 'Excluindo...' : 'Confirmar Exclusão'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
