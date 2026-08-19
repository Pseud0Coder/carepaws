"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import {
  MapPin,
  Clock,
  ChevronLeft,
  Calendar,
  Check,
  MessageCircle,
  ThumbsUp,
  Star,
  AlertTriangle,
  BadgeCheck,
  Award,
  Loader2,
} from "lucide-react";
import StarRating from "@/components/StarRating";
import Avatar from "@/components/Avatar";

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
  experience: string;
  services: string[];
  petTypes: string[];
  availability: string[];
  verified: boolean;
  topRated: boolean;
  responseTime: string;
  acceptanceRate: number;
  repeatClients: number;
  totalEarnings: number;
  totalBookings: number;
}

interface ReviewData {
  id: string;
  author: string;
  authorGender: "male" | "female";
  rating: number;
  date: string;
  text: string;
  petType: string;
  helpful: number;
  helpfulBy: string[];
  response?: string;
}

function RatingBar({ stars, count, total }: { stars: number; count: number; total: number }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-3 text-text-tertiary">{stars}</span>
      <Star className="h-3 w-3 fill-warm-400 text-warm-400" />
      <div className="flex-1 h-1.5 rounded-full bg-border-subtle overflow-hidden">
        <div className="h-full rounded-full bg-warm-400 transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-8 text-right text-xs text-text-tertiary">{count}</span>
    </div>
  );
}

export default function SitterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [sitter, setSitter] = useState<SitterData | null>(null);
  const [reviews, setReviews] = useState<ReviewData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/sitters?id=${id}`).then((r) => r.json()),
      fetch(`/api/reviews?sitterId=${id}`).then((r) => r.json()),
    ])
      .then(([sitterData, reviewsData]) => {
        setSitter(sitterData);
        setReviews(Array.isArray(reviewsData) ? reviewsData : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-400" />
      </div>
    );
  }

  if (!sitter) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-text-secondary">Sitter not found.</p>
      </div>
    );
  }

  // Rating distribution
  const ratingDist = [5, 4, 3, 2, 1].map((stars) => ({
    stars,
    count: reviews.filter((r) => r.rating === stars).length,
  }));

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <Link
        href="/sitters"
        className="mb-8 inline-flex items-center gap-1 text-sm font-medium text-text-tertiary hover:text-foreground transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to sitters
      </Link>

      <div className="grid gap-10 lg:grid-cols-3">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile header */}
          <div className="rounded-xl border border-border bg-surface p-6">
            <div className="flex items-start gap-5">
              <Avatar name={sitter.displayName} gender={sitter.gender} size="xl" />
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl font-bold text-foreground">{sitter.displayName}</h1>
                  {sitter.verified && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-accent-50 px-2 py-0.5 text-xs font-medium text-accent-600">
                      <BadgeCheck className="h-3.5 w-3.5" />
                      Verified
                    </span>
                  )}
                  {sitter.topRated && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-warm-50 px-2 py-0.5 text-xs font-medium text-warm-600">
                      <Award className="h-3.5 w-3.5" />
                      Top Rated
                    </span>
                  )}
                </div>
                <div className="mt-2 flex items-center gap-4 text-sm text-text-tertiary">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" /> {sitter.location}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" /> {sitter.experience} experience
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <StarRating rating={sitter.rating} />
                  <span className="text-sm font-medium text-foreground">{sitter.rating}</span>
                  <span className="text-sm text-text-tertiary">({sitter.reviewCount} reviews)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bio */}
          <div className="rounded-xl border border-border bg-surface p-6">
            <h2 className="font-semibold text-foreground">About</h2>
            <p className="mt-3 text-sm leading-relaxed text-text-secondary">{sitter.bio}</p>
          </div>

          {/* Services */}
          <div className="rounded-xl border border-border bg-surface p-6">
            <h2 className="font-semibold text-foreground">Services offered</h2>
            <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
              {sitter.services.map((service) => (
                <div key={service} className="flex items-center gap-2.5 text-sm text-text-secondary">
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-accent-50">
                    <Check className="h-3.5 w-3.5 text-accent-500" />
                  </div>
                  {service}
                </div>
              ))}
            </div>
          </div>

          {/* Pet types */}
          <div className="rounded-xl border border-border bg-surface p-6">
            <h2 className="font-semibold text-foreground">Pets cared for</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {sitter.petTypes.map((type) => (
                <span
                  key={type}
                  className="rounded-lg bg-primary-50 px-3 py-1.5 text-sm font-medium text-primary-600"
                >
                  {type}
                </span>
              ))}
            </div>
          </div>

          {/* Availability */}
          <div className="rounded-xl border border-border bg-surface p-6">
            <h2 className="font-semibold text-foreground">Availability</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                <span
                  key={day}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                    sitter.availability.includes(day)
                      ? "bg-accent-50 text-accent-600"
                      : "bg-surface-alt text-text-tertiary"
                  }`}
                >
                  {day}
                </span>
              ))}
            </div>
          </div>

          {/* Reviews Section */}
          <div className="rounded-xl border border-border bg-surface p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-foreground">Reviews</h2>
              <span className="text-sm text-text-tertiary">{reviews.length} reviews</span>
            </div>

            {/* Rating summary */}
            <div className="mt-5 flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-10">
              <div className="text-center">
                <div className="text-4xl font-bold text-foreground">{sitter.rating}</div>
                <StarRating rating={sitter.rating} size={16} />
                <div className="mt-1 text-sm text-text-tertiary">{sitter.reviewCount} reviews</div>
              </div>
              <div className="flex-1 space-y-1.5">
                {ratingDist.map(({ stars, count }) => (
                  <RatingBar key={stars} stars={stars} count={count} total={reviews.length} />
                ))}
              </div>
            </div>

            {/* Individual reviews */}
            <div className="mt-8 space-y-6">
              {reviews.length === 0 ? (
                <p className="text-sm text-text-tertiary py-8 text-center">No reviews yet.</p>
              ) : (
                reviews.map((review) => (
                  <div key={review.id} className="border-t border-border-subtle pt-6 first:border-0 first:pt-0">
                    <div className="flex items-start gap-3">
                      <Avatar name={review.author} gender={review.authorGender} size="md" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-foreground">{review.author}</span>
                          <span className="text-xs text-text-tertiary">{review.petType} parent</span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <StarRating rating={review.rating} size={12} />
                          <span className="text-xs text-text-tertiary">{review.date}</span>
                        </div>
                      </div>
                      <span className="flex items-center gap-1 text-xs text-text-tertiary">
                        <ThumbsUp className="h-3 w-3" />
                        {review.helpful}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-text-secondary">{review.text}</p>

                    {/* Sitter response */}
                    {review.response && (
                      <div className="mt-3 rounded-lg bg-primary-50 p-3">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-primary-600">
                          <MessageCircle className="h-3 w-3" />
                          {sitter.displayName.split(" ")[0]} replied
                        </div>
                        <p className="mt-1.5 text-sm text-text-secondary">{review.response}</p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Transparency notice */}
            <div className="mt-6 flex items-start gap-2 rounded-lg bg-surface-alt p-3">
              <AlertTriangle className="h-4 w-4 mt-0.5 text-text-tertiary flex-shrink-0" />
              <p className="text-xs text-text-tertiary leading-relaxed">
                All reviews are from verified CarePaws users who have completed bookings.
                We do not filter or remove reviews. Sitter ratings are calculated from all submitted reviews.
              </p>
            </div>
          </div>
        </div>

        {/* Booking sidebar */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 space-y-4">
            <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
              <div className="flex items-baseline justify-between">
                <span className="text-3xl font-bold text-foreground">
                  ₹{sitter.pricePerNight}
                </span>
                <span className="text-sm text-text-tertiary">per night</span>
              </div>

              <div className="mt-5 space-y-2">
                <div className="rounded-lg border border-border p-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-text-tertiary">Check-in</span>
                    <span className="font-medium text-text-secondary">Select date</span>
                  </div>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-text-tertiary">Check-out</span>
                    <span className="font-medium text-text-secondary">Select date</span>
                  </div>
                </div>
              </div>

              <Link
                href={`/booking?sitterId=${sitter.uid || sitter.id}`}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-primary-500 py-3.5 text-sm font-medium text-white transition-all hover:bg-primary-600 active:scale-[0.98]"
              >
                <Calendar className="h-4 w-4" />
                Request to Book
              </Link>

              <p className="mt-3 text-center text-xs text-text-tertiary">
                You will not be charged until the sitter confirms
              </p>
            </div>

            <button className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-surface py-3.5 text-sm font-medium text-foreground transition-all hover:bg-surface-alt active:scale-[0.98]">
              <MessageCircle className="h-4 w-4" />
              Message {sitter.displayName.split(" ")[0]}
            </button>

            {/* Quick stats */}
            <div className="rounded-xl border border-border bg-surface p-5">
              <h3 className="text-sm font-medium text-foreground mb-3">Quick facts</h3>
              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-text-tertiary">Response time</span>
                  <span className="font-medium text-foreground">{sitter.responseTime || "Within 1 hour"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-tertiary">Acceptance rate</span>
                  <span className="font-medium text-foreground">{sitter.acceptanceRate || 95}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-tertiary">Repeat clients</span>
                  <span className="font-medium text-foreground">{sitter.repeatClients || 50}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
