import { createClient } from '@/lib/supabase/server';

export type AssumptionValue = {
  value_numeric?: number | null;
  value_text?: string | null;
  value_json?: unknown | null;
};

function hasAssumptionValue(value: AssumptionValue) {
  return value.value_numeric != null || value.value_text != null || value.value_json != null;
}

export const CORE_FINANCIAL_PARAMETERS = [
  { key: 'admin_rate_pct', label: 'Taxa administrativa', unit: '%' },
  { key: 'direct_cost_pct', label: 'Percentual de custo direto', unit: '%' },
  { key: 'payroll_weight_pct', label: 'Peso de folha', unit: '%' },
  { key: 'contingency_pct', label: 'Contingência', unit: '%' },
  { key: 'receipt_cycle_days', label: 'Ciclo de recebimento', unit: 'dias' },
  { key: 'advance_percentage', label: 'Percentual de entrada', unit: '%' },
  { key: 'final_delivery_percentage', label: 'Percentual na entrega final', unit: '%' },
  { key: 'supplier_payment_cycle_days', label: 'Ciclo de pagamento a fornecedores', unit: 'dias' },
  { key: 'working_capital_buffer_days', label: 'Buffer de capital de giro', unit: 'dias' },
  { key: 'billing_model', label: 'Modelo de faturamento', unit: null },
  { key: 'disbursement_model', label: 'Modelo de desembolso', unit: null },
] as const;

export const SCENARIO_DRIVER_KEYS = [
  'admin_rate_pct',
  'direct_cost_pct',
  'payroll_weight_pct',
  'contingency_pct',
  'receipt_cycle_days',
  'advance_percentage',
  'final_delivery_percentage',
  'supplier_payment_cycle_days',
] as const;

export const EXPLICIT_OVERRIDE_PARAMETERS = CORE_FINANCIAL_PARAMETERS.filter((parameter) =>
  ['admin_rate_pct', 'direct_cost_pct', 'payroll_weight_pct', 'contingency_pct'].includes(parameter.key),
);

const CORE_PARAMETER_MAP = new Map(CORE_FINANCIAL_PARAMETERS.map((parameter) => [parameter.key, parameter]));

export async function listOrganizationAssumptions(organizationId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('organization_assumptions')
    .select('*')
    .eq('organization_id', organizationId)
    .order('assumption_label');

  if (error) throw error;
  return data;
}

export async function createOrganizationAssumption(input: {
  organizationId: string;
  assumptionKey: string;
  assumptionLabel: string;
  category: string;
  unit?: string;
  description?: string;
  active?: boolean;
} & AssumptionValue) {
  const supabase = await createClient();
  const { error } = await supabase.from('organization_assumptions').insert({
    organization_id: input.organizationId,
    assumption_key: input.assumptionKey,
    assumption_label: input.assumptionLabel,
    category: input.category,
    value_numeric: input.value_numeric ?? null,
    value_text: input.value_text ?? null,
    value_json: input.value_json ?? null,
    unit: input.unit ?? null,
    description: input.description ?? null,
    active: input.active ?? true,
  });

  if (error) throw error;
}

export async function updateOrganizationAssumption(
  id: string,
  input: {
    assumptionLabel: string;
    category: string;
    unit?: string;
    description?: string;
    active?: boolean;
  } & AssumptionValue,
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('organization_assumptions')
    .update({
      assumption_label: input.assumptionLabel,
      category: input.category,
      value_numeric: input.value_numeric ?? null,
      value_text: input.value_text ?? null,
      value_json: input.value_json ?? null,
      unit: input.unit ?? null,
      description: input.description ?? null,
      active: input.active ?? true,
    })
    .eq('id', id);

  if (error) throw error;
}

export async function listTemplateAssumptionDefaults(templateId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('template_assumption_defaults')
    .select('*')
    .eq('template_id', templateId)
    .order('assumption_label');

  if (error) throw error;
  return data;
}

export async function upsertTemplateAssumptionDefault(input: {
  templateId: string;
  assumptionKey: string;
  assumptionLabel: string;
  unit?: string;
} & AssumptionValue) {
  const supabase = await createClient();
  const { error } = await supabase.from('template_assumption_defaults').upsert(
    {
      template_id: input.templateId,
      assumption_key: input.assumptionKey,
      assumption_label: input.assumptionLabel,
      value_numeric: input.value_numeric ?? null,
      value_text: input.value_text ?? null,
      value_json: input.value_json ?? null,
      unit: input.unit ?? null,
    },
    { onConflict: 'template_id,assumption_key' },
  );

  if (error) throw error;
}

export async function listProjectAssumptionOverrides(projectId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('project_assumption_overrides')
    .select('*')
    .eq('project_id', projectId)
    .order('assumption_label');

  if (error) throw error;
  return data;
}

export async function upsertProjectAssumptionOverride(input: {
  projectId: string;
  assumptionKey: string;
  assumptionLabel: string;
  unit?: string;
} & AssumptionValue) {
  if (!hasAssumptionValue(input)) {
    await deleteProjectAssumptionOverride(input.projectId, input.assumptionKey);
    return;
  }

  const supabase = await createClient();
  const { error } = await supabase.from('project_assumption_overrides').upsert(
    {
      project_id: input.projectId,
      assumption_key: input.assumptionKey,
      assumption_label: input.assumptionLabel,
      value_numeric: input.value_numeric ?? null,
      value_text: input.value_text ?? null,
      value_json: input.value_json ?? null,
      unit: input.unit ?? null,
      source_type: 'manual',
    },
    { onConflict: 'project_id,assumption_key' },
  );

  if (error) throw error;
}

export async function deleteProjectAssumptionOverride(projectId: string, assumptionKey: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('project_assumption_overrides')
    .delete()
    .eq('project_id', projectId)
    .eq('assumption_key', assumptionKey);

  if (error) throw error;
}

export async function listScenarioOverrides(scenarioId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('scenario_assumption_overrides')
    .select('*')
    .eq('scenario_id', scenarioId)
    .order('assumption_label');

  if (error) throw error;
  return data ?? [];
}

export async function upsertScenarioOverride(input: {
  organizationId: string;
  scenarioId: string;
  assumptionKey: string;
  assumptionLabel: string;
  unit?: string;
} & AssumptionValue) {
  if (!hasAssumptionValue(input)) {
    const supabase = await createClient();
    const { error } = await supabase
      .from('scenario_assumption_overrides')
      .delete()
      .eq('scenario_id', input.scenarioId)
      .eq('assumption_key', input.assumptionKey);

    if (error) throw error;
    return;
  }

  const supabase = await createClient();
  const { error } = await supabase.from('scenario_assumption_overrides').upsert(
    {
      organization_id: input.organizationId,
      scenario_id: input.scenarioId,
      assumption_key: input.assumptionKey,
      assumption_label: input.assumptionLabel,
      value_numeric: input.value_numeric ?? null,
      value_text: input.value_text ?? null,
      value_json: input.value_json ?? null,
      unit: input.unit ?? null,
    },
    { onConflict: 'scenario_id,assumption_key' },
  );

  if (error) throw error;
}

export async function syncCashProfileToAssumptionOverrides(
  projectId: string,
  input: {
    billingModel?: string;
    receiptCycleDays?: number;
    advancePercentage?: number;
    finalDeliveryPercentage?: number;
    workingCapitalBufferDays?: number;
  },
) {
  await Promise.all([
    upsertProjectAssumptionOverride({
      projectId,
      assumptionKey: 'billing_model',
      assumptionLabel: CORE_PARAMETER_MAP.get('billing_model')?.label ?? 'billing_model',
      unit: CORE_PARAMETER_MAP.get('billing_model')?.unit ?? null,
      value_text: input.billingModel ?? null,
    }),
    upsertProjectAssumptionOverride({
      projectId,
      assumptionKey: 'receipt_cycle_days',
      assumptionLabel: CORE_PARAMETER_MAP.get('receipt_cycle_days')?.label ?? 'receipt_cycle_days',
      unit: CORE_PARAMETER_MAP.get('receipt_cycle_days')?.unit ?? null,
      value_numeric: input.receiptCycleDays ?? null,
    }),
    upsertProjectAssumptionOverride({
      projectId,
      assumptionKey: 'advance_percentage',
      assumptionLabel: CORE_PARAMETER_MAP.get('advance_percentage')?.label ?? 'advance_percentage',
      unit: CORE_PARAMETER_MAP.get('advance_percentage')?.unit ?? null,
      value_numeric: input.advancePercentage ?? null,
    }),
    upsertProjectAssumptionOverride({
      projectId,
      assumptionKey: 'final_delivery_percentage',
      assumptionLabel: CORE_PARAMETER_MAP.get('final_delivery_percentage')?.label ?? 'final_delivery_percentage',
      unit: CORE_PARAMETER_MAP.get('final_delivery_percentage')?.unit ?? null,
      value_numeric: input.finalDeliveryPercentage ?? null,
    }),
    upsertProjectAssumptionOverride({
      projectId,
      assumptionKey: 'working_capital_buffer_days',
      assumptionLabel: CORE_PARAMETER_MAP.get('working_capital_buffer_days')?.label ?? 'working_capital_buffer_days',
      unit: CORE_PARAMETER_MAP.get('working_capital_buffer_days')?.unit ?? null,
      value_numeric: input.workingCapitalBufferDays ?? null,
    }),
  ]);
}

export async function syncDisbursementProfileToAssumptionOverrides(
  projectId: string,
  input: {
    disbursementModel?: string;
    supplierPaymentCycleDays?: number;
  },
) {
  await Promise.all([
    upsertProjectAssumptionOverride({
      projectId,
      assumptionKey: 'disbursement_model',
      assumptionLabel: CORE_PARAMETER_MAP.get('disbursement_model')?.label ?? 'disbursement_model',
      unit: CORE_PARAMETER_MAP.get('disbursement_model')?.unit ?? null,
      value_text: input.disbursementModel ?? null,
    }),
    upsertProjectAssumptionOverride({
      projectId,
      assumptionKey: 'supplier_payment_cycle_days',
      assumptionLabel: CORE_PARAMETER_MAP.get('supplier_payment_cycle_days')?.label ?? 'supplier_payment_cycle_days',
      unit: CORE_PARAMETER_MAP.get('supplier_payment_cycle_days')?.unit ?? null,
      value_numeric: input.supplierPaymentCycleDays ?? null,
    }),
  ]);
}

export async function resolveProjectEffectiveAssumptions(projectId: string) {
  return resolveScenarioEffectiveAssumptions(projectId);
}

export async function resolveScenarioEffectiveAssumptions(projectId: string, scenarioId?: string | null) {
  const supabase = await createClient();

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id, organization_id, template_id')
    .eq('id', projectId)
    .single();

  if (projectError) throw projectError;

  const [globalRes, templateRes, projectRes, scenarioRes] = await Promise.all([
    supabase.from('organization_assumptions').select('*').eq('organization_id', project.organization_id),
    project.template_id
      ? supabase.from('template_assumption_defaults').select('*').eq('template_id', project.template_id)
      : Promise.resolve({ data: [], error: null }),
    supabase.from('project_assumption_overrides').select('*').eq('project_id', projectId),
    scenarioId
      ? supabase.from('scenario_assumption_overrides').select('*').eq('scenario_id', scenarioId)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (globalRes.error) throw globalRes.error;
  if (templateRes.error) throw templateRes.error;
  if (projectRes.error) throw projectRes.error;
  if (scenarioRes.error) throw scenarioRes.error;

  const globalRows = globalRes.data ?? [];
  const templateRows = templateRes.data ?? [];
  const projectRows = projectRes.data ?? [];
  const scenarioRows = scenarioRes.data ?? [];

  const keys = new Set<string>([
    ...CORE_FINANCIAL_PARAMETERS.map((p) => p.key),
    ...globalRows.map((row) => row.assumption_key),
    ...templateRows.map((row) => row.assumption_key),
    ...projectRows.map((row) => row.assumption_key),
    ...scenarioRows.map((row) => row.assumption_key),
  ]);

  const globalMap = new Map(globalRows.map((row) => [row.assumption_key, row]));
  const templateMap = new Map(templateRows.map((row) => [row.assumption_key, row]));
  const projectMap = new Map(projectRows.map((row) => [row.assumption_key, row]));
  const scenarioMap = new Map(scenarioRows.map((row) => [row.assumption_key, row]));

  return Array.from(keys).map((key) => {
    const global = globalMap.get(key);
    const template = templateMap.get(key);
    const projectOverride = projectMap.get(key);
    const scenarioOverride = scenarioMap.get(key);

    const sourceLayer = scenarioOverride
      ? 'scenario_override'
      : projectOverride
        ? 'project_override'
        : template
          ? 'template'
          : 'global';
    const chosen = scenarioOverride ?? projectOverride ?? template ?? global;
    const effectiveValue = chosen?.value_numeric ?? chosen?.value_text ?? chosen?.value_json ?? null;

    return {
      assumption_key: key,
      assumption_label:
        scenarioOverride?.assumption_label ??
        projectOverride?.assumption_label ??
        template?.assumption_label ??
        global?.assumption_label ??
        CORE_FINANCIAL_PARAMETERS.find((p) => p.key === key)?.label ??
        key,
      effective_value: effectiveValue,
      unit:
        scenarioOverride?.unit ??
        projectOverride?.unit ??
        template?.unit ??
        global?.unit ??
        CORE_FINANCIAL_PARAMETERS.find((p) => p.key === key)?.unit ??
        null,
      source_layer: sourceLayer,
      raw_global_value: global ? global.value_numeric ?? global.value_text ?? global.value_json ?? null : null,
      raw_template_value: template ? template.value_numeric ?? template.value_text ?? template.value_json ?? null : null,
      raw_project_override_value: projectOverride
        ? projectOverride.value_numeric ?? projectOverride.value_text ?? projectOverride.value_json ?? null
        : null,
      raw_scenario_override_value: scenarioOverride
        ? scenarioOverride.value_numeric ?? scenarioOverride.value_text ?? scenarioOverride.value_json ?? null
        : null,
    };
  });
}

export async function resolveScenarioEffectiveAssumptionsWithTransientOverrides(
  projectId: string,
  scenarioId: string,
  transientOverrides: Array<{ assumptionKey: string; valueNumeric?: number | null; valueText?: string | null; valueJson?: unknown | null }>,
) {
  const effective = await resolveScenarioEffectiveAssumptions(projectId, scenarioId);
  const transientMap = new Map(
    transientOverrides.map((override) => [
      override.assumptionKey,
      {
        value: override.valueNumeric ?? override.valueText ?? override.valueJson ?? null,
      },
    ]),
  );

  return effective.map((row) => {
    const transient = transientMap.get(row.assumption_key);
    if (!transient) return row;
    return {
      ...row,
      effective_value: transient.value,
      source_layer: 'scenario_transient_override',
      raw_scenario_override_value: transient.value,
    };
  });
}
