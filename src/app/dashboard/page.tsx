"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Camera,
  Compass,
  ChevronRight,
  Eye,
  ShieldCheck,
  LogOut,
  Moon,
  PawPrint,
  Pencil,
  Plus,
  Settings2,
  Sun,
  SunMoon,
  Trash2,
  Wallet,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { addPet, deletePet, getContact, getPets, getSitter, getVouchesByOrg, subscribeBookings, updateContact, updatePet, uploadAvatar, withdrawVouch } from "@/lib/db";
import { isOrgRole, type Booking, type Pet, type SitterProfile, type UserProfile, type Vouch } from "@/lib/types";
import { PET_EMOJI, PLATFORM_FEE_RATE, ROLE_LABEL } from "@/lib/constants";
import { formatINR } from "@/lib/format";
import { getThemePref, setThemePref, type ThemePref } from "@/lib/theme";
import { cn } from "@/lib/cn";
import Avatar from "@/components/Avatar";
import Footer from "@/components/Footer";
import KycStatusCard from "@/components/KycStatusCard";
import { orgHref } from "@/components/OrgCard";
import UpgradeSheet from "@/components/UpgradeSheet";
import OrgSettingsForm from "@/components/OrgSettingsForm";
import PetForm from "@/components/PetForm";
import RequireAuth from "@/components/RequireAuth";
import { sitterHref } from "@/components/SitterCard";
import SitterSettingsForm from "@/components/SitterSettingsForm";
import { AppBar, Button, ErrorNote, Field, Input, SectionTitle, Sheet, Tag, TextArea, useToast } from "@/components/ui";

function Row({ icon, label, detail, onClick, href, danger }: {
  icon: React.ReactNode;
  label: string;
  detail?: string;
  onClick?: () => void;
  href?: string;
  danger?: boolean;
}) {
  const inner = (
    <>
      <span className={cn("flex h-10 w-10 items-center justify-center rounded-xl", danger ? "bg-ember-tint text-ember" : "bg-oat text-moss")}>{icon}</span>
      <span className={cn("flex-1 text-left font-medium", danger ? "text-ember" : "text-bark")}>{label}</span>
      {detail && <span className="text-sm text-stone">{detail}</span>}
      {!danger && <ChevronRight className="h-4 w-4 text-stone" />}
    </>
  );
  const cls = "flex w-full items-center gap-3 px-4 py-3 active:bg-oat/60";
  return href ? <Link href={href} className={cls}>{inner}</Link> : <button onClick={onClick} className={cls}>{inner}</button>;
}

function Pets({ uid }: { uid: string }) {
  const toast = useToast();
  const [pets, setPets] = useState<Pet[] | null>(null);
  const [editing, setEditing] = useState<Pet | "new" | null>(null);

  useEffect(() => {
    getPets(uid).then(setPets).catch(() => setPets([]));
  }, [uid]);

  async function remove(p: Pet) {
    if (!confirm(`Remove ${p.name}? Past stays are kept.`)) return;
    await deletePet(p.id);
    setPets((all) => all?.filter((x) => x.id !== p.id) ?? null);
    toast(`${p.name} removed.`);
  }

  return (
    <section className="px-5 pt-7">
      <SectionTitle
        action={
          <button onClick={() => setEditing("new")} className="inline-flex items-center gap-1 text-sm font-semibold text-moss">
            <Plus className="h-4 w-4" /> Add
          </button>
        }
      >
        Your pets
      </SectionTitle>
      {pets?.length === 0 && (
        <button onClick={() => setEditing("new")} className="flex w-full flex-col items-center rounded-[var(--radius-card)] border border-dashed border-oat-deep py-8 text-bark-soft">
          <PawPrint className="mb-2 h-7 w-7 text-moss" />
          Add your first pet
        </button>
      )}
      <div className="no-scrollbar -mx-5 flex gap-3 overflow-x-auto px-5 pb-1">
        {pets?.map((p) => (
          <div key={p.id} className="w-44 shrink-0 rounded-[var(--radius-card)] bg-paper p-4 shadow-soft">
            <div className="flex items-start justify-between">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-oat text-2xl">{PET_EMOJI[p.type] ?? "🐾"}</span>
              <div className="flex">
                <button aria-label={`Edit ${p.name}`} onClick={() => setEditing(p)} className="p-1.5 text-stone">
                  <Pencil className="h-4 w-4" />
                </button>
                <button aria-label={`Remove ${p.name}`} onClick={() => remove(p)} className="p-1.5 text-stone">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <p className="mt-3 font-semibold text-bark">{p.name}</p>
            <p className="truncate text-xs text-bark-soft">{[p.breed || p.type, p.age].filter(Boolean).join(" · ")}</p>
            <button onClick={() => setEditing(p)} className="mt-2">
              {p.vaccinated === "up_to_date" ? <Tag tone="moss">Care sheet ready</Tag> : <Tag tone="honey">Complete care sheet</Tag>}
            </button>
          </div>
        ))}
      </div>
      <Sheet open={!!editing} onClose={() => setEditing(null)} title={editing === "new" ? "Add a pet" : `Edit ${editing?.name ?? ""}`}>
        {editing && (
          <PetForm
            initial={editing === "new" ? undefined : editing}
            onCancel={() => setEditing(null)}
            onSubmit={async (input) => {
              if (editing === "new") {
                const id = await addPet(uid, input);
                setPets((all) => [{ ...input, id, ownerId: uid }, ...(all ?? [])]);
              } else {
                await updatePet(editing.id, input);
                setPets((all) => all?.map((x) => (x.id === editing.id ? { ...x, ...input } : x)) ?? null);
              }
              setEditing(null);
            }}
          />
        )}
      </Sheet>
    </section>
  );
}

function Earnings({ uid }: { uid: string }) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  useEffect(() => subscribeBookings(uid, "sitterId", setBookings), [uid]);

  const { months, total, pendingPayout } = useMemo(() => {
    const paid = bookings.filter((b) => b.paymentStatus === "paid" && b.status !== "cancelled");
    const byMonth = new Map<string, { gross: number; stays: number }>();
    for (const b of paid) {
      const key = b.startDate.slice(0, 7);
      const m = byMonth.get(key) ?? { gross: 0, stays: 0 };
      m.gross += b.totalPrice;
      m.stays += 1;
      byMonth.set(key, m);
    }
    const months = [...byMonth.entries()].sort((a, b) => b[0].localeCompare(a[0])).slice(0, 6);
    const total = paid.filter((b) => b.status === "completed").reduce((s, b) => s + b.totalPrice, 0);
    const pendingPayout = paid.filter((b) => b.status === "confirmed").reduce((s, b) => s + b.totalPrice, 0);
    return { months, total, pendingPayout };
  }, [bookings]);

  const net = (n: number) => Math.round(n * (1 - PLATFORM_FEE_RATE));
  const max = Math.max(1, ...months.map(([, m]) => m.gross));

  return (
    <section className="px-5 pt-7">
      <SectionTitle>Earnings</SectionTitle>
      <div className="rounded-[28px] bg-moss p-5 text-on-moss shadow-lift">
        <p className="flex items-center gap-2 text-sm font-semibold opacity-80">
          <Wallet className="h-4 w-4" /> Earned from completed stays
        </p>
        <p className="mt-2 font-display text-[34px] leading-none">{formatINR(net(total))}</p>
        <p className="mt-2 text-sm opacity-80">
          after the {PLATFORM_FEE_RATE * 100}% platform fee · {formatINR(net(pendingPayout))} on upcoming paid stays
        </p>
      </div>
      {months.length > 0 && (
        <ul className="mt-4 space-y-2 rounded-[var(--radius-card)] bg-paper p-4 shadow-soft">
          {months.map(([key, m]) => (
            <li key={key} className="flex items-center gap-3 text-sm">
              <span className="w-16 shrink-0 text-bark-soft">
                {new Date(`${key}-01T00:00:00Z`).toLocaleDateString("en-IN", { month: "short", year: "2-digit", timeZone: "UTC" })}
              </span>
              <span className="h-2 flex-1 overflow-hidden rounded-full bg-oat">
                <span className="block h-full rounded-full bg-moss" style={{ width: `${(m.gross / max) * 100}%` }} />
              </span>
              <span className="w-20 shrink-0 text-right font-semibold text-bark">{formatINR(net(m.gross))}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ExplorerPanel() {
  const [open, setOpen] = useState(false);
  return (
    <section className="px-5 pt-6">
      <div className="rounded-[var(--radius-card)] bg-honey-tint p-5">
        <p className="flex items-center gap-2 font-semibold text-bark">
          <Compass className="h-5 w-5 text-honey" /> You’re just looking around
        </p>
        <p className="mt-1 text-sm text-bark-soft">
          Browse sitters, rescues and vets freely. To book, message or post, set up your profile. It takes a couple of minutes.
        </p>
        <Button className="mt-4" onClick={() => setOpen(true)}>
          Set up my profile
        </Button>
      </div>
      <UpgradeSheet open={open} onClose={() => setOpen(false)} reason="get started" />
    </section>
  );
}

function OrgPanel({ profile }: { profile: UserProfile }) {
  const toast = useToast();
  const [vouches, setVouches] = useState<Vouch[] | null>(null);
  const [sitters, setSitters] = useState<Record<string, SitterProfile>>({});
  useEffect(() => {
    getVouchesByOrg(profile.uid)
      .then(async (v) => {
        setVouches(v);
        const found = await Promise.all(v.map((x) => getSitter(x.sitterId).catch(() => null)));
        setSitters(Object.fromEntries(found.filter((s): s is SitterProfile => !!s).map((s) => [s.uid, s])));
      })
      .catch(() => setVouches([]));
  }, [profile.uid]);

  async function withdraw(v: Vouch) {
    if (!confirm("Withdraw this vouch?")) return;
    try {
      await withdrawVouch(profile.uid, v.sitterId);
      setVouches((all) => all?.filter((x) => x.id !== v.id) ?? null);
      toast("Vouch withdrawn.");
    } catch {
      toast("Couldn’t withdraw. Try again.", "error");
    }
  }

  const verified = profile.verified === true;
  return (
    <>
      <section className="px-5 pt-6">
        {verified ? (
          <div className="flex gap-3 rounded-[var(--radius-card)] bg-moss-tint p-4">
            <ShieldCheck className="h-6 w-6 shrink-0 text-moss" />
            <p className="text-sm text-bark">
              <span className="font-semibold">Verified.</span> Your listing is live in Nearby, and you can vouch for sitters you trust.
            </p>
          </div>
        ) : (
          <div className="flex gap-3 rounded-[var(--radius-card)] bg-honey-tint p-4">
            <ShieldCheck className="h-6 w-6 shrink-0 text-honey" />
            <p className="text-sm text-bark">
              <span className="font-semibold">Pending verification.</span> Your listing is hidden until CarePaws has checked it. You can vouch for sitters once it’s verified.
            </p>
          </div>
        )}
      </section>

      <section className="px-5 pt-7">
        <SectionTitle>Sitters you vouch for</SectionTitle>
        {vouches?.length === 0 && (
          <div className="rounded-[var(--radius-card)] border border-dashed border-oat-deep p-6 text-center">
            <p className="text-sm text-bark-soft">
              Open a sitter’s profile and tap “Vouch” to tell people you trust them with animals.
            </p>
            <Link href="/sitters/" className="mt-3 inline-block text-sm font-semibold text-moss">
              Browse sitters
            </Link>
          </div>
        )}
        {!!vouches?.length && (
          <ul className="divide-y divide-oat-deep/60 overflow-hidden rounded-[var(--radius-card)] bg-paper shadow-soft">
            {vouches.map((v) => (
              <li key={v.id} className="flex items-center gap-3 px-4 py-3">
                <Avatar src={sitters[v.sitterId]?.photoURL} name={sitters[v.sitterId]?.displayName ?? "Sitter"} size="sm" />
                <Link href={sitterHref(v.sitterId)} className="min-w-0 flex-1 font-semibold text-bark">
                  <span className="block truncate">{sitters[v.sitterId]?.displayName ?? "View sitter"}</span>
                  {v.note && <span className="mt-0.5 block text-sm font-normal text-bark-soft italic">“{v.note}”</span>}
                </Link>
                <button onClick={() => withdraw(v)} className="text-sm font-semibold text-ember">
                  Withdraw
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function EditDetails({ profile, onDone }: { profile: UserProfile; onDone: () => void }) {
  const { saveProfile } = useAuth();
  const toast = useToast();
  const [displayName, setName] = useState(profile.displayName);
  const [location, setLocation] = useState(profile.location ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const org = isOrgRole(profile.role);
  useEffect(() => {
    if (!org) getContact(profile.uid).then((c) => setPhone(c?.phone ?? ""));
  }, [profile.uid, org]);

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await saveProfile({ displayName: displayName.trim(), location: location.trim(), bio: bio.trim() });
      if (!org) await updateContact(profile.uid, { phone: phone.trim() });
      toast("Profile saved.");
      onDone();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <Field label="Name">
        <Input value={displayName} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={60} />
      </Field>
      <Field label="Neighbourhood, city">
        <Input value={location} onChange={(e) => setLocation(e.target.value)} maxLength={80} />
      </Field>
      {!org && (
        <Field label="Phone (private)">
          <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={20} />
        </Field>
      )}
      <Field label="Bio">
        <TextArea value={bio} onChange={(e) => setBio(e.target.value)} maxLength={600} />
      </Field>
      <ErrorNote>{error}</ErrorNote>
      <Button type="submit" block loading={saving}>
        Save
      </Button>
    </form>
  );
}

function ThemeSwitch() {
  // Only rendered client-side (behind RequireAuth), so reading storage here is safe.
  const [pref, setPref] = useState<ThemePref>(getThemePref);
  const opts: [ThemePref, React.ReactNode, string][] = [
    ["light", <Sun key="l" className="h-4 w-4" />, "Light"],
    ["system", <SunMoon key="s" className="h-4 w-4" />, "Auto"],
    ["dark", <Moon key="d" className="h-4 w-4" />, "Dark"],
  ];
  return (
    <div className="flex rounded-full bg-oat p-1" role="radiogroup" aria-label="Theme">
      {opts.map(([v, icon, label]) => (
        <button
          key={v}
          role="radio"
          aria-checked={pref === v}
          onClick={() => {
            setPref(v);
            setThemePref(v);
          }}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-sm font-semibold transition",
            pref === v ? "bg-paper text-bark shadow-soft" : "text-bark-soft"
          )}
        >
          {icon}
          {label}
        </button>
      ))}
    </div>
  );
}

function You({ profile }: { profile: UserProfile }) {
  const { signOut, saveProfile } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [sheet, setSheet] = useState<"details" | "sitter" | "listing" | null>(null);
  const [uploading, setUploading] = useState(false);
  const isSitter = profile.role === "sitter";
  const org = isOrgRole(profile.role) ? profile.role : null;

  async function onPhoto(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast("Choose an image file.", "error");
    if (file.size > 5 * 1024 * 1024) return toast("Photos must be under 5 MB.", "error");
    setUploading(true);
    try {
      const url = await uploadAvatar(profile.uid, file);
      await saveProfile({ photoURL: `${url}` });
      toast("Photo updated.");
    } catch {
      toast("Upload failed.", "error");
    } finally {
      setUploading(false);
    }
  }

  return (
    <main className="pb-6">
      <section className="flex flex-col items-center px-5 pt-4 text-center">
        <button onClick={() => fileRef.current?.click()} className="relative" aria-label="Change photo" disabled={uploading}>
          <Avatar src={profile.photoURL} name={profile.displayName} size="xl" className={cn("shadow-lift", uploading && "opacity-50")} />
          <span className="absolute right-0 bottom-0 flex h-8 w-8 items-center justify-center rounded-full bg-moss text-on-moss shadow-soft">
            <Camera className="h-4 w-4" />
          </span>
        </button>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => onPhoto(e.target.files?.[0])} />
        <h1 className="mt-4 font-display text-[26px] text-bark">{profile.displayName}</h1>
        <p className="text-sm text-bark-soft">
          {ROLE_LABEL[profile.role ?? "parent"]}
          {profile.location && ` · ${profile.location}`}
        </p>
      </section>

      {isSitter && (
        <section className="px-5 pt-6">
          <KycStatusCard uid={profile.uid} verified={profile.verified} backgroundChecked={profile.backgroundChecked} />
        </section>
      )}

      {org ? <OrgPanel profile={profile} /> : profile.role === "explorer" ? <ExplorerPanel /> : isSitter ? <Earnings uid={profile.uid} /> : <Pets uid={profile.uid} />}

      <section className="px-5 pt-7">
        <SectionTitle>Account</SectionTitle>
        <div className="divide-y divide-oat-deep/60 overflow-hidden rounded-[var(--radius-card)] bg-paper shadow-soft">
          <Row icon={<Pencil className="h-5 w-5" />} label="Personal details" onClick={() => setSheet("details")} />
          {isSitter && (
            <>
              <Row icon={<Settings2 className="h-5 w-5" />} label="Services & rates" detail={formatINR(profile.pricePerNight ?? 0)} onClick={() => setSheet("sitter")} />
              <Row
                icon={<Eye className="h-5 w-5" />}
                label="View public profile"
                detail={profile.vouchCount ? `Vouched by ${profile.vouchCount}` : undefined}
                href={sitterHref(profile.uid)}
              />
            </>
          )}
          {org && (
            <>
              <Row icon={<Settings2 className="h-5 w-5" />} label="Listing details" detail={profile.phone} onClick={() => setSheet("listing")} />
              <Row icon={<Eye className="h-5 w-5" />} label="View public listing" href={orgHref(profile.uid)} />
            </>
          )}
        </div>
      </section>

      <section className="px-5 pt-7">
        <SectionTitle>Appearance</SectionTitle>
        <ThemeSwitch />
      </section>

      <section className="px-5 pt-7">
        <div className="overflow-hidden rounded-[var(--radius-card)] bg-paper shadow-soft">
          <Row
            icon={<LogOut className="h-5 w-5" />}
            label="Sign out"
            danger
            onClick={async () => {
              await signOut();
              router.replace("/");
            }}
          />
        </div>
      </section>

      <Footer />

      <Sheet open={sheet === "details"} onClose={() => setSheet(null)} title="Personal details">
        <EditDetails profile={profile} onDone={() => setSheet(null)} />
      </Sheet>
      <Sheet open={sheet === "listing"} onClose={() => setSheet(null)} title="Listing details">
        {org && (
          <OrgSettingsForm
            role={org}
            initial={profile}
            submitLabel="Save listing"
            onSubmit={async (s) => {
              await saveProfile(s);
              toast("Listing updated.");
              setSheet(null);
            }}
          />
        )}
      </Sheet>
      <Sheet open={sheet === "sitter"} onClose={() => setSheet(null)} title="Services & rates">
        <SitterSettingsForm
          initial={profile}
          submitLabel="Save changes"
          onSubmit={async (s) => {
            await saveProfile(s);
            toast("Profile updated.");
            setSheet(null);
          }}
        />
      </Sheet>
    </main>
  );
}

export default function YouPage() {
  return (
    <>
      <AppBar title="You" noProfile />
      <RequireAuth message="Sign in to manage your pets and profile.">{(p) => <You profile={p} />}</RequireAuth>
    </>
  );
}
