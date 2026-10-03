export const PET_TYPES = ["Dogs", "Cats", "Birds", "Rabbits", "Small pets", "Reptiles"] as const;

/** Singular form used on a pet record. */
export const PET_KINDS = ["Dog", "Cat", "Bird", "Rabbit", "Small pet", "Reptile"] as const;

export const SERVICES = [
  "Overnight stays",
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
  rescue: "Rescue / shelter",
  vet: "Vet clinic",
} as const;

export const ORG_SERVICES = {
  rescue: ["Adoption", "Fostering", "Animal rescue & pickup", "Volunteering", "Donations accepted", "Sterilisation drives"],
  vet: ["Emergency care", "Vaccination", "Surgery", "Diagnostics & lab", "Dental", "Grooming", "Boarding", "Home visits"],
} as const;
