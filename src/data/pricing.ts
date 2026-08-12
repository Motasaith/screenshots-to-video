/**
 * One source for plans, shared by the homepage teaser and /pricing.
 *
 * They used to be two hand-maintained copies and had already drifted: the
 * homepage advertised "14 free videos a week" while the pricing page said five
 * a month.
 *
 * Every line below is something the code actually does. Three claims were removed
 * rather than reworded, because nothing in the application implemented them:
 * SSO, team analytics, and unlimited seats. The support assistant's knowledge
 * repeated the first of those and it told a test visitor that SAML was available on
 * Team, which is exactly how a marketing line becomes a support problem.
 *
 * The free allowance is deliberately absent from the feature list here: it is
 * editable from the admin dashboard and multiplied during a promotion, so the page
 * reads it live through `freeVideosFeature()` instead of stating a number that goes
 * stale the moment an offer starts.
 */

export interface Plan {
  id: string;
  name: string;
  price: string;
  period: string;
  /** Monthly-equivalent price when billed yearly. Omit if there is no discount. */
  yearlyPrice?: string;
  tagline: string;
  features: string[];
  cta: string;
  href: string;
  popular?: boolean;
  /** Shown on the homepage teaser. The full table lives on /pricing. */
  teaser?: boolean;
}

/** What extra Team seats cost. Mirrors SEAT_PRICE_USD in api/lib/teams.ts. */
export const SEAT_PRICE_USD = 19;

/** Seats a Team plan includes. Mirrors the `teamSeatsIncluded` app setting. */
export const TEAM_SEATS_INCLUDED = 3;

export const plans: Plan[] = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    period: "forever",
    tagline: "Enough to find out whether this works for you.",
    features: [
      // The first line is replaced at render time with the live allowance.
      "Videos every month, free",
      "720p export",
      "A small narrashot.com watermark",
      "Every aspect ratio",
      "12 voices, 4 of them ultra-realistic",
      "AI script generation",
      "Videos kept for 7 days",
      "Community support",
    ],
    cta: "Start free",
    href: "/signup",
    teaser: true,
  },
  {
    id: "pro",
    name: "Pro",
    price: "$24",
    yearlyPrice: "$19",
    period: "per month",
    tagline: "For people who publish on a schedule.",
    features: [
      // Replaced at render time with the enforced cap.
      "Renders a month",
      "1080p export, no watermark",
      "Record or upload your own voice",
      "ElevenLabs voices with your own key",
      "Copyright check on every screenshot",
      "Scene transitions and custom intro or outro",
      "Background music library",
      "Priority render queue",
      "Videos kept for 90 days",
    ],
    cta: "Upgrade to Pro",
    href: "/signup",
    popular: true,
    teaser: true,
  },
  {
    id: "team",
    name: "Team",
    price: "$79",
    period: "per month",
    tagline: "For documentation teams and agencies.",
    features: [
      "Everything in Pro, with no monthly render cap",
      "4K export",
      `${TEAM_SEATS_INCLUDED} seats included, $${SEAT_PRICE_USD} for each extra`,
      "Shared project library",
      "Brand kit applied to every video",
      "Activity log of who changed what",
      "Videos kept for a year",
      "Dedicated support",
    ],
    cta: "Start a team",
    href: "/team",
  },
];

export const teaserPlans = plans.filter((p) => p.teaser);

/**
 * The free plan's first feature line, from the live allowance.
 *
 * Pass what `trpc.config` returns. Without a number it says something true but vague
 * rather than guessing, because a wrong number here is the bug this whole file
 * already had once.
 */
export function freeVideosFeature(freeVideos: number | null | undefined, promoLabel?: string | null): string {
  if (!freeVideos) return "Free videos every month";
  const base = `${freeVideos} free videos a month`;
  return promoLabel ? `${base} (${promoLabel})` : base;
}

/** The plans with the enforced limits filled in. */
export function plansWithLiveLimits(
  freeVideos: number | null | undefined,
  promoLabel?: string | null,
  proRenders?: number | null
): Plan[] {
  return plans.map((plan) => {
    if (plan.id === "free") {
      return {
        ...plan,
        features: [freeVideosFeature(freeVideos, promoLabel), ...plan.features.slice(1)],
      };
    }
    if (plan.id === "pro") {
      // The cap is editable in the admin dashboard and enforced at render time, so the
      // page quotes the same number rather than one typed here.
      const label = proRenders ? `${proRenders} renders a month` : "Generous monthly renders";
      return { ...plan, features: [label, ...plan.features.slice(1)] };
    }
    return plan;
  });
}
