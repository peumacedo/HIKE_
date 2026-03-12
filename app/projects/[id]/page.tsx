import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { getProjectById, getProjectCashProfile, getProjectDisbursementProfile, listProjectCostCategories, createProjectCostCategory, updateProjectCostCategory, updateProjectDetails, upsertProjectCashProfile, upsertProjectDisbursementProfile } from '@/lib/data/projects';
import { requireOrgRole, requireSession } from '@/lib/auth/helpers';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { SectionCard } from '@/components/ui/SectionCard';
import { CORE_FINANCIAL_PARAMETERS, listProjectAssumptionOverrides, resolveProjectEffectiveAssumptions, upsertProjectAssumptionOverride } from '@/lib/data/assumptions';

type ProjectPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ProjectDetailPage({ params }: ProjectPageProps) {
  await requireSession();
  const { id } = await params;
  const project = await getProjectById(id);
  await requireOrgRole(project.organization_id, ['admin', 'analyst', 'viewer']);

  const [effectiveAssumptions, overrides, cashProfile, disbursementProfile, categories] = await Promise.all([
    resolveProjectEffectiveAssumptions(id),
    listProjectAssumptionOverrides(id),
    getProjectCashProfile(id),
    getProjectDisbursementProfile(id),
    listProjectCostCategories(id),
  ]);

  async function updateProjectAction(formData: FormData) {
    'use server';
    await requireOrgRole(project.organization_id, ['admin', 'analyst']);
    await updateProjectDetails(id, {
      name: String(formData.get('name') || ''),
      code: String(formData.get('code') || ''),
      clientName: String(formData.get('clientName') || ''),
      status: String(formData.get('status') || 'draft'),
      contractValue: Number(formData.get('contractValue') || '') || undefined,
      startDate: String(formData.get('startDate') || '') || undefined,
      endDate: String(formData.get('endDate') || '') || undefined,
      description: String(formData.get('description') || ''),
    });
    revalidatePath(`/projects/${id}`);
  }

  async function upsertOverrideAction(formData: FormData) {
    'use server';
    await requireOrgRole(project.organization_id, ['admin', 'analyst']);
    await upsertProjectAssumptionOverride({
      projectId: id,
      assumptionKey: String(formData.get('assumptionKey') || ''),
      assumptionLabel: String(formData.get('assumptionLabel') || ''),
      value_numeric: Number(formData.get('valueNumeric') || '') || null,
      value_text: String(formData.get('valueText') || '') || null,
      unit: String(formData.get('unit') || '') || null,
    });
    revalidatePath(`/projects/${id}`);
  }

  async function upsertCashAction(formData: FormData) {
    'use server';
    await requireOrgRole(project.organization_id, ['admin', 'analyst']);
    await upsertProjectCashProfile({
      projectId: id,
      billingModel: String(formData.get('billingModel') || '') || undefined,
      receiptCycleDays: Number(formData.get('receiptCycleDays') || '') || undefined,
      advancePercentage: Number(formData.get('advancePercentage') || '') || undefined,
      finalDeliveryPercentage: Number(formData.get('finalDeliveryPercentage') || '') || undefined,
      workingCapitalBufferDays: Number(formData.get('workingCapitalBufferDays') || '') || undefined,
      expectedCollectionCurveJson: String(formData.get('expectedCollectionCurveJson') || '')
        ? JSON.parse(String(formData.get('expectedCollectionCurveJson')))
        : undefined,
    });
    revalidatePath(`/projects/${id}`);
  }

  async function upsertDisbursementAction(formData: FormData) {
    'use server';
    await requireOrgRole(project.organization_id, ['admin', 'analyst']);
    await upsertProjectDisbursementProfile({
      projectId: id,
      disbursementModel: String(formData.get('disbursementModel') || '') || undefined,
      supplierPaymentCycleDays: Number(formData.get('supplierPaymentCycleDays') || '') || undefined,
      upfrontCostPercentage: Number(formData.get('upfrontCostPercentage') || '') || undefined,
      productionCostDistributionJson: String(formData.get('productionCostDistributionJson') || '')
        ? JSON.parse(String(formData.get('productionCostDistributionJson')))
        : undefined,
      manualScheduleJson: String(formData.get('manualScheduleJson') || '')
        ? JSON.parse(String(formData.get('manualScheduleJson')))
        : undefined,
      notes: String(formData.get('notes') || '') || undefined,
    });
    revalidatePath(`/projects/${id}`);
  }

  async function createCategoryAction(formData: FormData) {
    'use server';
    await requireOrgRole(project.organization_id, ['admin', 'analyst']);
    await createProjectCostCategory({
      projectId: id,
      categoryName: String(formData.get('categoryName') || ''),
      categoryType: String(formData.get('categoryType') || 'other') as never,
      allocationMethod: String(formData.get('allocationMethod') || 'fixed_value') as never,
      defaultValue: Number(formData.get('defaultValue') || '') || undefined,
      active: String(formData.get('active') || 'on') === 'on',
    });
    revalidatePath(`/projects/${id}`);
  }

  async function updateCategoryAction(formData: FormData) {
    'use server';
    await requireOrgRole(project.organization_id, ['admin', 'analyst']);
    await updateProjectCostCategory(String(formData.get('id') || ''), {
      categoryName: String(formData.get('categoryName') || ''),
      categoryType: String(formData.get('categoryType') || 'other') as never,
      allocationMethod: String(formData.get('allocationMethod') || 'fixed_value') as never,
      defaultValue: Number(formData.get('defaultValue') || '') || undefined,
      active: String(formData.get('active') || '') === 'on',
    });
    revalidatePath(`/projects/${id}`);
  }

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
      <div className="grid gap-4 p-6">
        <SectionCard title="A. Identificação">
          <form action={updateProjectAction} className="grid gap-2 md:grid-cols-3">
            <input name="name" defaultValue={project.name} className="rounded border px-2 py-1 text-sm" />
            <input name="code" defaultValue={project.code} className="rounded border px-2 py-1 text-sm" />
            <input name="clientName" defaultValue={project.client_name ?? ''} className="rounded border px-2 py-1 text-sm" />
            <select name="status" defaultValue={project.status} className="rounded border px-2 py-1 text-sm">
              {['draft', 'active', 'paused', 'completed', 'archived'].map((st) => <option key={st}>{st}</option>)}
            </select>
            <input name="contractValue" type="number" step="0.01" defaultValue={project.contract_value ?? ''} className="rounded border px-2 py-1 text-sm" />
            <input name="startDate" type="date" defaultValue={project.start_date ?? ''} className="rounded border px-2 py-1 text-sm" />
            <input name="endDate" type="date" defaultValue={project.end_date ?? ''} className="rounded border px-2 py-1 text-sm" />
            <textarea name="description" defaultValue={project.description ?? ''} rows={3} className="rounded border px-2 py-1 text-sm md:col-span-2" />
            <button className="rounded bg-slate-900 px-3 py-2 text-sm text-white">Salvar identificação</button>
          </form>
        </SectionCard>

        <SectionCard title="B. Camada de herança de parâmetros">
          <table className="w-full text-sm">
            <thead><tr className="text-left"><th>Parâmetro</th><th>Valor efetivo</th><th>Origem</th></tr></thead>
            <tbody>
              {effectiveAssumptions.map((row) => (
                <tr key={row.assumption_key} className="border-t">
                  <td>{row.assumption_label}</td>
                  <td>{String(row.effective_value ?? '—')} {row.unit ?? ''}</td>
                  <td>{row.source_layer}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </SectionCard>

        <SectionCard title="C. Perfil de caixa">
          <form action={upsertCashAction} className="grid gap-2 md:grid-cols-3">
            <input name="billingModel" defaultValue={cashProfile?.billing_model ?? ''} placeholder="billing_model" className="rounded border px-2 py-1 text-sm" />
            <input name="receiptCycleDays" type="number" defaultValue={cashProfile?.receipt_cycle_days ?? ''} placeholder="receipt_cycle_days" className="rounded border px-2 py-1 text-sm" />
            <input name="advancePercentage" type="number" step="0.0001" defaultValue={cashProfile?.advance_percentage ?? ''} placeholder="advance_percentage" className="rounded border px-2 py-1 text-sm" />
            <input name="finalDeliveryPercentage" type="number" step="0.0001" defaultValue={cashProfile?.final_delivery_percentage ?? ''} placeholder="final_delivery_percentage" className="rounded border px-2 py-1 text-sm" />
            <input name="workingCapitalBufferDays" type="number" defaultValue={cashProfile?.working_capital_buffer_days ?? ''} placeholder="working_capital_buffer_days" className="rounded border px-2 py-1 text-sm" />
            <textarea name="expectedCollectionCurveJson" defaultValue={cashProfile?.expected_collection_curve_json ? JSON.stringify(cashProfile.expected_collection_curve_json) : ''} placeholder='{"curve":[...]} (json opcional)' className="rounded border px-2 py-1 text-sm" rows={2} />
            <button className="rounded bg-slate-900 px-3 py-2 text-sm text-white">Salvar perfil de caixa</button>
          </form>
        </SectionCard>

        <SectionCard title="D. Perfil de desembolso">
          <form action={upsertDisbursementAction} className="grid gap-2 md:grid-cols-3">
            <input name="disbursementModel" defaultValue={disbursementProfile?.disbursement_model ?? ''} placeholder="disbursement_model" className="rounded border px-2 py-1 text-sm" />
            <input name="supplierPaymentCycleDays" type="number" defaultValue={disbursementProfile?.supplier_payment_cycle_days ?? ''} placeholder="supplier_payment_cycle_days" className="rounded border px-2 py-1 text-sm" />
            <input name="upfrontCostPercentage" type="number" step="0.0001" defaultValue={disbursementProfile?.upfront_cost_percentage ?? ''} placeholder="upfront_cost_percentage" className="rounded border px-2 py-1 text-sm" />
            <textarea name="productionCostDistributionJson" defaultValue={disbursementProfile?.production_cost_distribution_json ? JSON.stringify(disbursementProfile.production_cost_distribution_json) : ''} placeholder='{"distribution":[...]} (json)' className="rounded border px-2 py-1 text-sm" rows={2} />
            <textarea name="manualScheduleJson" defaultValue={disbursementProfile?.manual_schedule_json ? JSON.stringify(disbursementProfile.manual_schedule_json) : ''} placeholder='{"schedule":[...]} (json)' className="rounded border px-2 py-1 text-sm" rows={2} />
            <textarea name="notes" defaultValue={disbursementProfile?.notes ?? ''} placeholder="Notas" className="rounded border px-2 py-1 text-sm" rows={2} />
            <button className="rounded bg-slate-900 px-3 py-2 text-sm text-white">Salvar desembolso</button>
          </form>
        </SectionCard>

        <SectionCard title="E. Categorias de custo">
          <form action={createCategoryAction} className="mb-3 grid gap-2 md:grid-cols-5">
            <input name="categoryName" placeholder="Nome" className="rounded border px-2 py-1 text-sm" required />
            <select name="categoryType" className="rounded border px-2 py-1 text-sm">{['direct_cost', 'payroll', 'admin_allocation', 'contingency', 'other'].map((t) => <option key={t}>{t}</option>)}</select>
            <select name="allocationMethod" className="rounded border px-2 py-1 text-sm">{['fixed_value', 'percent_of_revenue', 'percent_of_cost', 'manual_schedule'].map((m) => <option key={m}>{m}</option>)}</select>
            <input name="defaultValue" type="number" step="0.0001" placeholder="Valor padrão" className="rounded border px-2 py-1 text-sm" />
            <label className="flex items-center gap-2 text-sm"><input name="active" type="checkbox" defaultChecked /> Ativo</label>
            <button className="rounded bg-slate-900 px-3 py-2 text-sm text-white">Adicionar categoria</button>
          </form>
          <div className="space-y-2">
            {categories.map((category) => (
              <form key={category.id} action={updateCategoryAction} className="grid gap-2 rounded border p-2 md:grid-cols-6">
                <input type="hidden" name="id" value={category.id} />
                <input name="categoryName" defaultValue={category.category_name} className="rounded border px-2 py-1 text-sm" />
                <select name="categoryType" defaultValue={category.category_type} className="rounded border px-2 py-1 text-sm">{['direct_cost', 'payroll', 'admin_allocation', 'contingency', 'other'].map((t) => <option key={t}>{t}</option>)}</select>
                <select name="allocationMethod" defaultValue={category.allocation_method} className="rounded border px-2 py-1 text-sm">{['fixed_value', 'percent_of_revenue', 'percent_of_cost', 'manual_schedule'].map((m) => <option key={m}>{m}</option>)}</select>
                <input name="defaultValue" type="number" step="0.0001" defaultValue={category.default_value ?? ''} className="rounded border px-2 py-1 text-sm" />
                <label className="flex items-center gap-2 text-sm"><input name="active" type="checkbox" defaultChecked={category.active} /> Ativo</label>
                <button className="rounded bg-slate-800 px-3 py-1 text-sm text-white">Atualizar</button>
              </form>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="F. Overrides explícitos do projeto">
          <div className="mb-2 text-xs text-slate-500">Se preencher override, ele vence template e global.</div>
          <div className="grid gap-2">
            {CORE_FINANCIAL_PARAMETERS.map((parameter) => {
              const current = effectiveAssumptions.find((row) => row.assumption_key === parameter.key);
              const existingOverride = overrides.find((row) => row.assumption_key === parameter.key);

              return (
                <form key={parameter.key} action={upsertOverrideAction} className="grid gap-2 rounded border p-2 md:grid-cols-6">
                  <input type="hidden" name="assumptionKey" value={parameter.key} />
                  <input type="hidden" name="assumptionLabel" value={parameter.label} />
                  <input type="hidden" name="unit" value={parameter.unit ?? ''} />
                  <div className="text-sm font-medium">{parameter.label}</div>
                  <div className="text-xs text-slate-600">Efetivo: {String(current?.effective_value ?? '—')} {current?.unit ?? ''}</div>
                  <div className="text-xs text-slate-600">Origem: {current?.source_layer ?? 'global'}</div>
                  <input
                    name="valueNumeric"
                    type="number"
                    step="0.0001"
                    defaultValue={existingOverride?.value_numeric ?? ''}
                    placeholder="Override numérico"
                    className="rounded border px-2 py-1 text-sm"
                  />
                  <input name="valueText" defaultValue={existingOverride?.value_text ?? ''} placeholder="Override texto" className="rounded border px-2 py-1 text-sm" />
                  <button className="rounded bg-slate-900 px-3 py-1 text-sm text-white">Salvar override</button>
                </form>
              );
            })}
          </div>
        </SectionCard>
      </div>
    </AppShell>
  );
}
