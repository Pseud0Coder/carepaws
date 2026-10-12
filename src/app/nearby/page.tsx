"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { LocateFixed, MapPinOff, Search, Siren, X } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { getOrgs } from "@/lib/db";
import { distanceKm, getPosition, loadSavedPosition, savePosition, type Coords } from "@/lib/geo";
import { areaCentre, HYD_CITY, inHyderabad } from "@/lib/hyderabad";
import { findNearbyVets, type VetPlace } from "@/lib/places";
import type { OrgProfile, OrgRole } from "@/lib/types";
import { cn } from "@/lib/cn";
import AreaSelect from "@/components/AreaSelect";
import OrgCard from "@/components/OrgCard";
import PlaceVetCard from "@/components/PlaceVetCard";
import { AppBar, Button, Chip, EmptyState, Skeleton } from "@/components/ui";

const TYPES: { id: OrgRole; label: string }[] = [
  { id: "vet", label: "Vets & clinics" },
  { id: "rescue", label: "Rescues & shelters" },
];

function Nearby() {
  const params = useSearchParams();
  const { profile } = useAuth();
  const emergency = params.get("emergency") === "1";
  const [type, setType] = useState<OrgRole>(params.get("type") === "rescue" && !emergency ? "rescue" : "vet");
  const [lists, setLists] = useState<Partial<Record<OrgRole, OrgProfile[]>>>({});
  const [failed, setFailed] = useState(false);
  const [search, setSearch] = useState("");
  const [openNow, setOpenNow] = useState(emergency);
  // Read once on the client; null on the server render, which is fine since this page is client-only data.
  const [pos, setPos] = useState<Coords | null>(() => (typeof window === "undefined" ? null : loadSavedPosition()));
  const [area, setArea] = useState(profile?.area ?? "");
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState("");
  const [vets, setVets] = useState<VetPlace[] | null>(null);
  const [vetError, setVetError] = useState("");

  // Where to search: the device location if it is in Hyderabad, otherwise the chosen neighbourhood.
  const searchAt: Coords | null = useMemo(() => {
    if (pos && inHyderabad(pos.lat, pos.lng)) return pos;
    const a = areaCentre(area);
    return a ? { lat: a.lat, lng: a.lng } : null;
  }, [pos, area]);
  const outside = !!pos && !inHyderabad(pos.lat, pos.lng);
  const searchKey = searchAt ? `${searchAt.lat.toFixed(3)},${searchAt.lng.toFixed(3)}` : "";

  useEffect(() => {
    if (lists[type]) return;
    getOrgs(type)
      .then((o) => setLists((l) => ({ ...l, [type]: o })))
      .catch(() => setFailed(true));
  }, [type, lists]);

  // Closest vets and clinics from Google Maps. Re-runs when the search point moves.
  const lastKey = useRef("");
  useEffect(() => {
    if (type !== "vet" || !searchAt || lastKey.current === searchKey) return;
    lastKey.current = searchKey;
    let live = true;
    setVets(null);
    setVetError("");
    findNearbyVets(searchAt)
      .then((v) => live && setVets(v))
      .catch((e: Error) => {
        if (!live) return;
        lastKey.current = ""; // let a retry run
        setVetError(e.message);
        setVets([]);
      });
    return () => {
      live = false;
    };
  }, [type, searchAt, searchKey]);

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

  // In an emergency, don't wait to be asked.
  const asked = useRef(false);
  useEffect(() => {
    if (emergency && !pos && !asked.current) {
      asked.current = true;
      void locate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emergency]);

  const googleRows = useMemo(() => {
    if (!vets) return null;
    const s = search.trim().toLowerCase();
    const rows = vets.filter((v) => (!s || [v.name, v.address].some((f) => f.toLowerCase().includes(s))) && (!openNow || v.openNow === true));
    if (emergency) rows.sort((a, b) => Number(b.openNow === true) - Number(a.openNow === true) || a.distanceKm - b.distanceKm);
    return rows;
  }, [vets, search, openNow, emergency]);

  const orgRows = useMemo(() => {
    const all = lists[type];
    if (!all) return null;
    const s = search.trim().toLowerCase();
    const rows = all
      .filter((o) => !s || [o.displayName, o.location, o.address].some((f) => f?.toLowerCase().includes(s)))
      .map((o) => ({
        org: o,
        km: searchAt && typeof o.lat === "number" && typeof o.lng === "number" ? distanceKm(searchAt, { lat: o.lat, lng: o.lng }) : undefined,
      }));
    rows.sort((a, b) => {
      if (emergency && !!a.org.open24x7 !== !!b.org.open24x7) return a.org.open24x7 ? -1 : 1;
      if (a.km !== undefined && b.km !== undefined) return a.km - b.km;
      if (a.km !== undefined) return -1;
      if (b.km !== undefined) return 1;
      return a.org.displayName.localeCompare(b.org.displayName);
    });
    return rows;
  }, [lists, type, search, searchAt, emergency]);

  const isOrg = profile?.role === "rescue" || profile?.role === "vet";

  return (
    <>
      <AppBar title={emergency ? "Emergency vets" : "Nearby help"} back={emergency ? "/" : undefined} />
      <main className="px-5 pb-6">
        {emergency && (
          <div className="mt-4 flex gap-3 rounded-[var(--radius-card)] bg-ember-tint p-4">
            <Siren className="h-6 w-6 shrink-0 text-ember" />
            <p className="text-sm text-bark">
              <span className="font-semibold">Call ahead</span> so the clinic can prepare for your arrival. Hours come from Google Maps and can be out of date.
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
          {pos && !outside ? (
            <Chip
              active
              onClick={() => {
                setPos(null);
                savePosition(null);
                lastKey.current = "";
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
            <Chip active={openNow} onClick={() => setOpenNow((v) => !v)}>
              Open now
            </Chip>
          )}
        </div>
        {locError && <p className="mt-2 text-sm text-ember">{locError}</p>}

        {/* Where to search from, when there's no usable device location. */}
        {!searchAt && (
          <div className="mt-4 rounded-[var(--radius-card)] bg-oat/60 p-4">
            <p className="text-sm font-semibold text-bark">
              {outside ? `You're outside ${HYD_CITY}.` : type === "vet" ? "Find the closest vets" : "Find help near you"}
            </p>
            <p className="mt-1 mb-3 text-sm text-bark-soft">
              {outside ? `CarePaws covers ${HYD_CITY} for now. Pick a neighbourhood to search there.` : "Use your location above, or choose your neighbourhood. Your location stays on your device."}
            </p>
            <AreaSelect value={area} onChange={setArea} label="Neighbourhood" hint="" />
          </div>
        )}

        {type === "vet" && searchAt && (
          <section className="mt-4 space-y-3" aria-label="Closest vets and clinics">
            {vets === null ? (
              Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-56" />)
            ) : vetError ? (
              <div className="rounded-[var(--radius-card)] bg-ember-tint p-4 text-sm text-bark">
                <p>{vetError}</p>
                <Button
                  variant="secondary"
                  size="sm"
                  className="mt-3"
                  onClick={() => {
                    lastKey.current = "";
                    setVets(null);
                    setVetError("");
                    findNearbyVets(searchAt)
                      .then((v) => setVets(v))
                      .catch((e: Error) => {
                        setVetError(e.message);
                        setVets([]);
                      });
                  }}
                >
                  Try again
                </Button>
              </div>
            ) : googleRows && googleRows.length === 0 ? (
              <EmptyState
                icon={<MapPinOff className="h-7 w-7" />}
                title={search || openNow ? "Nothing matches" : "No vets found nearby"}
                body={search || openNow ? "Try another name, or turn off “Open now”." : "Try another neighbourhood."}
                action={
                  (search || openNow) && (
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setSearch("");
                        setOpenNow(false);
                      }}
                    >
                      Clear filters
                    </Button>
                  )
                }
              />
            ) : (
              googleRows!.map((v, i) => <PlaceVetCard key={v.id} vet={v} emergency={emergency && i === 0 && v.openNow !== false} />)
            )}
            {vets && vets.length > 0 && (
              <p className="px-1 text-center text-[11px] text-stone">
                Ratings, hours, phone numbers and summaries come from <span className="font-semibold">Google Maps</span> and can be out of date.
              </p>
            )}
          </section>
        )}

        {/* Clinics and rescues that have joined CarePaws (verified by us, and able to vouch for sitters). */}
        {(type === "rescue" || (orgRows && orgRows.length > 0)) && (
          <section className="mt-6">
            {type === "vet" && <h2 className="mb-2 font-display text-lg text-bark">On CarePaws</h2>}
            <div className="space-y-3">
              {orgRows === null && !failed ? (
                Array.from({ length: 2 }, (_, i) => <Skeleton key={i} className="h-40" />)
              ) : failed ? (
                <p className="py-8 text-center text-sm text-ember">Couldn’t load listings. Check your connection.</p>
              ) : orgRows!.length === 0 ? (
                <EmptyState
                  icon={<MapPinOff className="h-7 w-7" />}
                  title={search ? "Nothing matches" : "No rescues listed yet"}
                  body={search ? "Try another name or area." : "Listings appear here once CarePaws has verified them."}
                />
              ) : (
                orgRows!.map(({ org, km }) => <OrgCard key={org.uid} org={org} km={km} />)
              )}
            </div>
          </section>
        )}

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
