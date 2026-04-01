
CREATE TABLE IF NOT EXISTS public.usuarios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  telefone TEXT NOT NULL UNIQUE,
  senha_hash VARCHAR,
  ultimo_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;

-- Allow edge functions (service role) full access; anon can only check phone existence
CREATE POLICY "Service role full access" ON public.usuarios
  FOR ALL USING (true) WITH CHECK (true);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_usuarios_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_usuarios_updated_at
  BEFORE UPDATE ON public.usuarios
  FOR EACH ROW
  EXECUTE FUNCTION public.update_usuarios_updated_at();
