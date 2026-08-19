import { initializeApp, getApps } from "firebase/app";
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  writeBatch,
  increment,
  arrayUnion,
  arrayRemove,
  DocumentData,
  QueryConstraint,
} from "firebase/firestore";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";


const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const db = getFirestore(app);
export const storage = getStorage(app);

// Helper to convert Firestore timestamps
function convertTimestamp(data: DocumentData): DocumentData {
  const result = { ...data };
  for (const [key, value] of Object.entries(result)) {
    if (value instanceof Timestamp) {
      result[key] = value.toDate().toISOString();
    }
  }
  return result;
}

// ============ USER PROFILES ============

export async function getUserProfile(uid: string) {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return null;
  return convertTimestamp({ id: snap.id, ...snap.data() });
}

export async function createOrUpdateUser(uid: string, data: Partial<DocumentData>) {
  const ref = doc(db, "users", uid);
  const existing = await getDoc(ref);
  if (existing.exists()) {
    await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
  } else {
    await updateDoc(ref, { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }).catch(async () => {
      await addDoc(collection(db, "users"), { ...data, uid, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    });
  }
}

// ============ SITTERS ============

export async function getSitters(filters?: {
  search?: string;
  petType?: string;
  sortBy?: string;
  maxPrice?: number;
  minRating?: number;
}) {
  const constraints: QueryConstraint[] = [where("role", "==", "sitter"), where("onboarded", "==", true)];

  if (filters?.maxPrice) {
    constraints.push(where("pricePerNight", "<=", filters.maxPrice));
  }
  if (filters?.minRating) {
    constraints.push(where("rating", ">=", filters.minRating));
  }

  const q = query(collection(db, "users"), ...constraints);
  const snap = await getDocs(q);
  let sitters = snap.docs.map((d) => convertTimestamp({ id: d.id, ...d.data() }));

  // Client-side filters for text search and pet type (Firestore can't do full-text)
  if (filters?.search) {
    const s = filters.search.toLowerCase();
    sitters = sitters.filter(
      (sit) =>
        sit.name?.toLowerCase().includes(s) ||
        sit.location?.toLowerCase().includes(s)
    );
  }
  if (filters?.petType && filters.petType !== "All") {
    sitters = sitters.filter((sit) => sit.petTypes?.includes(filters.petType));
  }

  // Sort
  switch (filters?.sortBy) {
    case "price-low":
      sitters.sort((a, b) => a.pricePerNight - b.pricePerNight);
      break;
    case "price-high":
      sitters.sort((a, b) => b.pricePerNight - a.pricePerNight);
      break;
    case "reviews":
      sitters.sort((a, b) => b.reviewCount - a.reviewCount);
      break;
    default:
      sitters.sort((a, b) => b.rating - a.rating);
  }

  return sitters;
}

export async function getSitter(uid: string) {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return null;
  const data = snap.data();
  if (data.role !== "sitter") return null;
  return convertTimestamp({ id: snap.id, ...data });
}

export async function updateSitterProfile(uid: string, data: Partial<DocumentData>) {
  await updateDoc(doc(db, "users", uid), { ...data, updatedAt: serverTimestamp() });
}

// ============ PETS ============

export async function getUserPets(userId: string) {
  const q = query(collection(db, "pets"), where("ownerId", "==", userId), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => convertTimestamp({ id: d.id, ...d.data() }));
}

export async function addPet(userId: string, pet: Omit<import("./types").Pet, "id" | "createdAt">) {
  const docRef = await addDoc(collection(db, "pets"), {
    ...pet,
    ownerId: userId,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updatePet(petId: string, data: Partial<DocumentData>) {
  await updateDoc(doc(db, "pets", petId), data);
}

export async function deletePet(petId: string) {
  await deleteDoc(doc(db, "pets", petId));
}

// ============ BOOKINGS ============

export async function createBooking(booking: Omit<import("./types").Booking, "id" | "createdAt">) {
  const docRef = await addDoc(collection(db, "bookings"), {
    ...booking,
    createdAt: serverTimestamp(),
  });

  // Update sitter stats
  await updateDoc(doc(db, "users", booking.sitterId), {
    totalBookings: increment(1),
    totalEarnings: increment(booking.totalPrice),
  });

  return docRef.id;
}

export async function getBookingsForUser(userId: string) {
  // Get bookings where user is parent
  const parentQ = query(
    collection(db, "bookings"),
    where("parentId", "==", userId),
    orderBy("createdAt", "desc")
  );
  const parentSnap = await getDocs(parentQ);
  const parentBookings = parentSnap.docs.map((d) => convertTimestamp({ id: d.id, ...d.data() }));

  // Get bookings where user is sitter
  const sitterQ = query(
    collection(db, "bookings"),
    where("sitterId", "==", userId),
    orderBy("createdAt", "desc")
  );
  const sitterSnap = await getDocs(sitterQ);
  const sitterBookings = sitterSnap.docs.map((d) => convertTimestamp({ id: d.id, ...d.data() }));

  return { parentBookings, sitterBookings };
}

export async function updateBookingStatus(bookingId: string, status: import("./types").Booking["status"]) {
  await updateDoc(doc(db, "bookings", bookingId), { status, updatedAt: serverTimestamp() });
}

// ============ REVIEWS ============

export async function getReviewsForSitter(sitterId: string) {
  const q = query(
    collection(db, "reviews"),
    where("sitterId", "==", sitterId),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => convertTimestamp({ id: d.id, ...d.data() }));
}

export async function addReview(review: Omit<import("./types").Review, "id" | "createdAt" | "helpful" | "helpfulBy">) {
  const docRef = await addDoc(collection(db, "reviews"), {
    ...review,
    helpful: 0,
    helpfulBy: [],
    createdAt: serverTimestamp(),
  });

  // Update sitter's average rating
  const reviews = await getReviewsForSitter(review.sitterId);
  const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
  await updateDoc(doc(db, "users", review.sitterId), {
    rating: Math.round(avgRating * 10) / 10,
    reviewCount: reviews.length,
  });

  return docRef.id;
}

export async function markReviewHelpful(reviewId: string, userId: string) {
  const ref = doc(db, "reviews", reviewId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const data = snap.data();
  if (data.helpfulBy?.includes(userId)) {
    await updateDoc(ref, { helpful: increment(-1), helpfulBy: arrayRemove(userId) });
  } else {
    await updateDoc(ref, { helpful: increment(1), helpfulBy: arrayUnion(userId) });
  }
}

export async function respondToReview(reviewId: string, response: string) {
  await updateDoc(doc(db, "reviews", reviewId), {
    response,
    responseDate: new Date().toISOString(),
  });
}

// ============ INVOICES ============

export async function getSitterInvoices(sitterId: string) {
  const q = query(
    collection(db, "invoices"),
    where("sitterId", "==", sitterId),
    orderBy("year", "desc"),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => convertTimestamp({ id: d.id, ...d.data() }));
}

// ============ MESSAGES ============

export async function getOrCreateConversation(parentId: string, sitterId: string, parentName: string, sitterName: string, parentPhoto: string | null, sitterPhoto: string | null) {
  // Check if conversation already exists
  const q = query(
    collection(db, "conversations"),
    where("parentId", "==", parentId),
    where("sitterId", "==", sitterId)
  );
  const snap = await getDocs(q);
  if (!snap.empty) {
    return snap.docs[0].id;
  }

  const docRef = await addDoc(collection(db, "conversations"), {
    participants: [parentId, sitterId],
    participantNames: { [parentId]: parentName, [sitterId]: sitterName },
    participantPhotos: { [parentId]: parentPhoto, [sitterId]: sitterPhoto },
    lastMessage: "",
    lastMessageTime: serverTimestamp(),
    unreadCount: { [parentId]: 0, [sitterId]: 0 },
    sitterId,
    parentId,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function sendMessage(conversationId: string, senderId: string, senderName: string, text: string) {
  await addDoc(collection(db, "messages"), {
    conversationId,
    senderId,
    senderName,
    text,
    createdAt: serverTimestamp(),
    read: false,
  });

  await updateDoc(doc(db, "conversations", conversationId), {
    lastMessage: text,
    lastMessageTime: serverTimestamp(),
  });
}

export function subscribeToMessages(conversationId: string, callback: (messages: DocumentData[]) => void) {
  const q = query(
    collection(db, "messages"),
    where("conversationId", "==", conversationId),
    orderBy("createdAt", "asc")
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => convertTimestamp({ id: d.id, ...d.data() })));
  });
}

export function subscribeToConversations(userId: string, callback: (conversations: DocumentData[]) => void) {
  const q = query(
    collection(db, "conversations"),
    where("participants", "array-contains", userId),
    orderBy("lastMessageTime", "desc")
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => convertTimestamp({ id: d.id, ...d.data() })));
  });
}

// ============ COMMUNITY ============

export async function getCommunityPosts(category?: string) {
  const constraints: QueryConstraint[] = [orderBy("createdAt", "desc"), limit(50)];
  if (category && category !== "all") {
    constraints.unshift(where("category", "==", category));
  }
  const q = query(collection(db, "posts"), ...constraints);
  const snap = await getDocs(q);
  return snap.docs.map((d) => convertTimestamp({ id: d.id, ...d.data() }));
}

export async function createPost(post: Omit<import("./types").CommunityPost, "id" | "createdAt" | "likes" | "likedBy" | "commentCount">) {
  const docRef = await addDoc(collection(db, "posts"), {
    ...post,
    likes: 0,
    likedBy: [],
    commentCount: 0,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function likePost(postId: string, userId: string) {
  const ref = doc(db, "posts", postId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const data = snap.data();
  if (data.likedBy?.includes(userId)) {
    await updateDoc(ref, { likes: increment(-1), likedBy: arrayRemove(userId) });
  } else {
    await updateDoc(ref, { likes: increment(1), likedBy: arrayUnion(userId) });
  }
}

export async function getPostComments(postId: string) {
  const q = query(
    collection(db, "comments"),
    where("postId", "==", postId),
    orderBy("createdAt", "asc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => convertTimestamp({ id: d.id, ...d.data() }));
}

export async function addComment(comment: Omit<import("./types").CommunityComment, "id" | "createdAt">) {
  const docRef = await addDoc(collection(db, "comments"), {
    ...comment,
    createdAt: serverTimestamp(),
  });

  await updateDoc(doc(db, "posts", comment.postId), {
    commentCount: increment(1),
  });

  return docRef.id;
}

// ============ FILE UPLOADS ============

export async function uploadFile(path: string, file: File): Promise<string> {
  const storageRef = ref(storage, path);
  const snapshot = await uploadBytes(storageRef, file);
  return getDownloadURL(snapshot.ref);
}

// ============ SEED DATA ============

export async function seedDatabase() {
  const batch = writeBatch(db);

  // Seed sitters
  const sitters = [
    {
      uid: "sitter_1",
      email: "priya.sharma@email.com",
      displayName: "Priya Sharma",
      photoURL: null,
      role: "sitter",
      onboarded: true,
      gender: "female",
      phone: "+91 98765 43210",
      location: "Bandra, Mumbai",
      bio: "Animal lover with 8+ years of pet sitting experience in Mumbai. I treat every pet like my own family. Certified in pet first aid and CPR by IVMA.",
      services: ["Overnight stays", "Dog walking", "Pet taxi", "Medication admin"],
      petTypes: ["Dogs", "Cats", "Rabbits"],
      pricePerNight: 2500,
      experience: "8 years",
      availability: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      verified: true,
      topRated: true,
      rating: 4.9,
      reviewCount: 127,
      responseTime: "Within 1 hour",
      acceptanceRate: 96,
      repeatClients: 45,
      totalEarnings: 0,
      totalBookings: 0,
      createdAt: new Date("2024-01-15"),
      updatedAt: new Date(),
    },
    {
      uid: "sitter_2",
      email: "arjun.menon@email.com",
      displayName: "Arjun Menon",
      photoURL: null,
      role: "sitter",
      onboarded: true,
      gender: "male",
      phone: "+91 87654 32109",
      location: "Koramangala, Bangalore",
      bio: "Work-from-home tech professional who loves having furry companions around. Your pet will get plenty of attention and playtime in my pet-friendly apartment.",
      services: ["Overnight stays", "Dog walking", "Training reinforcement"],
      petTypes: ["Dogs", "Cats"],
      pricePerNight: 1800,
      experience: "5 years",
      availability: ["Mon", "Tue", "Wed", "Thu", "Fri"],
      verified: true,
      topRated: false,
      rating: 4.8,
      reviewCount: 89,
      responseTime: "Within 2 hours",
      acceptanceRate: 92,
      repeatClients: 28,
      totalEarnings: 0,
      totalBookings: 0,
      createdAt: new Date("2024-03-20"),
      updatedAt: new Date(),
    },
    {
      uid: "sitter_3",
      email: "sneha.kapoor@email.com",
      displayName: "Dr. Sneha Kapoor",
      photoURL: null,
      role: "sitter",
      onboarded: true,
      gender: "female",
      phone: "+91 76543 21098",
      location: "Hauz Khas, Delhi",
      bio: "Veterinary professional turned full-time pet sitter. I have a deep understanding of animal health and behavior. Your pets are in expert hands.",
      services: ["Overnight stays", "Dog walking", "Medication admin", "Special needs care", "Pet photography"],
      petTypes: ["Dogs", "Cats", "Birds", "Reptiles"],
      pricePerNight: 3000,
      experience: "12 years",
      availability: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      verified: true,
      topRated: true,
      rating: 5.0,
      reviewCount: 203,
      responseTime: "Within 30 minutes",
      acceptanceRate: 98,
      repeatClients: 72,
      totalEarnings: 0,
      totalBookings: 0,
      createdAt: new Date("2023-11-01"),
      updatedAt: new Date(),
    },
    {
      uid: "sitter_4",
      email: "vikram.singh@email.com",
      displayName: "Vikram Singh",
      photoURL: null,
      role: "sitter",
      onboarded: true,
      gender: "male",
      phone: "+91 65432 10987",
      location: "Koregaon Park, Pune",
      bio: "Retired army officer with a gentle soul. I have a large compound and two friendly Indie dogs of my own. Your pet will love it here.",
      services: ["Overnight stays", "Dog walking", "Yard playtime"],
      petTypes: ["Dogs"],
      pricePerNight: 1500,
      experience: "3 years",
      availability: ["Mon", "Wed", "Fri", "Sat", "Sun"],
      verified: true,
      topRated: false,
      rating: 4.7,
      reviewCount: 64,
      responseTime: "Within 3 hours",
      acceptanceRate: 88,
      repeatClients: 19,
      totalEarnings: 0,
      totalBookings: 0,
      createdAt: new Date("2024-06-10"),
      updatedAt: new Date(),
    },
    {
      uid: "sitter_5",
      email: "meera.iyer@email.com",
      displayName: "Meera Iyer",
      photoURL: null,
      role: "sitter",
      onboarded: true,
      gender: "female",
      phone: "+91 54321 09876",
      location: "Adyar, Chennai",
      bio: "Cat specialist with a calm, quiet home perfect for feline friends. I also care for small animals. Every guest gets individualized attention.",
      services: ["Overnight stays", "Cat boarding", "Small animal care", "Medication admin"],
      petTypes: ["Cats", "Rabbits", "Hamsters"],
      pricePerNight: 2000,
      experience: "7 years",
      availability: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
      verified: true,
      topRated: true,
      rating: 4.9,
      reviewCount: 156,
      responseTime: "Within 1 hour",
      acceptanceRate: 94,
      repeatClients: 53,
      totalEarnings: 0,
      totalBookings: 0,
      createdAt: new Date("2024-02-14"),
      updatedAt: new Date(),
    },
    {
      uid: "sitter_6",
      email: "rohan.das@email.com",
      displayName: "Rohan Das",
      photoURL: null,
      role: "sitter",
      onboarded: true,
      gender: "male",
      phone: "+91 43210 98765",
      location: "Anjuna, Goa",
      bio: "Outdoor enthusiast who loves active adventures with dogs. Beach runs, trail hikes, and park playdates; your pup will have the time of their life.",
      services: ["Overnight stays", "Adventure walks", "Dog hiking", "Park playdates"],
      petTypes: ["Dogs"],
      pricePerNight: 2200,
      experience: "2 years",
      availability: ["Tue", "Thu", "Fri", "Sat", "Sun"],
      verified: false,
      topRated: false,
      rating: 4.6,
      reviewCount: 42,
      responseTime: "Within 4 hours",
      acceptanceRate: 85,
      repeatClients: 12,
      totalEarnings: 0,
      totalBookings: 0,
      createdAt: new Date("2024-08-01"),
      updatedAt: new Date(),
    },
  ];

  sitters.forEach((sitter) => {
    const ref = doc(db, "users", sitter.uid);
    batch.set(ref, sitter);
  });

  // Seed reviews
  const reviews = [
    { sitterId: "sitter_1", author: "Ananya Mehta", authorGender: "female", rating: 5, text: "Priya was absolutely wonderful with our Labrador, Bruno. She sent daily photos and updates. Bruno came home happy and well-cared for.", petType: "Dog", bookingId: "seed_b1", authorId: "parent_1" },
    { sitterId: "sitter_3", author: "Deepak Kumar", authorGender: "male", rating: 5, text: "Dr. Sneha is a true professional. Our senior cat with diabetes needed careful medication scheduling, and she handled it perfectly.", petType: "Cat", bookingId: "seed_b2", authorId: "parent_2", response: "Thank you, Deepak! Muffin was such a well-behaved gentleman. Happy to care for her anytime." },
    { sitterId: "sitter_2", author: "Kavitha Lakshmi", authorGender: "female", rating: 4, text: "Arjun was great with our two Indie dogs. They usually have separation anxiety but seemed totally at ease at his place.", petType: "Dog", bookingId: "seed_b3", authorId: "parent_3", response: "Thanks Kavitha! I have actually added some more outdoor space since then. Hope to see Bholu and Guddi again soon!" },
    { sitterId: "sitter_5", author: "Tushar Hegde", authorGender: "male", rating: 5, text: "Meera is the cat whisperer! Our shy rescue cat came out of her shell with Meera. The photo updates made our trip so much more relaxing.", petType: "Cat", bookingId: "seed_b4", authorId: "parent_4" },
    { sitterId: "sitter_4", author: "Pooja Wadhwa", authorGender: "female", rating: 5, text: "Vikram was perfect for our high-energy Golden Retriever. The big compound was a huge plus. Our dog came home exhausted from all the playing.", petType: "Dog", bookingId: "seed_b5", authorId: "parent_5" },
    { sitterId: "sitter_1", author: "Rohan Mehta", authorGender: "male", rating: 5, text: "Second time booking Priya and she is consistently excellent. Very organized, sends updates on schedule, and our cat always seems content.", petType: "Cat", bookingId: "seed_b6", authorId: "parent_6" },
    { sitterId: "sitter_3", author: "Shreya Patel", authorGender: "female", rating: 5, text: "We were nervous leaving our parrot with someone new, but Dr. Sneha's veterinary background put us completely at ease. She even noticed a subtle change in his plumage.", petType: "Bird", bookingId: "seed_b7", authorId: "parent_7" },
    { sitterId: "sitter_6", author: "Karan Bhat", authorGender: "male", rating: 4, text: "Rohan took our dog on a proper beach hike in Anjuna. Max came back muddy but ecstatic. Pickup was about 20 minutes late, but the care was top-notch.", petType: "Dog", bookingId: "seed_b8", authorId: "parent_8" },
    { sitterId: "sitter_5", author: "Divya Nair", authorGender: "female", rating: 5, text: "Meera cared for our two rabbits while we traveled for a week. She sent daily photos and even trimmed their nails. Very thoughtful.", petType: "Rabbit", bookingId: "seed_b9", authorId: "parent_9" },
  ];

  reviews.forEach((review, i) => {
    const ref = doc(db, "reviews", `seed_review_${i + 1}`);
    batch.set(ref, {
      ...review,
      helpful: Math.floor(Math.random() * 20),
      helpfulBy: [],
      date: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      createdAt: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000),
    });
  });

  // Seed community posts
  const posts = [
    { authorId: "parent_1", author: "Ananya Mehta", authorRole: "parent", authorGender: "female", category: "tip", title: "How to prepare your dog for their first boarding stay", text: "Start with a short day visit first so your dog gets familiar with the sitter's space. Leave an item with your scent, like a worn t-shirt. Keep the goodbye brief and cheerful.", tags: ["dogs", "first-timers", "tips"] },
    { authorId: "sitter_3", author: "Dr. Sneha Kapoor", authorRole: "sitter", authorGender: "female", category: "tip", title: "Medication checklist for pet parents going on vacation", text: "Always leave written instructions with dosages and timings. Pack extra medication in case of travel delays. Include your vet's contact info and authorization for emergency treatment.", tags: ["medication", "preparation", "veterinary"] },
    { authorId: "parent_3", author: "Kavitha Lakshmi", authorRole: "parent", authorGender: "female", category: "question", title: "How do you handle pets with separation anxiety?", text: "My Indie dogs get very anxious when I leave. Any tips from sitters or experienced pet parents on making the transition smoother?", tags: ["anxiety", "dogs", "advice"] },
    { authorId: "parent_4", author: "Tushar Hegde", authorRole: "parent", authorGender: "male", category: "experience", title: "Our experience boarding a senior cat with diabetes", text: "Was terrified to leave Muffin for the first time, but our sitter handled her insulin schedule perfectly. Daily updates gave us so much peace of mind during our trip.", tags: ["cats", "senior-pets", "diabetes", "experience"] },
    { authorId: "sitter_5", author: "Meera Iyer", authorRole: "sitter", authorGender: "female", category: "tip", title: "Creating a calming environment for boarding cats", text: "Feliway diffusers, quiet rooms away from household noise, separate litter boxes for each cat, and maintaining their regular feeding schedule makes a huge difference.", tags: ["cats", "environment", "calming"] },
  ];

  posts.forEach((post, i) => {
    const ref = doc(db, "posts", `seed_post_${i + 1}`);
    batch.set(ref, {
      ...post,
      likes: Math.floor(Math.random() * 30),
      likedBy: [],
      commentCount: 0,
      createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
    });
  });

  await batch.commit();
  return { sitters: sitters.length, reviews: reviews.length, posts: posts.length };
}
