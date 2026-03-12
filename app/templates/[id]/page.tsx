import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { requireSession, requireOrgRole } from '@/lib/auth/helpers';
import { CORE_FINANCIAL_PARAMETERS, listTemplateAssumptionDefaults, upsertTemplateAssumptionDefault } from '@/lib/data/assumptions';
import { getTemplateById } from '@/lib/data/templates';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { SectionCard } from '@/components/ui/SectionCard';

type Props = { params: Promise<{ id: string }> };

export default async function TemplateDetailPage({ params }: Props) {
  await requireSession();
  const { id } = await params;
  const template = await getTemplateById(id);
  await requireOrgRole(template.organization_id, ['admin', 'analyst', 'viewer']);
  const defaults = await listTemplateAssumptionDefaults(id);

  async function upsertDefaultAction(formData: FormData) {
    'use server';
    await requireOrgRole(template.organization_id, ['admin', 'analyst']);
    await upsertTemplateAssumptionDefault({
      templateId: id,
      assumptionKey: String(formData.get('assumptionKey') || ''),
      assumptionLabel: String(formData.get('assumptionLabel') || ''),
      value_numeric: Number(formData.get('valueNumeric') || '') || null,
      value_text: String(formData.get('valueText') || '') || null,
      unit: String(formData.get('unit') || '') || null,
    });
    revalidatePath(`/templates/${id}`);
  }

  return (
    <AppShell>
      <PageHeader
        title={`Template ${template.code}`}
        description="Defaults financeiros (camada intermediária entre global e projeto)."
        actions={<Link href="/templates" className="rounded-md border px-3 py-2 text-sm">Voltar</Link>}
      />
      <div className="grid gap-4 p-6">
        <SectionCard title="Identificação">
          <p className="text-sm">{template.name}</p>
          <p className="text-sm text-slate-600">{template.description ?? 'Sem descrição.'}</p>
        </SectionCard>

        <SectionCard title="Cadastrar / editar default financeiro">
          <form action={upsertDefaultAction} className="grid gap-2 md:grid-cols-3">
            <input name="assumptionKey" className="rounded border px-2 py-1 text-sm" placeholder="assumption_key" required />
            <input name="assumptionLabel" className="rounded border px-2 py-1 text-sm" placeholder="Rótulo" required />
            <input name="unit" className="rounded border px-2 py-1 text-sm" placeholder="Unidade" />
            <input name="valueNumeric" type="number" step="0.0001" className="rounded border px-2 py-1 text-sm" placeholder="Valor numérico" />
            <input name="valueText" className="rounded border px-2 py-1 text-sm" placeholder="Valor texto" />
            <button className="rounded bg-slate-900 px-3 py-2 text-sm text-white">Salvar default</button>
          </form>
          <p className="mt-2 text-xs text-slate-500">Sugestão: {CORE_FINANCIAL_PARAMETERS.map((p) => p.key).join(', ')}</p>
        </SectionCard>

        <SectionCard title="Defaults atuais do template">
          <div className="space-y-2">
            {defaults.map((item) => (
              <form key={item.id} action={upsertDefaultAction} className="grid gap-2 rounded border p-2 md:grid-cols-5">
                <input name="assumptionKey" defaultValue={item.assumption_key} className="rounded border px-2 py-1 text-sm" />
                <input name="assumptionLabel" defaultValue={item.assumption_label} className="rounded border px-2 py-1 text-sm" />
                <input name="valueNumeric" defaultValue={item.value_numeric ?? ''} type="number" step="0.0001" className="rounded border px-2 py-1 text-sm" />
                <input name="valueText" defaultValue={item.value_text ?? ''} className="rounded border px-2 py-1 text-sm" />
                <button className="rounded bg-slate-800 px-3 py-1 text-sm text-white">Atualizar</button>
                <input name="unit" defaultValue={item.unit ?? ''} className="rounded border px-2 py-1 text-sm md:col-span-2" placeholder="Unidade" />
              </form>
            ))}
          </div>
        </SectionCard>
      </div>
    </AppShell>
  );
}
