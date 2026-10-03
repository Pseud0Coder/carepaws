"use client";

import { useState } from "react";
import { Ban, Flag, MoreVertical } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { submitReport } from "@/lib/db";
import type { ReportReason, ReportTarget } from "@/lib/types";
import { cn } from "@/lib/cn";
import { Button, Chip, ErrorNote, IconButton, Sheet, TextArea, useToast } from "./ui";

const REASONS: { id: ReportReason; label: string }[] = [
  { id: "spam", label: "Spam or advertising" },
  { id: "harassment", label: "Harassment or abuse" },
  { id: "unsafe", label: "Unsafe for animals" },
  { id: "inaccurate", label: "Misleading or inaccurate" },
  { id: "fake", label: "Fake or impersonating" },
  { id: "other", label: "Something else" },
];

/**
 * A "…" menu to report content or people, and to block a person. Reporting and blocking are required
 * of apps that host user content, and they keep the community safe for people and animals.
 */
export default function SafetyMenu({
  targetType,
  targetId,
  ownerId,
  ownerName,
  label = "More options",
  inline,
}: {
  targetType: ReportTarget;
  targetId: string;
  /** The person responsible for the content, so they can be blocked. */
  ownerId?: string;
  ownerName?: string;
  label?: string;
  /** Smaller trigger for use inside cards. */
  inline?: boolean;
}) {
  const { user, blocked, blockUser, unblockUser } = useAuth();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"menu" | "report">("menu");
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!user || ownerId === user.uid) return null;
  const isBlocked = !!ownerId && blocked.has(ownerId);
  const close = () => {
    setOpen(false);
    setMode("menu");
    setReason(null);
    setDetails("");
    setError("");
  };

  async function report() {
    if (!reason) return setError("Choose a reason.");
    setBusy(true);
    setError("");
    try {
      await submitReport(user!.uid, targetType, targetId, reason, details);
      toast("Thanks. We’ll review your report.");
      close();
    } catch {
      setError("Couldn’t send the report. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleBlock() {
    if (!ownerId) return;
    setBusy(true);
    try {
      if (isBlocked) await unblockUser(ownerId);
      else await blockUser(ownerId);
      toast(isBlocked ? `Unblocked ${ownerName ?? "this person"}.` : `Blocked ${ownerName ?? "this person"}. They can’t message or book you.`);
      close();
    } catch {
      toast("Couldn’t update. Please try again.", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {inline ? (
        <button onClick={() => setOpen(true)} aria-label={label} className="p-1.5 text-stone">
          <MoreVertical className="h-[18px] w-[18px]" />
        </button>
      ) : (
        <IconButton label={label} onClick={() => setOpen(true)}>
          <MoreVertical className="h-5 w-5" />
        </IconButton>
      )}
      <Sheet open={open} onClose={close} title={mode === "report" ? "Report" : "Options"}>
        {mode === "menu" ? (
          <div className="divide-y divide-oat-deep/60 overflow-hidden rounded-[var(--radius-card)] bg-paper shadow-soft">
            <button onClick={() => setMode("report")} className="flex w-full items-center gap-3 px-4 py-4 text-left active:bg-oat/60">
              <Flag className="h-5 w-5 text-clay" />
              <span className="font-medium text-bark">Report</span>
            </button>
            {ownerId && (
              <button onClick={toggleBlock} disabled={busy} className="flex w-full items-center gap-3 px-4 py-4 text-left active:bg-oat/60">
                <Ban className="h-5 w-5 text-ember" />
                <span className="font-medium text-bark">{isBlocked ? `Unblock ${ownerName ?? ""}` : `Block ${ownerName ?? "this person"}`}</span>
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-bark-soft">Tell us what’s wrong. Reports are private, and we review every one.</p>
            <div className="flex flex-wrap gap-2">
              {REASONS.map((r) => (
                <Chip key={r.id} active={reason === r.id} onClick={() => setReason(r.id)}>
                  {r.label}
                </Chip>
              ))}
            </div>
            <TextArea value={details} onChange={(e) => setDetails(e.target.value)} maxLength={500} placeholder="Anything else we should know? (optional)" className={cn("min-h-24")} />
            <ErrorNote>{error}</ErrorNote>
            <Button block onClick={report} loading={busy}>
              Send report
            </Button>
            <p className="text-xs text-stone">If an animal is in immediate danger, contact a vet or rescue near you right away.</p>
          </div>
        )}
      </Sheet>
    </>
  );
}
