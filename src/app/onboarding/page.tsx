"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Compass, HeartHandshake, Home, PawPrint, Stethoscope, Warehouse } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { addPet, getPets, updateContact } from "@/lib/db";
import { isOrgRole, type Pet, type Role } from "@/lib/types";
import { PET_EMOJI } from "@/lib/constants";
import { cn } from "@/lib/cn";
import RequireAuth from "@/components/RequireAuth";
import PetForm from "@/components/PetForm";
import KycForm from "@/components/KycForm";
import OrgSettingsForm from "@/components/OrgSettingsForm";
import SitterSettingsForm from "@/components/SitterSettingsForm";
import { Button, ErrorNote, Field, Input, TextArea, useToast } from "@/components/ui";

type Step = "role" | "about" | "details" | "verify";

function Progress({ step, total }: { step: Step; total: number }) {
  const i = ["role", "about", "details", "verify"].indexOf(step);
  return (
    <div className="flex gap-1.5" aria-label={`Step ${i + 1} of ${total}`}>
      {Array.from({ length: total }, (_, n) => (
        <span key={n} className={cn("h-1.5 flex-1 rounded-full", n <= i ? "bg-moss" : "bg-oat-deep")} />
      ))}
    </div>
  );
}

const ROLE_CARDS = [
  { role: "parent" as const, Icon: Home, title: "I have a pet", body: "Find and book trusted sitters nearby.", tone: "bg-clay-tint text-clay", org: false },
  { role: "sitter" as const, Icon: HeartHandshake, title: "I’m a pet sitter", body: "Care for pets and earn. Identity verification required.", tone: "bg-moss-tint text-moss", org: false },
  { role: "explorer" as const, Icon: Compass, title: "Just looking around", body: "Skip setup and browse sitters, rescues and vets.", tone: "bg-honey-tint text-honey", org: false },
  { role: "rescue" as const, Icon: Warehouse, title: "I run a rescue or shelter", body: "List it so people nearby can call you, and vouch for sitters you trust.", tone: "bg-clay-tint text-clay", org: true },
  { role: "vet" as const, Icon: Stethoscope, title: "I’m a vet or clinic", body: "Be found in emergencies, and vouch for sitters you trust.", tone: "bg-river-tint text-river", org: true },
];

export default function OnboardingPage() {
  return <RequireAuth message="Create an account to get started.">{() => <Onboarding />}</RequireAuth>;
}

function Onboarding() {
  const { profile, user, saveProfile } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [step, setStep] = useState<Step>(profile?.role ? "about" : "role");
  const [role, setRole] = useState<Role | null>(profile?.role ?? null);
  // Phone sign-ups get a placeholder name ("Member 1234"); ask for a real one.
  const [displayName, setDisplayName] = useState(/^Member\b/.test(profile?.displayName ?? "") ? "" : (profile?.displayName ?? ""));
  const [showOrgs, setShowOrgs] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [location, setLocation] = useState(profile?.location ?? "");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [pets, setPets] = useState<Pet[]>([]);
  const [addingPet, setAddingPet] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const finishing = useRef(false);

  useEffect(() => {
    // Already onboarded when the page opened (not mid-finish, which navigates itself).
    if (profile?.onboarded && !finishing.current) router.replace("/");
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
      if (r === "explorer") {
        // "Just looking around" skips setup entirely. They can pick a role later from the You tab.
        finishing.current = true;
        await saveProfile({ role: "explorer", onboarded: true });
        toast("Welcome! Set up your profile any time from the You tab.");
        router.replace("/");
        return;
      }
      await saveProfile({ role: r });
      setStep("about");
    } catch (e) {
      finishing.current = false;
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
      // A private record that they're an adult and accepted the terms (DPDP treats under-18s specially).
      await updateContact(user.uid, { terms: { version: 1, over18: true, at: new Date().toISOString() } });
      // People keep their phone private; organisations publish theirs on the listing form.
      if (!isOrgRole(role) && phone.trim()) await updateContact(user.uid, { phone: phone.trim() });
      setStep("details");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function finish() {
    setBusy(true);
    finishing.current = true;
    try {
      await saveProfile({ onboarded: true });
      toast("You're all set.");
      router.replace(role === "sitter" ? "/dashboard/" : "/");
    } catch (e) {
      finishing.current = false;
      throw e;
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="pt-safe px-6 pb-12">
      <div className="pt-6 pb-8">
        <Progress step={step} total={role === "sitter" ? 4 : 3} />
      </div>

      {step === "role" && (
        <section className="animate-rise">
          <h1 className="font-display text-[30px] leading-tight text-bark">How will you use CarePaws?</h1>
          <p className="mt-2 text-bark-soft">Not sure yet? Choose “Just looking around” and set up later.</p>
          <div className="mt-8 space-y-3">
            {ROLE_CARDS.filter((c) => !c.org || showOrgs).map(({ role: r, Icon, title, body, tone }) => (
              <button
                key={r}
                disabled={busy}
                onClick={() => chooseRole(r)}
                className={cn(
                  "flex w-full items-center gap-4 rounded-[var(--radius-card)] border bg-paper p-5 text-left shadow-soft transition active:scale-[0.99]",
                  role === r ? "border-moss" : "border-oat-deep/60"
                )}
              >
                <span className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl", tone)}>
                  <Icon className="h-6 w-6" />
                </span>
                <span>
                  <span className="block font-semibold text-bark">{title}</span>
                  <span className="block text-sm text-bark-soft">{body}</span>
                </span>
              </button>
            ))}
          </div>
          {!showOrgs && (
            <button onClick={() => setShowOrgs(true)} className="mt-5 w-full text-center text-sm font-semibold text-moss">
              I run a rescue, shelter or vet clinic →
            </button>
          )}
          <div className="mt-4">
            <ErrorNote>{error}</ErrorNote>
          </div>
        </section>
      )}

      {step === "about" && (
        <form onSubmit={saveAbout} className="animate-rise space-y-4">
          <h1 className="font-display text-[30px] leading-tight text-bark">{isOrgRole(role) ? "About your organisation" : "A little about you"}</h1>
          <p className="!mt-2 text-bark-soft">
            {isOrgRole(role)
              ? "This is what people see when they find you."
              : role === "sitter"
                ? "Pet parents read this before they book."
                : "Sitters see this when you request a stay."}
          </p>
          <Field label={isOrgRole(role) ? "Organisation name" : "Name"}>
            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} required minLength={2} maxLength={60} />
          </Field>
          <Field label="Neighbourhood, city">
            <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Indiranagar, Bengaluru" required maxLength={80} />
          </Field>
          {!isOrgRole(role) && (
            <Field label="Phone (private)" hint="Only you can see this. We never show it on your profile.">
              <Input type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" maxLength={20} />
            </Field>
          )}
          <Field label={isOrgRole(role) ? "About" : "Bio"}>
            <TextArea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={600}
              placeholder={
                isOrgRole(role)
                  ? "Who you are, who you help, and how people can get involved."
                  : role === "sitter"
                    ? "Your home, your routine, the pets you’ve cared for…"
                    : "Tell sitters about your household."
              }
            />
          </Field>
          <label className="flex gap-3 rounded-2xl bg-oat/60 p-4 text-sm">
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--moss)]" />
            <span className="text-bark-soft">
              I’m 18 or older, and I agree to the{" "}
              <Link href="/legal/#terms" className="font-semibold text-moss">
                Terms
              </Link>
              ,{" "}
              <Link href="/legal/#care-policy" className="font-semibold text-moss">
                Pet care policy
              </Link>{" "}
              and{" "}
              <Link href="/legal/#privacy" className="font-semibold text-moss">
                Privacy notice
              </Link>
              .
            </span>
          </label>
          <ErrorNote>{error}</ErrorNote>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setStep("role")} className="flex-1">
              Back
            </Button>
            <Button type="submit" loading={busy} disabled={!agreed} className="flex-[2]">
              Continue
            </Button>
          </div>
        </form>
      )}

      {step === "details" && isOrgRole(role) && (
        <section className="animate-rise">
          <h1 className="font-display text-[30px] leading-tight text-bark">Your listing</h1>
          <p className="mt-2 mb-6 text-bark-soft">
            People will tap your number to call. CarePaws verifies every listing before it appears, usually within a couple of days.
          </p>
          <OrgSettingsForm
            role={role}
            initial={profile ?? {}}
            submitLabel="Submit listing"
            onSubmit={async (s) => {
              finishing.current = true;
              await saveProfile({ ...s, onboarded: true }).catch((e) => {
                finishing.current = false;
                throw e;
              });
              toast("Listing submitted for verification.");
              router.replace("/dashboard/");
            }}
          />
        </section>
      )}

      {step === "details" && role === "sitter" && (
        <section className="animate-rise">
          <h1 className="font-display text-[30px] leading-tight text-bark">Your sitter profile</h1>
          <p className="mt-2 mb-6 text-bark-soft">You can change any of this later from your profile.</p>
          <SitterSettingsForm
            initial={profile ?? {}}
            submitLabel="Next: verify your identity"
            onSubmit={async (s) => {
              // Not live yet: a sitter is listed only after identity verification is approved.
              await saveProfile(s);
              setStep("verify");
            }}
          />
        </section>
      )}

      {step === "verify" && role === "sitter" && user && (
        <section className="animate-rise">
          <h1 className="font-display text-[30px] leading-tight text-bark">Verify your identity</h1>
          <p className="mt-2 mb-6 text-bark-soft">
            Every sitter is checked before they’re listed. It takes about five minutes, and we review it within 1–2 working days.
          </p>
          <KycForm
            uid={user.uid}
            initialName={profile?.displayName}
            onSubmitted={async () => {
              finishing.current = true;
              try {
                await saveProfile({ onboarded: true });
              } catch (e) {
                finishing.current = false;
                throw e;
              }
              toast("Submitted. We’ll review it within 1–2 working days.");
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
