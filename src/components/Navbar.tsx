"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarHeart, Compass, MessageCircle, UserRound, UsersRound } from "lucide-react";
import { cn } from "@/lib/cn";

const tabs = [
  { href: "/", label: "Discover", icon: Compass },
  { href: "/bookings/", label: "Stays", icon: CalendarHeart },
  { href: "/inbox/", label: "Inbox", icon: MessageCircle },
  { href: "/community/", label: "Circle", icon: UsersRound },
  { href: "/dashboard/", label: "You", icon: UserRound },
];

/** Routes that show the bottom navigation. Detail and flow screens hide it. */
export const TAB_ROUTES = ["/", "/bookings/", "/inbox/", "/community/", "/dashboard/", "/sitters/"];

export function isTabRoute(path: string) {
  const p = path.endsWith("/") ? path : `${path}/`;
  return p === "//" || TAB_ROUTES.includes(p);
}

/** Bottom navigation bar — the app's primary navigation on every screen size. */
export default function Navbar() {
  const raw = usePathname() || "/";
  const path = raw.endsWith("/") ? raw : `${raw}/`;
  if (!isTabRoute(raw)) return null;

  return (
    <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-oat-deep/60 bg-paper/95 backdrop-blur-md">
      <ul className="mx-auto flex max-w-lg items-stretch justify-around px-2">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? path === "/" || path === "/sitters/" : path.startsWith(href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className="flex flex-col items-center gap-1 pt-2 pb-2.5 text-[11px] font-semibold"
              >
                <span
                  className={cn(
                    "flex h-8 w-14 items-center justify-center rounded-full transition-colors",
                    active ? "bg-moss-tint text-moss" : "text-stone"
                  )}
                >
                  <Icon className="h-[22px] w-[22px]" strokeWidth={active ? 2.2 : 1.8} />
                </span>
                <span className={active ? "text-bark" : "text-stone"}>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
