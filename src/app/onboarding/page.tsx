"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Check, HeartHandshake, Home, PawPrint } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { addPet, getPets, updateContact } from "@/lib/db";
import type { Pet, Role } from "@/lib/types";
import { PET_EMOJI } from "@/lib/constants";
import { cn } from "@/lib/cn";
import RequireAuth from "@/components/RequireAuth";
import PetForm from "@/components/PetForm";
import SitterSettingsForm from "@/components/SitterSettingsForm";
import { Button, ErrorNote, Field, Input, TextArea, useToast } from "@/components/ui";

type Step = "role" | "about" | "details";

function Progress({ step }: { step: Step }) {
  const i = ["role", "about", "details"].indexOf(step);
  return (
    <div className="flex gap-1.5" aria-label={`Step ${i + 1} of 3`}>
      {[0, 1, 2].map((n) => (
        <span key={n} className={cn("h-1.5 flex-1 rounded-full", n <= i ? "bg-moss" : "bg-oat-deep")} />
      ))}
    </div>
  );
}

export default function OnboardingPage() {
  return <RequireAuth message="Create an account to get started.">{() => <Onboarding />}</RequireAuth>;
}

function Onboarding() {
  const { profile, user, saveProfile } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [step, setStep] = useState<Step>(profile?.role ? "about" : "role");
  const [role, setRole] = useState<Role | null>(profile?.role ?? null);
  const [displayName, setDisplayName] = useState(profile?.displayName ?? "");
  const [location, setLocation] = useState(profile?.location ?? "");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [pets, setPets] = useState<Pet[]>([]);
  const [addingPet, setAddingPet] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (profile?.onboarded) router.replace("/");
  }, [profile?.onboarded, router]);

  useEffect(() => {
    if (!user || role !== "parent") return;
    getPets(user.uid).then((p) => {
      setPets(p);
      setAddingPet(p.length === 0);
    });
  }, [user, role]);

  async function chooseRole(r: Role) {
    setRole(r);
    setBusy(true);
    try {
      await saveProfile({ role: r });
      setStep("about");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function saveAbout(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    setError("");
    try {
      await saveProfile({ displayName: displayName.trim(), location: location.trim(), bio: bio.trim() });
      if (phone.trim()) await updateContact(user.uid, { phone: phone.trim() });
      setStep("details");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function finish() {
    setBusy(true);
    try {
      await saveProfile({ onboarded: true });
      toast("You're all set.");
      router.replace(role === "sitter" ? "/dashboard/" : "/");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="pt-safe px-6 pb-12">
      <div className="pt-6 pb-8">
        <Progress step={step} />
      </div>

      {step === "role" && (
        <section className="animate-rise">
          <h1 className="font-display text-[30px] leading-tight text-bark">How will you use CarePaws?</h1>
          <p className="mt-2 text-bark-soft">You can’t switch later without a new account, so choose what fits best.</p>
          <div className="mt-8 space-y-3">
            {(
              [
                ["parent", Home, "I have a pet", "Find and book trusted sitters nearby."],
                ["sitter", HeartHandshake, "I'm a sitter", "Care for pets and earn on your own schedule."],
              ] as const
            ).map(([r, Icon, title, body]) => (
              <button
                key={r}
                disabled={busy}
                onClick={() => chooseRole(r)}
                className={cn(
                  "flex w-full items-center gap-4 rounded-[var(--radius-card)] border bg-paper p-5 text-left shadow-soft transition active:scale-[0.99]",
                  role === r ? "border-moss" : "border-oat-deep/60"
                )}
              >
                <span className={cn("flex h-12 w-12 items-center justify-center rounded-2xl", r === "parent" ? "bg-clay-tint text-clay" : "bg-moss-tint text-moss")}>
                  <Icon className="h-6 w-6" />
                </span>
                <span>
                  <span className="block font-semibold text-bark">{title}</span>
                  <span className="block text-sm text-bark-soft">{body}</span>
                </span>
              </button>
            ))}
          </div>
          <div className="mt-4">
            <ErrorNote>{error}</ErrorNote>
          </div>
        </section>
      )}

      {step === "about" && (
        <form onSubmit={saveAbout} className="animate-rise space-y-4">
          <h1 className="font-display text-[30px] leading-tight text-bark">A little about you</h1>
          <p className="!mt-2 text-bark-soft">
            {role === "sitter" ? "Pet parents read this before they book." : "Sitters see this when you request a stay."}
          </p>
          <Field label="Name">
            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} required minLength={2} maxLength={60} />
          </Field>
          <Field label="Neighbourhood, city">
            <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Indiranagar, Bengaluru" required maxLength={80} />
          </Field>
          <Field label="Phone (private)" hint="Only you can see this. We never show it on your profile.">
            <Input type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" maxLength={20} />
          </Field>
          <Field label="Bio">
            <TextArea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={600}
              placeholder={role === "sitter" ? "Your home, your routine, the pets you've cared for…" : "Tell sitters about your household."}
            />
          </Field>
          <ErrorNote>{error}</ErrorNote>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setStep("role")} className="flex-1">
              Back
            </Button>
            <Button type="submit" loading={busy} className="flex-[2]">
              Continue
            </Button>
          </div>
        </form>
      )}

      {step === "details" && role === "sitter" && (
        <section className="animate-rise">
          <h1 className="font-display text-[30px] leading-tight text-bark">Your sitter profile</h1>
          <p className="mt-2 mb-6 text-bark-soft">You can change any of this later from your profile.</p>
          <SitterSettingsForm
            initial={profile ?? {}}
            submitLabel="Publish my profile"
            onSubmit={async (s) => {
              await saveProfile({ ...s, onboarded: true });
              toast("Your profile is live.");
              router.replace("/dashboard/");
            }}
          />
        </section>
      )}

      {step === "details" && role === "parent" && user && (
        <section className="animate-rise">
          <h1 className="font-display text-[30px] leading-tight text-bark">Who are we caring for?</h1>
          <p className="mt-2 mb-6 text-bark-soft">Add your pets so sitters know what to expect.</p>
          {pets.length > 0 && (
            <ul className="mb-4 space-y-2">
              {pets.map((p) => (
                <li key={p.id} className="flex items-center gap-3 rounded-2xl bg-paper p-3 shadow-soft">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-oat text-xl">{PET_EMOJI[p.type] ?? "🐾"}</span>
                  <span className="flex-1">
                    <span className="block font-semibold text-bark">{p.name}</span>
                    <span className="block text-xs text-bark-soft">{[p.type, p.breed, p.age].filter(Boolean).join(" · ")}</span>
                  </span>
                  <Check className="h-5 w-5 text-moss" />
                </li>
              ))}
            </ul>
          )}
          {addingPet ? (
            <PetForm
              submitLabel="Add pet"
              onCancel={pets.length ? () => setAddingPet(false) : undefined}
              onSubmit={async (pet) => {
                const id = await addPet(user.uid, pet);
                setPets((p) => [{ ...pet, id, ownerId: user.uid }, ...p]);
                setAddingPet(false);
              }}
            />
          ) : (
            <Button variant="secondary" block onClick={() => setAddingPet(true)}>
              <PawPrint className="h-4 w-4" /> Add another pet
            </Button>
          )}
          <div className="mt-8 flex gap-3">
            <Button variant="ghost" onClick={finish} disabled={busy} className="flex-1">
              Skip for now
            </Button>
            <Button onClick={finish} loading={busy} disabled={pets.length === 0} className="flex-[2]">
              Finish
            </Button>
          </div>
        </section>
      )}
    </main>
  );
}
