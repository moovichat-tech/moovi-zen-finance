import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import PageShell from "./PageShell";

const items = [
  {
    emoji: "🏠",
    title: "Visão Geral (Dashboard / Home)",
    content: "A tela inicial é o seu Termômetro Real. Ela mostra o dinheiro que efetivamente entrou no seu bolso e o que foi embora para terceiros. Ocultamos de forma inteligente movimentações internas (Transferências e Pagamento de Fatura) para não duplicar gastos. A Home mostra para onde o seu dinheiro foi. As abas detalhadas mostram por onde ele passou.",
  },
  {
    emoji: "💸",
    title: "Aba de Despesas",
    content: (
      <div className="space-y-1.5">
        <p>Visão detalhada de todas as movimentações de saída da sua conta.</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Pago:</strong> soma de tudo o que já saiu efetivamente.</li>
          <li><strong>Pendente:</strong> soma dos compromissos futuros.</li>
          <li><strong>Total:</strong> soma absoluta de tudo (Pago + Pendente).</li>
        </ul>
      </div>
    ),
  },
  {
    emoji: "💰",
    title: "Aba de Receitas",
    content: (
      <div className="space-y-1.5">
        <p>Detalha todo o dinheiro que entrou.</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Recebido:</strong> o que já está disponível na conta.</li>
          <li><strong>Pendente:</strong> o que você ainda tem a receber no mês.</li>
          <li><strong>Total:</strong> a soma de tudo o que entrou e o que ainda vai entrar.</li>
        </ul>
        <p className="text-xs italic">(Nota: Transferências de contas próprias não inflam a sua Receita na tela inicial).</p>
      </div>
    ),
  },
  {
    emoji: "🏦",
    title: "Contas e Cartões",
    content: "A Moovi separa o seu dinheiro corrente do crédito. Contas Bancárias refletem o seu saldo real. Cartões de Crédito refletem o limite emprestado. Gastos no cartão entram na aba de Despesas na hora da compra, mas o dinheiro só sai da sua Conta Bancária no dia em que você registra o 'Pagamento da Fatura'.",
  },
  {
    emoji: "📈",
    title: "Gráficos",
    content: "Os gráficos são a sua bússola financeira, alimentados exclusivamente por Gastos e Ganhos Reais (excluindo movimentações internas). Eles mostram exatamente no que você gastou (ex: alimentação, transporte), e não a ferramenta usada para pagar. Por isso faturas de cartão não aparecem aqui.",
  },
];

const HelpPage = () => (
  <PageShell>
    <div className="w-full max-w-3xl mx-auto">
      <Card className="shadow-md">
        <CardHeader className="space-y-3">
          <CardTitle className="text-xl sm:text-2xl font-bold text-primary">
            Entendendo o seu Painel Moovi
          </CardTitle>
          <CardDescription className="text-sm sm:text-base leading-relaxed text-muted-foreground">
            A Moovi foi desenvolvida com lógica de contabilidade profissional. Nosso objetivo não é
            apenas anotar números, mas mostrar a realidade do seu bolso sem distorções.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {items.map((item, i) => (
              <AccordionItem key={i} value={`item-${i}`}>
                <AccordionTrigger className="text-left gap-3 hover:no-underline">
                  <span className="flex items-center gap-2.5">
                    <span className="text-lg shrink-0">{item.emoji}</span>
                    <span className="font-medium text-sm sm:text-base">{item.title}</span>
                  </span>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed text-sm pl-9">
                  {item.content}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>
    </div>
  </PageShell>
);

export default HelpPage;
