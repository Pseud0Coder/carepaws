"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, CheckCircle2, FileText, ImagePlus } from "lucide-react";
import { cn } from "@/lib/cn";

/** A single photo/document picker with a preview. Files stay in memory until the form is submitted. */
export default function PhotoField({
  label,
  hint,
  file,
  onChange,
  capture,
  accept = "image/*",
  optional,
}: {
  label: string;
  hint?: string;
  file: File | null;
  onChange: (f: File | null) => void;
  /** "user" opens the front camera, "environment" the rear one, for live capture on phones. */
  capture?: "user" | "environment";
  accept?: string;
  optional?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const current = useRef<string | null>(null);

  // Preview URLs are created in the change handler and released on replace/unmount.
  useEffect(() => () => {
    if (current.current) URL.revokeObjectURL(current.current);
  }, []);

  function pick(f: File | null) {
    if (current.current) URL.revokeObjectURL(current.current);
    current.current = f && f.type.startsWith("image/") ? URL.createObjectURL(f) : null;
    setPreview(current.current);
    onChange(f);
  }

  return (
    <div>
      <span className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-bark-soft">
        <span>{label}</span>
        {optional && <span className="text-xs font-normal text-stone">Optional</span>}
      </span>
      <button
        type="button"
        onClick={() => input.current?.click()}
        className={cn(
          "flex w-full items-center gap-3 rounded-2xl border bg-paper p-3 text-left transition active:bg-oat",
          file ? "border-moss" : "border-dashed border-oat-deep"
        )}
        aria-label={`${label}: ${file ? "change" : "add"}`}
      >
        <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-oat text-moss">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className="h-full w-full object-cover" />
          ) : file ? (
            <FileText className="h-6 w-6" />
          ) : capture ? (
            <Camera className="h-6 w-6" />
          ) : (
            <ImagePlus className="h-6 w-6" />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-medium text-bark">{file ? file.name : capture ? "Take a photo" : "Choose a file"}</span>
          <span className="block text-xs text-stone">{hint ?? "JPEG, PNG or PDF"}</span>
        </span>
        {file && <CheckCircle2 className="h-5 w-5 shrink-0 text-moss" />}
      </button>
      <input
        ref={input}
        type="file"
        accept={accept}
        capture={capture}
        hidden
        onChange={(e) => {
          pick(e.target.files?.[0] ?? null);
          e.target.value = "";
        }}
      />
    </div>
  );
}
