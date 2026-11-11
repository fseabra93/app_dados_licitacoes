import React, { useState } from 'react';
import { Fornecedor } from '../types';
import { api } from '../services/api';

interface FornecedoresViewProps {
  fornecedores: Fornecedor[];
  isLoading: boolean;
  onRefresh: () => void;
}

export const FornecedoresView: React.FC<FornecedoresViewProps> = ({
  fornecedores,
  isLoading,
  onRefresh,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [razaoSocial, setRazaoSocial] = useState('');
  const [nomeFantasia, setNomeFantasia] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [uf, setUf] = useState('RN');
  const [porte, setPorte] = useState('ME/EPP');
  const [situacao, setSituacao] = useState('ATIVO');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const filtered = fornecedores.filter((f) => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      f.razao_social.toLowerCase().includes(q) ||
      (f.nome_fantasia && f.nome_fantasia.toLowerCase().includes(q)) ||
      f.cnpj_cpf.toLowerCase().includes(q) ||
      f.email.toLowerCase().includes(q)
    );
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!razaoSocial.trim() || !cnpj.trim()) {
      setErrorMsg('Razão Social e CNPJ/CPF são obrigatórios.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');
    try {
      await api.createFornecedor({
        razao_social: razaoSocial.trim(),
        nome_fantasia: nomeFantasia.trim(),
        cnpj_cpf: cnpj.trim(),
        email: email.trim(),
        telefone: telefone.trim(),
        uf,
        porte,
        situacao_cadastral: situacao,
      });
      setIsModalOpen(false);
      setRazaoSocial('');
      setNomeFantasia('');
      setCnpj('');
      setEmail('');
      setTelefone('');
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao cadastrar fornecedor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            Cadastro de Fornecedores (Tabela fornecedores)
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Empresas credenciadas, participantes e adjudicatárias no banco licitacoes_sams
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-3.5 py-1.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded transition-colors whitespace-nowrap shadow-sm"
        >
          + Novo Fornecedor
        </button>
      </div>

      {/* Search Toolbar */}
      <div className="bg-[#0f1a2d] border border-slate-800 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="w-full sm:max-w-md">
          <input
            type="text"
            placeholder="Buscar por Razão Social, Nome Fantasia ou CNPJ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#0a121f] border border-slate-700 rounded px-3 py-1.5 text-white placeholder-slate-500 focus:outline-hidden focus:border-sky-500"
          />
        </div>

        <div className="text-slate-400 text-xs">
          Total: <span className="font-semibold text-white tabular-nums">{filtered.length}</span> fornecedores
        </div>
      </div>

      {/* Vendors Table */}
      <div className="bg-[#0f1a2d] border border-slate-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#0a121f] text-slate-400 border-b border-slate-800 font-medium">
                <th className="py-3 px-4">Razão Social / Nome Fantasia</th>
                <th className="py-3 px-4">CNPJ / CPF</th>
                <th className="py-3 px-4">UF</th>
                <th className="py-3 px-4">Porte</th>
                <th className="py-3 px-4">Contato</th>
                <th className="py-3 px-4">Situação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Carregando fornecedores...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Nenhum fornecedor encontrado.
                  </td>
                </tr>
              ) : (
                filtered.map((f) => (
                  <tr key={f.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-medium text-white">{f.razao_social}</div>
                      {f.nome_fantasia && (
                        <div className="text-[11px] text-slate-400">{f.nome_fantasia}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-300 tabular-nums">
                      {f.cnpj_cpf}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-300">{f.uf}</td>
                    <td className="py-3 px-4 text-slate-300">{f.porte}</td>
                    <td className="py-3 px-4">
                      <div className="text-slate-300">{f.email}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{f.telefone}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`font-semibold ${
                          f.situacao_cadastral === 'ATIVO'
                            ? 'text-emerald-400'
                            : 'text-rose-400'
                        }`}
                      >
                        {f.situacao_cadastral}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Vendor Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-[#0f1a2d] border border-slate-700 w-full max-w-lg rounded-xl shadow-2xl p-6 text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-base font-bold text-white">Cadastrar Novo Fornecedor</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded"
              >
                ✕
              </button>
            </div>

            {errorMsg && (
              <div className="mt-3 p-2 bg-rose-950/60 border border-rose-800 rounded text-xs text-rose-300">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreate} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">Razão Social *</label>
                <input
                  type="text"
                  required
                  placeholder="Nome empresarial completo..."
                  value={razaoSocial}
                  onChange={(e) => setRazaoSocial(e.target.value)}
                  className="w-full bg-[#0a121f] border border-slate-700 rounded px-3 py-1.5 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Nome Fantasia</label>
                <input
                  type="text"
                  placeholder="Nome comercial da empresa..."
                  value={nomeFantasia}
                  onChange={(e) => setNomeFantasia(e.target.value)}
                  className="w-full bg-[#0a121f] border border-slate-700 rounded px-3 py-1.5 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">CNPJ / CPF *</label>
                  <input
                    type="text"
                    required
                    placeholder="00.000.000/0001-00"
                    value={cnpj}
                    onChange={(e) => setCnpj(e.target.value)}
                    className="w-full bg-[#0a121f] border border-slate-700 rounded px-3 py-1.5 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">UF Sede</label>
                  <input
                    type="text"
                    maxLength={2}
                    value={uf}
                    onChange={(e) => setUf(e.target.value.toUpperCase())}
                    className="w-full bg-[#0a121f] border border-slate-700 rounded px-3 py-1.5 text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">E-mail Comercial</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[#0a121f] border border-slate-700 rounded px-3 py-1.5 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Telefone</label>
                  <input
                    type="text"
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value)}
                    className="w-full bg-[#0a121f] border border-slate-700 rounded px-3 py-1.5 text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Porte da Empresa</label>
                  <select
                    value={porte}
                    onChange={(e) => setPorte(e.target.value)}
                    className="w-full bg-[#0a121f] border border-slate-700 rounded px-2.5 py-1.5 text-white"
                  >
                    <option value="ME/EPP">ME / EPP (Beneficiária LC 123)</option>
                    <option value="DEMAIS">Demais Portes</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Situação Cadastral</label>
                  <select
                    value={situacao}
                    onChange={(e) => setSituacao(e.target.value)}
                    className="w-full bg-[#0a121f] border border-slate-700 rounded px-2.5 py-1.5 text-white"
                  >
                    <option value="ATIVO">Ativo</option>
                    <option value="SUSPENSO">Suspenso</option>
                    <option value="IMPEDIDO">Impedido de Licitar</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-3 py-1.5 text-slate-300 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded font-medium disabled:opacity-50"
                >
                  {isSubmitting ? 'Salvando...' : 'Cadastrar Fornecedor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
