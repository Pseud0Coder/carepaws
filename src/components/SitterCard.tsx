import Link from "next/link";
import { MapPin, Shield, ChevronRight } from "lucide-react";
import type { Sitter } from "@/lib/data";
import StarRating from "./StarRating";
import Avatar from "./Avatar";

export default function SitterCard({ sitter }: { sitter: Sitter }) {
  return (
    <Link
      href={`/sitters/${sitter.id}`}
      className="group block rounded-xl border border-border bg-surface p-5 transition-all duration-200 hover:shadow-md hover:border-primary-100"
    >
      <div className="flex items-start gap-4">
        <Avatar name={sitter.name} gender={sitter.gender} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-foreground">{sitter.name}</h3>
            {sitter.verified && (
              <Shield className="h-4 w-4 fill-accent-400 text-accent-400" />
            )}
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 text-sm text-text-tertiary">
            <MapPin className="h-3.5 w-3.5" />
            {sitter.location}
          </div>
        </div>
      </div>

      <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-text-secondary">
        {sitter.bio}
      </p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {sitter.services.slice(0, 3).map((service) => (
          <span
            key={service}
            className="rounded-md bg-surface-alt px-2.5 py-1 text-xs font-medium text-text-secondary"
          >
            {service}
          </span>
        ))}
        {sitter.services.length > 3 && (
          <span className="rounded-md bg-surface-alt px-2.5 py-1 text-xs font-medium text-text-tertiary">
            +{sitter.services.length - 3} more
          </span>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-border-subtle pt-3">
        <div className="flex items-center gap-2">
          <StarRating rating={sitter.rating} size={14} />
          <span className="text-sm font-medium text-foreground">
            {sitter.rating}
          </span>
          <span className="text-sm text-text-tertiary">
            ({sitter.reviewCount})
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right">
            <span className="text-lg font-semibold text-foreground">
              ₹{sitter.pricePerNight}
            </span>
            <span className="text-sm text-text-tertiary"> /night</span>
          </div>
          <ChevronRight className="h-4 w-4 text-text-tertiary opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-0.5" />
        </div>
      </div>
    </Link>
  );
}
