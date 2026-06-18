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

export default function LandingPage() {
  return (
    <div className="theme-3d-immersive min-h-screen relative overflow-x-hidden font-sans">
      <SEO
        title="AIVideo — Turn Screenshots into Cinematic Video Tutorials"
        description="AIVideo automatically transforms your screenshots and descriptions into a professional, narrated video tutorial with cinematic zoom animations."
        keywords="AI video, tutorial maker, screen recording alternative, auto video generator, documentation, SaaS"
        canonical="https://aivideo.ai/"
        jsonLd={[organizationSchema, softwareApplicationSchema]}
      />
      
      {/* Immersive 3D Space Background Elements */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none select-none">
        <div className="glow-orb glow-orb-indigo top-[-5%] left-[-10%]" />
        <div className="glow-orb glow-orb-cyan top-[25%] right-[-5%]" />
        <div className="glow-orb glow-orb-violet top-[55%] left-[-15%]" />
        <div className="glow-orb glow-orb-indigo bottom-[5%] right-[5%]" />
        <div className="mesh-grid" />
        
        {/* Floating background dust/particles */}
        <div className="floating-particle w-1 h-1" style={{ left: "12%", animationDelay: "0s", animationDuration: "14s" }} />
        <div className="floating-particle w-2 h-2" style={{ left: "28%", animationDelay: "2s", animationDuration: "18s" }} />
        <div className="floating-particle w-1.5 h-1.5" style={{ left: "45%", animationDelay: "5s", animationDuration: "12s" }} />
        <div className="floating-particle w-1 h-1" style={{ left: "68%", animationDelay: "1s", animationDuration: "20s" }} />
        <div className="floating-particle w-2.5 h-2.5" style={{ left: "85%", animationDelay: "7s", animationDuration: "16s" }} />
      </div>

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
