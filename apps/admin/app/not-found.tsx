import Link from "next/link";
import { EmptyState } from "@/components/common/empty-state";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#F5F7FA] p-6">
      <section className="w-full max-w-xl rounded-xl border bg-white p-8 shadow-sm">
        <p className="text-center text-6xl font-bold tracking-tight text-[#2563EB]">404</p>
        <EmptyState
          title="页面不存在"
          description="请求的页面不存在或尚未开放。"
          compact
          action={
            <Link
              className="inline-flex h-9 items-center rounded-md bg-[#2563EB] px-3 text-sm font-medium text-white hover:bg-[#1D4ED8]"
              href="/"
            >
              返回首页
            </Link>
          }
        />
      </section>
    </main>
  );
}
