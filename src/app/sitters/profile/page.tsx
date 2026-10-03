"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BadgeCheck, Clock, MapPin, MessageCircle, Reply, ThumbsUp, UserX } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { getReviews, getSitter, openConversation, respondToReview, toggleReviewHelpful } from "@/lib/db";
import type { Review, SitterProfile } from "@/lib/types";
import { PET_EMOJI, WEEKDAYS } from "@/lib/constants";
import { formatINR, timeAgo } from "@/lib/format";
import { cn } from "@/lib/cn";
import Avatar from "@/components/Avatar";
import StarRating from "@/components/StarRating";
import { AppBar, Button, EmptyState, FullScreenLoader, Tag, TextArea, useToast } from "@/components/ui";

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex-1 text-center">
      <p className="font-display text-xl text-bark">{value}</p>
      <p className="text-xs text-bark-soft">{label}</p>
    </div>
  );
}

function ReviewItem({ review, sitterId, onChange }: { review: Review; sitterId: string; onChange: (r: Review) => void }) {
  const { profile } = useAuth();
  const toast = useToast();
  const [replying, setReplying] = useState(false);
  const [reply, setReply] = useState("");
  const helpful = profile ? review.helpfulBy?.includes(profile.uid) : false;
  const isOwnSitter = profile?.uid === sitterId;

  async function toggleHelpful() {
    if (!profile) return toast("Sign in to vote on reviews.");
    if (review.authorId === profile.uid) return;
    const helpfulBy = helpful ? review.helpfulBy.filter((x) => x !== profile.uid) : [...(review.helpfulBy ?? []), profile.uid];
    onChange({ ...review, helpfulBy });
    await toggleReviewHelpful(review, profile.uid).catch(() => onChange(review));
  }

  async function sendReply() {
    const text = reply.trim();
    if (!text) return;
    await respondToReview(review.id, text);
    onChange({ ...review, response: text, responseAt: new Date().toISOString() });
    setReplying(false);
  }

  return (
    <li className="border-b border-oat-deep/60 py-4 last:border-0">
      <div className="flex items-center gap-3">
        <Avatar src={review.authorPhoto} name={review.author} size="sm" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-bark">{review.author}</p>
          <p className="text-xs text-stone">
            {PET_EMOJI[review.petType] ?? "🐾"} {review.petType} · {timeAgo(review.createdAt)}
          </p>
        </div>
        <StarRating rating={review.rating} size={12} />
      </div>
      <p className="mt-2 text-[15px] leading-relaxed text-bark-soft">{review.text}</p>
      {review.response && (
        <div className="mt-3 rounded-2xl bg-oat/70 p-3 text-sm">
          <p className="mb-1 font-semibold text-bark">Sitter’s reply</p>
          <p className="text-bark-soft">{review.response}</p>
        </div>
      )}
      <div className="mt-2 flex items-center gap-4">
        <button
          onClick={toggleHelpful}
          className={cn("inline-flex items-center gap-1.5 py-1 text-xs font-semibold", helpful ? "text-moss" : "text-stone")}
        >
          <ThumbsUp className={cn("h-3.5 w-3.5", helpful && "fill-current")} />
          Helpful{review.helpfulBy?.length ? ` · ${review.helpfulBy.length}` : ""}
        </button>
        {isOwnSitter && !review.response && (
          <button onClick={() => setReplying((v) => !v)} className="inline-flex items-center gap-1.5 py-1 text-xs font-semibold text-moss">
            <Reply className="h-3.5 w-3.5" /> Reply
          </button>
        )}
      </div>
      {replying && (
        <div className="mt-2 space-y-2">
          <TextArea value={reply} onChange={(e) => setReply(e.target.value)} maxLength={600} placeholder="Thank them, or add context…" />
          <Button size="sm" onClick={sendReply} disabled={!reply.trim()}>
            Post reply
          </Button>
        </div>
      )}
    </li>
  );
}

function SitterProfileScreen() {
  const id = useSearchParams().get("id") || "";
  const { profile } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [sitter, setSitter] = useState<SitterProfile | null | undefined>(undefined);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    if (!id) return;
    getSitter(id).then(setSitter).catch(() => setSitter(null));
    getReviews(id).then(setReviews).catch(() => {});
  }, [id]);

  if (id && sitter === undefined) return <FullScreenLoader />;
  if (!sitter)
    return (
      <>
        <AppBar back />
        <EmptyState icon={<UserX className="h-7 w-7" />} title="Sitter not found" body="This profile may have been removed." />
      </>
    );

  const isSelf = profile?.uid === sitter.uid;
  const canBook = !profile || profile.role === "parent";

  async function message() {
    if (!profile) return router.push(`/auth/?next=${encodeURIComponent(`/sitters/profile/?id=${id}`)}`);
    if (profile.role !== "parent") return toast("Only pet parents can message sitters.");
    setOpening(true);
    try {
      const cid = await openConversation(profile, sitter!);
      router.push(`/inbox/chat/?id=${cid}`);
    } catch {
      toast("Couldn't open the chat. Try again.", "error");
    } finally {
      setOpening(false);
    }
  }

  return (
    <>
      <AppBar back />
      <main className="pb-32">
        <section className="flex flex-col items-center px-5 pt-2 text-center">
          <Avatar src={sitter.photoURL} name={sitter.displayName} size="xl" className="shadow-lift" />
          <h1 className="mt-4 flex items-center gap-1.5 font-display text-[26px] text-bark">
            {sitter.displayName}
            {sitter.verified && <BadgeCheck className="h-5 w-5 text-moss" aria-label="Verified" />}
          </h1>
          <p className="mt-1 flex items-center gap-1 text-sm text-bark-soft">
            <MapPin className="h-4 w-4" /> {sitter.location}
          </p>
          <div className="mt-3 flex flex-wrap justify-center gap-1.5">
            {sitter.topRated && <Tag tone="moss">Top rated</Tag>}
            {sitter.verified ? <Tag tone="river">ID verified</Tag> : <Tag>Not yet verified</Tag>}
          </div>
        </section>

        <section className="mx-5 mt-6 flex divide-x divide-oat-deep rounded-[var(--radius-card)] bg-paper py-4 shadow-soft">
          <Stat value={(sitter.reviewCount ?? 0) > 0 ? (sitter.rating ?? 0).toFixed(1) : "—"} label={`${sitter.reviewCount ?? 0} reviews`} />
          <Stat value={sitter.experience || "—"} label="experience" />
          <Stat value={String(sitter.completedStays ?? 0)} label="stays done" />
        </section>

        {sitter.bio && (
          <section className="px-5 pt-7">
            <h2 className="mb-2 font-display text-lg text-bark">About</h2>
            <p className="leading-relaxed text-bark-soft">{sitter.bio}</p>
          </section>
        )}

        <section className="px-5 pt-7">
          <h2 className="mb-3 font-display text-lg text-bark">Cares for</h2>
          <div className="flex flex-wrap gap-2">
            {sitter.petTypes?.map((p) => (
              <span key={p} className="inline-flex items-center gap-1.5 rounded-full bg-paper px-3 py-2 text-sm font-medium text-bark shadow-soft">
                <span aria-hidden>{PET_EMOJI[p]}</span> {p}
              </span>
            ))}
          </div>
        </section>

        <section className="px-5 pt-7">
          <h2 className="mb-3 font-display text-lg text-bark">Services</h2>
          <ul className="grid grid-cols-2 gap-2">
            {sitter.services?.map((s) => (
              <li key={s} className="rounded-2xl bg-moss-tint/70 px-3 py-2.5 text-sm font-medium text-moss">
                {s}
              </li>
            ))}
          </ul>
        </section>

        <section className="px-5 pt-7">
          <h2 className="mb-3 font-display text-lg text-bark">Availability</h2>
          <div className="flex justify-between">
            {WEEKDAYS.map((d) => {
              const on = sitter.availability?.includes(d);
              return (
                <span
                  key={d}
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full text-xs font-semibold",
                    on ? "bg-moss text-on-moss" : "bg-oat text-stone line-through"
                  )}
                >
                  {d.slice(0, 2)}
                </span>
              );
            })}
          </div>
          {sitter.responseTime && (
            <p className="mt-3 flex items-center gap-1.5 text-sm text-bark-soft">
              <Clock className="h-4 w-4" /> Usually replies {sitter.responseTime.toLowerCase()}
            </p>
          )}
        </section>

        <section className="px-5 pt-7">
          <h2 className="mb-1 font-display text-lg text-bark">Reviews</h2>
          {reviews.length === 0 ? (
            <p className="py-4 text-sm text-bark-soft">No reviews yet. Reviews come only from completed stays.</p>
          ) : (
            <ul>
              {reviews.map((r) => (
                <ReviewItem key={r.id} review={r} sitterId={sitter.uid} onChange={(n) => setReviews((all) => all.map((x) => (x.id === n.id ? n : x)))} />
              ))}
            </ul>
          )}
        </section>
      </main>

      <div className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-oat-deep/60 bg-paper/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg items-center gap-3 px-5 py-3">
          <div className="flex-1">
            <p className="font-display text-xl text-bark">{formatINR(sitter.pricePerNight)}</p>
            <p className="text-xs text-stone">per night</p>
          </div>
          {isSelf ? (
            <Link href="/dashboard/" className="inline-flex h-12 items-center rounded-full bg-moss px-6 font-semibold text-on-moss">
              Edit profile
            </Link>
          ) : (
            canBook && (
              <>
                <Button variant="secondary" onClick={message} loading={opening} aria-label="Message" className="w-12 !px-0">
                  {!opening && <MessageCircle className="h-5 w-5" />}
                </Button>
                <Link
                  href={`/booking/?sitter=${sitter.uid}`}
                  className="inline-flex h-12 items-center rounded-full bg-moss px-6 font-semibold text-on-moss shadow-soft"
                >
                  Request a stay
                </Link>
              </>
            )
          )}
        </div>
      </div>
    </>
  );
}

export default function SitterProfilePage() {
  return (
    <Suspense fallback={<FullScreenLoader />}>
      <SitterProfileScreen />
    </Suspense>
  );
}
