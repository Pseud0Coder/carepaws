"use client";

import { createPaymentOrder, verifyPayment } from "./db";
import type { Booking, UserProfile } from "./types";

interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface RazorpayInstance {
  open(): void;
  on(event: "payment.failed", cb: (r: { error: { description?: string } }) => void): void;
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance;
  }
}

function loadCheckout(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Couldn't reach the payment service. Check your connection."));
    document.body.appendChild(s);
  });
}

/**
 * Pays for a confirmed booking. The amount comes from the server-side order
 * (computed from the booking document), never from this client.
 * Resolves true once the server has verified the signature and marked it paid.
 */
export async function payForBooking(booking: Booking, payer: UserProfile, email?: string): Promise<boolean> {
  await loadCheckout();
  const order = await createPaymentOrder(booking.id);

  return new Promise((resolve, reject) => {
    const rzp = new window.Razorpay!({
      key: order.keyId,
      order_id: order.orderId,
      amount: order.amount,
      currency: order.currency,
      name: "CarePaws",
      description: `${booking.petName}'s stay with ${booking.sitterName}`,
      prefill: { name: payer.displayName, email },
      theme: { color: "#4d5e44" },
      modal: { ondismiss: () => resolve(false) },
      handler: async (r: RazorpayResponse) => {
        try {
          const res = await verifyPayment({
            bookingId: booking.id,
            orderId: r.razorpay_order_id,
            paymentId: r.razorpay_payment_id,
            signature: r.razorpay_signature,
          });
          resolve(res.verified);
        } catch (e) {
          reject(e);
        }
      },
    });
    rzp.on("payment.failed", (r) => reject(new Error(r.error?.description || "Payment failed.")));
    rzp.open();
  });
}
