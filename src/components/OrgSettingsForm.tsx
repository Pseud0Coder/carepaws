"use client";

import { useState, type FormEvent } from "react";
import { CheckCircle2, LocateFixed } from "lucide-react";
import { ORG_SERVICES, PET_EMOJI, PET_TYPES } from "@/lib/constants";
import { getPosition } from "@/lib/geo";
import type { EditableProfile } from "@/lib/db";
import type { OrgRole, UserProfile } from "@/lib/types";
import { Button, Chip, ErrorNote, Field, Input } from "./ui";

export type OrgSettings = Required<Pick<EditableProfile, "phone" | "address" | "hours" | "services" | "petTypes" | "website">> &
  Pick<EditableProfile, "lat" | "lng" | "open24x7">;

function toggle(list: string[], v: string) {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}

const PHONE = /^[+0-9 ()-]{7,20}$/;

/** Listing details for a rescue / shelter or vet clinic. */
export default function OrgSettingsForm({
  role,
  initial,
  submitLabel,
  onSubmit,
}: {
  role: OrgRole;
  initial: Partial<UserProfile>;
  submitLabel: string;
  onSubmit: (s: OrgSettings) => Promise<void>;
}) {
  const [phone, setPhone] = useState(initial.phone ?? "");
  const [address, setAddress] = useState(initial.address ?? "");
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(
    typeof initial.lat === "number" && typeof initial.lng === "number" ? { lat: initial.lat, lng: initial.lng } : null
  );
  const [locating, setLocating] = useState(false);
  const [hours, setHours] = useState(initial.open24x7 ? "" : (initial.hours ?? ""));
  const [open24x7, setOpen24x7] = useState(initial.open24x7 ?? false);
  const [services, setServices] = useState<string[]>(initial.services ?? []);
  const [petTypes, setPetTypes] = useState<string[]>(initial.petTypes ?? []);
  const [website, setWebsite] = useState(initial.website ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function pinHere() {
    setLocating(true);
    setError("");
    try {
      setPin(await getPosition(true));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLocating(false);
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!PHONE.test(phone.trim())) return setError("Enter a phone number people can call, e.g. +91 98xxx xxxxx.");
    if (!address.trim()) return setError("Add your street address so people can find you.");
    if (!services.length) return setError("Pick at least one thing you offer.");
    if (!petTypes.length) return setError("Pick the animals you help.");
    const site = website.trim();
    if (site && !/^https?:\/\//i.test(site)) return setError("Website must start with https://");
    setError("");
    setSaving(true);
    try {
      await onSubmit({
        phone: phone.trim(),
        address: address.trim(),
        hours: open24x7 ? "Open 24×7" : hours.trim(),
        services,
        petTypes,
        website: site,
        ...(role === "vet" ? { open24x7 } : {}),
        ...(pin ? { lat: pin.lat, lng: pin.lng } : {}),
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <Field label="Public phone number" hint="Shown on your listing. Anyone can tap it to call you.">
        <Input type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" maxLength={20} required />
      </Field>
      <Field label="Street address">
        <Input value={address} onChange={(e) => setAddress(e.target.value)} maxLength={160} autoComplete="street-address" required />
      </Field>
      <div className="rounded-2xl bg-oat/60 p-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-paper text-moss">
            {pin ? <CheckCircle2 className="h-5 w-5" /> : <LocateFixed className="h-5 w-5" />}
          </span>
          <p className="flex-1 text-sm text-bark-soft">
            {pin ? "Pinned. People nearby will see how far you are." : "Pin your location so people nearby find you first. Do this while you're at your premises."}
          </p>
          <Button type="button" size="sm" variant="secondary" onClick={pinHere} loading={locating}>
            {pin ? "Re-pin" : "Pin"}
          </Button>
        </div>
      </div>

      {role === "vet" && (
        <label className="flex items-center gap-3 rounded-2xl border border-oat-deep bg-paper p-4">
          <input type="checkbox" checked={open24x7} onChange={(e) => setOpen24x7(e.target.checked)} className="h-5 w-5 accent-[var(--moss)]" />
          <span>
            <span className="block font-semibold text-bark">Open 24×7 for emergencies</span>
            <span className="block text-xs text-bark-soft">Appears first when someone searches for an emergency vet.</span>
          </span>
        </label>
      )}
      {!(role === "vet" && open24x7) && (
        <Field label="Opening hours">
          <Input value={hours} onChange={(e) => setHours(e.target.value)} maxLength={70} placeholder="Mon–Sat, 9am–7pm" />
        </Field>
      )}

      <section>
        <h3 className="mb-2 text-sm font-semibold text-bark">{role === "vet" ? "What you offer" : "How you help"}</h3>
        <div className="flex flex-wrap gap-2">
          {ORG_SERVICES[role].map((s) => (
            <Chip key={s} active={services.includes(s)} onClick={() => setServices((l) => toggle(l, s))}>
              {s}
            </Chip>
          ))}
        </div>
      </section>
      <section>
        <h3 className="mb-2 text-sm font-semibold text-bark">Animals you help</h3>
        <div className="flex flex-wrap gap-2">
          {PET_TYPES.map((p) => (
            <Chip key={p} active={petTypes.includes(p)} onClick={() => setPetTypes((l) => toggle(l, p))}>
              <span aria-hidden>{PET_EMOJI[p]}</span> {p}
            </Chip>
          ))}
        </div>
      </section>
      <Field label="Website (optional)">
        <Input type="url" inputMode="url" value={website} onChange={(e) => setWebsite(e.target.value)} maxLength={200} placeholder="https://" />
      </Field>
      <ErrorNote>{error}</ErrorNote>
      <Button type="submit" size="lg" block loading={saving}>
        {submitLabel}
      </Button>
    </form>
  );
}
