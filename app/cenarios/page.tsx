import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';

export default function CenariosPage() {
  return (
    <AppShell>
      <PageHeader
        title="Cenários"
        description="Comparação entre cenário base, conservador e estresse para apoiar decisões de risco."
      />
      <div className="p-6">
        <EmptyState
          title="Base pronta para evolução"
          description="No bloco 8 entra a camada de variações paramétricas e comparativos estruturados entre cenários."
        />
      </div>
    </AppShell>
  );
}
