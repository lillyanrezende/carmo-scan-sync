-- Adicionar novos campos à tabela produtos para armazenar informações do código de barras
ALTER TABLE public.produtos
ADD COLUMN IF NOT EXISTS design TEXT,
ADD COLUMN IF NOT EXISTS sola TEXT,
ADD COLUMN IF NOT EXISTS tipo_pele TEXT,
ADD COLUMN IF NOT EXISTS forma_sapatos TEXT,
ADD COLUMN IF NOT EXISTS tipo_construcao TEXT;

-- Adicionar comentários para documentar os campos
COMMENT ON COLUMN public.produtos.design IS 'Design do produto extraído do código de barras';
COMMENT ON COLUMN public.produtos.sola IS 'Tipo de sola extraído do código de barras';
COMMENT ON COLUMN public.produtos.tipo_pele IS 'Tipo de pele/material extraído do código de barras';
COMMENT ON COLUMN public.produtos.forma_sapatos IS 'Forma do sapato extraída do código de barras';
COMMENT ON COLUMN public.produtos.tipo_construcao IS 'Tipo de construção extraída do código de barras';