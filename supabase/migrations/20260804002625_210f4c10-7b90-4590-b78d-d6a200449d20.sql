CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

CREATE INDEX IF NOT EXISTS idx_compromissos_telefone_data ON public.compromissos (telefone_usuario, data_hora_limite);
CREATE INDEX IF NOT EXISTS idx_compromissos_status ON public.compromissos (status);

SELECT cron.unschedule('expirar-compromissos') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'expirar-compromissos');

SELECT cron.schedule(
  'expirar-compromissos',
  '*/15 * * * *',
  $$UPDATE public.compromissos SET status = 'expirado', updated_at = now() WHERE status = 'pendente' AND data_hora_limite < now();$$
);