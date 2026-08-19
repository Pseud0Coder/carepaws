import { NextRequest, NextResponse } from "next/server";
import { getCommunityPosts, createPost, likePost, getPostComments, addComment } from "@/lib/firestore";
import { verifyAuth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const postId = searchParams.get("postId");
  const category = searchParams.get("category") || undefined;

  if (postId) {
    const comments = await getPostComments(postId);
    return NextResponse.json(comments);
  }

  const posts = await getCommunityPosts(category);
  return NextResponse.json(posts);
}

export async function POST(req: NextRequest) {
  const auth = await verifyAuth(req);
  if (auth instanceof NextResponse) return auth;

  const body = await req.json();
  const { action } = body;

  if (action === "like" && body.postId) {
    await likePost(body.postId, auth.uid);
    return NextResponse.json({ success: true });
  }

  if (action === "comment" && body.postId && body.text) {
    const id = await addComment({
      postId: body.postId,
      authorId: auth.uid,
      author: body.author || auth.displayName || "Anonymous",
      authorGender: body.authorGender || "female",
      text: body.text,
    });
    return NextResponse.json({ id, success: true });
  }

  // Create new post
  const { category, title, text, tags } = body;
  if (!title || !text) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const postId = await createPost({
    authorId: auth.uid,
    author: body.author || auth.displayName || "Anonymous",
    authorRole: body.authorRole || "parent",
    authorGender: body.authorGender || "female",
    category,
    title,
    text,
    tags,
  });
  return NextResponse.json({ id: postId, success: true });
}
