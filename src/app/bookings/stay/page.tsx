"use client";

import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Camera, ClipboardCheck, ImagePlus, LifeBuoy, Lock, MapPinned, MessageCircle, Phone, Siren, X } from "lucide-react";
import { addStayLogEntry, getBooking, getStayPhotoUrl, subscribeStayLog } from "@/lib/db";
import { compressImage } from "@/lib/images";
import { telHref } from "@/lib/geo";
import { formatINR, formatRange } from "@/lib/format";
import type { Booking, StayLogEntry, StayLogKind, UserProfile } from "@/lib/types";
import { cn } from "@/lib/cn";
import Avatar from "@/components/Avatar";
import RequireAuth from "@/components/RequireAuth";
import { AppBar, Button, Chip, EmptyState, ErrorNote, FullScreenLoader, Sheet, Skeleton, Tag, TextArea, useToast } from "@/components/ui";

const KINDS: Record<StayLogKind, { label: string; tone: "moss" | "river" | "clay" | "ember"; hint: string }> = {
  update: { label: "Update", tone: "moss", hint: "How is the pet doing? Add a photo." },
  dropoff: { label: "Drop-off check", tone: "river", hint: "Note the pet’s condition on arrival, including any marks, limps or concerns. Add photos." },
  pickup: { label: "Pick-up check", tone: "river", hint: "Note the pet’s condition at pick-up. Add photos." },
  incident: { label: "Incident", tone: "ember", hint: "Describe what happened, when, and what you did. The other person is notified in the log." },
};

function StayPhoto({ path }: { path: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    getStayPhotoUrl(path).then((u) => live && setUrl(u)).catch(() => {});
    return () => {
      live = false;
    };
  }, [path]);
  return url ? (
    <a href={url} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-2xl bg-oat">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="Stay photo" className="aspect-square w-full object-cover" />
    </a>
  ) : (
    <Skeleton className="aspect-square w-full" />
  );
}

function Entry({ e, b }: { e: StayLogEntry; b: Booking }) {
  const mine = e.authorRole === "sitter";
  const name = mine ? b.sitterName : b.parentName;
  const photo = mine ? b.sitterPhoto : b.parentPhoto;
  const meta = KINDS[e.kind];
  return (
    <li className="rounded-[var(--radius-card)] border border-oat-deep/60 bg-paper p-4 shadow-soft">
      <div className="flex items-center gap-3">
        <Avatar src={photo} name={name} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-bark">{name}</p>
          <p className="text-xs text-stone">
            {e.createdAt ? new Date(e.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "just now"}
          </p>
        </div>
        <Tag tone={meta.tone}>{meta.label}</Tag>
      </div>
      {e.text && <p className="mt-3 text-[15px] leading-relaxed whitespace-pre-line text-bark-soft">{e.text}</p>}
      {e.photos.length > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          {e.photos.map((p) => (
            <StayPhoto key={p} path={p} />
          ))}
        </div>
      )}
    </li>
  );
}

function Call({ phone, label }: { phone: string; label: string }) {
  return (
    <a href={telHref(phone)} className="flex items-center gap-3 rounded-2xl bg-paper p-4 shadow-soft active:bg-oat">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-moss text-on-moss">
        <Phone className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-bark">{label}</span>
        <span className="block text-sm text-bark-soft">{phone}</span>
      </span>
    </a>
  );
}

function EmergencySheet({ b, isSitter, open, onClose, onIncident }: { b: Booking; isSitter: boolean; open: boolean; onClose: () => void; onIncident: () => void }) {
  const d = b.declarations;
  const vetName = d.preferredVetName || b.petCare.vetName;
  const vetPhone = d.preferredVetPhone || b.petCare.vetPhone;
  return (
    <Sheet open={open} onClose={onClose} title="Emergency help">
      <div className="space-y-3">
        <p className="rounded-2xl bg-ember-tint px-4 py-3 text-sm text-bark">
          Keep {b.petName} calm and safe. Call the vet first if it’s serious, then tell the {isSitter ? "pet parent" : "sitter"}.
        </p>
        {isSitter ? (
          <>
            <Call phone={d.emergencyContactPhone} label={`Call ${d.emergencyContactName}`} />
            {vetPhone && <Call phone={vetPhone} label={`Call ${vetName || "the pet’s vet"}`} />}
            <p className="text-sm text-bark-soft">
              {b.parentName} has authorised emergency treatment up to <span className="font-semibold text-bark">{formatINR(d.emergencyLimit)}</span> if they can’t be reached.
            </p>
          </>
        ) : (
          <>
            {vetPhone && <Call phone={vetPhone} label={`Call ${vetName || "your vet"}`} />}
            <Link href="/inbox/" className="flex items-center gap-3 rounded-2xl bg-paper p-4 shadow-soft active:bg-oat">
              <MessageCircle className="h-6 w-6 text-moss" />
              <span className="font-semibold text-bark">Message {b.sitterName}</span>
            </Link>
          </>
        )}
        <Link href="/nearby/?type=vet&emergency=1" className="flex items-center gap-3 rounded-2xl bg-paper p-4 shadow-soft active:bg-oat">
          <MapPinned className="h-6 w-6 text-ember" />
          <span className="min-w-0 flex-1">
            <span className="block font-semibold text-bark">Find the nearest 24×7 vet</span>
            <span className="block text-sm text-bark-soft">Clinics open now, with one-tap calling</span>
          </span>
        </Link>
        <Button
          block
          variant="secondary"
          onClick={() => {
            onClose();
            onIncident();
          }}
        >
          <ClipboardCheck className="h-4 w-4" /> Log an incident
        </Button>
      </div>
    </Sheet>
  );
}

function Stay({ profile, id }: { profile: UserProfile; id: string }) {
  const toast = useToast();
  const [booking, setBooking] = useState<Booking | null | undefined>(undefined);
  const [entries, setEntries] = useState<StayLogEntry[] | null>(null);
  const [kind, setKind] = useState<StayLogKind>("update");
  const [text, setText] = useState("");
  const [files, setFiles] = useState<{ file: File; url: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [help, setHelp] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const composer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getBooking(id).then(setBooking).catch(() => setBooking(null));
    return subscribeStayLog(id, setEntries, () => setEntries([]));
  }, [id]);

  useEffect(() => () => files.forEach((f) => URL.revokeObjectURL(f.url)), [files]);

  if (booking === undefined) return <FullScreenLoader />;
  if (!booking || (booking.parentId !== profile.uid && booking.sitterId !== profile.uid))
    return <EmptyState icon={<Lock className="h-7 w-7" />} title="Stay not found" body="Only the pet parent and sitter can see a stay log." />;

  const isSitter = profile.uid === booking.sitterId;
  const open = booking.paymentStatus === "paid" && (booking.status === "confirmed" || booking.status === "completed");
  const allowed: StayLogKind[] = isSitter ? ["update", "dropoff", "pickup", "incident"] : ["dropoff", "pickup", "incident"];
  const myDropoff = entries?.some((e) => e.kind === "dropoff" && e.authorId === profile.uid);
  const other = isSitter ? booking.parentName : booking.sitterName;

  function addFiles(list: FileList | null) {
    if (!list) return;
    const picked = Array.from(list).filter((f) => f.type.startsWith("image/"));
    setFiles((cur) => [...cur, ...picked.map((file) => ({ file, url: URL.createObjectURL(file) }))].slice(0, 4));
  }

  async function post() {
    if (!text.trim() && files.length === 0) return setError("Add a note or a photo.");
    setBusy(true);
    setError("");
    try {
      const blobs = await Promise.all(files.map((f) => compressImage(f.file, 1400, 0.82)));
      await addStayLogEntry(id, { uid: profile.uid, role: isSitter ? "sitter" : "parent" }, kind, text, blobs);
      setText("");
      setFiles([]);
      toast(kind === "incident" ? "Incident logged." : "Posted to the stay log.");
    } catch (e) {
      console.error(e);
      setError("Couldn’t post. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="px-5 pb-10">
      <div className="mt-2 flex items-center gap-3 rounded-[var(--radius-card)] bg-paper p-4 shadow-soft">
        <Avatar src={isSitter ? booking.parentPhoto : booking.sitterPhoto} name={other} size="md" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-bark">
            {booking.petName} {isSitter ? "from" : "with"} {other}
          </p>
          <p className="text-sm text-bark-soft">{formatRange(booking.startDate, booking.endDate)}</p>
        </div>
        {open && booking.status === "confirmed" && (
          <button onClick={() => setHelp(true)} className="flex h-11 shrink-0 items-center gap-1.5 rounded-full bg-ember-tint px-4 text-sm font-semibold text-ember active:opacity-80">
            <Siren className="h-4 w-4" /> Help
          </button>
        )}
      </div>

      {!open ? (
        <p className="mt-4 flex gap-3 rounded-2xl bg-honey-tint p-4 text-sm text-bark-soft">
          <Lock className="h-5 w-5 shrink-0 text-honey" />
          The stay log opens once the booking is accepted and paid. Updates, photos and condition checks are kept here as a shared record.
        </p>
      ) : (
        <>
          {!myDropoff && booking.status === "confirmed" && (
            <div className="mt-4 flex gap-3 rounded-2xl bg-river-tint p-4">
              <LifeBuoy className="mt-0.5 h-5 w-5 shrink-0 text-river" />
              <div className="text-sm text-bark">
                <p className="font-semibold">Record {booking.petName}’s condition at drop-off</p>
                <p className="mt-0.5 text-bark-soft">Photos of any existing marks or issues protect both of you.</p>
                <button
                  className="mt-2 font-semibold text-river"
                  onClick={() => {
                    setKind("dropoff");
                    composer.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                  }}
                >
                  Add a drop-off check
                </button>
              </div>
            </div>
          )}

          <div ref={composer} className="mt-5 rounded-[var(--radius-card)] bg-oat/50 p-4">
            <div className="flex flex-wrap gap-2">
              {allowed.map((k) => (
                <Chip key={k} active={kind === k} onClick={() => setKind(k)} className={cn(kind === k && k === "incident" && "!border-ember !bg-ember")}>
                  {KINDS[k].label}
                </Chip>
              ))}
            </div>
            <p className="mt-2 text-xs text-bark-soft">{KINDS[kind].hint}</p>
            <TextArea value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} placeholder="Write a note" className="mt-3" aria-label="Stay log note" />
            {files.length > 0 && (
              <div className="mt-3 grid grid-cols-4 gap-2">
                {files.map((f, i) => (
                  <div key={f.url} className="relative aspect-square overflow-hidden rounded-xl bg-oat">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={f.url} alt="" className="h-full w-full object-cover" />
                    <button
                      aria-label="Remove photo"
                      onClick={() => setFiles((cur) => cur.filter((_, j) => j !== i))}
                      className="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-bark/70 text-linen"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
            <div className="mt-3 flex items-center gap-3">
              <button
                type="button"
                onClick={() => input.current?.click()}
                disabled={files.length >= 4}
                className="flex h-11 items-center gap-2 rounded-full border border-oat-deep bg-paper px-4 text-sm font-semibold text-bark disabled:opacity-50"
              >
                {files.length ? <ImagePlus className="h-4 w-4" /> : <Camera className="h-4 w-4" />} Photo{files.length ? ` (${files.length}/4)` : ""}
              </button>
              <Button onClick={post} loading={busy} className="ml-auto" disabled={!text.trim() && files.length === 0}>
                Post
              </Button>
            </div>
            <div className="mt-2">
              <ErrorNote>{error}</ErrorNote>
            </div>
            <p className="mt-2 text-xs text-stone">Entries can’t be edited or deleted. They’re a shared record for both of you.</p>
          </div>
        </>
      )}

      <h2 className="mt-7 mb-3 font-display text-lg text-bark">Stay log</h2>
      {entries === null ? (
        <Skeleton className="h-28" />
      ) : entries.length === 0 ? (
        <p className="py-6 text-center text-sm text-bark-soft">Nothing yet. Updates and photos will appear here.</p>
      ) : (
        <ul className="space-y-3">
          {entries.map((e) => (
            <Entry key={e.id} e={e} b={booking} />
          ))}
        </ul>
      )}

      <EmergencySheet
        b={booking}
        isSitter={isSitter}
        open={help}
        onClose={() => setHelp(false)}
        onIncident={() => {
          setKind("incident");
          composer.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        }}
      />
    </main>
  );
}

function StayRoute() {
  const id = useSearchParams().get("id") || "";
  return <RequireAuth>{(p) => <Stay profile={p} id={id} />}</RequireAuth>;
}

export default function StayPage() {
  return (
    <>
      <AppBar back="/bookings/" title="Stay log" />
      <Suspense fallback={<FullScreenLoader />}>
        <StayRoute />
      </Suspense>
    </>
  );
}
