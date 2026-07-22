import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

type StatusBadgeProps = ComponentProps<"span"> & {
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
};

const toneClasses: Record<NonNullable<StatusBadgeProps["tone"]>, string> = {
  neutral: "bg-[#F3F4F6] text-[#4B5563]",
  success: "bg-[#F0FDF4] text-[#15803D]",
  warning: "bg-[#FFFBEB] text-[#B45309]",
  danger: "bg-[#FEF2F2] text-[#DC2626]",
  info: "bg-[#EFF6FF] text-[#1D4ED8]",
};

export function StatusBadge({ className, tone = "neutral", ...props }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-xs font-medium",
        toneClasses[tone],
        className,
      )}
      {...props}
    />
  );
}
