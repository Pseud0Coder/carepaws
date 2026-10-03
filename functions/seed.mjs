// Seeds demo sitters, reviews and community posts with the Admin SDK.
// Replaces the old unauthenticated /api/seed endpoint.
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

const batch = db.batch();
sitters.forEach((s, n) =>
  batch.set(db.doc(`users/${s.uid}`), {
    ...s,
    photoURL: null,
    role: "sitter",
    onboarded: true,
    topRated: s.reviewCount >= 10 && s.rating >= 4.8,
    createdAt: daysAgo(400 - n * 30),
    updatedAt: daysAgo(1),
  })
);
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
await batch.commit();
console.log(`Seeded ${sitters.length} sitters, ${reviews.length} reviews, ${posts.length} posts into ${projectId}.`);
