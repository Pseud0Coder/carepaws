// Security-rule tests. Run with: npm run test:rules
// (starts the Firestore emulator via firebase-tools and runs this file)
import { readFileSync } from "node:fs";
import { after, before, beforeEach, describe, test } from "node:test";
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
  pricePerNight: 2000,
  petTypes: ["Dogs"],
  services: ["Overnight stays"],
};
const parent = { uid: "parent1", displayName: "Pat Parent", photoURL: null, role: "parent", onboarded: true };

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
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...over,
  };
}

const as = (uid) => env.authenticatedContext(uid).firestore();
const anon = () => env.unauthenticatedContext().firestore();

async function seed(fn) {
  await env.withSecurityRulesDisabled(async (ctx) => fn(ctx.firestore()));
}

before(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-carepaws",
    firestore: { rules: readFileSync("firestore.rules", "utf8") },
  });
});

after(async () => env?.cleanup());

beforeEach(async () => {
  await env.clearFirestore();
  await seed(async (db) => {
    await setDoc(doc(db, "users/sitter1"), sitter);
    await setDoc(doc(db, "users/parent1"), parent);
    await setDoc(doc(db, "users/parent2"), { ...parent, uid: "parent2" });
    await setDoc(doc(db, "pets/pet1"), { ownerId: "parent1", name: "Bruno", type: "Dog", breed: "", age: "", notes: "" });
  });
});

describe("users", () => {
  test("anyone can read public profiles", async () => {
    await assertSucceeds(getDoc(doc(anon(), "users/sitter1")));
  });
  test("a user cannot verify themselves or set their rating", async () => {
    await assertFails(updateDoc(doc(as("sitter1"), "users/sitter1"), { verified: true }));
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
      await assertSucceeds(updateDoc(doc(as("sitter1"), "bookings/b1"), { status: "confirmed" }));
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
