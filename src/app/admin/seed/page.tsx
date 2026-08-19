"use client";

import { useState } from "react";
import { Database, Check, Loader2, AlertTriangle } from "lucide-react";

export default function SeedPage() {
  const [seeding, setSeeding] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSeed = async () => {
    setSeeding(true);
    setResult(null);
    try {
      const res = await fetch("/api/seed", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setResult({
          success: true,
          message: `Seeded ${data.sitters} sitters, ${data.reviews} reviews, and ${data.posts} community posts.`,
        });
      } else {
        setResult({ success: false, message: data.error || "Failed to seed database." });
      }
    } catch (e) {
      setResult({ success: false, message: String(e) });
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg px-6 py-20">
      <div className="text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary-50">
          <Database className="h-8 w-8 text-primary-500" />
        </div>
        <h1 className="mt-5 text-2xl font-bold text-foreground">Seed Demo Data</h1>
        <p className="mt-2 text-sm text-text-tertiary">
          Populate your Firestore database with demo sitters, reviews, and community posts.
        </p>
      </div>

      <div className="mt-8 rounded-xl border border-border bg-surface p-6">
        <h2 className="font-semibold text-foreground">What gets seeded:</h2>
        <ul className="mt-3 space-y-2 text-sm text-text-secondary">
          <li className="flex items-center gap-2">
            <Check className="h-4 w-4 text-accent-500" /> 6 verified sitters across Indian cities
          </li>
          <li className="flex items-center gap-2">
            <Check className="h-4 w-4 text-accent-500" /> 9 detailed reviews with sitter responses
          </li>
          <li className="flex items-center gap-2">
            <Check className="h-4 w-4 text-accent-500" /> 5 community posts (tips, questions, experiences)
          </li>
        </ul>

        <div className="mt-4 flex items-start gap-2 rounded-lg bg-warm-50 p-3">
          <AlertTriangle className="h-4 w-4 mt-0.5 text-warm-500 flex-shrink-0" />
          <p className="text-xs text-warm-600 leading-relaxed">
            This will add data to your Firestore database. Run this once after setting up your Firebase project.
          </p>
        </div>

        <button
          onClick={handleSeed}
          disabled={seeding}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-primary-500 py-3.5 text-sm font-medium text-white transition-all hover:bg-primary-600 disabled:opacity-50"
        >
          {seeding ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Seeding database...
            </>
          ) : (
            <>
              <Database className="h-4 w-4" />
              Seed Database
            </>
          )}
        </button>

        {result && (
          <div
            className={`mt-4 rounded-lg p-3 text-sm ${
              result.success
                ? "bg-accent-50 text-accent-700"
                : "bg-error-bg text-error"
            }`}
          >
            {result.message}
          </div>
        )}
      </div>
    </div>
  );
}
