-- Adicionar campos Nome Comercial e Tipo de Produto na tabela produtos
ALTER TABLE public.produtos 
ADD COLUMN IF NOT EXISTS nome_comercial TEXT,
ADD COLUMN IF NOT EXISTS tipo_produto TEXT;

-- Criar índice para melhor performance nas buscas
CREATE INDEX IF NOT EXISTS idx_produtos_nome_comercial ON public.produtos(nome_comercial);
CREATE INDEX IF NOT EXISTS idx_produtos_tipo_produto ON public.produtos(tipo_produto);