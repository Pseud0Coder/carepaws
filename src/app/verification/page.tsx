"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getKyc } from "@/lib/db";
import type { KycCase, UserProfile } from "@/lib/types";
import KycForm from "@/components/KycForm";
import KycStatusCard from "@/components/KycStatusCard";
import RequireAuth from "@/components/RequireAuth";
import { AppBar, EmptyState, FullScreenLoader, useToast } from "@/components/ui";
import { ShieldCheck } from "lucide-react";

function Verification({ profile }: { profile: UserProfile }) {
  const router = useRouter();
  const toast = useToast();
  const [kyc, setKyc] = useState<KycCase | null | undefined>(undefined);

  useEffect(() => {
    getKyc(profile.uid).then(setKyc).catch(() => setKyc(null));
  }, [profile.uid]);

  if (profile.role !== "sitter")
    return <EmptyState icon={<ShieldCheck className="h-7 w-7" />} title="Verification is for sitters" body="Pet parents don’t need to verify an ID." />;
  if (kyc === undefined) return <FullScreenLoader />;

  // Open cases and approved ones can't be edited; only a rejected one can be fixed and resubmitted.
  if (profile.verified || (kyc && kyc.status !== "rejected")) {
    return (
      <main className="px-5 pt-4">
        <KycStatusCard uid={profile.uid} verified={profile.verified} backgroundChecked={profile.backgroundChecked} />
      </main>
    );
  }

  return (
    <main className="px-5 pt-4 pb-10">
      {kyc?.status === "rejected" && (
        <div className="mb-5">
          <KycStatusCard uid={profile.uid} hideAction />
        </div>
      )}
      <KycForm
        uid={profile.uid}
        initialName={profile.displayName}
        onSubmitted={() => {
          toast("Submitted. We’ll review it within 1–2 working days.");
          router.replace("/dashboard/");
        }}
      />
    </main>
  );
}

export default function VerificationPage() {
  return (
    <>
      <AppBar back="/dashboard/" title="Verify your identity" />
      <RequireAuth message="Sign in to verify your identity.">{(p) => <Verification profile={p} />}</RequireAuth>
    </>
  );
}
