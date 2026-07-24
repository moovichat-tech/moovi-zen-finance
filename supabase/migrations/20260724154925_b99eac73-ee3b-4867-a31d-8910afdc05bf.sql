CREATE TABLE public.compromissos (
  id BIGSERIAL PRIMARY KEY,
  telefone_usuario VARCHAR NOT NULL,
  titulo VARCHAR NOT NULL,
  descricao TEXT,
  data_hora_limite TIMESTAMPTZ NOT NULL,
  status VARCHAR NOT NULL DEFAULT 'pendente',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_compromissos_telefone ON public.compromissos(telefone_usuario);
CREATE INDEX idx_compromissos_data ON public.compromissos(data_hora_limite);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.compromissos TO anon, authenticated;
GRANT ALL ON public.compromissos TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.compromissos_id_seq TO anon, authenticated, service_role;

ALTER TABLE public.compromissos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Compromissos open access" ON public.compromissos
  FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER update_compromissos_updated_at
  BEFORE UPDATE ON public.compromissos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();