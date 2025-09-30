-- Create reference tables for product attributes
CREATE TABLE IF NOT EXISTS public.tipo_de_construcao (
  id BIGSERIAL PRIMARY KEY,
  nome TEXT NOT NULL UNIQUE,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tipo_de_sola (
  id BIGSERIAL PRIMARY KEY,
  nome TEXT NOT NULL UNIQUE,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tipo_de_pele (
  id BIGSERIAL PRIMARY KEY,
  nome TEXT NOT NULL UNIQUE,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cores (
  id BIGSERIAL PRIMARY KEY,
  nome TEXT NOT NULL UNIQUE,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tamanhos (
  id BIGSERIAL PRIMARY KEY,
  numero TEXT NOT NULL UNIQUE,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.formas (
  id BIGSERIAL PRIMARY KEY,
  nome TEXT NOT NULL UNIQUE,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.designs (
  id BIGSERIAL PRIMARY KEY,
  nome TEXT NOT NULL UNIQUE,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add foreign key columns to produtos table
ALTER TABLE public.produtos 
  ADD COLUMN IF NOT EXISTS tipo_de_construcao_id BIGINT REFERENCES public.tipo_de_construcao(id),
  ADD COLUMN IF NOT EXISTS tipo_de_sola_id BIGINT REFERENCES public.tipo_de_sola(id),
  ADD COLUMN IF NOT EXISTS tipo_de_pele_id BIGINT REFERENCES public.tipo_de_pele(id),
  ADD COLUMN IF NOT EXISTS cores_id BIGINT REFERENCES public.cores(id),
  ADD COLUMN IF NOT EXISTS tamanhos_id BIGINT REFERENCES public.tamanhos(id),
  ADD COLUMN IF NOT EXISTS formas_id BIGINT REFERENCES public.formas(id),
  ADD COLUMN IF NOT EXISTS designs_id BIGINT REFERENCES public.designs(id),
  ADD COLUMN IF NOT EXISTS armazem_id BIGINT REFERENCES public.armazens(id);

-- Enable RLS on new tables
ALTER TABLE public.tipo_de_construcao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tipo_de_sola ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tipo_de_pele ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tamanhos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.formas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.designs ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users to read
CREATE POLICY "Authenticated users can read tipo_de_construcao"
  ON public.tipo_de_construcao FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read tipo_de_sola"
  ON public.tipo_de_sola FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read tipo_de_pele"
  ON public.tipo_de_pele FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read cores"
  ON public.cores FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read tamanhos"
  ON public.tamanhos FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read formas"
  ON public.formas FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read designs"
  ON public.designs FOR SELECT
  TO authenticated
  USING (true);

-- Create policies for elevated users to insert
CREATE POLICY "Elevated users can insert tipo_de_construcao"
  ON public.tipo_de_construcao FOR INSERT
  TO authenticated
  WITH CHECK (has_elevated_access(auth.uid()));

CREATE POLICY "Elevated users can insert tipo_de_sola"
  ON public.tipo_de_sola FOR INSERT
  TO authenticated
  WITH CHECK (has_elevated_access(auth.uid()));

CREATE POLICY "Elevated users can insert tipo_de_pele"
  ON public.tipo_de_pele FOR INSERT
  TO authenticated
  WITH CHECK (has_elevated_access(auth.uid()));

CREATE POLICY "Elevated users can insert cores"
  ON public.cores FOR INSERT
  TO authenticated
  WITH CHECK (has_elevated_access(auth.uid()));

CREATE POLICY "Elevated users can insert tamanhos"
  ON public.tamanhos FOR INSERT
  TO authenticated
  WITH CHECK (has_elevated_access(auth.uid()));

CREATE POLICY "Elevated users can insert formas"
  ON public.formas FOR INSERT
  TO authenticated
  WITH CHECK (has_elevated_access(auth.uid()));

CREATE POLICY "Elevated users can insert designs"
  ON public.designs FOR INSERT
  TO authenticated
  WITH CHECK (has_elevated_access(auth.uid()));