import { NextRequest, NextResponse } from "next/server";
import { getOrCreateConversation, sendMessage } from "@/lib/firestore";
import { verifyAuth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const auth = await verifyAuth(req);
  if (auth instanceof NextResponse) return auth;

  const body = await req.json();
  const { action, parentId, sitterId, parentName, sitterName, parentPhoto, sitterPhoto, conversationId, senderName, text } = body;

  if (action === "send" && conversationId && text) {
    await sendMessage(conversationId, auth.uid, senderName || auth.displayName || "User", text);
    return NextResponse.json({ success: true });
  }

  if (action === "create" && parentId && sitterId) {
    // Ensure the authenticated user is one of the participants
    if (auth.uid !== parentId && auth.uid !== sitterId) {
      return NextResponse.json({ error: "Can only create conversations you're part of" }, { status: 403 });
    }
    const id = await getOrCreateConversation(parentId, sitterId, parentName, sitterName, parentPhoto, sitterPhoto);
    return NextResponse.json({ id, success: true });
  }

  return NextResponse.json({ error: "Invalid request" }, { status: 400 });
}
