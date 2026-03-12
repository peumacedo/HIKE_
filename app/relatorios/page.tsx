import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';

export default function RelatoriosPage() {
  return (
    <AppShell>
      <PageHeader
        title="Relatórios"
        description="Camada executiva para snapshots e análise de planejado vs realizado por projeto e portfólio."
      />
      <div className="p-6">
        <EmptyState
          title="Base pronta para evolução"
          description="No bloco 10 serão criados dashboards e relatórios executivos com KPIs e trilha histórica."
        />
      </div>
    </AppShell>
  );
}
