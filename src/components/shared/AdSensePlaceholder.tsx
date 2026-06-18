import { cn } from "@/lib/utils";

interface AdSensePlaceholderProps {
  className?: string;
  size?: "banner" | "sidebar" | "leaderboard";
}

export function AdSensePlaceholder({ className, size = "leaderboard" }: AdSensePlaceholderProps) {
  // Return null to hide placeholders globally when there are no active ads.
  return null;
}
