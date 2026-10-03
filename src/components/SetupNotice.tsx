import { PawPrint } from "lucide-react";

/** Shown when the app was built without Firebase config, instead of crashing. */
export default function SetupNotice() {
  return (
    <main className="pt-safe relative mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6">
      <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-moss text-on-moss">
        <PawPrint className="h-7 w-7" />
      </div>
      <h1 className="font-display text-3xl text-bark">CarePaws needs its Firebase keys</h1>
      <p className="mt-3 text-bark-soft">
        This build was made without the <code className="rounded bg-oat px-1">NEXT_PUBLIC_FIREBASE_*</code> settings.
        Add them to <code className="rounded bg-oat px-1">.env.local</code> (or the CI secrets) and rebuild. The README
        lists every variable.
      </p>
    </main>
  );
}
