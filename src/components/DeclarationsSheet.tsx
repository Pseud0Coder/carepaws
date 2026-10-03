"use client";

import { useState } from "react";
import Link from "next/link";
import { EMERGENCY_LIMITS, HOME_DECLARATIONS, PARENT_DECLARATIONS } from "@/lib/constants";
import type { DeclarationInput } from "@/lib/db";
import { formatINR } from "@/lib/format";
import type { Pet } from "@/lib/types";
import { cn } from "@/lib/cn";
import { CareSheetView } from "./CareSheetView";
import { Button, Chip, ErrorNote, Field, Input, Sheet } from "./ui";

const PHONE = /^[+0-9 ()-]{7,20}$/;

/**
 * The declarations a pet parent signs before every booking. They exist to be honest and complete up front, so a
 * sitter isn't blamed later for something the pet or home already had. Each is stored with the booking.
 */
export default function DeclarationsSheet({
  open,
  onClose,
  pet,
  atHome,
  sitterName,
  defaults,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  pet: Pet;
  atHome: boolean;
  sitterName: string;
  defaults: { name: string; phone: string };
  onConfirm: (d: DeclarationInput) => Promise<void>;
}) {
  const items = [...PARENT_DECLARATIONS, ...(atHome ? HOME_DECLARATIONS : [])];
  const [ticked, setTicked] = useState<Record<string, boolean>>({});
  const [limit, setLimit] = useState<number>(10000);
  const [name, setName] = useState(defaults.name);
  const [phone, setPhone] = useState(defaults.phone);
  const [vetName, setVetName] = useState(pet.vetName ?? "");
  const [vetPhone, setVetPhone] = useState(pet.vetPhone ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const all = items.every((i) => ticked[i.key]);

  async function confirm() {
    if (!all) return setError("Please confirm every declaration to continue.");
    if (name.trim().length < 2) return setError("Add an emergency contact’s name.");
    if (!PHONE.test(phone.trim())) return setError("Add a phone number the sitter can reach in an emergency.");
    if (vetPhone.trim() && !PHONE.test(vetPhone.trim())) return setError("Check the vet’s phone number.");
    setError("");
    setBusy(true);
    try {
      await onConfirm({
        emergencyLimit: limit,
        emergencyContactName: name.trim(),
        emergencyContactPhone: phone.trim(),
        ...(vetName.trim() ? { preferredVetName: vetName.trim() } : {}),
        ...(vetPhone.trim() ? { preferredVetPhone: vetPhone.trim() } : {}),
      });
    } catch (e) {
      setError((e as Error).message || "Couldn’t send the request. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Before you send the request">
      <p className="mb-4 text-sm text-bark-soft">
        Honest, complete information keeps {pet.name} safe and avoids misunderstandings with {sitterName}. These confirmations are saved with the booking, with today’s date.
      </p>

      <h3 className="mb-1 font-display text-lg text-bark">{pet.name}’s care sheet</h3>
      <div className="mb-5 rounded-2xl bg-paper px-4 py-1 shadow-soft">
        <CareSheetView care={pet} notes={pet.notes} />
      </div>

      <h3 className="mb-2 font-display text-lg text-bark">Please confirm</h3>
      <ul className="space-y-2">
        {items.map((i) => (
          <li key={i.key}>
            <label className={cn("flex gap-3 rounded-2xl border p-3 text-sm", ticked[i.key] ? "border-moss bg-moss-tint/40" : "border-oat-deep bg-paper")}>
              <input
                type="checkbox"
                checked={!!ticked[i.key]}
                onChange={(e) => setTicked((t) => ({ ...t, [i.key]: e.target.checked }))}
                className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--moss)]"
              />
              <span className="text-bark">{i.text}</span>
            </label>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-stone">
        See the{" "}
        <Link href="/legal/#care-policy" className="font-semibold text-moss">
          Pet care policy
        </Link>
        .
      </p>

      <h3 className="mt-6 mb-2 font-display text-lg text-bark">In an emergency</h3>
      <div className="space-y-4 rounded-[var(--radius-card)] bg-oat/50 p-4">
        <div>
          <span className="mb-2 block text-sm font-medium text-bark-soft">Emergency vet treatment I authorise, up to</span>
          <div className="flex flex-wrap gap-2">
            {EMERGENCY_LIMITS.map((l) => (
              <Chip key={l} active={limit === l} onClick={() => setLimit(l)}>
                {formatINR(l)}
              </Chip>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Emergency contact">
            <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
          </Field>
          <Field label="Their phone">
            <Input type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={20} />
          </Field>
          <Field label="Preferred vet (optional)">
            <Input value={vetName} onChange={(e) => setVetName(e.target.value)} maxLength={80} />
          </Field>
          <Field label="Vet’s phone">
            <Input type="tel" inputMode="tel" value={vetPhone} onChange={(e) => setVetPhone(e.target.value)} maxLength={20} />
          </Field>
        </div>
        <p className="text-xs text-stone">The contact’s number is shared with {sitterName} only if they accept the booking.</p>
      </div>

      <div className="mt-4">
        <ErrorNote>{error}</ErrorNote>
      </div>
      <Button block size="lg" className="mt-4" onClick={confirm} loading={busy} disabled={!all}>
        Confirm and send request
      </Button>
    </Sheet>
  );
}
