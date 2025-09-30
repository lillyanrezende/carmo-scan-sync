-- Corrigir avisos de segurança: adicionar search_path às functions

-- Recriar function atualizar_timestamp com search_path
CREATE OR REPLACE FUNCTION public.atualizar_timestamp()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$;

-- Recriar function processar_movimentacao com search_path
CREATE OR REPLACE FUNCTION public.processar_movimentacao(
  p_produto_id BIGINT,
  p_origem_id BIGINT,
  p_destino_id BIGINT,
  p_quantidade DECIMAL,
  p_tipo TEXT,
  p_usuario TEXT,
  p_observacoes TEXT DEFAULT NULL,
  p_timestamp TIMESTAMPTZ DEFAULT now(),
  p_hash_idempotencia TEXT DEFAULT NULL
)
RETURNS JSON 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_estoque_origem DECIMAL;
  v_estoque_destino DECIMAL;
  v_movimentacao_id BIGINT;
  v_result JSON;
BEGIN
  -- Validações básicas
  IF p_quantidade <= 0 THEN
    RAISE EXCEPTION 'Quantidade deve ser maior que zero';
  END IF;

  -- Validar tipo de movimentação
  IF p_tipo NOT IN ('entrada', 'saida', 'transferencia') THEN
    RAISE EXCEPTION 'Tipo de movimentação inválido: %', p_tipo;
  END IF;

  -- Verificar duplicatas (idempotência)
  IF p_hash_idempotencia IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM movimentacao_estoque WHERE hash_idempotencia = p_hash_idempotencia) THEN
      RAISE EXCEPTION 'Movimentação duplicada detectada';
    END IF;
  END IF;

  -- Validar armazéns conforme tipo
  IF p_tipo = 'entrada' AND p_destino_id IS NULL THEN
    RAISE EXCEPTION 'Entrada requer armazém de destino';
  END IF;

  IF p_tipo = 'saida' AND p_origem_id IS NULL THEN
    RAISE EXCEPTION 'Saída requer armazém de origem';
  END IF;

  IF p_tipo = 'transferencia' AND (p_origem_id IS NULL OR p_destino_id IS NULL) THEN
    RAISE EXCEPTION 'Transferência requer armazéns de origem e destino';
  END IF;

  -- SAÍDA: Decrementar origem
  IF p_tipo IN ('saida', 'transferencia') THEN
    -- Garantir que o estoque existe
    INSERT INTO estoques (produto_id, armazem_id, quantidade)
    VALUES (p_produto_id, p_origem_id, 0)
    ON CONFLICT (produto_id, armazem_id) DO NOTHING;

    -- Verificar estoque disponível
    SELECT quantidade INTO v_estoque_origem
    FROM estoques
    WHERE produto_id = p_produto_id AND armazem_id = p_origem_id;

    IF v_estoque_origem < p_quantidade THEN
      RAISE EXCEPTION 'Estoque insuficiente. Disponível: %, Necessário: %', v_estoque_origem, p_quantidade;
    END IF;

    -- Decrementar
    UPDATE estoques
    SET quantidade = quantidade - p_quantidade,
        atualizado_em = now()
    WHERE produto_id = p_produto_id AND armazem_id = p_origem_id;
  END IF;

  -- ENTRADA ou TRANSFERÊNCIA: Incrementar destino
  IF p_tipo IN ('entrada', 'transferencia') THEN
    INSERT INTO estoques (produto_id, armazem_id, quantidade)
    VALUES (p_produto_id, p_destino_id, p_quantidade)
    ON CONFLICT (produto_id, armazem_id) 
    DO UPDATE SET 
      quantidade = estoques.quantidade + EXCLUDED.quantidade,
      atualizado_em = now();
  END IF;

  -- Registar movimentação
  INSERT INTO movimentacao_estoque (
    produto_id,
    armazem_origem_id,
    armazem_destino_id,
    tipo_movimentacao,
    quantidade,
    usuario,
    observacoes,
    timestamp,
    hash_idempotencia,
    sync_status
  ) VALUES (
    p_produto_id,
    p_origem_id,
    p_destino_id,
    p_tipo,
    p_quantidade,
    p_usuario,
    p_observacoes,
    p_timestamp,
    p_hash_idempotencia,
    'sincronizado'
  ) RETURNING id INTO v_movimentacao_id;

  -- Retornar resultado
  SELECT json_build_object(
    'ok', true,
    'movimentacao_id', v_movimentacao_id,
    'produto_id', p_produto_id,
    'estoques', (
      SELECT json_agg(json_build_object(
        'armazem_id', armazem_id,
        'armazem_nome', a.nome,
        'quantidade', e.quantidade
      ))
      FROM estoques e
      JOIN armazens a ON a.id = e.armazem_id
      WHERE e.produto_id = p_produto_id
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;