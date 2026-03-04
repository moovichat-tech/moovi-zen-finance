import { useState } from 'react';
import { useI18n } from '@/i18n/context';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Crown, Check, Zap, Shield, BarChart3, Bot, AlertTriangle, Gift, Heart } from 'lucide-react';

const plans = [
  {
    name: 'Mensal',
    priceMonth: 24.90,
    priceTotal: null,
    label: null,
    features: ['Lançamentos ilimitados', 'Contas ilimitadas', 'Cartões ilimitados', 'Relatórios avançados', 'Assistente IA', 'Exportação PDF/Excel'],
    current: true,
    popular: false,
  },
  {
    name: 'Anual',
    priceMonth: 19.00,
    priceTotal: 228.00,
    label: 'Economize 24%',
    features: ['Tudo do Mensal', 'Prioridade no suporte', 'Funcionalidades beta', 'Backup automático'],
    current: false,
    popular: true,
  },
  {
    name: 'Bianual',
    priceMonth: 14.90,
    priceTotal: 357.60,
    label: 'Melhor custo',
    features: ['Tudo do Anual', 'Multi-usuário', 'API integrada', 'WhatsApp Bot', 'Suporte prioritário'],
    current: false,
    popular: false,
  },
];

type CancelStep = 'initial' | 'reason' | 'offer' | 'survey' | 'confirm' | 'final';

const cancelReasons = [
  'Preço muito alto',
  'Não uso o suficiente',
  'Encontrei alternativa melhor',
  'Problemas técnicos',
  'Faltam funcionalidades',
  'Outro',
];

const SubscriptionPage = () => {
  const { formatCurrency } = useI18n();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelStep, setCancelStep] = useState<CancelStep>('initial');
  const [cancelReason, setCancelReason] = useState('');
  const [cancelFeedback, setCancelFeedback] = useState('');
  const [surveyRating, setSurveyRating] = useState('');

  const startCancel = () => {
    setCancelStep('initial');
    setCancelOpen(true);
  };

  const renderCancelContent = () => {
    switch (cancelStep) {
      case 'initial':
        return (
          <div className="space-y-4 text-center">
            <div className="flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-warning/10">
                <AlertTriangle className="h-8 w-8 text-warning" />
              </div>
            </div>
            <h3 className="text-lg font-semibold">Tem certeza que deseja cancelar?</h3>
            <p className="text-sm text-muted-foreground">
              Ao cancelar, você perderá acesso a todos os recursos premium incluindo relatórios avançados, assistente IA e exportações.
            </p>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={() => setCancelOpen(false)}>Voltar e continuar usando</Button>
              <Button variant="destructive" size="sm" onClick={() => setCancelStep('reason')}>Continuar cancelamento</Button>
            </div>
          </div>
        );
      case 'reason':
        return (
          <div className="space-y-4">
            <h3 className="text-base font-semibold">Pode nos dizer o motivo?</h3>
            <p className="text-sm text-muted-foreground">Sua opinião é muito importante para melhorarmos o Moovi.</p>
            <Select value={cancelReason} onValueChange={setCancelReason}>
              <SelectTrigger><SelectValue placeholder="Selecione um motivo" /></SelectTrigger>
              <SelectContent>
                {cancelReasons.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setCancelStep('initial')}>Voltar</Button>
              <Button size="sm" disabled={!cancelReason} onClick={() => setCancelStep('offer')}>Próximo</Button>
            </div>
          </div>
        );
      case 'offer':
        return (
          <div className="space-y-4 text-center">
            <div className="flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Gift className="h-8 w-8 text-primary" />
              </div>
            </div>
            <h3 className="text-lg font-semibold">Que tal um desconto especial?</h3>
            <p className="text-sm text-muted-foreground">
              Gostaríamos de te oferecer <strong className="text-primary">50% de desconto</strong> nos próximos 3 meses como agradecimento pela sua fidelidade.
            </p>
            <Card className="p-4 border-primary">
              <div className="text-center">
                <span className="text-2xl font-bold text-primary">{formatCurrency(12.45)}</span>
                <span className="text-xs text-muted-foreground">/mês por 3 meses</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground line-through text-center">{formatCurrency(24.90)}/mês</p>
            </Card>
            <div className="flex gap-2 justify-center">
              <Button className="gap-1.5" onClick={() => setCancelOpen(false)}>
                <Heart className="h-4 w-4" /> Aceitar oferta
              </Button>
              <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setCancelStep('survey')}>
                Não, obrigado
              </Button>
            </div>
          </div>
        );
      case 'survey':
        return (
          <div className="space-y-4">
            <h3 className="text-base font-semibold">Última pergunta rápida</h3>
            <p className="text-sm text-muted-foreground">De 1 a 5, como você avaliaria sua experiência com o Moovi?</p>
            <div className="flex gap-2 justify-center">
              {['1', '2', '3', '4', '5'].map(n => (
                <Button
                  key={n}
                  variant={surveyRating === n ? 'default' : 'outline'}
                  size="sm"
                  className="h-10 w-10"
                  onClick={() => setSurveyRating(n)}
                >
                  {n}
                </Button>
              ))}
            </div>
            <div className="space-y-1.5">
              <Label>Algo mais que gostaria de compartilhar?</Label>
              <Textarea
                value={cancelFeedback}
                onChange={e => setCancelFeedback(e.target.value)}
                placeholder="Nos ajude a melhorar..."
                className="resize-none"
                rows={3}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setCancelStep('offer')}>Voltar</Button>
              <Button size="sm" onClick={() => setCancelStep('confirm')}>Próximo</Button>
            </div>
          </div>
        );
      case 'confirm':
        return (
          <div className="space-y-4 text-center">
            <div className="flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-8 w-8 text-destructive" />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-destructive">Confirmação Final</h3>
            <p className="text-sm text-muted-foreground">
              Esta ação é irreversível. Seu acesso premium será encerrado ao final do período atual. Todos os seus dados serão mantidos por 30 dias.
            </p>
            <div className="rounded-lg bg-destructive/5 p-3 text-xs text-muted-foreground text-left space-y-1">
              <p>• Relatórios avançados serão desativados</p>
              <p>• Assistente IA não estará disponível</p>
              <p>• Exportações serão limitadas</p>
              <p>• Histórico mantido por 30 dias</p>
            </div>
            <div className="flex gap-2 justify-center">
              <Button onClick={() => setCancelOpen(false)}>Manter minha assinatura</Button>
              <Button variant="destructive" size="sm" onClick={() => setCancelStep('final')}>
                Cancelar definitivamente
              </Button>
            </div>
          </div>
        );
      case 'final':
        return (
          <div className="space-y-4 text-center">
            <h3 className="text-base font-semibold">Assinatura cancelada</h3>
            <p className="text-sm text-muted-foreground">
              Sentiremos sua falta. Seu acesso premium continua ativo até o final do período atual. Você pode reativar a qualquer momento.
            </p>
            <Button onClick={() => { setCancelOpen(false); setCancelStep('initial'); }}>Fechar</Button>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6 animate-in-up">
      <div>
        <h2 className="text-xl font-semibold">Gerenciar Assinatura</h2>
        <p className="text-sm text-muted-foreground">Escolha o plano ideal para suas necessidades</p>
      </div>

      {/* Current Plan */}
      <Card className="flex items-center justify-between p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Crown className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Plano Mensal</h3>
            <p className="text-xs text-muted-foreground">Renovação em 04/04/2026</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="text-xs">Ativo</Badge>
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={startCancel}>
            Cancelar plano
          </Button>
        </div>
      </Card>

      {/* Plans */}
      <div className="grid grid-cols-3 gap-4">
        {plans.map(plan => (
          <Card key={plan.name} className={`relative p-5 card-hover ${plan.popular ? 'border-primary' : ''}`}>
            {plan.popular && (
              <Badge className="absolute -top-2.5 right-4 text-[10px]">Popular</Badge>
            )}
            {plan.label && !plan.popular && (
              <Badge variant="secondary" className="absolute -top-2.5 right-4 text-[10px]">{plan.label}</Badge>
            )}
            <h3 className="text-lg font-semibold">{plan.name}</h3>
            <div className="mt-2">
              <span className="text-2xl font-bold">{formatCurrency(plan.priceMonth)}</span>
              <span className="text-xs text-muted-foreground">/mês</span>
            </div>
            {plan.priceTotal && (
              <p className="mt-1 text-xs text-muted-foreground">
                {formatCurrency(plan.priceTotal)} no total
              </p>
            )}
            <ul className="mt-4 space-y-2">
              {plan.features.map((feat, i) => (
                <li key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Check className="h-3.5 w-3.5 text-success" />
                  {feat}
                </li>
              ))}
            </ul>
            <Button
              className="mt-5 w-full"
              variant={plan.current ? 'outline' : plan.popular ? 'default' : 'secondary'}
              size="sm"
            >
              {plan.current ? 'Plano Atual' : 'Selecionar'}
            </Button>
          </Card>
        ))}
      </div>

      {/* Features */}
      <div>
        <h3 className="mb-3 text-sm font-semibold">Recursos incluídos</h3>
        <div className="grid grid-cols-4 gap-3">
          {[
            { icon: Zap, label: 'IA Inteligente', desc: 'Lançamentos por linguagem natural' },
            { icon: Shield, label: 'Dados Seguros', desc: 'Criptografia end-to-end' },
            { icon: BarChart3, label: 'Relatórios', desc: 'Análises avançadas' },
            { icon: Bot, label: 'WhatsApp', desc: 'Integração via bot' },
          ].map(({ icon: Icon, label, desc }) => (
            <Card key={label} className="p-4">
              <Icon className="h-5 w-5 text-primary" />
              <h4 className="mt-2 text-xs font-semibold">{label}</h4>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{desc}</p>
            </Card>
          ))}
        </div>
      </div>

      {/* Cancel Dialog */}
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent className="sm:max-w-md">
          {renderCancelContent()}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SubscriptionPage;
