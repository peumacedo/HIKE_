import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export type OrgRole = 'admin' | 'analyst' | 'viewer';

export type UserMembership = {
  organization_id: string;
  role: OrgRole;
  organizations: {
    name: string | null;
    slug: string | null;
  } | null;
};

export async function requireSession() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return user;
}

export async function getUserMemberships() {
  const user = await requireSession();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('organization_members')
    .select('organization_id, role, organizations(name, slug)')
    .eq('profile_id', user.id);

  if (error) {
    throw error;
  }

  const memberships = (data ?? []).map((membership) => {
    const organizationData = membership.organizations;
    const organization = Array.isArray(organizationData) ? organizationData[0] : organizationData;

    return {
      organization_id: membership.organization_id,
      role: membership.role as OrgRole,
      organizations: organization
        ? {
            name: organization.name ?? null,
            slug: organization.slug ?? null,
          }
        : null,
    } satisfies UserMembership;
  });

  return memberships;
}

export async function requireOrgRole(organizationId: string, allowedRoles: OrgRole[]) {
  const user = await requireSession();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', organizationId)
    .eq('profile_id', user.id)
    .single();

  if (error || !data || !allowedRoles.includes(data.role as OrgRole)) {
    redirect('/dashboard');
  }

  return data.role as OrgRole;
}
