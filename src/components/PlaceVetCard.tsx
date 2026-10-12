"use client";

import { Flag, MapPin, Navigation, Phone } from "lucide-react";
import { formatKm } from "@/lib/geo";
import { todaysHours, type VetPlace } from "@/lib/places";
import { cn } from "@/lib/cn";
import StarRating from "./StarRating";

const tel = (p: string) => `tel:${p.replace(/[^\d+]/g, "")}`;

/** A clinic from Google Maps: rating, whether it's open, Google's review summary, a call button and directions. */
export default function PlaceVetCard({ vet, emergency }: { vet: VetPlace; emergency?: boolean }) {
  const hours = todaysHours(vet.weekHours);
  const dial = vet.phoneIntl ?? vet.phone;
  return (
    <article className={cn("rounded-[var(--radius-card)] border bg-paper p-4 shadow-soft", emergency ? "border-ember" : "border-oat-deep/60")}>
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold text-bark">{vet.name}</h3>
        <span className="shrink-0 rounded-full bg-oat px-2.5 py-1 text-xs font-semibold text-bark-soft">{formatKm(vet.distanceKm)}</span>
      </div>

      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
        {typeof vet.rating === "number" ? (
          <span className="flex items-center gap-1.5 text-sm text-bark">
            <StarRating rating={vet.rating} size={14} />
            <span className="font-semibold">{vet.rating.toFixed(1)}</span>
            {typeof vet.ratingCount === "number" && <span className="text-bark-soft">({vet.ratingCount.toLocaleString("en-IN")})</span>}
          </span>
        ) : (
          <span className="text-sm text-stone">No ratings yet</span>
        )}
        {typeof vet.openNow === "boolean" && (
          <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", vet.openNow ? "bg-moss-tint text-moss" : "bg-ember-tint text-ember")}>
            {vet.openNow ? "Open now" : "Closed now"}
          </span>
        )}
      </div>

      {vet.address && (
        <p className="mt-2 flex items-start gap-1.5 text-sm text-bark-soft">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0" /> {vet.address}
        </p>
      )}
      {hours && <p className="mt-1 text-xs text-stone">Today: {hours}</p>}

      {vet.summary && (
        <div className="mt-3 rounded-2xl bg-oat/60 p-3">
          <p className="text-sm text-bark">{vet.summary.text}</p>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-2 text-[11px] text-stone">
            <span>{vet.summary.disclosure}</span>
            {vet.summary.reviewsUrl && (
              <a href={vet.summary.reviewsUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-moss">
                Read the reviews on Google Maps
              </a>
            )}
            {vet.summary.flagUrl && (
              <a href={vet.summary.flagUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 text-stone" aria-label="Report this summary to Google">
                <Flag className="h-3 w-3" /> Report
              </a>
            )}
          </p>
        </div>
      )}

      <div className="mt-3 grid grid-cols-2 gap-2">
        {dial ? (
          <a
            href={tel(dial)}
            className={cn(
              "flex h-11 items-center justify-center gap-2 rounded-full text-sm font-semibold whitespace-nowrap",
              emergency ? "bg-ember text-white" : "bg-moss text-on-moss"
            )}
          >
            <Phone className="h-4 w-4" /> Call
          </a>
        ) : (
          <span className="flex h-11 items-center justify-center rounded-full bg-oat text-sm text-stone">No phone listed</span>
        )}
        <a
          href={vet.directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-11 items-center justify-center gap-2 rounded-full border border-oat-deep bg-paper text-sm font-semibold whitespace-nowrap text-bark"
        >
          <Navigation className="h-4 w-4" /> Open in Maps
        </a>
      </div>
      {vet.phone && <p className="mt-1.5 text-center text-xs text-stone">{vet.phone}</p>}
    </article>
  );
}
