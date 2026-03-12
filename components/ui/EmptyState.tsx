interface EmptyStateProps {
  title: string;
  description: string;
}

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
      <h4 className="text-base font-semibold text-slate-900">{title}</h4>
      <p className="mt-2 text-sm text-slate-600">{description}</p>
    </div>
  );
}
