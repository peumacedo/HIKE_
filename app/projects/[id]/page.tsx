import Link from 'next/link';
import { getProjectById } from '@/lib/data/projects';
import { requireSession } from '@/lib/auth/helpers';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { SectionCard } from '@/components/ui/SectionCard';

type ProjectPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ProjectDetailPage({ params }: ProjectPageProps) {
  await requireSession();
  const { id } = await params;
  const project = await getProjectById(id);

  return (
    <AppShell>
      <PageHeader
        title={`Projeto ${project.code}`}
        description={project.name}
        actions={
          <Link href="/projects" className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-800">
            Voltar
          </Link>
        }
      />
      <div className="grid gap-4 p-6 lg:grid-cols-2">
        <SectionCard title="Identificação">
          <p className="text-sm text-slate-700">Status: {project.status}</p>
          <p className="text-sm text-slate-700">Cliente: {project.client_name ?? 'Não informado'}</p>
          <p className="text-sm text-slate-700">Valor contratual: {project.contract_value ?? 'Não informado'}</p>
        </SectionCard>

        <SectionCard title="Template vinculado">
          <p className="text-sm text-slate-700">
            {project.project_templates
              ? `${project.project_templates.code} - ${project.project_templates.name}`
              : 'Sem template'}
          </p>
        </SectionCard>

        <SectionCard title="Datas">
          <p className="text-sm text-slate-700">Início: {project.start_date ?? 'Não informado'}</p>
          <p className="text-sm text-slate-700">Fim: {project.end_date ?? 'Não informado'}</p>
        </SectionCard>

        <SectionCard title="Descrição">
          <p className="text-sm text-slate-700">{project.description ?? 'Sem descrição.'}</p>
        </SectionCard>
      </div>
    </AppShell>
  );
}
