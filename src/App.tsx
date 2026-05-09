import { Routes, Route } from "react-router";
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

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/docs" element={<Docs />} />
      <Route path="/about" element={<About />} />
      <Route path="/blog" element={<Blog />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/changelog" element={<Changelog />} />
      
      {/* Footer Pages via GenericContent */}
      <Route path="/api" element={<GenericContent title="API Reference" description="Integrate AIVideo rendering directly into your CI/CD pipeline." />} />
      <Route path="/tutorials" element={<GenericContent title="Tutorials" description="Advanced guides on mastering cinematic zoom." />} />
      <Route path="/careers" element={<GenericContent title="Careers" description="Join us in building the future of video documentation." />} />
      <Route path="/legal" element={<GenericContent title="Legal & Privacy" description="Terms of service, privacy policy, and compliance." />} />
      <Route path="/help" element={<GenericContent title="Help Center" description="Find answers to common questions and troubleshooting guides." />} />
      <Route path="/community" element={<GenericContent title="Community" description="Join our Discord and engage with other creators." />} />
      <Route path="/status" element={<GenericContent title="System Status" description="Real-time uptime monitoring for our rendering workers." />} />
      <Route path="/feedback" element={<GenericContent title="Feedback" description="Suggest features and report bugs." />} />

      <Route path="/login" element={<Login />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/pricing" element={<Pricing />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/create/:projectId/:step" element={<Wizard />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
