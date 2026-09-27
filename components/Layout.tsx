import { ReactNode } from "react";

export function PageShell({
  breadcrumbs,
  children,
}: {
  breadcrumbs?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="max-w-6xl mx-auto px-5 py-6">
      {breadcrumbs && (
        <div className="mb-5 text-xs font-mono text-txt-dim flex items-center gap-1.5">
          {breadcrumbs}
        </div>
      )}
      {children}
    </div>
  );
}

export function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-sm font-semibold text-txt uppercase tracking-wider">{title}</h2>
      {sub && <p className="text-xs text-txt-muted mt-0.5">{sub}</p>}
    </div>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`bg-bg-surface border border-bg-border rounded-lg ${className}`}
    >
      {children}
    </div>
  );
}
