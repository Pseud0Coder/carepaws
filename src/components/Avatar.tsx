/* eslint-disable @next/next/no-img-element -- static export: no image optimizer */
import { cn } from "@/lib/cn";

const sizes = {
  xs: "h-7 w-7 text-[11px]",
  sm: "h-9 w-9 text-xs",
  md: "h-11 w-11 text-sm",
  lg: "h-16 w-16 text-lg",
  xl: "h-24 w-24 text-2xl",
} as const;

// Earthy tints, picked deterministically from the name so a person keeps their colour.
const tones = [
  "bg-moss-tint text-moss",
  "bg-clay-tint text-clay",
  "bg-river-tint text-river",
  "bg-honey-tint text-honey",
];

function initials(name: string) {
  const parts = name.replace(/^dr\.?\s+/i, "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "·";
  return ((parts[0][0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export default function Avatar({
  src,
  name = "",
  size = "md",
  className,
}: {
  src?: string | null;
  name?: string;
  size?: keyof typeof sizes;
  className?: string;
}) {
  const base = cn("relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold", sizes[size], className);
  if (src) {
    return (
      <span className={base}>
        <img src={src} alt={name} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
      </span>
    );
  }
  return (
    <span className={cn(base, tones[hash(name) % tones.length])} aria-label={name}>
      {initials(name)}
    </span>
  );
}
