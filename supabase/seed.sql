-- Development seed (execute after creating one auth user)
-- Replace UUID placeholders with real auth.users id

insert into public.organizations (id, name, slug)
values ('11111111-1111-1111-1111-111111111111', 'Hike Demo Org', 'hike-demo')
on conflict (id) do nothing;

insert into public.profiles (id, full_name, email)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Demo Admin', 'admin@hike.local')
on conflict (id) do update
set full_name = excluded.full_name,
    email = excluded.email;

insert into public.organization_members (organization_id, profile_id, role)
values ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'admin')
on conflict (organization_id, profile_id) do nothing;

insert into public.project_templates (
  id,
  organization_id,
  name,
  code,
  description,
  default_admin_rate_pct,
  default_direct_cost_pct,
  default_payroll_weight_pct,
  default_contingency_pct
)
values (
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  'Template Base Consultoria',
  'TPL-BASE',
  'Template inicial para projetos consultivos.',
  10,
  35,
  25,
  5
)
on conflict (id) do nothing;

insert into public.projects (
  id,
  organization_id,
  template_id,
  name,
  code,
  client_name,
  status,
  contract_value,
  start_date,
  end_date,
  description,
  created_by
)
values (
  '33333333-3333-3333-3333-333333333333',
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  'Projeto Piloto Hike Advisory',
  'PRJ-001',
  'Cliente Demo SA',
  'active',
  350000,
  '2026-01-01',
  '2026-06-30',
  'Projeto de demonstração para persistência inicial.',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
)
on conflict (id) do nothing;

insert into public.funding_lines (organization_id, name, lender_name, rate_type, rate_value, grace_days, term_days, io_f_tax_pct, notes)
values
('11111111-1111-1111-1111-111111111111', 'Capital de giro banco A', 'Banco A', 'monthly_pct', 1.90, 30, 360, 0.38, 'Linha principal'),
('11111111-1111-1111-1111-111111111111', 'Antecipação recebíveis', 'Fintech B', 'monthly_pct', 2.35, 0, 120, 0.38, 'Uso pontual'),
('11111111-1111-1111-1111-111111111111', 'Crédito ponte', 'Banco C', 'annual_pct', 24.00, 15, 180, 0.38, 'Reserva tática');

insert into public.scenarios (organization_id, project_id, name, scenario_type, description)
values (
  '11111111-1111-1111-1111-111111111111',
  '33333333-3333-3333-3333-333333333333',
  'Cenário Base',
  'base',
  'Cenário inicial para validação do cockpit.'
);

insert into public.project_cost_categories (project_id, category_name, category_type, allocation_method, default_value)
values
('33333333-3333-3333-3333-333333333333', 'Equipe Técnica', 'payroll', 'percent_of_revenue', 25),
('33333333-3333-3333-3333-333333333333', 'Custos Diretos Operacionais', 'direct_cost', 'percent_of_revenue', 35),
('33333333-3333-3333-3333-333333333333', 'Contingência', 'contingency', 'percent_of_cost', 5);
