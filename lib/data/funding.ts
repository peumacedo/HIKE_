import { createClient } from '@/lib/supabase/server';

export async function listFundingLines(organizationId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('funding_lines')
    .select('id, name, lender_name, rate_type, rate_value, active')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data;
}
