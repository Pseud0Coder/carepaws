import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth } from "./firebase-admin";

/**
 * Verifies the Firebase ID token from the Authorization header.
 * Returns the decoded token on success, or a NextResponse error on failure.
 */
export async function verifyAuth(
  req: NextRequest
): Promise<
  { uid: string; email: string | null; displayName: string | null } | NextResponse
> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Missing or invalid Authorization header" },
      { status: 401 }
    );
  }

  const idToken = authHeader.slice(7);
  try {
    const decoded = await getAdminAuth().verifyIdToken(idToken);
    return {
      uid: decoded.uid,
      email: decoded.email || null,
      displayName: decoded.name || null,
    };
  } catch {
    return NextResponse.json(
      { error: "Invalid or expired token" },
      { status: 401 }
    );
  }
}
