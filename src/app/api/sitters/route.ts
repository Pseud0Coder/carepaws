import { NextRequest, NextResponse } from "next/server";
import { getSitters, getSitter, updateSitterProfile } from "@/lib/firestore";
import { verifyAuth } from "@/lib/auth";

// GET is public (browsing sitters doesn't require auth)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const id = searchParams.get("id");
  if (id) {
    const sitter = await getSitter(id);
    if (!sitter) return NextResponse.json({ error: "Sitter not found" }, { status: 404 });
    return NextResponse.json(sitter);
  }

  const filters = {
    search: searchParams.get("search") || undefined,
    petType: searchParams.get("petType") || undefined,
    sortBy: searchParams.get("sortBy") || undefined,
    maxPrice: searchParams.get("maxPrice") ? Number(searchParams.get("maxPrice")) : undefined,
    minRating: searchParams.get("minRating") ? Number(searchParams.get("minRating")) : undefined,
  };

  const sitters = await getSitters(filters);
  return NextResponse.json(sitters);
}

export async function PUT(req: NextRequest) {
  const auth = await verifyAuth(req);
  if (auth instanceof NextResponse) return auth;

  const body = await req.json();
  const { uid, ...data } = body;
  if (!uid) return NextResponse.json({ error: "uid required" }, { status: 400 });

  if (auth.uid !== uid) {
    return NextResponse.json({ error: "Can only update your own profile" }, { status: 403 });
  }

  await updateSitterProfile(uid, data);
  return NextResponse.json({ success: true });
}
