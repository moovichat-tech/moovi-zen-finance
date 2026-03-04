import { useI18n } from '@/i18n/context';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Crown, Check, Zap, Shield, BarChart3, Bot } from 'lucide-react';

const plans = [
  {
    name: 'Free',
    price: 0,
    features: ['Até 50 lançamentos/mês', '2 contas', '1 cartão', 'Relatórios básicos'],
    current: false,
  },
  {
    name: 'Pro',
    price: 29.90,
    features: ['Lançamentos ilimitados', 'Contas ilimitadas', 'Cartões ilimitados', 'Relatórios avançados', 'Assistente IA', 'Exportação PDF/Excel'],
    current: true,
    popular: true,
  },
  {
    name: 'Business',
    price: 59.90,
    features: ['Tudo do Pro', 'Multi-usuário', 'Conta PJ', 'API integrada', 'WhatsApp Bot', 'Suporte prioritário'],
    current: false,
  },
];

const SubscriptionPage = () => {
  const { formatCurrency } = useI18n();

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
            <h3 className="text-sm font-semibold">Plano Pro</h3>
            <p className="text-xs text-muted-foreground">Renovação em 04/04/2026</p>
          </div>
        </div>
        <Badge className="text-xs">Ativo</Badge>
      </Card>

      {/* Plans */}
      <div className="grid grid-cols-3 gap-4">
        {plans.map(plan => (
          <Card key={plan.name} className={`relative p-5 card-hover ${plan.popular ? 'border-primary' : ''}`}>
            {plan.popular && (
              <Badge className="absolute -top-2.5 right-4 text-[10px]">Popular</Badge>
            )}
            <h3 className="text-lg font-semibold">{plan.name}</h3>
            <div className="mt-2">
              <span className="text-2xl font-bold">{plan.price === 0 ? 'Grátis' : formatCurrency(plan.price)}</span>
              {plan.price > 0 && <span className="text-xs text-muted-foreground">/mês</span>}
            </div>
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
        <h3 className="mb-3 text-sm font-semibold">Recursos incluídos no Pro</h3>
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
    </div>
  );
};

export default SubscriptionPage;
