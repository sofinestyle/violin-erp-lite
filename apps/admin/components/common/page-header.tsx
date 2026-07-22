import type { ReactNode } from "react";

type PageHeaderProps = Readonly<{
  title: string;
  description?: string;
  actions?: ReactNode;
}>;

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <header className="mb-5 flex min-h-14 items-start justify-between gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[#1F2937]">{title}</h1>
        {description ? <p className="mt-1 text-sm text-[#6B7280]">{description}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </header>
  );
}
