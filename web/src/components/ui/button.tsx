import { cn } from "../../lib/utils";
import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
};

export function Button({ className, variant = "primary", ...props }: Props) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";
  const theme: Record<Props["variant"], string> = {
    primary: "bg-brand-500 text-white hover:bg-brand-700 focus-visible:outline-brand-500",
    secondary:
      "bg-slate-800 text-slate-50 hover:bg-slate-700 border border-slate-700 focus-visible:outline-slate-100",
    ghost: "bg-transparent text-slate-200 hover:bg-slate-800 focus-visible:outline-slate-200",
  };

  return <button className={cn(base, theme[variant], className)} {...props} />;
}
