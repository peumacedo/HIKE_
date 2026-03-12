import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { ModuleStatusCard } from '@/components/ui/ModuleStatusCard';
import { SectionCard } from '@/components/ui/SectionCard';
import { StatCard } from '@/components/ui/StatCard';

const modules = [
  {
    module: 'Premissas Globais',
    status: 'foundation' as const,
    scope: 'Estrutura preparada para defaults organizacionais e versionamento de premissas.'
  },
  {
    module: 'Templates de Projeto',
    status: 'foundation' as const,
    scope: 'Base pronta para especializações por tipo de projeto e herança de parâmetros.'
  },
  {
    module: 'Integrações Omie',
    status: 'foundation' as const,
    scope: 'Arquitetura de conexão, staging e sincronização idempotente documentada.'
  },
  {
    module: 'Relatórios Executivos',
    status: 'planned' as const,
    scope: 'Preparado para snapshots, KPIs e comparativos planejado vs realizado.'
  }
];

export default function DashboardPage() {
  return (
    <AppShell>
      <PageHeader
        title="Dashboard"
        description="Cockpit executivo para advisory financeiro multi-projeto, com separação clara entre planejado, projetado e realizado."
      />
      <div className="space-y-6 p-6">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Projetos monitorados" value="0" helper="Cadastro será habilitado no bloco 4." />
          <StatCard label="Cenários ativos" value="3" helper="Base, conservador e estresse já previstos na arquitetura." />
          <StatCard label="Conexões ERP" value="0" helper="Modelo Omie preparado, sincronização real entra no bloco 9." />
          <StatCard label="Último snapshot" value="—" helper="Snapshots executivos entram no bloco 10." />
        </section>

        <SectionCard
          title="Mapa da fundação"
          description="Módulos com base estabelecida para evolução incremental, sem acoplamento prematuro de regras financeiras."
        >
          <div className="grid gap-4 lg:grid-cols-2">{modules.map((item) => <ModuleStatusCard key={item.module} {...item} />)}</div>
        </SectionCard>
      </div>
    </AppShell>
  );
}
