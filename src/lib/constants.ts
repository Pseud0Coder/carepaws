export const PET_TYPES = ["Dogs", "Cats", "Birds", "Rabbits", "Small pets", "Reptiles"] as const;

/** Singular form used on a pet record. */
export const PET_KINDS = ["Dog", "Cat", "Bird", "Rabbit", "Small pet", "Reptile"] as const;

export const SERVICES = [
  "Overnight stays",
  "House sitting",
  "Drop-in visits",
  "Dog walking",
  "Medication",
  "Special needs care",
  "Pet taxi",
  "Grooming",
  "Training reinforcement",
] as const;

export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export const PET_EMOJI: Record<string, string> = {
  Dog: "🐕",
  Dogs: "🐕",
  Cat: "🐈",
  Cats: "🐈",
  Bird: "🦜",
  Birds: "🦜",
  Rabbit: "🐇",
  Rabbits: "🐇",
  "Small pet": "🐹",
  "Small pets": "🐹",
  Reptile: "🦎",
  Reptiles: "🦎",
};

/** Mirrors the platform fee the payout copy refers to. */
export const PLATFORM_FEE_RATE = 0.1;

export const ROLE_LABEL = {
  parent: "Pet parent",
  sitter: "Sitter",
  explorer: "Just looking around",
  rescue: "Rescue / shelter",
  vet: "Vet clinic",
} as const;

export const ORG_SERVICES = {
  rescue: ["Adoption", "Fostering", "Animal rescue & pickup", "Volunteering", "Donations accepted", "Sterilisation drives"],
  vet: ["Emergency care", "Vaccination", "Surgery", "Diagnostics & lab", "Dental", "Grooming", "Boarding", "Home visits"],
} as const;

export const HOME_TYPES = [
  { id: "apartment", label: "Apartment" },
  { id: "house", label: "House" },
  { id: "farm", label: "Farm / large plot" },
] as const;

/** ID documents accepted for KYC. `address` = shows a residential address, so no separate proof is needed. */
export const KYC_ID_TYPES = [
  { id: "aadhaar", label: "Aadhaar (masked)", address: true, back: true, hint: "Use a masked Aadhaar showing only the last 4 digits. Don’t upload the full number." },
  { id: "passport", label: "Passport", address: true, back: true, hint: "Photo page and address page." },
  { id: "driving_licence", label: "Driving licence", address: true, back: true, hint: "Front and back." },
  { id: "voter_id", label: "Voter ID (EPIC)", address: true, back: true, hint: "Front and back." },
  { id: "pan", label: "PAN card", address: false, back: false, hint: "PAN doesn’t show an address, so you’ll add an address proof too." },
] as const;

/** Version of the sitter care standards below. Bump when the wording changes. */
export const SITTER_DECLARATIONS_VERSION = 1;

/** Every sitter must agree to all of these. They are stored with the KYC case as a record. */
export const SITTER_DECLARATIONS = [
  { key: "honestProfile", text: "Everything I’ve told CarePaws about myself, my home and my ID is true, and the documents are mine." },
  { key: "safeHome", text: "My home is safe for animals: windows and balconies are secured, fences and gates are escape-proof, and toxic plants, chemicals and medicines are out of reach." },
  { key: "ownPetsDisclosed", text: "Any pets I live with are vaccinated, have no history of aggression, and are listed on my profile." },
  { key: "noUnattended", text: "I won’t leave a pet alone for longer than the maximum hours on my profile, and never in a car or locked outdoors." },
  { key: "dailyUpdates", text: "I’ll send the pet parent at least one photo update every day of a stay." },
  { key: "personalCare", text: "I’ll care for the pet myself and won’t hand them to anyone else or sub-let the stay." },
  { key: "humaneHandling", text: "I’ll use only kind, humane handling: no hitting, shock or prong collars, or confinement as punishment." },
  { key: "emergencyPlan", text: "If a pet seems unwell or is injured, I’ll contact the pet parent and a vet straight away, and log it in the app." },
  { key: "reportIncidents", text: "I’ll report any injury, escape, fight or other incident to the pet parent immediately and record it in the stay log." },
] as const;

// ─── Pet care sheet ────────────────────────────────────────────────────────

export const VACCINATION = [
  { id: "up_to_date", label: "Up to date" },
  { id: "partial", label: "Partly vaccinated" },
  { id: "none", label: "Not vaccinated" },
] as const;

/** Behaviour a sitter needs to know about. Honest answers here protect the pet, the sitter and other animals. */
export const TEMPERAMENTS = [
  "Friendly with dogs",
  "Friendly with cats",
  "Good with children",
  "Shy or anxious",
  "Separation anxiety",
  "Reactive on the leash",
  "Afraid of loud noises",
  "Escape artist",
  "Guards food or toys",
  "Has bitten someone",
] as const;

// ─── Pet parent declarations ───────────────────────────────────────────────

/** Version of the declarations below. Bump when the wording changes; each booking stores the version signed. */
export const DECLARATIONS_VERSION = 1;

/** Affirmed on every booking. Each one is stored with the booking, with the date, as the record of what was disclosed. */
export const PARENT_DECLARATIONS = [
  { key: "vaccinated", text: "My pet’s core vaccinations (including rabies for dogs and cats) are up to date, and I can show the records if asked." },
  { key: "parasiteControl", text: "My pet is on regular flea, tick and worming prevention." },
  { key: "healthDisclosed", text: "I’ve told the sitter about every medical condition, allergy, medication and dietary need, in the care sheet." },
  { key: "behaviourDisclosed", text: "I’ve disclosed any history of biting, aggression, escaping, destructive behaviour, separation anxiety or fears. Nothing is left out." },
  { key: "noContagious", text: "My pet shows no sign of a contagious illness right now, and isn’t pregnant or in heat (or I’ve told the sitter)." },
  { key: "ownerAuthorised", text: "I’m the pet’s owner, or authorised to book for them, and everything I’ve entered is true." },
  { key: "conditionRecord", text: "I understand pre-existing conditions and injuries aren’t the sitter’s responsibility. I’ll record my pet’s condition at drop-off in the app." },
  { key: "inherentRisk", text: "I understand pets can get stressed, ill or hurt even with good care. I’ll raise any concern within 24 hours, using the stay log and photos." },
  { key: "emergencyAuth", text: "If I can’t be reached, I authorise the sitter to get emergency veterinary treatment up to the limit below, and I’ll reimburse reasonable emergency costs." },
  { key: "policy", text: "I agree to the Terms and the Pet care policy." },
] as const;

/** Added when care happens at the pet parent's home. This is where "my house is pet-proofed" lives. */
export const HOME_DECLARATIONS = [
  { key: "homePetProofed", text: "My home is pet-proofed: toxic plants, chemicals, medicines and food are out of reach; cords, small objects and bins are secured; windows, balconies and gates are safe." },
  { key: "homeHazardsDisclosed", text: "I’ve told the sitter about any hazards, off-limits areas, and any cameras or recording devices in my home." },
  { key: "homeAccessSafe", text: "I’ll share keys and access codes only through the app chat, and the sitter will have what they need (food, supplies, leash, carrier)." },
] as const;

export const EMERGENCY_LIMITS = [2000, 5000, 10000, 25000, 50000] as const;
