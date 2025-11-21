import type { TextareaHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        "w-full rounded-lg border border-slate-700 bg-slate-800/70 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500 focus:border-brand-500 focus:outline-none min-h-[120px]",
        props.className
      )}
    />
  );
}
