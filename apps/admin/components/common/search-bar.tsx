import { Search } from "lucide-react";
import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type SearchBarProps = InputHTMLAttributes<HTMLInputElement>;

export function SearchBar({ className, placeholder = "搜索", ...props }: SearchBarProps) {
  return (
    <label className={cn("relative block w-full max-w-sm", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#9CA3AF]" />
      <input
        className="h-9 w-full rounded-md border bg-white pl-9 pr-3 text-sm text-[#1F2937] placeholder:text-[#9CA3AF]"
        placeholder={placeholder}
        {...props}
      />
    </label>
  );
}
