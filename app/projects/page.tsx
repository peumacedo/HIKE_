import Link from 'next/link';
import { getUserMemberships, requireSession } from '@/lib/auth/helpers';
import { listProjects } from '@/lib/data/projects';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { SectionCard } from '@/components/ui/SectionCard';

export const dynamic = 'force-dynamic';
export default async function ProjectsPage() {
  await requireSession();
  const memberships = await getUserMemberships();
  const orgId = memberships?.[0]?.organization_id;
  const projects = orgId ? await listProjects(orgId) : [];

  return (
    <AppShell>
      <PageHeader
        title="Projetos"
        description="Cadastro e acompanhamento dos projetos financeiros da organização."
        actions={
          <Link className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white" href="/projects/new">
            Novo projeto
          </Link>
        }
      />
      <div className="grid gap-4 p-6">
        {projects.length === 0 ? (
          <SectionCard title="Nenhum projeto encontrado">
            <p className="text-sm text-slate-600">Crie um projeto para iniciar a modelagem financeira.</p>
          </SectionCard>
        ) : (
          projects.map((project) => (
            <SectionCard key={project.id} title={`${project.code} — ${project.name}`}>
              <p className="text-sm text-slate-600">Status: {project.status}</p>
              <Link href={`/projects/${project.id}`} className="mt-3 inline-block text-sm font-medium text-slate-900 underline">
                Abrir detalhes
              </Link>
            </SectionCard>
          ))
        )}
      </div>
    </AppShell>
  );
}
