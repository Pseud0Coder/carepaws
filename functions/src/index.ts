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
