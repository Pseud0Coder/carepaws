"use client";

import { useState, type FormEvent } from "react";
import { PET_EMOJI, PET_TYPES, SERVICES, WEEKDAYS } from "@/lib/constants";
import type { EditableProfile } from "@/lib/db";
import type { UserProfile } from "@/lib/types";
import { Button, Chip, ErrorNote, Field, Input, Select } from "./ui";

export type SitterSettings = Required<
  Pick<EditableProfile, "services" | "petTypes" | "pricePerNight" | "experience" | "availability" | "responseTime">
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
      await onSubmit({ services, petTypes, pricePerNight, experience: experience.trim(), availability, responseTime });
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
