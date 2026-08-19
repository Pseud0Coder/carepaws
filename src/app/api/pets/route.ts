import { NextRequest, NextResponse } from "next/server";
import { getUserPets, addPet, updatePet, deletePet } from "@/lib/firestore";
import { verifyAuth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const auth = await verifyAuth(req);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  if (auth.uid !== userId) {
    return NextResponse.json({ error: "Can only view your own pets" }, { status: 403 });
  }

  const pets = await getUserPets(userId);
  return NextResponse.json(pets);
}

export async function POST(req: NextRequest) {
  const auth = await verifyAuth(req);
  if (auth instanceof NextResponse) return auth;

  const body = await req.json();
  const { userId, name, type, breed, age, notes, photoURL } = body;

  if (!userId || !name || !type) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (auth.uid !== userId) {
    return NextResponse.json({ error: "Can only add pets for yourself" }, { status: 403 });
  }

  const petId = await addPet(userId, { ownerId: userId, name, type, breed, age, notes, photoURL });
  return NextResponse.json({ id: petId, success: true });
}

export async function PUT(req: NextRequest) {
  const auth = await verifyAuth(req);
  if (auth instanceof NextResponse) return auth;

  const body = await req.json();
  const { petId, ...data } = body;
  if (!petId) return NextResponse.json({ error: "petId required" }, { status: 400 });

  await updatePet(petId, data);
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const auth = await verifyAuth(req);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const petId = searchParams.get("petId");
  if (!petId) return NextResponse.json({ error: "petId required" }, { status: 400 });

  await deletePet(petId);
  return NextResponse.json({ success: true });
}
