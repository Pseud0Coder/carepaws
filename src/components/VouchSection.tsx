"use client";

import Link from "next/link";
import { useState } from "react";
import { HandHeart, ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { vouchForSitter, withdrawVouch } from "@/lib/db";
import type { SitterProfile, Vouch } from "@/lib/types";
import { isOrgRole } from "@/lib/types";
import Avatar from "./Avatar";
import { OrgTypeTag, orgHref } from "./OrgCard";
import { Button, ErrorNote, Sheet, TextArea, useToast } from "./ui";

/**
 * "Vouched by N" with the rescues and clinics behind it, plus the action a
 * verified rescue or vet sees to vouch for (or withdraw from) this sitter.
 */
export default function VouchSection({
  sitter,
  vouches,
  onChange,
}: {
  sitter: SitterProfile;
  vouches: Vouch[];
  onChange: (v: Vouch[]) => void;
}) {
  const { profile } = useAuth();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const isOrg = isOrgRole(profile?.role);
  const canVouch = isOrg && profile?.verified === true && profile.onboarded;
  const mine = profile ? vouches.find((v) => v.orgId === profile.uid) : undefined;
  const first = sitter.displayName.replace(/^Dr\.?\s+/i, "").split(" ")[0];

  async function submit() {
    if (!profile) return;
    setBusy(true);
    setError("");
    try {
      await vouchForSitter(profile, sitter.uid, note);
      const v: Vouch = {
        id: `${profile.uid}_${sitter.uid}`,
        orgId: profile.uid,
        orgName: profile.displayName,
        orgPhoto: profile.photoURL ?? null,
        orgType: profile.role as Vouch["orgType"],
        sitterId: sitter.uid,
        ...(note.trim() ? { note: note.trim() } : {}),
        createdAt: new Date().toISOString(),
      };
      onChange([...vouches, v]);
      setOpen(false);
      setNote("");
      toast(`You vouched for ${first}.`);
    } catch (e) {
      console.error(e);
      setError("Couldn't save your vouch. Your listing must be verified first.");
    } finally {
      setBusy(false);
    }
  }

  async function withdraw() {
    if (!profile || !confirm(`Withdraw your vouch for ${first}?`)) return;
    setBusy(true);
    try {
      await withdrawVouch(profile.uid, sitter.uid);
      onChange(vouches.filter((v) => v.orgId !== profile.uid));
      toast("Vouch withdrawn.");
    } catch {
      toast("Couldn't withdraw. Try again.", "error");
    } finally {
      setBusy(false);
    }
  }

  if (vouches.length === 0 && !isOrg) return null;

  return (
    <section className="px-5 pt-7">
      <h2 className="mb-1 flex items-center gap-2 font-display text-lg text-bark">
        <ShieldCheck className="h-5 w-5 text-moss" />
        Vouched by {vouches.length}
      </h2>
      {vouches.length > 0 ? (
        <>
          <p className="mb-3 text-sm text-bark-soft">Verified rescues and clinics who know {first}’s work with animals.</p>
          <ol className="divide-y divide-oat-deep/60 overflow-hidden rounded-[var(--radius-card)] bg-paper shadow-soft">
            {vouches.map((v, i) => (
              <li key={v.id}>
                <Link href={orgHref(v.orgId)} className="flex gap-3 px-4 py-3 active:bg-oat/60">
                  <span className="w-4 shrink-0 pt-2.5 text-sm font-semibold text-stone">{i + 1}.</span>
                  <Avatar src={v.orgPhoto} name={v.orgName} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="font-semibold text-bark">{v.orgName}</span>
                      <OrgTypeTag type={v.orgType} />
                    </span>
                    {v.note && <span className="mt-1 block text-sm text-bark-soft italic">“{v.note}”</span>}
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </>
      ) : (
        <p className="mb-3 text-sm text-bark-soft">No rescue or clinic has vouched for {first} yet.</p>
      )}

      {isOrg && (
        <div className="mt-3">
          {mine ? (
            <div className="flex items-center justify-between gap-3 rounded-2xl bg-moss-tint px-4 py-3 text-sm text-moss">
              <span className="font-semibold">You vouch for {first}</span>
              <button onClick={withdraw} disabled={busy} className="font-semibold underline">
                Withdraw
              </button>
            </div>
          ) : canVouch ? (
            <Button variant="secondary" block onClick={() => setOpen(true)}>
              <HandHeart className="h-4 w-4" /> Vouch for {first}
            </Button>
          ) : (
            <p className="rounded-2xl bg-honey-tint px-4 py-3 text-sm text-bark-soft">
              You can vouch for sitters once CarePaws has verified your listing.
            </p>
          )}
        </div>
      )}

      <Sheet open={open} onClose={() => setOpen(false)} title={`Vouch for ${first}`}>
        <p className="mb-4 text-sm text-bark-soft">
          Your name appears on {first}’s profile. Only vouch for someone you’ve worked with and would trust with an animal in your care.
        </p>
        <TextArea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={300}
          placeholder="Optional: how do you know them? e.g. “Fostered our dogs for six months.”"
        />
        <div className="mt-3">
          <ErrorNote>{error}</ErrorNote>
        </div>
        <Button block className="mt-4" onClick={submit} loading={busy}>
          Vouch for {first}
        </Button>
      </Sheet>
    </section>
  );
}
