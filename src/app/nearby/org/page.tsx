"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BadgeCheck, Clock, Globe, MapPin, SearchX, ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { getOrg, getSitter, getVouchesByOrg } from "@/lib/db";
import type { OrgProfile, SitterProfile, Vouch } from "@/lib/types";
import { PET_EMOJI } from "@/lib/constants";
import Avatar from "@/components/Avatar";
import { CallButton, DirectionsButton, OrgTypeTag } from "@/components/OrgCard";
import { sitterHref } from "@/components/SitterCard";
import { AppBar, EmptyState, FullScreenLoader, Tag } from "@/components/ui";

function OrgScreen() {
  const id = useSearchParams().get("id") || "";
  const { profile, loading } = useAuth();
  const [org, setOrg] = useState<OrgProfile | null | undefined>(undefined);
  const [vouches, setVouches] = useState<Vouch[]>([]);
  const [sitters, setSitters] = useState<Record<string, SitterProfile>>({});

  useEffect(() => {
    if (!id) return;
    getOrg(id).then(setOrg).catch(() => setOrg(null));
    getVouchesByOrg(id)
      .then(async (v) => {
        setVouches(v);
        const found = await Promise.all(v.map((x) => getSitter(x.sitterId).catch(() => null)));
        setSitters(Object.fromEntries(found.filter((s): s is SitterProfile => !!s).map((s) => [s.uid, s])));
      })
      .catch(() => {});
  }, [id]);

  if ((id && org === undefined) || loading) return <FullScreenLoader />;
  // Unverified listings are visible only to the organisation itself.
  if (!org || !org.onboarded || (org.verified !== true && profile?.uid !== org.uid))
    return (
      <>
        <AppBar back="/nearby/" />
        <EmptyState icon={<SearchX className="h-7 w-7" />} title="Listing not found" body="It may have been removed." />
      </>
    );

  const listed = org.verified === true;

  return (
    <>
      <AppBar back="/nearby/" />
      <main className="pb-32">
        <section className="flex flex-col items-center px-5 pt-2 text-center">
          <Avatar src={org.photoURL} name={org.displayName} size="xl" className="shadow-lift" />
          <h1 className="mt-4 flex items-center gap-1.5 font-display text-[26px] text-bark">
            {org.displayName}
            {listed && <BadgeCheck className="h-5 w-5 shrink-0 text-moss" aria-label="Verified" />}
          </h1>
          <p className="mt-1 flex items-center gap-1 text-sm text-bark-soft">
            <MapPin className="h-4 w-4" /> {org.location}
          </p>
          <div className="mt-3 flex flex-wrap justify-center gap-1.5">
            <OrgTypeTag type={org.role as "rescue" | "vet"} />
            {org.open24x7 && <Tag tone="ember">Open 24×7</Tag>}
            {listed ? <Tag tone="moss">Verified by CarePaws</Tag> : <Tag tone="honey">Pending verification</Tag>}
          </div>
        </section>

        <section className="mt-6 space-y-3 px-5">
          <div className="rounded-[var(--radius-card)] bg-paper p-4 shadow-soft">
            {org.address && (
              <p className="flex gap-3 text-[15px] text-bark">
                <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-moss" />
                <span>{org.address}</span>
              </p>
            )}
            {org.hours && (
              <p className="mt-3 flex gap-3 text-[15px] text-bark">
                <Clock className="mt-0.5 h-5 w-5 shrink-0 text-moss" />
                {org.hours}
              </p>
            )}
            {org.website && (
              <a
                href={org.website}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 flex gap-3 text-[15px] font-medium break-all text-moss"
              >
                <Globe className="mt-0.5 h-5 w-5 shrink-0" />
                {org.website.replace(/^https?:\/\//, "")}
              </a>
            )}
          </div>
        </section>

        {org.bio && (
          <section className="px-5 pt-7">
            <h2 className="mb-2 font-display text-lg text-bark">About</h2>
            <p className="leading-relaxed text-bark-soft">{org.bio}</p>
          </section>
        )}

        {!!org.services?.length && (
          <section className="px-5 pt-7">
            <h2 className="mb-3 font-display text-lg text-bark">{org.role === "vet" ? "What they offer" : "How they help"}</h2>
            <ul className="grid grid-cols-2 gap-2">
              {org.services.map((s) => (
                <li key={s} className="rounded-2xl bg-moss-tint/70 px-3 py-2.5 text-sm font-medium text-moss">
                  {s}
                </li>
              ))}
            </ul>
          </section>
        )}

        {!!org.petTypes?.length && (
          <section className="px-5 pt-7">
            <h2 className="mb-3 font-display text-lg text-bark">Animals they help</h2>
            <div className="flex flex-wrap gap-2">
              {org.petTypes.map((p) => (
                <span key={p} className="inline-flex items-center gap-1.5 rounded-full bg-paper px-3 py-2 text-sm font-medium text-bark shadow-soft">
                  <span aria-hidden>{PET_EMOJI[p]}</span> {p}
                </span>
              ))}
            </div>
          </section>
        )}

        {vouches.length > 0 && (
          <section className="px-5 pt-7">
            <h2 className="mb-1 flex items-center gap-2 font-display text-lg text-bark">
              <ShieldCheck className="h-5 w-5 text-moss" /> Sitters they vouch for
            </h2>
            <ul className="mt-3 divide-y divide-oat-deep/60 overflow-hidden rounded-[var(--radius-card)] bg-paper shadow-soft">
              {vouches.map((v) => {
                const s = sitters[v.sitterId];
                return s ? (
                  <li key={v.id}>
                    <Link href={sitterHref(s.uid)} className="flex items-center gap-3 px-4 py-3 active:bg-oat/60">
                      <Avatar src={s.photoURL} name={s.displayName} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold text-bark">{s.displayName}</span>
                        <span className="block truncate text-xs text-bark-soft">{s.location}</span>
                      </span>
                    </Link>
                  </li>
                ) : null;
              })}
            </ul>
          </section>
        )}
      </main>

      {org.phone && (
        <div className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-oat-deep/60 bg-paper/95 backdrop-blur-md">
          <div className="mx-auto flex max-w-lg items-center gap-3 px-5 py-3">
            <CallButton phone={org.phone} size="lg" label={`Call ${org.phone}`} className="flex-1" />
            <DirectionsButton org={org} iconOnly className="h-14" />
          </div>
        </div>
      )}
    </>
  );
}

export default function OrgPage() {
  return (
    <Suspense fallback={<FullScreenLoader />}>
      <OrgScreen />
    </Suspense>
  );
}
