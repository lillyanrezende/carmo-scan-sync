-- Add INSERT and UPDATE policies for produtos table
-- Only users with elevated access (admin/manager) can insert/update products

CREATE POLICY "Elevated users can insert products"
ON public.produtos
FOR INSERT
TO authenticated
WITH CHECK (has_elevated_access(auth.uid()));

CREATE POLICY "Elevated users can update products"
ON public.produtos
FOR UPDATE
TO authenticated
USING (has_elevated_access(auth.uid()))
WITH CHECK (has_elevated_access(auth.uid()));