
CREATE TABLE public.feedbacks_cancelamento (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  telefone TEXT NOT NULL,
  motivo_principal TEXT NOT NULL,
  detalhes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.feedbacks_cancelamento ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow insert for everyone"
ON public.feedbacks_cancelamento
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Service role full access"
ON public.feedbacks_cancelamento
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS renovacao_automatica BOOLEAN NOT NULL DEFAULT true;
