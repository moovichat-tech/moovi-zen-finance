-- 1. compromissos: remove fully open policy, restrict to service_role
DROP POLICY IF EXISTS "Compromissos open access" ON public.compromissos;

REVOKE ALL ON public.compromissos FROM anon, authenticated;
GRANT ALL ON public.compromissos TO service_role;

CREATE POLICY "Service role manages compromissos"
ON public.compromissos
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 2. feedbacks_cancelamento: remove public insert, restrict to service_role
DROP POLICY IF EXISTS "Allow insert for everyone" ON public.feedbacks_cancelamento;

REVOKE ALL ON public.feedbacks_cancelamento FROM anon, authenticated;
GRANT ALL ON public.feedbacks_cancelamento TO service_role;

-- 3. SECURITY DEFINER trigger functions must not be callable via the API
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_usuarios_updated_at() FROM PUBLIC, anon, authenticated;