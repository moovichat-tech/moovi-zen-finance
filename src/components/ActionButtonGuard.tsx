import { ReactNode, useState, cloneElement, isValidElement, MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Lock, Sparkles } from 'lucide-react';

export type PlanTier = 'basico' | 'pro' | 'premium';

const PLAN_LEVEL: Record<PlanTier, number> = {
  basico: 0,
  pro: 1,
  premium: 2,
};

const PLAN_LABELS: Record<PlanTier, string> = {
  basico: 'Básico',
  pro: 'PRO',
  premium: 'PREMIUM',
};

interface ActionButtonGuardProps {
  /** The trigger element (typically a Button). Its onClick will be intercepted when locked. */
  children: ReactNode;
  /** Minimum plan required to perform this action. */
  requiredPlan: PlanTier;
  /** Friendly name of the feature shown in the upgrade modal. */
  featureName: string;
  /** Optional description shown inside the modal. */
  description?: string;
}

/**
 * Wraps an action button (or any clickable element). If the user's plan is below
 * `requiredPlan`, intercepts the click and opens an upgrade modal instead of
 * executing the action.
 */
const ActionButtonGuard = ({ children, requiredPlan, featureName, description }: ActionButtonGuardProps) => {
  const { plano } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const userLevel = PLAN_LEVEL[plano || 'basico'];
  const requiredLevel = PLAN_LEVEL[requiredPlan];
  const isLocked = userLevel < requiredLevel;

  if (!isValidElement(children)) {
    return <>{children}</>;
  }

  if (!isLocked) {
    return <>{children}</>;
  }

  const wrapped = cloneElement(children as React.ReactElement, {
    onClick: (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setOpen(true);
    },
    // Keep visually enabled — we want users to click and see the upgrade modal.
    disabled: false,
    'data-locked': 'true',
  });

  const handleUpgrade = () => {
    setOpen(false);
    navigate('/subscription');
  };

  return (
    <>
      {wrapped}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <Lock className="h-7 w-7 text-primary" />
            </div>
            <DialogTitle className="text-center text-lg">
              Recurso disponível no plano {PLAN_LABELS[requiredPlan]}
            </DialogTitle>
            <DialogDescription className="text-center pt-1">
              {description ?? (
                <>
                  A funcionalidade <span className="font-medium text-foreground">{featureName}</span> requer o plano{' '}
                  <span className="font-medium text-foreground">{PLAN_LABELS[requiredPlan]}</span>. Faça o upgrade para desbloquear.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-col gap-2 sm:gap-2 pt-2">
            <Button size="lg" className="w-full gap-2" onClick={handleUpgrade}>
              <Sparkles className="h-4 w-4" />
              Fazer upgrade para {PLAN_LABELS[requiredPlan]}
            </Button>
            <Button variant="ghost" size="sm" className="w-full" onClick={() => setOpen(false)}>
              Agora não
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ActionButtonGuard;
