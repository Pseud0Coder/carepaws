import { Star } from "lucide-react";

export default function StarRating({
  rating,
  size = 16,
}: {
  rating: number;
  size?: number;
}) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={`${
            i < Math.round(rating)
              ? "fill-warm-400 text-warm-400"
              : "fill-border text-border"
          }`}
          style={{ width: size, height: size }}
        />
      ))}
    </div>
  );
}
