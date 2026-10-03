"use client";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
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
  arrayUnion,
  arrayRemove,
  increment,
  writeBatch,
  type DocumentData,
  type DocumentSnapshot,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { httpsCallable } from "firebase/functions";
import { db, storage, functions } from "./firebase";
import { DECLARATIONS_VERSION, HOME_DECLARATIONS, PARENT_DECLARATIONS } from "./constants";
import { nightsBetween } from "./format";
import type {
  Booking,
  BookingStatus,
  CommunityComment,
  CareLocation,
  CommunityPost,
  Conversation,
  KycCase,
  KycIdType,
  OrgProfile,
  OrgRole,
  PetCare,
  Message,
  Pet,
  PostCategory,
  PrivateContact,
  Review,
  SitterProfile,
  UserProfile,
  Vouch,
} from "./types";

function normalize(data: DocumentData): DocumentData {
  const out: DocumentData = {};
  for (const [k, v] of Object.entries(data)) {
    out[k] = v instanceof Timestamp ? v.toDate().toISOString() : v;
  }
  return out;
}

function fromDoc<T>(snap: DocumentSnapshot | QueryDocumentSnapshot): T {
  return { id: snap.id, ...normalize(snap.data() ?? {}) } as T;
}

// ─── Profiles ──────────────────────────────────────────────────────────────

export async function getProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db(), "users", uid));
  if (!snap.exists()) return null;
  return { ...normalize(snap.data()), uid } as UserProfile;
}

/** Creates the public profile + private contact doc the first time a user signs in. */
export async function ensureProfile(user: {
  uid: string;
  displayName: string | null;
  photoURL: string | null;
  email: string | null;
  phoneNumber?: string | null;
}): Promise<UserProfile> {
  const existing = await getProfile(user.uid);
  if (existing) return existing;
  const profile = {
    uid: user.uid,
    // Phone sign-ups have no name yet; onboarding asks for one.
    displayName:
      user.displayName || user.email?.split("@")[0] || (user.phoneNumber ? `Member ${user.phoneNumber.slice(-4)}` : "Member"),
    photoURL: user.photoURL,
    role: null,
    onboarded: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const batch = writeBatch(db());
  batch.set(doc(db(), "users", user.uid), profile);
  batch.set(doc(db(), "users", user.uid, "private", "contact"), {
    email: user.email || "",
    ...(user.phoneNumber ? { phone: user.phoneNumber } : {}),
  });
  await batch.commit();
  return { ...profile, createdAt: new Date().toISOString() } as UserProfile;
}

export type EditableProfile = Pick<
  UserProfile,
  | "displayName"
  | "photoURL"
  | "role"
  | "onboarded"
  | "location"
  | "bio"
  | "services"
  | "petTypes"
  | "pricePerNight"
  | "experience"
  | "availability"
  | "responseTime"
  | "home"
  | "phone"
  | "address"
  | "lat"
  | "lng"
  | "hours"
  | "open24x7"
  | "website"
>;

export async function updateProfile(uid: string, data: Partial<EditableProfile>) {
  await updateDoc(doc(db(), "users", uid), { ...data, updatedAt: serverTimestamp() });
}

export async function getContact(uid: string): Promise<PrivateContact | null> {
  const snap = await getDoc(doc(db(), "users", uid, "private", "contact"));
  return snap.exists() ? (snap.data() as PrivateContact) : null;
}

export async function updateContact(uid: string, data: Partial<PrivateContact>) {
  await setDoc(doc(db(), "users", uid, "private", "contact"), data, { merge: true });
}

// ─── Sitters ───────────────────────────────────────────────────────────────

export interface SitterFilters {
  search?: string;
  petType?: string;
  maxPrice?: number;
  sortBy?: "rating" | "price-low" | "price-high" | "reviews" | "vouched";
}

export async function getSitters(filters: SitterFilters = {}): Promise<SitterProfile[]> {
  // Only sitters whose identity verification was approved are listed.
  const q = query(
    collection(db(), "users"),
    where("role", "==", "sitter"),
    where("onboarded", "==", true),
    where("verified", "==", true)
  );
  const snap = await getDocs(q);
  let sitters = snap.docs.map((d) => ({ ...normalize(d.data()), uid: d.id }) as SitterProfile);

  if (filters.search) {
    const s = filters.search.trim().toLowerCase();
    sitters = sitters.filter(
      (x) => x.displayName?.toLowerCase().includes(s) || x.location?.toLowerCase().includes(s)
    );
  }
  if (filters.petType && filters.petType !== "All") {
    sitters = sitters.filter((x) => x.petTypes?.includes(filters.petType!));
  }
  if (filters.maxPrice) {
    sitters = sitters.filter((x) => (x.pricePerNight ?? 0) <= filters.maxPrice!);
  }

  const by = filters.sortBy ?? "rating";
  sitters.sort((a, b) => {
    if (by === "price-low") return a.pricePerNight - b.pricePerNight;
    if (by === "price-high") return b.pricePerNight - a.pricePerNight;
    if (by === "reviews") return (b.reviewCount ?? 0) - (a.reviewCount ?? 0);
    return (b.rating ?? 0) - (a.rating ?? 0) || (b.reviewCount ?? 0) - (a.reviewCount ?? 0);
  });
  return sitters;
}

export async function getSitter(uid: string): Promise<SitterProfile | null> {
  const p = await getProfile(uid);
  return p && p.role === "sitter" ? (p as SitterProfile) : null;
}

// ─── Sitter identity verification (KYC) ────────────────────────────────────

export async function getKyc(uid: string): Promise<KycCase | null> {
  const snap = await getDoc(doc(db(), "kyc", uid));
  return snap.exists() ? (normalize(snap.data()) as KycCase) : null;
}

export interface KycInput {
  legalName: string;
  dob: string;
  idType: KycIdType;
  idLast4: string;
  addressLine: string;
  city: string;
  pincode: string;
  emergencyName: string;
  emergencyPhone: string;
}

export interface KycFiles {
  idFront: Blob;
  idBack?: Blob;
  selfie: Blob;
  addressProof?: Blob;
  policeCert?: Blob;
}

/**
 * Uploads the documents to private Storage (write-only for the owner), then records the case.
 * `onProgress` is called with a 0..1 fraction. The case is created last, so a failed
 * upload leaves nothing half-submitted.
 */
export async function submitKyc(
  uid: string,
  input: KycInput,
  files: KycFiles,
  declarations: Record<string, true>,
  declarationsVersion: number,
  onProgress?: (fraction: number) => void
) {
  const entries = Object.entries(files).filter(([, blob]) => !!blob) as [keyof KycFiles, Blob][];
  const fileName: Record<keyof KycFiles, string> = {
    idFront: "id-front",
    idBack: "id-back",
    selfie: "selfie",
    addressProof: "address-proof",
    policeCert: "police-cert",
  };
  const paths: Partial<Record<keyof KycFiles, string>> = {};
  let done = 0;
  for (const [key, blob] of entries) {
    const ext = blob.type === "application/pdf" ? "pdf" : "jpg";
    const path = `kyc/${uid}/${fileName[key]}.${ext}`;
    await uploadBytes(ref(storage(), path), blob, { contentType: blob.type === "application/pdf" ? "application/pdf" : "image/jpeg" });
    paths[key] = path;
    onProgress?.(++done / entries.length);
  }
  await setDoc(doc(db(), "kyc", uid), {
    status: "submitted",
    ...input,
    ...paths,
    hasPoliceCert: !!paths.policeCert,
    declarations: { version: declarationsVersion, ...declarations },
    consent: true,
    consentAt: serverTimestamp(),
    submittedAt: serverTimestamp(),
  });
}

// ─── Rescues & vets ────────────────────────────────────────────────────────

/** Verified, live listings of one kind. Unverified organisations stay hidden. */
export async function getOrgs(type: OrgRole): Promise<OrgProfile[]> {
  const q = query(collection(db(), "users"), where("role", "==", type), where("verified", "==", true));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ ...normalize(d.data()), uid: d.id }) as OrgProfile)
    .filter((o) => o.onboarded);
}

export async function getOrg(uid: string): Promise<OrgProfile | null> {
  const p = await getProfile(uid);
  return p && (p.role === "rescue" || p.role === "vet") ? (p as OrgProfile) : null;
}

// ─── Vouches ───────────────────────────────────────────────────────────────

export const vouchId = (orgId: string, sitterId: string) => `${orgId}_${sitterId}`;

export async function getVouchesForSitter(sitterId: string): Promise<Vouch[]> {
  const snap = await getDocs(query(collection(db(), "vouches"), where("sitterId", "==", sitterId)));
  return snap.docs.map((d) => fromDoc<Vouch>(d)).sort((a, b) => (a.createdAt ?? "").localeCompare(b.createdAt ?? ""));
}

export async function getVouchesByOrg(orgId: string): Promise<Vouch[]> {
  const snap = await getDocs(query(collection(db(), "vouches"), where("orgId", "==", orgId)));
  return snap.docs.map((d) => fromDoc<Vouch>(d)).sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
}

export async function vouchForSitter(org: UserProfile, sitterId: string, note: string) {
  const n = note.trim();
  await setDoc(doc(db(), "vouches", vouchId(org.uid, sitterId)), {
    orgId: org.uid,
    orgName: org.displayName,
    orgPhoto: org.photoURL ?? null,
    orgType: org.role,
    sitterId,
    ...(n ? { note: n } : {}),
    createdAt: serverTimestamp(),
  });
}

export async function withdrawVouch(orgId: string, sitterId: string) {
  await deleteDoc(doc(db(), "vouches", vouchId(orgId, sitterId)));
}

// ─── Pets ──────────────────────────────────────────────────────────────────

export async function getPets(ownerId: string): Promise<Pet[]> {
  const q = query(collection(db(), "pets"), where("ownerId", "==", ownerId), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => fromDoc<Pet>(d));
}

export type PetInput = Pick<Pet, "name" | "type" | "breed" | "age" | "notes"> & PetCare;

/** Firestore rejects `undefined`, so drop unset optional fields. */
const defined = <T extends object>(o: T): T => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T;

export async function addPet(ownerId: string, pet: PetInput): Promise<string> {
  const r = await addDoc(collection(db(), "pets"), { ...defined(pet), ownerId, createdAt: serverTimestamp() });
  return r.id;
}

export async function updatePet(petId: string, pet: PetInput) {
  await updateDoc(doc(db(), "pets", petId), { ...defined(pet) });
}

export async function deletePet(petId: string) {
  await deleteDoc(doc(db(), "pets", petId));
}

// ─── Bookings ──────────────────────────────────────────────────────────────

const CARE_KEYS = [
  "sex", "neutered", "weightKg", "vaccinated", "vaccinatedOn", "tempers", "medical", "medications", "diet", "vetName", "vetPhone", "microchip",
] as const;

/** The part of a pet record that is copied into a booking as the care sheet. */
export function careSheetOf(pet: Pet): PetCare {
  return Object.fromEntries(CARE_KEYS.filter((k) => pet[k] !== undefined).map((k) => [k, pet[k]])) as PetCare;
}

export interface DeclarationInput {
  emergencyLimit: number;
  emergencyContactName: string;
  emergencyContactPhone: string;
  preferredVetName?: string;
  preferredVetPhone?: string;
}

export async function createBooking(input: {
  parent: UserProfile;
  sitter: SitterProfile;
  pet: Pet;
  startDate: string;
  endDate: string;
  notes: string;
  careLocation: CareLocation;
  declarations: DeclarationInput;
}): Promise<string> {
  const { parent, sitter, pet, startDate, endDate, notes, careLocation } = input;
  const nights = nightsBetween(startDate, endDate);
  if (nights < 1) throw new Error("Check-out must be after check-in");
  // The price is recomputed and enforced by Firestore rules from the sitter's
  // own profile, so a tampered client cannot under-pay.
  const r = await addDoc(collection(db(), "bookings"), {
    sitterId: sitter.uid,
    sitterName: sitter.displayName,
    sitterPhoto: sitter.photoURL ?? null,
    parentId: parent.uid,
    parentName: parent.displayName,
    parentPhoto: parent.photoURL ?? null,
    petId: pet.id,
    petName: pet.name,
    petType: pet.type,
    petNotes: pet.notes || "",
    startDate,
    endDate,
    nights,
    pricePerNight: sitter.pricePerNight,
    totalPrice: nights * sitter.pricePerNight,
    status: "pending",
    paymentStatus: "pending",
    notes,
    careLocation,
    // The pet's care sheet and the parent's declarations are frozen into the booking as the record of
    // what was disclosed, and when. The rules refuse a booking unless all of them are affirmed.
    petCare: careSheetOf(pet),
    declarations: {
      version: DECLARATIONS_VERSION,
      ...Object.fromEntries(PARENT_DECLARATIONS.map((d) => [d.key, true])),
      ...(careLocation === "parent_home" ? Object.fromEntries(HOME_DECLARATIONS.map((d) => [d.key, true])) : {}),
      ...defined(input.declarations),
      acceptedAt: serverTimestamp(),
    },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return r.id;
}

export function subscribeBookings(
  uid: string,
  as: "parentId" | "sitterId",
  cb: (b: Booking[]) => void,
  onError?: (e: Error) => void
) {
  const q = query(collection(db(), "bookings"), where(as, "==", uid), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => cb(snap.docs.map((d) => fromDoc<Booking>(d))), onError);
}

export async function getBooking(id: string): Promise<Booking | null> {
  const snap = await getDoc(doc(db(), "bookings", id));
  return snap.exists() ? fromDoc<Booking>(snap) : null;
}

/** The sitter accepts after reviewing the care sheet and declarations. The rules require the acknowledgement. */
export async function acceptBooking(id: string) {
  await updateDoc(doc(db(), "bookings", id), { status: "confirmed", sitterAckAt: serverTimestamp(), updatedAt: serverTimestamp() });
}

export async function setBookingStatus(id: string, status: BookingStatus) {
  await updateDoc(doc(db(), "bookings", id), { status, updatedAt: serverTimestamp() });
}

export async function createPaymentOrder(bookingId: string) {
  const call = httpsCallable<
    { bookingId: string },
    { orderId: string; amount: number; currency: string; keyId: string }
  >(functions(), "createPaymentOrder");
  return (await call({ bookingId })).data;
}

export async function verifyPayment(input: {
  bookingId: string;
  orderId: string;
  paymentId: string;
  signature: string;
}) {
  const call = httpsCallable<typeof input, { verified: boolean }>(functions(), "verifyPayment");
  return (await call(input)).data;
}

// ─── Reviews ───────────────────────────────────────────────────────────────

export async function getReviews(sitterId: string): Promise<Review[]> {
  const q = query(collection(db(), "reviews"), where("sitterId", "==", sitterId), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => fromDoc<Review>(d));
}

export async function getReviewedBookingIds(authorId: string): Promise<Set<string>> {
  const q = query(collection(db(), "reviews"), where("authorId", "==", authorId));
  const snap = await getDocs(q);
  return new Set(snap.docs.map((d) => d.id));
}

export async function addReview(booking: Booking, author: UserProfile, rating: number, text: string) {
  await setDoc(doc(db(), "reviews", booking.id), {
    sitterId: booking.sitterId,
    bookingId: booking.id,
    authorId: author.uid,
    author: author.displayName,
    authorPhoto: author.photoURL ?? null,
    rating,
    text,
    petType: booking.petType,
    helpfulBy: [],
    createdAt: serverTimestamp(),
  });
}

export async function toggleReviewHelpful(review: Review, uid: string) {
  const has = review.helpfulBy?.includes(uid);
  await updateDoc(doc(db(), "reviews", review.id), {
    helpfulBy: has ? arrayRemove(uid) : arrayUnion(uid),
  });
}

export async function respondToReview(reviewId: string, response: string) {
  await updateDoc(doc(db(), "reviews", reviewId), { response, responseAt: serverTimestamp() });
}

// ─── Messages ──────────────────────────────────────────────────────────────

export const conversationId = (parentId: string, sitterId: string) => `${parentId}_${sitterId}`;

export async function openConversation(parent: UserProfile, sitter: UserProfile): Promise<string> {
  const id = conversationId(parent.uid, sitter.uid);
  const ref = doc(db(), "conversations", id);
  // A missing doc is unreadable under the rules (no participants to check),
  // so treat a permission error the same as "does not exist yet".
  const exists = await getDoc(ref).then((s) => s.exists()).catch(() => false);
  if (!exists) {
    await setDoc(ref, {
      parentId: parent.uid,
      sitterId: sitter.uid,
      participants: [parent.uid, sitter.uid],
      names: { [parent.uid]: parent.displayName, [sitter.uid]: sitter.displayName },
      photos: { [parent.uid]: parent.photoURL ?? null, [sitter.uid]: sitter.photoURL ?? null },
      lastMessage: "",
      lastSenderId: "",
      lastMessageAt: serverTimestamp(),
    });
  }
  return id;
}

export function subscribeConversations(uid: string, cb: (c: Conversation[]) => void, onError?: (e: Error) => void) {
  const q = query(
    collection(db(), "conversations"),
    where("participants", "array-contains", uid),
    orderBy("lastMessageAt", "desc")
  );
  return onSnapshot(q, (snap) => cb(snap.docs.map((d) => fromDoc<Conversation>(d))), onError);
}

export async function getConversation(id: string): Promise<Conversation | null> {
  const snap = await getDoc(doc(db(), "conversations", id));
  return snap.exists() ? fromDoc<Conversation>(snap) : null;
}

export function subscribeMessages(convId: string, cb: (m: Message[]) => void, onError?: (e: Error) => void) {
  const q = query(collection(db(), "conversations", convId, "messages"), orderBy("createdAt", "asc"), limit(500));
  return onSnapshot(q, (snap) => cb(snap.docs.map((d) => fromDoc<Message>(d))), onError);
}

export async function sendMessage(convId: string, senderId: string, text: string) {
  const batch = writeBatch(db());
  batch.set(doc(collection(db(), "conversations", convId, "messages")), {
    senderId,
    text,
    createdAt: serverTimestamp(),
  });
  batch.update(doc(db(), "conversations", convId), {
    lastMessage: text.slice(0, 140),
    lastSenderId: senderId,
    lastMessageAt: serverTimestamp(),
  });
  await batch.commit();
}

// ─── Community ─────────────────────────────────────────────────────────────

export async function getPosts(category?: PostCategory): Promise<CommunityPost[]> {
  const q = category
    ? query(collection(db(), "posts"), where("category", "==", category), orderBy("createdAt", "desc"), limit(50))
    : query(collection(db(), "posts"), orderBy("createdAt", "desc"), limit(50));
  const snap = await getDocs(q);
  return snap.docs.map((d) => fromDoc<CommunityPost>(d));
}

export async function getPost(id: string): Promise<CommunityPost | null> {
  const snap = await getDoc(doc(db(), "posts", id));
  return snap.exists() ? fromDoc<CommunityPost>(snap) : null;
}

export async function createPost(
  author: UserProfile,
  post: { category: PostCategory; title: string; text: string }
): Promise<string> {
  const r = await addDoc(collection(db(), "posts"), {
    ...post,
    authorId: author.uid,
    author: author.displayName,
    authorPhoto: author.photoURL ?? null,
    authorRole: author.role ?? "parent",
    likedBy: [],
    commentCount: 0,
    createdAt: serverTimestamp(),
  });
  return r.id;
}

export async function togglePostLike(post: CommunityPost, uid: string) {
  const has = post.likedBy?.includes(uid);
  await updateDoc(doc(db(), "posts", post.id), { likedBy: has ? arrayRemove(uid) : arrayUnion(uid) });
}

export async function getComments(postId: string): Promise<CommunityComment[]> {
  const q = query(collection(db(), "posts", postId, "comments"), orderBy("createdAt", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => fromDoc<CommunityComment>(d));
}

export async function addComment(postId: string, author: UserProfile, text: string) {
  const batch = writeBatch(db());
  const cRef = doc(collection(db(), "posts", postId, "comments"));
  batch.set(cRef, {
    authorId: author.uid,
    author: author.displayName,
    authorPhoto: author.photoURL ?? null,
    text,
    createdAt: serverTimestamp(),
  });
  batch.update(doc(db(), "posts", postId), { commentCount: increment(1) });
  await batch.commit();
  return cRef.id;
}

// ─── Uploads ───────────────────────────────────────────────────────────────

export async function uploadAvatar(uid: string, file: File): Promise<string> {
  const ext = file.type === "image/png" ? "png" : "jpg";
  const r = ref(storage(), `users/${uid}/avatar.${ext}`);
  const snap = await uploadBytes(r, file, { contentType: file.type });
  return getDownloadURL(snap.ref);
}
