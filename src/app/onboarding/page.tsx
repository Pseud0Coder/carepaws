"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  PawPrint,
  Home,
  Heart,
  ArrowRight,
  ArrowLeft,
  Check,
  MapPin,
  Phone,
  Plus,
  X,
  Shield,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";

type Step = "role" | "profile" | "pets" | "sitter-details" | "done";

const services = [
  "Overnight stays",
  "Dog walking",
  "Pet taxi",
  "Medication admin",
  "Cat boarding",
  "Small animal care",
  "Special needs care",
  "Adventure walks",
  "Training reinforcement",
  "Pet photography",
];

const petTypes = ["Dogs", "Cats", "Rabbits", "Birds", "Hamsters", "Reptiles"];

export default function OnboardingPage() {
  const router = useRouter();
  const { profile, user, setRole, updateProfileData, completeOnboarding, authFetch } = useAuth();
  const [step, setStep] = useState<Step>("role");

  // Profile fields
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [bio, setBio] = useState("");

  // Pet parent fields
  const [pets, setPets] = useState<{ name: string; type: string; breed: string; age: string; notes: string }[]>([]);
  const [petName, setPetName] = useState("");
  const [petType, setPetType] = useState("Dogs");
  const [petBreed, setPetBreed] = useState("");
  const [petAge, setPetAge] = useState("");
  const [petNotes, setPetNotes] = useState("");

  // Sitter fields
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedPetTypes, setSelectedPetTypes] = useState<string[]>([]);
  const [pricePerNight, setPricePerNight] = useState("");
  const [experience, setExperience] = useState("");

  const [saving, setSaving] = useState(false);

  const goNext = (s: Step) => setStep(s);
  const goBack = (s: Step) => setStep(s);

  const addPet = () => {
    if (!petName || !petBreed) return;
    setPets([...pets, { name: petName, type: petType, breed: petBreed, age: petAge, notes: petNotes }]);
    setPetName("");
    setPetBreed("");
    setPetAge("");
    setPetNotes("");
  };

  const removePet = (i: number) => {
    setPets(pets.filter((_, idx) => idx !== i));
  };

  const toggleService = (s: string) => {
    setSelectedServices((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  };

  const togglePetType = (t: string) => {
    setSelectedPetTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  };

  const finish = async () => {
    setSaving(true);
    try {
      // Save profile to Firestore
      await authFetch("/api/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: user?.uid,
          phone,
          location,
          bio: profile?.role === "sitter" ? bio : undefined,
          services: profile?.role === "sitter" ? selectedServices : undefined,
          petTypes: profile?.role === "sitter" ? selectedPetTypes : undefined,
          pricePerNight: profile?.role === "sitter" ? Number(pricePerNight) || 0 : undefined,
          experience: profile?.role === "sitter" ? experience : undefined,
          verified: false,
          topRated: false,
          rating: 0,
          reviewCount: 0,
          responseTime: "Within 2 hours",
          acceptanceRate: 100,
          repeatClients: 0,
          totalEarnings: 0,
          totalBookings: 0,
        }),
      });

      // Save pets to Firestore
      for (const pet of pets) {
        await authFetch("/api/pets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user?.uid,
            ownerId: user?.uid,
            ...pet,
          }),
        });
      }

      updateProfileData({ phone, location, bio });
      completeOnboarding();
      router.push("/dashboard");
    } catch (e) {
      console.error("Failed to save:", e);
    } finally {
      setSaving(false);
    }
  };

  if (!profile) return null;

  const stepList = ["role", "profile", profile.role === "sitter" ? "sitter-details" : "pets", "done"];
  const currentIdx = stepList.indexOf(step);

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-6 py-12">
      <div className="w-full max-w-lg">
        {/* Progress bar */}
        <div className="mb-10">
          <div className="flex items-center gap-2">
            {stepList.map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-semibold transition-all ${
                    i <= currentIdx
                      ? "bg-primary-500 text-white"
                      : "bg-surface-alt text-text-tertiary"
                  }`}
                >
                  {i < currentIdx ? <Check className="h-4 w-4" /> : i + 1}
                </div>
                {i < stepList.length - 1 && (
                  <div
                    className={`h-0.5 w-8 transition-colors ${
                      i < currentIdx ? "bg-primary-500" : "bg-border"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step: Role Selection */}
        {step === "role" && (
          <div>
            <h1 className="text-2xl font-bold text-foreground">How will you use CarePaws?</h1>
            <p className="mt-2 text-text-tertiary">Choose the option that best describes you</p>

            <div className="mt-8 space-y-4">
              <button
                onClick={() => {
                  setRole("parent");
                  goNext("profile");
                }}
                className="flex w-full items-center gap-5 rounded-xl border-2 border-border bg-surface p-6 text-left transition-all hover:border-primary-300 hover:bg-primary-50 active:scale-[0.98]"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-warm-50 text-warm-500">
                  <Heart className="h-7 w-7" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">Pet Parent</h3>
                  <p className="mt-1 text-sm text-text-tertiary">
                    I need someone to care for my pets while I am away
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 text-text-tertiary" />
              </button>

              <button
                onClick={() => {
                  setRole("sitter");
                  goNext("profile");
                }}
                className="flex w-full items-center gap-5 rounded-xl border-2 border-border bg-surface p-6 text-left transition-all hover:border-accent-300 hover:bg-accent-50 active:scale-[0.98]"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-accent-50 text-accent-500">
                  <PawPrint className="h-7 w-7" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">Pet Sitter</h3>
                  <p className="mt-1 text-sm text-text-tertiary">
                    I want to offer my home and skills to care for pets
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 text-text-tertiary" />
              </button>
            </div>
          </div>
        )}

        {/* Step: Profile */}
        {step === "profile" && (
          <div>
            <h1 className="text-2xl font-bold text-foreground">Complete your profile</h1>
            <p className="mt-2 text-text-tertiary">A few details to help others know you</p>

            <div className="mt-8 space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground">Full Name</label>
                <input
                  type="text"
                  value={profile.displayName}
                  disabled
                  className="mt-1.5 w-full rounded-lg border border-border bg-surface-alt px-4 py-3 text-sm text-text-tertiary"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Phone Number</label>
                <div className="mt-1.5 relative">
                  <Phone className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
                  <input
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full rounded-lg border border-border bg-surface py-3 pl-10 pr-4 text-sm text-foreground placeholder:text-text-tertiary focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Location</label>
                <div className="mt-1.5 relative">
                  <MapPin className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
                  <input
                    type="text"
                    placeholder="e.g. Bandra, Mumbai"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full rounded-lg border border-border bg-surface py-3 pl-10 pr-4 text-sm text-foreground placeholder:text-text-tertiary focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100"
                  />
                </div>
              </div>
              {profile.role === "sitter" && (
                <div>
                  <label className="text-sm font-medium text-foreground">Short Bio</label>
                  <textarea
                    placeholder="Tell pet parents about yourself and your experience..."
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={3}
                    className="mt-1.5 w-full rounded-lg border border-border bg-surface p-4 text-sm text-foreground placeholder:text-text-tertiary focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100"
                  />
                </div>
              )}
            </div>

            <div className="mt-8 flex gap-3">
              <button
                onClick={() => goBack("role")}
                className="flex items-center gap-1 rounded-lg border border-border px-5 py-3 text-sm font-medium text-text-secondary transition-all hover:bg-surface-alt"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
              <button
                onClick={() => goNext(profile.role === "sitter" ? "sitter-details" : "pets")}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary-500 py-3 text-sm font-medium text-white transition-all hover:bg-primary-600 active:scale-[0.98]"
              >
                Continue <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step: Add Pets (Parent) */}
        {step === "pets" && (
          <div>
            <h1 className="text-2xl font-bold text-foreground">Add your pets</h1>
            <p className="mt-2 text-text-tertiary">Add at least one pet, or skip for now</p>

            {pets.length > 0 && (
              <div className="mt-6 space-y-3">
                {pets.map((pet, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-lg border border-border bg-surface p-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warm-50">
                      <PawPrint className="h-5 w-5 text-warm-500" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-foreground">{pet.name}</div>
                      <div className="text-xs text-text-tertiary">{pet.breed} · {pet.type}</div>
                    </div>
                    <button onClick={() => removePet(i)} className="text-text-tertiary hover:text-error transition-colors">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6 rounded-lg border border-dashed border-border bg-surface-alt p-5">
              <h3 className="text-sm font-medium text-foreground">Add a pet</h3>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Pet name"
                  value={petName}
                  onChange={(e) => setPetName(e.target.value)}
                  className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-text-tertiary focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100"
                />
                <select
                  value={petType}
                  onChange={(e) => setPetType(e.target.value)}
                  className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-foreground focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100"
                >
                  <option>Dogs</option>
                  <option>Cats</option>
                  <option>Rabbits</option>
                  <option>Birds</option>
                  <option>Hamsters</option>
                  <option>Reptiles</option>
                </select>
                <input
                  type="text"
                  placeholder="Breed"
                  value={petBreed}
                  onChange={(e) => setPetBreed(e.target.value)}
                  className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-text-tertiary focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100"
                />
                <input
                  type="text"
                  placeholder="Age"
                  value={petAge}
                  onChange={(e) => setPetAge(e.target.value)}
                  className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-text-tertiary focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100"
                />
              </div>
              <textarea
                placeholder="Special notes (allergies, routines, etc.)"
                value={petNotes}
                onChange={(e) => setPetNotes(e.target.value)}
                rows={2}
                className="mt-3 w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-text-tertiary focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100"
              />
              <button
                onClick={addPet}
                disabled={!petName || !petBreed}
                className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary-500 py-2.5 text-sm font-medium text-white transition-all hover:bg-primary-600 disabled:opacity-30"
              >
                <Plus className="h-4 w-4" /> Add Pet
              </button>
            </div>

            <div className="mt-8 flex gap-3">
              <button
                onClick={() => goBack("profile")}
                className="flex items-center gap-1 rounded-lg border border-border px-5 py-3 text-sm font-medium text-text-secondary transition-all hover:bg-surface-alt"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
              <button
                onClick={() => goNext("done")}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary-500 py-3 text-sm font-medium text-white transition-all hover:bg-primary-600 active:scale-[0.98]"
              >
                {pets.length === 0
                  ? "Skip for now"
                  : `Continue with ${pets.length} pet${pets.length > 1 ? "s" : ""}`}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step: Sitter Details */}
        {step === "sitter-details" && (
          <div>
            <h1 className="text-2xl font-bold text-foreground">Set up your sitter profile</h1>
            <p className="mt-2 text-text-tertiary">Help pet parents understand what you offer</p>

            <div className="mt-8 space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Services you offer</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {services.map((s) => (
                    <button
                      key={s}
                      onClick={() => toggleService(s)}
                      className={`rounded-lg px-3.5 py-1.5 text-xs font-medium transition-colors ${
                        selectedServices.includes(s)
                          ? "bg-accent-500 text-white"
                          : "bg-surface-alt text-text-secondary hover:bg-border"
                      }`}
                    >
                      {selectedServices.includes(s) && <Check className="mr-1 inline h-3 w-3" />}
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-foreground">Pets you can care for</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {petTypes.map((t) => (
                    <button
                      key={t}
                      onClick={() => togglePetType(t)}
                      className={`rounded-lg px-3.5 py-1.5 text-xs font-medium transition-colors ${
                        selectedPetTypes.includes(t)
                          ? "bg-warm-500 text-white"
                          : "bg-surface-alt text-text-secondary hover:bg-border"
                      }`}
                    >
                      {selectedPetTypes.includes(t) && <Check className="mr-1 inline h-3 w-3" />}
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground">Price per night (₹)</label>
                  <input
                    type="number"
                    placeholder="e.g. 2000"
                    value={pricePerNight}
                    onChange={(e) => setPricePerNight(e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-border bg-surface px-4 py-3 text-sm text-foreground placeholder:text-text-tertiary focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Experience</label>
                  <select
                    value={experience}
                    onChange={(e) => setExperience(e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-border bg-surface px-4 py-3 text-sm text-foreground focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100"
                  >
                    <option value="">Select</option>
                    <option value="<1 year">Less than 1 year</option>
                    <option value="1-3 years">1 to 3 years</option>
                    <option value="3-5 years">3 to 5 years</option>
                    <option value="5+ years">5+ years</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="mt-8 flex gap-3">
              <button
                onClick={() => goBack("profile")}
                className="flex items-center gap-1 rounded-lg border border-border px-5 py-3 text-sm font-medium text-text-secondary transition-all hover:bg-surface-alt"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
              <button
                onClick={() => goNext("done")}
                disabled={saving}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-accent-500 py-3 text-sm font-medium text-white transition-all hover:bg-accent-600 active:scale-[0.98] disabled:opacity-50"
              >
                <Shield className="h-4 w-4" /> {saving ? "Saving..." : "Complete Setup"}
              </button>
            </div>
          </div>
        )}

        {/* Step: Done */}
        {step === "done" && (
          <div className="text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-accent-50">
              <Check className="h-10 w-10 text-accent-600" />
            </div>
            <h1 className="mt-6 text-2xl font-bold text-foreground">
              {profile.role === "sitter" ? "Your sitter profile is ready" : "You are all set"}
            </h1>
            <p className="mt-3 text-text-tertiary">
              {profile.role === "sitter"
                ? "Your profile is now visible to pet parents. You will start receiving booking requests soon."
                : "Start browsing verified pet sitters in your area and book the perfect match for your furry family."}
            </p>

            <div className="mt-8 space-y-3">
              <button
                onClick={finish}
                disabled={saving}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary-500 py-3.5 text-sm font-medium text-white transition-all hover:bg-primary-600 active:scale-[0.98] disabled:opacity-50"
              >
                <Home className="h-4 w-4" /> {saving ? "Saving..." : "Go to Dashboard"}
              </button>
              {profile.role === "parent" && (
                <button
                  onClick={finish}
                  disabled={saving}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-surface py-3.5 text-sm font-medium text-foreground transition-all hover:bg-surface-alt disabled:opacity-50"
                >
                  <PawPrint className="h-4 w-4" /> Browse Sitters
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
