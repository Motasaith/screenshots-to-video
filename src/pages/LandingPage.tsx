import Navbar from "@/components/Navbar";
import HeroSection from "@/sections/HeroSection";
import SocialProofSection from "@/sections/SocialProofSection";
import FeaturesSection from "@/sections/FeaturesSection";
import HowItWorksSection from "@/sections/HowItWorksSection";
import StatsSection from "@/sections/StatsSection";
import TestimonialsSection from "@/sections/TestimonialsSection";
import PricingTeaserSection from "@/sections/PricingTeaserSection";
import CTASection from "@/sections/CTASection";
import FooterSection from "@/sections/FooterSection";
import { SEO, organizationSchema, softwareApplicationSchema } from "@/components/SEO";
import { AdSensePlaceholder } from "@/components/shared/AdSensePlaceholder";

export default function LandingPage() {
  return (
    <div className="min-h-screen dot-grid">
      <SEO
        title="AIVideo — Turn Screenshots into Cinematic Video Tutorials"
        description="AIVideo automatically transforms your screenshots and descriptions into a professional, narrated video tutorial with cinematic zoom animations."
        keywords="AI video, tutorial maker, screen recording alternative, auto video generator, documentation, SaaS"
        canonical="https://aivideo.ai/"
        jsonLd={[organizationSchema, softwareApplicationSchema]}
      />
      <Navbar />
      <main>
        <HeroSection />
        <SocialProofSection />
        <div className="container mx-auto px-4"><AdSensePlaceholder size="leaderboard" /></div>
        <FeaturesSection />
        <HowItWorksSection />
        <StatsSection />
        <TestimonialsSection />
        <div className="container mx-auto px-4"><AdSensePlaceholder size="leaderboard" /></div>
        <PricingTeaserSection />
        <CTASection />
      </main>
      <FooterSection />
    </div>
  );
}
