import Image from "next/image";
import { User, Users } from "lucide-react";

type AvatarSize = "sm" | "md" | "lg" | "xl";

const sizeClasses: Record<AvatarSize, string> = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-base",
  xl: "h-20 w-20 text-xl",
};

const iconSizes: Record<AvatarSize, number> = {
  sm: 14,
  md: 16,
  lg: 20,
  xl: 28,
};

interface AvatarProps {
  src?: string | null;
  name?: string;
  gender?: "male" | "female" | "neutral";
  size?: AvatarSize;
  className?: string;
  bgColor?: string;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getGenderColor(gender: "male" | "female" | "neutral"): string {
  switch (gender) {
    case "female":
      return "bg-primary-50 text-primary-600";
    case "male":
      return "bg-accent-50 text-accent-600";
    default:
      return "bg-warm-50 text-warm-600";
  }
}

function getGenderIcon(
  gender: "male" | "female" | "neutral",
  size: number
) {
  switch (gender) {
    case "female":
      return (
        <User
          className="text-primary-400"
          style={{ width: size, height: size }}
        />
      );
    case "male":
      return (
        <User
          className="text-accent-400"
          style={{ width: size, height: size }}
        />
      );
    default:
      return (
        <Users
          className="text-warm-400"
          style={{ width: size, height: size }}
        />
      );
  }
}

export default function Avatar({
  src,
  name = "",
  gender = "neutral",
  size = "md",
  className = "",
  bgColor,
}: AvatarProps) {
  const sizeClass = sizeClasses[size];
  const iconSize = iconSizes[size];

  if (src) {
    return (
      <Image
        src={src}
        alt={name}
        width={iconSize * 2}
        height={iconSize * 2}
        className={`${sizeClass} rounded-full object-cover ring-2 ring-surface ${className}`}
      />
    );
  }

  if (name) {
    return (
      <div
        className={`${sizeClass} rounded-full flex items-center justify-center font-semibold ring-2 ring-surface ${getGenderColor(gender)} ${className}`}
        style={bgColor ? { backgroundColor: bgColor } : undefined}
      >
        {getInitials(name)}
      </div>
    );
  }

  return (
    <div
      className={`${sizeClass} rounded-full flex items-center justify-center ring-2 ring-surface ${getGenderColor(gender)} ${className}`}
    >
      {getGenderIcon(gender, iconSize)}
    </div>
  );
}
