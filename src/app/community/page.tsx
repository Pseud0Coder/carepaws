"use client";

import { useState, useEffect } from "react";
import {
  Heart,
  MessageCircle,
  Share2,
  TrendingUp,
  Users,
  BookOpen,
  Lightbulb,
  HelpCircle,
  Loader2,
} from "lucide-react";
import Avatar from "@/components/Avatar";
import { useAuth } from "@/lib/auth-context";

interface PostData {
  id: string;
  authorId: string;
  author: string;
  authorRole: string;
  authorGender: "male" | "female";
  category: string;
  title: string;
  text: string;
  tags: string[];
  likes: number;
  likedBy: string[];
  commentCount: number;
  createdAt: string;
}

const trendingTopics = [
  { label: "Monsoon Pet Care Tips", count: 89 },
  { label: "Pet First Aid", count: 67 },
  { label: "Cat Boarding vs Sitting", count: 54 },
  { label: "Separation Anxiety", count: 43 },
];

const topMembers = [
  { name: "Dr. Sneha K.", gender: "female" as const, role: "Top Sitter", posts: 156 },
  { name: "Priya S.", gender: "female" as const, role: "Top Sitter", posts: 134 },
  { name: "Ananya M.", gender: "female" as const, role: "Active Parent", posts: 98 },
];

const tagColors: Record<string, string> = {
  tip: "bg-accent-50 text-accent-600",
  question: "bg-warm-50 text-warm-600",
  experience: "bg-primary-50 text-primary-600",
  general: "bg-surface-alt text-text-secondary",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export default function CommunityPage() {
  const { profile, user, authFetch } = useAuth();
  const [posts, setPosts] = useState<PostData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("All");
  const [newPostTitle, setNewPostTitle] = useState("");
  const [newPostText, setNewPostText] = useState("");
  const [newPostCategory, setNewPostCategory] = useState<"tip" | "question" | "experience" | "general">("general");
  const [posting, setPosting] = useState(false);


  const filters = ["All", "Tips", "Questions", "Experiences", "General"];

  // Fetch posts
  useEffect(() => {
    const categoryFilter = activeFilter === "All" ? "" : activeFilter.toLowerCase().replace(/s$/, "");
    const params = categoryFilter ? `?category=${categoryFilter}` : "";

    fetch(`/api/posts${params}`)
      .then((r) => r.json())
      .then((data) => {
        setPosts(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        setPosts([]);
      })
      .finally(() => setLoading(false));
  }, [activeFilter]);

  const handleCreatePost = async () => {
    if (!profile || !user || !newPostTitle || !newPostText) return;
    setPosting(true);
    try {
      const res = await authFetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          authorRole: profile.role,
          authorGender: profile.gender || "female",
          category: newPostCategory,
          title: newPostTitle,
          text: newPostText,
          tags: [newPostCategory],
        }),
      });
      const data = await res.json();
      if (data.id) {
        setPosts([
          {
            id: data.id,
            authorId: user.uid,
            author: profile.displayName,
            authorRole: profile.role || "parent",
            authorGender: profile.gender || "female",
            category: newPostCategory,
            title: newPostTitle,
            text: newPostText,
            tags: [newPostCategory],
            likes: 0,
            likedBy: [],
            commentCount: 0,
            createdAt: new Date().toISOString(),
          },
          ...posts,
        ]);
        setNewPostTitle("");
        setNewPostText("");
      }
    } catch (e) {
      console.error("Failed to create post:", e);
    } finally {
      setPosting(false);
    }
  };

  const handleLike = async (postId: string) => {
    if (!user) return;
    try {
      await authFetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "like", postId }),
      });
      setPosts(
        posts.map((p) => {
          if (p.id !== postId) return p;
          const liked = p.likedBy.includes(user.uid);
          return {
            ...p,
            likes: liked ? p.likes - 1 : p.likes + 1,
            likedBy: liked
              ? p.likedBy.filter((id) => id !== user.uid)
              : [...p.likedBy, user.uid],
          };
        })
      );
    } catch (e) {
      console.error("Failed to like:", e);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Community
        </h1>
        <p className="mt-2 text-text-tertiary">
          Share stories, get advice, and connect with fellow pet lovers
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main feed */}
        <div className="lg:col-span-2">
          {/* Filters */}
          <div className="mb-6 flex flex-wrap gap-2">
            {filters.map((f) => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  activeFilter === f
                    ? "bg-primary-500 text-white"
                    : "bg-surface-alt text-text-secondary hover:bg-border"
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {/* New post */}
          {profile && (
            <div className="mb-6 rounded-xl border border-border bg-surface p-5">
              <div className="flex items-start gap-3">
                <Avatar name={profile.displayName} gender={profile.gender || "female"} size="md" />
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Post title..."
                    value={newPostTitle}
                    onChange={(e) => setNewPostTitle(e.target.value)}
                    className="w-full rounded-lg bg-surface-alt px-4 py-2.5 text-sm font-medium text-foreground placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary-100"
                  />
                  <textarea
                    placeholder="Share something with the community..."
                    value={newPostText}
                    onChange={(e) => setNewPostText(e.target.value)}
                    rows={3}
                    className="mt-2 w-full rounded-lg bg-surface-alt px-4 py-3 text-sm text-foreground placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary-100"
                  />
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex gap-2">
                      {(["general", "tip", "question", "experience"] as const).map((cat) => (
                        <button
                          key={cat}
                          onClick={() => setNewPostCategory(cat)}
                          className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                            newPostCategory === cat
                              ? "bg-primary-100 text-primary-600"
                              : "bg-surface-alt text-text-tertiary hover:bg-border"
                          }`}
                        >
                          {cat === "tip" && <Lightbulb className="h-3 w-3" />}
                          {cat === "question" && <HelpCircle className="h-3 w-3" />}
                          {cat === "experience" && <Heart className="h-3 w-3" />}
                          {cat.charAt(0).toUpperCase() + cat.slice(1)}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={handleCreatePost}
                      disabled={!newPostTitle || !newPostText || posting}
                      className="rounded-lg bg-primary-500 px-5 py-2 text-xs font-medium text-white transition-all hover:bg-primary-600 disabled:opacity-30"
                    >
                      {posting ? "Posting..." : "Post"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Posts */}
          {loading ? (
            <div className="py-20 text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary-400" />
            </div>
          ) : posts.length === 0 ? (
            <div className="py-20 text-center">
              <p className="text-text-secondary">No posts yet. Be the first to share!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <div
                  key={post.id}
                  className="rounded-xl border border-border bg-surface p-5"
                >
                  <div className="flex items-center gap-3">
                    <Avatar name={post.author} gender={post.authorGender} size="md" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-foreground">
                          {post.author}
                        </span>
                        <span
                          className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                            tagColors[post.category] || tagColors.general
                          }`}
                        >
                          {post.category}
                        </span>
                      </div>
                      <span className="text-xs text-text-tertiary">
                        {post.createdAt ? timeAgo(post.createdAt) : ""}
                      </span>
                    </div>
                  </div>
                  <h3 className="mt-3 font-semibold text-foreground">{post.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                    {post.text}
                  </p>
                  <div className="mt-4 flex items-center gap-6 border-t border-border-subtle pt-3">
                    <button
                      onClick={() => handleLike(post.id)}
                      className={`flex items-center gap-1.5 text-xs transition-colors ${
                        user && post.likedBy?.includes(user.uid)
                          ? "text-error font-medium"
                          : "text-text-tertiary hover:text-error"
                      }`}
                    >
                      <Heart
                        className={`h-4 w-4 ${
                          user && post.likedBy?.includes(user.uid) ? "fill-current" : ""
                        }`}
                      />
                      {post.likes}
                    </button>
                    <span className="flex items-center gap-1.5 text-xs text-text-tertiary">
                      <MessageCircle className="h-4 w-4" />
                      {post.commentCount}
                    </span>
                    <button className="flex items-center gap-1.5 text-xs text-text-tertiary hover:text-foreground transition-colors">
                      <Share2 className="h-4 w-4" />
                      Share
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Trending */}
          <div className="rounded-xl border border-border bg-surface p-5">
            <h3 className="flex items-center gap-2 font-semibold text-foreground">
              <TrendingUp className="h-4 w-4 text-primary-500" />
              Trending Topics
            </h3>
            <div className="mt-4 space-y-1">
              {trendingTopics.map((topic) => (
                <button
                  key={topic.label}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-surface-alt"
                >
                  <span className="font-medium text-foreground">{topic.label}</span>
                  <span className="text-xs text-text-tertiary">{topic.count} posts</span>
                </button>
              ))}
            </div>
          </div>

          {/* Top Members */}
          <div className="rounded-xl border border-border bg-surface p-5">
            <h3 className="flex items-center gap-2 font-semibold text-foreground">
              <Users className="h-4 w-4 text-accent-500" />
              Top Members
            </h3>
            <div className="mt-4 space-y-3">
              {topMembers.map((member) => (
                <div key={member.name} className="flex items-center gap-3">
                  <Avatar name={member.name} gender={member.gender} size="md" />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-foreground">
                      {member.name}
                    </div>
                    <div className="text-xs text-text-tertiary">
                      {member.role} · {member.posts} posts
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Resources */}
          <div className="rounded-xl border border-border bg-surface p-5">
            <h3 className="flex items-center gap-2 font-semibold text-foreground">
              <BookOpen className="h-4 w-4 text-primary-500" />
              Helpful Resources
            </h3>
            <div className="mt-4 space-y-1">
              {[
                "First-Time Sitter Guide",
                "Pet Safety Checklist",
                "Preparing Your Home",
                "Emergency Contacts Template",
              ].map((resource) => (
                <a
                  key={resource}
                  href="#"
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-surface-alt hover:text-foreground"
                >
                  <BookOpen className="h-3 w-3 text-primary-400" />
                  {resource}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
