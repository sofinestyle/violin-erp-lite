import { LoaderCircle } from "lucide-react";

export function GlobalLoading() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#F5F7FA]" aria-live="polite">
      <div className="flex flex-col items-center gap-4 rounded-xl border bg-white px-10 py-8 shadow-sm">
        <LoaderCircle className="size-8 animate-spin text-[#2563EB]" aria-hidden="true" />
        <p className="text-sm font-medium text-[#4B5563]">正在加载应用</p>
      </div>
    </main>
  );
}
