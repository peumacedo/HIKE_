import { createClient } from '@/lib/supabase/server';

export type CreateProjectInput = {
  organizationId: string;
  templateId?: string;
  name: string;
  code: string;
  clientName?: string;
  contractValue?: number;
  startDate?: string;
  endDate?: string;
  description?: string;
};

export async function listProjects(organizationId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('projects')
    .select('id, name, code, status, client_name, contract_value, project_templates(id, name, code)')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data;
}

export async function getProjectById(projectId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('projects')
    .select(
      'id, organization_id, template_id, name, code, status, client_name, contract_value, start_date, end_date, description, project_templates(id, name, code)',
    )
    .eq('id', projectId)
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateProjectDetails(
  projectId: string,
  input: {
    name: string;
    code: string;
    clientName?: string;
    status: string;
    contractValue?: number;
    startDate?: string;
    endDate?: string;
    description?: string;
  },
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('projects')
    .update({
      name: input.name,
      code: input.code,
      client_name: input.clientName ?? null,
      status: input.status,
      contract_value: input.contractValue ?? null,
      start_date: input.startDate ?? null,
      end_date: input.endDate ?? null,
      description: input.description ?? null,
    })
    .eq('id', projectId);

  if (error) throw error;
}

export async function createProject(input: CreateProjectInput, userId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('projects')
    .insert({
      organization_id: input.organizationId,
      template_id: input.templateId ?? null,
      name: input.name,
      code: input.code,
      client_name: input.clientName ?? null,
      contract_value: input.contractValue ?? null,
      start_date: input.startDate ?? null,
      end_date: input.endDate ?? null,
      description: input.description ?? null,
      created_by: userId,
    })
    .select('id')
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function upsertProjectCashProfile(input: {
  projectId: string;
  billingModel?: string;
  receiptCycleDays?: number;
  advancePercentage?: number;
  finalDeliveryPercentage?: number;
  receiptConcentrationModel?: string;
  expectedCollectionCurveJson?: unknown;
  billingTrigger?: string;
  workingCapitalBufferDays?: number;
  notes?: string;
}) {
  const supabase = await createClient();
  const { error } = await supabase.from('project_cash_profiles').upsert(
    {
      project_id: input.projectId,
      billing_model: input.billingModel ?? null,
      receipt_cycle_days: input.receiptCycleDays ?? null,
      advance_percentage: input.advancePercentage ?? null,
      final_delivery_percentage: input.finalDeliveryPercentage ?? null,
      receipt_concentration_model: input.receiptConcentrationModel ?? null,
      expected_collection_curve_json: input.expectedCollectionCurveJson ?? null,
      billing_trigger: input.billingTrigger ?? null,
      working_capital_buffer_days: input.workingCapitalBufferDays ?? null,
      notes: input.notes ?? null,
    },
    { onConflict: 'project_id' },
  );

  if (error) throw error;
}

export async function getProjectCashProfile(projectId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from('project_cash_profiles').select('*').eq('project_id', projectId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertProjectDisbursementProfile(input: {
  projectId: string;
  disbursementModel?: string;
  supplierPaymentCycleDays?: number;
  upfrontCostPercentage?: number;
  productionCostDistributionJson?: unknown;
  manualScheduleJson?: unknown;
  notes?: string;
}) {
  const supabase = await createClient();
  const { error } = await supabase.from('project_disbursement_profiles').upsert(
    {
      project_id: input.projectId,
      disbursement_model: input.disbursementModel ?? null,
      supplier_payment_cycle_days: input.supplierPaymentCycleDays ?? null,
      upfront_cost_percentage: input.upfrontCostPercentage ?? null,
      production_cost_distribution_json: input.productionCostDistributionJson ?? null,
      manual_schedule_json: input.manualScheduleJson ?? null,
      notes: input.notes ?? null,
    },
    { onConflict: 'project_id' },
  );

  if (error) throw error;
}

export async function getProjectDisbursementProfile(projectId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('project_disbursement_profiles')
    .select('*')
    .eq('project_id', projectId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function listProjectCostCategories(projectId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('project_cost_categories')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at');
  if (error) throw error;
  return data;
}

export async function createProjectCostCategory(input: {
  projectId: string;
  categoryName: string;
  categoryType: 'direct_cost' | 'payroll' | 'admin_allocation' | 'contingency' | 'other';
  allocationMethod: 'fixed_value' | 'percent_of_revenue' | 'percent_of_cost' | 'manual_schedule';
  defaultValue?: number;
  active?: boolean;
}) {
  const supabase = await createClient();
  const { error } = await supabase.from('project_cost_categories').insert({
    project_id: input.projectId,
    category_name: input.categoryName,
    category_type: input.categoryType,
    allocation_method: input.allocationMethod,
    default_value: input.defaultValue ?? null,
    active: input.active ?? true,
  });
  if (error) throw error;
}

export async function updateProjectCostCategory(
  categoryId: string,
  input: {
    categoryName: string;
    categoryType: 'direct_cost' | 'payroll' | 'admin_allocation' | 'contingency' | 'other';
    allocationMethod: 'fixed_value' | 'percent_of_revenue' | 'percent_of_cost' | 'manual_schedule';
    defaultValue?: number;
    active?: boolean;
  },
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('project_cost_categories')
    .update({
      category_name: input.categoryName,
      category_type: input.categoryType,
      allocation_method: input.allocationMethod,
      default_value: input.defaultValue ?? null,
      active: input.active ?? true,
    })
    .eq('id', categoryId);
  if (error) throw error;
}
