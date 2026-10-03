"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./auth-context";
import { togglePostLike } from "./db";
import type { CommunityPost } from "./types";
import { useToast } from "@/components/ui";

/** Optimistic like/unlike for community posts. */
export function useLikeToggle(setPosts: (fn: (p: CommunityPost[]) => CommunityPost[]) => void) {
  const { profile } = useAuth();
  const toast = useToast();
  const router = useRouter();
  return useCallback(
    async (post: CommunityPost) => {
      if (!profile) return router.push("/auth/?next=/community/");
      const uid = profile.uid;
      const likedBy = post.likedBy?.includes(uid) ? post.likedBy.filter((x) => x !== uid) : [...(post.likedBy ?? []), uid];
      setPosts((all) => all.map((p) => (p.id === post.id ? { ...p, likedBy } : p)));
      try {
        await togglePostLike(post, uid);
      } catch {
        setPosts((all) => all.map((p) => (p.id === post.id ? post : p)));
        toast("Couldn't save that.", "error");
      }
    },
    [profile, router, setPosts, toast]
  );
}

