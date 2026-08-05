/**
 * One source for plans, shared by the homepage teaser and /pricing.
 *
 * They used to be two hand-maintained copies and had already drifted: the
 * homepage advertised "14 free videos a week" while the pricing page said five
 * a month.
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

export const plans: Plan[] = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    period: "forever",
    tagline: "Enough to find out whether this works for you.",
    features: [
      "5 videos a month",
      "720p export",
      "Every aspect ratio",
      "12 voices, 4 of them ultra-realistic",
      "AI script generation",
      "Community support",
    ],
    cta: "Start free",
    href: "/signup",
    teaser: true,
  },
  {
    id: "pro",
    name: "Pro",
    price: "$25",
    yearlyPrice: "$20",
    period: "per month",
    tagline: "For people who publish on a schedule.",
    features: [
      "Unlimited videos",
      "1080p and 4K export",
      "ElevenLabs premium voices",
      "Copyright check on every screenshot",
      "Scene transitions and custom intro or outro",
      "Background music library",
      "Priority render queue",
    ],
    cta: "Upgrade to Pro",
    href: "/signup",
    popular: true,
    teaser: true,
  },
  {
    id: "team",
    name: "Team",
    price: "$99",
    period: "per month",
    tagline: "For documentation teams and agencies.",
    features: [
      "Everything in Pro",
      "Unlimited seats",
      "Shared project library",
      "Brand templates",
      "SSO",
      "Team analytics",
      "Dedicated support and an SLA",
    ],
    cta: "Talk to us",
    href: "/contact",
  },
];

export const teaserPlans = plans.filter((p) => p.teaser);
