--
-- NOTE:
--
-- File paths need to be edited. Search for $$PATH$$ and
-- replace it with the path to the directory containing
-- the extracted data files.
--
--
-- PostgreSQL database dump
--

-- Dumped from database version 12.7
-- Dumped by pg_dump version 12.7

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

DROP DATABASE licitacoes_sams;
--
-- Name: licitacoes_sams; Type: DATABASE; Schema: -; Owner: postgres
--

CREATE DATABASE licitacoes_sams WITH TEMPLATE = template0 ENCODING = 'UTF8' LC_COLLATE = 'Portuguese_Brazil.1252' LC_CTYPE = 'Portuguese_Brazil.1252';


ALTER DATABASE licitacoes_sams OWNER TO postgres;

\connect licitacoes_sams

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: arquivar_processo(character varying); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.arquivar_processo(p_num_proc_selecao character varying) RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_id_processo INT;
    v_ano_processo VARCHAR(4);
    v_objeto TEXT;
    v_status_atual INT;
    v_status_nome VARCHAR(150);
    v_mensagem TEXT;
BEGIN
    -- 1. Validar parâmetro
    IF p_num_proc_selecao IS NULL OR p_num_proc_selecao = '' THEN
        RAISE EXCEPTION 'Número do processo de seleção não pode ser vazio.';
    END IF;
    
    -- 2. Buscar o ID do processo e outras informações
    SELECT id_processo, ano_processo, objeto
    INTO v_id_processo, v_ano_processo, v_objeto
    FROM processo
    WHERE num_proc_selecao = p_num_proc_selecao;
    
    IF v_id_processo IS NULL THEN
        RAISE EXCEPTION 'Processo com número de seleção % não encontrado.', p_num_proc_selecao;
    END IF;
    
    -- 3. Verificar se o processo já foi arquivado
    SELECT id_status_processo INTO v_status_atual
    FROM historico_status_processo
    WHERE id_processo = v_id_processo
    ORDER BY data_status DESC
    LIMIT 1;
    
    IF v_status_atual = 7 THEN
        -- Buscar o nome do status 7
        SELECT nome_status INTO v_status_nome
        FROM status_processo
        WHERE id_status_processo = 7;
        
        RETURN 'AVISO: O processo ' || p_num_proc_selecao || 
               ' já está arquivado. Status atual: ' || COALESCE(v_status_nome, 'ARQUIVADO') ||
               ' | Nenhuma alteração realizada.';
    END IF;
    
    -- 4. Inserir o novo status no histórico (status 7 = ARQUIVADO)
    INSERT INTO historico_status_processo (
        id_processo,
        id_status_processo,
        data_status,
        observacao
    )
    VALUES (
        v_id_processo,
        7,  -- Status ARQUIVADO
        CURRENT_TIMESTAMP,
        'Processo arquivado. Todas as etapas concluídas e documentação finalizada.'
    );
    
    -- 5. Montar mensagem de retorno
    v_mensagem := '✓ Processo ARQUIVADO com sucesso! ' ||
                  'Processo: ' || p_num_proc_selecao ||
                  ' | Ano: ' || v_ano_processo ||
                  ' | Status: 7 - ARQUIVADO' ||
                  ' | Data: ' || TO_CHAR(CURRENT_TIMESTAMP, 'DD/MM/YYYY HH24:MI:SS');
    
    RETURN v_mensagem;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Erro ao arquivar processo: %', SQLERRM;
        RETURN 'Erro: ' || SQLERRM;
END;
$$;


ALTER FUNCTION public.arquivar_processo(p_num_proc_selecao character varying) OWNER TO postgres;

--
-- Name: atualizar_empenho_enviado(character varying); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.atualizar_empenho_enviado(p_numero_empenho character varying) RETURNS text
    LANGUAGE plpgsql
    AS $_$
DECLARE
    v_id_empenho INT;
    v_ano_empenho VARCHAR(4);
    v_valor_empenho NUMERIC(15,2);
    v_fornecedor_nome VARCHAR(255);
    v_status_atual BOOLEAN;
    v_mensagem TEXT;
BEGIN
    -- 1. Validar parâmetro
    IF p_numero_empenho IS NULL OR p_numero_empenho = '' THEN
        RAISE EXCEPTION 'Número do empenho não pode ser vazio.';
    END IF;
    
    -- 2. Buscar o empenho pelo número
    SELECT e.id_empenho, e.ano_empenho, e.valor_empenho, e.enviado, f.nome_fornecedor
    INTO v_id_empenho, v_ano_empenho, v_valor_empenho, v_status_atual, v_fornecedor_nome
    FROM empenho e
    JOIN fornecedor f ON e.id_fornecedor = f.id_fornecedor
    WHERE e.numero_empenho = p_numero_empenho;
    
    IF v_id_empenho IS NULL THEN
        RAISE EXCEPTION 'Empenho nº % não encontrado na base de dados.', p_numero_empenho;
    END IF;
    
    -- 3. Verificar se já foi enviado
    IF v_status_atual = TRUE THEN
        RETURN 'AVISO: O empenho ' || p_numero_empenho || 
               ' já estava marcado como enviado. Nenhuma alteração necessária.' ||
               ' | Fornecedor: ' || v_fornecedor_nome ||
               ' | Ano: ' || v_ano_empenho;
    END IF;
    
    -- 4. Atualizar o campo enviado para TRUE
    UPDATE empenho
    SET enviado = TRUE,
        data_envio = CURRENT_TIMESTAMP
    WHERE id_empenho = v_id_empenho;
    
    -- 5. Montar mensagem de retorno
    v_mensagem := '✓ Empenho MARCADO COMO ENVIADO com sucesso! ' ||
                  'Empenho: ' || p_numero_empenho ||
                  ' | Ano: ' || v_ano_empenho ||
                  ' | Fornecedor: ' || v_fornecedor_nome ||
                  ' | Valor: R$ ' || TO_CHAR(v_valor_empenho, 'FM999,999,999.00') ||
                  ' | Data envio: ' || TO_CHAR(CURRENT_TIMESTAMP, 'DD/MM/YYYY HH24:MI:SS');
    
    RETURN v_mensagem;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Erro ao atualizar empenho: %', SQLERRM;
        RETURN 'Erro: ' || SQLERRM;
END;
$_$;


ALTER FUNCTION public.atualizar_empenho_enviado(p_numero_empenho character varying) OWNER TO postgres;

--
-- Name: atualizar_homologacao_item(character varying, integer, boolean); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.atualizar_homologacao_item(p_num_tr character varying, p_numero_item integer, p_homologado boolean) RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_id_tr INT;
    v_id_tr_produto INT;
    v_id_proposta_item INT;
    v_fornecedor_nome VARCHAR(255);
    v_produto_nome VARCHAR(255);
    v_status_atual BOOLEAN;
    v_mensagem TEXT;
BEGIN
    -- 1. Buscar o ID do Termo de Referência pelo número do TR
    SELECT id_tr INTO v_id_tr
    FROM termo_referencia
    WHERE num_tr = p_num_tr;
    
    IF v_id_tr IS NULL THEN
        RAISE EXCEPTION 'Termo de Referência nº % não encontrado.', p_num_tr;
    END IF;
    
    -- 2. Buscar o ID do tr_produto pelo número do item e ID do TR
    SELECT id_tr_produto INTO v_id_tr_produto
    FROM tr_produto
    WHERE id_tr = v_id_tr AND numero_item = p_numero_item;
    
    IF v_id_tr_produto IS NULL THEN
        RAISE EXCEPTION 'Item % do TR % não encontrado em tr_produto.', p_numero_item, p_num_tr;
    END IF;
    
    -- 3. Buscar informações da proposta_item e do fornecedor
    SELECT 
        pi.id_proposta_item,
        pi.homologado,
        f.nome_fornecedor,
        p.nome_produto
    INTO 
        v_id_proposta_item,
        v_status_atual,
        v_fornecedor_nome,
        v_produto_nome
    FROM proposta_item pi
    JOIN proposta pr ON pi.id_proposta = pr.id_proposta
    JOIN fornecedor f ON pr.id_fornecedor = f.id_fornecedor
    JOIN tr_produto tp ON pi.id_tr_produto = tp.id_tr_produto
    JOIN produto p ON tp.id_produto = p.id_produto
    WHERE pi.id_tr_produto = v_id_tr_produto
    LIMIT 1;
    
    -- 4. Verificar se existe proposta para este item
    IF v_id_proposta_item IS NULL THEN
        RAISE EXCEPTION 'Não existe proposta cadastrada para o item % do TR % (id_tr_produto: %).', 
                        p_numero_item, p_num_tr, v_id_tr_produto;
    END IF;
    
    -- 5. Atualizar o status de homologação
    UPDATE proposta_item
    SET homologado = p_homologado
    WHERE id_tr_produto = v_id_tr_produto;
    
    -- 6. Montar mensagem de retorno
    IF p_homologado = TRUE THEN
        v_mensagem := '✓ ITEM HOMOLOGADO! Produto: ' || v_produto_nome || 
                      ' | Fornecedor: ' || v_fornecedor_nome ||
                      ' | TR: ' || p_num_tr || 
                      ' | Item: ' || p_numero_item;
    ELSE
        v_mensagem := '✗ HOMOLOGAÇÃO REMOVIDA! Produto: ' || v_produto_nome || 
                      ' | Fornecedor: ' || v_fornecedor_nome ||
                      ' | TR: ' || p_num_tr || 
                      ' | Item: ' || p_numero_item;
    END IF;
    
    RETURN v_mensagem;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Erro ao atualizar homologação: %', SQLERRM;
        RETURN 'Erro: ' || SQLERRM;
END;
$$;


ALTER FUNCTION public.atualizar_homologacao_item(p_num_tr character varying, p_numero_item integer, p_homologado boolean) OWNER TO postgres;

--
-- Name: atualizar_processo_pagamento(character varying, character varying); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.atualizar_processo_pagamento(p_numero_empenho character varying, p_num_processo_pagamento character varying) RETURNS text
    LANGUAGE plpgsql
    AS $_$
DECLARE
    v_id_empenho INT;
    v_ano_empenho VARCHAR(4);
    v_valor_empenho NUMERIC(15,2);
    v_fornecedor_nome VARCHAR(255);
    v_mensagem TEXT;
BEGIN
    -- 1. Validar parâmetros
    IF p_numero_empenho IS NULL OR p_numero_empenho = '' THEN
        RAISE EXCEPTION 'Número do empenho não pode ser vazio.';
    END IF;
    
    IF p_num_processo_pagamento IS NULL OR p_num_processo_pagamento = '' THEN
        RAISE EXCEPTION 'Número do processo de pagamento não pode ser vazio.';
    END IF;
    
    -- 2. Buscar o ID do empenho e outras informações
    SELECT id_empenho, ano_empenho, valor_empenho, f.nome_fornecedor
    INTO v_id_empenho, v_ano_empenho, v_valor_empenho, v_fornecedor_nome
    FROM empenho e
    JOIN fornecedor f ON e.id_fornecedor = f.id_fornecedor
    WHERE e.numero_empenho = p_numero_empenho;
    
    IF v_id_empenho IS NULL THEN
        RAISE EXCEPTION 'Empenho nº % não encontrado na base de dados.', p_numero_empenho;
    END IF;
    
    -- 3. Verificar se o empenho já possui processo de pagamento
    IF EXISTS (
        SELECT 1 FROM empenho 
        WHERE id_empenho = v_id_empenho 
        AND num_processo_pagamento IS NOT NULL
    ) THEN
        RAISE EXCEPTION 'Empenho nº % já possui processo de pagamento cadastrado. '
                        'Para alterar, utilize a função atualizar_processo_pagamento_forcado().', 
                        p_numero_empenho;
    END IF;
    
    -- 4. Atualizar o campo num_processo_pagamento
    UPDATE empenho
    SET num_processo_pagamento = p_num_processo_pagamento
    WHERE id_empenho = v_id_empenho;
    
    -- 5. Montar mensagem de retorno
    v_mensagem := '✓ Processo de pagamento atualizado com sucesso! ' ||
                  'Empenho: ' || p_numero_empenho ||
                  ' | Ano: ' || v_ano_empenho ||
                  ' | Fornecedor: ' || v_fornecedor_nome ||
                  ' | Valor: R$ ' || TO_CHAR(v_valor_empenho, 'FM999,999,999.00') ||
                  ' | Processo Pagamento: ' || p_num_processo_pagamento;
    
    RETURN v_mensagem;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Erro ao atualizar processo de pagamento: %', SQLERRM;
        RETURN 'Erro: ' || SQLERRM;
END;
$_$;


ALTER FUNCTION public.atualizar_processo_pagamento(p_numero_empenho character varying, p_num_processo_pagamento character varying) OWNER TO postgres;

--
-- Name: atualizar_valor_estimado(character varying, integer, numeric); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.atualizar_valor_estimado(p_num_tr character varying, p_numero_item integer, p_novo_valor numeric) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_id_tr_produto INT;
BEGIN

    SELECT tp.id_tr_produto INTO v_id_tr_produto
    FROM tr_produto tp
    JOIN termo_referencia tr ON tp.id_tr = tr.id_tr
    WHERE tr.num_tr = p_num_tr
      AND tp.numero_item = p_numero_item;


    IF v_id_tr_produto IS NULL THEN
        RAISE EXCEPTION 'Item % do TR % não foi encontrado em tr_produto.', p_numero_item, p_num_tr;
    END IF;


    UPDATE estimativa_item
    SET valor_estimado_tr_produto = p_novo_valor
    WHERE id_tr_produto = v_id_tr_produto;

END;
$$;


ALTER FUNCTION public.atualizar_valor_estimado(p_num_tr character varying, p_numero_item integer, p_novo_valor numeric) OWNER TO postgres;

--
-- Name: cadastrar_fornecedor_completo(character varying, character varying, character varying, character varying, character varying, character varying, character varying, character, character varying); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.cadastrar_fornecedor_completo(p_nome_fornecedor character varying, p_cnpj character varying, p_email_fornecedor character varying, p_logradouro character varying, p_num_casa character varying, p_bairro character varying, p_cidade character varying, p_estado character, p_num_telefone character varying) RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_id_endereco INT;
    v_id_fornecedor INT;
    v_mensagem TEXT;
BEGIN
    -- 1. Inserir o endereço na tabela endereco
    INSERT INTO endereco (logradouro, num_casa, bairro, cidade, estado)
    VALUES (p_logradouro, p_num_casa, p_bairro, p_cidade, p_estado)
    RETURNING id_endereco INTO v_id_endereco;
    
    -- 2. Inserir o fornecedor na tabela fornecedor com o id_endereco obtido
    INSERT INTO fornecedor (nome_fornecedor, cnpj, email_fornecedor, id_endereco)
    VALUES (p_nome_fornecedor, p_cnpj, p_email_fornecedor, v_id_endereco)
    RETURNING id_fornecedor INTO v_id_fornecedor;
    
    -- 3. Inserir o telefone na tabela telefone_fornecedor com o id_fornecedor obtido
    INSERT INTO telefone_fornecedor (num_telefone, id_fornecedor)
    VALUES (p_num_telefone, v_id_fornecedor);
    
    -- 4. Montar mensagem de retorno
    v_mensagem := '✓ Fornecedor cadastrado com sucesso! ' ||
                  'Nome: ' || p_nome_fornecedor ||
                  ' | CNPJ: ' || p_cnpj ||
                  ' | E-mail: ' || COALESCE(p_email_fornecedor, 'não informado') ||
                  ' | Telefone: ' || p_num_telefone ||
                  ' | Endereço: ' || p_logradouro || ', ' || COALESCE(p_num_casa, 's/n') ||
                  ' | ' || p_bairro || ' | ' || p_cidade || '/' || p_estado;
    
    RETURN v_mensagem;
    
EXCEPTION
    WHEN unique_violation THEN
        -- Tratamento específico para violação de unicidade (CNPJ duplicado)
        RAISE NOTICE 'Erro: CNPJ % já cadastrado no sistema.', p_cnpj;
        RETURN 'Erro: CNPJ ' || p_cnpj || ' já cadastrado no sistema. Operação cancelada.';
    WHEN OTHERS THEN
        RAISE NOTICE 'Erro ao cadastrar fornecedor: %', SQLERRM;
        RETURN 'Erro: ' || SQLERRM;
END;
$$;


ALTER FUNCTION public.cadastrar_fornecedor_completo(p_nome_fornecedor character varying, p_cnpj character varying, p_email_fornecedor character varying, p_logradouro character varying, p_num_casa character varying, p_bairro character varying, p_cidade character varying, p_estado character, p_num_telefone character varying) OWNER TO postgres;

--
-- Name: cadastrar_proposta_por_cnpj_pregao(character varying, character varying); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.cadastrar_proposta_por_cnpj_pregao(p_cnpj character varying, p_num_pregao character varying) RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_id_fornecedor INT;
    v_id_tr INT;
    v_id_proposta INT;
    v_nome_fornecedor VARCHAR(255);
    v_ano_processo VARCHAR(4);
    v_mensagem TEXT;
BEGIN
    -- 1. Validar parâmetros
    IF p_cnpj IS NULL OR p_cnpj = '' THEN
        RAISE EXCEPTION 'CNPJ não pode ser vazio.';
    END IF;
    
    IF p_num_pregao IS NULL OR p_num_pregao = '' THEN
        RAISE EXCEPTION 'Número do pregão não pode ser vazio.';
    END IF;
    
    -- 2. Buscar o ID do fornecedor pelo CNPJ
    SELECT id_fornecedor, nome_fornecedor 
    INTO v_id_fornecedor, v_nome_fornecedor
    FROM fornecedor
    WHERE cnpj = p_cnpj;
    
    IF v_id_fornecedor IS NULL THEN
        RAISE EXCEPTION 'Fornecedor com CNPJ % não encontrado na base de dados.', p_cnpj;
    END IF;
    
    -- 3. Buscar o ID do Termo de Referência (id_tr) pelo número do pregão
    -- O num_pregao está armazenado na tabela processo, que se relaciona com termo_referencia
    SELECT tr.id_tr, p.ano_processo
    INTO v_id_tr, v_ano_processo
    FROM termo_referencia tr
    JOIN processo p ON tr.id_processo = p.id_processo
    WHERE p.num_pregao = p_num_pregao;
    
    IF v_id_tr IS NULL THEN
        RAISE EXCEPTION 'Nenhum Termo de Referência encontrado para o pregão nº %.', p_num_pregao;
    END IF;
    
    -- 4. Verificar se já existe uma proposta deste fornecedor para este TR
    IF EXISTS (
        SELECT 1 FROM proposta 
        WHERE id_fornecedor = v_id_fornecedor AND id_tr = v_id_tr
    ) THEN
        RETURN 'AVISO: Já existe uma proposta cadastrada para o fornecedor ' || 
               v_nome_fornecedor || ' (CNPJ: ' || p_cnpj || ') no pregão ' || p_num_pregao || 
               '. Nenhum novo registro foi inserido.';
    END IF;
    
    -- 5. Inserir a proposta na tabela proposta
    INSERT INTO proposta (id_fornecedor, id_tr, created_at)
    VALUES (v_id_fornecedor, v_id_tr, CURRENT_TIMESTAMP)
    RETURNING id_proposta INTO v_id_proposta;
    
    -- 6. O trigger trg_proposta_historico será acionado automaticamente
    --    inserindo o status 5 (Propostas recebidas) no histórico do processo
    
    -- 7. Montar mensagem de retorno
    v_mensagem := '✓ Proposta cadastrada com sucesso! ' ||
                  'ID da Proposta: ' || v_id_proposta ||
                  ' | Fornecedor: ' || v_nome_fornecedor ||
                  ' | CNPJ: ' || p_cnpj ||
                  ' | Pregão: ' || p_num_pregao ||
                  ' | Ano do Processo: ' || v_ano_processo ||
                  ' | Data: ' || TO_CHAR(CURRENT_TIMESTAMP, 'DD/MM/YYYY HH24:MI:SS');
    
    RETURN v_mensagem;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Erro ao cadastrar proposta: %', SQLERRM;
        RETURN 'Erro: ' || SQLERRM;
END;
$$;


ALTER FUNCTION public.cadastrar_proposta_por_cnpj_pregao(p_cnpj character varying, p_num_pregao character varying) OWNER TO postgres;

--
-- Name: concluir_pagamento_por_empenho(character varying); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.concluir_pagamento_por_empenho(p_numero_empenho character varying) RETURNS text
    LANGUAGE plpgsql
    AS $_$
DECLARE
    v_id_empenho INT;
    v_ano_empenho VARCHAR(4);
    v_valor_empenho NUMERIC(15,2);
    v_fornecedor_nome VARCHAR(255);
    v_pagamento_ja_concluido BOOLEAN;
    v_num_processo_pagamento VARCHAR(20);
    v_mensagem TEXT;
BEGIN
    -- 1. Validar parâmetro
    IF p_numero_empenho IS NULL OR p_numero_empenho = '' THEN
        RAISE EXCEPTION 'Número do empenho não pode ser vazio.';
    END IF;
    
    -- 2. Buscar o empenho pelo número do empenho
    SELECT e.id_empenho, e.ano_empenho, e.valor_empenho, 
           e.pagamento_concluido, e.num_processo_pagamento, f.nome_fornecedor
    INTO v_id_empenho, v_ano_empenho, v_valor_empenho, 
         v_pagamento_ja_concluido, v_num_processo_pagamento, v_fornecedor_nome
    FROM empenho e
    JOIN fornecedor f ON e.id_fornecedor = f.id_fornecedor
    WHERE e.numero_empenho = p_numero_empenho;
    
    IF v_id_empenho IS NULL THEN
        RAISE EXCEPTION 'Empenho nº % não encontrado na base de dados.', p_numero_empenho;
    END IF;
    
    -- 3. Verificar se o empenho tem processo de pagamento associado
    IF v_num_processo_pagamento IS NULL THEN
        RAISE EXCEPTION 'Empenho nº % não possui processo de pagamento associado. '
                        'Use a função atualizar_processo_pagamento() primeiro.', 
                        p_numero_empenho;
    END IF;
    
    -- 4. Verificar se o pagamento já foi concluído
    IF v_pagamento_ja_concluido = TRUE THEN
        RETURN 'AVISO: O pagamento do empenho ' || p_numero_empenho || 
               ' já estava marcado como concluído. Nenhuma alteração necessária.' ||
               ' | Fornecedor: ' || v_fornecedor_nome ||
               ' | Processo: ' || v_num_processo_pagamento;
    END IF;
    
    -- 5. Atualizar o campo pagamento_concluido para TRUE
    UPDATE empenho
    SET pagamento_concluido = TRUE
    WHERE id_empenho = v_id_empenho;
    
    -- 6. Montar mensagem de retorno
    v_mensagem := '✓ Pagamento CONCLUÍDO com sucesso! ' ||
                  'Empenho: ' || p_numero_empenho ||
                  ' | Ano: ' || v_ano_empenho ||
                  ' | Fornecedor: ' || v_fornecedor_nome ||
                  ' | Valor: R$ ' || TO_CHAR(v_valor_empenho, 'FM999,999,999.00') ||
                  ' | Processo Pagamento: ' || v_num_processo_pagamento;
    
    RETURN v_mensagem;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Erro ao concluir pagamento: %', SQLERRM;
        RETURN 'Erro: ' || SQLERRM;
END;
$_$;


ALTER FUNCTION public.concluir_pagamento_por_empenho(p_numero_empenho character varying) OWNER TO postgres;

--
-- Name: fn_empenho_historico_tr(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.fn_empenho_historico_tr() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN

    IF NEW.id_processo IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 
            FROM historico_status_processo 
            WHERE id_processo = NEW.id_processo 
              AND id_status_processo = 6
        ) THEN
            INSERT INTO historico_status_processo (id_processo, id_status_processo, data_status, observacao)
            VALUES (
                NEW.id_processo, 
                6, -- Status: EMPENHOS EMITIDOS
                CURRENT_TIMESTAMP, 
                'Fase de contratação concluída. Empenho(s) emitido(s) para o(s) fornecedor(es) vencedor(es).'
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION public.fn_empenho_historico_tr() OWNER TO postgres;

--
-- Name: fn_gerar_itens_estimativa_tr(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.fn_gerar_itens_estimativa_tr() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    INSERT INTO estimativa_item (id_estimativa, id_tr_produto)
    SELECT 
        NEW.id_estimativa, 
        tp.id_tr_produto  
    FROM tr_produto tp
    WHERE tp.id_tr = NEW.id_tr; 

    RETURN NEW;
END;
$$;


ALTER FUNCTION public.fn_gerar_itens_estimativa_tr() OWNER TO postgres;

--
-- Name: fn_processo_historico_tr(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.fn_processo_historico_tr() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN

    IF (TG_OP = 'INSERT') THEN
        INSERT INTO historico_status_processo (id_processo, id_status_processo, data_status, observacao)
        VALUES (NEW.id_processo, 1, CURRENT_TIMESTAMP, 'Processo criado com DOD protocolado. Fase de ETP e GR em elaboração.');
        RETURN NEW;
    END IF;

    IF (TG_OP = 'UPDATE') AND (NEW.num_etp IS NOT NULL) AND (OLD.num_etp IS NULL OR OLD.num_etp != NEW.num_etp) THEN
        INSERT INTO historico_status_processo (id_processo, id_status_processo, data_status, observacao)
        VALUES (NEW.id_processo, 2, CURRENT_TIMESTAMP, 'ETP e GR enviados. Aguardando avaliação e ajustes da SETEC.');
    END IF;

    IF (TG_OP = 'UPDATE') AND (NEW.num_proc_selecao IS NOT NULL) AND (OLD.num_proc_selecao IS NULL OR OLD.num_proc_selecao != NEW.num_proc_selecao) THEN
        INSERT INTO historico_status_processo (id_processo, id_status_processo, data_status, observacao)
        VALUES (NEW.id_processo, 4, CURRENT_TIMESTAMP, 'Número de seleção gerado. Iniciada a fase de seleção do fornecedor.');
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION public.fn_processo_historico_tr() OWNER TO postgres;

--
-- Name: fn_proposta_historico_tr(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.fn_proposta_historico_tr() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN

    DECLARE
        v_id_processo INT;
    BEGIN
        SELECT tr.id_processo INTO v_id_processo
        FROM termo_referencia tr
        WHERE tr.id_tr = NEW.id_tr
        LIMIT 1;

        IF v_id_processo IS NOT NULL THEN
            IF NOT EXISTS (
                SELECT 1 FROM historico_status_processo 
                WHERE id_processo = v_id_processo AND id_status_processo = 5
            ) THEN
                INSERT INTO historico_status_processo (id_processo, id_status_processo, data_status, observacao)
                VALUES (v_id_processo, 5, CURRENT_TIMESTAMP, 'Propostas comerciais recebidas e inseridas no sistema para análise.');
            END IF;
        END IF;
    END;

    RETURN NEW;
END;
$$;


ALTER FUNCTION public.fn_proposta_historico_tr() OWNER TO postgres;

--
-- Name: fn_termo_referencia_historico_tr(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.fn_termo_referencia_historico_tr() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- REGRA: Quando um TR é criado, o processo evolui para o Status 3 (TR ENVIADO PARA SETEC)
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO historico_status_processo (id_processo, id_status_processo, data_status, observacao)
        VALUES (NEW.id_processo, 3, CURRENT_TIMESTAMP, 'TR criado e enviado. Aguardando avaliação e ajustes da SETEC.');
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.fn_termo_referencia_historico_tr() OWNER TO postgres;

--
-- Name: inserir_empenho(character varying, character varying, character varying, character varying, numeric); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.inserir_empenho(p_numero_empenho character varying, p_ano_empenho character varying, p_num_proc_selecao character varying, p_cnpj character varying, p_valor_empenho numeric) RETURNS text
    LANGUAGE plpgsql
    AS $_$
DECLARE
    v_id_fornecedor INT;
    v_id_processo INT;
    v_id_empenho INT;
    v_mensagem TEXT;
BEGIN
    -- 1. Validar o valor do empenho
    IF p_valor_empenho < 0 THEN
        RAISE EXCEPTION 'Valor do empenho não pode ser negativo. Informado: %', p_valor_empenho;
    END IF;
    
    -- 2. Buscar o ID do fornecedor pelo CNPJ
    SELECT id_fornecedor INTO v_id_fornecedor
    FROM fornecedor
    WHERE cnpj = p_cnpj;
    
    IF v_id_fornecedor IS NULL THEN
        RAISE EXCEPTION 'Fornecedor com CNPJ % não encontrado na base de dados.', p_cnpj;
    END IF;
    
    -- 3. Buscar o ID do processo pelo num_proc_selecao
    SELECT id_processo INTO v_id_processo
    FROM processo
    WHERE num_proc_selecao = p_num_proc_selecao;
    
    IF v_id_processo IS NULL THEN
        RAISE EXCEPTION 'Processo com número de seleção % não encontrado.', p_num_proc_selecao;
    END IF;
    
    -- 4. Verificar se já existe um empenho com este número e ano (evitar duplicidade)
    IF EXISTS (
        SELECT 1 FROM empenho 
        WHERE numero_empenho = p_numero_empenho AND ano_empenho = p_ano_empenho
    ) THEN
        RAISE EXCEPTION 'Já existe um empenho cadastrado com o número % e ano %.', p_numero_empenho, p_ano_empenho;
    END IF;
    
    -- 5. Inserir o empenho
    INSERT INTO empenho (
        numero_empenho,
        ano_empenho,
        id_processo,
        id_fornecedor,
        valor_empenho,
        enviado,
        pagamento_concluido
    )
    VALUES (
        p_numero_empenho,
        p_ano_empenho,
        v_id_processo,
        v_id_fornecedor,
        p_valor_empenho,
        FALSE,  -- enviado padrão é FALSE
        FALSE   -- pagamento_concluido padrão é FALSE
    )
    RETURNING id_empenho INTO v_id_empenho;
    
    -- 6. Retornar mensagem de sucesso
    v_mensagem := 'Empenho inserido com sucesso! ' ||
                  'ID: ' || v_id_empenho || 
                  ', Fornecedor: ' || p_cnpj || 
                  ', Processo: ' || p_num_proc_selecao ||
                  ', Valor: R$ ' || TO_CHAR(p_valor_empenho, 'FM999,999,999.00') ||
                  ', Ano: ' || p_ano_empenho ||
                  ', Número: ' || p_numero_empenho;
    
    RETURN v_mensagem;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Erro ao inserir empenho: %', SQLERRM;
        RETURN 'Erro: ' || SQLERRM;
END;
$_$;


ALTER FUNCTION public.inserir_empenho(p_numero_empenho character varying, p_ano_empenho character varying, p_num_proc_selecao character varying, p_cnpj character varying, p_valor_empenho numeric) OWNER TO postgres;

--
-- Name: inserir_empenho_produto(character varying, character varying, integer, numeric); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.inserir_empenho_produto(p_numero_empenho character varying, p_num_proc_selecao character varying, p_numero_item integer, p_valor_final_unidade_produto numeric) RETURNS text
    LANGUAGE plpgsql
    AS $_$
DECLARE
    v_id_empenho INT;
    v_id_processo INT;
    v_id_tr_produto INT;
    v_id_tr INT;
    v_quantidade_produto INT;
    v_homologado BOOLEAN;
    v_id_proposta INT;
    v_fornecedor_nome VARCHAR(255);
    v_produto_nome VARCHAR(255);
    v_valor_total NUMERIC(15,2);
    v_mensagem TEXT;
BEGIN
    -- 1. Validar valores
    IF p_valor_final_unidade_produto < 0 THEN
        RAISE EXCEPTION 'Valor final por unidade não pode ser negativo. Informado: %', 
                        p_valor_final_unidade_produto;
    END IF;
    
    -- 2. Buscar o ID do processo pelo num_proc_selecao
    SELECT id_processo INTO v_id_processo
    FROM processo
    WHERE num_proc_selecao = p_num_proc_selecao;
    
    IF v_id_processo IS NULL THEN
        RAISE EXCEPTION 'Processo com número de seleção % não encontrado.', p_num_proc_selecao;
    END IF;
    
    -- 3. Buscar o ID do empenho
    SELECT id_empenho INTO v_id_empenho
    FROM empenho
    WHERE numero_empenho = p_numero_empenho AND id_processo = v_id_processo;
    
    IF v_id_empenho IS NULL THEN
        RAISE EXCEPTION 'Empenho nº % não encontrado para o processo % (id_processo: %).', 
                        p_numero_empenho, p_num_proc_selecao, v_id_processo;
    END IF;
    
    -- 4. Buscar o TR e o produto
    SELECT id_tr INTO v_id_tr
    FROM termo_referencia
    WHERE id_processo = v_id_processo
    LIMIT 1;
    
    IF v_id_tr IS NULL THEN
        RAISE EXCEPTION 'Termo de Referência não encontrado para o processo % (id_processo: %).', 
                        p_num_proc_selecao, v_id_processo;
    END IF;
    
    SELECT id_tr_produto, quantidade_produto INTO v_id_tr_produto, v_quantidade_produto
    FROM tr_produto
    WHERE id_tr = v_id_tr AND numero_item = p_numero_item;
    
    IF v_id_tr_produto IS NULL THEN
        RAISE EXCEPTION 'Item % do TR do processo % não encontrado em tr_produto.', 
                        p_numero_item, p_num_proc_selecao;
    END IF;
    
    -- 5. Verificar homologação
    SELECT pi.homologado, pr.id_proposta, f.nome_fornecedor, p.nome_produto
    INTO v_homologado, v_id_proposta, v_fornecedor_nome, v_produto_nome
    FROM proposta_item pi
    JOIN proposta pr ON pi.id_proposta = pr.id_proposta
    JOIN fornecedor f ON pr.id_fornecedor = f.id_fornecedor
    JOIN tr_produto tp ON pi.id_tr_produto = tp.id_tr_produto
    JOIN produto p ON tp.id_produto = p.id_produto
    WHERE pi.id_tr_produto = v_id_tr_produto
    LIMIT 1;
    
    IF v_id_proposta IS NULL THEN
        RAISE EXCEPTION 'Não existe proposta cadastrada para o item % do processo % (id_tr_produto: %).', 
                        p_numero_item, p_num_proc_selecao, v_id_tr_produto;
    END IF;
    
    IF v_homologado IS FALSE OR v_homologado IS NULL THEN
        RAISE EXCEPTION 'O item % (% - Fornecedor: %) NÃO ESTÁ HOMOLOGADO.', 
                        p_numero_item, v_produto_nome, v_fornecedor_nome;
    END IF;
    
    -- 6. Verificar duplicidade
    IF EXISTS (
        SELECT 1 FROM empenho_produto 
        WHERE id_empenho = v_id_empenho AND id_tr_produto = v_id_tr_produto
    ) THEN
        RAISE EXCEPTION 'O item % já foi inserido no empenho nº % do processo %.',
                        p_numero_item, p_numero_empenho, p_num_proc_selecao;
    END IF;
    
    -- 7. Inserir
    INSERT INTO empenho_produto (
        id_empenho,
        id_tr_produto,
        quantidade_produto_emp,
        valor_final_unidade_produto
    )
    VALUES (
        v_id_empenho,
        v_id_tr_produto,
        v_quantidade_produto,
        p_valor_final_unidade_produto
    );
    
    -- 8. Calcular valor total para mensagem
    v_valor_total := v_quantidade_produto * p_valor_final_unidade_produto;
    
    -- 9. Mensagem
    v_mensagem := '✓ Item inserido em empenho_produto com sucesso! ' ||
                  'Empenho: ' || p_numero_empenho ||
                  ' | Processo: ' || p_num_proc_selecao ||
                  ' | Item: ' || p_numero_item ||
                  ' | Produto: ' || v_produto_nome ||
                  ' | Fornecedor: ' || v_fornecedor_nome ||
                  ' | Quantidade: ' || v_quantidade_produto ||
                  ' | Valor unitário: R$ ' || TO_CHAR(p_valor_final_unidade_produto, 'FM999,999,999.00') ||
                  ' | Valor total: R$ ' || TO_CHAR(v_valor_total, 'FM999,999,999.00');
    
    RETURN v_mensagem;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Erro ao inserir empenho_produto: %', SQLERRM;
        RETURN 'Erro: ' || SQLERRM;
END;
$_$;


ALTER FUNCTION public.inserir_empenho_produto(p_numero_empenho character varying, p_num_proc_selecao character varying, p_numero_item integer, p_valor_final_unidade_produto numeric) OWNER TO postgres;

--
-- Name: inserir_estimativa_por_planejamento(character varying, character varying, numeric); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.inserir_estimativa_por_planejamento(p_num_proc_planejamento character varying, p_num_documento character varying, p_valor_estimado_global numeric) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_id_tr INT;
BEGIN
    -- Busca o id_tr (Termo de Referência) associado ao processo de planejamento
    SELECT tr.id_tr INTO v_id_tr
    FROM termo_referencia tr
    JOIN processo p ON tr.id_processo = p.id_processo
    WHERE p.num_proc_planejamento = p_num_proc_planejamento
    LIMIT 1;

    -- Valida se o Termo de Referência foi encontrado
    IF v_id_tr IS NULL THEN
        RAISE EXCEPTION 'Processo de planejamento "%" ou seu Termo de Referência não foi encontrado.', p_num_proc_planejamento;
    END IF;

    -- Realiza a inserção na tabela estimativa
    INSERT INTO estimativa (id_tr, num_documento, valor_estimado_global, data_estimativa)
    VALUES (v_id_tr, p_num_documento, p_valor_estimado_global, CURRENT_DATE);

    RAISE NOTICE 'Estimativa inserida com sucesso para o processo %.', p_num_proc_planejamento;
END;
$$;


ALTER FUNCTION public.inserir_estimativa_por_planejamento(p_num_proc_planejamento character varying, p_num_documento character varying, p_valor_estimado_global numeric) OWNER TO postgres;

--
-- Name: inserir_proposta_item(character varying, character varying, integer, numeric, character varying, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.inserir_proposta_item(p_num_tr character varying, p_cnpj character varying, p_numero_item integer, p_valor_proposto numeric, p_avaliacao character varying DEFAULT 'DÚVIDA'::character varying, p_observacoes text DEFAULT NULL::text) RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_id_fornecedor INT;
    v_id_tr INT;
    v_id_tr_produto INT;
    v_id_proposta INT;
    v_mensagem TEXT;
BEGIN
    -- 1. Buscar o ID do fornecedor pelo CNPJ
    SELECT id_fornecedor INTO v_id_fornecedor
    FROM fornecedor
    WHERE cnpj = p_cnpj;
    
    IF v_id_fornecedor IS NULL THEN
        RAISE EXCEPTION 'Fornecedor com CNPJ % não encontrado.', p_cnpj;
    END IF;
    
    -- 2. Buscar o ID do Termo de Referência pelo número do TR
    SELECT id_tr INTO v_id_tr
    FROM termo_referencia
    WHERE num_tr = p_num_tr;
    
    IF v_id_tr IS NULL THEN
        RAISE EXCEPTION 'Termo de Referência nº % não encontrado.', p_num_tr;
    END IF;
    
    -- 3. Buscar o ID do tr_produto pelo número do item e ID do TR
    SELECT id_tr_produto INTO v_id_tr_produto
    FROM tr_produto
    WHERE id_tr = v_id_tr AND numero_item = p_numero_item;
    
    IF v_id_tr_produto IS NULL THEN
        RAISE EXCEPTION 'Item % do TR % não encontrado em tr_produto.', p_numero_item, p_num_tr;
    END IF;
    
    -- 4. Verificar se já existe uma proposta para este fornecedor e TR
    SELECT id_proposta INTO v_id_proposta
    FROM proposta
    WHERE id_fornecedor = v_id_fornecedor AND id_tr = v_id_tr;
    
    -- 5. Se não existir, criar uma nova proposta
    IF v_id_proposta IS NULL THEN
        INSERT INTO proposta (id_fornecedor, id_tr, created_at)
        VALUES (v_id_fornecedor, v_id_tr, CURRENT_TIMESTAMP)
        RETURNING id_proposta INTO v_id_proposta;
        
        v_mensagem := 'Nova proposta criada para o fornecedor. ';
    ELSE
        v_mensagem := 'Proposta existente localizada. ';
    END IF;
    
    -- 6. Inserir ou atualizar o item na proposta_item
    INSERT INTO proposta_item (
        id_proposta,
        id_tr_produto,
        valor_proposto,
        avaliacao,
        homologado,
        observacoes
    )
    VALUES (
        v_id_proposta,
        v_id_tr_produto,
        p_valor_proposto,
        UPPER(p_avaliacao),
        FALSE,  -- homologado padrão é FALSE
        p_observacoes
    )
    ON CONFLICT (id_proposta, id_tr_produto) 
    DO UPDATE SET
        valor_proposto = EXCLUDED.valor_proposto,
        avaliacao = EXCLUDED.avaliacao,
        observacoes = EXCLUDED.observacoes,
        homologado = FALSE;  -- Reset homologado se o item for reenviado
    
    RETURN v_mensagem || 'Item ' || p_numero_item || ' inserido/atualizado com sucesso na proposta do fornecedor ' || p_cnpj || ' para o TR ' || p_num_tr || '.';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Erro: %', SQLERRM;
        RETURN 'Erro ao inserir proposta: ' || SQLERRM;
END;
$$;


ALTER FUNCTION public.inserir_proposta_item(p_num_tr character varying, p_cnpj character varying, p_numero_item integer, p_valor_proposto numeric, p_avaliacao character varying, p_observacoes text) OWNER TO postgres;

--
-- Name: inserir_tr(character varying, character varying); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.inserir_tr(p_num_tr character varying, p_num_proc_planejamento character varying) RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_id_processo INT;
    v_id_tr INT;
    v_ano_corrente VARCHAR(4);
    v_mensagem TEXT;
BEGIN
    -- 1. Validar parâmetros de entrada
    IF p_num_tr IS NULL OR p_num_tr = '' THEN
        RAISE EXCEPTION 'O número do TR (p_num_tr) não pode ser vazio.';
    END IF;
    
    IF p_num_proc_planejamento IS NULL OR p_num_proc_planejamento = '' THEN
        RAISE EXCEPTION 'O número do processo de planejamento não pode ser vazio.';
    END IF;

    -- 2. Buscar o ID do processo correspondente pelo número de planejamento
    SELECT id_processo INTO v_id_processo
    FROM public.processo
    WHERE num_proc_planejamento = p_num_proc_planejamento;

    IF v_id_processo IS NULL THEN
        RAISE EXCEPTION 'Processo de planejamento "%" não encontrado na base de dados.', p_num_proc_planejamento;
    END IF;

    -- 3. Obter o ano corrente dinamicamente (YYYY)
    v_ano_corrente := TO_CHAR(CURRENT_DATE, 'YYYY');

    -- 4. Inserir o novo Termo de Referência na tabela termo_referencia
    -- Obs: Esta inserção dispara automaticamente a trigger trg_termo_referencia_historico, 
    -- que evolui o status do processo para Status 3 (TR Enviado).
    INSERT INTO public.termo_referencia (ano_tr, num_tr, id_processo)
    VALUES (v_ano_corrente, p_num_tr, v_id_processo)
    RETURNING id_tr INTO v_id_tr;

    -- 5. Montar mensagem de confirmação
    v_mensagem := '✓ Termo de Referência inserido com sucesso! ' ||
                  'ID TR: ' || v_id_tr ||
                  ' | TR: ' || p_num_tr ||
                  ' | Ano: ' || v_ano_corrente ||
                  ' | Processo Planejamento: ' || p_num_proc_planejamento;

    RETURN v_mensagem;

EXCEPTION
    WHEN unique_violation THEN
        RAISE NOTICE 'Erro: Já existe um TR cadastrado com o número % no ano %.', p_num_tr, v_ano_corrente;
        RETURN 'Erro: O TR ' || p_num_tr || ' já está cadastrado para o ano ' || v_ano_corrente || '.';
    WHEN OTHERS THEN
        RAISE NOTICE 'Erro ao inserir Termo de Referência: %', SQLERRM;
        RETURN 'Erro: ' || SQLERRM;
END;
$$;


ALTER FUNCTION public.inserir_tr(p_num_tr character varying, p_num_proc_planejamento character varying) OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: catmat; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.catmat (
    id_catmat integer NOT NULL,
    codigo_catmat character varying(10) NOT NULL,
    descricao_catmat text NOT NULL
);


ALTER TABLE public.catmat OWNER TO postgres;

--
-- Name: catmat_id_catmat_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.catmat_id_catmat_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.catmat_id_catmat_seq OWNER TO postgres;

--
-- Name: catmat_id_catmat_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.catmat_id_catmat_seq OWNED BY public.catmat.id_catmat;


--
-- Name: classe_produto; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.classe_produto (
    id_classe integer NOT NULL,
    nome_classe character varying(50) NOT NULL
);


ALTER TABLE public.classe_produto OWNER TO postgres;

--
-- Name: classe_produto_id_classe_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.classe_produto_id_classe_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.classe_produto_id_classe_seq OWNER TO postgres;

--
-- Name: classe_produto_id_classe_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.classe_produto_id_classe_seq OWNED BY public.classe_produto.id_classe;


--
-- Name: empenho; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.empenho (
    id_empenho integer NOT NULL,
    numero_empenho character varying(20) NOT NULL,
    ano_empenho character varying(4) NOT NULL,
    id_processo integer NOT NULL,
    id_fornecedor integer NOT NULL,
    valor_empenho numeric(15,2),
    enviado boolean DEFAULT false,
    data_envio timestamp without time zone,
    num_processo_pagamento character varying(20),
    pagamento_concluido boolean DEFAULT false,
    CONSTRAINT empenho_valor_empenho_check CHECK ((valor_empenho >= (0)::numeric))
);


ALTER TABLE public.empenho OWNER TO postgres;

--
-- Name: empenho_id_empenho_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.empenho_id_empenho_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.empenho_id_empenho_seq OWNER TO postgres;

--
-- Name: empenho_id_empenho_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.empenho_id_empenho_seq OWNED BY public.empenho.id_empenho;


--
-- Name: empenho_produto; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.empenho_produto (
    id_empenho_produto integer NOT NULL,
    id_empenho integer NOT NULL,
    id_tr_produto integer NOT NULL,
    quantidade_produto_emp integer NOT NULL,
    valor_final_unidade_produto numeric(15,2)
);


ALTER TABLE public.empenho_produto OWNER TO postgres;

--
-- Name: empenho_produto_id_empenho_produto_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.empenho_produto_id_empenho_produto_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.empenho_produto_id_empenho_produto_seq OWNER TO postgres;

--
-- Name: empenho_produto_id_empenho_produto_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.empenho_produto_id_empenho_produto_seq OWNED BY public.empenho_produto.id_empenho_produto;


--
-- Name: endereco; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.endereco (
    id_endereco integer NOT NULL,
    logradouro character varying(255) NOT NULL,
    num_casa character varying(10),
    bairro character varying(30),
    cidade character varying(50) NOT NULL,
    estado character(2) NOT NULL
);


ALTER TABLE public.endereco OWNER TO postgres;

--
-- Name: endereco_id_endereco_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.endereco_id_endereco_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.endereco_id_endereco_seq OWNER TO postgres;

--
-- Name: endereco_id_endereco_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.endereco_id_endereco_seq OWNED BY public.endereco.id_endereco;


--
-- Name: estimativa; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.estimativa (
    id_estimativa integer NOT NULL,
    id_tr integer NOT NULL,
    num_documento character varying(20),
    data_estimativa date DEFAULT CURRENT_DATE,
    valor_estimado_global numeric(15,2),
    CONSTRAINT estimativa_valor_estimado_global_check CHECK ((valor_estimado_global >= (0)::numeric))
);


ALTER TABLE public.estimativa OWNER TO postgres;

--
-- Name: estimativa_id_estimativa_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.estimativa_id_estimativa_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.estimativa_id_estimativa_seq OWNER TO postgres;

--
-- Name: estimativa_id_estimativa_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.estimativa_id_estimativa_seq OWNED BY public.estimativa.id_estimativa;


--
-- Name: estimativa_item; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.estimativa_item (
    id_estimativa_item integer NOT NULL,
    id_estimativa integer NOT NULL,
    id_tr_produto integer NOT NULL,
    valor_estimado_tr_produto numeric(15,2),
    CONSTRAINT estimativa_item_valor_estimado_tr_produto_check CHECK ((valor_estimado_tr_produto >= (0)::numeric))
);


ALTER TABLE public.estimativa_item OWNER TO postgres;

--
-- Name: estimativa_item_id_estimativa_item_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.estimativa_item_id_estimativa_item_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.estimativa_item_id_estimativa_item_seq OWNER TO postgres;

--
-- Name: estimativa_item_id_estimativa_item_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.estimativa_item_id_estimativa_item_seq OWNED BY public.estimativa_item.id_estimativa_item;


--
-- Name: fornecedor; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.fornecedor (
    id_fornecedor integer NOT NULL,
    cnpj character varying(18) NOT NULL,
    nome_fornecedor character varying(255) NOT NULL,
    email_fornecedor character varying(255),
    id_endereco integer
);


ALTER TABLE public.fornecedor OWNER TO postgres;

--
-- Name: fornecedor_id_fornecedor_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.fornecedor_id_fornecedor_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.fornecedor_id_fornecedor_seq OWNER TO postgres;

--
-- Name: fornecedor_id_fornecedor_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.fornecedor_id_fornecedor_seq OWNED BY public.fornecedor.id_fornecedor;


--
-- Name: historico_status_processo; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.historico_status_processo (
    id_historico_status integer NOT NULL,
    id_processo integer NOT NULL,
    id_status_processo integer NOT NULL,
    data_status timestamp without time zone NOT NULL,
    observacao text
);


ALTER TABLE public.historico_status_processo OWNER TO postgres;

--
-- Name: historico_status_processo_id_historico_status_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.historico_status_processo_id_historico_status_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.historico_status_processo_id_historico_status_seq OWNER TO postgres;

--
-- Name: historico_status_processo_id_historico_status_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.historico_status_processo_id_historico_status_seq OWNED BY public.historico_status_processo.id_historico_status;


--
-- Name: lote_classificacao; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.lote_classificacao (
    id_lote integer NOT NULL,
    nome_lote character varying(50) NOT NULL,
    descricao_lote text
);


ALTER TABLE public.lote_classificacao OWNER TO postgres;

--
-- Name: lote_classificacao_id_lote_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.lote_classificacao_id_lote_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.lote_classificacao_id_lote_seq OWNER TO postgres;

--
-- Name: lote_classificacao_id_lote_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.lote_classificacao_id_lote_seq OWNED BY public.lote_classificacao.id_lote;


--
-- Name: marca_referencia; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.marca_referencia (
    id_marca_referencia integer NOT NULL,
    nome_marca_referencia character varying(50) NOT NULL
);


ALTER TABLE public.marca_referencia OWNER TO postgres;

--
-- Name: marca_referencia_id_marca_referencia_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.marca_referencia_id_marca_referencia_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.marca_referencia_id_marca_referencia_seq OWNER TO postgres;

--
-- Name: marca_referencia_id_marca_referencia_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.marca_referencia_id_marca_referencia_seq OWNED BY public.marca_referencia.id_marca_referencia;


--
-- Name: modalidade; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.modalidade (
    id_modalidade integer NOT NULL,
    nome_modalidade character varying(100) NOT NULL
);


ALTER TABLE public.modalidade OWNER TO postgres;

--
-- Name: modalidade_id_modalidade_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.modalidade_id_modalidade_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.modalidade_id_modalidade_seq OWNER TO postgres;

--
-- Name: modalidade_id_modalidade_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.modalidade_id_modalidade_seq OWNED BY public.modalidade.id_modalidade;


--
-- Name: processo; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.processo (
    id_processo integer NOT NULL,
    ano_processo character varying(4) NOT NULL,
    codigo_pca character varying(20),
    num_proc_planejamento character varying(12),
    objeto text NOT NULL,
    valor_pca numeric(15,2) DEFAULT 0.00,
    num_etp character varying(10),
    num_proc_selecao character varying(12),
    num_pregao character varying(20),
    id_modalidade integer DEFAULT 1 NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT processo_valor_pca_check CHECK ((valor_pca >= (0)::numeric))
);


ALTER TABLE public.processo OWNER TO postgres;

--
-- Name: processo_id_processo_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.processo_id_processo_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.processo_id_processo_seq OWNER TO postgres;

--
-- Name: processo_id_processo_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.processo_id_processo_seq OWNED BY public.processo.id_processo;


--
-- Name: produto; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.produto (
    id_produto integer NOT NULL,
    nome_produto character varying(255) NOT NULL,
    descricao_produto text,
    unidade character varying(50),
    id_catmat integer,
    id_classe integer,
    id_lote integer
);


ALTER TABLE public.produto OWNER TO postgres;

--
-- Name: produto_id_produto_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.produto_id_produto_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.produto_id_produto_seq OWNER TO postgres;

--
-- Name: produto_id_produto_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.produto_id_produto_seq OWNED BY public.produto.id_produto;


--
-- Name: produto_marca; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.produto_marca (
    id_produto_marca integer NOT NULL,
    id_produto integer NOT NULL,
    id_marca_referencia integer NOT NULL,
    principal boolean DEFAULT false,
    observacao text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.produto_marca OWNER TO postgres;

--
-- Name: produto_marca_id_produto_marca_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.produto_marca_id_produto_marca_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.produto_marca_id_produto_marca_seq OWNER TO postgres;

--
-- Name: produto_marca_id_produto_marca_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.produto_marca_id_produto_marca_seq OWNED BY public.produto_marca.id_produto_marca;


--
-- Name: proposta; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.proposta (
    id_proposta integer NOT NULL,
    id_fornecedor integer NOT NULL,
    id_tr integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.proposta OWNER TO postgres;

--
-- Name: proposta_id_proposta_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.proposta_id_proposta_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.proposta_id_proposta_seq OWNER TO postgres;

--
-- Name: proposta_id_proposta_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.proposta_id_proposta_seq OWNED BY public.proposta.id_proposta;


--
-- Name: proposta_item; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.proposta_item (
    id_proposta_item integer NOT NULL,
    id_proposta integer NOT NULL,
    id_tr_produto integer NOT NULL,
    valor_proposto numeric(15,2),
    avaliacao character varying(20) DEFAULT 'DÚVIDA'::character varying NOT NULL,
    homologado boolean DEFAULT false,
    observacoes text,
    CONSTRAINT ck_item_avaliacao CHECK (((avaliacao)::text = ANY ((ARRAY['APROVADO'::character varying, 'DÚVIDA'::character varying, 'REPROVADO'::character varying])::text[]))),
    CONSTRAINT proposta_item_valor_proposto_check CHECK ((valor_proposto >= (0)::numeric))
);


ALTER TABLE public.proposta_item OWNER TO postgres;

--
-- Name: proposta_item_id_proposta_item_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.proposta_item_id_proposta_item_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.proposta_item_id_proposta_item_seq OWNER TO postgres;

--
-- Name: proposta_item_id_proposta_item_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.proposta_item_id_proposta_item_seq OWNED BY public.proposta_item.id_proposta_item;


--
-- Name: status_processo; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.status_processo (
    id_status_processo integer NOT NULL,
    nome_status character varying(150) NOT NULL
);


ALTER TABLE public.status_processo OWNER TO postgres;

--
-- Name: status_processo_id_status_processo_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.status_processo_id_status_processo_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.status_processo_id_status_processo_seq OWNER TO postgres;

--
-- Name: status_processo_id_status_processo_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.status_processo_id_status_processo_seq OWNED BY public.status_processo.id_status_processo;


--
-- Name: telefone_fornecedor; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.telefone_fornecedor (
    id_telefone integer NOT NULL,
    num_telefone character varying(20) NOT NULL,
    id_fornecedor integer NOT NULL
);


ALTER TABLE public.telefone_fornecedor OWNER TO postgres;

--
-- Name: telefone_fornecedor_id_telefone_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.telefone_fornecedor_id_telefone_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.telefone_fornecedor_id_telefone_seq OWNER TO postgres;

--
-- Name: telefone_fornecedor_id_telefone_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.telefone_fornecedor_id_telefone_seq OWNED BY public.telefone_fornecedor.id_telefone;


--
-- Name: termo_referencia; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.termo_referencia (
    id_tr integer NOT NULL,
    ano_tr character varying(4) NOT NULL,
    num_tr character varying(12) NOT NULL,
    id_processo integer NOT NULL
);


ALTER TABLE public.termo_referencia OWNER TO postgres;

--
-- Name: termo_referencia_id_tr_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.termo_referencia_id_tr_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.termo_referencia_id_tr_seq OWNER TO postgres;

--
-- Name: termo_referencia_id_tr_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.termo_referencia_id_tr_seq OWNED BY public.termo_referencia.id_tr;


--
-- Name: tr_produto; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tr_produto (
    id_tr_produto integer NOT NULL,
    numero_item integer NOT NULL,
    id_produto integer NOT NULL,
    id_tr integer NOT NULL,
    quantidade_produto integer NOT NULL
);


ALTER TABLE public.tr_produto OWNER TO postgres;

--
-- Name: tr_produto_id_tr_produto_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.tr_produto_id_tr_produto_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.tr_produto_id_tr_produto_seq OWNER TO postgres;

--
-- Name: tr_produto_id_tr_produto_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.tr_produto_id_tr_produto_seq OWNED BY public.tr_produto.id_tr_produto;


--
-- Name: vw_acompanha_processo; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.vw_acompanha_processo AS
 SELECT p.id_processo,
    to_char(p.created_at, 'DD/MM/YYYY'::text) AS data_criacao,
    p.ano_processo,
    p.codigo_pca,
    p.num_proc_planejamento,
    p.objeto,
    p.num_etp,
    p.num_proc_selecao,
    tr.num_tr,
    p.num_pregao,
    st.nome_status,
    to_char(hsp.data_status, 'DD/MM/YYYY'::text) AS status_desde
   FROM (((public.processo p
     LEFT JOIN public.termo_referencia tr ON ((tr.id_processo = p.id_processo)))
     LEFT JOIN public.historico_status_processo hsp ON ((p.id_processo = hsp.id_processo)))
     LEFT JOIN public.status_processo st ON ((hsp.id_status_processo = st.id_status_processo)))
  ORDER BY p.id_processo, hsp.id_status_processo;


ALTER TABLE public.vw_acompanha_processo OWNER TO postgres;

--
-- Name: vw_adequacao_financeira; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.vw_adequacao_financeira AS
 SELECT p.num_proc_selecao AS processo_selecao,
    p.valor_pca AS reservado_pca,
    e.valor_estimado_global AS valor_estimado,
    (p.valor_pca - e.valor_estimado_global) AS diferenca
   FROM ((public.processo p
     JOIN public.termo_referencia tr ON ((p.id_processo = tr.id_processo)))
     JOIN public.estimativa e ON ((tr.id_tr = e.id_tr)));


ALTER TABLE public.vw_adequacao_financeira OWNER TO postgres;

--
-- Name: vw_comparacao_valor_empenho; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.vw_comparacao_valor_empenho AS
 SELECT p.num_proc_selecao AS processo_selecao,
    e.numero_empenho,
    e.ano_empenho,
    f.nome_fornecedor,
    e.valor_empenho AS valor_empenho_manual,
    COALESCE(sum(((ep.quantidade_produto_emp)::numeric * ep.valor_final_unidade_produto)), (0)::numeric) AS soma_itens_empenhados,
        CASE
            WHEN (e.valor_empenho = COALESCE(sum(((ep.quantidade_produto_emp)::numeric * ep.valor_final_unidade_produto)), (0)::numeric)) THEN '✅ CONCILIENTE'::text
            WHEN (COALESCE(sum(((ep.quantidade_produto_emp)::numeric * ep.valor_final_unidade_produto)), (0)::numeric) = (0)::numeric) THEN '⚠️ SEM ITENS'::text
            ELSE '❌ DIVERGENTE'::text
        END AS status,
    round(abs((e.valor_empenho - COALESCE(sum(((ep.quantidade_produto_emp)::numeric * ep.valor_final_unidade_produto)), (0)::numeric))), 2) AS diferenca_abs,
    round(
        CASE
            WHEN (e.valor_empenho > (0)::numeric) THEN (((e.valor_empenho - COALESCE(sum(((ep.quantidade_produto_emp)::numeric * ep.valor_final_unidade_produto)), (0)::numeric)) / e.valor_empenho) * (100)::numeric)
            ELSE (0)::numeric
        END, 2) AS percentual_diferenca
   FROM (((public.empenho e
     JOIN public.processo p ON ((e.id_processo = p.id_processo)))
     JOIN public.fornecedor f ON ((e.id_fornecedor = f.id_fornecedor)))
     LEFT JOIN public.empenho_produto ep ON ((e.id_empenho = ep.id_empenho)))
  GROUP BY p.num_proc_selecao, e.numero_empenho, e.ano_empenho, f.nome_fornecedor, e.valor_empenho
  ORDER BY p.num_proc_selecao, e.numero_empenho;


ALTER TABLE public.vw_comparacao_valor_empenho OWNER TO postgres;

--
-- Name: vw_cria_lista_de_compras_lotes; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.vw_cria_lista_de_compras_lotes AS
 SELECT l.id_lote AS "Lote",
    c.codigo_catmat AS "CATMAT",
    (((p.nome_produto)::text || '. '::text) || p.descricao_produto) AS "Especificações",
    p.unidade AS "Unidade",
    (string_agg((m.nome_marca_referencia)::text, ', '::text ORDER BY pm.principal DESC) || ' ou similar'::text) AS "Marcas Referência",
    cp.nome_classe
   FROM (((((public.catmat c
     JOIN public.produto p ON ((p.id_catmat = c.id_catmat)))
     LEFT JOIN public.lote_classificacao l ON ((p.id_lote = l.id_lote)))
     LEFT JOIN public.produto_marca pm ON ((p.id_produto = pm.id_produto)))
     LEFT JOIN public.marca_referencia m ON ((pm.id_marca_referencia = m.id_marca_referencia)))
     JOIN public.classe_produto cp ON ((cp.id_classe = p.id_classe)))
  WHERE (((cp.nome_classe)::text ~~* '%hospit%'::text) OR ((cp.nome_classe)::text ~~* '%odont%'::text) OR ((cp.nome_classe)::text ~~* '%outr%'::text))
  GROUP BY c.codigo_catmat, p.nome_produto, p.descricao_produto, p.unidade, l.id_lote, cp.nome_classe
  ORDER BY l.id_lote, p.nome_produto;


ALTER TABLE public.vw_cria_lista_de_compras_lotes OWNER TO postgres;

--
-- Name: vw_detalha_itens_tr; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.vw_detalha_itens_tr AS
 SELECT pr.num_proc_planejamento AS processo_planejamento,
    pr.objeto,
    tr.num_tr AS "TR",
    tp.numero_item AS "Item",
    c.codigo_catmat AS "CATMAT",
    (((p.nome_produto)::text || '. '::text) || p.descricao_produto) AS "Especificações",
    tp.quantidade_produto AS "Qtde"
   FROM ((((public.catmat c
     JOIN public.produto p ON ((p.id_catmat = c.id_catmat)))
     JOIN public.tr_produto tp ON ((tp.id_produto = p.id_produto)))
     JOIN public.termo_referencia tr ON ((tr.id_tr = tp.id_tr)))
     JOIN public.processo pr ON ((tr.id_processo = pr.id_processo)))
  ORDER BY pr.num_proc_planejamento, tr.num_tr, tp.numero_item;


ALTER TABLE public.vw_detalha_itens_tr OWNER TO postgres;

--
-- Name: vw_detalhe_empenho_produtos; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.vw_detalhe_empenho_produtos AS
 SELECT e.numero_empenho,
    p.num_proc_selecao,
    ('R$ '::text || to_char(e.valor_empenho, 'FM999G999G999D99'::text)) AS valor_total_empenhado,
    to_char(e.data_envio, 'DD/MM/YYYY'::text) AS data_envio,
    e.num_processo_pagamento,
    f.nome_fornecedor,
    prod.nome_produto,
    ep.quantidade_produto_emp AS quantidade_produto,
    ('R$ '::text || to_char(ep.valor_final_unidade_produto, 'FM999G999G999D99'::text)) AS valor_unitario_produto,
    ('R$ '::text || to_char(((ep.quantidade_produto_emp)::numeric * ep.valor_final_unidade_produto), 'FM999G999G999D99'::text)) AS valor_total_item
   FROM (((((public.empenho e
     JOIN public.processo p ON ((e.id_processo = p.id_processo)))
     JOIN public.fornecedor f ON ((e.id_fornecedor = f.id_fornecedor)))
     JOIN public.empenho_produto ep ON ((e.id_empenho = ep.id_empenho)))
     JOIN public.tr_produto tp ON ((ep.id_tr_produto = tp.id_tr_produto)))
     JOIN public.produto prod ON ((tp.id_produto = prod.id_produto)))
  ORDER BY e.numero_empenho;


ALTER TABLE public.vw_detalhe_empenho_produtos OWNER TO postgres;

--
-- Name: vw_empenho_produto_calculado; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.vw_empenho_produto_calculado AS
 SELECT empenho_produto.id_empenho_produto,
    empenho_produto.id_empenho,
    empenho_produto.id_tr_produto,
    empenho_produto.quantidade_produto_emp,
    empenho_produto.valor_final_unidade_produto,
    ((empenho_produto.quantidade_produto_emp)::numeric * empenho_produto.valor_final_unidade_produto) AS valor_total_calculado
   FROM public.empenho_produto;


ALTER TABLE public.vw_empenho_produto_calculado OWNER TO postgres;

--
-- Name: vw_empenhos_enviados_por_processo; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.vw_empenhos_enviados_por_processo AS
 SELECT p.num_proc_selecao AS processo_selecao,
    e.numero_empenho,
    f.nome_fornecedor,
    e.enviado,
    e.data_envio,
        CASE
            WHEN (e.enviado = true) THEN '✅ ENVIADO'::text
            WHEN ((e.enviado = false) AND (e.id_empenho IS NOT NULL)) THEN '⏳ PENDENTE'::text
            ELSE '🚫 SEM EMPENHO'::text
        END AS status_envio,
    to_char(e.data_envio, 'DD/MM/YYYY HH24:MI'::text) AS data_envio_formatada,
    e.pagamento_concluido,
        CASE
            WHEN (e.pagamento_concluido = true) THEN '✅ PAGO'::text
            WHEN ((e.pagamento_concluido = false) AND (e.id_empenho IS NOT NULL)) THEN '⏳ AGUARDANDO PAGAMENTO'::text
            ELSE 'N/A'::text
        END AS status_pagamento
   FROM ((public.processo p
     LEFT JOIN public.empenho e ON ((p.id_processo = e.id_processo)))
     LEFT JOIN public.fornecedor f ON ((e.id_fornecedor = f.id_fornecedor)))
  ORDER BY p.num_proc_selecao, e.numero_empenho;


ALTER TABLE public.vw_empenhos_enviados_por_processo OWNER TO postgres;

--
-- Name: vw_estimativa_valores_produtos; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.vw_estimativa_valores_produtos AS
 SELECT pr.num_proc_selecao AS processo,
    trp.numero_item AS item,
    p.nome_produto AS produto,
    ei.valor_estimado_tr_produto AS valor_estimado_unidade,
    trp.quantidade_produto AS quantidade,
    (ei.valor_estimado_tr_produto * (trp.quantidade_produto)::numeric) AS valor_estimado_produto
   FROM ((((public.processo pr
     JOIN public.termo_referencia tr ON ((tr.id_processo = pr.id_processo)))
     JOIN public.tr_produto trp ON ((tr.id_tr = trp.id_tr)))
     JOIN public.produto p ON ((p.id_produto = trp.id_produto)))
     JOIN public.estimativa_item ei ON ((trp.id_tr_produto = ei.id_tr_produto)))
  ORDER BY pr.num_proc_selecao, trp.numero_item;


ALTER TABLE public.vw_estimativa_valores_produtos OWNER TO postgres;

--
-- Name: vw_estimativa_valores_produtos2; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.vw_estimativa_valores_produtos2 AS
 SELECT pr.num_proc_planejamento,
    pr.num_proc_selecao,
    trp.numero_item,
    p.nome_produto,
    ei.valor_estimado_tr_produto AS valor_estimado_unidade,
    trp.quantidade_produto AS quantidade,
    (ei.valor_estimado_tr_produto * (trp.quantidade_produto)::numeric) AS valor_estimado_produto
   FROM ((((public.processo pr
     JOIN public.termo_referencia tr ON ((tr.id_processo = pr.id_processo)))
     JOIN public.tr_produto trp ON ((tr.id_tr = trp.id_tr)))
     JOIN public.produto p ON ((p.id_produto = trp.id_produto)))
     JOIN public.estimativa_item ei ON ((trp.id_tr_produto = ei.id_tr_produto)))
  ORDER BY pr.num_proc_selecao, trp.numero_item;


ALTER TABLE public.vw_estimativa_valores_produtos2 OWNER TO postgres;

--
-- Name: vw_fornecedores; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.vw_fornecedores AS
 SELECT f.nome_fornecedor,
    f.email_fornecedor,
    t.num_telefone,
    e.cidade,
    e.estado,
    f.cnpj
   FROM ((public.fornecedor f
     LEFT JOIN public.telefone_fornecedor t ON ((f.id_fornecedor = t.id_fornecedor)))
     LEFT JOIN public.endereco e ON ((f.id_endereco = e.id_endereco)))
  ORDER BY f.nome_fornecedor;


ALTER TABLE public.vw_fornecedores OWNER TO postgres;

--
-- Name: vw_homologado_fornecedor; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.vw_homologado_fornecedor AS
 SELECT pr.num_proc_selecao,
    f.nome_fornecedor,
    tp.numero_item AS item,
    p.nome_produto,
    tp.quantidade_produto,
    pi.valor_proposto AS valor_unit,
    ((tp.quantidade_produto)::numeric * pi.valor_proposto) AS valor_total
   FROM ((((((public.produto p
     JOIN public.tr_produto tp ON ((tp.id_produto = p.id_produto)))
     JOIN public.proposta_item pi ON ((tp.id_tr_produto = pi.id_tr_produto)))
     JOIN public.proposta pro ON ((pi.id_proposta = pro.id_proposta)))
     JOIN public.fornecedor f ON ((pro.id_fornecedor = f.id_fornecedor)))
     JOIN public.termo_referencia tr ON ((pro.id_tr = tr.id_tr)))
     JOIN public.processo pr ON ((tr.id_processo = pr.id_processo)))
  WHERE (pi.homologado = true)
  ORDER BY pr.num_proc_selecao, f.nome_fornecedor, tp.numero_item;


ALTER TABLE public.vw_homologado_fornecedor OWNER TO postgres;

--
-- Name: vw_homologados; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.vw_homologados AS
 SELECT tp.numero_item,
    p.nome_produto,
    f.nome_fornecedor,
    pi.homologado,
    pi.valor_proposto,
    pi.avaliacao
   FROM (((((public.proposta_item pi
     JOIN public.proposta pr ON ((pi.id_proposta = pr.id_proposta)))
     JOIN public.fornecedor f ON ((pr.id_fornecedor = f.id_fornecedor)))
     JOIN public.tr_produto tp ON ((pi.id_tr_produto = tp.id_tr_produto)))
     JOIN public.produto p ON ((tp.id_produto = p.id_produto)))
     JOIN public.termo_referencia tr ON ((tp.id_tr = tr.id_tr)))
  ORDER BY tp.numero_item;


ALTER TABLE public.vw_homologados OWNER TO postgres;

--
-- Name: vw_homologados_processo; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.vw_homologados_processo AS
 SELECT pro.num_proc_selecao,
    tp.numero_item,
    p.nome_produto,
    f.nome_fornecedor,
    pi.valor_proposto,
    pi.avaliacao
   FROM ((((((public.proposta_item pi
     JOIN public.proposta pr ON ((pi.id_proposta = pr.id_proposta)))
     JOIN public.fornecedor f ON ((pr.id_fornecedor = f.id_fornecedor)))
     JOIN public.tr_produto tp ON ((pi.id_tr_produto = tp.id_tr_produto)))
     JOIN public.produto p ON ((tp.id_produto = p.id_produto)))
     JOIN public.termo_referencia tr ON ((tp.id_tr = tr.id_tr)))
     JOIN public.processo pro ON ((tr.id_processo = pro.id_processo)))
  ORDER BY pro.num_proc_selecao, tp.numero_item;


ALTER TABLE public.vw_homologados_processo OWNER TO postgres;

--
-- Name: vw_itens_processo; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.vw_itens_processo AS
 SELECT pr.num_proc_selecao,
    pr.objeto,
    tr.num_tr,
    tp.numero_item,
    (((p.nome_produto)::text || '. '::text) || p.descricao_produto) AS "Especificações",
    tp.quantidade_produto AS "Qtde"
   FROM ((((public.catmat c
     JOIN public.produto p ON ((p.id_catmat = c.id_catmat)))
     JOIN public.tr_produto tp ON ((tp.id_produto = p.id_produto)))
     JOIN public.termo_referencia tr ON ((tr.id_tr = tp.id_tr)))
     JOIN public.processo pr ON ((tr.id_processo = pr.id_processo)))
  ORDER BY pr.num_proc_planejamento, tr.num_tr, tp.numero_item;


ALTER TABLE public.vw_itens_processo OWNER TO postgres;

--
-- Name: vw_itens_sem_proposta; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.vw_itens_sem_proposta AS
 SELECT DISTINCT pr.num_proc_selecao,
    tp.numero_item,
    p.nome_produto,
    tp.quantidade_produto,
    COALESCE(ei.valor_estimado_tr_produto, (0)::numeric) AS valor_estimado_unitario
   FROM (((((((public.processo proc
     JOIN public.termo_referencia tr ON ((tr.id_processo = proc.id_processo)))
     JOIN public.processo pr ON ((pr.id_processo = tr.id_processo)))
     JOIN public.tr_produto tp ON ((tr.id_tr = tp.id_tr)))
     JOIN public.produto p ON ((p.id_produto = tp.id_produto)))
     LEFT JOIN public.proposta_item pi ON ((pi.id_tr_produto = tp.id_tr_produto)))
     LEFT JOIN ( SELECT DISTINCT ON (estimativa.id_tr) estimativa.id_tr,
            estimativa.id_estimativa,
            estimativa.data_estimativa
           FROM public.estimativa
          ORDER BY estimativa.id_tr, estimativa.data_estimativa DESC) e ON ((e.id_tr = tr.id_tr)))
     LEFT JOIN public.estimativa_item ei ON (((ei.id_estimativa = e.id_estimativa) AND (ei.id_tr_produto = tp.id_tr_produto))))
  WHERE (pi.id_proposta_item IS NULL)
  ORDER BY pr.num_proc_selecao;


ALTER TABLE public.vw_itens_sem_proposta OWNER TO postgres;

--
-- Name: vw_lista_de_compras_lotes_medicamentos; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.vw_lista_de_compras_lotes_medicamentos AS
 SELECT l.id_lote AS "Lote",
    c.codigo_catmat AS "CATMAT",
    p.descricao_produto AS "Especificações",
    p.unidade AS "Unidade",
    cp.nome_classe
   FROM (((public.catmat c
     JOIN public.produto p ON ((p.id_catmat = c.id_catmat)))
     LEFT JOIN public.lote_classificacao l ON ((p.id_lote = l.id_lote)))
     JOIN public.classe_produto cp ON ((cp.id_classe = p.id_classe)))
  WHERE ((cp.nome_classe)::text ~~* '%medic%'::text)
  GROUP BY c.codigo_catmat, p.nome_produto, p.descricao_produto, p.unidade, l.id_lote, cp.nome_classe
  ORDER BY l.id_lote, p.nome_produto;


ALTER TABLE public.vw_lista_de_compras_lotes_medicamentos OWNER TO postgres;

--
-- Name: vw_lista_de_compras_lotes_odo_hosp; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.vw_lista_de_compras_lotes_odo_hosp AS
 SELECT l.id_lote AS "Lote",
    c.codigo_catmat AS "CATMAT",
    (((p.nome_produto)::text || '. '::text) || p.descricao_produto) AS "Especificações",
    p.unidade AS "Unidade",
    (string_agg(DISTINCT (m.nome_marca_referencia)::text, ', '::text ORDER BY (m.nome_marca_referencia)::text) || ' ou similar'::text) AS "Marcas Referência",
    cp.nome_classe,
    to_char(COALESCE(( SELECT avg(ei.valor_estimado_tr_produto) AS avg
           FROM ((public.tr_produto tp
             JOIN public.estimativa_item ei ON ((ei.id_tr_produto = tp.id_tr_produto)))
             JOIN public.estimativa est ON ((est.id_estimativa = ei.id_estimativa)))
          WHERE ((tp.id_produto = p.id_produto) AND (date_part('year'::text, est.data_estimativa) = date_part('year'::text, CURRENT_DATE)))), 0.00), '"R$ "FM999G999G990D00'::text) AS "Valor Estimado Ano Atual",
    to_char(COALESCE(( SELECT avg(ei.valor_estimado_tr_produto) AS avg
           FROM ((public.tr_produto tp
             JOIN public.estimativa_item ei ON ((ei.id_tr_produto = tp.id_tr_produto)))
             JOIN public.estimativa est ON ((est.id_estimativa = ei.id_estimativa)))
          WHERE ((tp.id_produto = p.id_produto) AND (date_part('year'::text, est.data_estimativa) = (date_part('year'::text, CURRENT_DATE) - (1)::double precision)))), 0.00), '"R$ "FM999G999G990D00'::text) AS "Valor Estimado Ano Anterior",
    to_char(COALESCE(( SELECT avg(ep.valor_final_unidade_produto) AS avg
           FROM ((public.tr_produto tp
             JOIN public.empenho_produto ep ON ((ep.id_tr_produto = tp.id_tr_produto)))
             JOIN public.empenho emp ON ((emp.id_empenho = ep.id_empenho)))
          WHERE ((tp.id_produto = p.id_produto) AND ((emp.ano_empenho)::text = to_char((CURRENT_DATE)::timestamp with time zone, 'YYYY'::text)))), 0.00), '"R$ "FM999G999G990D00'::text) AS "Valor Empenho Ano Atual",
    COALESCE(( SELECT string_agg(DISTINCT (proc.num_proc_selecao)::text, ', '::text) AS string_agg
           FROM (((public.tr_produto tp
             JOIN public.empenho_produto ep ON ((ep.id_tr_produto = tp.id_tr_produto)))
             JOIN public.empenho emp ON ((emp.id_empenho = ep.id_empenho)))
             JOIN public.processo proc ON ((proc.id_processo = emp.id_processo)))
          WHERE ((tp.id_produto = p.id_produto) AND ((emp.ano_empenho)::text = to_char((CURRENT_DATE)::timestamp with time zone, 'YYYY'::text)) AND (proc.num_proc_selecao IS NOT NULL))), 'Não associado'::text) AS "Proc. Seleção Empenho Ano Atual",
    COALESCE(( SELECT string_agg(DISTINCT (emp.numero_empenho)::text, ', '::text) AS string_agg
           FROM ((public.tr_produto tp
             JOIN public.empenho_produto ep ON ((ep.id_tr_produto = tp.id_tr_produto)))
             JOIN public.empenho emp ON ((emp.id_empenho = ep.id_empenho)))
          WHERE ((tp.id_produto = p.id_produto) AND ((emp.ano_empenho)::text = to_char((CURRENT_DATE)::timestamp with time zone, 'YYYY'::text)) AND (emp.numero_empenho IS NOT NULL))), 'Não associado'::text) AS "Num. Empenho Ano Atual",
    to_char(COALESCE(( SELECT avg(ep.valor_final_unidade_produto) AS avg
           FROM ((public.tr_produto tp
             JOIN public.empenho_produto ep ON ((ep.id_tr_produto = tp.id_tr_produto)))
             JOIN public.empenho emp ON ((emp.id_empenho = ep.id_empenho)))
          WHERE ((tp.id_produto = p.id_produto) AND ((emp.ano_empenho)::text = to_char((date_part('year'::text, CURRENT_DATE) - (1)::double precision), 'FM9999'::text)))), 0.00), '"R$ "FM999G999G990D00'::text) AS "Valor Empenho Ano Anterior",
    COALESCE(( SELECT string_agg(DISTINCT (proc.num_proc_selecao)::text, ', '::text) AS string_agg
           FROM (((public.tr_produto tp
             JOIN public.empenho_produto ep ON ((ep.id_tr_produto = tp.id_tr_produto)))
             JOIN public.empenho emp ON ((emp.id_empenho = ep.id_empenho)))
             JOIN public.processo proc ON ((proc.id_processo = emp.id_processo)))
          WHERE ((tp.id_produto = p.id_produto) AND ((emp.ano_empenho)::text = to_char((date_part('year'::text, CURRENT_DATE) - (1)::double precision), 'FM9999'::text)) AND (proc.num_proc_selecao IS NOT NULL))), 'Não associado'::text) AS "Proc. Seleção Empenho Ano Anterior",
    COALESCE(( SELECT string_agg(DISTINCT (emp.numero_empenho)::text, ', '::text) AS string_agg
           FROM ((public.tr_produto tp
             JOIN public.empenho_produto ep ON ((ep.id_tr_produto = tp.id_tr_produto)))
             JOIN public.empenho emp ON ((emp.id_empenho = ep.id_empenho)))
          WHERE ((tp.id_produto = p.id_produto) AND ((emp.ano_empenho)::text = to_char((date_part('year'::text, CURRENT_DATE) - (1)::double precision), 'FM9999'::text)) AND (emp.numero_empenho IS NOT NULL))), 'Não associado'::text) AS "Num. Empenho Ano Anterior"
   FROM (((((public.catmat c
     JOIN public.produto p ON ((p.id_catmat = c.id_catmat)))
     LEFT JOIN public.lote_classificacao l ON ((p.id_lote = l.id_lote)))
     LEFT JOIN public.produto_marca pm ON ((p.id_produto = pm.id_produto)))
     LEFT JOIN public.marca_referencia m ON ((pm.id_marca_referencia = m.id_marca_referencia)))
     JOIN public.classe_produto cp ON ((cp.id_classe = p.id_classe)))
  WHERE (((cp.nome_classe)::text ~~* '%hospit%'::text) OR ((cp.nome_classe)::text ~~* '%odont%'::text) OR ((cp.nome_classe)::text ~~* '%outr%'::text))
  GROUP BY c.codigo_catmat, p.id_produto, p.nome_produto, p.descricao_produto, p.unidade, l.id_lote, cp.nome_classe
  ORDER BY l.id_lote, p.nome_produto;


ALTER TABLE public.vw_lista_de_compras_lotes_odo_hosp OWNER TO postgres;

--
-- Name: vw_processos_tr; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.vw_processos_tr AS
 SELECT tr.id_tr,
    tr.num_tr,
    p.num_proc_planejamento,
    p.num_proc_selecao,
    p.objeto
   FROM (public.processo p
     JOIN public.termo_referencia tr ON ((p.id_processo = tr.id_processo)))
  ORDER BY tr.id_tr;


ALTER TABLE public.vw_processos_tr OWNER TO postgres;

--
-- Name: vw_produtos_lotes; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.vw_produtos_lotes AS
 SELECT p.id_produto,
    p.nome_produto,
    p.descricao_produto,
    p.unidade,
    c.codigo_catmat,
    cp.nome_classe,
    l.id_lote,
    COALESCE(l.nome_lote, 'Sem Lote'::character varying) AS nome_lote,
    COALESCE(l.descricao_lote, 'Produto não associado a nenhum lote'::text) AS descricao_lote
   FROM (((public.produto p
     LEFT JOIN public.lote_classificacao l ON ((p.id_lote = l.id_lote)))
     LEFT JOIN public.catmat c ON ((p.id_catmat = c.id_catmat)))
     LEFT JOIN public.classe_produto cp ON ((p.id_classe = cp.id_classe)))
  ORDER BY l.id_lote, p.nome_produto;


ALTER TABLE public.vw_produtos_lotes OWNER TO postgres;

--
-- Name: vw_propostas_comparativo; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.vw_propostas_comparativo AS
 SELECT pro.num_proc_selecao AS processo,
    tp.numero_item AS item,
    p.nome_produto AS produto,
    tp.quantidade_produto AS qtde,
    COALESCE(f.nome_fornecedor, 'SEM PROPOSTA'::character varying) AS nome_fornecedor,
    COALESCE((pi.valor_proposto)::text, 'SEM PROPOSTA'::text) AS valor_proposto,
    COALESCE((ei.valor_estimado_tr_produto)::text, 'SEM PROPOSTA'::text) AS valor_estimado,
        CASE
            WHEN ((pi.valor_proposto IS NULL) OR (ei.valor_estimado_tr_produto IS NULL)) THEN 'SEM PROPOSTA'::text
            ELSE ((pi.valor_proposto - ei.valor_estimado_tr_produto))::text
        END AS diferenca,
    COALESCE(pi.avaliacao, 'SEM PROPOSTA'::character varying) AS avaliacao,
    COALESCE((pi.homologado)::text, 'SEM PROPOSTA'::text) AS homologado,
        CASE
            WHEN (ei.valor_estimado_tr_produto IS NULL) THEN 'SEM PROPOSTA'::text
            ELSE (((tp.quantidade_produto)::numeric * ei.valor_estimado_tr_produto))::text
        END AS valor_estimado_total,
        CASE
            WHEN (pi.valor_proposto IS NULL) THEN 'SEM PROPOSTA'::text
            ELSE (((tp.quantidade_produto)::numeric * pi.valor_proposto))::text
        END AS valor_proposto_total
   FROM ((((((((public.termo_referencia tr
     JOIN public.tr_produto tp ON ((tr.id_tr = tp.id_tr)))
     JOIN public.processo pro ON ((pro.id_processo = tr.id_processo)))
     JOIN public.produto p ON ((p.id_produto = tp.id_produto)))
     LEFT JOIN public.estimativa e ON ((e.id_tr = tr.id_tr)))
     LEFT JOIN public.estimativa_item ei ON (((ei.id_estimativa = e.id_estimativa) AND (ei.id_tr_produto = tp.id_tr_produto))))
     LEFT JOIN public.proposta_item pi ON ((pi.id_tr_produto = tp.id_tr_produto)))
     LEFT JOIN public.proposta pr ON ((pr.id_proposta = pi.id_proposta)))
     LEFT JOIN public.fornecedor f ON ((f.id_fornecedor = pr.id_fornecedor)))
  ORDER BY pro.num_proc_selecao, tp.numero_item;


ALTER TABLE public.vw_propostas_comparativo OWNER TO postgres;

--
-- Name: vw_propostas_fornecedor; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.vw_propostas_fornecedor AS
 SELECT pr.num_proc_selecao AS processo,
    f.nome_fornecedor AS fornecedor,
    f.cnpj,
    count(pi.id_proposta_item) AS total_itens,
    sum((pi.valor_proposto * (tp.quantidade_produto)::numeric)) AS valor_total_proposta
   FROM (((((public.proposta p
     JOIN public.fornecedor f ON ((p.id_fornecedor = f.id_fornecedor)))
     JOIN public.proposta_item pi ON ((p.id_proposta = pi.id_proposta)))
     JOIN public.tr_produto tp ON ((pi.id_tr_produto = tp.id_tr_produto)))
     JOIN public.termo_referencia tr ON ((tr.id_tr = tp.id_tr)))
     JOIN public.processo pr ON ((pr.id_processo = tr.id_processo)))
  GROUP BY f.nome_fornecedor, f.cnpj, tr.num_tr, pr.num_proc_selecao
  ORDER BY pr.num_proc_selecao;


ALTER TABLE public.vw_propostas_fornecedor OWNER TO postgres;

--
-- Name: vw_status_empenhos_por_processo; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.vw_status_empenhos_por_processo AS
 SELECT p.num_proc_selecao,
    e.numero_empenho,
    f.nome_fornecedor,
        CASE
            WHEN (e.enviado = true) THEN '✅ ENVIADO'::text
            WHEN ((e.enviado = false) AND (e.id_empenho IS NOT NULL)) THEN '⏳ PENDENTE'::text
            ELSE '🚫 SEM EMPENHO'::text
        END AS status_envio,
    to_char(e.data_envio, 'DD/MM/YYYY'::text) AS data_envio_formatada,
        CASE
            WHEN (e.pagamento_concluido = true) THEN '✅ PAGO'::text
            WHEN ((e.pagamento_concluido = false) AND (e.id_empenho IS NOT NULL)) THEN '⏳ AGUARDANDO PAGAMENTO'::text
            ELSE 'N/A'::text
        END AS status_pagamento
   FROM ((public.processo p
     LEFT JOIN public.empenho e ON ((p.id_processo = e.id_processo)))
     LEFT JOIN public.fornecedor f ON ((e.id_fornecedor = f.id_fornecedor)))
  ORDER BY p.num_proc_selecao, e.numero_empenho;


ALTER TABLE public.vw_status_empenhos_por_processo OWNER TO postgres;

--
-- Name: vw_status_pagamentos_processo; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.vw_status_pagamentos_processo AS
 SELECT p.num_proc_selecao AS "Processo de Seleção",
    f.nome_fornecedor AS "Fornecedor",
    e.numero_empenho AS "Nº Empenho",
    e.num_processo_pagamento AS "Processo de Pagamento",
        CASE
            WHEN (e.pagamento_concluido = true) THEN 'Sim'::text
            WHEN (e.pagamento_concluido = false) THEN 'Não'::text
            ELSE 'Sem Empenho/Pagamento'::text
        END AS "Pagamento Concluído"
   FROM ((public.processo p
     LEFT JOIN public.empenho e ON ((p.id_processo = e.id_processo)))
     LEFT JOIN public.fornecedor f ON ((e.id_fornecedor = f.id_fornecedor)))
  ORDER BY p.num_proc_selecao, e.numero_empenho;


ALTER TABLE public.vw_status_pagamentos_processo OWNER TO postgres;

--
-- Name: vw_total_empenhado_fornecedor; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.vw_total_empenhado_fornecedor AS
 SELECT p.num_proc_selecao,
    f.nome_fornecedor,
    COALESCE(sum(e.valor_empenho), 0.00) AS valor_total_empenhado
   FROM ((public.fornecedor f
     LEFT JOIN public.empenho e ON ((f.id_fornecedor = e.id_fornecedor)))
     LEFT JOIN public.processo p ON ((e.id_processo = p.id_processo)))
  GROUP BY f.id_fornecedor, f.cnpj, f.nome_fornecedor, p.num_proc_selecao
  ORDER BY p.num_proc_selecao, f.nome_fornecedor;


ALTER TABLE public.vw_total_empenhado_fornecedor OWNER TO postgres;

--
-- Name: vw_valor_estimado_produto; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.vw_valor_estimado_produto AS
 SELECT pr.num_proc_selecao AS processo,
    p.nome_produto AS "Nome do Produto",
    ei.valor_estimado_tr_produto AS "Valor Estimado (R$)"
   FROM ((((public.estimativa_item ei
     JOIN public.tr_produto tp ON ((ei.id_tr_produto = tp.id_tr_produto)))
     JOIN public.produto p ON ((tp.id_produto = p.id_produto)))
     JOIN public.termo_referencia tr ON ((tp.id_tr = tr.id_tr)))
     JOIN public.processo pr ON ((pr.id_processo = tr.id_processo)))
  ORDER BY tr.num_tr, tp.numero_item;


ALTER TABLE public.vw_valor_estimado_produto OWNER TO postgres;

--
-- Name: catmat id_catmat; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.catmat ALTER COLUMN id_catmat SET DEFAULT nextval('public.catmat_id_catmat_seq'::regclass);


--
-- Name: classe_produto id_classe; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.classe_produto ALTER COLUMN id_classe SET DEFAULT nextval('public.classe_produto_id_classe_seq'::regclass);


--
-- Name: empenho id_empenho; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.empenho ALTER COLUMN id_empenho SET DEFAULT nextval('public.empenho_id_empenho_seq'::regclass);


--
-- Name: empenho_produto id_empenho_produto; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.empenho_produto ALTER COLUMN id_empenho_produto SET DEFAULT nextval('public.empenho_produto_id_empenho_produto_seq'::regclass);


--
-- Name: endereco id_endereco; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.endereco ALTER COLUMN id_endereco SET DEFAULT nextval('public.endereco_id_endereco_seq'::regclass);


--
-- Name: estimativa id_estimativa; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.estimativa ALTER COLUMN id_estimativa SET DEFAULT nextval('public.estimativa_id_estimativa_seq'::regclass);


--
-- Name: estimativa_item id_estimativa_item; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.estimativa_item ALTER COLUMN id_estimativa_item SET DEFAULT nextval('public.estimativa_item_id_estimativa_item_seq'::regclass);


--
-- Name: fornecedor id_fornecedor; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fornecedor ALTER COLUMN id_fornecedor SET DEFAULT nextval('public.fornecedor_id_fornecedor_seq'::regclass);


--
-- Name: historico_status_processo id_historico_status; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.historico_status_processo ALTER COLUMN id_historico_status SET DEFAULT nextval('public.historico_status_processo_id_historico_status_seq'::regclass);


--
-- Name: lote_classificacao id_lote; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lote_classificacao ALTER COLUMN id_lote SET DEFAULT nextval('public.lote_classificacao_id_lote_seq'::regclass);


--
-- Name: marca_referencia id_marca_referencia; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.marca_referencia ALTER COLUMN id_marca_referencia SET DEFAULT nextval('public.marca_referencia_id_marca_referencia_seq'::regclass);


--
-- Name: modalidade id_modalidade; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.modalidade ALTER COLUMN id_modalidade SET DEFAULT nextval('public.modalidade_id_modalidade_seq'::regclass);


--
-- Name: processo id_processo; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.processo ALTER COLUMN id_processo SET DEFAULT nextval('public.processo_id_processo_seq'::regclass);


--
-- Name: produto id_produto; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.produto ALTER COLUMN id_produto SET DEFAULT nextval('public.produto_id_produto_seq'::regclass);


--
-- Name: produto_marca id_produto_marca; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.produto_marca ALTER COLUMN id_produto_marca SET DEFAULT nextval('public.produto_marca_id_produto_marca_seq'::regclass);


--
-- Name: proposta id_proposta; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.proposta ALTER COLUMN id_proposta SET DEFAULT nextval('public.proposta_id_proposta_seq'::regclass);


--
-- Name: proposta_item id_proposta_item; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.proposta_item ALTER COLUMN id_proposta_item SET DEFAULT nextval('public.proposta_item_id_proposta_item_seq'::regclass);


--
-- Name: status_processo id_status_processo; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.status_processo ALTER COLUMN id_status_processo SET DEFAULT nextval('public.status_processo_id_status_processo_seq'::regclass);


--
-- Name: telefone_fornecedor id_telefone; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.telefone_fornecedor ALTER COLUMN id_telefone SET DEFAULT nextval('public.telefone_fornecedor_id_telefone_seq'::regclass);


--
-- Name: termo_referencia id_tr; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.termo_referencia ALTER COLUMN id_tr SET DEFAULT nextval('public.termo_referencia_id_tr_seq'::regclass);


--
-- Name: tr_produto id_tr_produto; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tr_produto ALTER COLUMN id_tr_produto SET DEFAULT nextval('public.tr_produto_id_tr_produto_seq'::regclass);


--
-- Data for Name: catmat; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.catmat (id_catmat, codigo_catmat, descricao_catmat) FROM stdin;
\.
COPY public.catmat (id_catmat, codigo_catmat, descricao_catmat) FROM '$$PATH$$/3233.dat';

--
-- Data for Name: classe_produto; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.classe_produto (id_classe, nome_classe) FROM stdin;
\.
COPY public.classe_produto (id_classe, nome_classe) FROM '$$PATH$$/3237.dat';

--
-- Data for Name: empenho; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.empenho (id_empenho, numero_empenho, ano_empenho, id_processo, id_fornecedor, valor_empenho, enviado, data_envio, num_processo_pagamento, pagamento_concluido) FROM stdin;
\.
COPY public.empenho (id_empenho, numero_empenho, ano_empenho, id_processo, id_fornecedor, valor_empenho, enviado, data_envio, num_processo_pagamento, pagamento_concluido) FROM '$$PATH$$/3261.dat';

--
-- Data for Name: empenho_produto; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.empenho_produto (id_empenho_produto, id_empenho, id_tr_produto, quantidade_produto_emp, valor_final_unidade_produto) FROM stdin;
\.
COPY public.empenho_produto (id_empenho_produto, id_empenho, id_tr_produto, quantidade_produto_emp, valor_final_unidade_produto) FROM '$$PATH$$/3263.dat';

--
-- Data for Name: endereco; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.endereco (id_endereco, logradouro, num_casa, bairro, cidade, estado) FROM stdin;
\.
COPY public.endereco (id_endereco, logradouro, num_casa, bairro, cidade, estado) FROM '$$PATH$$/3227.dat';

--
-- Data for Name: estimativa; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.estimativa (id_estimativa, id_tr, num_documento, data_estimativa, valor_estimado_global) FROM stdin;
\.
COPY public.estimativa (id_estimativa, id_tr, num_documento, data_estimativa, valor_estimado_global) FROM '$$PATH$$/3249.dat';

--
-- Data for Name: estimativa_item; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.estimativa_item (id_estimativa_item, id_estimativa, id_tr_produto, valor_estimado_tr_produto) FROM stdin;
\.
COPY public.estimativa_item (id_estimativa_item, id_estimativa, id_tr_produto, valor_estimado_tr_produto) FROM '$$PATH$$/3251.dat';

--
-- Data for Name: fornecedor; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.fornecedor (id_fornecedor, cnpj, nome_fornecedor, email_fornecedor, id_endereco) FROM stdin;
\.
COPY public.fornecedor (id_fornecedor, cnpj, nome_fornecedor, email_fornecedor, id_endereco) FROM '$$PATH$$/3229.dat';

--
-- Data for Name: historico_status_processo; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.historico_status_processo (id_historico_status, id_processo, id_status_processo, data_status, observacao) FROM stdin;
\.
COPY public.historico_status_processo (id_historico_status, id_processo, id_status_processo, data_status, observacao) FROM '$$PATH$$/3255.dat';

--
-- Data for Name: lote_classificacao; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.lote_classificacao (id_lote, nome_lote, descricao_lote) FROM stdin;
\.
COPY public.lote_classificacao (id_lote, nome_lote, descricao_lote) FROM '$$PATH$$/3265.dat';

--
-- Data for Name: marca_referencia; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.marca_referencia (id_marca_referencia, nome_marca_referencia) FROM stdin;
\.
COPY public.marca_referencia (id_marca_referencia, nome_marca_referencia) FROM '$$PATH$$/3235.dat';

--
-- Data for Name: modalidade; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.modalidade (id_modalidade, nome_modalidade) FROM stdin;
\.
COPY public.modalidade (id_modalidade, nome_modalidade) FROM '$$PATH$$/3241.dat';

--
-- Data for Name: processo; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.processo (id_processo, ano_processo, codigo_pca, num_proc_planejamento, objeto, valor_pca, num_etp, num_proc_selecao, num_pregao, id_modalidade, created_at) FROM stdin;
\.
COPY public.processo (id_processo, ano_processo, codigo_pca, num_proc_planejamento, objeto, valor_pca, num_etp, num_proc_selecao, num_pregao, id_modalidade, created_at) FROM '$$PATH$$/3243.dat';

--
-- Data for Name: produto; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.produto (id_produto, nome_produto, descricao_produto, unidade, id_catmat, id_classe, id_lote) FROM stdin;
\.
COPY public.produto (id_produto, nome_produto, descricao_produto, unidade, id_catmat, id_classe, id_lote) FROM '$$PATH$$/3239.dat';

--
-- Data for Name: produto_marca; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.produto_marca (id_produto_marca, id_produto, id_marca_referencia, principal, observacao, created_at) FROM stdin;
\.
COPY public.produto_marca (id_produto_marca, id_produto, id_marca_referencia, principal, observacao, created_at) FROM '$$PATH$$/3267.dat';

--
-- Data for Name: proposta; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.proposta (id_proposta, id_fornecedor, id_tr, created_at) FROM stdin;
\.
COPY public.proposta (id_proposta, id_fornecedor, id_tr, created_at) FROM '$$PATH$$/3257.dat';

--
-- Data for Name: proposta_item; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.proposta_item (id_proposta_item, id_proposta, id_tr_produto, valor_proposto, avaliacao, homologado, observacoes) FROM stdin;
\.
COPY public.proposta_item (id_proposta_item, id_proposta, id_tr_produto, valor_proposto, avaliacao, homologado, observacoes) FROM '$$PATH$$/3259.dat';

--
-- Data for Name: status_processo; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.status_processo (id_status_processo, nome_status) FROM stdin;
\.
COPY public.status_processo (id_status_processo, nome_status) FROM '$$PATH$$/3253.dat';

--
-- Data for Name: telefone_fornecedor; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.telefone_fornecedor (id_telefone, num_telefone, id_fornecedor) FROM stdin;
\.
COPY public.telefone_fornecedor (id_telefone, num_telefone, id_fornecedor) FROM '$$PATH$$/3231.dat';

--
-- Data for Name: termo_referencia; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.termo_referencia (id_tr, ano_tr, num_tr, id_processo) FROM stdin;
\.
COPY public.termo_referencia (id_tr, ano_tr, num_tr, id_processo) FROM '$$PATH$$/3245.dat';

--
-- Data for Name: tr_produto; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tr_produto (id_tr_produto, numero_item, id_produto, id_tr, quantidade_produto) FROM stdin;
\.
COPY public.tr_produto (id_tr_produto, numero_item, id_produto, id_tr, quantidade_produto) FROM '$$PATH$$/3247.dat';

--
-- Name: catmat_id_catmat_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.catmat_id_catmat_seq', 174, true);


--
-- Name: classe_produto_id_classe_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.classe_produto_id_classe_seq', 4, true);


--
-- Name: empenho_id_empenho_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.empenho_id_empenho_seq', 28, true);


--
-- Name: empenho_produto_id_empenho_produto_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.empenho_produto_id_empenho_produto_seq', 176, true);


--
-- Name: endereco_id_endereco_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.endereco_id_endereco_seq', 46, true);


--
-- Name: estimativa_id_estimativa_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.estimativa_id_estimativa_seq', 7, true);


--
-- Name: estimativa_item_id_estimativa_item_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.estimativa_item_id_estimativa_item_seq', 309, true);


--
-- Name: fornecedor_id_fornecedor_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.fornecedor_id_fornecedor_seq', 42, true);


--
-- Name: historico_status_processo_id_historico_status_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.historico_status_processo_id_historico_status_seq', 69, true);


--
-- Name: lote_classificacao_id_lote_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.lote_classificacao_id_lote_seq', 20, true);


--
-- Name: marca_referencia_id_marca_referencia_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.marca_referencia_id_marca_referencia_seq', 47, true);


--
-- Name: modalidade_id_modalidade_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.modalidade_id_modalidade_seq', 6, true);


--
-- Name: processo_id_processo_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.processo_id_processo_seq', 23, true);


--
-- Name: produto_id_produto_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.produto_id_produto_seq', 182, true);


--
-- Name: produto_marca_id_produto_marca_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.produto_marca_id_produto_marca_seq', 263, true);


--
-- Name: proposta_id_proposta_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.proposta_id_proposta_seq', 17, true);


--
-- Name: proposta_item_id_proposta_item_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.proposta_item_id_proposta_item_seq', 192, true);


--
-- Name: status_processo_id_status_processo_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.status_processo_id_status_processo_seq', 7, true);


--
-- Name: telefone_fornecedor_id_telefone_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.telefone_fornecedor_id_telefone_seq', 32, true);


--
-- Name: termo_referencia_id_tr_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.termo_referencia_id_tr_seq', 6, true);


--
-- Name: tr_produto_id_tr_produto_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.tr_produto_id_tr_produto_seq', 461, true);


--
-- Name: catmat catmat_codigo_catmat_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.catmat
    ADD CONSTRAINT catmat_codigo_catmat_key UNIQUE (codigo_catmat);


--
-- Name: catmat catmat_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.catmat
    ADD CONSTRAINT catmat_pkey PRIMARY KEY (id_catmat);


--
-- Name: classe_produto classe_produto_nome_classe_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.classe_produto
    ADD CONSTRAINT classe_produto_nome_classe_key UNIQUE (nome_classe);


--
-- Name: classe_produto classe_produto_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.classe_produto
    ADD CONSTRAINT classe_produto_pkey PRIMARY KEY (id_classe);


--
-- Name: empenho empenho_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.empenho
    ADD CONSTRAINT empenho_pkey PRIMARY KEY (id_empenho);


--
-- Name: empenho_produto empenho_produto_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.empenho_produto
    ADD CONSTRAINT empenho_produto_pkey PRIMARY KEY (id_empenho_produto);


--
-- Name: endereco endereco_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.endereco
    ADD CONSTRAINT endereco_pkey PRIMARY KEY (id_endereco);


--
-- Name: estimativa_item estimativa_item_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.estimativa_item
    ADD CONSTRAINT estimativa_item_pkey PRIMARY KEY (id_estimativa_item);


--
-- Name: estimativa estimativa_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.estimativa
    ADD CONSTRAINT estimativa_pkey PRIMARY KEY (id_estimativa);


--
-- Name: fornecedor fornecedor_cnpj_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fornecedor
    ADD CONSTRAINT fornecedor_cnpj_key UNIQUE (cnpj);


--
-- Name: fornecedor fornecedor_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fornecedor
    ADD CONSTRAINT fornecedor_pkey PRIMARY KEY (id_fornecedor);


--
-- Name: historico_status_processo historico_status_processo_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.historico_status_processo
    ADD CONSTRAINT historico_status_processo_pkey PRIMARY KEY (id_historico_status);


--
-- Name: lote_classificacao lote_classificacao_nome_lote_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lote_classificacao
    ADD CONSTRAINT lote_classificacao_nome_lote_key UNIQUE (nome_lote);


--
-- Name: lote_classificacao lote_classificacao_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lote_classificacao
    ADD CONSTRAINT lote_classificacao_pkey PRIMARY KEY (id_lote);


--
-- Name: marca_referencia marca_referencia_nome_marca_referencia_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.marca_referencia
    ADD CONSTRAINT marca_referencia_nome_marca_referencia_key UNIQUE (nome_marca_referencia);


--
-- Name: marca_referencia marca_referencia_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.marca_referencia
    ADD CONSTRAINT marca_referencia_pkey PRIMARY KEY (id_marca_referencia);


--
-- Name: modalidade modalidade_nome_modalidade_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.modalidade
    ADD CONSTRAINT modalidade_nome_modalidade_key UNIQUE (nome_modalidade);


--
-- Name: modalidade modalidade_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.modalidade
    ADD CONSTRAINT modalidade_pkey PRIMARY KEY (id_modalidade);


--
-- Name: processo processo_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.processo
    ADD CONSTRAINT processo_pkey PRIMARY KEY (id_processo);


--
-- Name: produto_marca produto_marca_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.produto_marca
    ADD CONSTRAINT produto_marca_pkey PRIMARY KEY (id_produto_marca);


--
-- Name: produto produto_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.produto
    ADD CONSTRAINT produto_pkey PRIMARY KEY (id_produto);


--
-- Name: proposta_item proposta_item_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.proposta_item
    ADD CONSTRAINT proposta_item_pkey PRIMARY KEY (id_proposta_item);


--
-- Name: proposta proposta_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.proposta
    ADD CONSTRAINT proposta_pkey PRIMARY KEY (id_proposta);


--
-- Name: status_processo status_processo_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.status_processo
    ADD CONSTRAINT status_processo_pkey PRIMARY KEY (id_status_processo);


--
-- Name: telefone_fornecedor telefone_fornecedor_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.telefone_fornecedor
    ADD CONSTRAINT telefone_fornecedor_pkey PRIMARY KEY (id_telefone);


--
-- Name: termo_referencia termo_referencia_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.termo_referencia
    ADD CONSTRAINT termo_referencia_pkey PRIMARY KEY (id_tr);


--
-- Name: tr_produto tr_produto_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tr_produto
    ADD CONSTRAINT tr_produto_pkey PRIMARY KEY (id_tr_produto);


--
-- Name: empenho uq_empenho; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.empenho
    ADD CONSTRAINT uq_empenho UNIQUE (ano_empenho, numero_empenho);


--
-- Name: estimativa_item uq_estimativa_produto; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.estimativa_item
    ADD CONSTRAINT uq_estimativa_produto UNIQUE (id_estimativa, id_tr_produto);


--
-- Name: processo uq_planejamento; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.processo
    ADD CONSTRAINT uq_planejamento UNIQUE (ano_processo, num_proc_planejamento);


--
-- Name: produto_marca uq_produto_marca_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.produto_marca
    ADD CONSTRAINT uq_produto_marca_unique UNIQUE (id_produto, id_marca_referencia);


--
-- Name: proposta_item uq_proposta_produto; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.proposta_item
    ADD CONSTRAINT uq_proposta_produto UNIQUE (id_proposta, id_tr_produto);


--
-- Name: processo uq_selecao; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.processo
    ADD CONSTRAINT uq_selecao UNIQUE (ano_processo, num_proc_selecao);


--
-- Name: termo_referencia uq_tr; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.termo_referencia
    ADD CONSTRAINT uq_tr UNIQUE (ano_tr, num_tr);


--
-- Name: tr_produto uq_tr_item; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tr_produto
    ADD CONSTRAINT uq_tr_item UNIQUE (id_produto, id_tr);


--
-- Name: empenho trg_empenho_historico; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_empenho_historico AFTER INSERT ON public.empenho FOR EACH ROW EXECUTE FUNCTION public.fn_empenho_historico_tr();


--
-- Name: estimativa trg_gerar_itens_estimativa; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_gerar_itens_estimativa AFTER INSERT ON public.estimativa FOR EACH ROW EXECUTE FUNCTION public.fn_gerar_itens_estimativa_tr();


--
-- Name: processo trg_processo_historico; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_processo_historico AFTER INSERT OR UPDATE OF num_etp, num_proc_selecao ON public.processo FOR EACH ROW EXECUTE FUNCTION public.fn_processo_historico_tr();


--
-- Name: proposta trg_proposta_historico; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_proposta_historico AFTER INSERT ON public.proposta FOR EACH ROW EXECUTE FUNCTION public.fn_proposta_historico_tr();


--
-- Name: termo_referencia trg_termo_referencia_historico; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_termo_referencia_historico AFTER INSERT ON public.termo_referencia FOR EACH ROW EXECUTE FUNCTION public.fn_termo_referencia_historico_tr();


--
-- Name: empenho_produto fk_emp_prod_empenho; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.empenho_produto
    ADD CONSTRAINT fk_emp_prod_empenho FOREIGN KEY (id_empenho) REFERENCES public.empenho(id_empenho);


--
-- Name: empenho_produto fk_emp_prod_tr; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.empenho_produto
    ADD CONSTRAINT fk_emp_prod_tr FOREIGN KEY (id_tr_produto) REFERENCES public.tr_produto(id_tr_produto);


--
-- Name: empenho fk_empenho_fornecedor; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.empenho
    ADD CONSTRAINT fk_empenho_fornecedor FOREIGN KEY (id_fornecedor) REFERENCES public.fornecedor(id_fornecedor);


--
-- Name: empenho fk_empenho_processo; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.empenho
    ADD CONSTRAINT fk_empenho_processo FOREIGN KEY (id_processo) REFERENCES public.processo(id_processo);


--
-- Name: estimativa fk_estimativa_tr; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.estimativa
    ADD CONSTRAINT fk_estimativa_tr FOREIGN KEY (id_tr) REFERENCES public.termo_referencia(id_tr) ON DELETE CASCADE;


--
-- Name: fornecedor fk_fornecedor_endereco; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fornecedor
    ADD CONSTRAINT fk_fornecedor_endereco FOREIGN KEY (id_endereco) REFERENCES public.endereco(id_endereco);


--
-- Name: historico_status_processo fk_hist_proc; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.historico_status_processo
    ADD CONSTRAINT fk_hist_proc FOREIGN KEY (id_processo) REFERENCES public.processo(id_processo);


--
-- Name: historico_status_processo fk_hist_status; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.historico_status_processo
    ADD CONSTRAINT fk_hist_status FOREIGN KEY (id_status_processo) REFERENCES public.status_processo(id_status_processo);


--
-- Name: estimativa_item fk_item_estimativa; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.estimativa_item
    ADD CONSTRAINT fk_item_estimativa FOREIGN KEY (id_estimativa) REFERENCES public.estimativa(id_estimativa) ON DELETE CASCADE;


--
-- Name: estimativa_item fk_item_estimativa_produto; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.estimativa_item
    ADD CONSTRAINT fk_item_estimativa_produto FOREIGN KEY (id_tr_produto) REFERENCES public.tr_produto(id_tr_produto);


--
-- Name: proposta_item fk_item_proposta; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.proposta_item
    ADD CONSTRAINT fk_item_proposta FOREIGN KEY (id_proposta) REFERENCES public.proposta(id_proposta) ON DELETE CASCADE;


--
-- Name: proposta_item fk_item_tr_produto; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.proposta_item
    ADD CONSTRAINT fk_item_tr_produto FOREIGN KEY (id_tr_produto) REFERENCES public.tr_produto(id_tr_produto);


--
-- Name: processo fk_processo_modalidade; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.processo
    ADD CONSTRAINT fk_processo_modalidade FOREIGN KEY (id_modalidade) REFERENCES public.modalidade(id_modalidade);


--
-- Name: produto fk_produto_catmat; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.produto
    ADD CONSTRAINT fk_produto_catmat FOREIGN KEY (id_catmat) REFERENCES public.catmat(id_catmat);


--
-- Name: produto fk_produto_classe; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.produto
    ADD CONSTRAINT fk_produto_classe FOREIGN KEY (id_classe) REFERENCES public.classe_produto(id_classe);


--
-- Name: produto fk_produto_lote; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.produto
    ADD CONSTRAINT fk_produto_lote FOREIGN KEY (id_lote) REFERENCES public.lote_classificacao(id_lote);


--
-- Name: produto_marca fk_produto_marca_marca; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.produto_marca
    ADD CONSTRAINT fk_produto_marca_marca FOREIGN KEY (id_marca_referencia) REFERENCES public.marca_referencia(id_marca_referencia) ON DELETE RESTRICT;


--
-- Name: produto_marca fk_produto_marca_produto; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.produto_marca
    ADD CONSTRAINT fk_produto_marca_produto FOREIGN KEY (id_produto) REFERENCES public.produto(id_produto) ON DELETE CASCADE;


--
-- Name: proposta fk_proposta_fornecedor; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.proposta
    ADD CONSTRAINT fk_proposta_fornecedor FOREIGN KEY (id_fornecedor) REFERENCES public.fornecedor(id_fornecedor);


--
-- Name: proposta fk_proposta_tr; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.proposta
    ADD CONSTRAINT fk_proposta_tr FOREIGN KEY (id_tr) REFERENCES public.termo_referencia(id_tr);


--
-- Name: telefone_fornecedor fk_telefone_fornecedor; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.telefone_fornecedor
    ADD CONSTRAINT fk_telefone_fornecedor FOREIGN KEY (id_fornecedor) REFERENCES public.fornecedor(id_fornecedor) ON DELETE CASCADE;


--
-- Name: termo_referencia fk_tr_processo; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.termo_referencia
    ADD CONSTRAINT fk_tr_processo FOREIGN KEY (id_processo) REFERENCES public.processo(id_processo);


--
-- Name: tr_produto fk_tr_produto_produto; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tr_produto
    ADD CONSTRAINT fk_tr_produto_produto FOREIGN KEY (id_produto) REFERENCES public.produto(id_produto);


--
-- Name: tr_produto fk_tr_produto_tr; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tr_produto
    ADD CONSTRAINT fk_tr_produto_tr FOREIGN KEY (id_tr) REFERENCES public.termo_referencia(id_tr);


--
-- PostgreSQL database dump complete
--

