import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';

export default function FundingPage() {
  return (
    <AppShell>
      <PageHeader
        title="Funding"
        description="Estrutura para linhas de crédito e simulações de impacto no caixa por projeto."
      />
      <div className="p-6">
        <EmptyState
          title="Base pronta para evolução"
          description="No bloco 7 serão implementadas linhas de funding, drawdown e custo financeiro projetado."
        />
      </div>
    </AppShell>
  );
}
