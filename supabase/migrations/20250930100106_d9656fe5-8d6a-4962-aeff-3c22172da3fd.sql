-- ============================================
-- SCHEMA: Sistema de Gestão de Stock
-- Sapataria do Carmo - Barcode Scanner App
-- ============================================

-- Tabela de Armazéns
CREATE TABLE IF NOT EXISTS public.armazens (
  id BIGSERIAL PRIMARY KEY,
  codigo TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  morada TEXT,
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now()
);

-- Tabela de Categorias
CREATE TABLE IF NOT EXISTS public.categorias (
  id BIGSERIAL PRIMARY KEY,
  nome TEXT NOT NULL UNIQUE,
  descricao TEXT,
  criado_em TIMESTAMPTZ DEFAULT now()
);

-- Tabela de Subcategorias
CREATE TABLE IF NOT EXISTS public.subcategorias (
  id BIGSERIAL PRIMARY KEY,
  categoria_id BIGINT REFERENCES public.categorias(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  criado_em TIMESTAMPTZ DEFAULT now(),
  UNIQUE(categoria_id, nome)
);

-- Tabela de Fornecedores
CREATE TABLE IF NOT EXISTS public.fornecedores (
  id BIGSERIAL PRIMARY KEY,
  codigo TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  nif TEXT,
  contacto_email TEXT,
  contacto_telefone TEXT,
  morada TEXT,
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now()
);

-- Tabela de Produtos
CREATE TABLE IF NOT EXISTS public.produtos (
  id BIGSERIAL PRIMARY KEY,
  sku TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  descricao TEXT,
  subcategoria_id BIGINT REFERENCES public.subcategorias(id),
  fornecedor_id BIGINT REFERENCES public.fornecedores(id),
  marca TEXT,
  cor TEXT,
  tamanho TEXT,
  preco_custo DECIMAL(10,2),
  preco_venda DECIMAL(10,2),
  status TEXT DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo', 'draft')),
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now()
);

-- Índices para produtos
CREATE INDEX IF NOT EXISTS idx_produtos_sku ON public.produtos(sku);
CREATE INDEX IF NOT EXISTS idx_produtos_status ON public.produtos(status);
CREATE INDEX IF NOT EXISTS idx_produtos_subcategoria ON public.produtos(subcategoria_id);

-- Tabela de Códigos de Barras (EAN/GTIN)
CREATE TABLE IF NOT EXISTS public.product_barcodes (
  id BIGSERIAL PRIMARY KEY,
  produto_id BIGINT NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  ean TEXT NOT NULL UNIQUE,
  nivel TEXT DEFAULT 'unit' CHECK (nivel IN ('unit', 'box', 'pallet')),
  pack_qty INTEGER DEFAULT 1,
  criado_em TIMESTAMPTZ DEFAULT now()
);

-- Índice para barcodes
CREATE INDEX IF NOT EXISTS idx_barcodes_ean ON public.product_barcodes(ean);
CREATE INDEX IF NOT EXISTS idx_barcodes_produto ON public.product_barcodes(produto_id);

-- Tabela de Estoques
CREATE TABLE IF NOT EXISTS public.estoques (
  id BIGSERIAL PRIMARY KEY,
  produto_id BIGINT NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  armazem_id BIGINT NOT NULL REFERENCES public.armazens(id) ON DELETE CASCADE,
  quantidade DECIMAL(10,2) DEFAULT 0 CHECK (quantidade >= 0),
  quantidade_reservada DECIMAL(10,2) DEFAULT 0 CHECK (quantidade_reservada >= 0),
  atualizado_em TIMESTAMPTZ DEFAULT now(),
  UNIQUE(produto_id, armazem_id)
);

-- Índices para estoques
CREATE INDEX IF NOT EXISTS idx_estoques_produto ON public.estoques(produto_id);
CREATE INDEX IF NOT EXISTS idx_estoques_armazem ON public.estoques(armazem_id);

-- Tabela de Movimentações de Estoque
CREATE TABLE IF NOT EXISTS public.movimentacao_estoque (
  id BIGSERIAL PRIMARY KEY,
  produto_id BIGINT NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  armazem_origem_id BIGINT REFERENCES public.armazens(id),
  armazem_destino_id BIGINT REFERENCES public.armazens(id),
  tipo_movimentacao TEXT NOT NULL CHECK (tipo_movimentacao IN ('entrada', 'saida', 'transferencia')),
  quantidade DECIMAL(10,2) NOT NULL CHECK (quantidade > 0),
  usuario TEXT NOT NULL,
  observacoes TEXT,
  timestamp TIMESTAMPTZ DEFAULT now(),
  sync_status TEXT DEFAULT 'sincronizado' CHECK (sync_status IN ('pendente', 'sincronizado', 'erro')),
  hash_idempotencia TEXT UNIQUE,
  criado_em TIMESTAMPTZ DEFAULT now()
);

-- Índices para movimentações
CREATE INDEX IF NOT EXISTS idx_movimentacao_produto ON public.movimentacao_estoque(produto_id);
CREATE INDEX IF NOT EXISTS idx_movimentacao_timestamp ON public.movimentacao_estoque(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_movimentacao_tipo ON public.movimentacao_estoque(tipo_movimentacao);
CREATE INDEX IF NOT EXISTS idx_movimentacao_hash ON public.movimentacao_estoque(hash_idempotencia);

-- ============================================
-- FUNCTIONS E TRIGGERS
-- ============================================

-- Function para atualizar timestamp
CREATE OR REPLACE FUNCTION public.atualizar_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para atualizar timestamps
CREATE TRIGGER trigger_atualizar_armazens
  BEFORE UPDATE ON public.armazens
  FOR EACH ROW
  EXECUTE FUNCTION public.atualizar_timestamp();

CREATE TRIGGER trigger_atualizar_produtos
  BEFORE UPDATE ON public.produtos
  FOR EACH ROW
  EXECUTE FUNCTION public.atualizar_timestamp();

CREATE TRIGGER trigger_atualizar_fornecedores
  BEFORE UPDATE ON public.fornecedores
  FOR EACH ROW
  EXECUTE FUNCTION public.atualizar_timestamp();

-- ============================================
-- RPC: Processar Movimentação (Transação Atômica)
-- ============================================

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
RETURNS JSON AS $$
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
    IF EXISTS (SELECT 1 FROM public.movimentacao_estoque WHERE hash_idempotencia = p_hash_idempotencia) THEN
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
    INSERT INTO public.estoques (produto_id, armazem_id, quantidade)
    VALUES (p_produto_id, p_origem_id, 0)
    ON CONFLICT (produto_id, armazem_id) DO NOTHING;

    -- Verificar estoque disponível
    SELECT quantidade INTO v_estoque_origem
    FROM public.estoques
    WHERE produto_id = p_produto_id AND armazem_id = p_origem_id;

    IF v_estoque_origem < p_quantidade THEN
      RAISE EXCEPTION 'Estoque insuficiente. Disponível: %, Necessário: %', v_estoque_origem, p_quantidade;
    END IF;

    -- Decrementar
    UPDATE public.estoques
    SET quantidade = quantidade - p_quantidade,
        atualizado_em = now()
    WHERE produto_id = p_produto_id AND armazem_id = p_origem_id;
  END IF;

  -- ENTRADA ou TRANSFERÊNCIA: Incrementar destino
  IF p_tipo IN ('entrada', 'transferencia') THEN
    INSERT INTO public.estoques (produto_id, armazem_id, quantidade)
    VALUES (p_produto_id, p_destino_id, p_quantidade)
    ON CONFLICT (produto_id, armazem_id) 
    DO UPDATE SET 
      quantidade = public.estoques.quantidade + EXCLUDED.quantidade,
      atualizado_em = now();
  END IF;

  -- Registar movimentação
  INSERT INTO public.movimentacao_estoque (
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
      FROM public.estoques e
      JOIN public.armazens a ON a.id = e.armazem_id
      WHERE e.produto_id = p_produto_id
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Activar RLS em todas as tabelas
ALTER TABLE public.armazens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subcategorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_barcodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estoques ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimentacao_estoque ENABLE ROW LEVEL SECURITY;

-- Políticas: Permitir leitura para utilizadores autenticados
CREATE POLICY "Utilizadores autenticados podem ler armazens"
  ON public.armazens FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Utilizadores autenticados podem ler categorias"
  ON public.categorias FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Utilizadores autenticados podem ler subcategorias"
  ON public.subcategorias FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Utilizadores autenticados podem ler fornecedores"
  ON public.fornecedores FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Utilizadores autenticados podem ler produtos"
  ON public.produtos FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Utilizadores autenticados podem ler barcodes"
  ON public.product_barcodes FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Utilizadores autenticados podem ler estoques"
  ON public.estoques FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Utilizadores autenticados podem ler movimentacoes"
  ON public.movimentacao_estoque FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Políticas: Permitir escrita (apenas via Edge Functions - service_role)
-- As operações de escrita serão controladas pelas Edge Functions

-- ============================================
-- DADOS DE EXEMPLO (opcional - remover em produção)
-- ============================================

-- Armazéns
INSERT INTO public.armazens (codigo, nome, morada) VALUES
  ('ARM01', 'Armazém Principal', 'Rua do Carmo, 123'),
  ('ARM02', 'Loja do Carmo', 'Praça do Comércio, 45'),
  ('ARM03', 'Depósito Norte', 'Zona Industrial')
ON CONFLICT (codigo) DO NOTHING;

-- Categorias
INSERT INTO public.categorias (nome, descricao) VALUES
  ('Calçado', 'Sapatos e calçado em geral'),
  ('Acessórios', 'Cintos, carteiras, etc')
ON CONFLICT (nome) DO NOTHING;

-- Subcategorias
INSERT INTO public.subcategorias (categoria_id, nome) VALUES
  (1, 'Sapatos Homem'),
  (1, 'Sapatos Mulher'),
  (2, 'Cintos')
ON CONFLICT DO NOTHING;

-- Fornecedores
INSERT INTO public.fornecedores (codigo, nome, nif) VALUES
  ('FOR001', 'Fornecedor Exemplo Lda', '123456789')
ON CONFLICT (codigo) DO NOTHING;