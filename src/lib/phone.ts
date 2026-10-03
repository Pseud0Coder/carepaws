"use client";

import {
  RecaptchaVerifier,
  PhoneAuthProvider,
  signInWithPhoneNumber,
  linkWithPhoneNumber,
  signInWithCredential,
  linkWithCredential,
  type ConfirmationResult,
} from "firebase/auth";
import { Capacitor } from "@capacitor/core";
import { auth } from "./firebase";

export const COUNTRIES = [
  { code: "+91", label: "India (+91)", min: 10, max: 10 },
  { code: "+971", label: "UAE (+971)", min: 8, max: 9 },
  { code: "+65", label: "Singapore (+65)", min: 8, max: 8 },
  { code: "+44", label: "UK (+44)", min: 10, max: 10 },
  { code: "+1", label: "US / Canada (+1)", min: 10, max: 10 },
  { code: "+61", label: "Australia (+61)", min: 9, max: 9 },
] as const;

/** Returns an E.164 number, or an error message for the user. */
export function toE164(countryCode: string, input: string): { phone: string } | { error: string } {
  const digits = input.replace(/\D/g, "").replace(/^0+/, "");
  const c = COUNTRIES.find((x) => x.code === countryCode) ?? COUNTRIES[0];
  if (digits.length < c.min || digits.length > c.max) {
    return { error: `Enter a valid ${c.min}-digit mobile number.` };
  }
  // Indian mobile numbers start with 6–9.
  if (c.code === "+91" && !/^[6-9]/.test(digits)) return { error: "Indian mobile numbers start with 6, 7, 8 or 9." };
  return { phone: `${c.code}${digits}` };
}

export type PhoneMode = "signin" | "link";

export interface PhoneSession {
  /** Verifies the SMS code. Signs in (or links the number to the signed-in account). */
  confirm(code: string): Promise<void>;
  /** Sends the SMS again. */
  resend(): Promise<void>;
  /** Releases listeners and the reCAPTCHA widget. */
  dispose(): void;
}

/**
 * Starts phone verification.
 *
 * Web: Firebase's reCAPTCHA flow through the JS SDK.
 * Android: the native Firebase SDK sends the SMS (it needs no reCAPTCHA); the code is then
 * confirmed with the same JS SDK, so there is a single signed-in user for Firestore rules.
 * `onAutoCode` fires if Google Play services reads the SMS for the user.
 */
export async function startPhoneVerification(
  phone: string,
  mode: PhoneMode,
  opts: { containerId: string; onAutoCode?: (code: string) => void }
): Promise<PhoneSession> {
  return Capacitor.isNativePlatform() ? nativeSession(phone, mode, opts) : webSession(phone, mode, opts);
}

// ─── Web ───────────────────────────────────────────────────────────────────

async function webSession(phone: string, mode: PhoneMode, opts: { containerId: string }): Promise<PhoneSession> {
  const a = auth();
  let verifier: RecaptchaVerifier | null = null;
  let confirmation: ConfirmationResult;

  const send = async () => {
    verifier?.clear();
    verifier = new RecaptchaVerifier(a, opts.containerId, { size: "invisible" });
    const user = a.currentUser;
    confirmation =
      mode === "link"
        ? await linkWithPhoneNumber(user!, phone, verifier)
        : await signInWithPhoneNumber(a, phone, verifier);
  };
  await send();

  return {
    confirm: async (code) => {
      await confirmation.confirm(code);
    },
    resend: send,
    dispose: () => verifier?.clear(),
  };
}

// ─── Android ───────────────────────────────────────────────────────────────

async function nativeSession(
  phone: string,
  mode: PhoneMode,
  opts: { onAutoCode?: (code: string) => void }
): Promise<PhoneSession> {
  const { FirebaseAuthentication } = await import("@capacitor-firebase/authentication");
  let verificationId = "";
  const handles: { remove: () => Promise<void> }[] = [];

  const waitForCode = (resend: boolean) =>
    new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("The SMS didn't arrive. Check the number and try again.")), 30000);
      const done = (fn: () => void) => {
        clearTimeout(timer);
        fn();
      };
      (async () => {
        handles.push(
          await FirebaseAuthentication.addListener("phoneCodeSent", (e) => {
            verificationId = e.verificationId;
            done(resolve);
          }),
          await FirebaseAuthentication.addListener("phoneVerificationFailed", (e) => done(() => reject(new Error(e.message)))),
          await FirebaseAuthentication.addListener("phoneVerificationCompleted", (e) => {
            if (e.verificationCode && verificationId) {
              opts.onAutoCode?.(e.verificationCode);
            } else if (!e.verificationCode) {
              // "Instant verification": Google verified the number without an SMS and gave us no
              // code, so the web SDK can't finish the sign-in. Ask to use another method.
              done(() =>
                reject(
                  new Error("Your number was verified automatically but we couldn't finish signing you in. Please use Google or email instead.")
                )
              );
            }
          })
        );
        // skipNativeAuth: the SMS is sent natively, but sign-in happens in the JS SDK below.
        await FirebaseAuthentication.signInWithPhoneNumber({ phoneNumber: phone, skipNativeAuth: true, resendCode: resend });
      })().catch((e) => done(() => reject(e)));
    });

  const clean = () => {
    handles.splice(0).forEach((h) => void h.remove());
  };
  await waitForCode(false).catch((e) => {
    clean();
    throw e;
  });

  return {
    confirm: async (code) => {
      const cred = PhoneAuthProvider.credential(verificationId, code);
      if (mode === "link") await linkWithCredential(auth().currentUser!, cred);
      else await signInWithCredential(auth(), cred);
      clean();
    },
    resend: async () => {
      clean();
      await waitForCode(true);
    },
    dispose: clean,
  };
}

export function phoneErrorMessage(e: unknown): string {
  const code = (e as { code?: string })?.code ?? "";
  const map: Record<string, string> = {
    "auth/invalid-phone-number": "That phone number doesn't look right.",
    "auth/invalid-verification-code": "That code isn't right. Check the SMS and try again.",
    "auth/code-expired": "That code has expired. Ask for a new one.",
    "auth/too-many-requests": "Too many attempts. Please wait a few minutes and try again.",
    "auth/quota-exceeded": "We can't send more SMS right now. Please try again later.",
    "auth/credential-already-in-use": "That number is already linked to another CarePaws account. Sign in with it instead.",
    "auth/provider-already-linked": "A phone number is already linked to this account.",
    "auth/captcha-check-failed": "Verification couldn't be completed. Please try again.",
    "auth/network-request-failed": "No connection. Check your internet and try again.",
    "auth/missing-verification-code": "Enter the 6-digit code.",
  };
  return map[code] || (e as Error)?.message || "Couldn't verify that number. Please try again.";
}
