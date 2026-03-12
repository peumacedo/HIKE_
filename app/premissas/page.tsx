import { revalidatePath } from 'next/cache';
import { getUserMemberships, requireOrgRole, requireSession } from '@/lib/auth/helpers';
import {
  CORE_FINANCIAL_PARAMETERS,
  createOrganizationAssumption,
  listOrganizationAssumptions,
  updateOrganizationAssumption,
} from '@/lib/data/assumptions';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { SectionCard } from '@/components/ui/SectionCard';

const CATEGORIES = [
  'Receita / Recebimento',
  'Custos Diretos',
  'Folha / Estrutura',
  'Administração',
  'Caixa / Capital de Giro',
  'Contingência',
  'Outros',
];

export default async function PremissasPage() {
  await requireSession();
  const memberships = await getUserMemberships();
  const orgId = memberships?.[0]?.organization_id;

  if (!orgId) {
    return <AppShell><PageHeader title="Premissas" description="Sem organização vinculada." /></AppShell>;
  }

  await requireOrgRole(orgId, ['admin', 'analyst', 'viewer']);
  const assumptions = await listOrganizationAssumptions(orgId);

  async function createAction(formData: FormData) {
    'use server';
    await requireOrgRole(orgId, ['admin', 'analyst']);
    await createOrganizationAssumption({
      organizationId: orgId,
      assumptionKey: String(formData.get('assumptionKey') || ''),
      assumptionLabel: String(formData.get('assumptionLabel') || ''),
      category: String(formData.get('category') || 'Outros'),
      value_numeric: Number(formData.get('valueNumeric') || '') || null,
      value_text: String(formData.get('valueText') || '') || null,
      unit: String(formData.get('unit') || '') || null,
      description: String(formData.get('description') || '') || null,
      active: String(formData.get('active') || 'on') === 'on',
    });
    revalidatePath('/premissas');
  }

  async function updateAction(formData: FormData) {
    'use server';
    await requireOrgRole(orgId, ['admin', 'analyst']);
    await updateOrganizationAssumption(String(formData.get('id')), {
      assumptionLabel: String(formData.get('assumptionLabel') || ''),
      category: String(formData.get('category') || 'Outros'),
      value_numeric: Number(formData.get('valueNumeric') || '') || null,
      value_text: String(formData.get('valueText') || '') || null,
      unit: String(formData.get('unit') || '') || null,
      description: String(formData.get('description') || '') || null,
      active: String(formData.get('active') || '') === 'on',
    });
    revalidatePath('/premissas');
  }

  return (
    <AppShell>
      <PageHeader title="Premissas Globais" description="Camada 1 da hierarquia financeira por organização." />
      <div className="grid gap-4 p-6">
        <SectionCard title="Nova premissa global">
          <form action={createAction} className="grid gap-2 md:grid-cols-3">
            <input name="assumptionKey" className="rounded border px-2 py-1 text-sm" placeholder="Chave (ex: admin_rate_pct)" required />
            <input name="assumptionLabel" className="rounded border px-2 py-1 text-sm" placeholder="Nome da premissa" required />
            <select name="category" className="rounded border px-2 py-1 text-sm">{CATEGORIES.map((cat) => <option key={cat}>{cat}</option>)}</select>
            <input name="valueNumeric" type="number" step="0.0001" className="rounded border px-2 py-1 text-sm" placeholder="Valor numérico" />
            <input name="valueText" className="rounded border px-2 py-1 text-sm" placeholder="Valor texto (opcional)" />
            <input name="unit" className="rounded border px-2 py-1 text-sm" placeholder="Unidade (%, dias...)" />
            <textarea name="description" className="rounded border px-2 py-1 text-sm md:col-span-2" placeholder="Descrição" rows={2} />
            <label className="flex items-center gap-2 text-sm"><input name="active" type="checkbox" defaultChecked /> Ativa</label>
            <button className="rounded bg-slate-900 px-3 py-2 text-sm text-white md:col-span-3">Salvar premissa</button>
          </form>
          <p className="mt-2 text-xs text-slate-500">Parâmetros chave do MVP: {CORE_FINANCIAL_PARAMETERS.map((p) => p.key).join(', ')}</p>
        </SectionCard>

        <SectionCard title="Premissas existentes">
          <div className="space-y-3">
            {assumptions.map((item) => (
              <form key={item.id} action={updateAction} className="grid gap-2 rounded border p-3 md:grid-cols-4">
                <input type="hidden" name="id" value={item.id} />
                <div className="text-xs text-slate-500">{item.assumption_key}</div>
                <input name="assumptionLabel" defaultValue={item.assumption_label} className="rounded border px-2 py-1 text-sm" />
                <select name="category" defaultValue={item.category} className="rounded border px-2 py-1 text-sm">{CATEGORIES.map((cat) => <option key={cat}>{cat}</option>)}</select>
                <input name="unit" defaultValue={item.unit ?? ''} className="rounded border px-2 py-1 text-sm" placeholder="Unidade" />
                <input name="valueNumeric" type="number" step="0.0001" defaultValue={item.value_numeric ?? ''} className="rounded border px-2 py-1 text-sm" />
                <input name="valueText" defaultValue={item.value_text ?? ''} className="rounded border px-2 py-1 text-sm" />
                <input name="description" defaultValue={item.description ?? ''} className="rounded border px-2 py-1 text-sm" />
                <label className="flex items-center gap-2 text-sm"><input name="active" type="checkbox" defaultChecked={item.active} /> Ativa</label>
                <button className="rounded bg-slate-800 px-3 py-2 text-sm text-white">Atualizar</button>
              </form>
            ))}
          </div>
        </SectionCard>
      </div>
    </AppShell>
  );
}
