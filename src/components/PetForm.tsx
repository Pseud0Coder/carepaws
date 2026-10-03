"use client";

import { useState, type FormEvent } from "react";
import { PET_EMOJI, PET_KINDS, TEMPERAMENTS, VACCINATION } from "@/lib/constants";
import type { PetInput } from "@/lib/db";
import { todayISO } from "@/lib/format";
import { cn } from "@/lib/cn";
import { Button, Chip, ErrorNote, Field, Input, TextArea } from "./ui";

export const emptyPet: PetInput = { name: "", type: "Dog", breed: "", age: "", notes: "", tempers: [] };

/** The fields a pet record may contain, so a full Pet (with id, owner, timestamps) can be passed as `initial`. */
const FIELDS: (keyof PetInput)[] = [
  "name", "type", "breed", "age", "notes", "sex", "neutered", "weightKg", "vaccinated", "vaccinatedOn",
  "tempers", "medical", "medications", "diet", "vetName", "vetPhone", "microchip",
];
function pick(p: Partial<PetInput>): PetInput {
  return Object.fromEntries(FIELDS.filter((k) => p[k] !== undefined).map((k) => [k, p[k]])) as unknown as PetInput;
}

const PHONE = /^[+0-9 ()-]{7,20}$/;

/**
 * A pet's profile and care sheet. The care sheet (vaccination, behaviour, medical needs, vet) is what a sitter
 * reads before accepting, and it is copied into every booking as the record of what was disclosed.
 */
export default function PetForm({
  initial = emptyPet,
  submitLabel = "Save pet",
  onSubmit,
  onCancel,
}: {
  initial?: Partial<PetInput>;
  submitLabel?: string;
  onSubmit: (pet: PetInput) => Promise<void>;
  onCancel?: () => void;
}) {
  const [pet, setPet] = useState<PetInput>({ ...emptyPet, ...pick(initial) });
  const [weight, setWeight] = useState(initial.weightKg ? String(initial.weightKg) : "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = <K extends keyof PetInput>(k: K, v: PetInput[K]) => setPet((p) => ({ ...p, [k]: v }));
  const tempers = pet.tempers ?? [];

  async function submit(e: FormEvent) {
    e.preventDefault();
    const w = weight.trim() ? Number(weight) : undefined;
    if (w !== undefined && !(w > 0 && w <= 120)) return setError("Enter a weight between 0.1 and 120 kg.");
    if (pet.vetPhone && !PHONE.test(pet.vetPhone.trim())) return setError("Check the vet’s phone number.");
    setError("");
    setSaving(true);
    try {
      const out: PetInput = { ...pet, name: pet.name.trim(), weightKg: w };
      // Don't store a vaccination date unless there was a vaccination.
      if (out.vaccinated === "none" || !out.vaccinatedOn) delete out.vaccinatedOn;
      await onSubmit(out);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <span className="mb-2 block text-sm font-medium text-bark-soft">Kind of pet</span>
        <div className="grid grid-cols-3 gap-2">
          {PET_KINDS.map((k) => (
            <button
              type="button"
              key={k}
              onClick={() => set("type", k)}
              aria-pressed={pet.type === k}
              className={cn(
                "flex flex-col items-center gap-1 rounded-2xl border py-3 text-sm font-medium transition",
                pet.type === k ? "border-moss bg-moss-tint text-moss" : "border-oat-deep bg-paper text-bark-soft"
              )}
            >
              <span className="text-xl" aria-hidden>
                {PET_EMOJI[k]}
              </span>
              {k}
            </button>
          ))}
        </div>
      </div>
      <Field label="Name">
        <Input value={pet.name} onChange={(e) => set("name", e.target.value)} required maxLength={40} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Breed">
          <Input value={pet.breed} onChange={(e) => set("breed", e.target.value)} maxLength={60} placeholder="Indie" />
        </Field>
        <Field label="Age">
          <Input value={pet.age} onChange={(e) => set("age", e.target.value)} maxLength={20} placeholder="3 years" />
        </Field>
      </div>

      <div className="rounded-[var(--radius-card)] border border-oat-deep/70 bg-oat/40 p-4">
        <h3 className="font-display text-lg text-bark">Care sheet</h3>
        <p className="mb-4 text-xs text-bark-soft">Sitters read this before accepting. Honest answers protect your pet and the sitter. It’s saved with every booking.</p>

        <div className="space-y-4">
          <div>
            <span className="mb-2 block text-sm font-medium text-bark-soft">Vaccinations</span>
            <div className="flex flex-wrap gap-2">
              {VACCINATION.map((v) => (
                <Chip key={v.id} active={pet.vaccinated === v.id} onClick={() => set("vaccinated", v.id)}>
                  {v.label}
                </Chip>
              ))}
            </div>
            {pet.vaccinated && pet.vaccinated !== "none" && (
              <div className="mt-3">
                <Field label="Last vaccinated">
                  <Input type="date" value={pet.vaccinatedOn ?? ""} max={todayISO()} onChange={(e) => set("vaccinatedOn", e.target.value)} />
                </Field>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="mb-2 block text-sm font-medium text-bark-soft">Sex</span>
              <div className="flex gap-2">
                {(["male", "female"] as const).map((s) => (
                  <Chip key={s} active={pet.sex === s} onClick={() => set("sex", s)}>
                    {s === "male" ? "Male" : "Female"}
                  </Chip>
                ))}
              </div>
            </div>
            <Field label="Weight (kg)">
              <Input type="number" inputMode="decimal" step="0.1" min="0.1" max="120" value={weight} onChange={(e) => setWeight(e.target.value)} />
            </Field>
          </div>
          <div className="flex flex-wrap gap-2">
            <Chip active={!!pet.neutered} onClick={() => set("neutered", !pet.neutered)}>
              Neutered / spayed
            </Chip>
            <Chip active={!!pet.microchip} onClick={() => set("microchip", !pet.microchip)}>
              Microchipped
            </Chip>
          </div>

          <div>
            <span className="mb-2 block text-sm font-medium text-bark-soft">Behaviour. Tick everything that applies.</span>
            <div className="flex flex-wrap gap-2">
              {TEMPERAMENTS.map((t) => (
                <Chip key={t} active={tempers.includes(t)} onClick={() => set("tempers", tempers.includes(t) ? tempers.filter((x) => x !== t) : [...tempers, t])}>
                  {t}
                </Chip>
              ))}
            </div>
          </div>

          <Field label="Medical conditions and allergies" hint="Or write “None”.">
            <TextArea value={pet.medical ?? ""} onChange={(e) => set("medical", e.target.value)} maxLength={500} className="min-h-20" />
          </Field>
          <Field label="Medication" hint="Name, dose and timing.">
            <TextArea value={pet.medications ?? ""} onChange={(e) => set("medications", e.target.value)} maxLength={500} className="min-h-20" />
          </Field>
          <Field label="Food and routine">
            <TextArea value={pet.diet ?? ""} onChange={(e) => set("diet", e.target.value)} maxLength={500} className="min-h-20" placeholder="What, how much, when. Walks, sleeping spot." />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Your vet">
              <Input value={pet.vetName ?? ""} onChange={(e) => set("vetName", e.target.value)} maxLength={80} />
            </Field>
            <Field label="Vet’s phone">
              <Input type="tel" inputMode="tel" value={pet.vetPhone ?? ""} onChange={(e) => set("vetPhone", e.target.value)} maxLength={20} />
            </Field>
          </div>
        </div>
      </div>

      <Field label="Anything else">
        <TextArea value={pet.notes} onChange={(e) => set("notes", e.target.value)} maxLength={1000} placeholder="Quirks, favourite toys, what calms them" />
      </Field>
      <ErrorNote>{error}</ErrorNote>
      <div className="flex gap-3 pt-1">
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
        )}
        <Button type="submit" loading={saving} className="flex-1" disabled={!pet.name.trim()}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
