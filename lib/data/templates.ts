import { createClient } from '@/lib/supabase/server';

export async function listTemplates(organizationId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('project_templates')
    .select('id, name, code, description, active')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data;
}

export async function getTemplateById(templateId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from('project_templates').select('*').eq('id', templateId).single();
  if (error) throw error;
  return data;
}
