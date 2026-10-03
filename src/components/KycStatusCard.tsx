"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BadgeCheck, Clock, ShieldAlert, ShieldCheck } from "lucide-react";
import { getKyc } from "@/lib/db";
import type { KycCase } from "@/lib/types";
import { Skeleton } from "./ui";

/** Where a sitter stands with identity verification, and what to do next. */
export default function KycStatusCard({ uid, verified, backgroundChecked, hideAction }: { uid: string; verified?: boolean; backgroundChecked?: boolean; hideAction?: boolean }) {
  const [kyc, setKyc] = useState<KycCase | null | undefined>(undefined);
  useEffect(() => {
    getKyc(uid).then(setKyc).catch(() => setKyc(null));
  }, [uid]);

  if (kyc === undefined) return <Skeleton className="h-24" />;

  if (verified || kyc?.status === "approved") {
    return (
      <div className="flex gap-3 rounded-[var(--radius-card)] bg-moss-tint p-4">
        <BadgeCheck className="h-6 w-6 shrink-0 text-moss" />
        <p className="text-sm text-bark">
          <span className="font-semibold">Identity verified.</span> You’re listed in search and can receive bookings.
          {backgroundChecked ? " Your background check is verified too." : " Add a police clearance certificate to earn a “Background checked” badge."}
        </p>
      </div>
    );
  }
  if (kyc?.status === "submitted") {
    return (
      <div className="flex gap-3 rounded-[var(--radius-card)] bg-honey-tint p-4">
        <Clock className="h-6 w-6 shrink-0 text-honey" />
        <p className="text-sm text-bark">
          <span className="font-semibold">Verification in review.</span> This usually takes 1–2 working days. You’ll appear in search and can take bookings as soon as you’re approved.
        </p>
      </div>
    );
  }
  if (kyc?.status === "rejected") {
    return (
      <div className="rounded-[var(--radius-card)] bg-ember-tint p-4">
        <p className="flex gap-3 text-sm text-bark">
          <ShieldAlert className="h-6 w-6 shrink-0 text-ember" />
          <span>
            <span className="font-semibold">We couldn’t verify you yet.</span>
            {kyc.reason ? ` ${kyc.reason}` : ""}
          </span>
        </p>
        {!hideAction && (
          <Link href="/verification/" className="mt-3 inline-flex h-10 items-center rounded-full bg-ember px-5 text-sm font-semibold text-on-moss">
            Fix and resubmit
          </Link>
        )}
      </div>
    );
  }
  return (
    <div className="rounded-[var(--radius-card)] bg-clay-tint p-4">
      <p className="flex gap-3 text-sm text-bark">
        <ShieldCheck className="h-6 w-6 shrink-0 text-clay" />
        <span>
          <span className="font-semibold">Verify your identity to go live.</span> Sitters are listed and bookable only after ID verification, which keeps every pet safe.
        </span>
      </p>
      <Link href="/verification/" className="mt-3 inline-flex h-10 items-center rounded-full bg-clay px-5 text-sm font-semibold text-on-moss">
        Start verification
      </Link>
    </div>
  );
}
