"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Lock, ShieldCheck, Smartphone } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { submitKyc, type KycInput } from "@/lib/db";
import { compressImage } from "@/lib/images";
import { KYC_ID_TYPES, SITTER_DECLARATIONS, SITTER_DECLARATIONS_VERSION } from "@/lib/constants";
import type { KycIdType } from "@/lib/types";
import { cn } from "@/lib/cn";
import PhoneOtp from "./PhoneOtp";
import PhotoField from "./PhotoField";
import { Button, Chip, ErrorNote, Field, Input } from "./ui";

const STEPS = ["Mobile", "Identity", "Background", "Standards"];

function eighteenYearsAgo() {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 18);
  return d.toISOString().slice(0, 10);
}

/**
 * Identity verification for sitters. Collects only what's needed to confirm who someone is:
 * ID type and last four characters (never the full number), photos of the document and a selfie,
 * an address, an emergency contact, the care standards, and consent.
 */
export default function KycForm({
  uid,
  initialName,
  onSubmitted,
}: {
  uid: string;
  initialName?: string;
  onSubmitted: () => void | Promise<void>;
}) {
  const { phoneNumber, refreshUser } = useAuth();
  const [step, setStep] = useState(phoneNumber ? 1 : 0);
  const [legalName, setLegalName] = useState(/^Member\b/.test(initialName ?? "") ? "" : (initialName ?? ""));
  const [dob, setDob] = useState("");
  const [idType, setIdType] = useState<KycIdType>("aadhaar");
  const [idLast4, setIdLast4] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [city, setCity] = useState("");
  const [pincode, setPincode] = useState("");
  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [idFront, setIdFront] = useState<File | null>(null);
  const [idBack, setIdBack] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);
  const [addressProof, setAddressProof] = useState<File | null>(null);
  const [policeCert, setPoliceCert] = useState<File | null>(null);
  const [agreed, setAgreed] = useState<Record<string, boolean>>({});
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  const idMeta = KYC_ID_TYPES.find((t) => t.id === idType)!;

  function checkIdentity(): string {
    if (legalName.trim().length < 2) return "Enter your full legal name, as on your ID.";
    if (!dob) return "Enter your date of birth.";
    if (dob > eighteenYearsAgo()) return "Sitters must be at least 18 years old.";
    if (!/^[A-Za-z0-9]{4}$/.test(idLast4.trim())) return "Enter the last 4 characters of your ID number.";
    if (!idFront) return "Add a photo of your ID.";
    if (idMeta.back && !idBack) return "Add the back of your ID.";
    if (!selfie) return "Take a selfie so we can match it to your ID.";
    if (addressLine.trim().length < 5 || city.trim().length < 2) return "Enter your full home address.";
    if (!/^\d{6}$/.test(pincode)) return "Enter your 6-digit pincode.";
    if (!idMeta.address && !addressProof) return "Add an address proof (e.g. a recent utility bill).";
    if (emergencyName.trim().length < 2) return "Add an emergency contact’s name.";
    if (!/^[+0-9 ()-]{7,20}$/.test(emergencyPhone.trim())) return "Add an emergency contact’s phone number.";
    return "";
  }

  async function submit() {
    if (!SITTER_DECLARATIONS.every((d) => agreed[d.key])) return setError("Please agree to every care standard to continue.");
    if (!consent) return setError("Please give your consent to the verification.");
    setError("");
    setBusy(true);
    setProgress(0);
    try {
      const input: KycInput = {
        legalName: legalName.trim(),
        dob,
        idType,
        idLast4: idLast4.trim().toUpperCase(),
        addressLine: addressLine.trim(),
        city: city.trim(),
        pincode,
        emergencyName: emergencyName.trim(),
        emergencyPhone: emergencyPhone.trim(),
      };
      const files = {
        idFront: await compressImage(idFront!),
        selfie: await compressImage(selfie!),
        ...(idMeta.back && idBack ? { idBack: await compressImage(idBack) } : {}),
        ...(!idMeta.address && addressProof ? { addressProof: await compressImage(addressProof) } : {}),
        ...(policeCert ? { policeCert: await compressImage(policeCert) } : {}),
      };
      const decl = Object.fromEntries(SITTER_DECLARATIONS.map((d) => [d.key, true as const]));
      await submitKyc(uid, input, files, decl, SITTER_DECLARATIONS_VERSION, setProgress);
      await onSubmitted();
    } catch (e) {
      console.error(e);
      setError(
        (e as { code?: string }).code === "storage/unauthorized"
          ? "We couldn’t upload your documents. If you submitted before, your case may already be under review."
          : (e as Error).message || "Something went wrong. Please try again."
      );
    } finally {
      setBusy(false);
    }
  }

  function next() {
    setError("");
    if (step === 1) {
      const err = checkIdentity();
      if (err) return setError(err);
    }
    setStep((s) => s + 1);
  }

  return (
    <div>
      <ol className="mb-6 flex gap-1.5" aria-label="Verification steps">
        {STEPS.map((label, i) => (
          <li key={label} className="flex-1">
            <span className={cn("block h-1.5 rounded-full", i <= step ? "bg-moss" : "bg-oat-deep")} />
            <span className={cn("mt-1.5 block text-[11px] font-semibold", i === step ? "text-bark" : "text-stone")}>{label}</span>
          </li>
        ))}
      </ol>

      {step === 0 && (
        <section className="space-y-4">
          <div className="flex gap-3 rounded-2xl bg-oat/60 p-4 text-sm text-bark-soft">
            <Smartphone className="h-5 w-5 shrink-0 text-moss" />
            <p>Verify your mobile number so pet parents and CarePaws can reach you during a stay.</p>
          </div>
          {phoneNumber ? (
            <div className="flex items-center gap-3 rounded-2xl bg-moss-tint p-4 text-moss">
              <CheckCircle2 className="h-5 w-5" /> <span className="font-semibold">{phoneNumber} verified</span>
            </div>
          ) : (
            <PhoneOtp
              mode="link"
              submitLabel="Verify number"
              onDone={async () => {
                await refreshUser();
                setStep(1);
              }}
            />
          )}
          {phoneNumber && (
            <Button size="lg" block onClick={() => setStep(1)}>
              Continue
            </Button>
          )}
        </section>
      )}

      {step === 1 && (
        <section className="space-y-4">
          <div className="flex gap-3 rounded-2xl bg-oat/60 p-4 text-sm text-bark-soft">
            <Lock className="mt-0.5 h-5 w-5 shrink-0 text-moss" />
            <p>
              We use your ID only to confirm who you are. Documents are stored privately and seen only by CarePaws reviewers. We delete the images 30 days after a decision.{" "}
              <Link href="/legal/#privacy" className="font-semibold text-moss">
                How we protect your data
              </Link>
            </p>
          </div>
          <Field label="Full legal name" hint="Exactly as on your ID.">
            <Input value={legalName} onChange={(e) => setLegalName(e.target.value)} autoComplete="name" maxLength={80} />
          </Field>
          <Field label="Date of birth">
            <Input type="date" value={dob} max={eighteenYearsAgo()} onChange={(e) => setDob(e.target.value)} autoComplete="bday" />
          </Field>

          <div>
            <span className="mb-2 block text-sm font-medium text-bark-soft">ID document</span>
            <div className="flex flex-wrap gap-2">
              {KYC_ID_TYPES.map((t) => (
                <Chip key={t.id} active={idType === t.id} onClick={() => setIdType(t.id)}>
                  {t.label}
                </Chip>
              ))}
            </div>
            <p className="mt-2 text-xs text-stone">{idMeta.hint}</p>
          </div>
          <Field label="Last 4 characters of the ID number" hint="Never enter the full number.">
            <Input value={idLast4} onChange={(e) => setIdLast4(e.target.value.replace(/[^A-Za-z0-9]/g, "").slice(0, 4))} maxLength={4} autoComplete="off" className="uppercase tracking-widest" />
          </Field>
          <PhotoField label="ID: front" file={idFront} onChange={setIdFront} accept="image/*,application/pdf" hint="A photo or a downloaded PDF. Make sure all text is readable." />
          {idMeta.back && <PhotoField label="ID: back" file={idBack} onChange={setIdBack} accept="image/*,application/pdf" />}
          <PhotoField label="Selfie" file={selfie} onChange={setSelfie} capture="user" hint="Face the camera in good light. We match it to your ID." />

          <Field label="Home address">
            <Input value={addressLine} onChange={(e) => setAddressLine(e.target.value)} autoComplete="street-address" maxLength={160} />
          </Field>
          <div className="grid grid-cols-[1fr_7rem] gap-3">
            <Field label="City">
              <Input value={city} onChange={(e) => setCity(e.target.value)} autoComplete="address-level2" maxLength={60} />
            </Field>
            <Field label="Pincode">
              <Input value={pincode} onChange={(e) => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="postal-code" />
            </Field>
          </div>
          {!idMeta.address && (
            <PhotoField label="Address proof" file={addressProof} onChange={setAddressProof} accept="image/*,application/pdf" hint="Utility bill, bank statement or rent agreement from the last 3 months." />
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Emergency contact">
              <Input value={emergencyName} onChange={(e) => setEmergencyName(e.target.value)} placeholder="Name" maxLength={60} />
            </Field>
            <Field label="Their phone">
              <Input type="tel" value={emergencyPhone} onChange={(e) => setEmergencyPhone(e.target.value)} inputMode="tel" maxLength={20} />
            </Field>
          </div>
          <ErrorNote>{error}</ErrorNote>
          <Button size="lg" block onClick={next}>
            Continue
          </Button>
        </section>
      )}

      {step === 2 && (
        <section className="space-y-4">
          <div className="flex gap-3 rounded-2xl bg-oat/60 p-4 text-sm text-bark-soft">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-moss" />
            <p>
              A police clearance certificate (PCC) earns you a <span className="font-semibold text-bark">Background checked</span> badge once we’ve verified it. It’s optional, but pet parents notice it, and many choose only checked sitters.
            </p>
          </div>
          <PhotoField label="Police clearance certificate" file={policeCert} onChange={setPoliceCert} accept="image/*,application/pdf" optional hint="PDF or photo, issued within the last 6 months." />
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setStep(1)} className="flex-1">
              Back
            </Button>
            <Button onClick={() => setStep(3)} className="flex-[2]">
              {policeCert ? "Continue" : "Skip for now"}
            </Button>
          </div>
        </section>
      )}

      {step === 3 && (
        <section className="space-y-4">
          <div>
            <h3 className="font-display text-lg text-bark">Care standards</h3>
            <p className="text-sm text-bark-soft">Pet parents trust you with someone they love. Please confirm each one.</p>
          </div>
          <ul className="space-y-2">
            {SITTER_DECLARATIONS.map((d) => (
              <li key={d.key}>
                <label className={cn("flex gap-3 rounded-2xl border p-3 text-sm", agreed[d.key] ? "border-moss bg-moss-tint/40" : "border-oat-deep bg-paper")}>
                  <input
                    type="checkbox"
                    checked={!!agreed[d.key]}
                    onChange={(e) => setAgreed((a) => ({ ...a, [d.key]: e.target.checked }))}
                    className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--moss)]"
                  />
                  <span className="text-bark">{d.text}</span>
                </label>
              </li>
            ))}
          </ul>
          <label className="flex gap-3 rounded-2xl bg-oat/60 p-4 text-sm">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--moss)]" />
            <span className="text-bark-soft">
              I consent to CarePaws processing my ID, selfie and address to verify my identity, as described in the{" "}
              <Link href="/legal/#privacy" className="font-semibold text-moss">
                privacy notice
              </Link>
              . I can withdraw consent or ask for my data to be deleted at any time.
            </span>
          </label>
          <ErrorNote>{error}</ErrorNote>
          {busy && (
            <div className="h-2 overflow-hidden rounded-full bg-oat" role="progressbar" aria-valuenow={Math.round(progress * 100)}>
              <div className="h-full rounded-full bg-moss transition-all" style={{ width: `${Math.max(8, progress * 100)}%` }} />
            </div>
          )}
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setStep(2)} disabled={busy} className="flex-1">
              Back
            </Button>
            <Button onClick={submit} loading={busy} className="flex-[2]">
              Submit for verification
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
