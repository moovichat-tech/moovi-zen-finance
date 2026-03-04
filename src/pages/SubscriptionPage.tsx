import { useState } from 'react';
import { useI18n } from '@/i18n/context';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Crown, Check, Zap, Shield, BarChart3, Bot, AlertTriangle, Heart, Gift, X } from 'lucide-react';
import { toast } from 'sonner';

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

const cancelReasons = [
  'Estou usando outra ferramenta',
  'Achei caro para meu uso',
  'Não uso o suficiente',
  'Faltam funcionalidades que preciso',
  'Problemas técnicos',
  'Outro motivo',
];

const SubscriptionPage = () => {
  const { formatCurrency } = useI18n();
  const [cancelStep, setCancelStep] = useState(0); // 0 = closed, 1-4 = steps
  const [cancelReason, setCancelReason] = useState('');

  const handleStartCancel = () => setCancelStep(1);
  const handleCancelClose = () => { setCancelStep(0); setCancelReason(''); };

  const handleAcceptDiscount = () => {
    toast.success('🎉 Desconto de 50% aplicado por 3 meses! Obrigado por ficar conosco.');
    handleCancelClose();
  };

  const handleFinalCancel = () => {
    toast.info('Sua assinatura foi cancelada. Você ainda terá acesso até o final do período.');
    handleCancelClose();
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
        <div className="flex items-center gap-3">
          <Badge className="text-xs">Ativo</Badge>
          <Button variant="outline" size="sm" className="text-xs text-destructive border-destructive/30 hover:bg-destructive/10" onClick={handleStartCancel}>
            Cancelar assinatura
          </Button>
        </div>
      </Card>

      {/* Plans */}
      <div className="grid grid-cols-3 gap-4">
        {plans.map(plan => (
          <Card key={plan.name} className={`relative p-5 card-hover ${plan.popular ? 'border-primary' : ''}`}>
            {plan.popular && <Badge className="absolute -top-2.5 right-4 text-[10px]">Popular</Badge>}
            {plan.label && !plan.popular && <Badge variant="secondary" className="absolute -top-2.5 right-4 text-[10px]">{plan.label}</Badge>}
            <h3 className="text-lg font-semibold">{plan.name}</h3>
            <div className="mt-2">
              <span className="text-2xl font-bold">{formatCurrency(plan.priceMonth)}</span>
              <span className="text-xs text-muted-foreground">/mês</span>
            </div>
            {plan.priceTotal && (
              <p className="mt-1 text-xs text-muted-foreground">{formatCurrency(plan.priceTotal)} no total</p>
            )}
            <ul className="mt-4 space-y-2">
              {plan.features.map((feat, i) => (
                <li key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Check className="h-3.5 w-3.5 text-success" />
                  {feat}
                </li>
              ))}
            </ul>
            <Button className="mt-5 w-full" variant={plan.current ? 'outline' : plan.popular ? 'default' : 'secondary'} size="sm">
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

      {/* Cancellation Flow Dialog */}
      <Dialog open={cancelStep > 0} onOpenChange={(open) => { if (!open) handleCancelClose(); }}>
        <DialogContent className="sm:max-w-md">
          {/* Step 1: Are you sure? */}
          {cancelStep === 1 && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-warning" />
                  Tem certeza que deseja cancelar?
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <p className="text-sm text-muted-foreground">Ao cancelar, você perderá acesso a:</p>
                <div className="space-y-2">
                  {['Lançamentos e controle financeiro ilimitado', 'Relatórios avançados com exportação', 'Assistente IA para lançamentos rápidos', 'Sincronização entre dispositivos', 'Suporte prioritário'].map((benefit, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <X className="h-4 w-4 text-destructive" />
                      <span>{benefit}</span>
                    </div>
                  ))}
                </div>
              </div>
              <DialogFooter className="flex-col gap-2 sm:flex-col">
                <Button className="w-full gap-2" onClick={handleCancelClose}>
                  <Heart className="h-4 w-4" /> Continuar usando o Moovi
                </Button>
                <Button variant="ghost" className="w-full text-muted-foreground text-xs" onClick={() => setCancelStep(2)}>
                  Quero continuar o cancelamento
                </Button>
              </DialogFooter>
            </>
          )}

          {/* Step 2: Why? */}
          {cancelStep === 2 && (
            <>
              <DialogHeader>
                <DialogTitle>Por que você está saindo?</DialogTitle>
              </DialogHeader>
              <div className="space-y-2 py-2">
                <p className="text-sm text-muted-foreground mb-3">Seu feedback nos ajuda a melhorar:</p>
                {cancelReasons.map(reason => (
                  <label key={reason} className="flex items-center gap-3 p-2.5 rounded-lg border border-border cursor-pointer hover:bg-secondary/50 transition-colors">
                    <input
                      type="radio"
                      name="reason"
                      checked={cancelReason === reason}
                      onChange={() => setCancelReason(reason)}
                      className="accent-primary"
                    />
                    <span className="text-sm">{reason}</span>
                  </label>
                ))}
              </div>
              <DialogFooter className="flex-col gap-2 sm:flex-col">
                <Button className="w-full gap-2" onClick={handleCancelClose}>
                  <Heart className="h-4 w-4" /> Mudei de ideia, vou continuar
                </Button>
                <Button variant="ghost" className="w-full text-muted-foreground text-xs" onClick={() => setCancelStep(3)} disabled={!cancelReason}>
                  Continuar cancelamento
                </Button>
              </DialogFooter>
            </>
          )}

          {/* Step 3: Discount offer */}
          {cancelStep === 3 && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Gift className="h-5 w-5 text-primary" />
                  Temos uma oferta especial para você!
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <Card className="p-5 border-primary bg-primary/5">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-primary">50% OFF</p>
                    <p className="text-sm text-muted-foreground mt-1">nos próximos 3 meses</p>
                    <p className="text-lg font-semibold mt-2">{formatCurrency(12.45)}/mês</p>
                    <p className="text-xs text-muted-foreground line-through">{formatCurrency(24.90)}/mês</p>
                  </div>
                </Card>
                <p className="text-sm text-muted-foreground text-center">
                  Essa oferta é exclusiva e válida apenas agora. Não queremos te perder! 💜
                </p>
              </div>
              <DialogFooter className="flex-col gap-2 sm:flex-col">
                <Button className="w-full gap-2" onClick={handleAcceptDiscount}>
                  <Gift className="h-4 w-4" /> Aceitar oferta e continuar
                </Button>
                <Button variant="ghost" className="w-full text-muted-foreground text-xs" onClick={() => setCancelStep(4)}>
                  Não, quero cancelar mesmo
                </Button>
              </DialogFooter>
            </>
          )}

          {/* Step 4: Final confirmation */}
          {cancelStep === 4 && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-5 w-5" />
                  Confirmação final
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="rounded-lg bg-destructive/10 p-4">
                  <p className="text-sm font-medium text-destructive">⚠️ Esta ação não pode ser desfeita</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Seus dados serão mantidos por 30 dias após o cancelamento. Depois disso, serão permanentemente excluídos.
                  </p>
                </div>
                <p className="text-sm text-muted-foreground">
                  Você ainda terá acesso ao Moovi até o final do período atual (04/04/2026).
                </p>
              </div>
              <DialogFooter className="flex-col gap-2 sm:flex-col">
                <Button className="w-full gap-2" onClick={handleCancelClose}>
                  <Heart className="h-4 w-4" /> Não, quero continuar usando
                </Button>
                <Button variant="destructive" className="w-full text-xs" onClick={handleFinalCancel}>
                  Cancelar definitivamente minha assinatura
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SubscriptionPage;
