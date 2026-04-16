import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Lock, KeyRound, ArrowLeft, Loader2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { CountryCodeSelector, countries, applyMask, Country } from '@/components/CountryCodeSelector';
import mooviLogoLogin from '@/assets/moovi-logo-login.png';

type Step = 'phone' | 'password' | 'otp' | 'create-password';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

async function callEdge(fnName: string, body: Record<string, string>) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${fnName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Erro desconhecido');
  return data;
}

const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [step, setStep] = useState<Step>('phone');
  const [country, setCountry] = useState<Country>(countries[0]); // Brazil default
  const [phoneDigits, setPhoneDigits] = useState('');
  const [senha, setSenha] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmSenha, setConfirmSenha] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Build the clean full number: DDI + local digits (all numeric, no special chars)
  const fullPhone = country.ddi.replace(/\D/g, '') + phoneDigits.replace(/\D/g, '');

  const displayPhone = applyMask(phoneDigits.replace(/\D/g, ''), country.mask, country.maxDigits);
  const displayFull = `+${country.ddi} ${displayPhone}`;

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    if (raw.length <= country.maxDigits) setPhoneDigits(raw);
  };

  const localDigits = phoneDigits.replace(/\D/g, '');
  const isPhoneValid = localDigits.length >= country.maxDigits - 1;

  const handleCheckPhone = async () => {
    if (!isPhoneValid) {
      toast.error('Digite um telefone válido');
      return;
    }
    setLoading(true);
    try {
      const data = await callEdge('auth-check-phone', { telefone: fullPhone });
      if (data.exists && data.has_password) {
        setStep('password');
      } else {
        await callEdge('auth-send-otp', { telefone: fullPhone });
        toast.success('Código enviado para seu WhatsApp!');
        setStep('otp');
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao verificar telefone');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!senha) { toast.error('Digite sua senha'); return; }
    setLoading(true);
    try {
      const data = await callEdge('auth-login-password', { telefone: fullPhone, senha });
      login(data.token, data.user_id, fullPhone);
      toast.success('Login realizado com sucesso!');
      navigate('/');
    } catch (err: any) {
      toast.error(err.message || 'Senha incorreta');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setLoading(true);
    try {
      await callEdge('auth-send-otp', { telefone: fullPhone });
      toast.success('Código enviado para seu WhatsApp!');
      setStep('otp');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao enviar código');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) value = value.slice(-1);
    if (value && !/^\d$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) otpRefs.current[index - 1]?.focus();
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) { setOtp(pasted.split('')); otpRefs.current[5]?.focus(); e.preventDefault(); }
  };

  const handleVerifyOtp = async () => {
    const code = otp.join('');
    if (code.length !== 6) { toast.error('Digite o código completo'); return; }
    setLoading(true);
    try {
      await callEdge('auth-verify-otp', { telefone: fullPhone, codigo: code });
      toast.success('Código verificado!');
      setStep('create-password');
    } catch (err: any) {
      toast.error(err.message || 'Código inválido');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePassword = async () => {
    if (novaSenha.length < 6) { toast.error('A senha deve ter pelo menos 6 caracteres'); return; }
    if (novaSenha !== confirmSenha) { toast.error('As senhas não coincidem'); return; }
    setLoading(true);
    try {
      const data = await callEdge('auth-set-password', { telefone: fullPhone, senha: novaSenha });
      login(data.token, data.user_id, fullPhone);
      toast.success('Senha criada com sucesso!');
      navigate('/');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao criar senha');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter') action();
  };

  return (
    <div className="dark min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-xl border-0">
        <CardHeader className="text-center space-y-2 pb-4">
          <div className="mx-auto w-20 h-20 flex items-center justify-center mb-2">
            <img src={mooviLogoLogin} alt="Moovi" className="w-full h-full object-contain" />
          </div>
          <CardTitle className="text-2xl font-bold">Moovi</CardTitle>
          <CardDescription className="text-muted-foreground">
            {step === 'phone' && 'Digite seu telefone para continuar'}
            {step === 'password' && 'Digite sua senha'}
            {step === 'otp' && 'Digite o código enviado para seu WhatsApp'}
            {step === 'create-password' && 'Crie sua senha definitiva'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* PHONE STEP */}
          {step === 'phone' && (
            <>
              <div className="flex">
                <CountryCodeSelector selected={country} onSelect={setCountry} />
                <Input
                  placeholder={country.mask.replace(/#/g, '9')}
                  value={applyMask(phoneDigits, country.mask, country.maxDigits)}
                  onChange={handlePhoneChange}
                  onKeyDown={(e) => handleKeyDown(e, handleCheckPhone)}
                  className="rounded-l-none h-12 text-base flex-1"
                  autoFocus
                />
              </div>
              <Button onClick={handleCheckPhone} disabled={loading || !isPhoneValid} className="w-full h-12 text-base">
                {loading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Continuar'}
              </Button>
            </>
          )}

          {/* PASSWORD STEP */}
          {step === 'password' && (
            <>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                <span className="text-lg leading-none">{country.flag}</span>
                <span className="text-sm text-muted-foreground">{displayFull}</span>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Sua senha"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, handleLogin)}
                  className="pl-10 pr-10 h-12 text-base"
                  autoFocus
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <Button onClick={handleLogin} disabled={loading || !senha} className="w-full h-12 text-base">
                {loading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Entrar'}
              </Button>
              <div className="flex items-center justify-between">
                <Button variant="ghost" size="sm" onClick={() => { setStep('phone'); setSenha(''); }}>
                  <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
                </Button>
                <Button variant="link" size="sm" onClick={handleForgotPassword} disabled={loading}>
                  Esqueci minha senha
                </Button>
              </div>
            </>
          )}

          {/* OTP STEP */}
          {step === 'otp' && (
            <>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                <span className="text-lg leading-none">{country.flag}</span>
                <span className="text-sm text-muted-foreground">{displayFull}</span>
              </div>
              <div className="flex justify-center gap-2" onPaste={handleOtpPaste}>
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => { otpRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    className="w-12 h-14 text-center text-xl font-bold border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                    autoFocus={i === 0}
                  />
                ))}
              </div>
              <Button onClick={handleVerifyOtp} disabled={loading || otp.join('').length !== 6} className="w-full h-12 text-base">
                {loading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Verificar Código'}
              </Button>
              <div className="flex items-center justify-between">
                <Button variant="ghost" size="sm" onClick={() => { setStep('phone'); setOtp(['','','','','','']); }}>
                  <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
                </Button>
                <Button variant="link" size="sm" onClick={handleForgotPassword} disabled={loading}>
                  Reenviar código
                </Button>
              </div>
            </>
          )}

          {/* CREATE PASSWORD STEP */}
          {step === 'create-password' && (
            <>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                <KeyRound className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Crie uma senha para acessos futuros</span>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type={showNewPassword ? 'text' : 'password'}
                  placeholder="Nova senha (mín. 6 caracteres)"
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  className="pl-10 pr-10 h-12 text-base"
                  autoFocus
                />
                <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type={showNewPassword ? 'text' : 'password'}
                  placeholder="Confirme a senha"
                  value={confirmSenha}
                  onChange={(e) => setConfirmSenha(e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, handleCreatePassword)}
                  className="pl-10 h-12 text-base"
                />
              </div>
              {novaSenha && novaSenha.length < 6 && (
                <p className="text-xs text-destructive">Mínimo de 6 caracteres</p>
              )}
              {confirmSenha && novaSenha !== confirmSenha && (
                <p className="text-xs text-destructive">As senhas não coincidem</p>
              )}
              <Button
                onClick={handleCreatePassword}
                disabled={loading || novaSenha.length < 6 || novaSenha !== confirmSenha}
                className="w-full h-12 text-base"
              >
                {loading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Criar Senha e Entrar'}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => { setStep('phone'); setNovaSenha(''); setConfirmSenha(''); }}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Voltar ao início
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginPage;
