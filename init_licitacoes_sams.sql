-- =========================================================================
-- BANCO DE DADOS: licitacoes_sams
-- Sistema de Acompanhamento de Materiais e Serviços (SAMS)
-- Tribunal Regional Eleitoral do Rio Grande do Norte (TRE-RN) / Setor Público
-- Script de Inicialização e Criação de Tabelas com Auditoria Completa
-- =========================================================================

-- Criar extensão para UUID se necessário
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tabela de Fornecedores Cadastrados
CREATE TABLE IF NOT EXISTS fornecedores (
    id SERIAL PRIMARY KEY,
    razao_social VARCHAR(255) NOT NULL,
    nome_fantasia VARCHAR(255),
    cnpj_cpf VARCHAR(20) NOT NULL UNIQUE,
    email VARCHAR(120),
    telefone VARCHAR(30),
    uf VARCHAR(2) DEFAULT 'RN',
    porte VARCHAR(20) DEFAULT 'ME/EPP', -- 'ME/EPP', 'DEMAIS'
    situacao_cadastral VARCHAR(20) DEFAULT 'ATIVO', -- 'ATIVO', 'SUSPENSO', 'IMPEDIDO'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabela Principal de Licitações
CREATE TABLE IF NOT EXISTS licitacoes (
    id SERIAL PRIMARY KEY,
    numero_processo VARCHAR(50) NOT NULL,
    numero_licitacao VARCHAR(50) NOT NULL UNIQUE,
    ano INTEGER NOT NULL,
    modalidade VARCHAR(50) NOT NULL, -- 'PREGAO_ELETRONICO', 'CONCORRENCIA', 'DISPENSA_LICITACAO', 'INEXIGIBILIDADE', 'LEILAO', 'DIALOGO_COMPETITIVO'
    criterio_julgamento VARCHAR(50) DEFAULT 'MENOR_PRECO', -- 'MENOR_PRECO', 'MAIOR_DESCONTO', 'MELHOR_TECNICA'
    objeto TEXT NOT NULL,
    orgao_setor VARCHAR(100) NOT NULL DEFAULT 'TRE-RN / STI',
    valor_estimado NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    valor_homologado NUMERIC(15, 2) DEFAULT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'EM_ANDAMENTO', -- 'EM_ANDAMENTO', 'PUBLICADA', 'HOMOLOGADA', 'REVOGADA', 'FRACASSADA', 'DESERTA', 'CONCLUIDA'
    data_abertura DATE,
    data_homologacao DATE,
    pregoeiro_responsavel VARCHAR(120) NOT NULL,
    link_edital VARCHAR(500),
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabela de Itens e Lotes da Licitação
CREATE TABLE IF NOT EXISTS itens_licitacao (
    id SERIAL PRIMARY KEY,
    licitacao_id INTEGER REFERENCES licitacoes(id) ON DELETE CASCADE,
    numero_item INTEGER NOT NULL,
    descricao TEXT NOT NULL,
    unidade_medida VARCHAR(30) NOT NULL DEFAULT 'UN',
    quantidade NUMERIC(12, 2) NOT NULL DEFAULT 1,
    valor_unitario_estimado NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    valor_unitario_homologado NUMERIC(15, 2) DEFAULT NULL,
    fornecedor_vencedor_id INTEGER REFERENCES fornecedores(id) ON DELETE SET NULL,
    status_item VARCHAR(30) DEFAULT 'EM_DISPUTA', -- 'ADJUDICADO', 'CANCELADO', 'FRACASSADO', 'DESERTO', 'EM_DISPUTA'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Tabela de Contratos Decorrentes
CREATE TABLE IF NOT EXISTS contratos (
    id SERIAL PRIMARY KEY,
    numero_contrato VARCHAR(50) NOT NULL UNIQUE,
    licitacao_id INTEGER REFERENCES licitacoes(id) ON DELETE RESTRICT,
    fornecedor_id INTEGER REFERENCES fornecedores(id) ON DELETE RESTRICT,
    objeto_resumo TEXT NOT NULL,
    valor_global NUMERIC(15, 2) NOT NULL,
    data_assinatura DATE NOT NULL,
    data_inicio_vigencia DATE NOT NULL,
    data_fim_vigencia DATE NOT NULL,
    status_contrato VARCHAR(30) DEFAULT 'VIGENTE', -- 'VIGENTE', 'ENCERRADO', 'RESCINDIDO', 'PRORROGADO'
    fiscal_titular VARCHAR(120) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Tabela de Logs de Auditoria Obrigatórios
CREATE TABLE IF NOT EXISTS logs_auditoria (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    usuario_id VARCHAR(50) NOT NULL,
    usuario_nome VARCHAR(120) NOT NULL,
    usuario_email VARCHAR(120) NOT NULL,
    usuario_papel VARCHAR(50) NOT NULL,
    acao VARCHAR(50) NOT NULL, -- 'INSERCAO', 'EDICAO', 'DELECAO', 'CONSULTA_AVANCADA', 'EXPORTACAO', 'LOGIN', 'TESTE_CONEXAO'
    entidade VARCHAR(50) NOT NULL, -- 'licitacoes', 'itens_licitacao', 'fornecedores', 'contratos', 'conexao'
    registro_id VARCHAR(50),
    registro_identificador VARCHAR(255),
    detalhes JSONB NOT NULL,
    ip_origem VARCHAR(50)
);

-- Índices para otimização de consultas e relatórios
CREATE INDEX IF NOT EXISTS idx_licitacoes_ano ON licitacoes(ano);
CREATE INDEX IF NOT EXISTS idx_licitacoes_status ON licitacoes(status);
CREATE INDEX IF NOT EXISTS idx_licitacoes_modalidade ON licitacoes(modalidade);
CREATE INDEX IF NOT EXISTS idx_licitacoes_processo ON licitacoes(numero_processo);
CREATE INDEX IF NOT EXISTS idx_auditoria_timestamp ON logs_auditoria(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_auditoria_usuario ON logs_auditoria(usuario_email);
CREATE INDEX IF NOT EXISTS idx_auditoria_entidade ON logs_auditoria(entidade);

-- =========================================================================
-- CARGA INICIAL DE EXEMPLO (SEMENTES DO SAMS)
-- =========================================================================

INSERT INTO fornecedores (razao_social, nome_fantasia, cnpj_cpf, email, telefone, uf, porte, situacao_cadastral)
VALUES 
('DELTA TECNOLOGIA DA INFORMACAO LTDA', 'Delta Soluções Cloud', '12.345.678/0001-90', 'comercial@deltati.com.br', '(84) 3211-9800', 'RN', 'DEMAIS', 'ATIVO'),
('POTIGUAR SERVICOS E TERCEIRIZACAO EIRELI', 'Potiguar Facilities', '98.765.432/0001-11', 'licitacoes@potiguarservicos.com.br', '(84) 3344-5566', 'RN', 'ME/EPP', 'ATIVO'),
('BRASIL SEGURANCA PRIVADA S/A', 'Brasil Seg', '45.123.890/0001-33', 'contratos@brasilseg.com.br', '(84) 3200-1122', 'RN', 'DEMAIS', 'ATIVO'),
('INOVAR PAPELARIA E SUPRIMENTOS LTDA', 'Inovar Suprimentos', '33.222.111/0001-44', 'vendas@inovar.com.br', '(84) 3612-4000', 'RN', 'ME/EPP', 'ATIVO')
ON CONFLICT (cnpj_cpf) DO NOTHING;

INSERT INTO licitacoes (numero_processo, numero_licitacao, ano, modalidade, criterio_julgamento, objeto, orgao_setor, valor_estimado, valor_homologado, status, data_abertura, data_homologacao, pregoeiro_responsavel, link_edital, observacoes)
VALUES
('0001425/2026', 'PE 04/2026', 2026, 'PREGAO_ELETRONICO', 'MENOR_PRECO', 'Contratação de serviços continuados de suporte técnico e sustentação de infraestrutura de nuvem híbrida para os sistemas eleitorais.', 'TRE-RN / STI', 1850000.00, 1620000.00, 'HOMOLOGADA', '2026-02-15', '2026-03-02', 'Flávio Seabra', 'https://www.tre-rn.jus.br/transparencia/licitacoes/edital-pe-04-2026', 'Economia de R$ 230.000,00 obtida na fase de lances.'),
('0001510/2026', 'PE 07/2026', 2026, 'PREGAO_ELETRONICO', 'MENOR_PRECO', 'Aquisição de estações de trabalho de alto desempenho e monitores para as Zonas Eleitorais do interior do Rio Grande do Norte.', 'TRE-RN / STI', 920000.00, 845000.00, 'HOMOLOGADA', '2026-03-10', '2026-03-24', 'Flávio Seabra', 'https://www.tre-rn.jus.br/transparencia/licitacoes/edital-pe-07-2026', 'Homologação realizada conforme ata de sessão.'),
('0001680/2026', 'PE 11/2026', 2026, 'PREGAO_ELETRONICO', 'MENOR_PRECO', 'Prestação de serviços terceirizados de recepção, copa e apoio administrativo para a sede e fóruns eleitorais.', 'TRE-RN / SAO', 2400000.00, NULL, 'EM_ANDAMENTO', '2026-04-18', NULL, 'Mariana Costa', 'https://www.tre-rn.jus.br/transparencia/licitacoes/edital-pe-11-2026', 'Fase recursal de habilitação técnica em andamento.'),
('0000940/2026', 'DL 12/2026', 2026, 'DISPENSA_LICITACAO', 'MENOR_PRECO', 'Aquisição emergencial de suprimentos e toners originais para atendimento às eleições suplementares municipais.', 'TRE-RN / SAO', 48500.00, 44200.00, 'CONCLUIDA', '2026-01-20', '2026-01-25', 'Carlos Eduardo', 'https://www.tre-rn.jus.br/transparencia/licitacoes/dispensa-12-2026', 'Art. 75, inciso II da Lei 14.133/2021.'),
('0001890/2026', 'CC 02/2026', 2026, 'CONCORRENCIA', 'MENOR_PRECO', 'Reforma da cobertura termoacústica e modernização da acessibilidade do Fórum Eleitoral de Mossoró/RN.', 'TRE-RN / SAO', 780000.00, NULL, 'PUBLICADA', '2026-05-02', NULL, 'Flávio Seabra', 'https://www.tre-rn.jus.br/transparencia/licitacoes/edital-cc-02-2026', 'Prazo para envio de propostas aberto no PNCP.'),
('0000450/2025', 'PE 28/2025', 2025, 'PREGAO_ELETRONICO', 'MENOR_PRECO', 'Serviço de vigilância armada e monitoramento eletrônico 24h para os cartórios eleitorais.', 'TRE-RN / SAO', 3150000.00, 2980000.00, 'CONCLUIDA', '2025-08-10', '2025-08-28', 'Mariana Costa', 'https://www.tre-rn.jus.br/transparencia/licitacoes/pe-28-2025', 'Contrato assinado CT 34/2025.')
ON CONFLICT (numero_licitacao) DO NOTHING;

-- Registro de Auditoria Inicial
INSERT INTO logs_auditoria (usuario_id, usuario_nome, usuario_email, usuario_papel, acao, entidade, registro_id, registro_identificador, detalhes, ip_origem)
VALUES (
    'usr-1',
    'Flávio Seabra',
    'flavio.seabra@tre-rn.jus.br',
    'GESTOR_LICITACOES',
    'LOGIN',
    'sistema',
    'SAMS-INIT',
    'Sistema Inicializado',
    '{"mensagem": "Esquema de banco de dados licitacoes_sams criado e sincronizado com sucesso."}'::jsonb,
    '127.0.0.1'
);
