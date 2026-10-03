// Seeds DEMO sitters, rescues, vet clinics, vouches, reviews and community posts
// with the Admin SDK. Replaces the old unauthenticated /api/seed endpoint.
//
// Everything here is fictional. Phone numbers are deliberately invalid
// placeholders (+91 00000 000NN) so a demo build can never ring a real person.
// Don't run this against a production project.
//
//   Production:  GOOGLE_APPLICATION_CREDENTIALS=key.json node seed.mjs --project <id>
//   Emulator:    FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 node seed.mjs --project demo-carepaws
import { initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

const i = process.argv.indexOf("--project");
const projectId = i > -1 ? process.argv[i + 1] : process.env.GCLOUD_PROJECT;
if (!projectId) {
  console.error("Pass --project <firebase-project-id>");
  process.exit(1);
}
initializeApp({ projectId });
const db = getFirestore();

const daysAgo = (n) => Timestamp.fromMillis(Date.now() - n * 864e5);
const ALL_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const sitters = [
  {
    uid: "seed_sitter_priya",
    displayName: "Priya Sharma",
    location: "Bandra, Mumbai",
    bio: "Animal lover with eight years of pet sitting in Mumbai. Certified in pet first aid, and every guest gets daily photo updates.",
    services: ["Overnight stays", "Dog walking", "Pet taxi", "Medication"],
    petTypes: ["Dogs", "Cats", "Rabbits"],
    pricePerNight: 2500,
    experience: "8 years",
    availability: ALL_DAYS,
    responseTime: "Within an hour",
    verified: true,
    rating: 4.9,
    reviewCount: 127,
    completedStays: 140,
  },
  {
    uid: "seed_sitter_arjun",
    displayName: "Arjun Menon",
    location: "Koramangala, Bengaluru",
    bio: "I work from home, so your pet gets company all day, long walks morning and evening, and a quiet flat with a balcony garden.",
    services: ["Overnight stays", "Dog walking", "Training reinforcement"],
    petTypes: ["Dogs", "Cats"],
    pricePerNight: 1800,
    experience: "5 years",
    availability: ["Mon", "Tue", "Wed", "Thu", "Fri"],
    responseTime: "Within a few hours",
    verified: true,
    rating: 4.8,
    reviewCount: 89,
    completedStays: 96,
  },
  {
    uid: "seed_sitter_sneha",
    displayName: "Dr. Sneha Kapoor",
    location: "Hauz Khas, Delhi",
    bio: "Veterinary professional turned full-time sitter. Comfortable with medication schedules, senior pets and special-needs care.",
    services: ["Overnight stays", "Medication", "Special needs care", "Drop-in visits"],
    petTypes: ["Dogs", "Cats", "Birds", "Reptiles"],
    pricePerNight: 3000,
    experience: "12 years",
    availability: ALL_DAYS,
    responseTime: "Within an hour",
    verified: true,
    rating: 5.0,
    reviewCount: 203,
    completedStays: 230,
  },
  {
    uid: "seed_sitter_vikram",
    displayName: "Vikram Singh",
    location: "Koregaon Park, Pune",
    bio: "Retired army officer with a big garden and two friendly Indie dogs of my own. High-energy dogs are very welcome.",
    services: ["Overnight stays", "Dog walking"],
    petTypes: ["Dogs"],
    pricePerNight: 1500,
    experience: "3 years",
    availability: ["Mon", "Wed", "Fri", "Sat", "Sun"],
    responseTime: "Within a few hours",
    verified: true,
    rating: 4.7,
    reviewCount: 64,
    completedStays: 70,
  },
  {
    uid: "seed_sitter_meera",
    displayName: "Meera Iyer",
    location: "Adyar, Chennai",
    bio: "Cat specialist with a calm, quiet home. Separate rooms for shy guests, and I care for rabbits and small pets too.",
    services: ["Overnight stays", "Drop-in visits", "Medication", "Grooming"],
    petTypes: ["Cats", "Rabbits", "Small pets"],
    pricePerNight: 2000,
    experience: "7 years",
    availability: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    responseTime: "Within an hour",
    verified: true,
    rating: 4.9,
    reviewCount: 156,
    completedStays: 160,
  },
  {
    uid: "seed_sitter_rohan",
    displayName: "Rohan Das",
    location: "Anjuna, Goa",
    bio: "Outdoor enthusiast: beach runs, trail hikes and park playdates. Your pup will come home happy and tired.",
    services: ["Overnight stays", "Dog walking", "Pet taxi"],
    petTypes: ["Dogs"],
    pricePerNight: 2200,
    experience: "2 years",
    availability: ["Tue", "Thu", "Fri", "Sat", "Sun"],
    responseTime: "Within a day",
    verified: false,
    rating: 4.6,
    reviewCount: 42,
    completedStays: 45,
  },
];

const reviews = [
  ["seed_sitter_priya", "Ananya Mehta", 5, "Dog", "Priya was wonderful with our Labrador, Bruno. Daily photos and updates — he came home happy and well cared for."],
  ["seed_sitter_sneha", "Deepak Kumar", 5, "Cat", "Our senior cat needs insulin twice a day and Dr. Sneha handled it perfectly. Total peace of mind.", "Thank you, Deepak! Muffin was a perfect guest."],
  ["seed_sitter_arjun", "Kavitha Lakshmi", 4, "Dog", "Our two Indies usually have separation anxiety but seemed completely at ease at Arjun's place."],
  ["seed_sitter_meera", "Tushar Hegde", 5, "Cat", "Meera is the cat whisperer. Our shy rescue came out of her shell within two days."],
  ["seed_sitter_vikram", "Pooja Wadhwa", 5, "Dog", "Perfect for our high-energy Golden Retriever. The big garden was a huge plus."],
  ["seed_sitter_priya", "Rohan Mehta", 5, "Cat", "Second stay with Priya and she's consistently excellent — organised, punctual updates, happy cat."],
  ["seed_sitter_sneha", "Shreya Patel", 5, "Bird", "We were nervous leaving our parrot, but her veterinary background put us at ease. She even noticed a change in his plumage."],
  ["seed_sitter_rohan", "Karan Bhat", 4, "Dog", "Max came back muddy but ecstatic after a beach hike. Pickup ran a little late, but the care was great."],
  ["seed_sitter_meera", "Divya Nair", 5, "Rabbit", "Meera cared for our two rabbits for a week, sent daily photos and even trimmed their nails."],
];

const posts = [
  ["seed_parent_ananya", "Ananya Mehta", "parent", "tip", "Preparing your dog for their first boarding stay", "Start with a short day visit so your dog gets to know the sitter's home. Leave a worn t-shirt with your scent, and keep the goodbye brief and cheerful."],
  ["seed_sitter_sneha", "Dr. Sneha Kapoor", "sitter", "tip", "A medication checklist before you travel", "Write down doses and timings, pack extra medication in case of delays, and leave your vet's number with written permission for emergency treatment."],
  ["seed_parent_kavitha", "Kavitha Lakshmi", "parent", "question", "How do you handle separation anxiety?", "My Indie dogs get very anxious when I leave. Any tips from sitters or experienced parents on making the handover smoother?"],
  ["seed_parent_tushar", "Tushar Hegde", "parent", "story", "Boarding a senior cat with diabetes", "I was terrified to leave Muffin for the first time, but our sitter handled her insulin perfectly. Daily updates made the whole trip relaxing."],
  ["seed_sitter_meera", "Meera Iyer", "sitter", "tip", "A calm space for boarding cats", "A quiet room away from household noise, a separate litter tray per cat and keeping their usual feeding times makes a huge difference."],
];


// [uid, name, role, location, address, lat, lng, hours, open24x7, services, petTypes, bio]
const orgs = [
  ["seed_org_pawsitive", "Pawsitive Purpose Rescue", "rescue", "Bandra West, Mumbai", "12 Hill Road, Bandra West", 19.0596, 72.8295, "Daily, 10am–6pm", false,
    ["Adoption", "Fostering", "Animal rescue & pickup", "Donations accepted"], ["Dogs", "Cats"],
    "A volunteer-run rescue home for street dogs and cats. We rehabilitate, sterilise and rehome, and we always need fosters."],
  ["seed_org_strayhaven", "Stray Haven Shelter", "rescue", "Koramangala, Bengaluru", "4th Block, Koramangala", 12.9352, 77.6245, "Tue–Sun, 11am–5pm", false,
    ["Adoption", "Volunteering", "Sterilisation drives"], ["Dogs", "Cats", "Rabbits"],
    "Shelter for 60 rescued animals with weekend adoption days and a volunteer walking programme."],
  ["seed_org_secondchance", "Second Chance Animal Rescue", "rescue", "Hauz Khas, Delhi", "Deer Park Road, Hauz Khas", 28.5494, 77.2001, "Mon–Sat, 10am–5pm", false,
    ["Adoption", "Fostering", "Animal rescue & pickup"], ["Dogs", "Cats", "Birds"],
    "Emergency rescue and rehabilitation for injured strays, with a foster network across South Delhi."],
  ["seed_org_kaveri", "Kaveri Paws Foundation", "rescue", "Koregaon Park, Pune", "Lane 5, Koregaon Park", 18.5362, 73.8938, "Daily, 9am–5pm", false,
    ["Adoption", "Donations accepted", "Volunteering"], ["Dogs"],
    "A small sanctuary for senior and special-needs dogs."],
  ["seed_org_adyarcats", "Adyar Cat Sanctuary", "rescue", "Adyar, Chennai", "Gandhi Nagar, Adyar", 13.0067, 80.2573, "Wed–Sun, 11am–4pm", false,
    ["Adoption", "Fostering", "Sterilisation drives"], ["Cats"],
    "A calm sanctuary for rescued cats and kittens, with adoption by appointment."],
  ["seed_vet_anand", "Anand Clinic for Animals", "vet", "Andheri West, Mumbai", "Lokhandwala Complex, Andheri West", 19.1364, 72.8296, "Mon–Sat, 9am–8pm", false,
    ["Vaccination", "Surgery", "Diagnostics & lab", "Dental"], ["Dogs", "Cats", "Rabbits"],
    "Family-run small-animal clinic with in-house diagnostics and day-care surgery."],
  ["seed_vet_city24", "City 24×7 Pet Hospital", "vet", "Bandra West, Mumbai", "Linking Road, Bandra West", 19.0544, 72.8402, "Open 24×7", true,
    ["Emergency care", "Surgery", "Diagnostics & lab", "Vaccination"], ["Dogs", "Cats", "Birds", "Reptiles"],
    "Round-the-clock emergency and critical care with an on-site ICU."],
  ["seed_vet_indira", "Indiranagar Animal Hospital", "vet", "Indiranagar, Bengaluru", "100 Feet Road, Indiranagar", 12.9784, 77.6408, "Open 24×7", true,
    ["Emergency care", "Surgery", "Vaccination", "Boarding"], ["Dogs", "Cats", "Small pets"],
    "Emergency vets on duty every night, with an ambulance for pet pickups."],
  ["seed_vet_kora", "Koramangala Vet Care", "vet", "Koramangala, Bengaluru", "5th Block, Koramangala", 12.9279, 77.6271, "Mon–Sat, 10am–7pm", false,
    ["Vaccination", "Grooming", "Dental", "Home visits"], ["Dogs", "Cats"],
    "Friendly neighbourhood clinic with home visits for anxious pets."],
  ["seed_vet_hauz", "Hauz Khas Veterinary Centre", "vet", "Hauz Khas, Delhi", "Aurobindo Marg, Hauz Khas", 28.5535, 77.1941, "Open 24×7", true,
    ["Emergency care", "Surgery", "Diagnostics & lab"], ["Dogs", "Cats", "Birds", "Reptiles"],
    "Specialist referral centre with exotic-pet care and 24-hour emergency cover."],
  ["seed_vet_pune", "Pune Pet Emergency Clinic", "vet", "Koregaon Park, Pune", "North Main Road, Koregaon Park", 18.5314, 73.8446, "Open 24×7", true,
    ["Emergency care", "Vaccination", "Home visits"], ["Dogs", "Cats"],
    "Night and weekend emergency clinic for dogs and cats."],
  ["seed_vet_adyar", "Adyar Animal Clinic", "vet", "Adyar, Chennai", "Besant Avenue, Adyar", 13.0012, 80.2565, "Mon–Sat, 9am–7pm", false,
    ["Vaccination", "Surgery", "Grooming"], ["Dogs", "Cats", "Rabbits"],
    "General practice with a special interest in feline medicine."],
  ["seed_vet_goa", "Anjuna Vet & Rescue Clinic", "vet", "Anjuna, Goa", "Anjuna Beach Road", 15.5736, 73.7413, "Open 24×7", true,
    ["Emergency care", "Vaccination"], ["Dogs", "Cats"],
    "Beachside clinic treating tourists' pets and local strays, day and night."],
];

// [orgId, sitterId, note]
const vouches = [
  ["seed_org_pawsitive", "seed_sitter_priya", "Priya has fostered for us for three years."],
  ["seed_vet_anand", "seed_sitter_priya", "Reliable with post-surgery care and medication."],
  ["seed_vet_hauz", "seed_sitter_sneha"],
  ["seed_org_secondchance", "seed_sitter_sneha", "Our go-to foster home for medical cases."],
  ["seed_org_adyarcats", "seed_sitter_meera", "Wonderful with shy and traumatised cats."],
  ["seed_vet_adyar", "seed_sitter_meera"],
  ["seed_org_strayhaven", "seed_sitter_arjun"],
  ["seed_org_kaveri", "seed_sitter_vikram", "Great with senior dogs."],
];
const vouchCounts = {};
for (const [, sitterId] of vouches) vouchCounts[sitterId] = (vouchCounts[sitterId] ?? 0) + 1;

const homes = {
  seed_sitter_priya: { type: "apartment", fencedYard: false, hasOwnPets: true, ownPets: "1 Indie cat (vaccinated)", children: false, smokeFree: true, maxHoursAlone: 2 },
  seed_sitter_arjun: { type: "apartment", fencedYard: false, hasOwnPets: false, ownPets: "", children: false, smokeFree: true, maxHoursAlone: 4 },
  seed_sitter_sneha: { type: "house", fencedYard: true, hasOwnPets: true, ownPets: "2 dogs, 1 parrot (all vaccinated)", children: false, smokeFree: true, maxHoursAlone: 0 },
  seed_sitter_vikram: { type: "house", fencedYard: true, hasOwnPets: true, ownPets: "2 Indie dogs (vaccinated)", children: true, smokeFree: true, maxHoursAlone: 2 },
  seed_sitter_meera: { type: "apartment", fencedYard: false, hasOwnPets: true, ownPets: "3 cats (vaccinated)", children: false, smokeFree: true, maxHoursAlone: 4 },
  seed_sitter_rohan: { type: "farm", fencedYard: true, hasOwnPets: false, ownPets: "", children: false, smokeFree: false, maxHoursAlone: 6 },
};
const batch = db.batch();
sitters.forEach((s, n) => {
  // Rohan is the demo of a sitter still waiting for identity verification: he is hidden until approved.
  const pending = !s.verified;
  batch.set(db.doc(`kyc/${s.uid}`), pending
    ? { status: "submitted", legalName: s.displayName, idType: "aadhaar", idLast4: "0000", hasPoliceCert: false, submittedAt: daysAgo(1), seeded: true }
    : { status: "approved", legalName: s.displayName, idType: "aadhaar", idLast4: "0000", hasPoliceCert: false, reviewedAt: daysAgo(30), reviewedBy: "seed", seeded: true });
  batch.set(db.doc(`users/${s.uid}`), {
    ...s,
    home: homes[s.uid],
    backgroundChecked: s.uid === "seed_sitter_priya" || s.uid === "seed_sitter_sneha",
    photoURL: null,
    role: "sitter",
    onboarded: true,
    topRated: s.reviewCount >= 10 && s.rating >= 4.8,
    vouchCount: vouchCounts[s.uid] ?? 0,
    createdAt: daysAgo(400 - n * 30),
    updatedAt: daysAgo(1),
  });
});
reviews.forEach(([sitterId, author, rating, petType, text, response], n) =>
  batch.set(db.doc(`reviews/seed_booking_${n + 1}`), {
    sitterId,
    bookingId: `seed_booking_${n + 1}`,
    authorId: `seed_parent_${n + 1}`,
    author,
    authorPhoto: null,
    rating,
    text,
    petType,
    helpfulBy: [],
    ...(response ? { response, responseAt: daysAgo(n * 6 + 1) } : {}),
    createdAt: daysAgo(n * 6 + 2),
  })
);
posts.forEach(([authorId, author, authorRole, category, title, text], n) =>
  batch.set(db.doc(`posts/seed_post_${n + 1}`), {
    authorId,
    author,
    authorPhoto: null,
    authorRole,
    category,
    title,
    text,
    likedBy: [],
    commentCount: 0,
    createdAt: daysAgo(n * 3 + 1),
  })
);
orgs.forEach(([uid, displayName, role, location, address, lat, lng, hours, open24x7, services, petTypes, bio], n) =>
  batch.set(db.doc(`users/${uid}`), {
    uid,
    displayName,
    photoURL: null,
    role,
    onboarded: true,
    verified: true,
    location,
    address,
    lat,
    lng,
    hours,
    ...(role === "vet" ? { open24x7 } : {}),
    services,
    petTypes,
    bio,
    phone: `+91 00000 000${String(n + 1).padStart(2, "0")}`,
    website: "https://example.org",
    createdAt: daysAgo(300 - n * 10),
    updatedAt: daysAgo(1),
  })
);
const orgById = Object.fromEntries(orgs.map((o) => [o[0], o]));
vouches.forEach(([orgId, sitterId, note], n) =>
  batch.set(db.doc(`vouches/${orgId}_${sitterId}`), {
    orgId,
    orgName: orgById[orgId][1],
    orgPhoto: null,
    orgType: orgById[orgId][2],
    sitterId,
    ...(note ? { note } : {}),
    createdAt: daysAgo(60 - n * 5),
  })
);
await batch.commit();
console.log(
  `Seeded ${sitters.length} sitters, ${orgs.length} rescues & clinics, ${vouches.length} vouches, ${reviews.length} reviews, ${posts.length} posts into ${projectId}.`
);
