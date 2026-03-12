import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';

export default function FluxoCaixaPage() {
  return (
    <AppShell>
      <PageHeader
        title="Fluxo de Caixa"
        description="Visão do comportamento de entrada e saída por projeto, com separação entre previsto e realizado."
      />
      <div className="p-6">
        <EmptyState
          title="Base pronta para evolução"
          description="No bloco 6 o fluxo operacional será conectado ao motor de caixa e às comparações por cenário."
        />
      </div>
    </AppShell>
  );
}
