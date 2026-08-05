/**
 * Google OAuth helpers shared by the sign-in and sign-up pages.
 *
 * Terms acceptance is remembered locally so returning users don't have to
 * re-tick the agreement on every visit: it's a one-time thing, then it's a
 * single click. (We intentionally do NOT set an OAuth `prompt` param: that lets
 * Google skip its own account/consent screen for users who already have a
 * session and have granted access before.)
 */
const TERMS_KEY = "aivideo:terms-accepted";

export function hasAcceptedTerms(): boolean {
  try {
    return localStorage.getItem(TERMS_KEY) === "1";
  } catch {
    return false;
  }
}

export function rememberTermsAccepted(): void {
  try {
    localStorage.setItem(TERMS_KEY, "1");
  } catch {
    /* localStorage unavailable (private mode): non-fatal */
  }
}

/**
 * Build the Google OAuth authorize URL. `returnTo` is an in-app path the user
 * lands on after the callback (defaults server-side to /dashboard).
 */
export function getGoogleOAuthUrl(returnTo?: string): string {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const redirectUri = `${window.location.origin}/api/oauth/callback`;
  const safeReturn = returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : undefined;
  // Backend accepts base64 JSON state: { redirectUri, returnTo }.
  const state = btoa(JSON.stringify({ redirectUri, returnTo: safeReturn }));

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  return url.toString();
}
