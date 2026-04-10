import { Card } from '@/components/ui/card';
import PlanGuard from '@/components/PlanGuard';
import { Badge } from '@/components/ui/badge';
import { Landmark, ArrowRightLeft, ShieldCheck, Zap } from 'lucide-react';

const OpenFinancePage = () => {
  return (
    <PlanGuard requiredPlan="premium" featureName="Open Finance">
    <div className="space-y-6 animate-in-up">
      <div>
        <h2 className="text-lg sm:text-xl font-semibold">Open Finance</h2>
        <p className="text-sm text-muted-foreground">Conecte suas contas bancárias automaticamente</p>
      </div>

      <Card className="p-8 sm:p-12 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-6">
          <Landmark className="h-8 w-8 text-primary" />
        </div>
        <Badge variant="secondary" className="mb-4 text-xs">Em breve</Badge>
        <h3 className="text-xl font-semibold mb-2">Open Finance está chegando!</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Em breve você poderá conectar suas contas bancárias diretamente ao Moovi. 
          Seus lançamentos serão importados automaticamente, sem precisar digitar nada.
        </p>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-lg mx-auto">
          <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-secondary/50">
            <ArrowRightLeft className="h-5 w-5 text-primary" />
            <span className="text-xs font-medium">Importação automática</span>
          </div>
          <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-secondary/50">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <span className="text-xs font-medium">100% seguro</span>
          </div>
          <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-secondary/50">
            <Zap className="h-5 w-5 text-primary" />
            <span className="text-xs font-medium">Categorização IA</span>
          </div>
        </div>
      </Card>
    </div>
    </PlanGuard>
  );
};

export default OpenFinancePage;
