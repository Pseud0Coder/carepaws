import Link from "next/link";
import { BadgeCheck, MapPin, Star } from "lucide-react";
import type { SitterProfile } from "@/lib/types";
import { formatINR } from "@/lib/format";
import Avatar from "./Avatar";
import { Tag } from "./ui";

export function sitterHref(uid: string) {
  return `/sitters/profile/?id=${encodeURIComponent(uid)}`;
}

/** Full-width list row used on Discover and search. */
export default function SitterCard({ sitter }: { sitter: SitterProfile }) {
  return (
    <Link
      href={sitterHref(sitter.uid)}
      className="flex gap-4 rounded-[var(--radius-card)] border border-oat-deep/60 bg-paper p-4 shadow-soft transition active:scale-[0.99]"
    >
      <Avatar src={sitter.photoURL} name={sitter.displayName} size="lg" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <h3 className="truncate font-semibold text-bark">{sitter.displayName}</h3>
          {sitter.verified && <BadgeCheck className="h-4 w-4 shrink-0 text-moss" aria-label="Verified" />}
        </div>
        <p className="mt-0.5 flex items-center gap-1 truncate text-sm text-bark-soft">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          {sitter.location || "Location not set"}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {(sitter.reviewCount ?? 0) > 0 ? (
            <Tag tone="honey">
              <Star className="h-3 w-3 fill-current" />
              {(sitter.rating ?? 0).toFixed(1)} · {sitter.reviewCount}
            </Tag>
          ) : (
            <Tag tone="river">New</Tag>
          )}
          {sitter.topRated && <Tag tone="moss">Top rated</Tag>}
          {sitter.petTypes?.slice(0, 2).map((p) => (
            <Tag key={p}>{p}</Tag>
          ))}
        </div>
      </div>
      <div className="shrink-0 text-right">
        <p className="font-display text-lg text-bark">{formatINR(sitter.pricePerNight)}</p>
        <p className="text-xs text-stone">per night</p>
      </div>
    </Link>
  );
}

/** Compact vertical card used in horizontal carousels. */
export function SitterTile({ sitter }: { sitter: SitterProfile }) {
  return (
    <Link
      href={sitterHref(sitter.uid)}
      className="flex w-40 shrink-0 flex-col items-center rounded-[var(--radius-card)] border border-oat-deep/60 bg-paper p-4 text-center shadow-soft transition active:scale-[0.98]"
    >
      <Avatar src={sitter.photoURL} name={sitter.displayName} size="lg" />
      <p className="mt-3 flex w-full items-center justify-center gap-1 font-semibold text-bark">
        <span className="truncate">{sitter.displayName.replace(/^Dr\.?\s+/, "")}</span>
        {sitter.verified && <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-moss" />}
      </p>
      <p className="w-full truncate text-xs text-bark-soft">{sitter.location?.split(",").pop()?.trim()}</p>
      <div className="mt-2 flex items-center gap-1 text-xs font-semibold text-honey">
        <Star className="h-3 w-3 fill-current" />
        {(sitter.rating ?? 0) > 0 ? sitter.rating!.toFixed(1) : "New"}
        <span className="text-stone">· {formatINR(sitter.pricePerNight)}</span>
      </div>
    </Link>
  );
}
