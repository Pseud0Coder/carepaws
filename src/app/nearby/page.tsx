"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { LocateFixed, MapPinOff, Search, Siren, X } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { getOrgs } from "@/lib/db";
import { distanceKm, getPosition, loadSavedPosition, savePosition, type Coords } from "@/lib/geo";
import type { OrgProfile, OrgRole } from "@/lib/types";
import { cn } from "@/lib/cn";
import OrgCard from "@/components/OrgCard";
import { AppBar, Button, Chip, EmptyState, Skeleton } from "@/components/ui";

const TYPES: { id: OrgRole; label: string }[] = [
  { id: "rescue", label: "Rescues & shelters" },
  { id: "vet", label: "Vets & clinics" },
];

function Nearby() {
  const params = useSearchParams();
  const { profile } = useAuth();
  const emergency = params.get("emergency") === "1";
  const [type, setType] = useState<OrgRole>(params.get("type") === "vet" || emergency ? "vet" : "rescue");
  const [lists, setLists] = useState<Partial<Record<OrgRole, OrgProfile[]>>>({});
  const [failed, setFailed] = useState(false);
  const [search, setSearch] = useState("");
  const [only24, setOnly24] = useState(emergency);
  // Read once on the client; null on the server render, which is fine since this page is client-only data.
  const [pos, setPos] = useState<Coords | null>(() => (typeof window === "undefined" ? null : loadSavedPosition()));
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState("");

  useEffect(() => {
    if (lists[type]) return;
    getOrgs(type)
      .then((o) => setLists((l) => ({ ...l, [type]: o })))
      .catch(() => setFailed(true));
  }, [type, lists]);

  async function locate() {
    setLocating(true);
    setLocError("");
    try {
      const c = await getPosition();
      setPos(c);
      savePosition(c);
    } catch (e) {
      setLocError((e as Error).message);
    } finally {
      setLocating(false);
    }
  }

  const results = useMemo(() => {
    const all = lists[type];
    if (!all) return null;
    const s = search.trim().toLowerCase();
    const rows = all
      .filter(
        (o) =>
          (!s || [o.displayName, o.location, o.address].some((f) => f?.toLowerCase().includes(s))) &&
          (!only24 || o.open24x7)
      )
      .map((o) => ({
        org: o,
        km: pos && typeof o.lat === "number" && typeof o.lng === "number" ? distanceKm(pos, { lat: o.lat, lng: o.lng }) : undefined,
      }));
    rows.sort((a, b) => {
      if (emergency && !!a.org.open24x7 !== !!b.org.open24x7) return a.org.open24x7 ? -1 : 1;
      if (a.km !== undefined && b.km !== undefined) return a.km - b.km;
      if (a.km !== undefined) return -1;
      if (b.km !== undefined) return 1;
      return a.org.displayName.localeCompare(b.org.displayName);
    });
    return rows;
  }, [lists, type, search, only24, pos, emergency]);

  const isOrg = profile?.role === "rescue" || profile?.role === "vet";

  return (
    <>
      <AppBar title={emergency ? "Emergency vets" : "Nearby help"} back={emergency ? "/" : undefined} />
      <main className="px-5 pb-6">
        {emergency && (
          <div className="mt-4 flex gap-3 rounded-[var(--radius-card)] bg-ember-tint p-4">
            <Siren className="h-6 w-6 shrink-0 text-ember" />
            <p className="text-sm text-bark">
              <span className="font-semibold">Call ahead</span> so the clinic can prepare for your arrival. Clinics marked{" "}
              <span className="font-semibold">24×7</span> take emergencies at any hour.
            </p>
          </div>
        )}

        <div className="mt-4 flex rounded-full bg-oat p-1" role="tablist">
          {TYPES.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={type === t.id}
              onClick={() => setType(t.id)}
              className={cn(
                "flex-1 rounded-full py-2 text-sm font-semibold transition",
                type === t.id ? "bg-paper text-bark shadow-soft" : "text-bark-soft"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <label className="mt-4 flex h-12 items-center gap-3 rounded-full border border-oat-deep bg-paper px-4 focus-within:border-moss">
          <Search className="h-5 w-5 text-stone" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name or area"
            type="search"
            aria-label="Search by name or area"
            className="h-full flex-1 bg-transparent text-bark outline-none placeholder:text-stone"
          />
        </label>

        <div className="no-scrollbar -mx-5 mt-3 flex gap-2 overflow-x-auto px-5 pb-1">
          {pos ? (
            <Chip
              active
              onClick={() => {
                setPos(null);
                savePosition(null);
              }}
            >
              <LocateFixed className="h-4 w-4" /> Near you <X className="h-3.5 w-3.5" />
            </Chip>
          ) : (
            <Chip onClick={locate}>
              <LocateFixed className="h-4 w-4" /> {locating ? "Locating…" : "Use my location"}
            </Chip>
          )}
          {type === "vet" && (
            <Chip active={only24} onClick={() => setOnly24((v) => !v)}>
              Open 24×7
            </Chip>
          )}
        </div>
        {locError && <p className="mt-2 text-sm text-ember">{locError}</p>}
        {!pos && !locError && (
          <p className="mt-2 text-xs text-stone">Share your location to sort by distance. It stays on your device.</p>
        )}

        <div className="mt-4 space-y-3">
          {results === null && !failed ? (
            Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-40" />)
          ) : failed ? (
            <p className="py-8 text-center text-sm text-ember">Couldn’t load listings. Check your connection.</p>
          ) : results!.length === 0 ? (
            <EmptyState
              icon={<MapPinOff className="h-7 w-7" />}
              title={search || only24 ? "Nothing matches" : `No ${type === "vet" ? "clinics" : "rescues"} listed yet`}
              body={
                search || only24
                  ? "Try another area, or clear the filters."
                  : "Listings appear here once CarePaws has verified them."
              }
              action={
                (search || only24) && (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setSearch("");
                      setOnly24(false);
                    }}
                  >
                    Clear filters
                  </Button>
                )
              }
            />
          ) : (
            results!.map(({ org, km }, i) => <OrgCard key={org.uid} org={org} km={km} emergency={emergency && i === 0} />)
          )}
        </div>

        {!isOrg && (
          <div className="mt-8 rounded-[var(--radius-card)] bg-moss-tint p-5">
            <p className="font-semibold text-bark">Run a rescue, shelter or clinic?</p>
            <p className="mt-1 text-sm text-bark-soft">
              List it free so people nearby can call you, and vouch for sitters you trust. We verify every listing.
            </p>
            <Link href="/auth/?mode=signup" className="mt-3 inline-block text-sm font-semibold text-moss">
              Create a listing
            </Link>
          </div>
        )}
      </main>
    </>
  );
}

export default function NearbyPage() {
  return (
    <Suspense>
      <Nearby />
    </Suspense>
  );
}
