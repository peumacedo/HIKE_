import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';

export default function IntegracoesPage() {
  return (
    <AppShell>
      <PageHeader
        title="Integrações"
        description="Arquitetura preparada para ingestão read-only da Omie com staging, mapeamento e reconciliação."
      />
      <div className="p-6">
        <EmptyState
          title="Integração Omie preparada"
          description="No bloco 9 será implementado o conector real, jobs de sync e consolidação do dado importado."
        />
      </div>
    </AppShell>
  );
}
