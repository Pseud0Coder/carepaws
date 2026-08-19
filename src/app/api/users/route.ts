import { NextRequest, NextResponse } from "next/server";
import { getUserProfile, createOrUpdateUser } from "@/lib/firestore";
import { verifyAuth } from "@/lib/auth";

// GET is public (sitter profiles need to be visible)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const uid = searchParams.get("uid");
  if (!uid) return NextResponse.json({ error: "uid required" }, { status: 400 });

  const profile = await getUserProfile(uid);
  return NextResponse.json(profile);
}

export async function POST(req: NextRequest) {
  const auth = await verifyAuth(req);
  if (auth instanceof NextResponse) return auth;

  const body = await req.json();
  const { uid, ...data } = body;
  if (!uid) return NextResponse.json({ error: "uid required" }, { status: 400 });

  if (auth.uid !== uid) {
    return NextResponse.json({ error: "Can only update your own profile" }, { status: 403 });
  }

  await createOrUpdateUser(uid, data);
  return NextResponse.json({ success: true });
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

  await createOrUpdateUser(uid, data);
  return NextResponse.json({ success: true });
}
