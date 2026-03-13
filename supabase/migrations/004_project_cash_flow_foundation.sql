-- Project cash flow foundation: monthly canonical lines, generation runs and Omie reconciliation bridge

create table if not exists public.project_cash_flow_generation_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  generation_type text not null check (generation_type in ('base_schedule', 'regenerate_schedule')),
  status text not null check (status in ('running', 'success', 'partial', 'error')),
  notes text,
  summary_json jsonb,
  started_at timestamptz not null default timezone('utc', now()),
  finished_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.project_cash_flow_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  scenario_id uuid references public.scenarios(id) on delete set null,
  source_layer text not null check (source_layer in ('generated', 'manual', 'imported_omie', 'adjustment')),
  flow_direction text not null check (flow_direction in ('inflow', 'outflow')),
  line_type text not null check (line_type in ('revenue', 'direct_cost', 'payroll', 'admin_allocation', 'contingency', 'tax', 'other')),
  category_name text,
  description text,
  competence_date date,
  expected_cash_date date,
  actual_cash_date date,
  amount numeric(14,2) not null,
  currency_code text not null default 'BRL',
  is_locked boolean not null default false,
  generation_run_id uuid references public.project_cash_flow_generation_runs(id) on delete set null,
  omie_source_table text,
  omie_source_record_id text,
  origin_reference_json jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.omie_reconciliation_links (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  cash_flow_item_id uuid references public.project_cash_flow_items(id) on delete set null,
  omie_source_table text not null check (omie_source_table in ('payables', 'receivables', 'financial_movements')),
  omie_staging_record_id uuid not null,
  reconciliation_status text not null check (reconciliation_status in ('pending', 'matched', 'ignored')),
  inferred_line_type text,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, project_id, omie_source_table, omie_staging_record_id)
);

create index if not exists project_cash_flow_items_org_idx on public.project_cash_flow_items(organization_id);
create index if not exists project_cash_flow_items_project_idx on public.project_cash_flow_items(project_id);
create index if not exists project_cash_flow_items_expected_cash_date_idx on public.project_cash_flow_items(expected_cash_date);
create index if not exists project_cash_flow_items_line_type_idx on public.project_cash_flow_items(line_type);
create index if not exists project_cash_flow_items_source_layer_idx on public.project_cash_flow_items(source_layer);
create index if not exists project_cash_flow_items_generation_run_idx on public.project_cash_flow_items(generation_run_id);
create index if not exists project_cash_flow_runs_org_idx on public.project_cash_flow_generation_runs(organization_id);
create index if not exists project_cash_flow_runs_project_idx on public.project_cash_flow_generation_runs(project_id);
create index if not exists omie_reconciliation_links_org_idx on public.omie_reconciliation_links(organization_id);
create index if not exists omie_reconciliation_links_project_idx on public.omie_reconciliation_links(project_id);
create index if not exists omie_reconciliation_links_status_idx on public.omie_reconciliation_links(reconciliation_status);

create trigger trg_project_cash_flow_generation_runs_updated_at
before update on public.project_cash_flow_generation_runs
for each row execute function public.set_updated_at();

create trigger trg_project_cash_flow_items_updated_at
before update on public.project_cash_flow_items
for each row execute function public.set_updated_at();

create trigger trg_omie_reconciliation_links_updated_at
before update on public.omie_reconciliation_links
for each row execute function public.set_updated_at();

alter table public.project_cash_flow_generation_runs enable row level security;
alter table public.project_cash_flow_items enable row level security;
alter table public.omie_reconciliation_links enable row level security;

create policy "project_cash_flow_generation_runs_select" on public.project_cash_flow_generation_runs
for select using (public.is_org_member(organization_id));

create policy "project_cash_flow_generation_runs_write" on public.project_cash_flow_generation_runs
for all using (public.has_org_role(organization_id, array['admin','analyst']::public.organization_role[]))
with check (public.has_org_role(organization_id, array['admin','analyst']::public.organization_role[]));

create policy "project_cash_flow_items_select" on public.project_cash_flow_items
for select using (public.is_org_member(organization_id));

create policy "project_cash_flow_items_write" on public.project_cash_flow_items
for all using (public.has_org_role(organization_id, array['admin','analyst']::public.organization_role[]))
with check (public.has_org_role(organization_id, array['admin','analyst']::public.organization_role[]));

create policy "omie_reconciliation_links_select" on public.omie_reconciliation_links
for select using (public.is_org_member(organization_id));

create policy "omie_reconciliation_links_write" on public.omie_reconciliation_links
for all using (public.has_org_role(organization_id, array['admin','analyst']::public.organization_role[]))
with check (public.has_org_role(organization_id, array['admin','analyst']::public.organization_role[]));
