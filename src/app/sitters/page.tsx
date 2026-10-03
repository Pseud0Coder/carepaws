"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Search, SearchX, SlidersHorizontal } from "lucide-react";
import { getSitters, type SitterFilters } from "@/lib/db";
import type { SitterProfile } from "@/lib/types";
import { PET_EMOJI, PET_TYPES } from "@/lib/constants";
import { formatINR } from "@/lib/format";
import SitterCard from "@/components/SitterCard";
import { AppBar, Button, Chip, EmptyState, IconButton, Sheet, Skeleton } from "@/components/ui";

const SORTS: { value: NonNullable<SitterFilters["sortBy"]>; label: string }[] = [
  { value: "rating", label: "Top rated" },
  { value: "reviews", label: "Most reviewed" },
  { value: "vouched", label: "Most vouched" },
  { value: "price-low", label: "Lowest price" },
  { value: "price-high", label: "Highest price" },
];

const PRICE_CAPS = [0, 1500, 2000, 2500, 3000];

function SitterSearch() {
  const params = useSearchParams();
  const [all, setAll] = useState<SitterProfile[] | null>(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [petType, setPetType] = useState(params.get("pet") || "All");
  const [sortBy, setSortBy] = useState<SitterFilters["sortBy"]>("rating");
  const [maxPrice, setMaxPrice] = useState(0);
  const [vouchedOnly, setVouchedOnly] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    getSitters()
      .then(setAll)
      .catch(() => setError("Couldn't load sitters. Check your connection."));
  }, []);

  // Filter locally: one read, instant feedback while typing.
  const sitters = useMemo(() => {
    if (!all) return null;
    const s = search.trim().toLowerCase();
    const list = all.filter(
      (x) =>
        (!s || x.displayName.toLowerCase().includes(s) || x.location?.toLowerCase().includes(s)) &&
        (petType === "All" || x.petTypes?.includes(petType)) &&
        (!maxPrice || x.pricePerNight <= maxPrice) &&
        (!vouchedOnly || (x.vouchCount ?? 0) > 0)
    );
    return [...list].sort((a, b) => {
      if (sortBy === "price-low") return a.pricePerNight - b.pricePerNight;
      if (sortBy === "price-high") return b.pricePerNight - a.pricePerNight;
      if (sortBy === "reviews") return (b.reviewCount ?? 0) - (a.reviewCount ?? 0);
      if (sortBy === "vouched") return (b.vouchCount ?? 0) - (a.vouchCount ?? 0) || (b.rating ?? 0) - (a.rating ?? 0);
      return (b.rating ?? 0) - (a.rating ?? 0);
    });
  }, [all, search, petType, maxPrice, sortBy, vouchedOnly]);

  const activeFilters = (sortBy !== "rating" ? 1 : 0) + (maxPrice ? 1 : 0) + (vouchedOnly ? 1 : 0);

  return (
    <>
      <AppBar
        back="/"
        title="Find a sitter"
        action={
          <IconButton label="Filters" onClick={() => setFiltersOpen(true)} className="relative">
            <SlidersHorizontal className="h-5 w-5" />
            {activeFilters > 0 && (
              <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-clay text-[10px] font-bold text-on-moss">
                {activeFilters}
              </span>
            )}
          </IconButton>
        }
      />
      <main className="px-5 pt-4">
        <label className="flex h-12 items-center gap-3 rounded-full border border-oat-deep bg-paper px-4 focus-within:border-moss">
          <Search className="h-5 w-5 text-stone" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name or area"
            className="h-full flex-1 bg-transparent text-bark outline-none placeholder:text-stone"
            type="search"
            aria-label="Search sitters"
          />
        </label>
        <div className="no-scrollbar -mx-5 mt-3 flex gap-2 overflow-x-auto px-5 pb-1">
          {["All", ...PET_TYPES].map((t) => (
            <Chip key={t} active={petType === t} onClick={() => setPetType(t)}>
              {t !== "All" && <span aria-hidden>{PET_EMOJI[t]}</span>}
              {t}
            </Chip>
          ))}
        </div>

        <p className="mt-4 mb-3 text-sm text-bark-soft">
          {sitters ? `${sitters.length} sitter${sitters.length === 1 ? "" : "s"}` : "Loading…"}
        </p>

        {error && <p className="text-sm text-ember">{error}</p>}
        <div className="space-y-3 pb-6">
          {sitters === null && !error
            ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-28" />)
            : sitters?.map((s) => <SitterCard key={s.uid} sitter={s} />)}
        </div>
        {sitters?.length === 0 && (
          <EmptyState
            icon={<SearchX className="h-7 w-7" />}
            title="No sitters match"
            body="Try another area, or loosen your filters."
            action={
              <Button
                variant="secondary"
                onClick={() => {
                  setSearch("");
                  setPetType("All");
                  setMaxPrice(0);
                  setVouchedOnly(false);
                }}
              >
                Clear filters
              </Button>
            }
          />
        )}
      </main>

      <Sheet open={filtersOpen} onClose={() => setFiltersOpen(false)} title="Filters">
        <h3 className="mb-2 text-sm font-semibold text-bark">Sort by</h3>
        <div className="flex flex-wrap gap-2">
          {SORTS.map((s) => (
            <Chip key={s.value} active={sortBy === s.value} onClick={() => setSortBy(s.value)}>
              {s.label}
            </Chip>
          ))}
        </div>
        <h3 className="mt-6 mb-2 text-sm font-semibold text-bark">Trust</h3>
        <div className="flex flex-wrap gap-2">
          <Chip active={vouchedOnly} onClick={() => setVouchedOnly((v) => !v)}>
            Vouched by a rescue or vet
          </Chip>
        </div>
        <h3 className="mt-6 mb-2 text-sm font-semibold text-bark">Nightly budget</h3>
        <div className="flex flex-wrap gap-2">
          {PRICE_CAPS.map((p) => (
            <Chip key={p} active={maxPrice === p} onClick={() => setMaxPrice(p)}>
              {p ? `Up to ${formatINR(p)}` : "Any"}
            </Chip>
          ))}
        </div>
        <Button block className="mt-8" onClick={() => setFiltersOpen(false)}>
          Show {sitters?.length ?? ""} sitters
        </Button>
      </Sheet>
    </>
  );
}

export default function SittersPage() {
  return (
    <Suspense>
      <SitterSearch />
    </Suspense>
  );
}
