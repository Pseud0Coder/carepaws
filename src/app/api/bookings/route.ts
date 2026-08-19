import { NextRequest, NextResponse } from "next/server";
import { createBooking, getBookingsForUser, updateBookingStatus } from "@/lib/firestore";
import { verifyAuth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const auth = await verifyAuth(req);
  if (auth instanceof NextResponse) return auth;

  const body = await req.json();
  const { sitterId, sitterName, parentId, parentName, petId, petName, startDate, endDate, totalPrice, notes } = body;

  if (!sitterId || !parentId || !petId || !startDate || !endDate) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Ensure the authenticated user is the one making the booking
  if (auth.uid !== parentId) {
    return NextResponse.json({ error: "Can only book as yourself" }, { status: 403 });
  }

  const nights = Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24));
  const calculatedPrice = nights * (totalPrice / Math.max(nights, 1));

  const bookingId = await createBooking({
    sitterId,
    sitterName,
    parentId,
    parentName,
    petId,
    petName,
    startDate,
    endDate,
    status: "upcoming",
    totalPrice: calculatedPrice,
    paymentStatus: "pending",
    notes,
  });

  return NextResponse.json({ id: bookingId, success: true });
}

export async function GET(req: NextRequest) {
  const auth = await verifyAuth(req);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  // Only allow users to fetch their own bookings
  if (auth.uid !== userId) {
    return NextResponse.json({ error: "Can only view your own bookings" }, { status: 403 });
  }

  const { parentBookings, sitterBookings } = await getBookingsForUser(userId);
  return NextResponse.json({ parentBookings, sitterBookings });
}

export async function PATCH(req: NextRequest) {
  const auth = await verifyAuth(req);
  if (auth instanceof NextResponse) return auth;

  const body = await req.json();
  const { bookingId, status } = body;
  if (!bookingId || !status) return NextResponse.json({ error: "bookingId and status required" }, { status: 400 });

  await updateBookingStatus(bookingId, status);
  return NextResponse.json({ success: true });
}
