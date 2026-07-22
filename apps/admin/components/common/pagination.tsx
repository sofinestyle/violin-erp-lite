"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

type PaginationProps = Readonly<{
  page: number;
  pageCount: number;
  onPageChange?: (page: number) => void;
}>;

export function Pagination({ page, pageCount, onPageChange }: PaginationProps) {
  return (
    <nav className="flex items-center justify-end gap-2" aria-label="分页">
      <Button
        variant="secondary"
        size="icon"
        disabled={page <= 1}
        onClick={() => onPageChange?.(page - 1)}
        aria-label="上一页"
      >
        <ChevronLeft className="size-4" />
      </Button>
      <span className="min-w-20 text-center text-sm text-[#4B5563]">
        {page} / {Math.max(pageCount, 1)}
      </span>
      <Button
        variant="secondary"
        size="icon"
        disabled={page >= pageCount}
        onClick={() => onPageChange?.(page + 1)}
        aria-label="下一页"
      >
        <ChevronRight className="size-4" />
      </Button>
    </nav>
  );
}
