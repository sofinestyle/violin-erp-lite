"use client";

import { CircleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

type GlobalErrorStateProps = Readonly<{
  title?: string;
  description?: string;
  onRetry?: () => void;
}>;

export function GlobalErrorState({
  title = "应用暂时不可用",
  description = "公共服务健康检查未通过，请稍后重试。",
  onRetry,
}: GlobalErrorStateProps) {
  return (
    <main className="grid min-h-screen place-items-center bg-[#F5F7FA]">
      <section className="w-full max-w-md rounded-xl border bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-[#FEF2F2] text-[#DC2626]">
          <CircleAlert className="size-7" aria-hidden="true" />
        </div>
        <h1 className="text-xl font-semibold text-[#1F2937]">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-[#6B7280]">{description}</p>
        {onRetry ? (
          <Button className="mt-6" onClick={onRetry}>
            重试
          </Button>
        ) : null}
      </section>
    </main>
  );
}
