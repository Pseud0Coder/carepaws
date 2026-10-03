"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { LockKeyhole } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import type { UserProfile } from "@/lib/types";
import { EmptyState, FullScreenLoader } from "./ui";

/** Renders children only for a signed-in user with a loaded profile. */
export default function RequireAuth({
  children,
  message = "Sign in to continue.",
}: {
  children: (profile: UserProfile) => ReactNode;
  message?: string;
}) {
  const { profile, loading, user } = useAuth();
  const path = usePathname() || "/";
  if (loading || (user && !profile)) return <FullScreenLoader />;
  if (!profile) {
    const next = typeof window !== "undefined" ? window.location.pathname + window.location.search : path;
    return (
      <EmptyState
        icon={<LockKeyhole className="h-7 w-7" />}
        title="You're not signed in"
        body={message}
        action={
          <Link
            href={`/auth/?next=${encodeURIComponent(next)}`}
            className="inline-flex h-12 items-center rounded-full bg-moss px-6 font-semibold text-on-moss"
          >
            Sign in
          </Link>
        }
      />
    );
  }
  return <>{children(profile)}</>;
}
