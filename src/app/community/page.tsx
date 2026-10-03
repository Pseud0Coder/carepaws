"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PenLine, UsersRound } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { createPost, getPosts } from "@/lib/db";
import { useLikeToggle } from "@/lib/useLikeToggle";
import type { CommunityPost, PostCategory } from "@/lib/types";
import PostCard, { CATEGORY_META } from "@/components/PostCard";
import UpgradeSheet from "@/components/UpgradeSheet";
import { AppBar, Button, Chip, EmptyState, ErrorNote, Field, IconButton, Input, Sheet, Skeleton, TextArea, useToast } from "@/components/ui";

const FILTERS: (PostCategory | "all")[] = ["all", "tip", "question", "story"];

export default function CommunityPage() {
  const { profile, blocked } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [filter, setFilter] = useState<PostCategory | "all">("all");
  const [posts, setPosts] = useState<CommunityPost[] | null>(null);
  const [composing, setComposing] = useState(false);
  const [upgrade, setUpgrade] = useState(false);
  // Posting needs a role; people just looking around are asked to finish setup first.
  const startPost = () => (profile?.role === "explorer" ? setUpgrade(true) : setComposing(true));
  const [draft, setDraft] = useState({ category: "tip" as PostCategory, title: "", text: "" });
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");
  const like = useLikeToggle((fn) => setPosts((p) => (p ? fn(p) : p)));

  useEffect(() => {
    let live = true;
    getPosts(filter === "all" ? undefined : filter)
      .then((p) => live && setPosts(p))
      .catch(() => live && setPosts([]));
    return () => {
      live = false;
    };
  }, [filter]);

  async function publish() {
    if (!profile) return;
    if (draft.title.trim().length < 4 || draft.text.trim().length < 10) return setError("Add a title and a few sentences.");
    setPosting(true);
    setError("");
    try {
      const id = await createPost(profile, { category: draft.category, title: draft.title.trim(), text: draft.text.trim() });
      setComposing(false);
      setDraft({ category: "tip", title: "", text: "" });
      toast("Posted to the Circle.");
      router.push(`/community/post/?id=${id}`);
    } catch {
      setError("Couldn't publish. Try again.");
    } finally {
      setPosting(false);
    }
  }

  return (
    <>
      <AppBar
        title="The Circle"
        action={
          <IconButton label="Write a post" onClick={() => (profile ? startPost() : router.push("/auth/?next=/community/"))}>
            <PenLine className="h-5 w-5" />
          </IconButton>
        }
      />
      <main className="px-5 pb-6">
        <p className="pt-4 text-sm text-bark-soft">Advice and stories from pet parents and sitters near you.</p>
        <div className="no-scrollbar -mx-5 mt-4 flex gap-2 overflow-x-auto px-5">
          {FILTERS.map((f) => (
            <Chip key={f} active={filter === f} onClick={() => setFilter(f)}>
              {f === "all" ? "Everything" : `${CATEGORY_META[f].label}s`}
            </Chip>
          ))}
        </div>
        <div className="mt-4 space-y-3">
          {posts === null ? (
            Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-40" />)
          ) : posts.length === 0 ? (
            <EmptyState
              icon={<UsersRound className="h-7 w-7" />}
              title="Quiet here so far"
              body="Start the conversation: share a tip or ask a question."
              action={profile && <Button onClick={startPost}>Write a post</Button>}
            />
          ) : (
            posts.filter((p) => !blocked.has(p.authorId)).map((p) => <PostCard key={p.id} post={p} uid={profile?.uid} onLike={like} />)
          )}
        </div>
      </main>

      <UpgradeSheet open={upgrade} onClose={() => setUpgrade(false)} reason="post in the Circle" />
      <Sheet open={composing} onClose={() => setComposing(false)} title="New post">
        <div className="space-y-4">
          <div className="flex gap-2">
            {(Object.keys(CATEGORY_META) as PostCategory[]).map((c) => (
              <Chip key={c} active={draft.category === c} onClick={() => setDraft((d) => ({ ...d, category: c }))}>
                {CATEGORY_META[c].label}
              </Chip>
            ))}
          </div>
          <Field label="Title">
            <Input value={draft.title} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} maxLength={120} />
          </Field>
          <Field label="Your post">
            <TextArea
              value={draft.text}
              onChange={(e) => setDraft((d) => ({ ...d, text: e.target.value }))}
              maxLength={4000}
              className="min-h-36"
            />
          </Field>
          <ErrorNote>{error}</ErrorNote>
          <Button block onClick={publish} loading={posting}>
            Publish
          </Button>
        </div>
      </Sheet>
    </>
  );
}
