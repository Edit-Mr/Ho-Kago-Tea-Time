import { cn } from "../../lib/utils";
import type { HTMLAttributes } from "react";

type Props = HTMLAttributes<HTMLDivElement> & {
  variant?: "default" | "warning" | "danger" | "success";
};

export function Badge({ className, variant = "default", ...props }: Props) {
  const styles: Record<Props["variant"], string> = {
    default: "bg-slate-800 text-slate-100 border border-slate-700",
    warning: "bg-amber-500/20 text-amber-200 border border-amber-500/40",
    danger: "bg-red-500/20 text-red-200 border border-red-500/40",
    success: "bg-emerald-500/20 text-emerald-200 border border-emerald-500/40",
  };
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium",
        styles[variant],
        className
      )}
      {...props}
    />
  );
}
