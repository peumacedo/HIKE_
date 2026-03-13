-- Scenarios foundation: scenario override layer + consistent scenario linkage on generated flow/funding artifacts

alter table public.scenarios
  alter column project_id set not null,
  add column if not exists base_reference text,
  add column if not exists active boolean not null default true;

create table if not exists public.scenario_assumption_overrides (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  scenario_id uuid not null references public.scenarios(id) on delete cascade,
  assumption_key text not null,
  assumption_label text not null,
  value_numeric numeric(14,4),
  value_text text,
  value_json jsonb,
  unit text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (scenario_id, assumption_key)
);

alter table public.project_funding_simulation_months
  add column if not exists scenario_id uuid references public.scenarios(id) on delete set null;

alter table public.project_cash_flow_generation_runs
  add column if not exists scenario_id uuid references public.scenarios(id) on delete set null;

create index if not exists scenario_assumption_overrides_org_idx on public.scenario_assumption_overrides(organization_id);
create index if not exists scenario_assumption_overrides_scenario_idx on public.scenario_assumption_overrides(scenario_id);
create index if not exists scenarios_project_idx on public.scenarios(project_id);
create index if not exists project_cash_flow_items_scenario_idx on public.project_cash_flow_items(scenario_id);
create index if not exists project_cash_flow_runs_scenario_idx on public.project_cash_flow_generation_runs(scenario_id);
create index if not exists project_funding_simulations_scenario_idx on public.project_funding_simulations(scenario_id);
create index if not exists project_funding_simulation_months_scenario_idx on public.project_funding_simulation_months(scenario_id);

create trigger trg_scenario_assumption_overrides_updated_at
before update on public.scenario_assumption_overrides
for each row execute function public.set_updated_at();

alter table public.scenario_assumption_overrides enable row level security;

create policy "scenario_assumption_overrides_select" on public.scenario_assumption_overrides
for select using (public.is_org_member(organization_id));

create policy "scenario_assumption_overrides_write" on public.scenario_assumption_overrides
for all using (public.has_org_role(organization_id, array['admin','analyst']::public.organization_role[]))
with check (public.has_org_role(organization_id, array['admin','analyst']::public.organization_role[]));
