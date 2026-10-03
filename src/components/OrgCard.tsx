import Link from "next/link";
import { BadgeCheck, MapPin, Navigation, Phone } from "lucide-react";
import type { OrgProfile, OrgRole } from "@/lib/types";
import { directionsUrl, formatKm, telHref } from "@/lib/geo";
import { cn } from "@/lib/cn";
import Avatar from "./Avatar";
import { Tag } from "./ui";

export const orgHref = (uid: string) => `/nearby/org/?id=${encodeURIComponent(uid)}`;

export function OrgTypeTag({ type }: { type: OrgRole }) {
  return type === "vet" ? <Tag tone="river">Vet clinic</Tag> : <Tag tone="clay">Rescue</Tag>;
}

/** Big, thumb-sized call button. A plain `tel:` link, so no extra permission is needed. */
export function CallButton({ phone, size = "md", label, className }: { phone: string; size?: "md" | "lg"; label?: string; className?: string }) {
  return (
    <a
      href={telHref(phone)}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full bg-moss font-semibold whitespace-nowrap text-on-moss shadow-soft transition active:scale-[0.98] active:bg-moss-deep",
        size === "lg" ? "h-14 px-6 text-base" : "h-11 px-5 text-[15px]",
        className
      )}
    >
      <Phone className={size === "lg" ? "h-5 w-5" : "h-4 w-4"} />
      {label ?? "Call"}
    </a>
  );
}

export function DirectionsButton({ org, className, iconOnly }: { org: OrgProfile; className?: string; iconOnly?: boolean }) {
  return (
    <a
      href={directionsUrl(org)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Directions"
      className={cn(
        "inline-flex h-11 items-center justify-center gap-2 rounded-full border border-oat-deep bg-paper text-[15px] font-semibold whitespace-nowrap text-bark transition active:bg-oat",
        iconOnly ? "w-14 shrink-0" : "px-5",
        className
      )}
    >
      <Navigation className="h-4 w-4" />
      {!iconOnly && "Directions"}
    </a>
  );
}

export default function OrgCard({ org, km, emergency }: { org: OrgProfile; km?: number; emergency?: boolean }) {
  return (
    <article className="rounded-[var(--radius-card)] border border-oat-deep/60 bg-paper p-4 shadow-soft">
      <Link href={orgHref(org.uid)} className="flex gap-3">
        <Avatar src={org.photoURL} name={org.displayName} size="md" />
        <div className="min-w-0 flex-1">
          <h3 className="flex items-center gap-1.5 font-semibold text-bark">
            <span className="truncate">{org.displayName}</span>
            {org.verified && <BadgeCheck className="h-4 w-4 shrink-0 text-moss" aria-label="Verified" />}
          </h3>
          <p className="mt-0.5 flex items-center gap-1 text-sm text-bark-soft">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{org.location}</span>
            {km !== undefined && <span className="shrink-0 font-semibold text-bark"> · {formatKm(km)}</span>}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <OrgTypeTag type={org.role as OrgRole} />
            {org.open24x7 && <Tag tone="ember">Open 24×7</Tag>}
            {org.hours && !org.open24x7 && <Tag>{org.hours}</Tag>}
            {(org.vouchCount ?? 0) > 0 && <Tag tone="moss">Vouches for {org.vouchCount}</Tag>}
          </div>
        </div>
      </Link>
      {/* In an emergency the buttons stack and grow, so they are easy to hit and the number is readable. */}
      <div className={cn("mt-3 flex gap-2", emergency && "flex-col")}>
        {org.phone && <CallButton phone={org.phone} size={emergency ? "lg" : "md"} label={emergency ? `Call ${org.phone}` : "Call"} className={emergency ? "w-full" : "flex-1"} />}
        <DirectionsButton org={org} className={emergency ? "w-full" : undefined} />
      </div>
    </article>
  );
}
