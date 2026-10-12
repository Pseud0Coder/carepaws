"use client";

import { HYD_AREAS } from "@/lib/hyderabad";
import { Field, Select } from "./ui";

/** Picks a Hyderabad neighbourhood. People share an area, never a precise address. */
export default function AreaSelect({
  value,
  onChange,
  label = "Your neighbourhood in Hyderabad",
  hint,
}: {
  value: string;
  onChange: (area: string) => void;
  label?: string;
  hint?: string;
}) {
  return (
    <Field label={label} hint={hint ?? "Pet parents and sitters see only this, never your address."}>
      <Select value={value} onChange={(e) => onChange(e.target.value)} required>
        <option value="" disabled>
          Choose your area
        </option>
        {HYD_AREAS.map((a) => (
          <option key={a.name} value={a.name}>
            {a.name}
          </option>
        ))}
      </Select>
    </Field>
  );
}
