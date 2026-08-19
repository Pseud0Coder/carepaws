import { NextRequest, NextResponse } from "next/server";
import { getReviewsForSitter, addReview, markReviewHelpful, respondToReview } from "@/lib/firestore";
import { verifyAuth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sitterId = searchParams.get("sitterId");
  if (!sitterId) return NextResponse.json({ error: "sitterId required" }, { status: 400 });

  const reviews = await getReviewsForSitter(sitterId);
  return NextResponse.json(reviews);
}

export async function POST(req: NextRequest) {
  const auth = await verifyAuth(req);
  if (auth instanceof NextResponse) return auth;

  const body = await req.json();
  const { sitterId, bookingId, author, authorGender, rating, text, petType } = body;

  if (!sitterId || !rating || !text) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Use the authenticated user's identity
  const reviewId = await addReview({
    sitterId,
    bookingId: bookingId || "",
    authorId: auth.uid,
    author: author || auth.displayName || "Anonymous",
    authorGender: authorGender || "female",
    rating,
    date: new Date().toISOString().split("T")[0],
    text,
    petType: petType || "Dog",
  });

  return NextResponse.json({ id: reviewId, success: true });
}

export async function PATCH(req: NextRequest) {
  const auth = await verifyAuth(req);
  if (auth instanceof NextResponse) return auth;

  const body = await req.json();
  const { reviewId, action, response } = body;

  if (action === "helpful" && reviewId) {
    await markReviewHelpful(reviewId, auth.uid);
    return NextResponse.json({ success: true });
  }

  if (action === "respond" && reviewId && response) {
    await respondToReview(reviewId, response);
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
