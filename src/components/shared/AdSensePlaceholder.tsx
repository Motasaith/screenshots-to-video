import { cn } from "@/lib/utils";

interface AdSensePlaceholderProps {
  className?: string;
  size?: "banner" | "sidebar" | "leaderboard";
}

export function AdSensePlaceholder({ className, size = "leaderboard" }: AdSensePlaceholderProps) {
  const dimensions = {
    leaderboard: "728x90",
    banner: "468x60",
    sidebar: "300x250",
  }[size];

  return (
    <div
      className={cn(
        "w-full bg-[var(--sketch-card-bg)] border-2 border-dashed border-[var(--sketch-fg-subtle)] p-6 my-8 text-center flex flex-col items-center justify-center",
        className
      )}
    >
      <span className="font-mono text-xs text-[var(--sketch-fg-subtle)] uppercase tracking-widest bg-[var(--sketch-fg-subtle)]/10 px-2 py-1 sketch-border-sm mb-2 inline-block">
        Advertisement
      </span>
      <p className="font-body text-sm text-[var(--sketch-fg-muted)]">
        Google AdSense Placeholder ({dimensions})
      </p>
    </div>
  );
}
