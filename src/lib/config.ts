/**
 * Features that need Firebase's paid Blaze plan ship switched off, so the app runs completely on the free Spark plan.
 * Flip one on at build time once the matching backend is deployed (see README, "Spark and Blaze").
 */

/** SMS one-time-password sign-in and mobile verification. Needs Blaze (Firebase bills the SMS). */
export const PHONE_OTP = process.env.NEXT_PUBLIC_PHONE_OTP === "1";

/** Pay inside the app through Razorpay. Needs the Cloud Functions in functions/ (Blaze). Otherwise people pay the sitter directly. */
export const ONLINE_PAYMENTS = process.env.NEXT_PUBLIC_ONLINE_PAYMENTS === "1";
