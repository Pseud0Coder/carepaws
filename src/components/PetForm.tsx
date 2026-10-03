"use client";

import { useState, type FormEvent } from "react";
import { PET_EMOJI, PET_KINDS } from "@/lib/constants";
import type { PetInput } from "@/lib/db";
import { cn } from "@/lib/cn";
import { Button, Field, Input, TextArea } from "./ui";

export const emptyPet: PetInput = { name: "", type: "Dog", breed: "", age: "", notes: "" };

export default function PetForm({
  initial = emptyPet,
  submitLabel = "Save pet",
  onSubmit,
  onCancel,
}: {
  initial?: PetInput;
  submitLabel?: string;
  onSubmit: (pet: PetInput) => Promise<void>;
  onCancel?: () => void;
}) {
  const [pet, setPet] = useState<PetInput>(initial);
  const [saving, setSaving] = useState(false);
  const set = (k: keyof PetInput) => (v: string) => setPet((p) => ({ ...p, [k]: v }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSubmit({ ...pet, name: pet.name.trim() });
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
              onClick={() => set("type")(k)}
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
        <Input value={pet.name} onChange={(e) => set("name")(e.target.value)} required maxLength={40} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Breed">
          <Input value={pet.breed} onChange={(e) => set("breed")(e.target.value)} maxLength={60} placeholder="Indie" />
        </Field>
        <Field label="Age">
          <Input value={pet.age} onChange={(e) => set("age")(e.target.value)} maxLength={20} placeholder="3 years" />
        </Field>
      </div>
      <Field label="Care notes" hint="Food, medication, habits, fears — anything a sitter should know.">
        <TextArea value={pet.notes} onChange={(e) => set("notes")(e.target.value)} maxLength={1000} />
      </Field>
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
