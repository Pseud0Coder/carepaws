"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Compass, HeartHandshake, Home } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import type { Role } from "@/lib/types";
import { Button, EmptyState, ErrorNote, Sheet } from "./ui";

/**
 * Shown when someone who is just looking around tries something that needs a profile
 * (booking, messaging, posting). Picking a role restarts onboarding for that role.
 */
export default function UpgradeSheet({
  open,
  onClose,
  reason,
  only,
}: {
  open: boolean;
  onClose: () => void;
  /** e.g. "book a stay" */
  reason: string;
  /** Offer just one role, when the action only makes sense for it. */
  only?: "parent" | "sitter";
}) {
  const { saveProfile, user, profile } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState<Role | null>(null);
  const [error, setError] = useState("");

  async function choose(role: "parent" | "sitter") {
    if (!user) return router.push("/auth/");
    setBusy(role);
    setError("");
    try {
      // Reopening onboarding makes the "just looking around" account set up properly.
      if (profile?.role === "explorer") await saveProfile({ role, onboarded: false });
      router.push("/onboarding/");
    } catch {
      setError("Couldn’t start setup. Please try again.");
      setBusy(null);
    }
  }

  const options = [
    { role: "parent" as const, Icon: Home, title: "I have a pet", body: "Find and book trusted sitters.", tone: "bg-clay-tint text-clay" },
    { role: "sitter" as const, Icon: HeartHandshake, title: "I’m a pet sitter", body: "Care for pets and earn. Identity verification required.", tone: "bg-moss-tint text-moss" },
  ].filter((o) => !only || o.role === only);

  return (
    <Sheet open={open} onClose={onClose} title="Finish setting up">
      <p className="mb-4 text-sm text-bark-soft">To {reason}, tell us how you’ll use CarePaws. It takes a couple of minutes.</p>
      <div className="space-y-3">
        {options.map(({ role, Icon, title, body, tone }) => (
          <button
            key={role}
            disabled={!!busy}
            onClick={() => choose(role)}
            className="flex w-full items-center gap-4 rounded-[var(--radius-card)] border border-oat-deep/60 bg-paper p-4 text-left shadow-soft transition active:scale-[0.99] disabled:opacity-60"
          >
            <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${tone}`}>
              <Icon className="h-6 w-6" />
            </span>
            <span>
              <span className="block font-semibold text-bark">{title}</span>
              <span className="block text-sm text-bark-soft">{body}</span>
            </span>
          </button>
        ))}
      </div>
      <div className="mt-3">
        <ErrorNote>{error}</ErrorNote>
      </div>
    </Sheet>
  );
}

/** Full-screen placeholder for pages that need a profile, shown to people who are just looking around. */
export function ExplorerGate({ reason = "book a stay", only = "parent" }: { reason?: string; only?: "parent" | "sitter" }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <EmptyState
        icon={<Compass className="h-7 w-7" />}
        title="Finish setting up first"
        body={`You’re just looking around right now. To ${reason}, set up your profile. It takes a couple of minutes.`}
        action={<Button onClick={() => setOpen(true)}>Set up my profile</Button>}
      />
      <UpgradeSheet open={open} onClose={() => setOpen(false)} reason={reason} only={only} />
    </>
  );
}
