import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Film, LogIn, ArrowLeft } from "lucide-react";
import { Link } from "react-router";
import { useState } from "react";
import { SpaceBackground } from "@/components/shared/SpaceBackground";
import { toast } from "sonner";

function getOAuthUrl() {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const redirectUri = `${window.location.origin}/api/oauth/callback`;
  const state = btoa(redirectUri);

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);

  return url.toString();
}

export default function Login() {
  const [agreed, setAgreed] = useState(false);

  const handleSignIn = () => {
    if (!agreed) {
      toast.error("Please agree to the Terms & Conditions to continue.");
      return;
    }
    window.location.href = getOAuthUrl();
  };

  return (
    <div className="theme-3d-immersive min-h-screen relative overflow-x-hidden font-sans flex items-center justify-center px-4">
      <SpaceBackground />
      <div className="relative z-10 w-full max-w-sm">
        <Link to="/" className="absolute -top-16 left-0 flex items-center gap-2 font-mono text-sm text-[var(--space-text-subtle)] hover:text-[var(--space-text)] transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>
        <Card className="w-full glass-panel border border-[var(--space-border)] bg-[var(--space-card)]/80 backdrop-blur-md p-6">
          <CardHeader className="text-center pb-2">
            <div className="w-14 h-14 bg-teal-500/10 border border-teal-500/20 flex items-center justify-center mx-auto mb-4 rounded-2xl shadow-sm">
              <Film className="w-7 h-7 text-teal-500" />
            </div>
            <CardTitle className="font-extrabold text-2xl text-[var(--space-text)]">
              Welcome back
            </CardTitle>
            <p className="text-sm text-[var(--space-text-muted)] mt-1">
              Sign in to your account
            </p>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            {/* Terms agreement */}
            <div className="p-4 rounded-xl border border-[var(--space-border)] bg-[var(--space-card)]/50 space-y-3">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="terms"
                  checked={agreed}
                  onCheckedChange={(v) => setAgreed(v === true)}
                  className="mt-0.5"
                />
                <label
                  htmlFor="terms"
                  className="text-xs text-[var(--space-text-muted)] leading-relaxed cursor-pointer select-none"
                >
                  I agree to the{" "}
                  <Link to="/terms" className="text-teal-500 hover:underline">Terms of Service</Link>{" "}
                  and{" "}
                  <Link to="/privacy" className="text-teal-500 hover:underline">Privacy Policy</Link>.
                  I will not use this service for illegal activities, fraud,
                  creating misleading or harmful tutorials, or any purpose that
                  violates applicable laws.
                </label>
              </div>
            </div>

            <Button
              className="w-full glass-btn glass-btn-primary py-6 text-sm font-semibold rounded-xl"
              size="lg"
              onClick={handleSignIn}
            >
              <LogIn className="w-4 h-4" />
              Sign in with Google
            </Button>

            <p className="text-center text-xs text-[var(--space-text-subtle)] pt-2 leading-relaxed">
              By signing in, you agree to our Terms & Privacy Policy
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
