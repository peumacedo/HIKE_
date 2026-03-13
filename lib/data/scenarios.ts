import { createClient } from '@/lib/supabase/server';

export async function listProjectScenarios(projectId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('scenarios')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function createProjectScenario(input: {
  organizationId: string;
  projectId: string;
  name: string;
  scenarioType: 'base' | 'conservative' | 'stress' | 'custom';
  description?: string;
  baseReference?: string;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('scenarios')
    .insert({
      organization_id: input.organizationId,
      project_id: input.projectId,
      name: input.name,
      scenario_type: input.scenarioType,
      description: input.description ?? null,
      base_reference: input.baseReference ?? null,
      active: true,
    })
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function updateProjectScenario(
  scenarioId: string,
  input: { name: string; scenarioType: 'base' | 'conservative' | 'stress' | 'custom'; description?: string; active?: boolean; baseReference?: string },
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('scenarios')
    .update({
      name: input.name,
      scenario_type: input.scenarioType,
      description: input.description ?? null,
      active: input.active ?? true,
      base_reference: input.baseReference ?? null,
    })
    .eq('id', scenarioId);

  if (error) throw error;
}

export async function archiveProjectScenario(scenarioId: string, active = false) {
  const supabase = await createClient();
  const { error } = await supabase.from('scenarios').update({ active }).eq('id', scenarioId);
  if (error) throw error;
}
