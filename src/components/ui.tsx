"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { ArrowLeft, Loader2, X } from "lucide-react";
import { cn } from "@/lib/cn";

// ─── Buttons ───────────────────────────────────────────────────────────────

type Variant = "primary" | "secondary" | "ghost" | "clay" | "danger";

const variants: Record<Variant, string> = {
  primary: "bg-moss text-on-moss active:bg-moss-deep shadow-soft",
  secondary: "bg-paper text-bark border border-oat-deep active:bg-oat",
  ghost: "text-bark-soft active:bg-oat",
  clay: "bg-clay text-on-moss active:opacity-90 shadow-soft",
  danger: "bg-ember-tint text-ember active:opacity-80",
};

export function Button({
  variant = "primary",
  size = "md",
  loading,
  block,
  className,
  children,
  disabled,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  block?: boolean;
}) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={cn(
        "inline-flex select-none items-center justify-center gap-2 rounded-full font-semibold transition-[background,opacity,transform] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50",
        size === "sm" && "h-9 px-4 text-sm",
        size === "md" && "h-12 px-5 text-[15px]",
        size === "lg" && "h-14 px-6 text-base",
        block && "w-full",
        variants[variant],
        className
      )}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}

export function IconButton({
  label,
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      {...rest}
      aria-label={label}
      className={cn(
        "inline-flex h-10 w-10 items-center justify-center rounded-full text-bark transition active:bg-oat",
        className
      )}
    >
      {children}
    </button>
  );
}

// ─── Surfaces ──────────────────────────────────────────────────────────────

export function Card({ className, children, onClick }: { className?: string; children: ReactNode; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-[var(--radius-card)] border border-oat-deep/60 bg-paper p-4 shadow-soft",
        onClick && "cursor-pointer transition active:scale-[0.99]",
        className
      )}
    >
      {children}
    </div>
  );
}

export function Chip({
  active,
  children,
  onClick,
  className,
}: {
  active?: boolean;
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition",
        active ? "border-moss bg-moss text-on-moss" : "border-oat-deep bg-paper text-bark-soft active:bg-oat",
        className
      )}
    >
      {children}
    </button>
  );
}

export function Tag({ tone = "oat", children }: { tone?: "oat" | "moss" | "clay" | "river" | "honey" | "ember"; children: ReactNode }) {
  const tones = {
    oat: "bg-oat text-bark-soft",
    moss: "bg-moss-tint text-moss",
    clay: "bg-clay-tint text-clay",
    river: "bg-river-tint text-river",
    honey: "bg-honey-tint text-honey",
    ember: "bg-ember-tint text-ember",
  };
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold", tones[tone])}>
      {children}
    </span>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-4">
      <h2 className="font-display text-xl font-medium text-bark">{children}</h2>
      {action}
    </div>
  );
}

// ─── Form fields ───────────────────────────────────────────────────────────

const fieldBase =
  "w-full rounded-2xl border border-oat-deep bg-paper px-4 text-[15px] text-bark placeholder:text-stone outline-none transition focus:border-moss focus:ring-2 focus:ring-moss/20";

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-bark-soft">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-stone">{hint}</span>}
    </label>
  );
}

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...rest} className={cn(fieldBase, "h-12", className)} />;
}

export function TextArea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...rest} className={cn(fieldBase, "min-h-24 py-3", className)} />;
}

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...rest} className={cn(fieldBase, "h-12 appearance-none", className)}>
      {children}
    </select>
  );
}

// ─── Feedback ──────────────────────────────────────────────────────────────

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("h-6 w-6 animate-spin text-moss", className)} />;
}

export function FullScreenLoader() {
  return (
    <div className="flex min-h-[60dvh] items-center justify-center">
      <Spinner />
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-2xl bg-oat", className)} />;
}

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: ReactNode;
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-oat text-moss">{icon}</div>
      <h3 className="font-display text-lg text-bark">{title}</h3>
      {body && <p className="mt-1 max-w-xs text-sm text-bark-soft">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorNote({ children }: { children: ReactNode }) {
  if (!children) return null;
  return <p className="rounded-2xl bg-ember-tint px-4 py-3 text-sm text-ember">{children}</p>;
}

// ─── Bottom sheet ──────────────────────────────────────────────────────────

export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal aria-label={title}>
      <div className="animate-fade absolute inset-0 bg-bark/40" onClick={onClose} />
      <div className="animate-sheet pb-safe relative max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-t-[28px] bg-linen shadow-lift">
        <div className="sticky top-0 z-10 bg-linen px-5 pt-3 pb-2">
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-oat-deep" />
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl text-bark">{title}</h2>
            <IconButton label="Close" onClick={onClose} className="-mr-2">
              <X className="h-5 w-5" />
            </IconButton>
          </div>
        </div>
        <div className="px-5 pb-6">{children}</div>
      </div>
    </div>
  );
}

// ─── App bar ───────────────────────────────────────────────────────────────

export function AppBar({
  title,
  back,
  action,
  transparent,
}: {
  title?: ReactNode;
  back?: boolean | string;
  action?: ReactNode;
  transparent?: boolean;
}) {
  const router = useRouter();
  return (
    <header
      className={cn(
        "pt-safe sticky top-0 z-30",
        transparent ? "bg-transparent" : "border-b border-oat-deep/50 bg-linen/90 backdrop-blur-md"
      )}
    >
      <div className="flex h-14 items-center gap-1 px-2">
        {back &&
          (typeof back === "string" ? (
            <Link href={back} aria-label="Back" className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-paper/80 active:bg-oat">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          ) : (
            <IconButton label="Back" onClick={() => router.back()} className="bg-paper/80">
              <ArrowLeft className="h-5 w-5" />
            </IconButton>
          ))}
        <div className={cn("min-w-0 flex-1 truncate font-display text-lg text-bark", back ? "px-1" : "px-3")}>{title}</div>
        {action}
      </div>
    </header>
  );
}

// ─── Toasts ────────────────────────────────────────────────────────────────

type Toast = { id: number; text: string; tone: "info" | "error" };
const ToastCtx = createContext<(text: string, tone?: Toast["tone"]) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((text: string, tone: Toast["tone"] = "info") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex flex-col items-center gap-2 px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={cn(
              "animate-rise rounded-full px-5 py-3 text-sm font-medium shadow-lift",
              t.tone === "error" ? "bg-ember text-on-moss" : "bg-bark text-linen"
            )}
          >
            {t.text}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);
