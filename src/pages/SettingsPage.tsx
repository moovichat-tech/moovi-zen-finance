import { useI18n } from '@/i18n/context';
import { useAuth } from '@/hooks/useAuth';
import { type Locale, type Currency, localeNames, localeFlags, currencySymbols } from '@/i18n/translations';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { User, Shield, Globe, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

const SettingsPage = () => {
  const { locale, currency, setLocale, setCurrency, t } = useI18n();
  const { token } = useAuth();
  const queryClient = useQueryClient();

  const [editName, setEditName] = useState('');
  const [nameLoaded, setNameLoaded] = useState(false);

  // Password dialog state
  const [pwOpen, setPwOpen] = useState(false);
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [showSenhaAtual, setShowSenhaAtual] = useState(false);
  const [showNovaSenha, setShowNovaSenha] = useState(false);
  const [showConfirmar, setShowConfirmar] = useState(false);

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  // Fetch profile
  const { data: perfil, isLoading } = useQuery({
    queryKey: ['perfil'],
    queryFn: async () => {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/get-perfil`, {
        method: 'POST',
        headers,
      });
      if (!res.ok) throw new Error('Erro ao carregar perfil');
      return res.json();
    },
    enabled: !!token,
  });

  // Set editName once loaded
  if (perfil && !nameLoaded) {
    setEditName(perfil.nome || '');
    setNameLoaded(true);
  }

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (nome: string) => {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/update-perfil`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ nome }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erro ao salvar');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['perfil'] });
      toast.success('Perfil salvo com sucesso!');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Update password mutation
  const updateSenhaMutation = useMutation({
    mutationFn: async (payload: { senhaAtual: string; novaSenha: string }) => {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/update-senha`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao alterar senha');
      return data;
    },
    onSuccess: () => {
      toast.success('Senha alterada com sucesso!');
      setPwOpen(false);
      setSenhaAtual('');
      setNovaSenha('');
      setConfirmarSenha('');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleSaveProfile = () => {
    if (!editName.trim()) {
      toast.error('Nome não pode estar vazio');
      return;
    }
    updateProfileMutation.mutate(editName.trim());
  };

  const handleChangePassword = () => {
    if (!senhaAtual || !novaSenha || !confirmarSenha) {
      toast.error('Preencha todos os campos');
      return;
    }
    if (novaSenha !== confirmarSenha) {
      toast.error('Nova senha e confirmação não coincidem');
      return;
    }
    if (novaSenha.length < 6) {
      toast.error('Nova senha deve ter pelo menos 6 caracteres');
      return;
    }
    updateSenhaMutation.mutate({ senhaAtual, novaSenha });
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-in-up">
      <div>
        <h2 className="text-xl font-semibold">{t.nav.settings}</h2>
        <p className="text-sm text-muted-foreground">Personalize sua experiência no Moovi</p>
      </div>

      {/* Profile */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <User className="h-4 w-4 text-primary" /> Perfil
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Nome</Label>
            <Input
              value={editName}
              onChange={e => setEditName(e.target.value)}
              placeholder={isLoading ? 'Carregando...' : ''}
              disabled={isLoading}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-muted-foreground">Telefone</Label>
            <Input
              value={perfil?.telefone || ''}
              disabled
              readOnly
              className="opacity-60 cursor-not-allowed"
            />
          </div>
        </div>
        <Button
          size="sm"
          onClick={handleSaveProfile}
          disabled={updateProfileMutation.isPending || isLoading}
        >
          {updateProfileMutation.isPending ? 'Salvando...' : t.common.save}
        </Button>
      </Card>

      {/* Language & Currency */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Globe className="h-4 w-4 text-primary" /> {t.common.language} & {t.common.currency}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>{t.common.language}</Label>
            <Select value={locale} onValueChange={v => setLocale(v as Locale)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.entries(localeNames) as [Locale, string][]).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{localeFlags[k]} {v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{t.common.currency}</Label>
            <Select value={currency} onValueChange={v => setCurrency(v as Currency)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.entries(currencySymbols) as [Currency, string][]).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{k} ({v})</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">Valores serão convertidos automaticamente</p>
          </div>
        </div>
      </Card>

      {/* Security */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Shield className="h-4 w-4 text-primary" /> Segurança
        </div>
        <div className="space-y-3">
          <Button variant="outline" size="sm" onClick={() => setPwOpen(true)}>
            Alterar senha
          </Button>
        </div>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/30 p-5 space-y-3">
        <p className="text-sm font-semibold text-destructive">Zona de Perigo</p>
        <p className="text-xs text-muted-foreground">Ações irreversíveis</p>
        <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/10">
          Excluir minha conta
        </Button>
      </Card>

      {/* Password Change Dialog */}
      <Dialog open={pwOpen} onOpenChange={setPwOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Alterar Senha</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Senha Atual</Label>
              <div className="relative">
                <Input
                  type={showSenhaAtual ? 'text' : 'password'}
                  value={senhaAtual}
                  onChange={e => setSenhaAtual(e.target.value)}
                  placeholder="••••••"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setShowSenhaAtual(!showSenhaAtual)}
                >
                  {showSenhaAtual ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Separator />
            <div className="space-y-1.5">
              <Label>Nova Senha</Label>
              <div className="relative">
                <Input
                  type={showNovaSenha ? 'text' : 'password'}
                  value={novaSenha}
                  onChange={e => setNovaSenha(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setShowNovaSenha(!showNovaSenha)}
                >
                  {showNovaSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Confirmar Nova Senha</Label>
              <div className="relative">
                <Input
                  type={showConfirmar ? 'text' : 'password'}
                  value={confirmarSenha}
                  onChange={e => setConfirmarSenha(e.target.value)}
                  placeholder="Repita a nova senha"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setShowConfirmar(!showConfirmar)}
                >
                  {showConfirmar ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPwOpen(false)}>Cancelar</Button>
            <Button onClick={handleChangePassword} disabled={updateSenhaMutation.isPending}>
              {updateSenhaMutation.isPending ? 'Salvando...' : 'Alterar Senha'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SettingsPage;
