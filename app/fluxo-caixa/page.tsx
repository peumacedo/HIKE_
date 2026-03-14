import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { requireSession, getUserMemberships } from '@/lib/auth/helpers';
import { aggregateOrganizationCashFlowByMonth } from '@/lib/data/cash-flow';

export const dynamic = 'force-dynamic';
function money(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
}

export default async function FluxoCaixaPage() {
  await requireSession();
  const memberships = await getUserMemberships();
  const currentMembership = memberships[0];

  const monthly = currentMembership ? await aggregateOrganizationCashFlowByMonth(currentMembership.organization_id) : [];

  return (
    <AppShell>
      <PageHeader
        title="Fluxo de Caixa"
        description="Visão global mensal por organização, mantendo separação entre projetado e realizado importado."
      />
      <div className="p-6">
        <div className="rounded border bg-white p-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left">
                <th>Mês</th>
                <th>Entradas projetadas</th>
                <th>Saídas projetadas</th>
                <th>Saldo projetado</th>
                <th>Entradas realizadas</th>
                <th>Saídas realizadas</th>
                <th>Saldo realizado</th>
              </tr>
            </thead>
            <tbody>
              {monthly.map((row) => (
                <tr key={row.month} className="border-t">
                  <td>{row.month}</td>
                  <td>{money(row.projected_inflows)}</td>
                  <td>{money(row.projected_outflows)}</td>
                  <td>{money(row.projected_net)}</td>
                  <td>{money(row.actual_inflows)}</td>
                  <td>{money(row.actual_outflows)}</td>
                  <td>{money(row.actual_net)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
