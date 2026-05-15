import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Film, Sparkles } from "lucide-react";

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
  return (
    <div className="min-h-screen dot-grid flex items-center justify-center px-4">
      <Card className="w-full max-w-sm sketch-card border-2">
        <CardHeader className="text-center pb-2">
          <div className="w-14 h-14 bg-[var(--sketch-accent)] border-2 border-[var(--sketch-border-color)] flex items-center justify-center mx-auto mb-4 sketch-border-sm">
            <Film className="w-7 h-7 text-[var(--sketch-fg)]" />
          </div>
          <CardTitle className="font-body font-bold text-2xl text-[var(--sketch-fg)]">
            Welcome back
          </CardTitle>
          <p className="font-body text-sm text-[var(--sketch-fg-muted)] mt-1">
            Sign in to continue creating
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            className="w-full sketch-btn-primary"
            size="lg"
            onClick={() => {
              window.location.href = getOAuthUrl();
            }}
          >
            <Sparkles className="w-4 h-4" />
            Sign in with Google
          </Button>
          <p className="text-center font-body text-xs text-[var(--sketch-fg-subtle)] pt-2">
            By signing in, you agree to our Terms & Privacy Policy
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
