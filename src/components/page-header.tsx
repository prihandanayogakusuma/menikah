import type { ReactNode } from "react";

export function PageHeader({ title, description, action }: { title: ReactNode; description?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="font-serif text-2xl font-semibold text-stone-900 sm:text-3xl">{title}</h1>
        {description && <div className="mt-1 text-sm text-stone-500">{description}</div>}
      </div>
      {action && <div className="flex flex-wrap items-center gap-2">{action}</div>}
    </div>
  );
}
