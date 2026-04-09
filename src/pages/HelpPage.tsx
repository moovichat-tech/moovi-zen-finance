import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { LayoutDashboard, ArrowDownCircle, ArrowUpCircle, Landmark, BarChart3 } from "lucide-react";

const items = [
  {
    icon: LayoutDashboard,
    title: "Visão Geral (Dashboard / Home)",
    content: "A tela inicial é o seu Termômetro Real. Ela mostra o dinheiro que efetivamente entrou no seu bolso e o que foi embora para terceiros. Ocultamos de forma inteligente movimentações internas (Transferências e Pagamento de Fatura de Cartão) para não duplicar gastos. A Home mostra para onde o seu dinheiro foi. As abas detalhadas mostram por onde ele passou.",
  },
  {
    icon: ArrowDownCircle,
    title: "Aba de Despesas",
    content: "Visão detalhada de todas as movimentações de saída da sua conta, incluindo transferências e faturas. Pago: soma de tudo o que já saiu efetivamente. Pendente: soma dos compromissos futuros. Total: soma absoluta de tudo (Pago + Pendente).",
  },
  {
    icon: ArrowUpCircle,
    title: "Aba de Receitas",
    content: "Detalha todo o dinheiro que entrou. Recebido: o que já está disponível na conta. Pendente: o que você ainda tem a receber no mês. Total: a soma de tudo o que entrou e o que ainda vai entrar. Nota: Transferências de contas da sua própria titularidade não inflam a sua Receita na tela inicial.",
  },
  {
    icon: Landmark,
    title: "Contas e Cartões",
    content: "A Moovi separa o seu dinheiro corrente do crédito. Contas Bancárias refletem o seu saldo real. Cartões de Crédito refletem o limite que o banco te emprestou. Gastos feitos no cartão entram na aba de Despesas na hora da compra, mas o dinheiro só sai da sua Conta Bancária no dia em que você registra o 'Pagamento da Fatura'.",
  },
  {
    icon: BarChart3,
    title: "Gráficos",
    content: "Os gráficos são a sua bússola financeira, alimentados exclusivamente por Gastos e Ganhos Reais (excluindo movimentações internas). Eles mostram exatamente no que você gastou (ex: alimentação, transporte), e não a ferramenta que você usou para pagar. Por isso faturas de cartão não aparecem aqui.",
  },
];

const HelpPage = () => (
  <div className="w-full max-w-3xl mx-auto py-6 px-2 sm:px-4">
    <Card className="shadow-md">
      <CardHeader className="space-y-3">
        <CardTitle className="text-xl sm:text-2xl font-bold text-primary">
          Entendendo o seu Painel Moovi
        </CardTitle>
        <CardDescription className="text-sm sm:text-base leading-relaxed text-muted-foreground">
          A Moovi foi desenvolvida com lógica de contabilidade profissional. Nosso objetivo não é
          apenas anotar números, mas mostrar a realidade do seu bolso sem distorções. Se você notou
          alguma diferença entre os números da tela inicial e das abas detalhadas, não se preocupe!
          Abaixo explicamos como a nossa inteligência financeira funciona.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          {items.map((item, i) => (
            <AccordionItem key={i} value={`item-${i}`}>
              <AccordionTrigger className="text-left gap-3 hover:no-underline">
                <span className="flex items-center gap-3">
                  <item.icon className="h-5 w-5 shrink-0 text-primary" />
                  <span className="font-medium text-sm sm:text-base">{item.title}</span>
                </span>
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed text-sm pl-8">
                {item.content}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  </div>
);

export default HelpPage;
