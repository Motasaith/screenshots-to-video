interface AdSensePlaceholderProps {
  className?: string;
  size?: "banner" | "sidebar" | "leaderboard";
}

export function AdSensePlaceholder(_props: AdSensePlaceholderProps) {
  void _props;
  // Return null to hide placeholders globally when there are no active ads.
  return null;
}
