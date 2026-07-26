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
import { SpaceBackground } from "@/components/shared/SpaceBackground";

export default function LandingPage() {
  return (
    <div className="theme-3d-immersive min-h-screen relative overflow-x-hidden font-sans">
      <SEO
        title="AIVideo | Turn Screenshots into Video Tutorials"
        description="AIVideo automatically transforms your screenshots and descriptions into a professional, narrated video tutorial with cinematic zoom animations."
        keywords="AI video, tutorial maker, screen recording alternative, auto video generator, documentation, SaaS"
        canonical="https://aivideo.ai/"
        jsonLd={[organizationSchema, softwareApplicationSchema]}
      />
      
      <SpaceBackground />

      <div className="relative z-10">
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
    </div>
  );
}
