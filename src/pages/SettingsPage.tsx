import { useI18n } from '@/i18n/context';
import { useData } from '@/store/DataContext';
import { type Locale, type Currency, localeNames, localeFlags, currencySymbols } from '@/i18n/translations';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { User, Shield, Globe } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

const SettingsPage = () => {
  const { locale, currency, setLocale, setCurrency, t } = useI18n();
  const { profile, updateProfile } = useData();
  const [localProfile, setLocalProfile] = useState(profile);

  const handleSaveProfile = () => {
    updateProfile(localProfile);
    toast.success('Perfil salvo com sucesso!');
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
            <Input value={localProfile.name} onChange={e => setLocalProfile({ ...localProfile, name: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-muted-foreground">Telefone</Label>
            <Input value={localProfile.phone} disabled className="opacity-60 cursor-not-allowed" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>E-mail</Label>
          <Input value={localProfile.email} onChange={e => setLocalProfile({ ...localProfile, email: e.target.value })} />
        </div>
        <Button size="sm" onClick={handleSaveProfile}>{t.common.save}</Button>
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
          <Button variant="outline" size="sm">Alterar senha</Button>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Autenticação de dois fatores</p>
              <p className="text-xs text-muted-foreground">Adicione uma camada extra de segurança</p>
            </div>
            <Switch />
          </div>
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
    </div>
  );
};

export default SettingsPage;
