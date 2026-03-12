import { ReactNode } from 'react';

interface InfoBadgeProps {
  children: ReactNode;
}

export function InfoBadge({ children }: InfoBadgeProps) {
  return (
    <span className="inline-flex items-center rounded-full border border-slate-300 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700">
      {children}
    </span>
  );
}
