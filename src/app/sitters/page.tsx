"use client";

import { useState, useEffect, useRef } from "react";
import { Search, SlidersHorizontal, X, Loader2 } from "lucide-react";
import SitterCard from "@/components/SitterCard";

const petTypes = ["All", "Dogs", "Cats", "Rabbits", "Birds", "Reptiles"];

interface SitterData {
  id: string;
  uid: string;
  name: string;
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
}

export default function SittersPage() {
  const [search, setSearch] = useState("");
  const [selectedPet, setSelectedPet] = useState("All");
  const [sortBy, setSortBy] = useState<"rating" | "price-low" | "price-high">("rating");
  const [sitters, setSitters] = useState<SitterData[]>([]);
  const [loading, setLoading] = useState(true);
  const fetchRef = useRef(0);

  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (selectedPet !== "All") params.set("petType", selectedPet);
    params.set("sortBy", sortBy);

    const currentFetch = ++fetchRef.current;

    fetch(`/api/sitters?${params}`)
      .then((res) => res.json())
      .then((data) => {
        if (currentFetch === fetchRef.current) {
          setSitters(Array.isArray(data) ? data : []);
          setLoading(false);
        }
      })
      .catch(() => {
        if (currentFetch === fetchRef.current) {
          setSitters([]);
          setLoading(false);
        }
      });
  }, [search, selectedPet, sortBy]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Find your perfect sitter
        </h1>
        <p className="mt-2 text-text-tertiary">
          Browse verified pet sitters in your area
        </p>
      </div>

      {/* Search & Filters */}
      <div className="mb-8 space-y-4">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
            <input
              type="text"
              placeholder="Search by name or location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface py-3 pl-11 pr-10 text-sm text-foreground placeholder:text-text-tertiary focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-text-tertiary hover:text-text-secondary"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="relative">
            <SlidersHorizontal className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="appearance-none rounded-lg border border-border bg-surface py-3 pl-9 pr-8 text-sm text-foreground focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100"
            >
              <option value="rating">Top Rated</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {petTypes.map((type) => (
            <button
              key={type}
              onClick={() => setSelectedPet(type)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                selectedPet === type
                  ? "bg-primary-500 text-white"
                  : "bg-surface-alt text-text-secondary hover:bg-border"
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Results count */}
      <div className="mb-4 text-sm text-text-tertiary">
        {loading ? (
          <span className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading sitters...
          </span>
        ) : (
          `${sitters.length} sitter${sitters.length !== 1 ? "s" : ""} found`
        )}
      </div>

      {/* Results */}
      {loading ? (
        <div className="py-20 text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary-400" />
        </div>
      ) : sitters.length === 0 ? (
        <div className="py-20 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-surface-alt">
            <Search className="h-7 w-7 text-text-tertiary" />
          </div>
          <p className="mt-5 text-lg text-text-secondary">
            No sitters found matching your criteria.
          </p>
          <p className="mt-1 text-sm text-text-tertiary">
            Try adjusting your filters or search term.
          </p>
          <button
            onClick={() => {
              setSearch("");
              setSelectedPet("All");
              setSortBy("rating");
            }}
            className="mt-4 rounded-lg bg-surface-alt px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-border"
          >
            Clear all filters
          </button>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {sitters.map((sitter) => (
            <SitterCard key={sitter.id} sitter={sitter} />
          ))}
        </div>
      )}
    </div>
  );
}
