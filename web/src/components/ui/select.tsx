import type { SelectHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        "w-full rounded-lg border border-slate-700 bg-slate-800/70 px-3 py-2 text-sm text-slate-50 focus:border-brand-500 focus:outline-none",
        props.className
      )}
    />
  );
}
