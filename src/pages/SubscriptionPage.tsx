import { useState, useCallback } from "react";
import { useI18n } from "@/i18n/context";
import { useAuth } from "@/hooks/useAuth";

import { Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

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
  CreditCard,
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

const cancelMotivos = [
  { id: "caro", label: "Achei muito caro." },
  { id: "nao-uso", label: "Não estou usando com frequência." },
  { id: "funcionalidade", label: "Faltou alguma funcionalidade." },
  { id: "dificil", label: "Achei difícil de usar." },
  { id: "outro", label: "Outro motivo." },
];


const planWeights: Record<string, number> = { basico: 1, pro: 2, premium: 3 };

const SubscriptionPage = () => {
  const { formatCurrency } = useI18n();
  const { plano, telefone, gatewayPagamento, renovacaoAutomatica, planoFuturo, refreshPlano, token } = useAuth();
  const [cancelStep, setCancelStep] = useState(0);
  const [cancelMotivo, setCancelMotivo] = useState("");
  const [cancelDetalhes, setCancelDetalhes] = useState("");
  const [cancelLoading, setCancelLoading] = useState(false);
  const [downgradeTarget, setDowngradeTarget] = useState<string | null>(null);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [loadingCartao, setLoadingCartao] = useState(false);

  const getPlanKey = (name: string) =>
    name.toLowerCase().includes("premium") ? "premium" : name.toLowerCase().includes("pro") ? "pro" : "basico";

  const handlePlanChange = useCallback(async (planName: string) => {
    const planoKey = getPlanKey(planName);
    const planoNovo = planoKey.toUpperCase();
    setLoadingPlan(planoKey);
    try {
      const res = await fetch("https://n8n.fisherai.shop/webhook/mudanca-plano", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer moovi-secreto-2026",
        },
        body: JSON.stringify({
          telefone: telefone?.replace(/\D/g, "") || "",
          plano_novo: planoNovo,
        }),
      });
      const data = await res.json();

      if (data.status === "upgrade" && data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }
      if (data.status === "downgrade") {
        toast.success(data.mensagem || "Downgrade realizado com sucesso!");
        setDowngradeTarget(null);
        return;
      }
      toast.error("Erro ao processar sua solicitação. Tente novamente.");
    } catch {
      toast.error("Erro ao processar sua solicitação. Tente novamente.");
    } finally {
      setLoadingPlan(null);
    }
  }, [telefone]);

  const handleStartCancel = () => setCancelStep(1);
  const handleCancelClose = () => {
    setCancelStep(0);
    setCancelMotivo("");
    setCancelDetalhes("");
  };

  const handleFinalCancel = async () => {
    setCancelLoading(true);
    try {
      const res = await fetch("https://n8n.fisherai.shop/webhook/cancelar-assinatura", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-moovi-token": "moovi-secreto-2026",
        },
        body: JSON.stringify({
          telefone: telefone?.replace(/\D/g, "") || "",
          motivo: cancelMotivo,
          detalhes: cancelDetalhes || null,
        }),
      });
      if (!res.ok) throw new Error("Erro");
      toast.success("Renovação cancelada");
      refreshPlano();
      handleCancelClose();
    } catch {
      toast.error("Erro ao processar sua solicitação. Tente novamente.");
    } finally {
      setCancelLoading(false);
    }
  };

  const isStripeMigration = gatewayPagamento === 'stripe';

  return (
    <div className="space-y-6 animate-in-up relative">
      <div>
        <h2 className="text-lg sm:text-xl font-semibold">Gerenciar Assinatura</h2>
        <p className="text-sm text-muted-foreground">Escolha o plano ideal para suas necessidades</p>
      </div>

      {/* Stripe Migration Overlay Modal */}
      {isStripeMigration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 backdrop-blur-md bg-background/60" />
          <Card className="relative z-10 w-full max-w-5xl max-h-[90vh] overflow-y-auto p-6 sm:p-8 border-primary shadow-2xl">
            <div className="text-center mb-6">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Gift className="h-6 w-6 text-primary" />
                <h2 className="text-xl font-bold">Atualização de Sistema Necessária 🚀</h2>
              </div>
              <p className="text-sm text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Estamos migrando para um novo e mais seguro sistema de pagamentos. Para não perder seu acesso, escolha seu plano abaixo e atualize seus dados de faturamento. Como agradecimento, adicionaremos{" "}
                <span className="font-semibold text-primary">1 Mês de acesso totalmente grátis</span>!
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {plans.map((plan) => {
                const key = getPlanKey(plan.name);
                return (
                  <Card key={plan.name} className={`relative p-5 flex flex-col h-full ${plan.popular ? "border-primary" : ""}`}>
                    {plan.popular && <Badge className="absolute -top-2.5 right-4 text-[10px]">Mais recomendado</Badge>}
                    <h3 className="text-lg font-semibold">{plan.name}</h3>
                    <div className="mt-2">
                      <span className="text-2xl font-bold">{formatCurrency(plan.priceMonth)}</span>
                      <span className="text-xs text-muted-foreground"> x12</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{formatCurrency(plan.priceTotal)}</p>
                    <ul className="mt-4 space-y-2 flex-1">
                      {plan.features.map((feat, i) => {
                        const isHeader = feat.startsWith("Tudo do plano");
                        return (
                          <li key={i} className={`flex items-center gap-2 text-xs ${isHeader ? "text-primary font-semibold" : "text-foreground"}`}>
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
                      variant="default"
                      size="sm"
                      disabled={loadingPlan === key}
                      onClick={() => handlePlanChange(plan.name)}
                    >
                      {loadingPlan === key ? (
                        <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Processando...</>
                      ) : (
                        `Migrar para o ${plan.name.replace("Plano ", "")}`
                      )}
                    </Button>
                  </Card>
                );
              })}
            </div>

            <p className="text-[11px] text-muted-foreground text-center">
              Sua cobrança antiga será cancelada automaticamente assim que a nova for confirmada. Você não pagará em duplicidade.
            </p>
          </Card>
        </div>
      )}

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
              const planKey = getPlanKey(plan.name);
              const planoFuturoNorm = planoFuturo?.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") || null;
              const isDowngradeScheduled = !isCurrent && !isUpgrade && planoFuturoNorm === planKey;

              if (isCurrent) {
                buttonVariant = "outline";
                buttonText = "Plano Atual";
                buttonDisabled = true;
              } else if (isUpgrade) {
                buttonVariant = "default";
                buttonText = `Assinar ${plan.name.replace("Plano ", "")}`;
              } else if (isDowngradeScheduled) {
                buttonVariant = "outline";
                buttonText = "Downgrade Agendado";
                buttonDisabled = true;
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
                    disabled={buttonDisabled || loadingPlan === getPlanKey(plan.name)}
                    onClick={() => {
                      if (isCurrent) return;
                      if (isUpgrade) {
                        handlePlanChange(plan.name);
                      } else {
                        setDowngradeTarget(plan.name);
                      }
                    }}
                  >
                    {loadingPlan === getPlanKey(plan.name) ? (
                      <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Processando...</>
                    ) : (
                      buttonText
                    )}
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

      {/* Update card & Cancel subscription */}
      <div className="pt-6 border-t border-border flex flex-wrap items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          className="text-xs gap-1.5"
          disabled={loadingCartao}
          onClick={async () => {
            setLoadingCartao(true);
            try {
              const res = await fetch("https://n8n.fisherai.shop/webhook/gerar-link-cartao", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "x-moovi-token": "moovi-secreto-2026",
                },
                body: JSON.stringify({ telefone: telefone?.replace(/\D/g, "") || "" }),
              });
              if (!res.ok) throw new Error("Erro");
              const data = await res.json();
              if (data.invoiceUrl) {
                window.open(data.invoiceUrl, "_blank");
              } else {
                toast.error("Não foi possível gerar o link. Tente novamente.");
              }
            } catch {
              toast.error("Erro ao processar sua solicitação. Tente novamente.");
            } finally {
              setLoadingCartao(false);
            }
          }}
        >
          {loadingCartao ? (
            <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Gerando link...</>
          ) : (
            <><CreditCard className="h-3.5 w-3.5" /> Atualizar Cartão de Crédito</>
          )}
        </Button>

        {!renovacaoAutomatica ? (
          <Button variant="outline" size="sm" className="text-xs text-muted-foreground" disabled>
            Renovação Cancelada
          </Button>
        ) : (
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={handleStartCancel}>
            Cancelar assinatura
          </Button>
        )}
      </div>

      {/* Cancellation Flow Dialog */}
      <Dialog open={cancelStep > 0} onOpenChange={(open) => { if (!open) handleCancelClose(); }}>
        <DialogContent className="sm:max-w-lg">
          {cancelStep === 1 && (
            <>
              <DialogHeader>
                <DialogTitle>Poxa, é uma pena ver você partir... 😢</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">
                Para podermos melhorar a Moovi, conta pra gente: qual o motivo principal do cancelamento?
              </p>
              <RadioGroup value={cancelMotivo} onValueChange={setCancelMotivo} className="space-y-2 py-2">
                {cancelMotivos.map((m) => (
                  <div key={m.id} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-secondary/50 transition-colors">
                    <RadioGroupItem value={m.id} id={`motivo-${m.id}`} />
                    <Label htmlFor={`motivo-${m.id}`} className="text-sm cursor-pointer flex-1">{m.label}</Label>
                  </div>
                ))}
              </RadioGroup>
              <DialogFooter>
                <Button className="w-full" disabled={!cancelMotivo} onClick={() => setCancelStep(2)}>
                  Continuar
                </Button>
              </DialogFooter>
            </>
          )}

          {cancelStep === 2 && (
            <>
              <DialogHeader>
                <DialogTitle>Poderia nos dar mais detalhes?</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">Sua opinião vai direto para o nosso time de desenvolvimento.</p>
              <div className="space-y-1">
                <Textarea
                  placeholder="Por favor, detalhe sua experiência (mínimo de 50 caracteres)..."
                  value={cancelDetalhes}
                  onChange={(e) => setCancelDetalhes(e.target.value)}
                  className="min-h-[100px]"
                />
                <p className={`text-xs text-right ${cancelDetalhes.length >= 50 ? "text-success" : "text-destructive"}`}>
                  {cancelDetalhes.length} / 50 caracteres
                </p>
              </div>
              <DialogFooter className="flex-col gap-2 sm:flex-row">
                <Button variant="outline" className="w-full sm:w-auto" onClick={() => setCancelStep(1)}>
                  Voltar
                </Button>
                <Button className="w-full sm:w-auto" disabled={cancelDetalhes.length < 50} onClick={() => setCancelStep(3)}>
                  Continuar
                </Button>
              </DialogFooter>
            </>
          )}

          {cancelStep === 3 && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  Tem certeza que deseja cancelar a renovação?
                </DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">
                Seu plano continuará ativo até o fim do período já pago, mas você perderá seu preço atual em renovações futuras.
              </p>
              <DialogFooter className="flex-col gap-2 sm:flex-col">
                <Button className="w-full gap-2" onClick={handleCancelClose}>
                  <Heart className="h-4 w-4" /> Manter meu plano
                </Button>
                <Button
                  variant="ghost"
                  className="w-full text-destructive text-xs"
                  disabled={cancelLoading}
                  onClick={handleFinalCancel}
                >
                  {cancelLoading ? (
                    <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Processando...</>
                  ) : (
                    "Sim, cancelar renovação"
                  )}
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
            <AlertDialogTitle>Agendar Downgrade</AlertDialogTitle>
            <AlertDialogDescription>
              Como sua assinatura é anual, seu plano atual continuará ativo até o fim do ciclo vigente. O downgrade para o plano {downgradeTarget?.replace("Plano ", "")} entrará em vigor apenas na sua próxima data de renovação. Deseja confirmar o agendamento?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!loadingPlan}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={!!loadingPlan}
              onClick={async () => {
                if (!downgradeTarget) return;
                const planoKey = getPlanKey(downgradeTarget).toUpperCase();
                setLoadingPlan(getPlanKey(downgradeTarget));
                try {
                  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
                  const res = await fetch(
                    `https://${projectId}.supabase.co/functions/v1/agendar-downgrade`,
                    {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                      },
                      body: JSON.stringify({ plano_futuro: planoKey }),
                    }
                  );
                  if (!res.ok) throw new Error("Erro");
                  toast.success("Downgrade agendado com sucesso para a próxima renovação!");
                  refreshPlano();
                  setDowngradeTarget(null);
                } catch {
                  toast.error("Erro ao processar sua solicitação. Tente novamente.");
                } finally {
                  setLoadingPlan(null);
                }
              }}
            >
              {loadingPlan ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Processando...</>
              ) : (
                "Confirmar Agendamento"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SubscriptionPage;
