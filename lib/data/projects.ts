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
      'id, name, code, status, client_name, contract_value, start_date, end_date, description, project_templates(id, name, code)',
    )
    .eq('id', projectId)
    .single();

  if (error) {
    throw error;
  }

  return data;
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
