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

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <HeroSection />
        <SocialProofSection />
        <FeaturesSection />
        <HowItWorksSection />
        <StatsSection />
        <TestimonialsSection />
        <PricingTeaserSection />
        <CTASection />
      </main>
      <FooterSection />
    </div>
  );
}
