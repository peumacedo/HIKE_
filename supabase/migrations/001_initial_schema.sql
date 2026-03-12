-- Hike Advisory Cockpit - Initial schema + RLS foundation

create extension if not exists "pgcrypto";

create type public.organization_role as enum ('admin', 'analyst', 'viewer');
create type public.project_status as enum ('draft', 'active', 'paused', 'completed', 'archived');
create type public.assumption_source_type as enum ('manual', 'inherited_template', 'inherited_global');
create type public.cost_category_type as enum ('direct_cost', 'payroll', 'admin_allocation', 'contingency', 'other');
create type public.allocation_method as enum ('fixed_value', 'percent_of_revenue', 'percent_of_cost', 'manual_schedule');
create type public.rate_type as enum ('monthly_pct', 'annual_pct', 'fixed_fee', 'hybrid');
create type public.scenario_type as enum ('base', 'conservative', 'stress', 'custom');
create type public.connection_status as enum ('active', 'inactive', 'error');
create type public.sync_type as enum ('payables', 'receivables', 'financial_movements', 'full');
create type public.sync_status as enum ('queued', 'running', 'success', 'partial', 'error');
create type public.mapping_type as enum ('customer', 'cost_center', 'category', 'account', 'custom');

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index profiles_email_key on public.profiles(lower(email));

create table public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role public.organization_role not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, profile_id)
);

create table public.project_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  code text not null,
  description text,
  default_admin_rate_pct numeric(10,4),
  default_direct_cost_pct numeric(10,4),
  default_payroll_weight_pct numeric(10,4),
  default_contingency_pct numeric(10,4),
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, code)
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  template_id uuid references public.project_templates(id) on delete set null,
  name text not null,
  code text not null,
  client_name text,
  status public.project_status not null default 'draft',
  contract_value numeric(14,2),
  start_date date,
  end_date date,
  description text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, code)
);

create table public.project_assumption_overrides (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  assumption_key text not null,
  assumption_label text not null,
  value_numeric numeric(14,4),
  value_text text,
  value_json jsonb,
  unit text,
  source_type public.assumption_source_type not null default 'manual',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (project_id, assumption_key)
);

create table public.project_cash_profiles (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  billing_model text,
  receipt_cycle_days int,
  advance_percentage numeric(10,4),
  final_delivery_percentage numeric(10,4),
  milestone_logic_json jsonb,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (project_id)
);

create table public.project_cost_categories (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  category_name text not null,
  category_type public.cost_category_type not null,
  allocation_method public.allocation_method not null,
  default_value numeric(14,4),
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.funding_lines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  lender_name text,
  rate_type public.rate_type not null,
  rate_value numeric(12,6) not null,
  grace_days int,
  term_days int,
  io_f_tax_pct numeric(10,4),
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.scenarios (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  name text not null,
  scenario_type public.scenario_type not null,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.omie_connections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  connection_name text not null,
  app_key_encrypted text not null,
  app_secret_encrypted text not null,
  status public.connection_status not null default 'inactive',
  last_tested_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.omie_sync_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  connection_id uuid not null references public.omie_connections(id) on delete cascade,
  sync_type public.sync_type not null,
  status public.sync_status not null default 'queued',
  started_at timestamptz,
  finished_at timestamptz,
  records_received int,
  records_processed int,
  error_message text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.omie_payable_staging (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  sync_run_id uuid references public.omie_sync_runs(id) on delete set null,
  omie_record_id text not null,
  raw_payload jsonb not null,
  issue_date date,
  due_date date,
  payment_date date,
  amount numeric(14,2),
  supplier_name text,
  document_number text,
  status_text text,
  imported_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, omie_record_id)
);

create table public.omie_receivable_staging (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  sync_run_id uuid references public.omie_sync_runs(id) on delete set null,
  omie_record_id text not null,
  raw_payload jsonb not null,
  issue_date date,
  due_date date,
  receipt_date date,
  amount numeric(14,2),
  customer_name text,
  document_number text,
  status_text text,
  imported_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, omie_record_id)
);

create table public.omie_financial_movement_staging (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  sync_run_id uuid references public.omie_sync_runs(id) on delete set null,
  omie_record_id text not null,
  raw_payload jsonb not null,
  movement_date date,
  amount numeric(14,2),
  movement_type text,
  description text,
  imported_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, omie_record_id)
);

create table public.omie_project_mappings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  external_system text not null default 'omie',
  mapping_type public.mapping_type not null,
  external_code text not null,
  external_label text,
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, project_id, mapping_type, external_code)
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  profile_id uuid references public.profiles(id) on delete set null,
  entity_name text not null,
  entity_id uuid not null,
  action_type text not null,
  payload jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index organization_members_profile_idx on public.organization_members(profile_id);
create index project_templates_org_idx on public.project_templates(organization_id);
create index projects_org_idx on public.projects(organization_id);
create index funding_lines_org_idx on public.funding_lines(organization_id);
create index scenarios_org_idx on public.scenarios(organization_id);
create index omie_connections_org_idx on public.omie_connections(organization_id);
create index omie_sync_runs_org_idx on public.omie_sync_runs(organization_id);
create index audit_logs_org_idx on public.audit_logs(organization_id);

create trigger trg_organizations_updated_at before update on public.organizations for each row execute function public.set_updated_at();
create trigger trg_profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger trg_organization_members_updated_at before update on public.organization_members for each row execute function public.set_updated_at();
create trigger trg_project_templates_updated_at before update on public.project_templates for each row execute function public.set_updated_at();
create trigger trg_projects_updated_at before update on public.projects for each row execute function public.set_updated_at();
create trigger trg_project_assumption_overrides_updated_at before update on public.project_assumption_overrides for each row execute function public.set_updated_at();
create trigger trg_project_cash_profiles_updated_at before update on public.project_cash_profiles for each row execute function public.set_updated_at();
create trigger trg_project_cost_categories_updated_at before update on public.project_cost_categories for each row execute function public.set_updated_at();
create trigger trg_funding_lines_updated_at before update on public.funding_lines for each row execute function public.set_updated_at();
create trigger trg_scenarios_updated_at before update on public.scenarios for each row execute function public.set_updated_at();
create trigger trg_omie_connections_updated_at before update on public.omie_connections for each row execute function public.set_updated_at();
create trigger trg_omie_sync_runs_updated_at before update on public.omie_sync_runs for each row execute function public.set_updated_at();
create trigger trg_omie_project_mappings_updated_at before update on public.omie_project_mappings for each row execute function public.set_updated_at();

create or replace function public.is_org_member(org_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.organization_members om
    where om.organization_id = org_id
      and om.profile_id = auth.uid()
  );
$$;

create or replace function public.has_org_role(org_id uuid, roles public.organization_role[])
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.organization_members om
    where om.organization_id = org_id
      and om.profile_id = auth.uid()
      and om.role = any(roles)
  );
$$;

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.organization_members enable row level security;
alter table public.project_templates enable row level security;
alter table public.projects enable row level security;
alter table public.project_assumption_overrides enable row level security;
alter table public.project_cash_profiles enable row level security;
alter table public.project_cost_categories enable row level security;
alter table public.funding_lines enable row level security;
alter table public.scenarios enable row level security;
alter table public.omie_connections enable row level security;
alter table public.omie_sync_runs enable row level security;
alter table public.omie_payable_staging enable row level security;
alter table public.omie_receivable_staging enable row level security;
alter table public.omie_financial_movement_staging enable row level security;
alter table public.omie_project_mappings enable row level security;
alter table public.audit_logs enable row level security;

create policy "profiles_self_read" on public.profiles for select using (id = auth.uid());
create policy "profiles_self_update" on public.profiles for update using (id = auth.uid());
create policy "profiles_self_insert" on public.profiles for insert with check (id = auth.uid());

create policy "organization_members_select" on public.organization_members
for select using (public.is_org_member(organization_id));
create policy "organization_members_manage_admin" on public.organization_members
for all using (public.has_org_role(organization_id, array['admin']::public.organization_role[]))
with check (public.has_org_role(organization_id, array['admin']::public.organization_role[]));

create policy "organizations_select" on public.organizations
for select using (public.is_org_member(id));
create policy "organizations_update_admin" on public.organizations
for update using (public.has_org_role(id, array['admin']::public.organization_role[]))
with check (public.has_org_role(id, array['admin']::public.organization_role[]));

create policy "project_templates_select" on public.project_templates
for select using (public.is_org_member(organization_id));
create policy "project_templates_write" on public.project_templates
for all using (public.has_org_role(organization_id, array['admin','analyst']::public.organization_role[]))
with check (public.has_org_role(organization_id, array['admin','analyst']::public.organization_role[]));

create policy "projects_select" on public.projects
for select using (public.is_org_member(organization_id));
create policy "projects_write" on public.projects
for all using (public.has_org_role(organization_id, array['admin','analyst']::public.organization_role[]))
with check (public.has_org_role(organization_id, array['admin','analyst']::public.organization_role[]));

create policy "project_assumption_overrides_select" on public.project_assumption_overrides
for select using (exists (select 1 from public.projects p where p.id = project_id and public.is_org_member(p.organization_id)));
create policy "project_assumption_overrides_write" on public.project_assumption_overrides
for all using (exists (select 1 from public.projects p where p.id = project_id and public.has_org_role(p.organization_id, array['admin','analyst']::public.organization_role[])))
with check (exists (select 1 from public.projects p where p.id = project_id and public.has_org_role(p.organization_id, array['admin','analyst']::public.organization_role[])));

create policy "project_cash_profiles_select" on public.project_cash_profiles
for select using (exists (select 1 from public.projects p where p.id = project_id and public.is_org_member(p.organization_id)));
create policy "project_cash_profiles_write" on public.project_cash_profiles
for all using (exists (select 1 from public.projects p where p.id = project_id and public.has_org_role(p.organization_id, array['admin','analyst']::public.organization_role[])))
with check (exists (select 1 from public.projects p where p.id = project_id and public.has_org_role(p.organization_id, array['admin','analyst']::public.organization_role[])));

create policy "project_cost_categories_select" on public.project_cost_categories
for select using (exists (select 1 from public.projects p where p.id = project_id and public.is_org_member(p.organization_id)));
create policy "project_cost_categories_write" on public.project_cost_categories
for all using (exists (select 1 from public.projects p where p.id = project_id and public.has_org_role(p.organization_id, array['admin','analyst']::public.organization_role[])))
with check (exists (select 1 from public.projects p where p.id = project_id and public.has_org_role(p.organization_id, array['admin','analyst']::public.organization_role[])));

create policy "funding_lines_select" on public.funding_lines
for select using (public.is_org_member(organization_id));
create policy "funding_lines_write" on public.funding_lines
for all using (public.has_org_role(organization_id, array['admin','analyst']::public.organization_role[]))
with check (public.has_org_role(organization_id, array['admin','analyst']::public.organization_role[]));

create policy "scenarios_select" on public.scenarios
for select using (public.is_org_member(organization_id));
create policy "scenarios_write" on public.scenarios
for all using (public.has_org_role(organization_id, array['admin','analyst']::public.organization_role[]))
with check (public.has_org_role(organization_id, array['admin','analyst']::public.organization_role[]));

create policy "omie_connections_select" on public.omie_connections
for select using (public.is_org_member(organization_id));
create policy "omie_connections_admin_write" on public.omie_connections
for all using (public.has_org_role(organization_id, array['admin']::public.organization_role[]))
with check (public.has_org_role(organization_id, array['admin']::public.organization_role[]));

create policy "omie_sync_runs_select" on public.omie_sync_runs
for select using (public.is_org_member(organization_id));
create policy "omie_sync_runs_write" on public.omie_sync_runs
for all using (public.has_org_role(organization_id, array['admin','analyst']::public.organization_role[]))
with check (public.has_org_role(organization_id, array['admin','analyst']::public.organization_role[]));

create policy "omie_payable_staging_select" on public.omie_payable_staging
for select using (public.is_org_member(organization_id));
create policy "omie_payable_staging_write" on public.omie_payable_staging
for all using (public.has_org_role(organization_id, array['admin','analyst']::public.organization_role[]))
with check (public.has_org_role(organization_id, array['admin','analyst']::public.organization_role[]));

create policy "omie_receivable_staging_select" on public.omie_receivable_staging
for select using (public.is_org_member(organization_id));
create policy "omie_receivable_staging_write" on public.omie_receivable_staging
for all using (public.has_org_role(organization_id, array['admin','analyst']::public.organization_role[]))
with check (public.has_org_role(organization_id, array['admin','analyst']::public.organization_role[]));

create policy "omie_financial_movement_staging_select" on public.omie_financial_movement_staging
for select using (public.is_org_member(organization_id));
create policy "omie_financial_movement_staging_write" on public.omie_financial_movement_staging
for all using (public.has_org_role(organization_id, array['admin','analyst']::public.organization_role[]))
with check (public.has_org_role(organization_id, array['admin','analyst']::public.organization_role[]));

create policy "omie_project_mappings_select" on public.omie_project_mappings
for select using (public.is_org_member(organization_id));
create policy "omie_project_mappings_write" on public.omie_project_mappings
for all using (public.has_org_role(organization_id, array['admin','analyst']::public.organization_role[]))
with check (public.has_org_role(organization_id, array['admin','analyst']::public.organization_role[]));

create policy "audit_logs_select" on public.audit_logs
for select using (
  organization_id is null
  or public.is_org_member(organization_id)
);
create policy "audit_logs_insert" on public.audit_logs
for insert with check (
  organization_id is null
  or public.has_org_role(organization_id, array['admin','analyst']::public.organization_role[])
);
