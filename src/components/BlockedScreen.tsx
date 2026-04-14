import { useState } from 'react';
import { ShieldAlert, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export const BlockedScreen = () => {
  const { telefone } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleReactivate = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('https://n8n.fisherai.shop/webhook/reativar-assinatura', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-moovi-token': 'moovi-secreto-2026',
        },
        body: JSON.stringify({
          telefone: telefone?.replace(/\D/g, '') || '',
        }),
      });

      if (!res.ok) throw new Error('Erro na requisição');

      const data = await res.json();

      if (data.invoiceUrl) {
        window.location.href = data.invoiceUrl;
      } else {
        throw new Error('URL de pagamento não encontrada');
      }
    } catch {
      toast.error('Erro ao processar sua solicitação. Tente novamente.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <Card className="max-w-md w-full border-destructive/30">
        <CardContent className="flex flex-col items-center text-center pt-10 pb-8 px-8 space-y-6">
          <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <ShieldAlert className="h-8 w-8 text-destructive" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-semibold">Assinatura Suspensa</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Ocorreu um problema com o pagamento da sua renovação. Regularize sua assinatura para voltar a ter acesso total à Moovi.
            </p>
          </div>

          <Button
            size="lg"
            className="w-full"
            onClick={handleReactivate}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processando...
              </>
            ) : (
              'Regularizar Assinatura'
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
