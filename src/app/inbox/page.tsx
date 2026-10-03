"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { subscribeConversations } from "@/lib/db";
import type { Conversation, UserProfile } from "@/lib/types";
import { timeAgo } from "@/lib/format";
import Avatar from "@/components/Avatar";
import RequireAuth from "@/components/RequireAuth";
import { AppBar, EmptyState, Skeleton } from "@/components/ui";

function Inbox({ profile }: { profile: UserProfile }) {
  const [convos, setConvos] = useState<Conversation[] | null>(null);

  useEffect(() => subscribeConversations(profile.uid, setConvos, () => setConvos([])), [profile.uid]);

  if (convos === null)
    return (
      <div className="space-y-2 px-5 pt-3">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-16" />
        ))}
      </div>
    );

  const started = convos.filter((c) => c.lastMessage);
  if (started.length === 0)
    return (
      <EmptyState
        icon={<MessageCircle className="h-7 w-7" />}
        title="No messages yet"
        body={
          profile.role === "sitter"
            ? "Pet parents can message you from your profile."
            : "Message a sitter from their profile to ask questions before you book."
        }
      />
    );

  return (
    <ul className="px-3 pt-2">
      {started.map((c) => {
        const otherId = c.participants.find((p) => p !== profile.uid) ?? "";
        const unreadHint = c.lastSenderId && c.lastSenderId !== profile.uid;
        return (
          <li key={c.id}>
            <Link href={`/inbox/chat/?id=${c.id}`} className="flex items-center gap-3 rounded-2xl px-2 py-3 active:bg-oat">
              <Avatar src={c.photos?.[otherId]} name={c.names?.[otherId]} size="md" />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="truncate font-semibold text-bark">{c.names?.[otherId] ?? "Conversation"}</p>
                  <span className="shrink-0 text-xs text-stone">{timeAgo(c.lastMessageAt)}</span>
                </div>
                <p className={unreadHint ? "truncate text-sm text-bark" : "truncate text-sm text-bark-soft"}>
                  {c.lastSenderId === profile.uid && "You: "}
                  {c.lastMessage}
                </p>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export default function InboxPage() {
  return (
    <>
      <AppBar title="Inbox" />
      <RequireAuth message="Sign in to message sitters.">{(p) => <Inbox profile={p} />}</RequireAuth>
    </>
  );
}
