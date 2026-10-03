"use client";

import Link from "next/link";
import { Suspense, useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { FileQuestion, SendHorizontal } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { addComment, getComments, getPost } from "@/lib/db";
import { useLikeToggle } from "@/lib/useLikeToggle";
import type { CommunityComment, CommunityPost } from "@/lib/types";
import { timeAgo } from "@/lib/format";
import Avatar from "@/components/Avatar";
import PostCard from "@/components/PostCard";
import { AppBar, EmptyState, FullScreenLoader, useToast } from "@/components/ui";

function PostScreen() {
  const id = useSearchParams().get("id") || "";
  const { profile } = useAuth();
  const toast = useToast();
  const [post, setPost] = useState<CommunityPost | null | undefined>(undefined);
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const like = useLikeToggle((fn) => setPost((p) => (p ? fn([p])[0] : p)));

  useEffect(() => {
    getPost(id).then(setPost).catch(() => setPost(null));
    getComments(id).then(setComments).catch(() => {});
  }, [id]);

  if (post === undefined) return <FullScreenLoader />;
  if (!post)
    return (
      <>
        <AppBar back />
        <EmptyState icon={<FileQuestion className="h-7 w-7" />} title="Post not found" />
      </>
    );

  async function comment(e: FormEvent) {
    e.preventDefault();
    const t = text.trim();
    if (!profile || !t) return;
    setSending(true);
    try {
      const cid = await addComment(id, profile, t);
      setComments((c) => [
        ...c,
        { id: cid, authorId: profile.uid, author: profile.displayName, authorPhoto: profile.photoURL, text: t, createdAt: new Date().toISOString() },
      ]);
      setPost((p) => (p ? { ...p, commentCount: p.commentCount + 1 } : p));
      setText("");
    } catch {
      toast("Couldn't post your reply.", "error");
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <AppBar back title="Post" />
      <main className="px-5 pt-3 pb-28">
        <PostCard post={post} uid={profile?.uid} onLike={like} full />
        <h2 className="mt-8 mb-2 font-display text-lg text-bark">Replies</h2>
        {comments.length === 0 ? (
          <p className="py-4 text-sm text-bark-soft">No replies yet.</p>
        ) : (
          <ul className="space-y-4">
            {comments.map((c) => (
              <li key={c.id} className="flex gap-3">
                <Avatar src={c.authorPhoto} name={c.author} size="sm" />
                <div className="flex-1 rounded-2xl rounded-tl-md bg-paper p-3 shadow-soft">
                  <p className="text-sm font-semibold text-bark">
                    {c.author} <span className="font-normal text-stone">· {timeAgo(c.createdAt)}</span>
                  </p>
                  <p className="mt-1 text-[15px] whitespace-pre-line text-bark-soft">{c.text}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
      <div className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-oat-deep/60 bg-paper/95 backdrop-blur-md">
        <div className="mx-auto max-w-lg px-3 py-2.5">
          {profile ? (
            <form onSubmit={comment} className="flex items-center gap-2">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={1000}
                placeholder="Write a reply"
                aria-label="Write a reply"
                className="h-11 flex-1 rounded-full border border-oat-deep bg-linen px-4 text-[15px] text-bark outline-none focus:border-moss"
              />
              <button
                type="submit"
                disabled={!text.trim() || sending}
                aria-label="Send reply"
                className="flex h-11 w-11 items-center justify-center rounded-full bg-moss text-on-moss disabled:opacity-40"
              >
                <SendHorizontal className="h-5 w-5" />
              </button>
            </form>
          ) : (
            <Link href={`/auth/?next=${encodeURIComponent(`/community/post/?id=${id}`)}`} className="block py-2 text-center text-sm font-semibold text-moss">
              Sign in to reply
            </Link>
          )}
        </div>
      </div>
    </>
  );
}

export default function PostPage() {
  return (
    <Suspense fallback={<FullScreenLoader />}>
      <PostScreen />
    </Suspense>
  );
}
