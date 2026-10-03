// Security-rule tests. Run with: npm run test:rules
// (starts the Firestore emulator via firebase-tools and runs this file)
import { readFileSync } from "node:fs";
import { after, before, beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import { ref, uploadBytes, getBytes } from "firebase/storage";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  arrayUnion,
  doc,
  getDoc,
  increment,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
  collection,
  deleteDoc,
  getDocs,
  query,
  where,
  orderBy,
} from "firebase/firestore";

let env;

const day = (offset) => {
  const d = new Date(Date.now() + offset * 864e5);
  return d.toISOString().slice(0, 10);
};

const sitter = {
  uid: "sitter1",
  displayName: "Sam Sitter",
  photoURL: null,
  role: "sitter",
  onboarded: true,
  verified: true,
  pricePerNight: 2000,
  petTypes: ["Dogs"],
  services: ["Overnight stays"],
};
const vet = {
  uid: "vet1",
  displayName: "Anand Clinic for Animals",
  photoURL: null,
  role: "vet",
  onboarded: true,
  verified: true,
  location: "Andheri, Mumbai",
  address: "1 Lokhandwala",
  phone: "+91 00000 00001",
  services: ["Vaccination"],
  petTypes: ["Dogs"],
};
const rescue = { ...vet, uid: "rescue1", displayName: "Pawsitive Purpose Rescue", role: "rescue" };
const parent = { uid: "parent1", displayName: "Pat Parent", photoURL: null, role: "parent", onboarded: true };

const careSheet = { vaccinated: "up_to_date", vaccinatedOn: "2026-03-01", tempers: ["Friendly with dogs"], medical: "None", vetName: "Dr Rao", vetPhone: "+91 00000 00005" };
function declarations(over = {}) {
  return {
    version: 1,
    vaccinated: true, parasiteControl: true, healthDisclosed: true, behaviourDisclosed: true, noContagious: true,
    ownerAuthorised: true, conditionRecord: true, inherentRisk: true, emergencyAuth: true, policy: true,
    emergencyLimit: 10000,
    emergencyContactName: "Pat Parent",
    emergencyContactPhone: "+91 00000 00003",
    acceptedAt: serverTimestamp(),
    ...over,
  };
}
const homeDecl = { homePetProofed: true, homeHazardsDisclosed: true, homeAccessSafe: true };

function booking(over = {}) {
  return {
    sitterId: "sitter1",
    sitterName: "Sam Sitter",
    sitterPhoto: null,
    parentId: "parent1",
    parentName: "Pat Parent",
    parentPhoto: null,
    petId: "pet1",
    petName: "Bruno",
    petType: "Dog",
    petNotes: "",
    startDate: day(2),
    endDate: day(5),
    nights: 3,
    pricePerNight: 2000,
    totalPrice: 6000,
    status: "pending",
    paymentStatus: "pending",
    notes: "",
    careLocation: "sitter_home",
    petCare: careSheet,
    declarations: declarations(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...over,
  };
}

const omit = (o, ...keys) => Object.fromEntries(Object.entries(o).filter(([k]) => !keys.includes(k)));
const as = (uid) => env.authenticatedContext(uid).firestore();
const anon = () => env.unauthenticatedContext().firestore();

async function seed(fn) {
  await env.withSecurityRulesDisabled(async (ctx) => fn(ctx.firestore()));
}

before(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-carepaws",
    firestore: { rules: readFileSync("firestore.rules", "utf8") },
    storage: { rules: readFileSync("storage.rules", "utf8") },
  });
});

after(async () => env?.cleanup());

beforeEach(async () => {
  await env.clearFirestore();
  await env.clearStorage();
  await seed(async (db) => {
    await setDoc(doc(db, "kyc/sitter1"), { status: "approved" });
    await setDoc(doc(db, "users/sitter1"), sitter);
    await setDoc(doc(db, "users/parent1"), parent);
    await setDoc(doc(db, "users/parent2"), { ...parent, uid: "parent2" });
    await setDoc(doc(db, "users/vet1"), vet);
    await setDoc(doc(db, "users/vet2"), { ...vet, uid: "vet2", displayName: "New Clinic", verified: false });
    await setDoc(doc(db, "users/rescue1"), rescue);
    await setDoc(doc(db, "pets/pet1"), { ownerId: "parent1", name: "Bruno", type: "Dog", breed: "", age: "", notes: "" });
  });
});

describe("users", () => {
  test("anyone can read public profiles", async () => {
    await assertSucceeds(getDoc(doc(anon(), "users/sitter1")));
  });
  test("a user cannot verify themselves or set their rating", async () => {
    await assertFails(updateDoc(doc(as("sitter1"), "users/sitter1"), { verified: false }));
    await assertFails(updateDoc(doc(as("parent1"), "users/parent1"), { verified: true }));
    await assertFails(updateDoc(doc(as("sitter1"), "users/sitter1"), { rating: 5, reviewCount: 999 }));
  });
  test("a user can edit their own bio but not someone else's", async () => {
    await assertSucceeds(updateDoc(doc(as("sitter1"), "users/sitter1"), { bio: "Hello" }));
    await assertFails(updateDoc(doc(as("parent1"), "users/sitter1"), { bio: "Hacked" }));
  });
  test("role cannot change after onboarding", async () => {
    await assertFails(updateDoc(doc(as("parent1"), "users/parent1"), { role: "sitter" }));
  });
  test("new profiles are created by their owner, without system fields", async () => {
    const p = { uid: "new1", displayName: "New", photoURL: null, role: null, onboarded: false };
    await assertSucceeds(setDoc(doc(as("new1"), "users/new1"), p));
    await assertFails(setDoc(doc(as("new2"), "users/new2"), { ...p, uid: "new2", verified: true }));
    await assertFails(setDoc(doc(as("new3"), "users/someoneelse"), { ...p, uid: "someoneelse" }));
  });
  test("contact details are private", async () => {
    await assertSucceeds(setDoc(doc(as("parent1"), "users/parent1/private/contact"), { email: "p@x.com" }));
    await assertFails(getDoc(doc(as("sitter1"), "users/parent1/private/contact")));
    await assertFails(getDoc(doc(anon(), "users/parent1/private/contact")));
  });
});

describe("pets", () => {
  test("owner can create a pet (was broken: rule read resource on create)", async () => {
    await assertSucceeds(
      setDoc(doc(as("parent1"), "pets/pet2"), { ownerId: "parent1", name: "Mia", type: "Cat", breed: "", age: "", notes: "", createdAt: serverTimestamp() })
    );
  });
  test("cannot create a pet for someone else, or read another owner's pets", async () => {
    await assertFails(setDoc(doc(as("parent2"), "pets/pet3"), { ownerId: "parent1", name: "X", type: "Dog" }));
    await assertFails(getDoc(doc(as("parent2"), "pets/pet1")));
  });
});

describe("bookings", () => {
  test("a parent can request a correctly priced stay", async () => {
    await assertSucceeds(setDoc(doc(as("parent1"), "bookings/b1"), booking()));
  });
  test("the client cannot set its own price", async () => {
    await assertFails(setDoc(doc(as("parent1"), "bookings/b1"), booking({ totalPrice: 1 })));
    await assertFails(setDoc(doc(as("parent1"), "bookings/b1"), booking({ pricePerNight: 10, totalPrice: 30 })));
  });
  test("night count must match the dates", async () => {
    await assertFails(setDoc(doc(as("parent1"), "bookings/b1"), booking({ nights: 1, totalPrice: 2000 })));
  });
  test("cannot book as someone else, pre-pay, or use another person's pet", async () => {
    await assertFails(setDoc(doc(as("parent2"), "bookings/b1"), booking()));
    await assertFails(setDoc(doc(as("parent1"), "bookings/b1"), booking({ paymentStatus: "paid" })));
    await assertFails(setDoc(doc(as("parent1"), "bookings/b1"), booking({ status: "confirmed" })));
    await seed((db) => setDoc(doc(db, "pets/pet9"), { ownerId: "parent2", name: "Z", type: "Dog" }));
    await assertFails(setDoc(doc(as("parent1"), "bookings/b1"), booking({ petId: "pet9" })));
  });
  test("cannot book in the past", async () => {
    await assertFails(setDoc(doc(as("parent1"), "bookings/b1"), booking({ startDate: day(-10), endDate: day(-7) })));
  });

  describe("status changes", () => {
    beforeEach(() => seed((db) => setDoc(doc(db, "bookings/b1"), booking())));

    test("an unrelated user cannot touch the booking (was: any signed-in user)", async () => {
      await assertFails(getDoc(doc(as("parent2"), "bookings/b1")));
      await assertFails(updateDoc(doc(as("parent2"), "bookings/b1"), { status: "cancelled" }));
    });
    test("only the sitter accepts or declines", async () => {
      await assertFails(updateDoc(doc(as("parent1"), "bookings/b1"), { status: "confirmed" }));
      await assertFails(updateDoc(doc(as("sitter1"), "bookings/b1"), { status: "confirmed" })); // must acknowledge
      await assertSucceeds(updateDoc(doc(as("sitter1"), "bookings/b1"), { status: "confirmed", sitterAckAt: serverTimestamp() }));
    });
    test("nobody can mark a booking paid from the client", async () => {
      await assertFails(updateDoc(doc(as("parent1"), "bookings/b1"), { paymentStatus: "paid" }));
      await assertFails(updateDoc(doc(as("sitter1"), "bookings/b1"), { paymentStatus: "paid" }));
    });
    test("price cannot be edited after creation", async () => {
      await assertFails(updateDoc(doc(as("parent1"), "bookings/b1"), { totalPrice: 1 }));
    });
    test("a paid stay cannot be cancelled or completed early", async () => {
      await seed((db) => updateDoc(doc(db, "bookings/b1"), { status: "confirmed", paymentStatus: "paid" }));
      await assertFails(updateDoc(doc(as("parent1"), "bookings/b1"), { status: "cancelled" }));
      await assertFails(updateDoc(doc(as("sitter1"), "bookings/b1"), { status: "completed" }));
    });
    test("an unpaid stay cannot be completed", async () => {
      await seed((db) => updateDoc(doc(db, "bookings/b1"), { status: "confirmed", startDate: day(-5), endDate: day(-1) }));
      await assertFails(updateDoc(doc(as("sitter1"), "bookings/b1"), { status: "completed" }));
      await seed((db) => updateDoc(doc(db, "bookings/b1"), { paymentStatus: "paid" }));
      await assertSucceeds(updateDoc(doc(as("sitter1"), "bookings/b1"), { status: "completed" }));
    });
  });
});

describe("reviews", () => {
  const review = (over = {}) => ({
    sitterId: "sitter1",
    bookingId: "b1",
    authorId: "parent1",
    author: "Pat",
    authorPhoto: null,
    rating: 5,
    text: "Lovely stay, thank you!",
    petType: "Dog",
    helpfulBy: [],
    createdAt: serverTimestamp(),
    ...over,
  });

  test("only the parent of a completed stay can review it", async () => {
    await seed((db) => setDoc(doc(db, "bookings/b1"), booking({ status: "confirmed" })));
    await assertFails(setDoc(doc(as("parent1"), "reviews/b1"), review()));
    await seed((db) => updateDoc(doc(db, "bookings/b1"), { status: "completed" }));
    await assertFails(setDoc(doc(as("parent2"), "reviews/b1"), review({ authorId: "parent2" })));
    await assertSucceeds(setDoc(doc(as("parent1"), "reviews/b1"), review()));
  });
  test("helpful votes only toggle the voter; sitter replies once", async () => {
    await seed((db) => setDoc(doc(db, "reviews/b1"), { ...review(), createdAt: new Date() }));
    await assertSucceeds(updateDoc(doc(as("parent2"), "reviews/b1"), { helpfulBy: arrayUnion("parent2") }));
    await assertFails(updateDoc(doc(as("parent2"), "reviews/b1"), { helpfulBy: arrayUnion("someone-else") }));
    await assertFails(updateDoc(doc(as("parent2"), "reviews/b1"), { rating: 1 }));
    await assertFails(updateDoc(doc(as("parent2"), "reviews/b1"), { response: "Fake reply" }));
    await assertSucceeds(updateDoc(doc(as("sitter1"), "reviews/b1"), { response: "Thanks!", responseAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(as("sitter1"), "reviews/b1"), { response: "Edited" }));
  });
});

describe("messages", () => {
  const convo = {
    parentId: "parent1",
    sitterId: "sitter1",
    participants: ["parent1", "sitter1"],
    names: {},
    photos: {},
    lastMessage: "",
    lastSenderId: "",
    lastMessageAt: serverTimestamp(),
  };

  test("participants can start a thread and message; outsiders cannot read (was: any signed-in user)", async () => {
    await assertSucceeds(setDoc(doc(as("parent1"), "conversations/parent1_sitter1"), convo));
    const db = as("parent1");
    const batch = writeBatch(db);
    batch.set(doc(collection(db, "conversations/parent1_sitter1/messages")), { senderId: "parent1", text: "Hi!", createdAt: serverTimestamp() });
    batch.update(doc(db, "conversations/parent1_sitter1"), { lastMessage: "Hi!", lastSenderId: "parent1", lastMessageAt: serverTimestamp() });
    await assertSucceeds(batch.commit());

    await assertFails(getDoc(doc(as("parent2"), "conversations/parent1_sitter1")));
    await assertFails(
      setDoc(doc(as("parent2"), "conversations/parent1_sitter1/messages/m9"), { senderId: "parent2", text: "x", createdAt: serverTimestamp() })
    );
  });
  test("cannot create a thread you are not part of, or with a mismatched id", async () => {
    await assertFails(setDoc(doc(as("parent2"), "conversations/parent1_sitter1"), convo));
    await assertFails(setDoc(doc(as("parent1"), "conversations/whatever"), convo));
  });
  test("cannot impersonate a sender", async () => {
    await seed((db) => setDoc(doc(db, "conversations/parent1_sitter1"), { ...convo, lastMessageAt: new Date() }));
    await assertFails(
      setDoc(doc(as("parent1"), "conversations/parent1_sitter1/messages/m1"), { senderId: "sitter1", text: "x", createdAt: serverTimestamp() })
    );
  });
});

describe("community", () => {
  const post = {
    authorId: "parent1",
    author: "Pat",
    authorPhoto: null,
    authorRole: "parent",
    category: "tip",
    title: "Walk before work",
    text: "A long walk before you leave keeps them calm.",
    likedBy: [],
    commentCount: 0,
    createdAt: serverTimestamp(),
  };
  beforeEach(() => seed((db) => setDoc(doc(db, "posts/p1"), { ...post, createdAt: new Date() })));

  test("likes only add or remove yourself (was: any update allowed)", async () => {
    await assertSucceeds(updateDoc(doc(as("parent2"), "posts/p1"), { likedBy: arrayUnion("parent2") }));
    await assertFails(updateDoc(doc(as("parent2"), "posts/p1"), { likedBy: ["a", "b", "c"] }));
    await assertFails(updateDoc(doc(as("parent2"), "posts/p1"), { title: "Defaced title" }));
  });
  test("comment count only ever moves by one", async () => {
    await assertSucceeds(updateDoc(doc(as("parent2"), "posts/p1"), { commentCount: increment(1) }));
    await assertFails(updateDoc(doc(as("parent2"), "posts/p1"), { commentCount: 500 }));
  });
  test("cannot post as someone else", async () => {
    await assertFails(setDoc(doc(as("parent2"), "posts/p2"), post));
  });
});

describe("the app's list queries are allowed", () => {
  test("bookings, pets, conversations and reviews", async () => {
    const db = as("parent1");
    await assertSucceeds(getDocs(query(collection(db, "bookings"), where("parentId", "==", "parent1"), orderBy("createdAt", "desc"))));
    await assertFails(getDocs(query(collection(db, "bookings"), where("sitterId", "==", "sitter1"))));
    await assertSucceeds(getDocs(query(collection(db, "pets"), where("ownerId", "==", "parent1"), orderBy("createdAt", "desc"))));
    await assertFails(getDocs(collection(db, "pets")));
    await assertSucceeds(
      getDocs(query(collection(db, "conversations"), where("participants", "array-contains", "parent1"), orderBy("lastMessageAt", "desc")))
    );
    await assertSucceeds(getDocs(query(collection(db, "reviews"), where("authorId", "==", "parent1"))));
    await assertSucceeds(getDocs(query(collection(anon(), "users"), where("role", "==", "sitter"), where("onboarded", "==", true))));
  });
});

describe("rescues and vets", () => {
  const newOrg = { uid: "org9", displayName: "Hope Rescue", photoURL: null, role: "rescue", onboarded: false };

  test("an organisation can publish a phone number; people cannot", async () => {
    await assertSucceeds(setDoc(doc(as("org9"), "users/org9"), newOrg));
    await assertSucceeds(
      updateDoc(doc(as("org9"), "users/org9"), { onboarded: true, location: "Pune", address: "5 Lane", phone: "+91 00000 00099", lat: 18.5, lng: 73.8 })
    );
    await assertFails(updateDoc(doc(as("parent1"), "users/parent1"), { phone: "+91 00000 00002" }));
    await assertFails(updateDoc(doc(as("sitter1"), "users/sitter1"), { address: "My home address" }));
  });
  test("a listing can't go live without phone and address, or with junk values", async () => {
    await assertSucceeds(setDoc(doc(as("org9"), "users/org9"), newOrg));
    await assertFails(updateDoc(doc(as("org9"), "users/org9"), { onboarded: true, location: "Pune" }));
    const ok = { onboarded: true, location: "Pune", address: "5 Lane", phone: "+91 00000 00099" };
    await assertFails(updateDoc(doc(as("org9"), "users/org9"), { ...ok, phone: "call me maybe" }));
    await assertFails(updateDoc(doc(as("org9"), "users/org9"), { ...ok, website: "javascript:alert(1)" }));
    await assertFails(updateDoc(doc(as("org9"), "users/org9"), { ...ok, lat: 123 }));
    await assertSucceeds(updateDoc(doc(as("org9"), "users/org9"), { ...ok, website: "https://hope.example.org" }));
  });
  test("an organisation can't verify itself or change its role", async () => {
    await assertFails(updateDoc(doc(as("vet2"), "users/vet2"), { verified: true }));
    await assertFails(updateDoc(doc(as("vet1"), "users/vet1"), { role: "rescue" }));
    await assertFails(updateDoc(doc(as("vet1"), "users/vet1"), { vouchCount: 99 }));
  });
  test("a verified vet can edit its own listing", async () => {
    await assertSucceeds(updateDoc(doc(as("vet1"), "users/vet1"), { hours: "Open 24×7", open24x7: true }));
  });
  test("organisations can't book stays", async () => {
    await seed((db) => setDoc(doc(db, "pets/vetpet"), { ownerId: "vet1", name: "X", type: "Dog" }));
    await assertFails(setDoc(doc(as("vet1"), "bookings/b9"), booking({ parentId: "vet1", petId: "vetpet" })));
  });
  test("lists of verified listings and vouches are public", async () => {
    await assertSucceeds(getDocs(query(collection(anon(), "users"), where("role", "==", "vet"), where("verified", "==", true))));
    await assertSucceeds(getDocs(query(collection(anon(), "vouches"), where("sitterId", "==", "sitter1"))));
    await assertSucceeds(getDocs(query(collection(anon(), "vouches"), where("orgId", "==", "vet1"))));
  });
});

describe("vouches", () => {
  const vouch = (over = {}) => ({
    orgId: "vet1",
    orgName: "Anand Clinic for Animals",
    orgPhoto: null,
    orgType: "vet",
    sitterId: "sitter1",
    note: "Reliable with post-surgery care.",
    createdAt: serverTimestamp(),
    ...over,
  });

  test("a verified vet or rescue can vouch for a sitter", async () => {
    await assertSucceeds(setDoc(doc(as("vet1"), "vouches/vet1_sitter1"), vouch()));
    await assertSucceeds(
      setDoc(doc(as("rescue1"), "vouches/rescue1_sitter1"), vouch({ orgId: "rescue1", orgName: "Pawsitive Purpose Rescue", orgType: "rescue" }))
    );
    await assertSucceeds(getDoc(doc(anon(), "vouches/vet1_sitter1")));
  });
  test("an unverified organisation can't vouch", async () => {
    await assertFails(setDoc(doc(as("vet2"), "vouches/vet2_sitter1"), vouch({ orgId: "vet2", orgName: "New Clinic" })));
  });
  test("people can't vouch, including sitters for themselves", async () => {
    await assertFails(setDoc(doc(as("parent1"), "vouches/parent1_sitter1"), vouch({ orgId: "parent1", orgName: "Pat Parent" })));
    await assertFails(setDoc(doc(as("sitter1"), "vouches/sitter1_sitter1"), vouch({ orgId: "sitter1", orgName: "Sam Sitter", orgType: "vet" })));
  });
  test("can't forge another organisation, a name, or a type", async () => {
    await assertFails(setDoc(doc(as("vet2"), "vouches/vet1_sitter1"), vouch()));
    await assertFails(setDoc(doc(as("vet1"), "vouches/vet1_sitter1"), vouch({ orgName: "Famous Hospital" })));
    await assertFails(setDoc(doc(as("vet1"), "vouches/vet1_sitter1"), vouch({ orgType: "rescue" })));
    await assertFails(setDoc(doc(as("vet1"), "vouches/anything"), vouch()));
  });
  test("only sitters can be vouched for; notes are capped", async () => {
    await assertFails(setDoc(doc(as("vet1"), "vouches/vet1_parent1"), vouch({ sitterId: "parent1" })));
    await assertFails(setDoc(doc(as("vet1"), "vouches/vet1_sitter1"), vouch({ note: "x".repeat(301) })));
    await assertSucceeds(setDoc(doc(as("vet1"), "vouches/vet1_sitter1"), omit(vouch(), "note")));
  });
  test("only the organisation can edit its note or withdraw", async () => {
    await seed((db) => setDoc(doc(db, "vouches/vet1_sitter1"), { ...vouch(), createdAt: new Date() }));
    await assertSucceeds(updateDoc(doc(as("vet1"), "vouches/vet1_sitter1"), { note: "Updated" }));
    await assertFails(updateDoc(doc(as("vet1"), "vouches/vet1_sitter1"), { sitterId: "parent1" }));
    await assertFails(updateDoc(doc(as("vet1"), "vouches/vet1_sitter1"), { orgName: "Hacked" }));
    await assertFails(updateDoc(doc(as("sitter1"), "vouches/vet1_sitter1"), { note: "Glowing" }));
    await assertFails(deleteDoc(doc(as("sitter1"), "vouches/vet1_sitter1")));
    await assertFails(deleteDoc(doc(as("vet2"), "vouches/vet1_sitter1")));
    await assertSucceeds(deleteDoc(doc(as("vet1"), "vouches/vet1_sitter1")));
  });
});

// ─── Just looking around ──────────────────────────────────────────────────

describe("explorers (just looking around)", () => {
  const explorer = { uid: "ex1", displayName: "Member 1234", photoURL: null, role: "explorer", onboarded: true };

  test("can skip onboarding entirely", async () => {
    await assertSucceeds(setDoc(doc(as("ex1"), "users/ex1"), explorer));
  });
  test("can later choose a role, which reopens onboarding; established roles stay fixed", async () => {
    await seed((db) => setDoc(doc(db, "users/ex1"), explorer));
    await assertSucceeds(updateDoc(doc(as("ex1"), "users/ex1"), { role: "parent", onboarded: false }));
    await assertFails(updateDoc(doc(as("parent1"), "users/parent1"), { role: "sitter" }));
  });
  test("can't book, can't post, can't message", async () => {
    await seed((db) => setDoc(doc(db, "users/ex1"), explorer));
    await seed((db) => setDoc(doc(db, "pets/expet"), { ownerId: "ex1", name: "X", type: "Dog" }));
    await assertFails(setDoc(doc(as("ex1"), "bookings/b1"), booking({ parentId: "ex1", petId: "expet" })));
    await assertFails(
      setDoc(doc(as("ex1"), "posts/p1"), {
        authorId: "ex1", author: "x", authorPhoto: null, authorRole: "explorer", category: "tip",
        title: "Hello there", text: "A post from an explorer.", likedBy: [], commentCount: 0, createdAt: serverTimestamp(),
      })
    );
  });
});

// ─── Sitter identity verification (KYC) ───────────────────────────────────

describe("sitter KYC", () => {
  const withPhone = (uid) => env.authenticatedContext(uid, { phone_number: "+910000000001" }).firestore();
  const newSitter = { uid: "ns1", displayName: "New Sitter", photoURL: null, role: "sitter", onboarded: false };
  const caseDoc = (over = {}) => ({
    status: "submitted",
    legalName: "Nia Sitter",
    dob: "1995-04-12",
    idType: "aadhaar",
    idLast4: "1234",
    addressLine: "12 Hill Road, Bandra",
    city: "Mumbai",
    pincode: "400050",
    emergencyName: "Raj Sitter",
    emergencyPhone: "+91 00000 00007",
    idFront: "kyc/ns1/id-front.jpg",
    idBack: "kyc/ns1/id-back.jpg",
    selfie: "kyc/ns1/selfie.jpg",
    hasPoliceCert: false,
    declarations: {
      version: 1, honestProfile: true, safeHome: true, ownPetsDisclosed: true, noUnattended: true,
      dailyUpdates: true, personalCare: true, humaneHandling: true, emergencyPlan: true, reportIncidents: true,
    },
    consent: true,
    consentAt: serverTimestamp(),
    submittedAt: serverTimestamp(),
    ...over,
  });
  beforeEach(() => seed((db) => setDoc(doc(db, "users/ns1"), newSitter)));

  test("a sitter with a verified phone can submit a complete case, and read it back", async () => {
    await assertSucceeds(setDoc(doc(withPhone("ns1"), "kyc/ns1"), caseDoc()));
    await assertSucceeds(getDoc(doc(withPhone("ns1"), "kyc/ns1")));
  });
  test("nobody else can read a case", async () => {
    await seed((db) => setDoc(doc(db, "kyc/ns1"), { ...caseDoc(), submittedAt: new Date(), consentAt: new Date() }));
    await assertFails(getDoc(doc(as("parent1"), "kyc/ns1")));
    await assertFails(getDoc(doc(anon(), "kyc/ns1")));
    await assertFails(getDoc(doc(as("sitter1"), "kyc/ns1")));
  });
  test("needs a verified mobile number", async () => {
    await assertFails(setDoc(doc(as("ns1"), "kyc/ns1"), caseDoc()));
  });
  test("must be an adult, with a 4-character ID tail, valid pincode and a selfie", async () => {
    const db = withPhone("ns1");
    const y = new Date().getFullYear();
    await assertFails(setDoc(doc(db, "kyc/ns1"), caseDoc({ dob: `${y - 17}-01-01` })));
    await assertFails(setDoc(doc(db, "kyc/ns1"), caseDoc({ idLast4: "123456789012" }))); // a full number must never be stored
    await assertFails(setDoc(doc(db, "kyc/ns1"), caseDoc({ pincode: "40005" })));
    await assertFails(setDoc(doc(db, "kyc/ns1"), omit(caseDoc(), "selfie")));
  });
  test("files must be the sitter's own", async () => {
    await assertFails(setDoc(doc(withPhone("ns1"), "kyc/ns1"), caseDoc({ idFront: "kyc/someone-else/id-front.jpg" })));
  });
  test("PAN has no address, so it needs an address proof", async () => {
    const db = withPhone("ns1");
    const pan = { idType: "pan", idLast4: "234F" };
    const noBack = omit(caseDoc(pan), "idBack");
    await assertFails(setDoc(doc(db, "kyc/ns1"), noBack));
    await assertSucceeds(setDoc(doc(db, "kyc/ns1"), { ...noBack, addressProof: "kyc/ns1/address-proof.jpg" }));
  });
  test("an ID that has a back side needs it", async () => {
    await assertFails(setDoc(doc(withPhone("ns1"), "kyc/ns1"), omit(caseDoc(), "idBack")));
    await assertSucceeds(setDoc(doc(withPhone("ns1"), "kyc/ns1"), caseDoc()));
  });
  test("every care standard and the consent are mandatory", async () => {
    const db = withPhone("ns1");
    await assertFails(setDoc(doc(db, "kyc/ns1"), caseDoc({ consent: false })));
    await assertFails(setDoc(doc(db, "kyc/ns1"), caseDoc({ declarations: { ...caseDoc().declarations, safeHome: false } })));
    await assertFails(setDoc(doc(db, "kyc/ns1"), caseDoc({ declarations: omit(caseDoc().declarations, "humaneHandling") })));
  });
  test("a client can never approve itself", async () => {
    await assertFails(setDoc(doc(withPhone("ns1"), "kyc/ns1"), caseDoc({ status: "approved" })));
    await assertFails(updateDoc(doc(as("ns1"), "users/ns1"), { verified: true }));
    await assertFails(updateDoc(doc(as("ns1"), "users/ns1"), { backgroundChecked: true }));
  });
  test("a non-sitter can't open a case", async () => {
    await seed((db) => setDoc(doc(db, "users/ns2"), { ...newSitter, uid: "ns2", role: "parent" }));
    await assertFails(setDoc(doc(withPhone("ns2"), "kyc/ns2"), caseDoc({ idFront: "kyc/ns2/id-front.jpg", idBack: "kyc/ns2/id-back.jpg", selfie: "kyc/ns2/selfie.jpg" })));
  });
  test("a rejected case can be fixed and resubmitted; open and approved ones are frozen", async () => {
    await seed((db) => setDoc(doc(db, "kyc/ns1"), { ...caseDoc(), status: "rejected", reason: "Selfie too dark", submittedAt: new Date(), consentAt: new Date() }));
    await assertSucceeds(setDoc(doc(withPhone("ns1"), "kyc/ns1"), caseDoc()));
    await seed((db) => updateDoc(doc(db, "kyc/ns1"), { status: "submitted" }));
    await assertFails(setDoc(doc(withPhone("ns1"), "kyc/ns1"), caseDoc({ legalName: "Someone Else" })));
    await seed((db) => updateDoc(doc(db, "kyc/ns1"), { status: "approved" }));
    await assertFails(setDoc(doc(withPhone("ns1"), "kyc/ns1"), caseDoc({ legalName: "Someone Else" })));
  });
  test("a sitter can't go live without a submitted case", async () => {
    const ready = { onboarded: true, pricePerNight: 1800, petTypes: ["Dogs"] };
    await assertFails(updateDoc(doc(as("ns1"), "users/ns1"), ready));
    await assertSucceeds(setDoc(doc(withPhone("ns1"), "kyc/ns1"), caseDoc()));
    await assertSucceeds(updateDoc(doc(as("ns1"), "users/ns1"), ready));
  });
  test("home details are sitter-only and validated", async () => {
    const home = { type: "house", fencedYard: true, hasOwnPets: false, ownPets: "", children: false, smokeFree: true, maxHoursAlone: 4 };
    await assertSucceeds(updateDoc(doc(as("ns1"), "users/ns1"), { home }));
    await assertFails(updateDoc(doc(as("ns1"), "users/ns1"), { home: { ...home, maxHoursAlone: 40 } }));
    await assertFails(updateDoc(doc(as("parent1"), "users/parent1"), { home }));
  });
  test("bookings need a verified sitter", async () => {
    await seed((db) => updateDoc(doc(db, "users/sitter1"), { verified: false }));
    await assertFails(setDoc(doc(as("parent1"), "bookings/b1"), booking()));
    await seed((db) => updateDoc(doc(db, "users/sitter1"), { verified: true }));
    await assertSucceeds(setDoc(doc(as("parent1"), "bookings/b1"), booking()));
  });
});

describe("KYC document storage", () => {
  const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);
  const st = (uid) => env.authenticatedContext(uid).storage();
  const put = (uid, path, type = "image/jpeg", data = bytes) => uploadBytes(ref(st(uid), path), data, { contentType: type });

  test("the owner can upload documents but never read them back", async () => {
    await assertSucceeds(put("ns1", "kyc/ns1/id-front.jpg"));
    await assertSucceeds(put("ns1", "kyc/ns1/address-proof.pdf", "application/pdf"));
    await assertFails(getBytes(ref(st("ns1"), "kyc/ns1/id-front.jpg")));
  });
  test("nobody else can upload to or read someone's folder", async () => {
    await assertFails(put("parent1", "kyc/ns1/id-front.jpg"));
    await assertFails(uploadBytes(ref(env.unauthenticatedContext().storage(), "kyc/ns1/id-front.jpg"), bytes, { contentType: "image/jpeg" }));
    await env.withSecurityRulesDisabled(async (c) => uploadBytes(ref(c.storage(), "kyc/ns1/selfie.jpg"), bytes, { contentType: "image/jpeg" }));
    await assertFails(getBytes(ref(st("parent1"), "kyc/ns1/selfie.jpg")));
  });
  test("only expected file names, types and sizes", async () => {
    await assertFails(put("ns1", "kyc/ns1/anything.jpg"));
    await assertFails(put("ns1", "kyc/ns1/selfie.jpg", "text/html"));
    await assertFails(put("ns1", "kyc/ns1/selfie.jpg", "image/jpeg", new Uint8Array(9 * 1024 * 1024)));
  });
  test("approved documents can't be swapped out; rejected cases can re-upload", async () => {
    await seed((db) => setDoc(doc(db, "kyc/ns1"), { status: "approved" }));
    await assertFails(put("ns1", "kyc/ns1/id-front.jpg"));
    await seed((db) => setDoc(doc(db, "kyc/ns1"), { status: "rejected" }));
    await assertSucceeds(put("ns1", "kyc/ns1/id-front.jpg"));
  });
});

describe("declarations and the care sheet", () => {
  const make = (over) => setDoc(doc(as("parent1"), "bookings/b1"), booking(over));

  test("a booking with every declaration affirmed and a vaccinated pet is accepted", async () => {
    await assertSucceeds(make({}));
  });
  test("each declaration is mandatory, and must be true", async () => {
    for (const key of ["vaccinated", "parasiteControl", "healthDisclosed", "behaviourDisclosed", "noContagious", "ownerAuthorised", "conditionRecord", "inherentRisk", "emergencyAuth", "policy"]) {
      await assertFails(make({ declarations: declarations({ [key]: false }) }));
      await assertFails(make({ declarations: omit(declarations(), key) }));
    }
  });
  test("declarations are signed with the server time, at the current version", async () => {
    await assertFails(make({ declarations: declarations({ acceptedAt: new Date("2020-01-01") }) }));
    await assertFails(make({ declarations: declarations({ version: 2 }) }));
  });
  test("an emergency spending limit and an emergency contact are required", async () => {
    await assertFails(make({ declarations: declarations({ emergencyLimit: 100 }) }));
    await assertFails(make({ declarations: declarations({ emergencyLimit: 1e7 }) }));
    await assertFails(make({ declarations: omit(declarations(), "emergencyContactPhone") }));
    await assertFails(make({ declarations: declarations({ emergencyContactPhone: "call me" }) }));
  });
  test("the care sheet must say the pet's vaccinations are up to date", async () => {
    await assertFails(make({ petCare: { ...careSheet, vaccinated: "partial" } }));
    await assertFails(make({ petCare: omit(careSheet, "vaccinated") }));
    await assertFails(make({ petCare: { ...careSheet, bio: "extra field" } }));
  });
  test("care at the parent's home needs the home declarations and a sitter who offers it", async () => {
    await seed((db) => updateDoc(doc(db, "users/sitter1"), { services: ["Overnight stays", "House sitting"] }));
    await assertFails(make({ careLocation: "parent_home" })); // no home declarations
    await assertFails(make({ careLocation: "parent_home", declarations: declarations({ ...homeDecl, homePetProofed: false }) }));
    await assertSucceeds(make({ careLocation: "parent_home", declarations: declarations(homeDecl) }));
  });
  test("a sitter who doesn't offer house sitting can't be booked for it", async () => {
    await assertFails(make({ careLocation: "parent_home", declarations: declarations(homeDecl) }));
  });
  test("declarations can't be edited after the booking exists", async () => {
    await seed((db) => setDoc(doc(db, "bookings/b1"), { ...booking(), createdAt: new Date(), updatedAt: new Date(), declarations: { ...declarations(), acceptedAt: new Date() } }));
    await assertFails(updateDoc(doc(as("parent1"), "bookings/b1"), { "declarations.emergencyLimit": 100000 }));
    await assertFails(updateDoc(doc(as("parent1"), "bookings/b1"), { petCare: { vaccinated: "up_to_date" } }));
  });
  test("accepting needs the sitter's acknowledgement, from the sitter only", async () => {
    await seed((db) => setDoc(doc(db, "bookings/b1"), { ...booking(), createdAt: new Date(), updatedAt: new Date(), declarations: { ...declarations(), acceptedAt: new Date() } }));
    await assertFails(updateDoc(doc(as("parent1"), "bookings/b1"), { status: "confirmed", sitterAckAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(as("sitter1"), "bookings/b1"), { status: "confirmed", sitterAckAt: new Date() }));
    await assertSucceeds(updateDoc(doc(as("sitter1"), "bookings/b1"), { status: "confirmed", sitterAckAt: serverTimestamp(), updatedAt: serverTimestamp() }));
  });
  test("pet care sheets are validated and owner-only", async () => {
    const pet = { ownerId: "parent1", name: "Bruno", type: "Dog", createdAt: serverTimestamp() };
    await assertSucceeds(setDoc(doc(as("parent1"), "pets/p9"), { ...pet, ...careSheet, weightKg: 18.5, microchip: true, neutered: true, sex: "male" }));
    await assertFails(setDoc(doc(as("parent1"), "pets/p8"), { ...pet, vaccinated: "sometimes" }));
    await assertFails(setDoc(doc(as("parent1"), "pets/p7"), { ...pet, weightKg: 900 }));
    await assertFails(setDoc(doc(as("parent1"), "pets/p6"), { ...pet, id: "p6" })); // stray fields are refused
  });
});

// ─── Stay log, reports and blocking ───────────────────────────────────────

describe("stay log", () => {
  const paidStay = () =>
    seed((db) =>
      setDoc(doc(db, "bookings/b1"), {
        ...booking(), status: "confirmed", paymentStatus: "paid", createdAt: new Date(), updatedAt: new Date(),
        declarations: { ...declarations(), acceptedAt: new Date() },
      })
    );
  const entry = (over = {}) => ({ authorId: "sitter1", authorRole: "sitter", kind: "update", text: "Bruno ate well and had a long walk.", photos: [], createdAt: serverTimestamp(), ...over });
  const add = (uid, data) => setDoc(doc(as(uid), "bookings/b1/log/e" + Math.random().toString(36).slice(2, 8)), data);
  beforeEach(paidStay);

  test("the sitter posts daily updates; the parent can read them", async () => {
    await assertSucceeds(add("sitter1", entry()));
    await assertSucceeds(add("sitter1", entry({ photos: ["stays/b1/abcdef12.jpg"], text: "" })));
    const snap = await assertSucceeds(getDocs(collection(as("parent1"), "bookings/b1/log")));
    assert.equal(snap.size, 2);
  });
  test("both sides can record condition at drop-off, pick-up and incidents; only the sitter posts updates", async () => {
    await assertSucceeds(add("parent1", entry({ authorId: "parent1", authorRole: "parent", kind: "dropoff", text: "Small scratch on left ear, already healed." })));
    await assertSucceeds(add("sitter1", entry({ kind: "dropoff", text: "Checked in. Left ear scratch noted." })));
    await assertSucceeds(add("parent1", entry({ authorId: "parent1", authorRole: "parent", kind: "incident", text: "Concerned about a limp." })));
    await assertFails(add("parent1", entry({ authorId: "parent1", authorRole: "parent", kind: "update" })));
  });
  test("outsiders can neither read nor write", async () => {
    await assertFails(getDocs(collection(as("parent2"), "bookings/b1/log")));
    await assertFails(add("parent2", entry({ authorId: "parent2", authorRole: "parent", kind: "incident" })));
    await assertFails(getDocs(collection(anon(), "bookings/b1/log")));
  });
  test("no impersonation, empty entries, too many photos, or another stay's photos", async () => {
    await assertFails(add("sitter1", entry({ authorId: "parent1" })));
    await assertFails(add("sitter1", entry({ authorRole: "parent" })));
    await assertFails(add("sitter1", entry({ text: "", photos: [] })));
    await assertFails(add("sitter1", entry({ photos: ["stays/b1/a1.jpg", "stays/b1/a2.jpg", "stays/b1/a3.jpg", "stays/b1/a4.jpg", "stays/b1/a5.jpg"] })));
    await assertFails(add("sitter1", entry({ photos: ["stays/other/abcdef12.jpg"] })));
    await assertFails(add("sitter1", entry({ createdAt: new Date("2020-01-01") })));
  });
  test("entries are permanent: no edits, no deletes", async () => {
    const ref2 = doc(as("sitter1"), "bookings/b1/log/keep");
    await assertSucceeds(setDoc(ref2, entry()));
    await assertFails(updateDoc(ref2, { text: "Changed my story" }));
    await assertFails(deleteDoc(ref2));
  });
  test("only while a stay is paid and on", async () => {
    await seed((db) => updateDoc(doc(db, "bookings/b1"), { paymentStatus: "pending" }));
    await assertFails(add("sitter1", entry()));
    await seed((db) => updateDoc(doc(db, "bookings/b1"), { paymentStatus: "paid", status: "cancelled" }));
    await assertFails(add("sitter1", entry()));
  });
});

describe("stay photos storage", () => {
  const jpg = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);
  const st = (uid) => env.authenticatedContext(uid).storage();
  const put = (uid, name = "photo1234.jpg", type = "image/jpeg") => uploadBytes(ref(st(uid), `stays/b1/${name}`), jpg, { contentType: type });
  beforeEach(() => seed((db) => setDoc(doc(db, "bookings/b1"), { ...booking(), status: "confirmed", paymentStatus: "paid", createdAt: new Date(), updatedAt: new Date(), declarations: { ...declarations(), acceptedAt: new Date() } })));

  test("only the two parties can add or view photos", async () => {
    await assertSucceeds(put("sitter1"));
    await assertSucceeds(put("parent1", "photo5678.jpg"));
    await assertSucceeds(getBytes(ref(st("parent1"), "stays/b1/photo1234.jpg")));
    await assertFails(put("parent2", "photo9999.jpg"));
    await assertFails(getBytes(ref(st("parent2"), "stays/b1/photo1234.jpg")));
  });
  test("photos must be small JPEGs", async () => {
    // Overwriting is blocked in production by `allow update, delete: if false`; the Storage emulator
    // treats every upload as a create, so it can't be asserted here.
    await assertFails(put("sitter1", "photo4321.jpg", "text/html"));
    await assertFails(uploadBytes(ref(st("sitter1"), "stays/b1/photo7777.jpg"), new Uint8Array(7 * 1024 * 1024), { contentType: "image/jpeg" }));
  });
  test("not before the stay is paid", async () => {
    await seed((db) => updateDoc(doc(db, "bookings/b1"), { paymentStatus: "pending" }));
    await assertFails(put("sitter1"));
  });
});

describe("reports and blocking", () => {
  const report = (over = {}) => ({ reporterId: "parent1", targetType: "post", targetId: "p1", reason: "spam", details: "", createdAt: serverTimestamp(), ...over });

  test("anyone signed in can report; nobody can read reports back", async () => {
    await assertSucceeds(setDoc(doc(as("parent1"), "reports/r1"), report()));
    await assertFails(getDoc(doc(as("parent1"), "reports/r1")));
    await assertFails(getDocs(collection(as("parent1"), "reports")));
    await assertFails(setDoc(doc(anon(), "reports/r2"), report()));
  });
  test("a report is attributed to its author and well-formed", async () => {
    await assertFails(setDoc(doc(as("parent1"), "reports/r1"), report({ reporterId: "parent2" })));
    await assertFails(setDoc(doc(as("parent1"), "reports/r1"), report({ reason: "dislike" })));
    await assertFails(setDoc(doc(as("parent1"), "reports/r1"), report({ details: "x".repeat(501) })));
    await assertFails(updateDoc(doc(as("parent1"), "reports/r1"), { reason: "other" }));
  });
  test("a user manages their own block list", async () => {
    await assertSucceeds(setDoc(doc(as("sitter1"), "users/sitter1/blocked/parent1"), { createdAt: serverTimestamp() }));
    await assertSucceeds(getDoc(doc(as("sitter1"), "users/sitter1/blocked/parent1")));
    await assertFails(getDoc(doc(as("parent1"), "users/sitter1/blocked/parent1"))); // the blocked person can't see it
    await assertFails(setDoc(doc(as("parent1"), "users/sitter1/blocked/parent2"), { createdAt: serverTimestamp() }));
    await assertSucceeds(deleteDoc(doc(as("sitter1"), "users/sitter1/blocked/parent1")));
  });
  test("a blocked parent can't book that sitter", async () => {
    await seed((db) => setDoc(doc(db, "users/sitter1/blocked/parent1"), { createdAt: new Date() }));
    await assertFails(setDoc(doc(as("parent1"), "bookings/b1"), booking()));
    await seed((db) => deleteDoc(doc(db, "users/sitter1/blocked/parent1")));
    await assertSucceeds(setDoc(doc(as("parent1"), "bookings/b1"), booking()));
  });
  test("a blocked person can't message", async () => {
    const convo = { parentId: "parent1", sitterId: "sitter1", participants: ["parent1", "sitter1"], names: {}, photos: {}, lastMessage: "", lastSenderId: "", lastMessageAt: new Date() };
    await seed((db) => setDoc(doc(db, "conversations/parent1_sitter1"), convo));
    const msg = { senderId: "parent1", text: "hello", createdAt: serverTimestamp() };
    await assertSucceeds(setDoc(doc(as("parent1"), "conversations/parent1_sitter1/messages/m1"), msg));
    await seed((db) => setDoc(doc(db, "users/sitter1/blocked/parent1"), { createdAt: new Date() }));
    await assertFails(setDoc(doc(as("parent1"), "conversations/parent1_sitter1/messages/m2"), msg));
    // The blocker can still write to them (their own choice to engage).
    await assertSucceeds(setDoc(doc(as("sitter1"), "conversations/parent1_sitter1/messages/m3"), { ...msg, senderId: "sitter1" }));
  });
});
