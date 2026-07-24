import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Lock, Mail, KeyRound, ArrowLeft, Loader2, Eye, EyeOff, Sun, Moon } from 'lucide-react';
import { toast } from 'sonner';
import mooviLogoLogin from '@/assets/moovi-logo-login.png';
import mooviLogoLight from '@/assets/moovi-logo-light.png';
import { useTheme } from '@/hooks/use-theme';

type Step = 'email' | 'password' | 'otp' | 'create-password';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const N8N_SEND = 'https://n8n.fisherai.shop/webhook/solicitar-codigo-login';
const N8N_VERIFY = 'https://n8n.fisherai.shop/webhook/validar-codigo-login';

async function callEdge(fnName: string, body: Record<string, unknown>) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${fnName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Erro desconhecido');
  return data;
}

const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { theme, setTheme } = useTheme();

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState<string>('');
  const [userId, setUserId] = useState<string>('');
  const [senha, setSenha] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmSenha, setConfirmSenha] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const normalizedEmail = email.trim().toLowerCase();

  const handleCheckEmail = async () => {
    if (!isValidEmail(email)) {
      toast.error('Digite um e-mail válido');
      return;
    }
    setLoading(true);
    try {
      const data = await callEdge('auth-check-email', { email: normalizedEmail });

      if (!data?.exists || !data?.active) {
        toast.error('Assinatura não encontrada ou inativa.');
        return;
      }

      setTelefone(String(data.telefone ?? ''));
      setUserId(String(data.user_id ?? ''));

      if (data.has_password) {
        setStep('password');
      } else {
        toast.info('Primeiro acesso detectado. Enviando código...');
        await sendOtp();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao verificar e-mail';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!senha) { toast.error('Digite sua senha'); return; }
    setLoading(true);
    try {
      const data = await callEdge('auth-login-email', { email: normalizedEmail, senha });
      const tel = String(data.telefone ?? telefone);
      if (!tel) throw new Error('Telefone do usuário não encontrado.');
      login(data.token, String(data.user_id), tel);
      toast.success('Login realizado com sucesso!');
      navigate('/');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Senha incorreta';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const sendOtp = async () => {
    const res = await fetch(N8N_SEND, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: normalizedEmail }),
    });
    if (!res.ok) throw new Error('Não foi possível enviar o código.');
    toast.success('Código enviado para seu e-mail!');
    setOtp(['', '', '', '', '', '']);
    setStep('otp');
  };

  const handleForgotPassword = async () => {
    setLoading(true);
    try {
      await sendOtp();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao enviar código';
      toast.error(msg);
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
      const res = await fetch(N8N_VERIFY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail, codigo: code }),
      });
      if (!res.ok) {
        toast.error('Código inválido ou expirado.');
        return;
      }
      toast.success('Código verificado!');
      setStep('create-password');
    } catch {
      toast.error('Código inválido ou expirado.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePassword = async () => {
    if (novaSenha.length < 6) { toast.error('A senha deve ter pelo menos 6 caracteres'); return; }
    if (novaSenha !== confirmSenha) { toast.error('As senhas não coincidem'); return; }
    setLoading(true);
    try {
      const data = await callEdge('auth-set-password-email', { email: normalizedEmail, senha: novaSenha });
      const tel = String(data.telefone ?? telefone);
      if (!tel) throw new Error('Telefone do usuário não encontrado.');
      login(data.token, String(data.user_id), tel);
      toast.success('Senha criada com sucesso!');
      navigate('/');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao criar senha';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter') action();
  };

  const backToEmail = () => {
    setStep('email');
    setSenha('');
    setOtp(['', '', '', '', '', '']);
    setNovaSenha('');
    setConfirmSenha('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-xl border-0 relative">
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-3 right-3 h-8 w-8 z-10"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          aria-label="Alternar tema"
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
        <CardHeader className="text-center space-y-2 pb-4">
          <div className="mx-auto w-20 h-20 flex items-center justify-center mb-2">
            <img src={theme === 'dark' ? mooviLogoLogin : mooviLogoLight} alt="Moovi" className="w-full h-full object-contain" />
          </div>
          <CardTitle className="text-2xl font-bold">Moovi</CardTitle>
          <CardDescription className="text-muted-foreground">
            {step === 'email' && 'Digite seu e-mail para continuar'}
            {step === 'password' && 'Digite sua senha'}
            {step === 'otp' && 'Digite o código enviado para seu e-mail'}
            {step === 'create-password' && 'Crie sua senha de acesso'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {step === 'email' && (
            <>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="email"
                  autoComplete="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, handleCheckEmail)}
                  className="pl-10 h-12 text-base"
                  autoFocus
                />
              </div>
              <Button onClick={handleCheckEmail} disabled={loading || !isValidEmail(email)} className="w-full h-12 text-base">
                {loading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Continuar'}
              </Button>
            </>
          )}

          {step === 'password' && (
            <>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm text-muted-foreground truncate">{normalizedEmail}</span>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
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
                <Button variant="ghost" size="sm" onClick={backToEmail}>
                  <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
                </Button>
                <Button variant="link" size="sm" onClick={handleForgotPassword} disabled={loading}>
                  Esqueci minha senha
                </Button>
              </div>
            </>
          )}

          {step === 'otp' && (
            <>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm text-muted-foreground truncate">{normalizedEmail}</span>
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
                {loading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Validar Código'}
              </Button>
              <div className="flex items-center justify-between">
                <Button variant="ghost" size="sm" onClick={backToEmail}>
                  <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
                </Button>
                <Button variant="link" size="sm" onClick={handleForgotPassword} disabled={loading}>
                  Reenviar código
                </Button>
              </div>
            </>
          )}

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
                {loading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Salvar e Entrar'}
              </Button>
              <Button variant="ghost" size="sm" onClick={backToEmail}>
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
