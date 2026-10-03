import { Star } from "lucide-react";
import { cn } from "@/lib/cn";

export default function StarRating({
  rating,
  size = 14,
  onChange,
}: {
  rating: number;
  size?: number;
  onChange?: (r: number) => void;
}) {
  return (
    <div className="flex items-center gap-0.5" role={onChange ? "radiogroup" : undefined} aria-label={`${rating} of 5`}>
      {Array.from({ length: 5 }, (_, i) => {
        const filled = i < Math.round(rating);
        const star = (
          <Star
            className={cn(filled ? "fill-honey text-honey" : "fill-oat-deep text-oat-deep")}
            style={{ width: size, height: size }}
          />
        );
        return onChange ? (
          <button
            key={i}
            type="button"
            role="radio"
            aria-checked={i + 1 === rating}
            aria-label={`${i + 1} star${i ? "s" : ""}`}
            onClick={() => onChange(i + 1)}
            className="p-1"
          >
            {star}
          </button>
        ) : (
          <span key={i}>{star}</span>
        );
      })}
    </div>
  );
}
