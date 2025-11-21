import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

type DrawerProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
};

export function Drawer({ open, onClose, title, children }: DrawerProps) {
  return (
    <div
      className={cn(
        "fixed inset-0 z-50 transition duration-300",
        open ? "pointer-events-auto" : "pointer-events-none"
      )}
    >
      <div
        className={cn(
          "absolute inset-0 bg-black/60 transition-opacity",
          open ? "opacity-100" : "opacity-0"
        )}
        onClick={onClose}
      />
      <div
        className={cn(
          "absolute inset-y-0 right-0 w-full max-w-md bg-slate-900 shadow-2xl border-l border-slate-800 transition-transform",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="text-base font-semibold text-slate-50">{title}</div>
          <button
            className="text-slate-400 hover:text-slate-100"
            aria-label="Close"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <div className="p-5 overflow-y-auto h-full">{children}</div>
      </div>
    </div>
  );
}
