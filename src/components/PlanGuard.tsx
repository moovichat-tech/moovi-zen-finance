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
}

const PlanGuard = ({ children, requiredPlan, featureName }: PlanGuardProps) => {
  const { plano } = useAuth();
  const navigate = useNavigate();

  const userLevel = PLAN_LEVEL[plano || 'basico'];
  const requiredLevel = PLAN_LEVEL[requiredPlan];
  const isLocked = userLevel < requiredLevel;

  if (!isLocked) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      {/* Blurred content behind */}
      <div className="pointer-events-none select-none" aria-hidden="true">
        <div className="filter blur-[6px] opacity-60">
          {children}
        </div>
      </div>

      {/* Overlay */}
      <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/40 backdrop-blur-sm rounded-lg">
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
