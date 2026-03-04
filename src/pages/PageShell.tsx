import { useI18n } from '@/i18n/context';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

interface PageShellProps {
  pageKey: 'income' | 'expenses' | 'cards' | 'accounts' | 'budget' | 'reports' | 'ai';
}

const PageShell = ({ pageKey }: PageShellProps) => {
  const { t } = useI18n();
  const page = t.pages[pageKey];

  return (
    <div className="space-y-6 animate-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">{page.title}</h2>
          <p className="text-sm text-muted-foreground">{page.subtitle}</p>
        </div>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          {t.common.add}
        </Button>
      </div>
      <Card className="flex min-h-[400px] items-center justify-center p-12 text-center">
        <div>
          <p className="text-sm text-muted-foreground">
            {page.title} — Em breve
          </p>
        </div>
      </Card>
    </div>
  );
};

export default PageShell;
