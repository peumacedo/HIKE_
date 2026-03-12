import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';

export default function PremissasPage() {
  return (
    <AppShell>
      <PageHeader
        title="Premissas Globais"
        description="Fonte padrão da modelagem financeira. Será a camada 1 da hierarquia de parâmetros."
      />
      <div className="p-6">
        <EmptyState
          title="Módulo em fundação"
          description="No bloco 3 serão implementados versionamento de premissas, trilha de auditoria e aplicação por organização."
        />
      </div>
    </AppShell>
  );
}
