import { toast as sonnerToast } from "sonner";
import type { ReactNode } from "react";

export type ToastProps = {
  title?: ReactNode;
  description?: ReactNode;
  variant?: "default" | "destructive";
  duration?: number;
  action?: unknown;
};

function toastFn({ title = "", description, variant, duration }: ToastProps) {
  const msg = title as string;
  const opts = { description: description as string | undefined, duration };
  if (variant === "destructive") {
    sonnerToast.error(msg, opts);
  } else {
    sonnerToast.success(msg, opts);
  }
}

export function useToast() {
  return {
    toast: toastFn,
    toasts: [] as never[],
    dismiss: (_id?: string) => {},
  };
}

export { toastFn as toast };
