import { Routes, Route, useLocation } from "react-router";
import LandingPage from "./pages/LandingPage";
import Dashboard from "./pages/Dashboard";
import Wizard from "./pages/Wizard";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import Pricing from "./pages/Pricing";
import Settings from "./pages/Settings";
import Docs from "./pages/Docs";
import About from "./pages/About";
import Blog from "./pages/Blog";
import Contact from "./pages/Contact";
import Changelog from "./pages/Changelog";
import GenericContent from "./pages/GenericContent";
import HelpCenter from "./pages/HelpCenter";
import Community from "./pages/Community";
import Status from "./pages/Status";
import Feedback from "./pages/Feedback";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import Videos from "./pages/Videos";
import Careers from "./pages/Careers";
import Legal from "./pages/Legal";
import Admin from "./pages/Admin";
import BlogPost from "./pages/BlogPost";
import StudioWizard from "./pages/StudioWizard";
import { trpc } from "./providers/trpc";
import { useAuth } from "./hooks/useAuth";
import { Wrench } from "lucide-react";

export default function App() {
  const { data: config } = trpc.config.useQuery(undefined, {
    refetchInterval: 1000 * 60, // check back every 1 min
  });
  const { user } = useAuth();
  
  const location = useLocation();
  const isMaintenanceMode = config?.maintenanceMode ?? false;
  const isAdmin = user?.role === "admin";
  const showMaintenance = isMaintenanceMode && !isAdmin && location.pathname !== "/login";

  if (showMaintenance) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center font-syne">
        <Wrench className="w-16 h-16 text-primary mb-6 animate-pulse" />
        <h1 className="text-4xl font-bold mb-4 tracking-tight">We'll be back shortly</h1>
        <p className="text-xl text-muted-foreground font-dm max-w-lg mb-8">
          AIVideo is currently undergoing scheduled maintenance to bring you an even highly optimized rendering experience.
        </p>
        <p className="text-sm text-muted-foreground/60 font-dm">
          Check back in a few minutes. Thanks for your patience!
        </p>
        {/* Secret way for admins to still get through to login */}
        <a href="/login" className="absolute bottom-4 right-4 opacity-5 hover:opacity-100 transition-opacity p-2 text-xs">
          Admin Bypass
        </a>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/docs" element={<Docs />} />
      <Route path="/about" element={<About />} />
      <Route path="/blog" element={<Blog />} />
      <Route path="/blog/:slug" element={<BlogPost />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/changelog" element={<Changelog />} />
      
      {/* Footer Pages */}
      <Route path="/api" element={<GenericContent title="API Reference" description="Integrate AIVideo rendering directly into your CI/CD pipeline." />} />
      <Route path="/tutorials" element={<GenericContent title="Tutorials" description="Advanced guides on mastering cinematic zoom." />} />
      <Route path="/careers" element={<Careers />} />
      <Route path="/legal" element={<Legal />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/help" element={<HelpCenter />} />
      <Route path="/community" element={<Community />} />
      <Route path="/status" element={<Status />} />
      <Route path="/feedback" element={<Feedback />} />

      <Route path="/login" element={<Login />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/videos" element={<Videos />} />
      <Route path="/pricing" element={<Pricing />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/create/:projectId/:step" element={<Wizard />} />
      <Route path="/studio/new" element={<StudioWizard />} />
      <Route path="/studio/:projectId/:step" element={<StudioWizard />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
