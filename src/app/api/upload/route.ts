import { NextRequest, NextResponse } from "next/server";
import { uploadFile } from "@/lib/firestore";
import { verifyAuth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const auth = await verifyAuth(req);
  if (auth instanceof NextResponse) return auth;

  const formData = await req.formData();
  const file = formData.get("file") as File;
  const path = formData.get("path") as string;

  if (!file || !path) {
    return NextResponse.json({ error: "file and path required" }, { status: 400 });
  }

  // Ensure users can only upload to their own path
  if (!path.startsWith(`users/${auth.uid}/`)) {
    return NextResponse.json({ error: "Can only upload to your own directory" }, { status: 403 });
  }

  const url = await uploadFile(path, file);
  return NextResponse.json({ url });
}
