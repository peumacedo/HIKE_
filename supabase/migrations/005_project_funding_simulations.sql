alter table public.funding_lines
  add column if not exists minimum_amount numeric(14,2),
  add column if not exists maximum_amount numeric(14,2),
  add column if not exists requires_guarantee boolean not null default false,
  add column if not exists iof_tax_pct numeric(10,4);

update public.funding_lines
set iof_tax_pct = coalesce(iof_tax_pct, io_f_tax_pct)
where iof_tax_pct is null and io_f_tax_pct is not null;

create table if not exists public.project_funding_simulations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  scenario_id uuid references public.scenarios(id) on delete set null,
  funding_line_id uuid not null references public.funding_lines(id) on delete restrict,
  simulation_name text not null,
  status text not null check (status in ('draft', 'active', 'archived')),
  peak_negative_cash numeric(14,2) not null default 0,
  max_funding_need numeric(14,2) not null default 0,
  total_interest_cost numeric(14,2) not null default 0,
  total_iof_cost numeric(14,2) not null default 0,
  total_funding_cost numeric(14,2) not null default 0,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.project_funding_simulation_months (
  id uuid primary key default gen_random_uuid(),
  simulation_id uuid not null references public.project_funding_simulations(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  month_ref date not null,
  projected_net_cash numeric(14,2) not null default 0,
  projected_cumulative_cash numeric(14,2) not null default 0,
  funding_drawdown numeric(14,2) not null default 0,
  funding_outstanding_balance numeric(14,2) not null default 0,
  interest_cost numeric(14,2) not null default 0,
  principal_repayment numeric(14,2) not null default 0,
  iof_cost numeric(14,2) not null default 0,
  closing_funding_balance numeric(14,2) not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (simulation_id, month_ref)
);

create index if not exists project_funding_simulation_months_simulation_idx on public.project_funding_simulation_months(simulation_id);
create index if not exists project_funding_simulation_months_project_idx on public.project_funding_simulation_months(project_id);
create index if not exists project_funding_simulation_months_month_ref_idx on public.project_funding_simulation_months(month_ref);
create index if not exists project_funding_simulations_project_idx on public.project_funding_simulations(project_id);

create trigger trg_project_funding_simulations_updated_at
before update on public.project_funding_simulations
for each row execute function public.set_updated_at();

create trigger trg_project_funding_simulation_months_updated_at
before update on public.project_funding_simulation_months
for each row execute function public.set_updated_at();

alter table public.project_funding_simulations enable row level security;
alter table public.project_funding_simulation_months enable row level security;

create policy "project_funding_simulations_select" on public.project_funding_simulations
for select using (public.is_org_member(organization_id));
create policy "project_funding_simulations_write" on public.project_funding_simulations
for all using (public.has_org_role(organization_id, array['admin','analyst']::public.organization_role[]))
with check (public.has_org_role(organization_id, array['admin','analyst']::public.organization_role[]));

create policy "project_funding_simulation_months_select" on public.project_funding_simulation_months
for select using (public.is_org_member(organization_id));
create policy "project_funding_simulation_months_write" on public.project_funding_simulation_months
for all using (public.has_org_role(organization_id, array['admin','analyst']::public.organization_role[]))
with check (public.has_org_role(organization_id, array['admin','analyst']::public.organization_role[]));
