-- Phase 1: Fix Critical Database Issues

-- Drop the problematic recursive RLS policy on user_roles
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;

-- Create a new non-recursive policy using the security definer function
CREATE POLICY "Admins can manage all roles"
ON public.user_roles
FOR ALL
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Assign admin role to the current authenticated user
-- First, we need to get the user_id for lillyanaloisemkt@gmail.com
DO $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Get the user_id for the email
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'lillyanaloisemkt@gmail.com';
  
  -- Insert admin role if user exists and doesn't already have it
  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role, created_by)
    VALUES (v_user_id, 'admin'::app_role, v_user_id)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END $$;

-- Phase 2: Implement Granular Data Access Controls for produtos table

-- Drop existing RLS policy on produtos
DROP POLICY IF EXISTS "Utilizadores autenticados podem ler produtos" ON public.produtos;

-- Create view for basic product info (without pricing)
CREATE OR REPLACE VIEW public.produtos_public AS
SELECT 
  id,
  sku,
  nome,
  descricao,
  marca,
  cor,
  tamanho,
  status,
  subcategoria_id,
  fornecedor_id,
  criado_em,
  atualizado_em
FROM public.produtos;

-- Allow all authenticated users to see basic product info
CREATE POLICY "Authenticated users can view basic product info"
ON public.produtos
FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND NOT (
    -- Hide pricing columns unless user has elevated access
    public.has_elevated_access(auth.uid()) = false
    AND (preco_custo IS NOT NULL OR preco_venda IS NOT NULL)
  )
);

-- Create a security definer function to get product data with appropriate access control
CREATE OR REPLACE FUNCTION public.get_product_safe(p_produto_id bigint)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result json;
  v_has_elevated_access boolean;
BEGIN
  -- Check if user has elevated access
  v_has_elevated_access := public.has_elevated_access(auth.uid());
  
  -- Return product data with or without pricing based on access level
  IF v_has_elevated_access THEN
    SELECT json_build_object(
      'id', id,
      'sku', sku,
      'nome', nome,
      'descricao', descricao,
      'marca', marca,
      'cor', cor,
      'tamanho', tamanho,
      'status', status,
      'subcategoria_id', subcategoria_id,
      'fornecedor_id', fornecedor_id,
      'preco_custo', preco_custo,
      'preco_venda', preco_venda,
      'criado_em', criado_em,
      'atualizado_em', atualizado_em
    ) INTO v_result
    FROM produtos
    WHERE id = p_produto_id;
  ELSE
    SELECT json_build_object(
      'id', id,
      'sku', sku,
      'nome', nome,
      'descricao', descricao,
      'marca', marca,
      'cor', cor,
      'tamanho', tamanho,
      'status', status,
      'subcategoria_id', subcategoria_id,
      'criado_em', criado_em,
      'atualizado_em', atualizado_em
    ) INTO v_result
    FROM produtos
    WHERE id = p_produto_id;
  END IF;
  
  RETURN v_result;
END;
$$;

-- Add helpful comments
COMMENT ON FUNCTION public.get_product_safe IS 'Returns product data with pricing info only for users with elevated access';
COMMENT ON VIEW public.produtos_public IS 'Public view of products without sensitive pricing information';

-- Create audit log table for sensitive operations
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id bigserial PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  action text NOT NULL,
  table_name text,
  record_id bigint,
  old_data jsonb,
  new_data jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Only admins can view audit logs"
ON public.audit_logs
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

COMMENT ON TABLE public.audit_logs IS 'Audit trail for sensitive operations in the system';