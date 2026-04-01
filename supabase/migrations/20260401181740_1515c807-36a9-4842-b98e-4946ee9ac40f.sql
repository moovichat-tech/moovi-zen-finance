
DROP POLICY IF EXISTS "Service role full access" ON public.usuarios;

CREATE POLICY "Service role only" ON public.usuarios
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);
