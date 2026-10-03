"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarHeart, ClipboardCheck, CreditCard, MessageCircle, NotebookPen } from "lucide-react";
import {
  acceptBooking,
  addReview,
  getContact,
  getReviewedBookingIds,
  getSitter,
  openConversation,
  setBookingStatus,
  subscribeBookings,
} from "@/lib/db";
import { payForBooking } from "@/lib/payments";
import type { Booking, BookingStatus, UserProfile } from "@/lib/types";
import { PET_EMOJI } from "@/lib/constants";
import { formatINR, formatRange, todayISO } from "@/lib/format";
import { cn } from "@/lib/cn";
import Avatar from "@/components/Avatar";
import { CareSheetView, DeclarationsView } from "@/components/CareSheetView";
import RequireAuth from "@/components/RequireAuth";
import StarRating from "@/components/StarRating";
import { AppBar, Button, EmptyState, Sheet, Skeleton, Tag, TextArea, useToast } from "@/components/ui";

type Tab = "requests" | "upcoming" | "past";

function statusTag(b: Booking, today: string) {
  if (b.status === "pending") return <Tag tone="honey">Awaiting sitter</Tag>;
  if (b.status === "declined") return <Tag tone="ember">Declined</Tag>;
  if (b.status === "cancelled") return <Tag>Cancelled</Tag>;
  if (b.status === "completed") return <Tag tone="moss">Completed</Tag>;
  if (b.paymentStatus !== "paid") return <Tag tone="clay">Awaiting payment</Tag>;
  if (b.startDate <= today && b.endDate >= today) return <Tag tone="river">In progress</Tag>;
  return <Tag tone="moss">Confirmed · Paid</Tag>;
}

function bucket(b: Booking, today: string): Tab {
  if (b.status === "pending") return "requests";
  if (b.status === "confirmed" && b.endDate >= today) return "upcoming";
  if (b.status === "confirmed" && b.paymentStatus === "paid") return "upcoming"; // awaiting completion
  return "past";
}

function BookingCard({
  b,
  me,
  reviewed,
  onReview,
  onOpen,
}: {
  b: Booking;
  me: UserProfile;
  reviewed: boolean;
  onReview: (b: Booking) => void;
  /** Opens the care sheet and declarations. */
  onOpen: (b: Booking) => void;
}) {
  const toast = useToast();
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const today = todayISO();
  const isSitter = me.uid === b.sitterId;
  const other = isSitter ? { name: b.parentName, photo: b.parentPhoto } : { name: b.sitterName, photo: b.sitterPhoto };

  async function act(label: string, fn: () => Promise<unknown>, done?: string) {
    setBusy(label);
    try {
      await fn();
      if (done) toast(done);
    } catch (e) {
      console.error(e);
      toast((e as Error).message || "That didn't work. Try again.", "error");
    } finally {
      setBusy(null);
    }
  }

  const status = (s: BookingStatus, msg: string) => act(s, () => setBookingStatus(b.id, s), msg);

  async function pay() {
    await act("pay", async () => {
      const contact = await getContact(me.uid).catch(() => null);
      const ok = await payForBooking(b, me, contact?.email);
      if (ok) toast("Payment received. You're all set.");
    });
  }

  async function chat() {
    await act("chat", async () => {
      const sitter = isSitter ? me : await getSitter(b.sitterId);
      const parent: UserProfile = isSitter
        ? { uid: b.parentId, displayName: b.parentName, photoURL: b.parentPhoto, role: "parent", onboarded: true }
        : me;
      if (!sitter) throw new Error("Sitter not found");
      const id = await openConversation(parent, sitter);
      router.push(`/inbox/chat/?id=${id}`);
    });
  }

  const unpaid = b.paymentStatus !== "paid";
  const canComplete = isSitter && b.status === "confirmed" && !unpaid && b.endDate <= today;

  return (
    <article className="animate-rise rounded-[var(--radius-card)] border border-oat-deep/60 bg-paper p-4 shadow-soft">
      <div className="flex items-start gap-3">
        <div className="relative">
          <Avatar src={other.photo} name={other.name} size="md" />
          <span className="absolute -right-1 -bottom-1 flex h-6 w-6 items-center justify-center rounded-full bg-paper text-sm shadow-soft">
            {PET_EMOJI[b.petType] ?? "🐾"}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-bark">
            {b.petName} <span className="font-normal text-bark-soft">{isSitter ? "from" : "with"}</span> {other.name}
          </p>
          <p className="text-sm text-bark-soft">
            {formatRange(b.startDate, b.endDate)} · {b.nights} night{b.nights === 1 ? "" : "s"}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {statusTag(b, today)}
            <span className="text-sm font-semibold text-bark">{formatINR(b.totalPrice)}</span>
          </div>
        </div>
      </div>

      {(b.notes || (isSitter && b.petNotes)) && b.status !== "cancelled" && (
        <div className="mt-3 rounded-2xl bg-oat/60 p-3 text-sm text-bark-soft">
          {isSitter && b.petNotes && (
            <p>
              <span className="font-semibold text-bark">Care notes: </span>
              {b.petNotes}
            </p>
          )}
          {b.notes && (
            <p className={cn(isSitter && b.petNotes && "mt-1")}>
              <span className="font-semibold text-bark">Note: </span>
              {b.notes}
            </p>
          )}
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {isSitter && b.status === "pending" && (
          <>
            <Button size="sm" onClick={() => onOpen(b)}>
              <ClipboardCheck className="h-4 w-4" /> Review & accept
            </Button>
            <Button size="sm" variant="secondary" onClick={() => status("declined", "Request declined.")} loading={busy === "declined"}>
              Decline
            </Button>
          </>
        )}
        {!isSitter && b.status === "confirmed" && unpaid && (
          <Button size="sm" variant="clay" onClick={pay} loading={busy === "pay"}>
            <CreditCard className="h-4 w-4" /> Pay {formatINR(b.totalPrice)}
          </Button>
        )}
        {((!isSitter && b.status === "pending") || (b.status === "confirmed" && unpaid)) && (
          <Button size="sm" variant="ghost" onClick={() => status("cancelled", "Stay cancelled.")} loading={busy === "cancelled"}>
            Cancel
          </Button>
        )}
        {canComplete && (
          <Button size="sm" onClick={() => status("completed", "Marked complete. Thank you!")} loading={busy === "completed"}>
            Mark stay complete
          </Button>
        )}
        {!isSitter && b.status === "completed" && !reviewed && (
          <Button size="sm" variant="secondary" onClick={() => onReview(b)}>
            <NotebookPen className="h-4 w-4" /> Review
          </Button>
        )}
        {b.status !== "pending" && b.declarations && (
          <Button size="sm" variant="ghost" onClick={() => onOpen(b)}>
            <ClipboardCheck className="h-4 w-4" /> Care sheet
          </Button>
        )}
        {b.status !== "cancelled" && b.status !== "declined" && (
          <Button size="sm" variant="ghost" onClick={chat} loading={busy === "chat"} className="ml-auto">
            <MessageCircle className="h-4 w-4" /> Message
          </Button>
        )}
      </div>
    </article>
  );
}

function Bookings({ profile }: { profile: UserProfile }) {
  const toast = useToast();
  const isSitter = profile.role === "sitter";
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [reviewed, setReviewed] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState<Tab>(isSitter ? "requests" : "upcoming");
  const [reviewing, setReviewing] = useState<Booking | null>(null);
  const [viewing, setViewing] = useState<Booking | null>(null);
  const [deciding, setDeciding] = useState<"accept" | "decline" | null>(null);
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    return subscribeBookings(profile.uid, isSitter ? "sitterId" : "parentId", setBookings, () => setBookings([]));
  }, [profile.uid, isSitter]);

  useEffect(() => {
    if (!isSitter) getReviewedBookingIds(profile.uid).then(setReviewed).catch(() => {});
  }, [profile.uid, isSitter]);

  const today = todayISO();
  const grouped = useMemo(() => {
    const g: Record<Tab, Booking[]> = { requests: [], upcoming: [], past: [] };
    for (const b of bookings ?? []) g[bucket(b, today)].push(b);
    g.upcoming.sort((a, b) => a.startDate.localeCompare(b.startDate));
    return g;
  }, [bookings, today]);

  const tabs: { id: Tab; label: string }[] = [
    { id: "requests", label: isSitter ? "Requests" : "Pending" },
    { id: "upcoming", label: "Upcoming" },
    { id: "past", label: "Past" },
  ];

  async function submitReview() {
    if (!reviewing) return;
    setSaving(true);
    try {
      await addReview(reviewing, profile, rating, text.trim());
      setReviewed((s) => new Set(s).add(reviewing.id));
      setReviewing(null);
      setText("");
      toast("Thanks for your review.");
    } catch {
      toast("Couldn't post the review.", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-20 bg-linen/95 px-5 pt-3 pb-3 backdrop-blur-md">
        <div className="flex rounded-full bg-oat p-1" role="tablist">
          {tabs.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex-1 rounded-full py-2 text-sm font-semibold transition",
                tab === t.id ? "bg-paper text-bark shadow-soft" : "text-bark-soft"
              )}
            >
              {t.label}
              {grouped[t.id].length > 0 && t.id !== "past" && (
                <span className="ml-1.5 rounded-full bg-moss-tint px-1.5 text-xs text-moss">{grouped[t.id].length}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <main className="space-y-3 px-5 pb-6">
        {bookings === null ? (
          Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-36" />)
        ) : grouped[tab].length === 0 ? (
          <EmptyState
            icon={<CalendarHeart className="h-7 w-7" />}
            title={tab === "requests" ? "No open requests" : tab === "upcoming" ? "Nothing coming up" : "No past stays yet"}
            body={isSitter ? "New stay requests will appear here." : "When you book a sitter, your stays show up here."}
            action={
              !isSitter && (
                <Link href="/sitters/" className="inline-flex h-11 items-center rounded-full bg-moss px-5 text-sm font-semibold text-on-moss">
                  Find a sitter
                </Link>
              )
            }
          />
        ) : (
          grouped[tab].map((b) => <BookingCard key={b.id} b={b} me={profile} reviewed={reviewed.has(b.id)} onReview={setReviewing} onOpen={setViewing} />)
        )}
      </main>

      <Sheet open={!!viewing} onClose={() => setViewing(null)} title={viewing?.status === "pending" && isSitter ? "Review before accepting" : "Care sheet & declarations"}>
        {viewing && (
          <>
            <p className="mb-4 text-sm text-bark-soft">
              {viewing.petName} · {formatRange(viewing.startDate, viewing.endDate)} · {viewing.careLocation === "parent_home" ? `at ${viewing.parentName}’s home` : `at ${viewing.sitterName}’s home`}
            </p>
            <h3 className="mb-1 font-display text-lg text-bark">Care sheet</h3>
            <div className="mb-5 rounded-2xl bg-paper px-4 py-1 shadow-soft">
              <CareSheetView care={viewing.petCare} notes={viewing.petNotes} />
            </div>
            {viewing.notes && (
              <p className="mb-5 rounded-2xl bg-oat/60 p-3 text-sm text-bark-soft">
                <span className="font-semibold text-bark">Note from {viewing.parentName}: </span>
                {viewing.notes}
              </p>
            )}
            <h3 className="mb-2 font-display text-lg text-bark">{viewing.parentName}’s declarations</h3>
            <DeclarationsView booking={viewing} showContact={!(isSitter && viewing.status === "pending")} />
            {isSitter && viewing.status === "pending" && (
              <div className="mt-5 space-y-3">
                <p className="text-xs text-bark-soft">
                  By accepting you confirm you’ve read this and are comfortable caring for {viewing.petName}. It’s saved on the booking.
                </p>
                <Button
                  block
                  size="lg"
                  loading={deciding === "accept"}
                  disabled={!!deciding}
                  onClick={async () => {
                    setDeciding("accept");
                    try {
                      await acceptBooking(viewing.id);
                      setViewing(null);
                      toast("Accepted. We’ve asked them to pay.");
                    } catch {
                      toast("Couldn’t accept. Try again.", "error");
                    } finally {
                      setDeciding(null);
                    }
                  }}
                >
                  I’ve reviewed this. Accept
                </Button>
                <Button
                  block
                  variant="secondary"
                  loading={deciding === "decline"}
                  disabled={!!deciding}
                  onClick={async () => {
                    setDeciding("decline");
                    try {
                      await setBookingStatus(viewing.id, "declined");
                      setViewing(null);
                      toast("Request declined.");
                    } catch {
                      toast("Couldn’t decline. Try again.", "error");
                    } finally {
                      setDeciding(null);
                    }
                  }}
                >
                  Decline
                </Button>
              </div>
            )}
          </>
        )}
      </Sheet>

      <Sheet open={!!reviewing} onClose={() => setReviewing(null)} title={`How was ${reviewing?.sitterName.split(" ")[0]}?`}>
        <div className="flex justify-center py-2">
          <StarRating rating={rating} size={30} onChange={setRating} />
        </div>
        <TextArea
          value={text}
          onChange={(e) => setText(e.target.value)}
          minLength={10}
          maxLength={1000}
          placeholder={`What was ${reviewing?.petName}'s stay like?`}
          className="mt-3"
        />
        <Button block className="mt-4" onClick={submitReview} loading={saving} disabled={text.trim().length < 10}>
          Post review
        </Button>
      </Sheet>
    </>
  );
}

export default function BookingsPage() {
  return (
    <>
      <AppBar title="Your stays" />
      <RequireAuth message="Sign in to see your stays.">{(p) => <Bookings profile={p} />}</RequireAuth>
    </>
  );
}
