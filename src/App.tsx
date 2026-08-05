import { lazy, Suspense } from "react";
import { Routes, Route, useLocation } from "react-router";
import LandingPage from "./pages/LandingPage";
import { trpc } from "./providers/trpc";
import { useAuth } from "./hooks/useAuth";
import { Spinner } from "@/components/ui/spinner";
import { Wrench } from "lucide-react";

// The landing page is the entry point for most visitors, so it stays in the
// main bundle: lazy-loading it would only add a request waterfall before
// first paint. Everything else is split out: a visitor reading the marketing
// site has no reason to download the admin dashboard, the render wizard, or
// the 7k-line step editor before seeing anything.
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Wizard = lazy(() => import("./pages/Wizard"));
const Login = lazy(() => import("./pages/Login"));
const SignUp = lazy(() => import("./pages/SignUp"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Pricing = lazy(() => import("./pages/Pricing"));
const Settings = lazy(() => import("./pages/Settings"));
const Docs = lazy(() => import("./pages/Docs"));
const About = lazy(() => import("./pages/About"));
const Blog = lazy(() => import("./pages/Blog"));
const Contact = lazy(() => import("./pages/Contact"));
const Changelog = lazy(() => import("./pages/Changelog"));
const GenericContent = lazy(() => import("./pages/GenericContent"));
const HelpCenter = lazy(() => import("./pages/HelpCenter"));
const Community = lazy(() => import("./pages/Community"));
const Status = lazy(() => import("./pages/Status"));
const Feedback = lazy(() => import("./pages/Feedback"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));
const Videos = lazy(() => import("./pages/Videos"));
const Careers = lazy(() => import("./pages/Careers"));
const Legal = lazy(() => import("./pages/Legal"));
const Admin = lazy(() => import("./pages/Admin"));
const BlogPost = lazy(() => import("./pages/BlogPost"));

function RouteFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Spinner className="size-6 text-muted-foreground" />
    </div>
  );
}

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
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/docs" element={<Docs />} />
        <Route path="/about" element={<About />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/blog/:slug" element={<BlogPost />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/changelog" element={<Changelog />} />

        {/* Footer Pages */}
        <Route path="/api" element={<GenericContent title="API Reference" description="Integrate the AIVideo FFmpeg rendering pipeline and Vision LLM directly into your CI/CD." />} />
        <Route path="/tutorials" element={<GenericContent title="Tutorials" description="Advanced guides on mastering cinematic zoom, Studio Mode storytelling, and custom transitions." />} />
        <Route path="/careers" element={<Careers />} />
        <Route path="/legal" element={<Legal />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/help" element={<HelpCenter />} />
        <Route path="/community" element={<Community />} />
        <Route path="/status" element={<Status />} />
        <Route path="/feedback" element={<Feedback />} />

        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/videos" element={<Videos />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/create/:projectId/:step" element={<Wizard />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
