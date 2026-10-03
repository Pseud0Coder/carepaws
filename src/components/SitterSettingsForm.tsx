"use client";

import { useState, type FormEvent } from "react";
import { HOME_TYPES, PET_EMOJI, PET_TYPES, SERVICES, WEEKDAYS } from "@/lib/constants";
import type { EditableProfile } from "@/lib/db";
import type { SitterHome, UserProfile } from "@/lib/types";
import { Button, Chip, ErrorNote, Field, Input, Select } from "./ui";

export type SitterSettings = Required<
  Pick<EditableProfile, "services" | "petTypes" | "pricePerNight" | "experience" | "availability" | "responseTime" | "home">
>;

function toggle(list: string[], v: string) {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}

export default function SitterSettingsForm({
  initial,
  submitLabel,
  onSubmit,
}: {
  initial: Partial<UserProfile>;
  submitLabel: string;
  onSubmit: (s: SitterSettings) => Promise<void>;
}) {
  const [services, setServices] = useState<string[]>(initial.services ?? []);
  const [petTypes, setPetTypes] = useState<string[]>(initial.petTypes ?? []);
  const [price, setPrice] = useState(initial.pricePerNight ? String(initial.pricePerNight) : "");
  const [experience, setExperience] = useState(initial.experience ?? "");
  const [availability, setAvailability] = useState<string[]>(initial.availability ?? [...WEEKDAYS]);
  const [responseTime, setResponseTime] = useState(initial.responseTime ?? "Within a few hours");
  const [home, setHome] = useState<SitterHome>(
    initial.home ?? { type: "apartment", fencedYard: false, hasOwnPets: false, ownPets: "", children: false, smokeFree: true, maxHoursAlone: 4 }
  );
  const setH = <K extends keyof SitterHome>(k: K, v: SitterHome[K]) => setHome((h) => ({ ...h, [k]: v }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    const pricePerNight = Math.round(Number(price));
    if (!services.length) return setError("Pick at least one service.");
    if (!petTypes.length) return setError("Pick the pets you can care for.");
    if (!(pricePerNight >= 100 && pricePerNight <= 100000)) return setError("Set a nightly rate between ₹100 and ₹1,00,000.");
    setError("");
    setSaving(true);
    try {
      await onSubmit({
        services,
        petTypes,
        pricePerNight,
        experience: experience.trim(),
        availability,
        responseTime,
        home: { ...home, ownPets: home.hasOwnPets ? home.ownPets.trim() : "" },
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <section>
        <h3 className="mb-2 text-sm font-semibold text-bark">Services you offer</h3>
        <div className="flex flex-wrap gap-2">
          {SERVICES.map((s) => (
            <Chip key={s} active={services.includes(s)} onClick={() => setServices((l) => toggle(l, s))}>
              {s}
            </Chip>
          ))}
        </div>
      </section>
      <section>
        <h3 className="mb-2 text-sm font-semibold text-bark">Pets you can care for</h3>
        <div className="flex flex-wrap gap-2">
          {PET_TYPES.map((p) => (
            <Chip key={p} active={petTypes.includes(p)} onClick={() => setPetTypes((l) => toggle(l, p))}>
              <span aria-hidden>{PET_EMOJI[p]}</span> {p}
            </Chip>
          ))}
        </div>
      </section>
      <section>
        <h3 className="mb-2 text-sm font-semibold text-bark">Days you’re available</h3>
        <div className="flex flex-wrap gap-2">
          {WEEKDAYS.map((d) => (
            <Chip key={d} active={availability.includes(d)} onClick={() => setAvailability((l) => toggle(l, d))}>
              {d}
            </Chip>
          ))}
        </div>
      </section>
      <section>
        <h3 className="mb-1 text-sm font-semibold text-bark">Your home</h3>
        <p className="mb-3 text-xs text-stone">Pet parents see this on your profile, so be accurate. It’s part of your care standards.</p>
        <div className="flex flex-wrap gap-2">
          {HOME_TYPES.map((t) => (
            <Chip key={t.id} active={home.type === t.id} onClick={() => setH("type", t.id)}>
              {t.label}
            </Chip>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Chip active={home.fencedYard} onClick={() => setH("fencedYard", !home.fencedYard)}>
            Secure fenced yard
          </Chip>
          <Chip active={home.smokeFree} onClick={() => setH("smokeFree", !home.smokeFree)}>
            Smoke-free
          </Chip>
          <Chip active={home.children} onClick={() => setH("children", !home.children)}>
            Children at home
          </Chip>
          <Chip active={home.hasOwnPets} onClick={() => setH("hasOwnPets", !home.hasOwnPets)}>
            I have pets of my own
          </Chip>
        </div>
        {home.hasOwnPets && (
          <div className="mt-3">
            <Field label="Your pets">
              <Input value={home.ownPets} onChange={(e) => setH("ownPets", e.target.value)} placeholder="2 Indie dogs, 1 cat (all vaccinated)" maxLength={100} />
            </Field>
          </div>
        )}
        <div className="mt-3">
          <Field label="Longest a pet is ever left alone" hint="You’ve promised never to exceed this.">
            <Select value={home.maxHoursAlone} onChange={(e) => setH("maxHoursAlone", Number(e.target.value))}>
              <option value={0}>Never alone, I’m always home</option>
              <option value={2}>Up to 2 hours</option>
              <option value={4}>Up to 4 hours</option>
              <option value={6}>Up to 6 hours</option>
              <option value={8}>Up to 8 hours</option>
            </Select>
          </Field>
        </div>
      </section>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Nightly rate (₹)">
          <Input type="number" inputMode="numeric" min={100} max={100000} value={price} onChange={(e) => setPrice(e.target.value)} required />
        </Field>
        <Field label="Experience">
          <Input value={experience} onChange={(e) => setExperience(e.target.value)} placeholder="4 years" maxLength={30} />
        </Field>
      </div>
      <Field label="Usual reply time">
        <Select value={responseTime} onChange={(e) => setResponseTime(e.target.value)}>
          <option>Within an hour</option>
          <option>Within a few hours</option>
          <option>Within a day</option>
        </Select>
      </Field>
      <ErrorNote>{error}</ErrorNote>
      <Button type="submit" size="lg" block loading={saving}>
        {submitLabel}
      </Button>
    </form>
  );
}
