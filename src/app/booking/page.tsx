"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarDays, Check, Info, Plus } from "lucide-react";
import { addPet, createBooking, getContact, getPets, getSitter, updatePet, type DeclarationInput } from "@/lib/db";
import type { CareLocation, Pet, SitterProfile, UserProfile } from "@/lib/types";
import { PET_EMOJI } from "@/lib/constants";
import { formatDay, formatINR, nightsBetween, todayISO } from "@/lib/format";
import { cn } from "@/lib/cn";
import Avatar from "@/components/Avatar";
import DeclarationsSheet from "@/components/DeclarationsSheet";
import PetForm from "@/components/PetForm";
import RequireAuth from "@/components/RequireAuth";
import { ExplorerGate } from "@/components/UpgradeSheet";
import { AppBar, Button, EmptyState, ErrorNote, Field, FullScreenLoader, Input, Sheet, TextArea, useToast } from "@/components/ui";

/** Maps a pet record type ("Dog") to the sitter's accepted list ("Dogs"). */
function accepts(sitter: SitterProfile, petType: string) {
  return sitter.petTypes?.some((t) => t === petType || t === `${petType}s`) ?? false;
}

function BookingForm({ profile }: { profile: UserProfile }) {
  const sitterId = useSearchParams().get("sitter") || "";
  const router = useRouter();
  const toast = useToast();
  const [sitter, setSitter] = useState<SitterProfile | null | undefined>(undefined);
  const [pets, setPets] = useState<Pet[]>([]);
  const [petId, setPetId] = useState<string | null>(null);
  const [start, setStart] = useState(todayISO(1));
  const [end, setEnd] = useState(todayISO(3));
  const [notes, setNotes] = useState("");
  const [addingPet, setAddingPet] = useState(false);
  const [editingPet, setEditingPet] = useState<Pet | null>(null);
  const [careLocation, setCareLocation] = useState<CareLocation>("sitter_home");
  const [declOpen, setDeclOpen] = useState(false);
  const [contactPhone, setContactPhone] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    getSitter(sitterId).then(setSitter).catch(() => setSitter(null));
    getPets(profile.uid).then((p) => {
      setPets(p);
      if (p.length === 1) setPetId(p[0].id);
    });
    getContact(profile.uid).then((c) => setContactPhone(c?.phone ?? "")).catch(() => {});
  }, [sitterId, profile.uid]);

  if (sitter === undefined) return <FullScreenLoader />;
  if (!sitter) return <EmptyState icon={<Info className="h-7 w-7" />} title="Sitter not found" />;
  if (profile.role === "explorer") return <ExplorerGate />;
  if (profile.role !== "parent")
    return <EmptyState icon={<Info className="h-7 w-7" />} title="Bookings are for pet parents" body="Sitter, rescue and clinic accounts can’t request stays." />;

  const nights = nightsBetween(start, end);
  const total = nights > 0 ? nights * sitter.pricePerNight : 0;
  const pet = pets.find((p) => p.id === petId);
  const petMismatch = pet && !accepts(sitter, pet.type);

  const offersHomeCare = !!sitter.services?.includes("House sitting");

  /** Checks the basics, then asks for the declarations. Nothing is sent until those are confirmed. */
  function review() {
    if (!pet) return setError("Choose which pet needs care.");
    if (start < todayISO()) return setError("Check-in can’t be in the past.");
    if (nights < 1) return setError("Check-out must be at least one night after check-in.");
    if (nights > 60) return setError("Stays can be up to 60 nights.");
    setError("");
    // Sitters rely on the care sheet, so a booking needs one that says vaccinations are up to date.
    if (pet.vaccinated !== "up_to_date") return setEditingPet(pet);
    setDeclOpen(true);
  }

  async function send(declarations: DeclarationInput) {
    await createBooking({
      parent: profile,
      sitter: sitter!,
      pet: pet!,
      startDate: start,
      endDate: end,
      notes: notes.trim(),
      careLocation,
      declarations,
    }).catch((e) => {
      console.error(e);
      throw new Error("We couldn’t send this request. If the sitter just changed their rate, reload and try again.");
    });
    toast(`Request sent to ${sitter!.displayName.split(" ")[0]}.`);
    router.replace("/bookings/");
  }

  return (
    <main className="px-5 pb-40">
      <div className="mt-2 flex items-center gap-3 rounded-[var(--radius-card)] bg-paper p-4 shadow-soft">
        <Avatar src={sitter.photoURL} name={sitter.displayName} size="md" />
        <div className="flex-1">
          <p className="font-semibold text-bark">{sitter.displayName}</p>
          <p className="text-sm text-bark-soft">{formatINR(sitter.pricePerNight)} / night</p>
        </div>
      </div>

      <section className="pt-7">
        <h2 className="mb-3 font-display text-lg text-bark">Which pet?</h2>
        <div className="space-y-2">
          {pets.map((p) => (
            <button
              key={p.id}
              onClick={() => setPetId(p.id)}
              aria-pressed={petId === p.id}
              className={cn(
                "flex w-full items-center gap-3 rounded-2xl border bg-paper p-3 text-left transition",
                petId === p.id ? "border-moss ring-2 ring-moss/20" : "border-oat-deep/60"
              )}
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-oat text-2xl">{PET_EMOJI[p.type] ?? "🐾"}</span>
              <span className="flex-1">
                <span className="block font-semibold text-bark">{p.name}</span>
                <span className="block text-xs text-bark-soft">{[p.type, p.breed, p.age].filter(Boolean).join(" · ")}</span>
              </span>
              {petId === p.id && <Check className="h-5 w-5 text-moss" />}
            </button>
          ))}
          <button
            onClick={() => setAddingPet(true)}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-oat-deep py-3 text-sm font-semibold text-moss"
          >
            <Plus className="h-4 w-4" /> Add a pet
          </button>
        </div>
        {petMismatch && (
          <p className="mt-2 text-sm text-clay">
            {sitter.displayName.split(" ")[0]} doesn’t list {pet!.type.toLowerCase()}s. Message them before booking.
          </p>
        )}
      </section>

      {offersHomeCare && (
        <section className="pt-7">
          <h2 className="mb-3 font-display text-lg text-bark">Where will the care happen?</h2>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ["sitter_home", `At ${sitter.displayName.split(" ")[0]}’s home`],
                ["parent_home", "At my home"],
              ] as const
            ).map(([v, label]) => (
              <button
                key={v}
                onClick={() => setCareLocation(v)}
                aria-pressed={careLocation === v}
                className={cn(
                  "rounded-2xl border px-3 py-3 text-sm font-semibold transition",
                  careLocation === v ? "border-moss bg-moss-tint text-moss" : "border-oat-deep bg-paper text-bark-soft"
                )}
              >
                {label}
              </button>
            ))}
          </div>
          {careLocation === "parent_home" && (
            <p className="mt-2 text-xs text-bark-soft">You’ll also confirm that your home is pet-proofed before sending the request.</p>
          )}
        </section>
      )}

      <section className="pt-7">
        <h2 className="mb-3 flex items-center gap-2 font-display text-lg text-bark">
          <CalendarDays className="h-5 w-5 text-moss" /> Dates
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Check-in">
            <Input
              type="date"
              value={start}
              min={todayISO()}
              onChange={(e) => {
                setStart(e.target.value);
                if (e.target.value >= end) {
                  const d = new Date(e.target.value + "T00:00:00Z");
                  d.setUTCDate(d.getUTCDate() + 1);
                  setEnd(d.toISOString().slice(0, 10));
                }
              }}
            />
          </Field>
          <Field label="Check-out">
            <Input type="date" value={end} min={start} onChange={(e) => setEnd(e.target.value)} />
          </Field>
        </div>
      </section>

      <section className="pt-7">
        <Field label="Note for the sitter (optional)">
          <TextArea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} placeholder="Drop-off time, routines, anything else" />
        </Field>
      </section>

      <section className="mt-7 rounded-[var(--radius-card)] bg-oat/60 p-4 text-sm">
        <div className="flex justify-between text-bark-soft">
          <span>
            {formatINR(sitter.pricePerNight)} × {Math.max(nights, 0)} night{nights === 1 ? "" : "s"}
          </span>
          <span>{formatINR(total)}</span>
        </div>
        <div className="mt-2 flex justify-between border-t border-oat-deep pt-2 font-semibold text-bark">
          <span>Total</span>
          <span>{formatINR(total)}</span>
        </div>
        <p className="mt-3 flex gap-2 text-xs text-bark-soft">
          <Info className="h-4 w-4 shrink-0" />
          You pay only after {sitter.displayName.split(" ")[0]} accepts. Free to cancel until payment.
        </p>
      </section>

      <div className="mt-4">
        <ErrorNote>{error}</ErrorNote>
      </div>

      <div className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-oat-deep/60 bg-paper/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg items-center gap-3 px-5 py-3">
          <div className="flex-1">
            <p className="font-display text-xl text-bark">{formatINR(total)}</p>
            <p className="text-xs text-stone">{nights > 0 ? `${formatDay(start)} – ${formatDay(end)}` : "Pick dates"}</p>
          </div>
          <Button onClick={review} disabled={!pet || nights < 1}>
            Review & send
          </Button>
        </div>
      </div>

      {pet && (
        <DeclarationsSheet
          open={declOpen}
          onClose={() => setDeclOpen(false)}
          pet={pet}
          atHome={careLocation === "parent_home"}
          sitterName={sitter.displayName.split(" ")[0]}
          defaults={{ name: profile.displayName, phone: contactPhone }}
          onConfirm={send}
        />
      )}

      <Sheet open={!!editingPet} onClose={() => setEditingPet(null)} title={`${editingPet?.name ?? "Pet"}’s care sheet`}>
        {editingPet && (
          <>
            <p className="mb-4 rounded-2xl bg-honey-tint px-4 py-3 text-sm text-bark-soft">
              Sitters need an up-to-date care sheet. To book, {editingPet.name}’s vaccinations must be up to date. If they aren’t, message the sitter first.
            </p>
            <PetForm
              initial={editingPet}
              submitLabel="Save and continue"
              onCancel={() => setEditingPet(null)}
              onSubmit={async (input) => {
                await updatePet(editingPet.id, input);
                const updated = { ...editingPet, ...input };
                setPets((all) => all.map((p) => (p.id === updated.id ? updated : p)));
                setEditingPet(null);
                if (updated.vaccinated === "up_to_date") setDeclOpen(true);
              }}
            />
          </>
        )}
      </Sheet>

      <Sheet open={addingPet} onClose={() => setAddingPet(false)} title="Add a pet">
        <PetForm
          onCancel={() => setAddingPet(false)}
          onSubmit={async (input) => {
            const id = await addPet(profile.uid, input);
            const p = { ...input, id, ownerId: profile.uid };
            setPets((all) => [p, ...all]);
            setPetId(id);
            setAddingPet(false);
          }}
        />
      </Sheet>
    </main>
  );
}

export default function BookingPage() {
  return (
    <>
      <AppBar back title="Request a stay" />
      <Suspense fallback={<FullScreenLoader />}>
        <RequireAuth message="Sign in to request a stay.">{(p) => <BookingForm profile={p} />}</RequireAuth>
      </Suspense>
    </>
  );
}
