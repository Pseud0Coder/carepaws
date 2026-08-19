"use client";

import { Suspense, useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ChevronLeft,
  Calendar,
  Check,
  PawPrint,
  CreditCard,
  LogIn,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import Avatar from "@/components/Avatar";

interface SitterData {
  uid: string;
  displayName: string;
  gender: "male" | "female";
  pricePerNight: number;
  location: string;
}

interface PetData {
  id: string;
  name: string;
  type: string;
  breed: string;
  age: string;
}

function BookingContent() {
  const searchParams = useSearchParams();
  const { profile, user, authFetch } = useAuth();
  const sitterId = searchParams.get("sitterId") || "";

  const [sitter, setSitter] = useState<SitterData | null>(null);
  const [pets, setPets] = useState<PetData[]>([]);
  const [loading, setLoading] = useState(true);

  const [step, setStep] = useState(1);
  const [selectedPet, setSelectedPet] = useState<string | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [specialNotes, setSpecialNotes] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Fetch sitter and pets
  useEffect(() => {
    if (!sitterId) return;

    Promise.all([
      fetch(`/api/sitters?id=${sitterId}`).then((r) => r.json()),
      user ? fetch(`/api/pets?userId=${user.uid}`).then((r) => r.json()) : Promise.resolve([]),
    ])
      .then(([sitterData, petsData]) => {
        setSitter(sitterData);
        setPets(Array.isArray(petsData) ? petsData : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [sitterId, user]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-400" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-alt">
          <LogIn className="h-8 w-8 text-text-tertiary" />
        </div>
        <h1 className="mt-5 text-xl font-bold text-foreground">Sign in required</h1>
        <p className="mt-2 text-sm text-text-tertiary">Please sign in to make a booking.</p>
        <Link
          href="/auth"
          className="mt-6 rounded-lg bg-primary-500 px-6 py-3 text-sm font-medium text-white transition-all hover:bg-primary-600"
        >
          Sign In
        </Link>
      </div>
    );
  }

  if (!sitter) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-text-secondary">Sitter not found.</p>
      </div>
    );
  }

  const nights =
    startDate && endDate
      ? Math.max(
          1,
          Math.ceil(
            (new Date(endDate).getTime() - new Date(startDate).getTime()) /
              (1000 * 60 * 60 * 24)
          )
        )
      : 1;
  const total = nights * sitter.pricePerNight;

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      const res = await authFetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sitterId: sitterId,
          sitterName: sitter.displayName,
          parentId: user?.uid,
          parentName: profile.displayName,
          petId: selectedPet,
          petName: pets.find((p) => p.id === selectedPet)?.name || "Unknown",
          startDate,
          endDate,
          totalPrice: total,
          notes: specialNotes,
        }),
      });
      if (res.ok) setConfirmed(true);
    } catch (e) {
      console.error("Booking failed:", e);
    } finally {
      setSubmitting(false);
    }
  };

  if (confirmed) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-20 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-accent-50">
          <Check className="h-10 w-10 text-accent-600" />
        </div>
        <h1 className="mt-6 text-2xl font-bold text-foreground">
          Booking Request Sent
        </h1>
        <p className="mt-3 text-text-tertiary">
          {sitter.displayName} will review your request and confirm within 24 hours.
          You will receive a notification once they respond.
        </p>
        <div className="mt-8 rounded-xl border border-border bg-surface p-6 text-left">
          <h3 className="font-semibold text-foreground">Booking Summary</h3>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-text-tertiary">Sitter</span>
              <span className="font-medium text-foreground">{sitter.displayName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-tertiary">Pet</span>
              <span className="font-medium text-foreground">
                {pets.find((p) => p.id === selectedPet)?.name || "Not selected"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-tertiary">Dates</span>
              <span className="font-medium text-foreground">
                {startDate} to {endDate}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-tertiary">Duration</span>
              <span className="font-medium text-foreground">
                {nights} night{nights > 1 ? "s" : ""}
              </span>
            </div>
            <div className="border-t border-border-subtle pt-3 flex justify-between">
              <span className="font-semibold text-foreground">Total</span>
              <span className="font-semibold text-foreground">₹{total.toLocaleString("en-IN")}</span>
            </div>
          </div>
        </div>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-lg bg-primary-500 px-6 py-3 text-sm font-medium text-white transition-all hover:bg-primary-600"
          >
            View My Bookings
          </Link>
          <Link
            href="/sitters"
            className="inline-flex items-center justify-center rounded-lg border border-border bg-surface px-6 py-3 text-sm font-medium text-foreground transition-all hover:bg-surface-alt"
          >
            Browse More Sitters
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <Link
        href={`/sitters/${sitterId}`}
        className="mb-8 inline-flex items-center gap-1 text-sm font-medium text-text-tertiary hover:text-foreground transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to {sitter.displayName}
      </Link>

      <h1 className="text-2xl font-bold text-foreground">Book {sitter.displayName}</h1>
      <p className="mt-1 text-sm text-text-tertiary">
        ₹{sitter.pricePerNight}/night · {sitter.location}
      </p>

      {/* Progress */}
      <div className="mt-8 flex items-center gap-2">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-semibold transition-colors ${
                step >= s
                  ? "bg-primary-500 text-white"
                  : "bg-surface-alt text-text-tertiary"
              }`}
            >
              {step > s ? <Check className="h-4 w-4" /> : s}
            </div>
            {s < 3 && (
              <div
                className={`h-0.5 w-12 transition-colors ${
                  step > s ? "bg-primary-500" : "bg-border"
                }`}
              />
            )}
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-xs text-text-tertiary">
        <span>Select Pet</span>
        <span>Dates</span>
        <span>Confirm</span>
      </div>

      {/* Step 1: Select Pet */}
      {step === 1 && (
        <div className="mt-8">
          <h2 className="font-semibold text-foreground">Which pet needs care?</h2>
          {pets.length === 0 ? (
            <div className="mt-4 rounded-lg border border-dashed border-border bg-surface-alt p-6 text-center">
              <p className="text-sm text-text-tertiary">You have not added any pets yet.</p>
              <Link
                href="/onboarding"
                className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary-500 hover:text-primary-600"
              >
                Add a pet first
              </Link>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {pets.map((pet) => (
                <button
                  key={pet.id}
                  onClick={() => setSelectedPet(pet.id)}
                  className={`flex w-full items-center gap-4 rounded-lg border p-4 text-left transition-all ${
                    selectedPet === pet.id
                      ? "border-primary-300 bg-primary-50 ring-2 ring-primary-100"
                      : "border-border bg-surface hover:border-primary-100"
                  }`}
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-warm-50">
                    <PawPrint className="h-6 w-6 text-warm-500" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-foreground">{pet.name}</div>
                    <div className="text-sm text-text-tertiary">
                      {pet.breed} · {pet.age}
                    </div>
                  </div>
                  {selectedPet === pet.id && (
                    <Check className="h-5 w-5 text-primary-500" />
                  )}
                </button>
              ))}
            </div>
          )}
          <button
            onClick={() => selectedPet && setStep(2)}
            disabled={!selectedPet}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-primary-500 py-3.5 text-sm font-medium text-white transition-all hover:bg-primary-600 disabled:opacity-30"
          >
            Continue
          </button>
        </div>
      )}

      {/* Step 2: Select Dates */}
      {step === 2 && (
        <div className="mt-8">
          <h2 className="font-semibold text-foreground">Choose your dates</h2>
          <div className="mt-4 space-y-3">
            <div>
              <label className="text-sm text-text-tertiary">Drop-off date</label>
              <div className="mt-1.5 relative">
                <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  className="w-full rounded-lg border border-border bg-surface py-3 pl-10 pr-4 text-sm text-foreground focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100"
                />
              </div>
            </div>
            <div>
              <label className="text-sm text-text-tertiary">Pick-up date</label>
              <div className="mt-1.5 relative">
                <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate || new Date().toISOString().split("T")[0]}
                  className="w-full rounded-lg border border-border bg-surface py-3 pl-10 pr-4 text-sm text-foreground focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100"
                />
              </div>
            </div>
          </div>

          {startDate && endDate && (
            <div className="mt-4 rounded-lg bg-surface-alt p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-tertiary">
                  {nights} night{nights > 1 ? "s" : ""} × ₹{sitter.pricePerNight}
                </span>
                <span className="font-semibold text-foreground">₹{total.toLocaleString("en-IN")}</span>
              </div>
            </div>
          )}

          <div className="mt-6 flex gap-3">
            <button
              onClick={() => setStep(1)}
              className="flex-1 rounded-lg border border-border py-3.5 text-sm font-medium text-foreground transition-all hover:bg-surface-alt"
            >
              Back
            </button>
            <button
              onClick={() => startDate && endDate && setStep(3)}
              disabled={!startDate || !endDate}
              className="flex-1 rounded-lg bg-primary-500 py-3.5 text-sm font-medium text-white transition-all hover:bg-primary-600 disabled:opacity-30"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Confirm */}
      {step === 3 && (
        <div className="mt-8">
          <h2 className="font-semibold text-foreground">Review and Confirm</h2>

          <div className="mt-4 rounded-xl border border-border bg-surface p-5 space-y-4">
            <div className="flex items-center gap-3">
              <Avatar name={sitter.displayName} gender={sitter.gender} size="md" />
              <div>
                <div className="font-medium text-foreground">{sitter.displayName}</div>
                <div className="text-xs text-text-tertiary">{sitter.location}</div>
              </div>
            </div>

            <div className="border-t border-border-subtle pt-4 space-y-2.5 text-sm">
              <div className="flex justify-between">
                <span className="text-text-tertiary">Pet</span>
                <span className="font-medium text-foreground">
                  {pets.find((p) => p.id === selectedPet)?.name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-tertiary">Dates</span>
                <span className="font-medium text-foreground">
                  {startDate} to {endDate}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-tertiary">Duration</span>
                <span className="font-medium text-foreground">
                  {nights} night{nights > 1 ? "s" : ""}
                </span>
              </div>
            </div>

            <div className="border-t border-border-subtle pt-4">
              <div>
                <label className="text-sm text-text-tertiary">Special notes for the sitter</label>
                <textarea
                  value={specialNotes}
                  onChange={(e) => setSpecialNotes(e.target.value)}
                  placeholder="Any allergies, routines, or special instructions..."
                  rows={3}
                  className="mt-1.5 w-full rounded-lg border border-border bg-surface-alt p-3 text-sm text-foreground placeholder:text-text-tertiary focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100"
                />
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between rounded-lg bg-primary-50 p-4">
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <CreditCard className="h-4 w-4" />
              Total charge
            </div>
            <span className="text-lg font-bold text-foreground">₹{total.toLocaleString("en-IN")}</span>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              onClick={() => setStep(2)}
              className="flex-1 rounded-lg border border-border py-3.5 text-sm font-medium text-foreground transition-all hover:bg-surface-alt"
            >
              Back
            </button>
            <button
              onClick={handleConfirm}
              disabled={submitting}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-primary-500 py-3.5 text-sm font-medium text-white transition-all hover:bg-primary-600 active:scale-[0.98] disabled:opacity-50"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {submitting ? "Confirming..." : "Confirm Booking"}
            </button>
          </div>

          <p className="mt-3 text-center text-xs text-text-tertiary">
            You will only be charged after the sitter confirms.
          </p>
        </div>
      )}
    </div>
  );
}

export default function BookingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary-400" />
        </div>
      }
    >
      <BookingContent />
    </Suspense>
  );
}
