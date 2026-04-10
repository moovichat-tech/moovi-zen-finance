import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Lock } from 'lucide-react';

export type PlanTier = 'basico' | 'pro' | 'premium';

const PLAN_LEVEL: Record<PlanTier, number> = {
  basico: 0,
  pro: 1,
  premium: 2,
};

interface PlanGuardProps {
  children: ReactNode;
  requiredPlan: PlanTier;
  featureName: string;
  variant?: 'default' | 'compact';
}

const PlanGuard = ({ children, requiredPlan, featureName, variant = 'default' }: PlanGuardProps) => {
  const { plano } = useAuth();
  const navigate = useNavigate();

  const userLevel = PLAN_LEVEL[plano || 'basico'];
  const requiredLevel = PLAN_LEVEL[requiredPlan];
  const isLocked = userLevel < requiredLevel;

  if (!isLocked) {
    return <>{children}</>;
  }

  if (variant === 'compact') {
    return (
      <div className="relative inline-block w-fit h-fit">
        <div className="pointer-events-none select-none" aria-hidden="true">
          <div className="filter blur-[3px] opacity-50">
            {children}
          </div>
        </div>
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs shadow-sm"
            onClick={() => navigate('/subscription')}
          >
            <Lock className="h-3 w-3" />
            Upgrade {requiredPlan.toUpperCase()}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="pointer-events-none select-none" aria-hidden="true">
        <div className="filter blur-[6px] opacity-60">
          {children}
        </div>
      </div>
      <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/30 backdrop-blur-sm rounded-lg">
        <div className="flex flex-col items-center gap-4 text-center px-6 max-w-sm">
          <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
            <Lock className="h-7 w-7 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground">
            Esta funcionalidade requer o plano <span className="font-semibold text-foreground capitalize">{requiredPlan}</span>.
          </p>
          <Button
            onClick={() => navigate('/subscription')}
            className="gap-2"
            size="lg"
          >
            Desbloquear {featureName}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PlanGuard;
