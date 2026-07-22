import type { ReactNode } from "react";
import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

type EmptyStateProps = Readonly<{
  title?: string;
  description?: string;
  action?: ReactNode;
  compact?: boolean;
}>;

export function EmptyState({
  title = "暂无内容",
  description = "当前区域为工程占位，业务功能尚未开始。",
  action,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-6 text-center",
        compact ? "min-h-52" : "min-h-[420px]",
      )}
    >
      <div className="mb-4 grid size-14 place-items-center rounded-2xl bg-[#EFF6FF] text-[#2563EB]">
        <Inbox className="size-7" aria-hidden="true" />
      </div>
      <h2 className="text-base font-semibold text-[#1F2937]">{title}</h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-[#6B7280]">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
