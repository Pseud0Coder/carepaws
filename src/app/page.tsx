"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, CalendarHeart, PawPrint, Search, ShieldCheck, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { getPosts, getSitters, subscribeBookings } from "@/lib/db";
import type { Booking, CommunityPost, SitterProfile } from "@/lib/types";
import { PET_EMOJI, PET_TYPES } from "@/lib/constants";
import { firstName, formatRange, greeting, todayISO } from "@/lib/format";
import Avatar from "@/components/Avatar";
import { SitterTile } from "@/components/SitterCard";
import { SectionTitle, Skeleton } from "@/components/ui";

export default function Discover() {
  const { profile, loading } = useAuth();
  const [sitters, setSitters] = useState<SitterProfile[] | null>(null);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [nextStay, setNextStay] = useState<Booking | null>(null);

  useEffect(() => {
    getSitters({ sortBy: "rating" }).then(setSitters).catch(() => setSitters([]));
    getPosts().then((p) => setPosts(p.slice(0, 2))).catch(() => {});
  }, []);

  useEffect(() => {
    if (!profile?.role) return;
    const field = profile.role === "sitter" ? "sitterId" : "parentId";
    return subscribeBookings(profile.uid, field, (all) => {
      const today = todayISO();
      const upcoming = all
        .filter((b) => (b.status === "confirmed" || b.status === "pending") && b.endDate >= today)
        .sort((a, b) => a.startDate.localeCompare(b.startDate));
      setNextStay(upcoming[0] ?? null);
    });
  }, [profile?.uid, profile?.role]);

  return (
    <main className="pt-safe">
      <header className="flex items-center justify-between px-5 pt-5">
        <div>
          <p className="text-sm font-medium text-bark-soft">{profile ? greeting() : "Welcome to"}</p>
          <h1 className="font-display text-[28px] leading-tight text-bark">
            {profile ? firstName(profile.displayName) : "CarePaws"}
          </h1>
        </div>
        {profile ? (
          <Link href="/dashboard/" aria-label="Your profile">
            <Avatar src={profile.photoURL} name={profile.displayName} size="md" />
          </Link>
        ) : (
          !loading && (
            <Link href="/auth/" className="rounded-full bg-moss px-5 py-2.5 text-sm font-semibold text-on-moss">
              Sign in
            </Link>
          )
        )}
      </header>

      <div className="px-5 pt-5">
        <Link
          href="/sitters/"
          className="flex h-14 items-center gap-3 rounded-full border border-oat-deep bg-paper px-5 text-stone shadow-soft"
        >
          <Search className="h-5 w-5" />
          <span>Search sitters by name or area</span>
        </Link>
      </div>

      {/* Hero for new visitors, next stay for members */}
      <section className="px-5 pt-6">
        {nextStay ? (
          <Link
            href="/bookings/"
            className="block overflow-hidden rounded-[28px] bg-moss p-5 text-on-moss shadow-lift"
          >
            <p className="flex items-center gap-2 text-sm font-semibold opacity-80">
              <CalendarHeart className="h-4 w-4" />
              {nextStay.status === "pending" ? "Awaiting reply" : "Next stay"}
            </p>
            <p className="mt-3 font-display text-2xl">
              {nextStay.petName} with {profile?.role === "sitter" ? nextStay.parentName : nextStay.sitterName}
            </p>
            <p className="mt-1 opacity-80">{formatRange(nextStay.startDate, nextStay.endDate)}</p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold">
              View stay <ArrowRight className="h-4 w-4" />
            </span>
          </Link>
        ) : (
          <div className="relative overflow-hidden rounded-[28px] bg-moss p-6 text-on-moss shadow-lift">
            <svg className="absolute -right-8 -bottom-10 h-44 w-44 opacity-15" viewBox="0 0 100 100" aria-hidden>
              <path fill="currentColor" d="M50 8C27 8 10 30 10 55s18 37 40 37 40-12 40-37S73 8 50 8z" />
            </svg>
            <p className="flex items-center gap-2 text-sm font-semibold opacity-85">
              <ShieldCheck className="h-4 w-4" /> Verified, reviewed, local
            </p>
            <h2 className="mt-3 max-w-[15rem] font-display text-[26px] leading-tight">Care that feels like home, while you’re away.</h2>
            <Link
              href={profile ? "/sitters/" : "/auth/?mode=signup"}
              className="mt-5 inline-flex h-11 items-center gap-2 rounded-full bg-linen px-5 text-sm font-semibold text-moss"
            >
              {profile ? "Find a sitter" : "Get started"} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}
      </section>

      <section className="pt-7">
        <div className="px-5">
          <SectionTitle>Who needs care?</SectionTitle>
        </div>
        <div className="no-scrollbar flex gap-3 overflow-x-auto px-5 pb-1">
          {PET_TYPES.map((t) => (
            <Link
              key={t}
              href={`/sitters/?pet=${encodeURIComponent(t)}`}
              className="flex w-20 shrink-0 flex-col items-center gap-2 rounded-2xl bg-paper py-3 shadow-soft active:bg-oat"
            >
              <span className="text-2xl" aria-hidden>
                {PET_EMOJI[t]}
              </span>
              <span className="text-xs font-semibold text-bark-soft">{t}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="pt-7">
        <div className="px-5">
          <SectionTitle
            action={
              <Link href="/sitters/" className="text-sm font-semibold text-moss">
                See all
              </Link>
            }
          >
            Loved by pet parents
          </SectionTitle>
        </div>
        <div className="no-scrollbar flex gap-3 overflow-x-auto px-5 pb-2">
          {sitters === null
            ? Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-48 w-40 shrink-0" />)
            : sitters.slice(0, 8).map((s) => <SitterTile key={s.uid} sitter={s} />)}
          {sitters?.length === 0 && (
            <p className="py-6 text-sm text-bark-soft">No sitters yet. Check back soon.</p>
          )}
        </div>
      </section>

      {posts.length > 0 && (
        <section className="px-5 pt-7">
          <SectionTitle
            action={
              <Link href="/community/" className="text-sm font-semibold text-moss">
                Open Circle
              </Link>
            }
          >
            From the Circle
          </SectionTitle>
          <div className="space-y-3">
            {posts.map((p) => (
              <Link
                key={p.id}
                href={`/community/post/?id=${p.id}`}
                className="block rounded-[var(--radius-card)] border border-oat-deep/60 bg-paper p-4 shadow-soft"
              >
                <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-clay uppercase">
                  <Sparkles className="h-3.5 w-3.5" /> {p.category}
                </p>
                <p className="mt-1.5 font-semibold text-bark">{p.title}</p>
                <p className="mt-1 line-clamp-2 text-sm text-bark-soft">{p.text}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {profile?.role !== "sitter" && (
        <section className="px-5 pt-7 pb-4">
          <div className="flex items-center gap-4 rounded-[var(--radius-card)] bg-clay-tint p-5">
            <PawPrint className="h-8 w-8 shrink-0 text-clay" />
            <div className="flex-1">
              <p className="font-semibold text-bark">Love animals?</p>
              <p className="text-sm text-bark-soft">Sit for neighbours and earn on your terms.</p>
            </div>
            {!profile && (
              <Link href="/auth/?mode=signup" className="text-sm font-semibold text-clay">
                Join
              </Link>
            )}
          </div>
        </section>
      )}
    </main>
  );
}
