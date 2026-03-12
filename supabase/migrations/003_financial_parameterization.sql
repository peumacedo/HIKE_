-- Financial parameterization layer: global assumptions, template defaults and project configurations

create table if not exists public.organization_assumptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  assumption_key text not null,
  assumption_label text not null,
  category text not null,
  value_numeric numeric(14,4),
  value_text text,
  value_json jsonb,
  unit text,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, assumption_key)
);

create table if not exists public.template_assumption_defaults (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.project_templates(id) on delete cascade,
  assumption_key text not null,
  assumption_label text not null,
  value_numeric numeric(14,4),
  value_text text,
  value_json jsonb,
  unit text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (template_id, assumption_key)
);

create table if not exists public.project_disbursement_profiles (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  disbursement_model text,
  supplier_payment_cycle_days int,
  upfront_cost_percentage numeric(10,4),
  production_cost_distribution_json jsonb,
  manual_schedule_json jsonb,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (project_id)
);

alter table public.project_cash_profiles
  add column if not exists receipt_concentration_model text,
  add column if not exists expected_collection_curve_json jsonb,
  add column if not exists billing_trigger text,
  add column if not exists working_capital_buffer_days int;

create index if not exists organization_assumptions_org_idx on public.organization_assumptions(organization_id);
create index if not exists template_assumption_defaults_template_idx on public.template_assumption_defaults(template_id);
create index if not exists project_disbursement_profiles_project_idx on public.project_disbursement_profiles(project_id);

create trigger trg_organization_assumptions_updated_at
before update on public.organization_assumptions
for each row execute function public.set_updated_at();

create trigger trg_template_assumption_defaults_updated_at
before update on public.template_assumption_defaults
for each row execute function public.set_updated_at();

create trigger trg_project_disbursement_profiles_updated_at
before update on public.project_disbursement_profiles
for each row execute function public.set_updated_at();

alter table public.organization_assumptions enable row level security;
alter table public.template_assumption_defaults enable row level security;
alter table public.project_disbursement_profiles enable row level security;

create policy "organization_assumptions_select" on public.organization_assumptions
for select using (public.is_org_member(organization_id));

create policy "organization_assumptions_write" on public.organization_assumptions
for all using (public.has_org_role(organization_id, array['admin','analyst']::public.organization_role[]))
with check (public.has_org_role(organization_id, array['admin','analyst']::public.organization_role[]));

create policy "template_assumption_defaults_select" on public.template_assumption_defaults
for select using (
  exists (
    select 1
    from public.project_templates t
    where t.id = template_id
      and public.is_org_member(t.organization_id)
  )
);

create policy "template_assumption_defaults_write" on public.template_assumption_defaults
for all using (
  exists (
    select 1
    from public.project_templates t
    where t.id = template_id
      and public.has_org_role(t.organization_id, array['admin','analyst']::public.organization_role[])
  )
)
with check (
  exists (
    select 1
    from public.project_templates t
    where t.id = template_id
      and public.has_org_role(t.organization_id, array['admin','analyst']::public.organization_role[])
  )
);

create policy "project_disbursement_profiles_select" on public.project_disbursement_profiles
for select using (
  exists (
    select 1
    from public.projects p
    where p.id = project_id
      and public.is_org_member(p.organization_id)
  )
);

create policy "project_disbursement_profiles_write" on public.project_disbursement_profiles
for all using (
  exists (
    select 1
    from public.projects p
    where p.id = project_id
      and public.has_org_role(p.organization_id, array['admin','analyst']::public.organization_role[])
  )
)
with check (
  exists (
    select 1
    from public.projects p
    where p.id = project_id
      and public.has_org_role(p.organization_id, array['admin','analyst']::public.organization_role[])
  )
);
