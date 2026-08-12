import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";
import { AlertCircle, Check, Loader2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

/**
 * Accepting a team invitation.
 *
 * Signing in is required before the invitation can be read, because accepting is
 * something an account does, and because the account's email must match the address
 * that was invited. Without that check a forwarded link puts a stranger in the team,
 * on a seat the team is paying for.
 *
 * The token is kept in the URL through the sign-in round trip, so somebody who
 * arrives from an email and has no account yet lands back here after signing up.
 */
export default function Join() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  const details = trpc.team.inviteDetails.useQuery({ token }, { enabled: !!user && token.length > 10 });
  const accept = trpc.team.acceptInvite.useMutation();
  const [joined, setJoined] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading || user) return;
    // Come back here afterwards rather than dropping them on the dashboard with no
    // idea what happened to the invitation.
    navigate(`/login?next=${encodeURIComponent(`/join?token=${token}`)}`, { replace: true });
  }, [isLoading, user, navigate, token]);

  if (isLoading || !user) {
    return (
      <Frame>
        <Loader2 className="mx-auto h-5 w-5 animate-spin text-[var(--space-text-muted)]" />
      </Frame>
    );
  }

  if (!token || token.length <= 10) {
    return (
      <Frame>
        <Problem message="That invitation link is incomplete. Ask for a new one." />
      </Frame>
    );
  }

  if (details.isLoading) {
    return (
      <Frame>
        <Loader2 className="mx-auto h-5 w-5 animate-spin text-[var(--space-text-muted)]" />
      </Frame>
    );
  }

  if (joined) {
    return (
      <Frame>
        <span className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-emerald-500/10">
          <Check className="h-6 w-6 text-emerald-600" />
        </span>
        <h1 className="mb-2 text-xl font-bold text-[var(--space-text)]">You are in {joined}</h1>
        <p className="mb-6 text-sm text-[var(--space-text-muted)]">
          You now have the Team plan and access to the team's shared projects.
        </p>
        <Button onClick={() => navigate("/dashboard")} className="glass-btn glass-btn-primary">
          Go to the dashboard
        </Button>
      </Frame>
    );
  }

  if (!details.data?.valid) {
    return (
      <Frame>
        <Problem message={details.data?.reason ?? "That invitation could not be read."} />
      </Frame>
    );
  }

  const invitedEmail = details.data.email.toLowerCase();
  const signedInEmail = (user.email ?? "").toLowerCase();
  const wrongAccount = signedInEmail !== invitedEmail;

  return (
    <Frame>
      <span className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-teal-500/10">
        <Users className="h-6 w-6 text-teal-600" />
      </span>
      <h1 className="mb-2 text-xl font-bold text-[var(--space-text)]">
        Join {details.data.teamName}
      </h1>
      <p className="mb-6 text-sm leading-relaxed text-[var(--space-text-muted)]">
        You have been invited as {details.data.role === "admin" ? "an admin" : "a member"}. Joining
        gives you the Team plan and the team's shared projects.
      </p>

      {wrongAccount ? (
        <div className="mb-5 rounded-lg border border-amber-500/40 bg-amber-50 p-3 text-left text-sm text-amber-900">
          <p className="font-semibold">Signed in as the wrong account</p>
          <p className="mt-1">
            This invitation was sent to <strong>{details.data.email}</strong> but you are signed in as{" "}
            <strong>{user.email}</strong>. Sign out and sign back in with the invited address.
          </p>
        </div>
      ) : null}

      <Button
        disabled={wrongAccount || accept.isPending}
        onClick={async () => {
          try {
            const res = await accept.mutateAsync({ token });
            setJoined(res.teamName);
            toast.success(`You have joined ${res.teamName}.`);
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Could not accept the invitation.");
          }
        }}
        className="glass-btn glass-btn-primary"
      >
        {accept.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
        Accept invitation
      </Button>
    </Frame>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen font-sans">
      <div className="mx-auto max-w-md px-6 py-24 text-center">
        <div className="rounded-2xl border border-[var(--space-border)] bg-[var(--space-card)] p-8">
          {children}
        </div>
      </div>
    </div>
  );
}

function Problem({ message }: { message: string }) {
  const navigate = useNavigate();
  return (
    <>
      <span className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-amber-500/10">
        <AlertCircle className="h-6 w-6 text-amber-600" />
      </span>
      <h1 className="mb-2 text-xl font-bold text-[var(--space-text)]">Invitation problem</h1>
      <p className="mb-6 text-sm text-[var(--space-text-muted)]">{message}</p>
      <Button onClick={() => navigate("/dashboard")} className="glass-btn glass-btn-secondary">
        Go to the dashboard
      </Button>
    </>
  );
}
