"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Search,
  Shield,
  Heart,
  Star,
  ArrowRight,
  PawPrint,
  Clock,
  MapPin,
  Users,
  Calendar,
  Loader2,
} from "lucide-react";
import Avatar from "@/components/Avatar";

const features = [
  {
    icon: Shield,
    title: "Verified Sitters",
    desc: "Every sitter passes a thorough background check and identity verification.",
  },
  {
    icon: Heart,
    title: "Personalized Care",
    desc: "Detailed profiles help you find the perfect match for your pet's unique needs.",
  },
  {
    icon: Clock,
    title: "Flexible Booking",
    desc: "Book overnight stays, day visits, or walks with instant confirmation.",
  },
  {
    icon: Star,
    title: "Honest Reviews",
    desc: "Real feedback from real pet parents so you can book with confidence.",
  },
];

const stats = [
  { label: "Pet Parents", value: "10,000+", icon: Users },
  { label: "Verified Sitters", value: "500+", icon: Shield },
  { label: "Bookings Completed", value: "25,000+", icon: Calendar },
];

interface SitterData {
  id: string;
  uid: string;
  displayName: string;
  gender: "male" | "female";
  bio: string;
  rating: number;
  reviewCount: number;
  pricePerNight: number;
  location: string;
  topRated: boolean;
}

export default function Home() {
  const [topSitters, setTopSitters] = useState<SitterData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/sitters?sortBy=rating")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setTopSitters(data.filter((s: SitterData) => s.topRated).slice(0, 3));
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-background via-primary-50/30 to-surface">
        <div className="relative mx-auto max-w-6xl px-6 pb-20 pt-20 md:pb-28 md:pt-32">
          <div className="max-w-3xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary-50 px-4 py-1.5 text-sm font-medium text-primary-600">
              <PawPrint className="h-4 w-4" />
              Trusted by 10,000+ pet parents
            </div>
            <h1 className="text-4xl font-bold leading-tight tracking-tight text-foreground md:text-6xl md:leading-[1.1]">
              Your pet deserves the{" "}
              <span className="text-primary-500">best care</span> when
              you are away
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-text-secondary">
              Connect with loving, verified pet sitters in your neighborhood.
              From overnight stays to daily walks, find the perfect match for
              your furry family member.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/sitters"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary-500 px-7 py-3.5 text-sm font-medium text-white transition-all hover:bg-primary-600 active:scale-[0.98]"
              >
                <Search className="h-4 w-4" />
                Find a Sitter
              </Link>
              <Link
                href="/community"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-surface px-7 py-3.5 text-sm font-medium text-foreground transition-all hover:bg-surface-alt active:scale-[0.98]"
              >
                Join Our Community
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-border bg-surface">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <div className="grid gap-8 md:grid-cols-3">
            {stats.map((stat) => (
              <div key={stat.label} className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50 text-primary-500">
                  <stat.icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-foreground">
                    {stat.value}
                  </div>
                  <div className="text-sm text-text-tertiary">{stat.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-background">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground">
              Why pet parents trust CarePaws
            </h2>
            <p className="mt-3 text-text-tertiary">
              Everything you need for peace of mind while you are away
            </p>
          </div>
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <div
                key={f.title}
                className="group rounded-xl border border-border bg-surface p-6 transition-all duration-200 hover:border-primary-100 hover:shadow-sm"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-50 text-primary-500 transition-colors group-hover:bg-primary-100">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-semibold text-foreground">
                  {f.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-text-tertiary">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Top Sitters Preview */}
      <section className="border-y border-border bg-surface">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-foreground">
                Top-rated sitters
              </h2>
              <p className="mt-2 text-text-tertiary">
                Meet our highest-rated pet care professionals
              </p>
            </div>
            <Link
              href="/sitters"
              className="hidden items-center gap-1 text-sm font-medium text-primary-500 hover:text-primary-600 md:flex"
            >
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {loading ? (
              <div className="col-span-full flex justify-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary-400" />
              </div>
            ) : (
              topSitters.map((sitter) => (
                <Link
                  key={sitter.id}
                  href={`/sitters/${sitter.id}`}
                  className="group rounded-xl border border-border bg-surface p-5 transition-all duration-200 hover:shadow-md hover:border-primary-100"
                >
                  <div className="flex items-center gap-3">
                    <Avatar
                      name={sitter.displayName}
                      gender={sitter.gender}
                      size="lg"
                    />
                    <div>
                      <h3 className="font-semibold text-foreground">
                        {sitter.displayName}
                      </h3>
                      <div className="flex items-center gap-1 text-xs text-text-tertiary">
                        <MapPin className="h-3 w-3" /> {sitter.location}
                      </div>
                    </div>
                  </div>
                  <p className="mt-3 line-clamp-2 text-sm text-text-secondary">
                    {sitter.bio}
                  </p>
                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Star className="h-4 w-4 fill-warm-400 text-warm-400" />
                      <span className="text-sm font-medium">
                        {sitter.rating}
                      </span>
                      <span className="text-xs text-text-tertiary">
                        ({sitter.reviewCount})
                      </span>
                    </div>
                    <span className="text-sm font-semibold">
                      ₹{sitter.pricePerNight}
                      <span className="font-normal text-text-tertiary">
                        /night
                      </span>
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>

          <div className="mt-8 text-center md:hidden">
            <Link
              href="/sitters"
              className="inline-flex items-center gap-1 text-sm font-medium text-primary-500"
            >
              View all sitters <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-background">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="rounded-2xl bg-foreground p-12 text-center md:p-16">
            <h2 className="text-3xl font-bold text-background md:text-4xl">
              Ready to find your perfect sitter?
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-text-tertiary">
              Join thousands of happy pet parents who trust CarePaws for their
              pet care needs.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/sitters"
                className="inline-flex items-center gap-2 rounded-lg bg-primary-500 px-7 py-3.5 text-sm font-medium text-white transition-all hover:bg-primary-600 active:scale-[0.98]"
              >
                <Search className="h-4 w-4" />
                Find a Sitter
              </Link>
              <Link
                href="/auth"
                className="inline-flex items-center gap-2 rounded-lg border border-text-secondary px-7 py-3.5 text-sm font-medium text-surface transition-all hover:border-text-tertiary active:scale-[0.98]"
              >
                Become a Sitter
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
