"use client";

import Link from "next/link";
import { Suspense, useEffect, useRef, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { MessageCircleOff, SendHorizontal } from "lucide-react";
import { getConversation, sendMessage, subscribeMessages } from "@/lib/db";
import type { Conversation, Message, UserProfile } from "@/lib/types";
import { cn } from "@/lib/cn";
import Avatar from "@/components/Avatar";
import { sitterHref } from "@/components/SitterCard";
import RequireAuth from "@/components/RequireAuth";
import { AppBar, EmptyState, FullScreenLoader, useToast } from "@/components/ui";

function dayLabel(iso?: string) {
  if (!iso) return "Today";
  const d = new Date(iso);
  const today = new Date();
  const y = new Date(Date.now() - 864e5);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === y.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
}

function Chat({ profile, id }: { profile: UserProfile; id: string }) {
  const toast = useToast();
  const [convo, setConvo] = useState<Conversation | null | undefined>(undefined);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getConversation(id).then(setConvo).catch(() => setConvo(null));
    return subscribeMessages(id, setMessages, () => setConvo(null));
  }, [id]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  if (convo === undefined) return <FullScreenLoader />;
  if (!convo)
    return (
      <>
        <AppBar back />
        <EmptyState icon={<MessageCircleOff className="h-7 w-7" />} title="Conversation not found" />
      </>
    );

  const otherId = convo.participants.find((p) => p !== profile.uid) ?? "";
  const otherName = convo.names?.[otherId] ?? "";

  async function send(e: FormEvent) {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    setSending(true);
    setText("");
    try {
      await sendMessage(id, profile.uid, t);
    } catch {
      setText(t);
      toast("Message not sent. Try again.", "error");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <AppBar
        back
        title={
          otherId === convo.sitterId ? (
            <Link href={sitterHref(otherId)} className="flex items-center gap-2">
              <Avatar src={convo.photos?.[otherId]} name={otherName} size="xs" />
              <span className="truncate">{otherName}</span>
            </Link>
          ) : (
            <span className="flex items-center gap-2">
              <Avatar src={convo.photos?.[otherId]} name={otherName} size="xs" />
              <span className="truncate">{otherName}</span>
            </span>
          )
        }
      />
      <main className="flex-1 space-y-1.5 px-4 pt-4 pb-28">
        {messages.length === 0 && (
          <p className="py-10 text-center text-sm text-bark-soft">
            Say hello to {otherName.split(" ")[0]}. Ask about their home, routine, or availability.
          </p>
        )}
        {messages.map((m, i) => {
          const mine = m.senderId === profile.uid;
          const day = dayLabel(m.createdAt);
          const showDay = i === 0 || day !== dayLabel(messages[i - 1].createdAt);
          return (
            <div key={m.id}>
              {showDay && <p className="py-3 text-center text-xs font-semibold text-stone">{day}</p>}
              <div className={cn("flex", mine ? "justify-end" : "justify-start")}>
                <p
                  className={cn(
                    "max-w-[80%] rounded-3xl px-4 py-2.5 text-[15px] leading-snug whitespace-pre-wrap break-words",
                    mine ? "rounded-br-lg bg-moss text-on-moss" : "rounded-bl-lg bg-paper text-bark shadow-soft"
                  )}
                >
                  {m.text}
                  <span className={cn("ml-2 inline-block text-[10px] align-bottom", mine ? "opacity-70" : "text-stone")}>
                    {m.createdAt ? new Date(m.createdAt).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }) : "…"}
                  </span>
                </p>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </main>
      <form onSubmit={send} className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-oat-deep/60 bg-paper/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg items-end gap-2 px-3 py-2.5">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !("ontouchstart" in window)) {
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
              }
            }}
            rows={1}
            maxLength={2000}
            placeholder="Message"
            aria-label="Message"
            className="max-h-32 min-h-11 flex-1 resize-none rounded-3xl border border-oat-deep bg-linen px-4 py-2.5 text-[15px] text-bark outline-none focus:border-moss"
          />
          <button
            type="submit"
            disabled={!text.trim() || sending}
            aria-label="Send"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-moss text-on-moss transition disabled:opacity-40"
          >
            <SendHorizontal className="h-5 w-5" />
          </button>
        </div>
      </form>
    </div>
  );
}

function ChatRoute() {
  const id = useSearchParams().get("id") || "";
  return <RequireAuth>{(p) => <Chat profile={p} id={id} />}</RequireAuth>;
}

export default function ChatPage() {
  return (
    <Suspense fallback={<FullScreenLoader />}>
      <ChatRoute />
    </Suspense>
  );
}
