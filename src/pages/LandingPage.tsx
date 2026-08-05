import Navbar from "@/components/Navbar";
import HeroSection from "@/sections/HeroSection";
import ShowcaseSection from "@/sections/ShowcaseSection";
import HowItWorksSection from "@/sections/HowItWorksSection";
import FeaturesSection from "@/sections/FeaturesSection";
import DemoSection from "@/sections/DemoSection";
import TestimonialsSection from "@/sections/TestimonialsSection";
import PricingTeaserSection from "@/sections/PricingTeaserSection";
import CTASection from "@/sections/CTASection";
import FooterSection from "@/sections/FooterSection";
import { SEO, organizationSchema, softwareApplicationSchema } from "@/components/SEO";

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <SEO
        title="AIVideo · Turn screenshots into narrated video tutorials"
        description="Upload the screenshots you already have. AIVideo writes the narration, zooms into the right part of each screen, and renders a finished MP4."
        keywords="tutorial video maker, screenshot to video, screen recording alternative, documentation video, onboarding video"
        canonical="https://aivideo.ai/"
        jsonLd={[organizationSchema, softwareApplicationSchema]}
      />

      <Navbar />

      <main>
        {/* Order is a narrative: what it does, what it looks like, how it
            works, what is in it, proof, price, ask. */}
        <HeroSection />
        <ShowcaseSection />
        <HowItWorksSection />
        <FeaturesSection />
        <DemoSection />
        <TestimonialsSection />
        <PricingTeaserSection />
        <CTASection />
      </main>

      <FooterSection />
    </div>
  );
}
