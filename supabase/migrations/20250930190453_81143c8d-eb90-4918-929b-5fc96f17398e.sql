-- ============================================
-- SECURITY FIX: Implement Role-Based Access Control
-- ============================================

-- 1. Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'operator', 'viewer');

-- 2. Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Users can view their own roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

-- Only admins can manage roles (insert/update/delete)
-- Note: This will be enforced after the has_role function is created
CREATE POLICY "Admins can manage all roles"
ON public.user_roles
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- 3. Create security definer function to check roles
-- This prevents RLS recursion issues
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  );
$$;

-- 4. Create helper function to check if user has any admin/manager role
CREATE OR REPLACE FUNCTION public.has_elevated_access(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'manager')
  );
$$;

-- 5. Update fornecedores RLS policy to restrict access
DROP POLICY IF EXISTS "Utilizadores autenticados podem ler fornecedores" ON public.fornecedores;

CREATE POLICY "Only admins and managers can access supplier data"
ON public.fornecedores
FOR SELECT
USING (public.has_elevated_access(auth.uid()));

-- Only admins can modify supplier data
CREATE POLICY "Only admins can modify supplier data"
ON public.fornecedores
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- 6. Also secure other sensitive tables
-- Armazens (warehouses) - restrict to elevated access
DROP POLICY IF EXISTS "Utilizadores autenticados podem ler armazens" ON public.armazens;

CREATE POLICY "Only elevated users can access warehouses"
ON public.armazens
FOR SELECT
USING (public.has_elevated_access(auth.uid()));

CREATE POLICY "Only admins can modify warehouses"
ON public.armazens
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- 7. Create index for performance
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_role ON public.user_roles(role);

-- 8. Comment documentation
COMMENT ON TABLE public.user_roles IS 'Stores user role assignments for access control';
COMMENT ON FUNCTION public.has_role IS 'Security definer function to check if user has specific role';
COMMENT ON FUNCTION public.has_elevated_access IS 'Check if user has admin or manager role';

-- 9. Insert initial admin user (use the current authenticated user if available)
-- Note: You'll need to manually assign the first admin role via SQL or Supabase dashboard
-- Example: INSERT INTO public.user_roles (user_id, role) VALUES ('<your-user-id>', 'admin');