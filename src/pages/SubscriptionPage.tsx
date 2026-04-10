import { useState } from "react";
import { useI18n } from "@/i18n/context";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Crown,
  Check,
  Zap,
  Shield,
  BarChart3,
  Bot,
  AlertTriangle,
  Heart,
  Gift,
  X,
  ArrowLeft,
  MessageCircle,
  HelpCircle,
  DollarSign,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";

const plans = [
  {
    name: "Plano Básico",
    priceMonth: 14.9,
    priceTotal: 178.8,
    label: "Mais flexível",
    features: [
      "Registro de despesas/receitas via WhatsApp",
      "Categorização inteligente de gastos",
      "Compromissos automáticos",
      "Controle de orçamentos",
      "Lembretes automáticos de vencimento",
      "Acesso ao Dashboard",
      "Suporte padrão",
    ],
    current: true,
    popular: false,
  },
  {
    name: "Plano Pro",
    priceMonth: 19.9,
    priceTotal: 238.8,
    label: "Melhor custo-benefício",
    features: [
      "Tudo do plano Básico, e mais:",
      "Gráficos visuais no Dashboard",
      "Relatórios financeiros mensais detalhados",
      "Exportação de dados (PDF/Excel)",
      "Criação de metas e limites de gastos",
      "Alertas preventivos de orçamento",
      "Compromissos recorrentes",
      "Contas a pagar/receber",
      "Suporte prioritário humanizado",
    ],
    current: false,
    popular: true,
  },
  {
    name: "Plano Premium",
    priceMonth: 24.9,
    priceTotal: 298.8,
    label: "Maior economia no longo prazo",
    features: [
      "Tudo do plano Pro, e mais:",
      "Análise de gastos com Inteligência Artificial",
      "Gestão de múltiplos cartões de crédito",
      "Gestão de múltiplas contas bancárias",
      "Leitura automatizada de comprovantes",
      "Modo Áudio",
      "Conversão de moedas automático",
      "Open Finance (em breve)",
      "Atendimento VIP exclusivo",
    ],
    current: false,
    popular: false,
  },
];

const cancelReasons = [
  { id: "other-tool", label: "Estou usando outra ferramenta", icon: MessageCircle },
  { id: "expensive", label: "Achei caro para meu uso", icon: DollarSign },
  { id: "not-enough", label: "Não uso o suficiente", icon: HelpCircle },
  { id: "missing-features", label: "Faltam funcionalidades que preciso", icon: Wrench },
  { id: "technical", label: "Problemas técnicos", icon: AlertTriangle },
  { id: "other", label: "Outro motivo", icon: MessageCircle },
];

const resolutionCards: Record<string, { title: string; description: string; offer?: string; cta: string }> = {
  "other-tool": {
    title: "🔄 Vamos comparar?",
    description:
      "Gostaríamos de entender melhor sua necessidade. O Moovi possui IA integrada, relatórios avançados e exportação completa. Que tal um desconto exclusivo para continuar?",
    offer: "30% OFF por 6 meses",
    cta: "Aceitar desconto e continuar",
  },
  expensive: {
    title: "💰 Temos uma oferta especial!",
    description:
      "Sabemos que o preço importa. Por isso, preparamos um desconto exclusivo para você continuar aproveitando todas as funcionalidades.",
    offer: "50% OFF por 3 meses",
    cta: "Aceitar oferta e continuar",
  },
  "not-enough": {
    title: "📱 Você sabia?",
    description:
      "O Moovi tem funcionalidades que você talvez ainda não conheça: assistente IA, lançamentos por comando, relatórios detalhados, orçamentos automáticos e muito mais!",
    offer: "2 meses grátis para explorar",
    cta: "Aceitar e descobrir mais",
  },
  "missing-features": {
    title: "🚀 Sua opinião é valiosa!",
    description:
      "Estamos constantemente evoluindo. Conte-nos quais funcionalidades faltam e teremos prioridade em implementá-las. Enquanto isso, aceite nosso desconto!",
    offer: "40% OFF por 3 meses",
    cta: "Aceitar e enviar sugestões",
  },
  technical: {
    title: "🔧 Vamos resolver juntos!",
    description:
      "Lamentamos pelos problemas técnicos. Nossa equipe de suporte está pronta para ajudar. Vamos agendar um atendimento prioritário para resolver tudo?",
    offer: "Suporte VIP + 1 mês grátis",
    cta: "Agendar suporte e continuar",
  },
  other: {
    title: "💜 Não queremos te perder!",
    description:
      "Seja qual for o motivo, gostaríamos de oferecer um benefício especial para que você continue fazendo parte da família Moovi.",
    offer: "50% OFF por 3 meses",
    cta: "Aceitar oferta e continuar",
  },
};

const planWeights: Record<string, number> = { basico: 1, pro: 2, premium: 3 };

const SubscriptionPage = () => {
  const { formatCurrency } = useI18n();
  const { plano } = useAuth();
  const [cancelStep, setCancelStep] = useState(0);
  const [cancelReason, setCancelReason] = useState("");
  const [downgradeTarget, setDowngradeTarget] = useState<string | null>(null);

  const handleStartCancel = () => setCancelStep(1);
  const handleCancelClose = () => {
    setCancelStep(0);
    setCancelReason("");
  };

  const handleAcceptOffer = () => {
    const resolution = resolutionCards[cancelReason];
    toast.success(`🎉 ${resolution?.offer || "Desconto"} aplicado! Obrigado por ficar conosco.`);
    handleCancelClose();
  };

  const handleFinalCancel = () => {
    toast.info("Sua assinatura foi cancelada. Você ainda terá acesso até o final do período.");
    handleCancelClose();
  };

  const handleBack = () => {
    if (cancelStep <= 1) handleCancelClose();
    else setCancelStep(cancelStep - 1);
  };

  const handleReasonSelect = (reasonId: string) => {
    setCancelReason(reasonId);
    setCancelStep(3);
  };

  return (
    <div className="space-y-6 animate-in-up">
      <div>
        <h2 className="text-lg sm:text-xl font-semibold">Gerenciar Assinatura</h2>
        <p className="text-sm text-muted-foreground">Escolha o plano ideal para suas necessidades</p>
      </div>

      {/* Current Plan */}
      <Card className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 sm:p-5 gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Crown className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Plano {plano.charAt(0).toUpperCase() + plano.slice(1)}</h3>
            <p className="text-xs text-muted-foreground">Seu plano atual</p>
          </div>
        </div>
        <Badge className="text-xs">Ativo</Badge>
      </Card>

      {/* Plans */}
      {(() => {
        const currentWeight = planWeights[plano] || 1;
        const getPlanWeight = (p: typeof plans[0]) =>
          p.name.toLowerCase().includes("premium") ? 3 : p.name.toLowerCase().includes("pro") ? 2 : 1;

        return (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {plans.map((plan) => {
              const w = getPlanWeight(plan);
              const isCurrent = w === currentWeight;
              const isUpgrade = w > currentWeight;

              let buttonVariant: "default" | "secondary" | "outline" = "default";
              let buttonText = "";
              let buttonDisabled = false;

              if (isCurrent) {
                buttonVariant = "outline";
                buttonText = "Plano Atual";
                buttonDisabled = true;
              } else if (isUpgrade) {
                buttonVariant = "default";
                buttonText = `Assinar ${plan.name.replace("Plano ", "")}`;
              } else {
                buttonVariant = "secondary";
                buttonText = "Fazer Downgrade";
              }

              return (
                <Card key={plan.name} className={`relative p-5 card-hover flex flex-col h-full ${plan.popular ? "border-primary" : ""}`}>
                  {plan.popular && <Badge className="absolute -top-2.5 right-4 text-[10px]">Mais recomendado</Badge>}
                  {plan.label && !plan.popular && (
                    <Badge variant="secondary" className="absolute -top-2.5 right-4 text-[10px]">
                      {plan.label}
                    </Badge>
                  )}
                  <h3 className="text-lg font-semibold">{plan.name}</h3>
                  <div className="mt-2">
                    <span className="text-2xl font-bold">{formatCurrency(plan.priceMonth)}</span>
                    <span className="text-xs text-muted-foreground"> x12</span>
                  </div>
                  {plan.priceTotal && (
                    <p className="text-xs text-muted-foreground">{formatCurrency(plan.priceTotal)}</p>
                  )}
                  <ul className="mt-4 space-y-2 flex-1">
                    {plan.features.map((feat, i) => {
                      const isHeader = feat.startsWith("Tudo do plano");
                      return (
                        <li
                          key={i}
                          className={`flex items-center gap-2 text-xs ${isHeader ? "text-primary font-semibold" : "text-foreground"}`}
                        >
                          {isHeader ? (
                            <Zap className="h-3.5 w-3.5 text-primary shrink-0" />
                          ) : (
                            <Check className="h-3.5 w-3.5 text-success shrink-0" />
                          )}
                          <span>{feat}</span>
                        </li>
                      );
                    })}
                  </ul>
                  <Button
                    className="mt-5 w-full"
                    variant={buttonVariant}
                    size="sm"
                    disabled={buttonDisabled}
                    onClick={() => {
                      if (!isCurrent && !isUpgrade) {
                        setDowngradeTarget(plan.name);
                      }
                    }}
                  >
                    {buttonText}
                  </Button>
                </Card>
              );
            })}
          </div>
        );
      })()}

      {/* Features */}
      <div>
        <h3 className="mb-3 text-sm font-semibold">Recursos incluídos</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { icon: Zap, label: "IA Inteligente", desc: "Lançamentos por linguagem natural" },
            { icon: Shield, label: "Dados Seguros", desc: "Criptografia end-to-end" },
            { icon: BarChart3, label: "Relatórios", desc: "Análises avançadas" },
            { icon: Bot, label: "WhatsApp", desc: "Integração via bot" },
          ].map(({ icon: Icon, label, desc }) => (
            <Card key={label} className="p-4">
              <Icon className="h-5 w-5 text-primary" />
              <h4 className="mt-2 text-xs font-semibold">{label}</h4>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{desc}</p>
            </Card>
          ))}
        </div>
      </div>

      {/* Cancel subscription */}
      <div className="pt-6 border-t border-border">
        <Button variant="destructive" size="sm" className="text-xs" onClick={handleStartCancel}>
          Cancelar assinatura
        </Button>
      </div>

      {/* Cancellation Flow Dialog */}
      <Dialog
        open={cancelStep > 0}
        onOpenChange={(open) => {
          if (!open) handleCancelClose();
        }}
      >
        <DialogContent className="sm:max-w-md">
          {cancelStep === 1 && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <button onClick={handleBack} className="p-1 rounded-md hover:bg-secondary transition-colors">
                    <ArrowLeft className="h-4 w-4 text-muted-foreground" />
                  </button>
                  <DialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-warning" />
                    Tem certeza que deseja cancelar?
                  </DialogTitle>
                </div>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <p className="text-sm text-muted-foreground">Ao cancelar, você perderá acesso a:</p>
                <div className="space-y-2">
                  {[
                    "Lançamentos e controle financeiro ilimitado",
                    "Relatórios avançados com exportação",
                    "Assistente IA para lançamentos rápidos",
                    "Sincronização entre dispositivos",
                    "Suporte prioritário",
                  ].map((benefit, i) => (
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
                <Button
                  variant="ghost"
                  className="w-full text-muted-foreground text-xs"
                  onClick={() => setCancelStep(2)}
                >
                  Quero continuar o cancelamento
                </Button>
              </DialogFooter>
            </>
          )}

          {cancelStep === 2 && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <button onClick={handleBack} className="p-1 rounded-md hover:bg-secondary transition-colors">
                    <ArrowLeft className="h-4 w-4 text-muted-foreground" />
                  </button>
                  <DialogTitle>Por que você está saindo?</DialogTitle>
                </div>
              </DialogHeader>
              <div className="space-y-2 py-2">
                <p className="text-sm text-muted-foreground mb-3">Seu feedback nos ajuda a melhorar:</p>
                {cancelReasons.map((reason) => (
                  <button
                    key={reason.id}
                    className="flex items-center gap-3 w-full p-3 rounded-lg border border-border cursor-pointer hover:bg-secondary/50 transition-colors text-left"
                    onClick={() => handleReasonSelect(reason.id)}
                  >
                    <reason.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-sm">{reason.label}</span>
                  </button>
                ))}
              </div>
              <DialogFooter className="flex-col gap-2 sm:flex-col">
                <Button className="w-full gap-2" onClick={handleCancelClose}>
                  <Heart className="h-4 w-4" /> Mudei de ideia, vou continuar
                </Button>
              </DialogFooter>
            </>
          )}

          {cancelStep === 3 && cancelReason && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCancelStep(2)}
                    className="p-1 rounded-md hover:bg-secondary transition-colors"
                  >
                    <ArrowLeft className="h-4 w-4 text-muted-foreground" />
                  </button>
                  <DialogTitle className="flex items-center gap-2">
                    <Gift className="h-5 w-5 text-primary" />
                    {resolutionCards[cancelReason]?.title}
                  </DialogTitle>
                </div>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <p className="text-sm text-muted-foreground">{resolutionCards[cancelReason]?.description}</p>
                {resolutionCards[cancelReason]?.offer && (
                  <Card className="p-5 border-primary bg-primary/5">
                    <div className="text-center">
                      <p className="text-xl font-bold text-primary">{resolutionCards[cancelReason].offer}</p>
                      <p className="text-xs text-muted-foreground mt-1">Oferta exclusiva válida apenas agora 💜</p>
                    </div>
                  </Card>
                )}
              </div>
              <DialogFooter className="flex-col gap-2 sm:flex-col">
                <Button className="w-full gap-2" onClick={handleAcceptOffer}>
                  <Gift className="h-4 w-4" /> {resolutionCards[cancelReason]?.cta}
                </Button>
                <Button
                  variant="ghost"
                  className="w-full text-muted-foreground text-xs"
                  onClick={() => setCancelStep(4)}
                >
                  Não, quero cancelar mesmo
                </Button>
              </DialogFooter>
            </>
          )}

          {cancelStep === 4 && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <button onClick={handleBack} className="p-1 rounded-md hover:bg-secondary transition-colors">
                    <ArrowLeft className="h-4 w-4 text-muted-foreground" />
                  </button>
                  <DialogTitle className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-5 w-5" />
                    Confirmação final
                  </DialogTitle>
                </div>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="rounded-lg bg-destructive/10 p-4">
                  <p className="text-sm font-medium text-destructive">⚠️ Esta ação não pode ser desfeita</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Seus dados serão mantidos por 30 dias após o cancelamento. Depois disso, serão permanentemente
                    excluídos.
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
                <Button variant="ghost" className="w-full text-muted-foreground text-xs" onClick={handleFinalCancel}>
                  Cancelar definitivamente minha assinatura
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Downgrade Confirmation */}
      <AlertDialog open={!!downgradeTarget} onOpenChange={(open) => { if (!open) setDowngradeTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Downgrade?</AlertDialogTitle>
            <AlertDialogDescription>
              Seu plano atual será mantido até o final do período já pago. Após essa data, sua conta passará para o plano inferior e algumas funcionalidades serão desativadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              toast.info(`Downgrade para ${downgradeTarget} confirmado. Seu plano atual será mantido até o final do período.`);
              setDowngradeTarget(null);
            }}>
              Confirmar Downgrade
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SubscriptionPage;
