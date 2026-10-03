/**
 * CarePaws server code. Everything else talks to Firestore directly under
 * firestore.rules; these functions own the parts a client must never control:
 *   - creating Razorpay orders from the booking's stored price
 *   - verifying payments and marking bookings paid
 *   - keeping sitter ratings and stay counts honest
 *
 * Secrets (set once with `firebase functions:secrets:set NAME`):
 *   RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, Timestamp, getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { setGlobalOptions } from "firebase-functions/v2";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { onDocumentUpdated, onDocumentWritten } from "firebase-functions/v2/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { defineSecret } from "firebase-functions/params";
import Razorpay from "razorpay";

initializeApp();
const db = getFirestore();

// Keep in sync with NEXT_PUBLIC_FIREBASE_FUNCTIONS_REGION in the app.
setGlobalOptions({ region: "asia-south1", maxInstances: 10 });

const RAZORPAY_KEY_ID = defineSecret("RAZORPAY_KEY_ID");
const RAZORPAY_KEY_SECRET = defineSecret("RAZORPAY_KEY_SECRET");

interface BookingDoc {
  parentId: string;
  sitterId: string;
  petName: string;
  totalPrice: number;
  status: string;
  paymentStatus: string;
  razorpayOrderId?: string;
}

function razorpay() {
  return new Razorpay({ key_id: RAZORPAY_KEY_ID.value(), key_secret: RAZORPAY_KEY_SECRET.value() });
}

async function loadPayableBooking(bookingId: unknown, uid: string) {
  if (typeof bookingId !== "string" || !bookingId) throw new HttpsError("invalid-argument", "bookingId is required.");
  const ref = db.collection("bookings").doc(bookingId);
  const snap = await ref.get();
  const b = snap.data() as BookingDoc | undefined;
  if (!b) throw new HttpsError("not-found", "Booking not found.");
  if (b.parentId !== uid) throw new HttpsError("permission-denied", "Only the pet parent can pay for this stay.");
  if (b.paymentStatus === "paid") throw new HttpsError("failed-precondition", "This stay is already paid.");
  if (b.status !== "confirmed") throw new HttpsError("failed-precondition", "The sitter hasn't accepted this stay yet.");
  return { ref, b };
}

/** Creates (or reuses) a Razorpay order for a confirmed booking. The amount comes from Firestore. */
export const createPaymentOrder = onCall({ secrets: [RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET] }, async (req) => {
  if (!req.auth) throw new HttpsError("unauthenticated", "Sign in first.");
  const { ref, b } = await loadPayableBooking(req.data?.bookingId, req.auth.uid);
  const amount = Math.round(b.totalPrice * 100); // paise
  const rp = razorpay();

  if (b.razorpayOrderId) {
    const existing = await rp.orders.fetch(b.razorpayOrderId);
    if (existing.status !== "paid" && Number(existing.amount) === amount) {
      return { orderId: existing.id, amount, currency: "INR", keyId: RAZORPAY_KEY_ID.value() };
    }
  }

  const order = await rp.orders.create({
    amount,
    currency: "INR",
    receipt: ref.id,
    notes: { bookingId: ref.id, parentId: b.parentId, sitterId: b.sitterId },
  });
  await ref.update({ razorpayOrderId: order.id, updatedAt: FieldValue.serverTimestamp() });
  return { orderId: order.id, amount, currency: "INR", keyId: RAZORPAY_KEY_ID.value() };
});

/** Verifies Razorpay's signature, double-checks the payment with Razorpay, then marks the booking paid. */
export const verifyPayment = onCall({ secrets: [RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET] }, async (req) => {
  if (!req.auth) throw new HttpsError("unauthenticated", "Sign in first.");
  const { orderId, paymentId, signature } = req.data ?? {};
  if (![orderId, paymentId, signature].every((v) => typeof v === "string" && v.length > 0 && v.length < 200)) {
    throw new HttpsError("invalid-argument", "Missing payment details.");
  }
  const { ref, b } = await loadPayableBooking(req.data?.bookingId, req.auth.uid);
  if (b.razorpayOrderId !== orderId) throw new HttpsError("failed-precondition", "This payment is for a different order.");

  const expected = createHmac("sha256", RAZORPAY_KEY_SECRET.value()).update(`${orderId}|${paymentId}`).digest();
  const given = Buffer.from(signature, "hex");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    throw new HttpsError("permission-denied", "Payment signature is invalid.");
  }

  const payment = await razorpay().payments.fetch(paymentId);
  const amount = Math.round(b.totalPrice * 100);
  if (payment.order_id !== orderId || Number(payment.amount) !== amount || !["authorized", "captured"].includes(payment.status)) {
    throw new HttpsError("failed-precondition", "Payment could not be confirmed.");
  }

  await db.runTransaction(async (tx) => {
    const fresh = (await tx.get(ref)).data() as BookingDoc;
    if (fresh.paymentStatus === "paid") return;
    tx.update(ref, {
      paymentStatus: "paid",
      paymentId,
      paidAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
  return { verified: true };
});

/** Recomputes a sitter's rating whenever one of their reviews is written. */
export const onReviewWritten = onDocumentWritten("reviews/{reviewId}", async (event) => {
  const sitterIds = new Set<string>();
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  if (before?.sitterId) sitterIds.add(before.sitterId);
  if (after?.sitterId) sitterIds.add(after.sitterId);
  // Helpful votes and replies don't change the rating.
  if (before && after && before.rating === after.rating && before.sitterId === after.sitterId) return;

  for (const sitterId of sitterIds) {
    const reviews = await db.collection("reviews").where("sitterId", "==", sitterId).select("rating").get();
    const count = reviews.size;
    const sum = reviews.docs.reduce((s, d) => s + (Number(d.get("rating")) || 0), 0);
    const rating = count ? Math.round((sum / count) * 10) / 10 : 0;
    await db.collection("users").doc(sitterId).set(
      { rating, reviewCount: count, topRated: count >= 10 && rating >= 4.8 },
      { merge: true }
    );
  }
});

/** Keeps the public "stays done" count in step with completed bookings. */
export const onBookingCompleted = onDocumentUpdated("bookings/{bookingId}", async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  if (!after || before?.status === after.status || after.status !== "completed") return;
  const done = await db
    .collection("bookings")
    .where("sitterId", "==", after.sitterId)
    .where("status", "==", "completed")
    .count()
    .get();
  await db.collection("users").doc(after.sitterId).set({ completedStays: done.data().count }, { merge: true });
});

/** Keeps a sitter's public "vouched by N" count in step with their vouches. */
export const onVouchWritten = onDocumentWritten("vouches/{vouchId}", async (event) => {
  const sitterIds = new Set<string>();
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  if (before?.sitterId) sitterIds.add(before.sitterId);
  if (after?.sitterId) sitterIds.add(after.sitterId);
  // Editing a note doesn't change the count.
  if (before && after && before.sitterId === after.sitterId) return;

  for (const sitterId of sitterIds) {
    const n = (await db.collection("vouches").where("sitterId", "==", sitterId).count().get()).data().count;
    await db.collection("users").doc(sitterId).set({ vouchCount: n }, { merge: true });
  }
});

/**
 * Keeps vouches honest when a rescue or clinic changes:
 *  - losing verification withdraws everything it has vouched for
 *  - a new name or photo is copied onto its vouches
 */
export const onOrgUpdated = onDocumentUpdated("users/{uid}", async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  if (!before || !after || !["rescue", "vet"].includes(after.role)) return;
  const orgId = event.params.uid;
  const vouches = await db.collection("vouches").where("orgId", "==", orgId).get();
  if (vouches.empty) return;

  if (before.verified === true && after.verified !== true) {
    for (let i = 0; i < vouches.docs.length; i += 400) {
      const batch = db.batch();
      vouches.docs.slice(i, i + 400).forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
    return;
  }
  if (before.displayName !== after.displayName || before.photoURL !== after.photoURL) {
    for (let i = 0; i < vouches.docs.length; i += 400) {
      const batch = db.batch();
      vouches.docs
        .slice(i, i + 400)
        .forEach((d) => batch.update(d.ref, { orgName: after.displayName, orgPhoto: after.photoURL ?? null }));
      await batch.commit();
    }
  }
});

/**
 * Data minimisation for identity verification: ID images and personal details are deleted
 * RETENTION_DAYS after a decision. Only the outcome and an audit trail are kept.
 */
const KYC_RETENTION_DAYS = 30;

export const purgeKycImages = onSchedule({ schedule: "every day 03:30", timeZone: "Asia/Kolkata" }, async () => {
  const cutoff = Timestamp.fromMillis(Date.now() - KYC_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const decided = await db.collection("kyc").where("reviewedAt", "<", cutoff).get();
  for (const d of decided.docs) {
    if (d.get("purgedAt")) continue;
    await getStorage().bucket().deleteFiles({ prefix: `kyc/${d.id}/` });
    await d.ref.update({
      idFront: FieldValue.delete(),
      idBack: FieldValue.delete(),
      selfie: FieldValue.delete(),
      addressProof: FieldValue.delete(),
      policeCert: FieldValue.delete(),
      dob: FieldValue.delete(),
      addressLine: FieldValue.delete(),
      city: FieldValue.delete(),
      pincode: FieldValue.delete(),
      emergencyName: FieldValue.delete(),
      emergencyPhone: FieldValue.delete(),
      purgedAt: FieldValue.serverTimestamp(),
    });
  }
});

/**
 * Account deletion (an in-app path is required by Google Play and by India's DPDP Act right to erasure).
 *
 * Deleted: profile and private contact details, pets, identity documents and photos, blocks, vouches
 * given or received, reviews received. Anonymised, because other people's records depend on them:
 * bookings (kept for payment and dispute records), reviews, posts and comments written, and chat
 * history (messages stay visible to the person they were sent to). Reports a user filed are kept.
 *
 * Refused while the user has a stay in progress or coming up, and if the sign-in is not recent.
 */
export const deleteAccount = onCall({ timeoutSeconds: 300, memory: "512MiB" }, async (req) => {
  if (!req.auth) throw new HttpsError("unauthenticated", "Sign in first.");
  const uid = req.auth.uid;

  // A stolen session shouldn't be able to erase an account: require a sign-in in the last 15 minutes.
  const signedInAt = Number(req.auth.token.auth_time) * 1000;
  if (!signedInAt || Date.now() - signedInAt > 15 * 60 * 1000) {
    throw new HttpsError("failed-precondition", "recent-login-required");
  }

  const [asParent, asSitter] = await Promise.all([
    db.collection("bookings").where("parentId", "==", uid).get(),
    db.collection("bookings").where("sitterId", "==", uid).get(),
  ]);
  const bookings = [...asParent.docs, ...asSitter.docs];
  if (bookings.some((d) => d.get("status") === "confirmed")) {
    throw new HttpsError("failed-precondition", "active-stays");
  }

  const ANON = "Deleted user";
  const writer = db.bulkWriter();

  // Bookings: close open requests, and strip the personal details from all of them.
  for (const d of bookings) {
    const isParent = d.get("parentId") === uid;
    const patch: Record<string, unknown> = isParent
      ? {
          parentName: ANON, parentPhoto: null, notes: "", petNotes: "",
          "declarations.emergencyContactName": "", "declarations.emergencyContactPhone": "",
          "declarations.preferredVetName": FieldValue.delete(), "declarations.preferredVetPhone": FieldValue.delete(),
        }
      : { sitterName: ANON, sitterPhoto: null };
    if (d.get("status") === "pending") patch.status = isParent ? "cancelled" : "declined";
    void writer.update(d.ref, patch);
  }

  // Pets, vouches, reviews, identity.
  const [pets, vouchesGiven, vouchesReceived, reviewsReceived, reviewsWritten, posts, liked, helpful, comments, convos] = await Promise.all([
    db.collection("pets").where("ownerId", "==", uid).get(),
    db.collection("vouches").where("orgId", "==", uid).get(),
    db.collection("vouches").where("sitterId", "==", uid).get(),
    db.collection("reviews").where("sitterId", "==", uid).get(),
    db.collection("reviews").where("authorId", "==", uid).get(),
    db.collection("posts").where("authorId", "==", uid).get(),
    db.collection("posts").where("likedBy", "array-contains", uid).get(),
    db.collection("reviews").where("helpfulBy", "array-contains", uid).get(),
    db.collectionGroup("comments").where("authorId", "==", uid).get(),
    db.collection("conversations").where("participants", "array-contains", uid).get(),
  ]);
  for (const d of [...pets.docs, ...vouchesGiven.docs, ...vouchesReceived.docs, ...reviewsReceived.docs]) void writer.delete(d.ref);
  for (const d of reviewsWritten.docs) void writer.update(d.ref, { author: ANON, authorPhoto: null, authorId: "deleted-user" });
  for (const d of posts.docs) void writer.update(d.ref, { author: ANON, authorPhoto: null, authorId: "deleted-user" });
  for (const d of comments.docs) void writer.update(d.ref, { author: ANON, authorPhoto: null, authorId: "deleted-user" });
  for (const d of liked.docs) void writer.update(d.ref, { likedBy: FieldValue.arrayRemove(uid) });
  for (const d of helpful.docs) void writer.update(d.ref, { helpfulBy: FieldValue.arrayRemove(uid) });
  for (const d of convos.docs) void writer.update(d.ref, { [`names.${uid}`]: ANON, [`photos.${uid}`]: null });
  void writer.delete(db.doc(`kyc/${uid}`));
  await writer.close();

  // Profile (with private contact and block list), and files.
  await db.recursiveDelete(db.doc(`users/${uid}`));
  const bucket = getStorage().bucket();
  await Promise.all([bucket.deleteFiles({ prefix: `kyc/${uid}/` }), bucket.deleteFiles({ prefix: `users/${uid}/` })]);

  // Last, so a failure above can simply be retried by the user.
  await getAuth().deleteUser(uid);
  return { deleted: true };
});
