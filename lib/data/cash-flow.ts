import { createClient } from '@/lib/supabase/server';
import { resolveProjectEffectiveAssumptions } from '@/lib/data/assumptions';
import { getProjectById, getProjectCashProfile, getProjectDisbursementProfile } from '@/lib/data/projects';

export type CashFlowSourceLayer = 'generated' | 'manual' | 'imported_omie' | 'adjustment';
export type CashFlowDirection = 'inflow' | 'outflow';
export type CashFlowLineType = 'revenue' | 'direct_cost' | 'payroll' | 'admin_allocation' | 'contingency' | 'tax' | 'other';

function startOfMonth(value: Date | string) {
  const date = new Date(value);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function toDateString(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days = 0) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function clampPct(value?: number | null) {
  if (value == null || Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

function pctAmount(base: number, pct?: number | null) {
  return base * (clampPct(pct) / 100);
}

function buildMonths(startDate: string, endDate: string) {
  const start = startOfMonth(startDate);
  const end = startOfMonth(endDate);
  const months: Date[] = [];
  const pointer = new Date(start);
  while (pointer <= end) {
    months.push(new Date(pointer));
    pointer.setUTCMonth(pointer.getUTCMonth() + 1);
  }
  return months;
}

function parseDistributionWeights(length: number, rawJson: unknown) {
  if (!rawJson) return null;

  if (Array.isArray(rawJson)) {
    const values = rawJson
      .map((value) => {
        if (typeof value === 'number') return value;
        if (typeof value === 'object' && value && 'weight' in value && typeof value.weight === 'number') return value.weight;
        return null;
      })
      .filter((value): value is number => value != null && value >= 0);

    if (values.length === length && values.reduce((acc, value) => acc + value, 0) > 0) {
      return values;
    }
  }

  return null;
}

function distributeAmount(total: number, months: Date[], weights?: number[] | null) {
  if (months.length === 0) return [];
  const effectiveWeights = weights && weights.length === months.length ? weights : new Array(months.length).fill(1);
  const weightsSum = effectiveWeights.reduce((acc, value) => acc + value, 0);

  return months.map((month, index) => {
    const amount = weightsSum > 0 ? (total * effectiveWeights[index]) / weightsSum : total / months.length;
    return {
      month,
      amount: Number(amount.toFixed(2)),
      distribution_mode: weights ? 'curve' : 'uniform',
    };
  });
}

async function resolveEffectiveMap(projectId: string) {
  const rows = await resolveProjectEffectiveAssumptions(projectId);
  return new Map(rows.map((row) => [row.assumption_key, row.effective_value]));
}

export async function listProjectCashFlowItems(
  projectId: string,
  filters?: {
    fromDate?: string;
    toDate?: string;
    flowDirection?: CashFlowDirection;
    lineType?: CashFlowLineType;
    sourceLayer?: CashFlowSourceLayer;
    isLocked?: boolean;
  },
) {
  const supabase = await createClient();
  let query = supabase
    .from('project_cash_flow_items')
    .select('*')
    .eq('project_id', projectId)
    .order('expected_cash_date', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true });

  if (filters?.fromDate) query = query.gte('expected_cash_date', filters.fromDate);
  if (filters?.toDate) query = query.lte('expected_cash_date', filters.toDate);
  if (filters?.flowDirection) query = query.eq('flow_direction', filters.flowDirection);
  if (filters?.lineType) query = query.eq('line_type', filters.lineType);
  if (filters?.sourceLayer) query = query.eq('source_layer', filters.sourceLayer);
  if (typeof filters?.isLocked === 'boolean') query = query.eq('is_locked', filters.isLocked);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function createProjectCashFlowItem(input: {
  organizationId: string;
  projectId: string;
  scenarioId?: string;
  sourceLayer?: CashFlowSourceLayer;
  flowDirection: CashFlowDirection;
  lineType: CashFlowLineType;
  categoryName?: string;
  description?: string;
  competenceDate?: string;
  expectedCashDate?: string;
  actualCashDate?: string;
  amount: number;
  currencyCode?: string;
  isLocked?: boolean;
  originReferenceJson?: unknown;
}) {
  const supabase = await createClient();
  const { error } = await supabase.from('project_cash_flow_items').insert({
    organization_id: input.organizationId,
    project_id: input.projectId,
    scenario_id: input.scenarioId ?? null,
    source_layer: input.sourceLayer ?? 'manual',
    flow_direction: input.flowDirection,
    line_type: input.lineType,
    category_name: input.categoryName ?? null,
    description: input.description ?? null,
    competence_date: input.competenceDate ?? null,
    expected_cash_date: input.expectedCashDate ?? null,
    actual_cash_date: input.actualCashDate ?? null,
    amount: input.amount,
    currency_code: input.currencyCode ?? 'BRL',
    is_locked: input.isLocked ?? false,
    origin_reference_json: input.originReferenceJson ?? null,
  });
  if (error) throw error;
}

export async function updateProjectCashFlowItem(
  itemId: string,
  input: {
    flowDirection?: CashFlowDirection;
    lineType?: CashFlowLineType;
    categoryName?: string;
    description?: string;
    competenceDate?: string | null;
    expectedCashDate?: string | null;
    actualCashDate?: string | null;
    amount?: number;
    isLocked?: boolean;
    sourceLayer?: CashFlowSourceLayer;
  },
) {
  const supabase = await createClient();
  const { data: existingItem, error: existingItemError } = await supabase
    .from('project_cash_flow_items')
    .select('id, source_layer')
    .eq('id', itemId)
    .single();

  if (existingItemError) throw existingItemError;
  if (existingItem?.source_layer === 'imported_omie') {
    throw new Error('Linhas importadas do Omie são somente leitura e não podem ser atualizadas.');
  }

  const payload: Record<string, unknown> = {};
  if (input.flowDirection) payload.flow_direction = input.flowDirection;
  if (input.lineType) payload.line_type = input.lineType;
  if (input.categoryName !== undefined) payload.category_name = input.categoryName || null;
  if (input.description !== undefined) payload.description = input.description || null;
  if (input.competenceDate !== undefined) payload.competence_date = input.competenceDate;
  if (input.expectedCashDate !== undefined) payload.expected_cash_date = input.expectedCashDate;
  if (input.actualCashDate !== undefined) payload.actual_cash_date = input.actualCashDate;
  if (input.amount !== undefined) payload.amount = input.amount;
  if (input.sourceLayer) payload.source_layer = input.sourceLayer;
  if (typeof input.isLocked === 'boolean') payload.is_locked = input.isLocked;

  const { error } = await supabase.from('project_cash_flow_items').update(payload).eq('id', itemId);
  if (error) throw error;
}

export async function deleteProjectCashFlowItem(itemId: string) {
  const supabase = await createClient();
  const { data: existingItem, error: existingItemError } = await supabase
    .from('project_cash_flow_items')
    .select('id, source_layer')
    .eq('id', itemId)
    .single();

  if (existingItemError) throw existingItemError;
  if (existingItem?.source_layer === 'imported_omie') {
    throw new Error('Linhas importadas do Omie são somente leitura e não podem ser removidas.');
  }

  const { error } = await supabase.from('project_cash_flow_items').delete().eq('id', itemId);
  if (error) throw error;
}

export async function generateBaseProjectCashFlow(projectId: string, options?: { regenerate?: boolean; createdBy?: string }) {
  const [project, cashProfile, disbursementProfile, effectiveMap] = await Promise.all([
    getProjectById(projectId),
    getProjectCashProfile(projectId),
    getProjectDisbursementProfile(projectId),
    resolveEffectiveMap(projectId),
  ]);

  if (!project.contract_value || !project.start_date || !project.end_date) {
    throw new Error('Pré-condições não atendidas para geração: contract_value, start_date e end_date são obrigatórios.');
  }

  const supabase = await createClient();
  const { data: run, error: runError } = await supabase
    .from('project_cash_flow_generation_runs')
    .insert({
      organization_id: project.organization_id,
      project_id: project.id,
      generation_type: options?.regenerate ? 'regenerate_schedule' : 'base_schedule',
      status: 'running',
      created_by: options?.createdBy ?? null,
    })
    .select('id')
    .single();

  if (runError) throw runError;

  try {
    if (options?.regenerate) {
      const { error: cleanupError } = await supabase
        .from('project_cash_flow_items')
        .delete()
        .eq('project_id', project.id)
        .eq('source_layer', 'generated')
        .eq('is_locked', false);
      if (cleanupError) throw cleanupError;
    }

    const months = buildMonths(project.start_date, project.end_date);
    const contractValue = Number(project.contract_value);

    const advancePct = Number(cashProfile?.advance_percentage ?? effectiveMap.get('advance_percentage') ?? 0);
    const finalPct = Number(cashProfile?.final_delivery_percentage ?? effectiveMap.get('final_delivery_percentage') ?? 0);
    const receiptCycleDays = Number(cashProfile?.receipt_cycle_days ?? effectiveMap.get('receipt_cycle_days') ?? 0);

    const directCostPct = Number(effectiveMap.get('direct_cost_pct') ?? 0);
    const payrollPct = Number(effectiveMap.get('payroll_weight_pct') ?? 0);
    const adminPct = Number(effectiveMap.get('admin_rate_pct') ?? 0);
    const contingencyPct = Number(effectiveMap.get('contingency_pct') ?? 0);

    const supplierCycleDays = Number(disbursementProfile?.supplier_payment_cycle_days ?? effectiveMap.get('supplier_payment_cycle_days') ?? 0);
    const upfrontCostPct = Number(disbursementProfile?.upfront_cost_percentage ?? 0);

    const inflowItems: Record<string, unknown>[] = [];
    const outflowItems: Record<string, unknown>[] = [];

    const advanceAmount = pctAmount(contractValue, advancePct);
    if (advanceAmount > 0) {
      const competence = startOfMonth(project.start_date);
      inflowItems.push({
        organization_id: project.organization_id,
        project_id: project.id,
        source_layer: 'generated',
        flow_direction: 'inflow',
        line_type: 'revenue',
        description: 'Entrada inicial do contrato',
        competence_date: toDateString(competence),
        expected_cash_date: toDateString(addDays(competence, receiptCycleDays)),
        amount: Number(advanceAmount.toFixed(2)),
        generation_run_id: run.id,
        origin_reference_json: {
          parameter: 'advance_percentage',
          rule: 'upfront_inflow',
          generation_month: toDateString(competence),
          distribution_mode: 'single',
        },
      });
    }

    const finalAmount = pctAmount(contractValue, finalPct);
    if (finalAmount > 0) {
      const competence = startOfMonth(project.end_date);
      inflowItems.push({
        organization_id: project.organization_id,
        project_id: project.id,
        source_layer: 'generated',
        flow_direction: 'inflow',
        line_type: 'revenue',
        description: 'Receita na entrega final',
        competence_date: toDateString(competence),
        expected_cash_date: toDateString(addDays(competence, receiptCycleDays)),
        amount: Number(finalAmount.toFixed(2)),
        generation_run_id: run.id,
        origin_reference_json: {
          parameter: 'final_delivery_percentage',
          rule: 'final_delivery_inflow',
          generation_month: toDateString(competence),
          distribution_mode: 'single',
        },
      });
    }

    const residualPct = Math.max(0, 100 - clampPct(advancePct) - clampPct(finalPct));
    const residualAmount = pctAmount(contractValue, residualPct);
    if (residualAmount > 0) {
      const revenueWeights = parseDistributionWeights(months.length, cashProfile?.expected_collection_curve_json);
      const distribution = distributeAmount(residualAmount, months, revenueWeights);
      distribution.forEach((entry) => {
        inflowItems.push({
          organization_id: project.organization_id,
          project_id: project.id,
          source_layer: 'generated',
          flow_direction: 'inflow',
          line_type: 'revenue',
          description: 'Receita residual distribuída',
          competence_date: toDateString(entry.month),
          expected_cash_date: toDateString(addDays(entry.month, receiptCycleDays)),
          amount: entry.amount,
          generation_run_id: run.id,
          origin_reference_json: {
            parameter: 'expected_collection_curve_json',
            rule: 'residual_revenue_distribution',
            generation_month: toDateString(entry.month),
            distribution_mode: entry.distribution_mode,
          },
        });
      });
    }

    const directCostBase = pctAmount(contractValue, directCostPct);
    const directCostUpfrontAmount = pctAmount(directCostBase, upfrontCostPct);
    const directCostResidual = Math.max(0, directCostBase - directCostUpfrontAmount);

    if (directCostUpfrontAmount > 0) {
      const competence = startOfMonth(project.start_date);
      outflowItems.push({
        organization_id: project.organization_id,
        project_id: project.id,
        source_layer: 'generated',
        flow_direction: 'outflow',
        line_type: 'direct_cost',
        description: 'Custo direto upfront',
        competence_date: toDateString(competence),
        expected_cash_date: toDateString(addDays(competence, supplierCycleDays)),
        amount: Number(directCostUpfrontAmount.toFixed(2)),
        generation_run_id: run.id,
        origin_reference_json: {
          parameter: 'upfront_cost_percentage',
          rule: 'direct_cost_upfront',
          generation_month: toDateString(competence),
          distribution_mode: 'single',
        },
      });
    }

    if (directCostResidual > 0) {
      const directCostWeights = parseDistributionWeights(months.length, disbursementProfile?.production_cost_distribution_json);
      const distribution = distributeAmount(directCostResidual, months, directCostWeights);
      distribution.forEach((entry) => {
        outflowItems.push({
          organization_id: project.organization_id,
          project_id: project.id,
          source_layer: 'generated',
          flow_direction: 'outflow',
          line_type: 'direct_cost',
          description: 'Custo direto distribuído',
          competence_date: toDateString(entry.month),
          expected_cash_date: toDateString(addDays(entry.month, supplierCycleDays)),
          amount: entry.amount,
          generation_run_id: run.id,
          origin_reference_json: {
            parameter: 'production_cost_distribution_json',
            rule: 'direct_cost_distribution',
            generation_month: toDateString(entry.month),
            distribution_mode: entry.distribution_mode,
          },
        });
      });
    }

    const uniformOutflowTypes: Array<{ lineType: CashFlowLineType; base: number; description: string; parameter: string }> = [
      { lineType: 'payroll', base: pctAmount(contractValue, payrollPct), description: 'Folha estimada', parameter: 'payroll_weight_pct' },
      { lineType: 'admin_allocation', base: pctAmount(contractValue, adminPct), description: 'Administração alocada', parameter: 'admin_rate_pct' },
      { lineType: 'contingency', base: pctAmount(contractValue, contingencyPct), description: 'Contingência estimada', parameter: 'contingency_pct' },
    ];

    uniformOutflowTypes.forEach((typeDef) => {
      if (typeDef.base <= 0) return;
      const distribution = distributeAmount(typeDef.base, months);
      distribution.forEach((entry) => {
        outflowItems.push({
          organization_id: project.organization_id,
          project_id: project.id,
          source_layer: 'generated',
          flow_direction: 'outflow',
          line_type: typeDef.lineType,
          description: typeDef.description,
          competence_date: toDateString(entry.month),
          expected_cash_date: toDateString(entry.month),
          amount: entry.amount,
          generation_run_id: run.id,
          origin_reference_json: {
            parameter: typeDef.parameter,
            rule: 'uniform_distribution',
            generation_month: toDateString(entry.month),
            distribution_mode: entry.distribution_mode,
          },
        });
      });
    });

    const generatedItems = [...inflowItems, ...outflowItems];

    if (generatedItems.length > 0) {
      const { error: insertError } = await supabase.from('project_cash_flow_items').insert(generatedItems);
      if (insertError) throw insertError;
    }

    const summary = {
      generated_items: generatedItems.length,
      inflow_items: inflowItems.length,
      outflow_items: outflowItems.length,
      regenerate: Boolean(options?.regenerate),
    };

    await supabase
      .from('project_cash_flow_generation_runs')
      .update({ status: 'success', summary_json: summary, finished_at: new Date().toISOString() })
      .eq('id', run.id);

    return summary;
  } catch (error) {
    await supabase
      .from('project_cash_flow_generation_runs')
      .update({ status: 'error', notes: error instanceof Error ? error.message : 'Erro inesperado', finished_at: new Date().toISOString() })
      .eq('id', run.id);
    throw error;
  }
}

export async function aggregateProjectCashFlowByMonth(projectId: string) {
  const items = await listProjectCashFlowItems(projectId);
  const months = new Map<
    string,
    {
      month: string;
      projected_inflows: number;
      projected_outflows: number;
      projected_net: number;
      actual_inflows: number;
      actual_outflows: number;
      actual_net: number;
      variance_net: number;
    }
  >();

  for (const item of items) {
    const isActual = item.source_layer === 'imported_omie';
    const baseDate = isActual ? item.actual_cash_date ?? item.expected_cash_date ?? item.competence_date : item.expected_cash_date;
    if (!baseDate) continue;
    const month = String(baseDate).slice(0, 7);

    if (!months.has(month)) {
      months.set(month, {
        month,
        projected_inflows: 0,
        projected_outflows: 0,
        projected_net: 0,
        actual_inflows: 0,
        actual_outflows: 0,
        actual_net: 0,
        variance_net: 0,
      });
    }

    const current = months.get(month)!;
    if (isActual) {
      if (item.flow_direction === 'inflow') current.actual_inflows += Number(item.amount);
      if (item.flow_direction === 'outflow') current.actual_outflows += Number(item.amount);
    } else {
      if (item.flow_direction === 'inflow') current.projected_inflows += Number(item.amount);
      if (item.flow_direction === 'outflow') current.projected_outflows += Number(item.amount);
    }

    current.projected_net = current.projected_inflows - current.projected_outflows;
    current.actual_net = current.actual_inflows - current.actual_outflows;
    current.variance_net = current.actual_net - current.projected_net;
  }

  return Array.from(months.values())
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((row) => ({
      ...row,
      projected_inflows: Number(row.projected_inflows.toFixed(2)),
      projected_outflows: Number(row.projected_outflows.toFixed(2)),
      projected_net: Number(row.projected_net.toFixed(2)),
      actual_inflows: Number(row.actual_inflows.toFixed(2)),
      actual_outflows: Number(row.actual_outflows.toFixed(2)),
      actual_net: Number(row.actual_net.toFixed(2)),
      variance_net: Number(row.variance_net.toFixed(2)),
    }));
}

export async function aggregateOrganizationCashFlowByMonth(organizationId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('project_cash_flow_items')
    .select('id, source_layer, flow_direction, amount, expected_cash_date, actual_cash_date, competence_date')
    .eq('organization_id', organizationId);
  if (error) throw error;

  const aggregate = new Map<string, { month: string; projectedIn: number; projectedOut: number; actualIn: number; actualOut: number }>();

  for (const item of data ?? []) {
    const isActual = item.source_layer === 'imported_omie';
    const baseDate = isActual ? item.actual_cash_date ?? item.expected_cash_date ?? item.competence_date : item.expected_cash_date;
    if (!baseDate) continue;
    const month = String(baseDate).slice(0, 7);
    if (!aggregate.has(month)) aggregate.set(month, { month, projectedIn: 0, projectedOut: 0, actualIn: 0, actualOut: 0 });
    const bucket = aggregate.get(month)!;

    if (isActual) {
      if (item.flow_direction === 'inflow') bucket.actualIn += Number(item.amount);
      if (item.flow_direction === 'outflow') bucket.actualOut += Number(item.amount);
    } else {
      if (item.flow_direction === 'inflow') bucket.projectedIn += Number(item.amount);
      if (item.flow_direction === 'outflow') bucket.projectedOut += Number(item.amount);
    }
  }

  return Array.from(aggregate.values())
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((row) => ({
      month: row.month,
      projected_inflows: Number(row.projectedIn.toFixed(2)),
      projected_outflows: Number(row.projectedOut.toFixed(2)),
      projected_net: Number((row.projectedIn - row.projectedOut).toFixed(2)),
      actual_inflows: Number(row.actualIn.toFixed(2)),
      actual_outflows: Number(row.actualOut.toFixed(2)),
      actual_net: Number((row.actualIn - row.actualOut).toFixed(2)),
    }));
}

export async function listOmieStagingCandidatesForProject(projectId: string) {
  const project = await getProjectById(projectId);
  const supabase = await createClient();

  const { data: mappings, error: mappingsError } = await supabase
    .from('omie_project_mappings')
    .select('external_code, external_label, mapping_type')
    .eq('organization_id', project.organization_id)
    .eq('project_id', projectId)
    .eq('active', true);
  if (mappingsError) throw mappingsError;

  if (!mappings || mappings.length === 0) {
    return { payables: [], receivables: [], financial_movements: [], mappings: [] };
  }

  const codes = mappings.map((row) => row.external_code).filter(Boolean);
  const firstCode = codes[0] ?? '';

  const [payablesRes, receivablesRes, movementsRes] = await Promise.all([
    supabase
      .from('omie_payable_staging')
      .select('id, due_date, payment_date, amount, supplier_name, document_number, status_text')
      .eq('organization_id', project.organization_id)
      .or(`supplier_name.ilike.%${firstCode}%,document_number.ilike.%${firstCode}%`)
      .limit(200),
    supabase
      .from('omie_receivable_staging')
      .select('id, due_date, receipt_date, amount, customer_name, document_number, status_text')
      .eq('organization_id', project.organization_id)
      .or(`customer_name.ilike.%${firstCode}%,document_number.ilike.%${firstCode}%`)
      .limit(200),
    supabase
      .from('omie_financial_movement_staging')
      .select('id, movement_date, amount, movement_type, description')
      .eq('organization_id', project.organization_id)
      .or(`description.ilike.%${firstCode}%`)
      .limit(200),
  ]);

  if (payablesRes.error) throw payablesRes.error;
  if (receivablesRes.error) throw receivablesRes.error;
  if (movementsRes.error) throw movementsRes.error;

  return {
    mappings,
    payables: payablesRes.data ?? [],
    receivables: receivablesRes.data ?? [],
    financial_movements: movementsRes.data ?? [],
  };
}

export async function createOmieReconciliationLink(input: {
  organizationId: string;
  projectId: string;
  omieSourceTable: 'payables' | 'receivables' | 'financial_movements';
  omieStagingRecordId: string;
  reconciliationStatus: 'pending' | 'matched' | 'ignored';
  inferredLineType?: CashFlowLineType;
  cashFlowItemId?: string;
  notes?: string;
}) {
  const supabase = await createClient();
  const { error } = await supabase.from('omie_reconciliation_links').upsert(
    {
      organization_id: input.organizationId,
      project_id: input.projectId,
      omie_source_table: input.omieSourceTable,
      omie_staging_record_id: input.omieStagingRecordId,
      reconciliation_status: input.reconciliationStatus,
      inferred_line_type: input.inferredLineType ?? null,
      cash_flow_item_id: input.cashFlowItemId ?? null,
      notes: input.notes ?? null,
    },
    { onConflict: 'organization_id,project_id,omie_source_table,omie_staging_record_id' },
  );
  if (error) throw error;
}

export async function getOmieReconciliationSummary(projectId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('omie_reconciliation_links')
    .select('reconciliation_status, omie_source_table')
    .eq('project_id', projectId);
  if (error) throw error;

  const summary = {
    total: data?.length ?? 0,
    pending: 0,
    matched: 0,
    ignored: 0,
  };

  for (const row of data ?? []) {
    if (row.reconciliation_status === 'pending') summary.pending += 1;
    if (row.reconciliation_status === 'matched') summary.matched += 1;
    if (row.reconciliation_status === 'ignored') summary.ignored += 1;
  }

  return summary;
}
