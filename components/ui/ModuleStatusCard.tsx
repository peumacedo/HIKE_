import { InfoBadge } from './InfoBadge';

interface ModuleStatusCardProps {
  module: string;
  status: 'foundation' | 'planned';
  scope: string;
}

const statusLabel = {
  foundation: 'Fundação criada',
  planned: 'Planejado'
};

export function ModuleStatusCard({ module, status, scope }: ModuleStatusCardProps) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-executive">
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-700">{module}</h4>
        <InfoBadge>{statusLabel[status]}</InfoBadge>
      </div>
      <p className="mt-3 text-sm text-slate-600">{scope}</p>
    </article>
  );
}
