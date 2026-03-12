import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';

export default function TemplatesPage() {
  return (
    <AppShell>
      <PageHeader
        title="Templates de Projeto"
        description="Camada 2 da hierarquia: parâmetros por tipologia de projeto para acelerar setup com controle."
      />
      <div className="p-6">
        <EmptyState
          title="Módulo em fundação"
          description="No bloco 3 será possível criar templates e associar parâmetros padrão por tipo de projeto."
        />
      </div>
    </AppShell>
  );
}
