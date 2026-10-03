"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ShieldCheck } from "lucide-react";
import { COUNTRIES, phoneErrorMessage, startPhoneVerification, toE164, type PhoneMode, type PhoneSession } from "@/lib/phone";
import { Button, ErrorNote, Field, Input, Select } from "./ui";

/**
 * Two-step phone verification: number, then the 6-digit SMS code.
 * `mode="signin"` creates or opens an account; `mode="link"` adds a verified number to the signed-in one.
 */
export default function PhoneOtp({
  mode,
  onDone,
  initialPhone,
  submitLabel = "Continue",
}: {
  mode: PhoneMode;
  onDone: () => void | Promise<void>;
  initialPhone?: string;
  submitLabel?: string;
}) {
  const [cc, setCc] = useState<string>(COUNTRIES[0].code);
  const [number, setNumber] = useState(initialPhone ?? "");
  const [code, setCode] = useState("");
  const [stage, setStage] = useState<"number" | "code">("number");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [sentTo, setSentTo] = useState("");
  const session = useRef<PhoneSession | null>(null);
  const confirming = useRef(false);

  useEffect(() => () => session.current?.dispose(), []);
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function confirm(c: string) {
    if (confirming.current || !session.current) return;
    confirming.current = true;
    setBusy(true);
    setError("");
    try {
      await session.current.confirm(c);
      await onDone();
    } catch (e) {
      setError(phoneErrorMessage(e));
      setCode("");
    } finally {
      confirming.current = false;
      setBusy(false);
    }
  }

  async function send(e?: FormEvent) {
    e?.preventDefault();
    const parsed = toE164(cc, number);
    if ("error" in parsed) return setError(parsed.error);
    setBusy(true);
    setError("");
    try {
      session.current?.dispose();
      session.current = await startPhoneVerification(parsed.phone, mode, {
        containerId: "recaptcha-container",
        // Android can read the SMS for the user.
        onAutoCode: (auto) => {
          setCode(auto);
          void confirm(auto);
        },
      });
      setSentTo(parsed.phone);
      setStage("code");
      setCooldown(30);
    } catch (err) {
      setError(phoneErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    setBusy(true);
    setError("");
    try {
      await session.current?.resend();
      setCooldown(30);
    } catch (err) {
      setError(phoneErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {stage === "number" ? (
        <form onSubmit={send} className="space-y-4">
          <div className="grid grid-cols-[7.5rem_1fr] gap-3">
            <Field label="Country">
              <Select value={cc} onChange={(e) => setCc(e.target.value)} aria-label="Country code">
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Mobile number">
              <Input
                type="tel"
                inputMode="tel"
                autoComplete="tel-national"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                placeholder="98765 43210"
                maxLength={14}
                required
              />
            </Field>
          </div>
          <ErrorNote>{error}</ErrorNote>
          <Button type="submit" size="lg" block loading={busy}>
            Send code
          </Button>
          <p className="flex items-start gap-2 text-xs text-stone">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
            We’ll text a 6-digit code. Message and data rates may apply. Your number is never shown to other people.
          </p>
        </form>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void confirm(code);
          }}
          className="space-y-4"
        >
          <p className="text-sm text-bark-soft">
            Enter the 6-digit code sent to <span className="font-semibold text-bark">{sentTo}</span>.
          </p>
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            aria-label="6-digit code"
            placeholder="······"
            className="text-center font-display text-2xl tracking-[0.5em]"
            maxLength={6}
            autoFocus
          />
          <ErrorNote>{error}</ErrorNote>
          <Button type="submit" size="lg" block loading={busy} disabled={code.length !== 6}>
            {submitLabel}
          </Button>
          <div className="flex items-center justify-between text-sm">
            <button
              type="button"
              className="font-semibold text-moss"
              onClick={() => {
                session.current?.dispose();
                setStage("number");
                setCode("");
                setError("");
              }}
            >
              Change number
            </button>
            <button type="button" disabled={cooldown > 0 || busy} onClick={resend} className="font-semibold text-moss disabled:text-stone">
              {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
            </button>
          </div>
        </form>
      )}
      {/* Invisible reCAPTCHA anchor used by the web flow. */}
      <div id="recaptcha-container" />
    </div>
  );
}
