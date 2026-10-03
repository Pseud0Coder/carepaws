import { CheckCircle2, ShieldAlert } from "lucide-react";
import { HOME_DECLARATIONS, PARENT_DECLARATIONS, VACCINATION } from "@/lib/constants";
import { formatDay, formatINR } from "@/lib/format";
import type { Booking, PetCare } from "@/lib/types";
import { Tag } from "./ui";

// A bite history is the thing a sitter most needs to see, so it's flagged.
const ALERT = "Has bitten someone";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 py-2 text-sm">
      <dt className="w-28 shrink-0 text-stone">{label}</dt>
      <dd className="min-w-0 flex-1 text-bark">{children}</dd>
    </div>
  );
}

/** A pet's care sheet, as disclosed by the owner. */
export function CareSheetView({ care, notes }: { care: PetCare; notes?: string }) {
  const vacc = VACCINATION.find((v) => v.id === care.vaccinated)?.label;
  const tempers = care.tempers ?? [];
  return (
    <dl className="divide-y divide-oat-deep/60">
      <Row label="Vaccinations">
        {vacc ?? "Not given"}
        {care.vaccinatedOn ? ` · last on ${formatDay(care.vaccinatedOn, { day: "numeric", month: "short", year: "numeric" })}` : ""}
      </Row>
      {(care.sex || care.weightKg || care.neutered !== undefined) && (
        <Row label="About">
          {[care.sex === "male" ? "Male" : care.sex === "female" ? "Female" : null, care.weightKg ? `${care.weightKg} kg` : null, care.neutered ? "Neutered / spayed" : null, care.microchip ? "Microchipped" : null]
            .filter(Boolean)
            .join(" · ")}
        </Row>
      )}
      <Row label="Behaviour">
        {tempers.length === 0 ? (
          "Nothing disclosed"
        ) : (
          <span className="flex flex-wrap gap-1.5">
            {tempers.map((t) => (
              <Tag key={t} tone={t === ALERT ? "ember" : "oat"}>
                {t === ALERT && <ShieldAlert className="h-3 w-3" />}
                {t}
              </Tag>
            ))}
          </span>
        )}
      </Row>
      <Row label="Medical">{care.medical || "None given"}</Row>
      {care.medications && <Row label="Medication">{care.medications}</Row>}
      {care.diet && <Row label="Food & routine">{care.diet}</Row>}
      {(care.vetName || care.vetPhone) && <Row label="Vet">{[care.vetName, care.vetPhone].filter(Boolean).join(" · ")}</Row>}
      {notes && <Row label="Other notes">{notes}</Row>}
    </dl>
  );
}

/** The parent's signed declarations for a booking, with when they were signed. */
export function DeclarationsView({ booking, showContact }: { booking: Booking; showContact: boolean }) {
  const d = booking.declarations;
  const atHome = booking.careLocation === "parent_home";
  const items = [...PARENT_DECLARATIONS, ...(atHome ? HOME_DECLARATIONS : [])];
  return (
    <div>
      <ul className="space-y-2">
        {items.map((i) => (
          <li key={i.key} className="flex gap-2.5 text-sm text-bark-soft">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-moss" />
            <span>{i.text}</span>
          </li>
        ))}
      </ul>
      <dl className="mt-3 divide-y divide-oat-deep/60 rounded-2xl bg-oat/60 px-3">
        <Row label="Emergency limit">Up to {formatINR(d.emergencyLimit)}, if the pet parent can’t be reached</Row>
        <Row label="Emergency contact">
          {showContact ? `${d.emergencyContactName} · ${d.emergencyContactPhone}` : "Shared once you accept"}
        </Row>
        {(d.preferredVetName || d.preferredVetPhone) && <Row label="Preferred vet">{[d.preferredVetName, d.preferredVetPhone].filter(Boolean).join(" · ")}</Row>}
      </dl>
      <p className="mt-3 text-xs text-stone">
        Signed by {booking.parentName}
        {d.acceptedAt ? ` on ${new Date(d.acceptedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}` : ""} · declarations v{d.version}
        {booking.sitterAckAt ? ` · Reviewed and accepted by ${booking.sitterName} on ${new Date(booking.sitterAckAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}` : ""}
      </p>
    </div>
  );
}
