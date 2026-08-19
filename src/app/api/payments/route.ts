import { NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";
import crypto from "crypto";
import { verifyAuth } from "@/lib/auth";

function getRazorpay() {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    throw new Error("Razorpay credentials not configured");
  }
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
}

export async function POST(req: NextRequest) {
  const auth = await verifyAuth(req);
  if (auth instanceof NextResponse) return auth;

  const body = await req.json();
  const { action, amount, bookingId, paymentId, orderId, razorpaySignature } = body;

  if (action === "create-order") {
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    try {
      const razorpay = getRazorpay();
      const order = await razorpay.orders.create({
        amount: Math.round(amount * 100), // Razorpay expects paise
        currency: "INR",
        receipt: bookingId || `receipt_${Date.now()}`,
      });

      return NextResponse.json({
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      });
    } catch (error) {
      console.error("Razorpay order creation failed:", error);
      return NextResponse.json(
        { error: "Failed to create payment order" },
        { status: 500 }
      );
    }
  }

  if (action === "verify") {
    if (!paymentId || !orderId || !razorpaySignature) {
      return NextResponse.json({ error: "Missing payment verification params" }, { status: 400 });
    }

    const body_str = orderId + "|" + paymentId;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(body_str)
      .digest("hex");

    if (expectedSignature === razorpaySignature) {
      return NextResponse.json({ verified: true, paymentId, orderId });
    } else {
      return NextResponse.json({ verified: false, error: "Invalid signature" }, { status: 400 });
    }
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
