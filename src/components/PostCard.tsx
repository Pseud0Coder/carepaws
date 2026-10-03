"use client";

import Link from "next/link";
import { Heart, MessageSquare } from "lucide-react";
import type { CommunityPost, PostCategory } from "@/lib/types";
import { timeAgo } from "@/lib/format";
import { ROLE_LABEL } from "@/lib/constants";
import { cn } from "@/lib/cn";
import Avatar from "./Avatar";
import { Tag } from "./ui";

export const CATEGORY_META: Record<PostCategory, { label: string; tone: "moss" | "clay" | "river" }> = {
  tip: { label: "Tip", tone: "moss" },
  question: { label: "Question", tone: "clay" },
  story: { label: "Story", tone: "river" },
};

export default function PostCard({
  post,
  uid,
  onLike,
  full,
}: {
  post: CommunityPost;
  uid?: string;
  onLike: (p: CommunityPost) => void;
  full?: boolean;
}) {
  const liked = uid ? post.likedBy?.includes(uid) : false;
  const meta = CATEGORY_META[post.category] ?? CATEGORY_META.story;
  const body = (
    <>
      <div className="flex items-center gap-3">
        <Avatar src={post.authorPhoto} name={post.author} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-bark">{post.author}</p>
          <p className="text-xs text-stone">
            {ROLE_LABEL[post.authorRole] ?? "Member"} · {timeAgo(post.createdAt)}
          </p>
        </div>
        <Tag tone={meta.tone}>{meta.label}</Tag>
      </div>
      <h3 className={cn("mt-3 font-display text-bark", full ? "text-2xl" : "text-lg leading-snug")}>{post.title}</h3>
      <p className={cn("mt-1.5 text-[15px] leading-relaxed whitespace-pre-line text-bark-soft", !full && "line-clamp-3")}>{post.text}</p>
    </>
  );

  return (
    <article className={cn(!full && "rounded-[var(--radius-card)] border border-oat-deep/60 bg-paper p-4 shadow-soft")}>
      {full ? body : <Link href={`/community/post/?id=${post.id}`}>{body}</Link>}
      <div className="mt-3 flex items-center gap-5 text-sm font-semibold">
        <button
          onClick={() => onLike(post)}
          aria-pressed={liked}
          className={cn("inline-flex items-center gap-1.5 py-1", liked ? "text-clay" : "text-stone")}
        >
          <Heart className={cn("h-[18px] w-[18px]", liked && "fill-current")} />
          {post.likedBy?.length ?? 0}
        </button>
        {full ? (
          <span className="inline-flex items-center gap-1.5 text-stone">
            <MessageSquare className="h-[18px] w-[18px]" /> {post.commentCount}
          </span>
        ) : (
          <Link href={`/community/post/?id=${post.id}`} className="inline-flex items-center gap-1.5 py-1 text-stone">
            <MessageSquare className="h-[18px] w-[18px]" /> {post.commentCount}
          </Link>
        )}
      </div>
    </article>
  );
}
