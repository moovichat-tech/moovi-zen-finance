import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Mail, ArrowLeft, Loader2, Sparkles, RefreshCw, ExternalLink, Sun, Moon } from 'lucide-react';
import { toast } from 'sonner';
import mooviLogoLogin from '@/assets/moovi-logo-login.png';
import mooviLogoLight from '@/assets/moovi-logo-light.png';
import { useTheme } from '@/hooks/use-theme';

type Step = 'email' | 'otp';

const N8N_REQUEST_URL = 'https://n8n.fisherai.shop/webhook-test/solicitar-codigo-login';
const N8N_VALIDATE_URL = 'https://n8n.fisherai.shop/webhook-test/validar-codigo-login';

const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { theme, setTheme } = useTheme();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [showNotFoundModal, setShowNotFoundModal] = useState(false);
  const [showInactiveModal, setShowInactiveModal] = useState(false);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const handleRequestCode = async () => {
    if (!isEmailValid) {
      toast.error('Digite um e-mail válido');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(N8N_REQUEST_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.status !== 'sucesso') {
        if (data?.status === 'nao_encontrado' || res.status === 404) {
          setShowNotFoundModal(true);
          return;
        }
        throw new Error(data?.mensagem || data?.error || 'Falha ao enviar o código');
      }
      toast.success('Código enviado para seu e-mail!');
      setStep('otp');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao solicitar código');
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

  const handleValidateCode = async () => {
    const code = otp.join('');
    if (code.length !== 6) { toast.error('Digite o código completo'); return; }
    setLoading(true);
    try {
      const res = await fetch(N8N_VALIDATE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), codigo: code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.status !== 'sucesso' || !data?.usuario) {
        throw new Error(data?.mensagem || data?.error || 'Código inválido ou expirado');
      }

      const usuario = data.usuario;
      const status = String(usuario.status ?? '').trim().toLowerCase();
      if (status !== 'ativo') {
        setShowInactiveModal(true);
        return;
      }

      const telefone = String(usuario.telefone ?? '').replace(/\D/g, '');
      if (!telefone) {
        toast.error('Sessão inválida: telefone não retornado pelo servidor');
        return;
      }

      // Persiste a sessão. O telefone é essencial para todas as consultas
      // do dashboard (transações, contas, cartões, compromissos).
      login(data.token || '', String(usuario.id ?? ''), telefone);
      try {
        localStorage.setItem('moovi_usuario', JSON.stringify({
          id: usuario.id,
          nome: usuario.nome,
          email: email.trim(),
          telefone,
          plano: usuario.plano,
          status: usuario.status,
        }));
      } catch {}

      toast.success(`Bem-vindo${usuario.nome ? `, ${usuario.nome}` : ''}!`);
      navigate('/');
    } catch (err: any) {
      toast.error(err.message || 'Código inválido');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter') action();
  };

  const resetToEmail = () => {
    setStep('email');
    setOtp(['', '', '', '', '', '']);
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
            {step === 'email' && 'Digite seu e-mail para receber o código de acesso'}
            {step === 'otp' && `Digite o código enviado para ${email}`}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {step === 'email' && (
            <>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, handleRequestCode)}
                  className="pl-10 h-12 text-base"
                  autoFocus
                />
              </div>
              <Button
                onClick={handleRequestCode}
                disabled={loading || !isEmailValid}
                className="w-full h-12 text-base"
              >
                {loading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Enviar Código de Acesso'}
              </Button>
            </>
          )}

          {step === 'otp' && (
            <>
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
              <Button
                onClick={handleValidateCode}
                disabled={loading || otp.join('').length !== 6}
                className="w-full h-12 text-base"
              >
                {loading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Validar e Entrar'}
              </Button>
              <div className="flex items-center justify-between">
                <Button variant="ghost" size="sm" onClick={resetToEmail}>
                  <ArrowLeft className="h-4 w-4 mr-1" /> Usar outro e-mail
                </Button>
                <Button variant="link" size="sm" onClick={handleRequestCode} disabled={loading}>
                  Reenviar código
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Usuário não encontrado */}
      <Dialog open={showNotFoundModal} onOpenChange={setShowNotFoundModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <DialogTitle className="text-center text-xl">Comece a organizar suas finanças</DialogTitle>
            <DialogDescription className="text-center pt-2">
              Não encontramos um cadastro ativo com este e-mail. Que tal começar sua jornada agora?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center">
            <Button
              className="w-full h-12 text-base"
              onClick={() => {
                window.open('https://www.moovi.chat', '_blank', 'noopener,noreferrer');
                setShowNotFoundModal(false);
              }}
            >
              Criar conta no WhatsApp
              <ExternalLink className="h-4 w-4 ml-2" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Usuário Inativo/Cancelado */}
      <Dialog open={showInactiveModal} onOpenChange={setShowInactiveModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <RefreshCw className="h-6 w-6 text-primary" />
            </div>
            <DialogTitle className="text-center text-xl">Volte a ser organizado</DialogTitle>
            <DialogDescription className="text-center pt-2">
              Sua assinatura está inativa no momento. Reative seu plano para recuperar o acesso ao dashboard.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center">
            <Button
              className="w-full h-12 text-base"
              onClick={() => {
                window.open('https://www.moovi.chat', '_blank', 'noopener,noreferrer');
                setShowInactiveModal(false);
              }}
            >
              Reativar Plano
              <ExternalLink className="h-4 w-4 ml-2" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LoginPage;
