"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, CheckCircle2, Compass, HeartHandshake, Home, Mail, MapPin, PawPrint, Stethoscope, Warehouse } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { auth } from "@/lib/firebase";
import { addPet, avatarValue, getPets, updateContact } from "@/lib/db";
import { compressToBase64 } from "@/lib/images";
import { HYD_CITY, isHydArea, locationLabel } from "@/lib/hyderabad";
import { toE164 } from "@/lib/phone";
import { isOrgRole, type Pet, type Role, type UserProfile } from "@/lib/types";
import { PET_EMOJI } from "@/lib/constants";
import { cn } from "@/lib/cn";
import RequireAuth from "@/components/RequireAuth";
import AreaSelect from "@/components/AreaSelect";
import PetForm from "@/components/PetForm";
import PhotoField from "@/components/PhotoField";
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

/** Where to pick up if someone closed the app part-way through, so they never re-answer what's saved. */
function initialStep(p: UserProfile | null): Step {
  if (!p?.role || p.role === "explorer") return "role";
  if (!isHydArea(p.area)) return "about";
  if (p.role === "sitter" && typeof p.pricePerNight === "number") return "verify";
  return "details";
}

/** A photo from a Google account is not a deliberate profile photo; sitters add their own. */
const hasOwnPhoto = (url: string | null | undefined) => !!url && !/googleusercontent\.com/.test(url);

export default function OnboardingPage() {
  return <RequireAuth message="Create an account to get started.">{() => <Onboarding />}</RequireAuth>;
}

function Onboarding() {
  const { profile, user, saveProfile, phoneNumber, verified, sendVerification, refreshUser } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [step, setStep] = useState<Step>(() => initialStep(profile));
  const [role, setRole] = useState<Role | null>(profile?.role && profile.role !== "explorer" ? profile.role : null);
  // Phone sign-ups get a placeholder name ("Member 1234"); ask for a real one.
  const [displayName, setDisplayName] = useState(/^Member\b/.test(profile?.displayName ?? "") ? "" : (profile?.displayName ?? ""));
  const [showOrgs, setShowOrgs] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [area, setArea] = useState(isHydArea(profile?.area) ? (profile?.area ?? "") : "");
  const [photo, setPhoto] = useState<File | null>(null);
  const [bio, setBio] = useState(profile?.bio ?? "");
  // Their mobile number is a private contact detail for during a stay. Not shown on the profile.
  const [mobile, setMobile] = useState(phoneNumber ? phoneNumber.replace(/^\+91/, "") : "");
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
    setError("");
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
    setError("");
    const name = displayName.trim();
    const needsPerson = !isOrgRole(role);
    if (name.length < 2) return setError(isOrgRole(role) ? "Enter your organisation’s name." : "Enter your name.");
    if (!isHydArea(area)) return setError("Choose your neighbourhood in Hyderabad.");
    if (role === "sitter") {
      if (bio.trim().length < 30) return setError("Tell parents a little about yourself and your home (at least a couple of sentences).");
      if (!photo && !hasOwnPhoto(profile?.photoURL)) return setError("Add a clear photo of your face. Pet parents choose sitters they can see.");
    }
    if (needsPerson && !verified) return setError("Confirm your email first.");
    const phone = needsPerson ? toE164("+91", mobile) : null;
    if (phone && "error" in phone) return setError(phone.error);
    setBusy(true);
    try {
      let photoURL: string | undefined;
      if (photo) photoURL = avatarValue(await compressToBase64(photo, "avatar"));
      await saveProfile({
        displayName: name,
        area,
        location: locationLabel(area),
        bio: bio.trim(),
        ...(photoURL ? { photoURL } : {}),
      });
      // A private record that they're an adult and accepted the terms (DPDP treats under-18s specially).
      await updateContact(user.uid, {
        terms: { version: 1, over18: true, at: new Date().toISOString() },
        // Never shown on their public profile.
        ...(phone && "phone" in phone ? { phone: phone.phone } : {}),
      });
      setStep("details");
    } catch (err) {
      setError((err as Error).message || "Couldn’t save that. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function finish() {
    setBusy(true);
    setError("");
    finishing.current = true;
    try {
      await saveProfile({ onboarded: true });
      toast("You're all set.");
      router.replace(role === "sitter" ? "/dashboard/" : "/");
    } catch (e) {
      finishing.current = false;
      setError((e as Error).message || "Couldn’t finish. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const person = !isOrgRole(role);

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
          <p className="mt-6 flex items-start gap-2 text-sm text-bark-soft">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-moss" />
            CarePaws is launching in {HYD_CITY} first. Elsewhere? You can still look around.
          </p>
          <div className="mt-4">
            <ErrorNote>{error}</ErrorNote>
          </div>
        </section>
      )}

      {step === "about" && person && !verified && user && (
        <section className="animate-rise space-y-5">
          <div>
            <h1 className="font-display text-[30px] leading-tight text-bark">Confirm your email</h1>
            <p className="mt-2 text-bark-soft">
              Every CarePaws account belongs to a real person. We sent a link to <span className="font-semibold text-bark">{user.email}</span>. Open it, then come back here.
            </p>
          </div>
          <div className="flex gap-3 rounded-2xl bg-oat/60 p-4 text-sm text-bark-soft">
            <Mail className="h-5 w-5 shrink-0 text-moss" />
            <p>Can’t find it? Check your spam folder. The link works for a few hours.</p>
          </div>
          <ErrorNote>{error}</ErrorNote>
          <Button
            type="button"
            size="lg"
            block
            loading={busy}
            onClick={async () => {
              setBusy(true);
              setError("");
              try {
                await refreshUser();
                if (!auth().currentUser?.emailVerified) setError("Not confirmed yet. Open the email and tap the link, then try again.");
              } catch {
                setError("Couldn’t check. Check your connection and try again.");
              } finally {
                setBusy(false);
              }
            }}
          >
            I’ve confirmed it
          </Button>
          <Button
            type="button"
            variant="secondary"
            block
            disabled={busy}
            onClick={async () => {
              setError("");
              try {
                await sendVerification();
                toast("Sent again. Check your inbox.");
              } catch (e) {
                setError((e as { code?: string }).code === "auth/too-many-requests" ? "Too many requests. Wait a few minutes, then try again." : "Couldn’t send the email. Try again shortly.");
              }
            }}
          >
            Send the email again
          </Button>
          <Button type="button" variant="ghost" block onClick={() => setStep("role")}>
            Back
          </Button>
        </section>
      )}

      {step === "about" && (!person || verified) && (
        <form onSubmit={saveAbout} className="animate-rise space-y-4">
          <h1 className="font-display text-[30px] leading-tight text-bark">{isOrgRole(role) ? "About your organisation" : "A little about you"}</h1>
          <p className="!mt-2 text-bark-soft">
            {isOrgRole(role)
              ? "This is what people see when they find you."
              : role === "sitter"
                ? "Pet parents read this before they book."
                : "Sitters see this when you request a stay."}
          </p>
          {person && (
            <div className="flex items-center gap-2 rounded-2xl bg-moss-tint px-4 py-3 text-sm font-semibold text-moss">
              <CheckCircle2 className="h-5 w-5" /> {phoneNumber ?? user?.email} confirmed
            </div>
          )}
          {role === "sitter" && (
            <PhotoField
              label="Your photo"
              file={photo}
              onChange={setPhoto}
              accept="image/*"
              prompt="Choose a photo"
              hint={hasOwnPhoto(profile?.photoURL) ? "You already added one. Choose another to replace it." : "A clear photo of your face. Parents see it on your profile."}
            />
          )}
          <Field label={isOrgRole(role) ? "Organisation name" : "Name"}>
            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} required minLength={2} maxLength={60} autoComplete="name" />
          </Field>
          {person && !phoneNumber && (
            <Field label="Mobile number" hint={role === "sitter" ? "Pet parents and CarePaws reach you on it during a stay. Never shown on your profile." : "Sitters and CarePaws reach you on it during a stay. Never shown on your profile."}>
              <div className="flex gap-2">
                <span className="flex h-12 items-center rounded-2xl border border-oat-deep bg-oat px-4 text-bark-soft">+91</span>
                <Input value={mobile} onChange={(e) => setMobile(e.target.value)} inputMode="numeric" autoComplete="tel-national" placeholder="98765 43210" maxLength={13} required />
              </div>
            </Field>
          )}
          <AreaSelect
            value={area}
            onChange={setArea}
            label={isOrgRole(role) ? "Neighbourhood in Hyderabad" : "Your neighbourhood in Hyderabad"}
            hint={isOrgRole(role) ? "Shown on your listing. You’ll add the full address next." : undefined}
          />
          <Field label={isOrgRole(role) ? "About" : role === "sitter" ? "About you and your home" : "About your household (optional)"}>
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
          <div className="mt-4">
            <ErrorNote>{error}</ErrorNote>
          </div>
          <div className="mt-4 flex gap-3">
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
