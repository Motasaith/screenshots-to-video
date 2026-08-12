import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";
import {
  ArrowLeft,
  Check,
  Copy,
  Crown,
  Loader2,
  Mail,
  Palette,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

/**
 * Team settings: who is in it, who has been invited, how many seats, and the brand
 * kit applied to the team's videos.
 *
 * Someone with no team sees one thing: a box that creates one. Everything else on
 * this page needs a team to exist first, and showing disabled controls for a thing
 * you do not have yet is worse than not showing them.
 */
export default function Team() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const utils = trpc.useUtils();

  const team = trpc.team.mine.useQuery(undefined, { enabled: !!user });
  const activity = trpc.team.activity.useQuery(undefined, {
    enabled: !!team.data,
  });

  const createTeam = trpc.team.create.useMutation();
  const invite = trpc.team.invite.useMutation();
  const revoke = trpc.team.revokeInvite.useMutation();
  const removeMember = trpc.team.removeMember.useMutation();
  const setRole = trpc.team.setRole.useMutation();
  const setSeats = trpc.team.setPurchasedSeats.useMutation();
  const setBrandKit = trpc.team.setBrandKit.useMutation();

  const [newName, setNewName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member">("member");
  const [lastLink, setLastLink] = useState<string | null>(null);
  const [extraSeats, setExtraSeats] = useState("");

  useEffect(() => {
    if (!isLoading && !user) navigate("/login");
  }, [isLoading, user, navigate]);

  if (isLoading || team.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center font-sans">
        <Loader2 className="h-5 w-5 animate-spin text-[var(--space-text-muted)]" />
      </div>
    );
  }
  if (!user) return null;

  const refresh = async () => {
    await utils.team.mine.invalidate();
    await utils.team.activity.invalidate();
  };

  /* ─────────────────────────── no team yet ─────────────────────────── */

  if (!team.data) {
    return (
      <Shell title="Team">
        <div className="mx-auto max-w-xl px-6 py-16">
          <div className="rounded-2xl border border-[var(--space-border)] bg-[var(--space-card)] p-8 text-center">
            <span className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-teal-500/10">
              <Users className="h-6 w-6 text-teal-600" />
            </span>
            <h2 className="mb-2 text-xl font-bold text-[var(--space-text)]">
              Work with your colleagues
            </h2>
            <p className="mb-6 text-sm leading-relaxed text-[var(--space-text-muted)]">
              A team shares one subscription, one library of projects and one brand kit.
              Everyone you invite gets the Team plan.
            </p>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Your company name"
                maxLength={120}
              />
              <Button
                disabled={newName.trim().length < 2 || createTeam.isPending}
                onClick={async () => {
                  try {
                    await createTeam.mutateAsync({ name: newName.trim() });
                    await refresh();
                    toast.success("Team created. Invite your colleagues below.");
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "Could not create the team.");
                  }
                }}
                className="glass-btn glass-btn-primary flex-none"
              >
                {createTeam.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
                Create team
              </Button>
            </div>
          </div>
        </div>
      </Shell>
    );
  }

  /* ──────────────────────────── has a team ─────────────────────────── */

  const { team: t, members, invites, seats, role, canManage, canBill } = team.data;
  const ownerId = t.ownerUserId;

  return (
    <Shell title={t.name}>
      <div className="mx-auto max-w-4xl space-y-6 px-6 py-8">
        {/* ── seats ── */}
        <section className="rounded-2xl border border-[var(--space-border)] bg-[var(--space-card)] p-6">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <Users className="h-4 w-4 text-teal-600" />
            <h2 className="font-bold text-[var(--space-text)]">Seats</h2>
            <span className="rounded-full bg-teal-500/10 px-2.5 py-0.5 text-xs font-semibold text-teal-700">
              {seats.used} of {seats.total} used
            </span>
            {seats.pending > 0 ? (
              <span className="text-xs text-[var(--space-text-muted)]">
                {seats.pending} invitation{seats.pending === 1 ? "" : "s"} waiting, holding a seat each
              </span>
            ) : null}
          </div>

          {canBill ? (
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <Label className="text-sm">Extra seats beyond the {t.seatsIncluded} included</Label>
                <Input
                  value={extraSeats === "" ? String(t.seatsPurchased) : extraSeats}
                  onChange={(e) => setExtraSeats(e.target.value)}
                  inputMode="numeric"
                  className="mt-1 w-28"
                />
              </div>
              <p className="text-sm text-[var(--space-text-muted)]">
                ${team.data.seatPriceUsd} per extra seat per month
              </p>
              <Button
                variant="ghost"
                disabled={setSeats.isPending}
                onClick={async () => {
                  try {
                    const res = await setSeats.mutateAsync({
                      seatsPurchased: Number(extraSeats === "" ? t.seatsPurchased : extraSeats) || 0,
                    });
                    setExtraSeats("");
                    await refresh();
                    toast.success(
                      `Now ${res.seatsTotal} seats, $${res.extraMonthlyCostUsd} a month extra.`
                    );
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "Could not change the seats.");
                  }
                }}
                className="glass-btn glass-btn-secondary ml-auto text-xs"
              >
                Update seats
              </Button>
            </div>
          ) : (
            <p className="text-sm text-[var(--space-text-muted)]">
              Only the team owner can change how many seats the team has.
            </p>
          )}
        </section>

        {/* ── members ── */}
        <section className="rounded-2xl border border-[var(--space-border)] bg-[var(--space-card)] p-6">
          <h2 className="mb-4 font-bold text-[var(--space-text)]">People</h2>

          <div className="space-y-2">
            {members.map((m) => {
              const isOwner = m.userId === ownerId;
              const isSelf = m.userId === user.id;
              return (
                <div
                  key={m.userId}
                  className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--space-border)] px-3 py-2.5"
                >
                  {m.avatar ? (
                    <img src={m.avatar} alt="" className="h-8 w-8 flex-none rounded-full" />
                  ) : (
                    <span className="grid h-8 w-8 flex-none place-items-center rounded-full bg-teal-500/10 text-xs font-bold text-teal-700">
                      {(m.name || m.email || "?").slice(0, 1).toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[var(--space-text)]">
                      {m.name || m.email}
                      {isSelf ? " (you)" : ""}
                    </p>
                    <p className="truncate text-xs text-[var(--space-text-muted)]">{m.email}</p>
                  </div>

                  {isOwner ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                      <Crown className="h-3 w-3" />
                      Owner
                    </span>
                  ) : canBill ? (
                    <Select
                      value={m.role}
                      onValueChange={async (v) => {
                        try {
                          await setRole.mutateAsync({ userId: m.userId, role: v as "admin" | "member" });
                          await refresh();
                          toast.success("Role updated.");
                        } catch (err) {
                          toast.error(err instanceof Error ? err.message : "Could not change the role.");
                        }
                      }}
                    >
                      <SelectTrigger className="w-28 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="member">Member</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className="text-xs capitalize text-[var(--space-text-muted)]">{m.role}</span>
                  )}

                  {!isOwner && (canManage || isSelf) ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        if (
                          !window.confirm(
                            isSelf
                              ? "Leave this team? You will lose access to its shared projects."
                              : `Remove ${m.name || m.email} from the team? Their projects stay with the team.`
                          )
                        ) {
                          return;
                        }
                        try {
                          await removeMember.mutateAsync({ userId: m.userId });
                          await refresh();
                          toast.success(isSelf ? "You have left the team." : "Removed.");
                        } catch (err) {
                          toast.error(err instanceof Error ? err.message : "Could not remove them.");
                        }
                      }}
                      className="text-xs text-[var(--space-text-muted)] hover:text-red-600"
                    >
                      {isSelf ? "Leave" : <Trash2 className="h-3.5 w-3.5" />}
                    </Button>
                  ) : null}
                </div>
              );
            })}
          </div>

          {/* ── invite ── */}
          {canManage ? (
            <div className="mt-5 border-t border-[var(--space-border)] pt-5">
              <Label className="mb-1 block text-sm">Invite someone</Label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  type="email"
                  placeholder="colleague@company.com"
                  className="flex-1"
                />
                <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as "admin" | "member")}>
                  <SelectTrigger className="w-full sm:w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">Member</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  disabled={!inviteEmail.trim() || invite.isPending || seats.available <= 0}
                  onClick={async () => {
                    try {
                      const res = await invite.mutateAsync({
                        email: inviteEmail.trim(),
                        role: inviteRole,
                      });
                      setInviteEmail("");
                      setLastLink(res.emailed ? null : res.link);
                      await refresh();
                      toast.success(
                        res.emailed
                          ? "Invitation sent."
                          : "Invitation created. Email is not set up, so copy the link below to them."
                      );
                    } catch (err) {
                      toast.error(err instanceof Error ? err.message : "Could not invite them.");
                    }
                  }}
                  className="glass-btn glass-btn-primary flex-none"
                >
                  <UserPlus className="mr-1.5 h-4 w-4" />
                  Invite
                </Button>
              </div>

              {seats.available <= 0 ? (
                <p className="mt-2 text-xs text-amber-700">
                  All {seats.total} seats are taken, counting invitations that have not been
                  accepted. Add a seat to invite someone else.
                </p>
              ) : null}

              {/* When email is not configured, the link is the only way through. */}
              {lastLink ? (
                <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-[var(--space-bg)] p-2.5">
                  <code className="min-w-0 flex-1 truncate text-[11.5px]">{lastLink}</code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      void navigator.clipboard.writeText(lastLink);
                      toast.success("Link copied.");
                    }}
                    className="text-xs"
                  >
                    <Copy className="mr-1 h-3.5 w-3.5" />
                    Copy
                  </Button>
                </div>
              ) : null}

              {invites.length > 0 ? (
                <div className="mt-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--space-text-muted)]">
                    Waiting to accept
                  </p>
                  <div className="space-y-1.5">
                    {invites.map((i) => (
                      <div
                        key={i.id}
                        className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-[var(--space-border)] px-3 py-2 text-sm"
                      >
                        <Mail className="h-3.5 w-3.5 flex-none text-[var(--space-text-muted)]" />
                        <span className="min-w-0 flex-1 truncate">{i.email}</span>
                        <span className="text-xs capitalize text-[var(--space-text-muted)]">
                          {i.role}
                        </span>
                        <span className="text-xs text-[var(--space-text-muted)]">
                          expires {new Date(i.expiresAt).toLocaleDateString()}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            try {
                              await revoke.mutateAsync({ inviteId: i.id });
                              await refresh();
                              toast.success("Invitation cancelled.");
                            } catch (err) {
                              toast.error(err instanceof Error ? err.message : "Could not cancel it.");
                            }
                          }}
                          className="text-xs text-[var(--space-text-muted)] hover:text-red-600"
                        >
                          Cancel
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </section>

        {/* ── brand kit ── */}
        {canManage ? <BrandKit brandKit={t.brandKit} onSave={setBrandKit} onSaved={refresh} /> : null}

        {/* ── activity ── */}
        <section className="rounded-2xl border border-[var(--space-border)] bg-[var(--space-card)] p-6">
          <h2 className="mb-1 font-bold text-[var(--space-text)]">Activity</h2>
          <p className="mb-4 text-sm text-[var(--space-text-muted)]">
            Everything that has changed in this team, newest first.
          </p>
          {!activity.data?.length ? (
            <p className="text-sm text-[var(--space-text-muted)]">Nothing recorded yet.</p>
          ) : (
            <div className="space-y-1.5">
              {activity.data.map((entry) => (
                <div
                  key={entry.id}
                  className="flex flex-wrap items-baseline gap-2 border-b border-[var(--space-border)] pb-1.5 text-sm last:border-0"
                >
                  <code className="text-[12px] text-teal-700">{entry.action}</code>
                  {entry.targetId ? (
                    <span className="text-[12.5px] text-[var(--space-text-muted)]">
                      {entry.targetType}: {entry.targetId}
                    </span>
                  ) : null}
                  <span className="ml-auto text-[11.5px] text-[var(--space-text-muted)]">
                    {new Date(entry.createdAt).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        <p className="text-center text-xs text-[var(--space-text-muted)]">
          You are {role === "owner" ? "the owner" : `a team ${role}`} of {t.name}.
        </p>
      </div>
    </Shell>
  );
}

/** The page frame, matching the account settings screen. */
function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen relative overflow-x-hidden font-sans">
      <div className="relative z-10">
        <header className="border-b border-[var(--space-border)] bg-[var(--space-card)]/90 backdrop-blur-sm">
          <div className="w-full px-6 lg:px-12">
            <div className="flex h-16 items-center justify-between">
              <button
                onClick={() => navigate("/dashboard")}
                className="flex items-center gap-2 text-[var(--space-text-subtle)] transition-colors hover:text-[var(--space-text)]"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="text-sm">Dashboard</span>
              </button>
              <h1 className="truncate text-lg font-bold text-[var(--space-text)]">{title}</h1>
              <button
                onClick={() => navigate("/settings")}
                className="text-sm text-[var(--space-text-subtle)] transition-colors hover:text-[var(--space-text)]"
              >
                Account
              </button>
            </div>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}

/**
 * Logo, colours and the words on the intro and outro cards.
 *
 * State starts from the props on mount, so a background refetch cannot overwrite
 * something half-typed.
 */
function BrandKit({
  brandKit,
  onSave,
  onSaved,
}: {
  brandKit: {
    logoKey?: string | null;
    primaryColor?: string | null;
    accentColor?: string | null;
    introText?: string | null;
    outroText?: string | null;
    watermarkText?: string | null;
  } | null;
  onSave: ReturnType<typeof trpc.team.setBrandKit.useMutation>;
  onSaved: () => Promise<void>;
}) {
  const [primary, setPrimary] = useState(brandKit?.primaryColor ?? "#0d6b6b");
  const [accent, setAccent] = useState(brandKit?.accentColor ?? "#14181d");
  const [intro, setIntro] = useState(brandKit?.introText ?? "");
  const [outro, setOutro] = useState(brandKit?.outroText ?? "");
  const [watermark, setWatermark] = useState(brandKit?.watermarkText ?? "");

  return (
    <section className="rounded-2xl border border-[var(--space-border)] bg-[var(--space-card)] p-6">
      <div className="mb-1 flex items-center gap-2">
        <Palette className="h-4 w-4 text-teal-600" />
        <h2 className="font-bold text-[var(--space-text)]">Brand kit</h2>
      </div>
      <p className="mb-4 text-sm text-[var(--space-text-muted)]">
        Defaults for everyone's videos in this team, so nobody has to set the same
        colours and wording on every project.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label className="text-sm">Primary colour</Label>
          <div className="mt-1 flex gap-2">
            <input
              type="color"
              value={primary}
              onChange={(e) => setPrimary(e.target.value)}
              className="h-9 w-12 cursor-pointer rounded border border-[var(--space-border)] bg-transparent"
              aria-label="Primary colour"
            />
            <Input value={primary} onChange={(e) => setPrimary(e.target.value)} className="flex-1" />
          </div>
        </div>
        <div>
          <Label className="text-sm">Accent colour</Label>
          <div className="mt-1 flex gap-2">
            <input
              type="color"
              value={accent}
              onChange={(e) => setAccent(e.target.value)}
              className="h-9 w-12 cursor-pointer rounded border border-[var(--space-border)] bg-transparent"
              aria-label="Accent colour"
            />
            <Input value={accent} onChange={(e) => setAccent(e.target.value)} className="flex-1" />
          </div>
        </div>
        <div>
          <Label className="text-sm">Intro card text</Label>
          <Input
            value={intro}
            onChange={(e) => setIntro(e.target.value)}
            maxLength={120}
            placeholder="Acme product tour"
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-sm">Outro card text</Label>
          <Input
            value={outro}
            onChange={(e) => setOutro(e.target.value)}
            maxLength={120}
            placeholder="Questions? support@acme.com"
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-sm">Watermark text</Label>
          <Input
            value={watermark}
            onChange={(e) => setWatermark(e.target.value)}
            maxLength={60}
            placeholder="acme.com"
            className="mt-1"
          />
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <Button
          disabled={onSave.isPending}
          onClick={async () => {
            try {
              await onSave.mutateAsync({
                primaryColor: /^#[0-9a-fA-F]{6}$/.test(primary) ? primary : null,
                accentColor: /^#[0-9a-fA-F]{6}$/.test(accent) ? accent : null,
                introText: intro.trim() || null,
                outroText: outro.trim() || null,
                watermarkText: watermark.trim() || null,
              });
              await onSaved();
              toast.success("Brand kit saved.");
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Could not save the brand kit.");
            }
          }}
          className="glass-btn glass-btn-primary text-xs"
        >
          {onSave.isPending ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Check className="mr-1.5 h-3.5 w-3.5" />
          )}
          Save brand kit
        </Button>
        <p className="text-xs text-[var(--space-text-muted)]">
          Used on every new render, wherever the project has not set its own.
        </p>
      </div>
    </section>
  );
}
