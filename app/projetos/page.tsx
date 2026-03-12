import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';

export default function ProjetosPage() {
  return (
    <AppShell>
      <PageHeader
        title="Projetos"
        description="Cadastro de projetos como entidades financeiras independentes, não apenas registros administrativos."
      />
      <div className="p-6">
        <EmptyState
          title="Módulo em fundação"
          description="No bloco 4 será habilitado cadastro com vínculo a template e overrides de premissas por projeto."
        />
      </div>
    </AppShell>
  );
}
