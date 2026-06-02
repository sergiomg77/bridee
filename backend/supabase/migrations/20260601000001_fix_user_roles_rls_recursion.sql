-- Fix infinite recursion in user_roles RLS admin policy.
-- The original policy queried user_roles from within a policy ON user_roles,
-- causing Postgres error 42P17. Replaced with a SECURITY DEFINER function
-- that Postgres evaluates outside the RLS context.

DROP POLICY IF EXISTS "user_roles_admin_all" ON public.user_roles;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  );
$$;

CREATE POLICY "user_roles_admin_all"
  ON public.user_roles FOR ALL
  USING (public.is_admin());
