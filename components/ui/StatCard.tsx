import { ReactNode } from 'react';

interface StatCardProps {
  label: string;
  value: string;
  helper?: ReactNode;
}

export function StatCard({ label, value, helper }: StatCardProps) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-executive">
      <p className="text-sm font-medium text-slate-600">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{value}</p>
      {helper ? <div className="mt-3 text-xs text-slate-500">{helper}</div> : null}
    </article>
  );
}
