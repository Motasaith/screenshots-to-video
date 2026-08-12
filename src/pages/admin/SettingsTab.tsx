import { useState } from "react";
import { Loader2, Megaphone, Percent, Save, Coins } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/providers/trpc";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../api/router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * Everything that used to need a deploy.
 *
 * Three sections because they are three jobs: what a free account gets, what a
 * promotion multiplies it by, and what message sits above the navbar. Each saves
 * on its own so changing the banner cannot accidentally rewrite the plan limits.
 */

type Level = "info" | "warning" | "success";

type Settings = inferRouterOutputs<AppRouter>["admin"]["getAppSettings"]["settings"];

/** Fetches, then hands the values to a form that owns them from mount. */
export function SettingsTab() {
  const { data, isLoading } = trpc.admin.getAppSettings.useQuery();

  if (isLoading || !data) {
    return (
      <div className="neo-card grid place-items-center p-16">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <SettingsForm initial={data.settings} />;
}

/**
 * State is initialised from props on mount rather than copied in by an effect.
 *
 * That keeps a background refetch from overwriting a number someone is halfway
 * through typing, and there is no effect writing state during render.
 */
function SettingsForm({ initial }: { initial: Settings }) {
  const utils = trpc.useUtils();
  const save = trpc.admin.updateAppSettings.useMutation();

  const [freeVideos, setFreeVideos] = useState(String(initial.freeVideosPerMonth));
  const [resetDays, setResetDays] = useState(String(initial.freeResetDays));
  const [multiplier, setMultiplier] = useState(String(initial.promoMultiplier));
  const [promoLabel, setPromoLabel] = useState(initial.promoLabel);
  const [promoEndsAt, setPromoEndsAt] = useState(initial.promoEndsAt);
  const [creditValue, setCreditValue] = useState(String(initial.creditDollarValue));

  const [message, setMessage] = useState(initial.announcement.message);
  const [level, setLevel] = useState<Level>(initial.announcement.level);
  const [linkUrl, setLinkUrl] = useState(initial.announcement.linkUrl);
  const [linkLabel, setLinkLabel] = useState(initial.announcement.linkLabel);
  const [active, setActive] = useState(initial.announcement.active);
  const [dismissible, setDismissible] = useState(initial.announcement.dismissible);
  const [startsAt, setStartsAt] = useState(initial.announcement.startsAt);
  const [endsAt, setEndsAt] = useState(initial.announcement.endsAt);

  const commit = async (patch: Parameters<typeof save.mutateAsync>[0], what: string) => {
    try {
      await save.mutateAsync(patch);
      await utils.admin.getAppSettings.invalidate();
      toast.success(`${what} saved.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Could not save ${what.toLowerCase()}.`);
    }
  };

  const base = Number(freeVideos) || 0;
  const times = Number(multiplier) || 1;
  const effective = times > 1 ? base * times : base;

  return (
    <div className="space-y-6">
      {/* ── free plan and promotion ── */}
      <div className="neo-card p-5">
        <div className="mb-1 flex items-center gap-2">
          <Percent className="h-4 w-4 text-teal-600" />
          <h3 className="font-syne font-bold">Free plan and promotions</h3>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">
          The only place this number lives. The dashboard, the render check and the
          support assistant all read it, so they can no longer disagree.
        </p>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Label className="font-dm text-sm">Free videos per period</Label>
            <Input
              value={freeVideos}
              onChange={(e) => setFreeVideos(e.target.value)}
              inputMode="numeric"
              className="mt-1"
            />
          </div>
          <div>
            <Label className="font-dm text-sm">Period length (days)</Label>
            <Input
              value={resetDays}
              onChange={(e) => setResetDays(e.target.value)}
              inputMode="numeric"
              className="mt-1"
            />
          </div>
          <div>
            <Label className="font-dm text-sm">Promo multiplier</Label>
            <Input
              value={multiplier}
              onChange={(e) => setMultiplier(e.target.value)}
              inputMode="numeric"
              className="mt-1"
            />
            <p className="mt-1 text-[11.5px] text-muted-foreground">1 means no promotion</p>
          </div>
          <div>
            <Label className="font-dm text-sm">Promo ends (optional)</Label>
            <Input
              value={promoEndsAt}
              onChange={(e) => setPromoEndsAt(e.target.value)}
              type="date"
              className="mt-1"
            />
            <p className="mt-1 text-[11.5px] text-muted-foreground">
              After this, the multiplier stops on its own
            </p>
          </div>
        </div>

        <div className="mt-4">
          <Label className="font-dm text-sm">Promo label, shown to users</Label>
          <Input
            value={promoLabel}
            onChange={(e) => setPromoLabel(e.target.value)}
            placeholder="Launch offer: 4x free videos"
            maxLength={120}
            className="mt-1"
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="rounded-lg bg-teal-500/10 px-3 py-2 text-sm font-semibold text-teal-800 dark:text-teal-300">
            A free account currently gets {effective} videos every {resetDays || "?"} days
            {times > 1 ? ` (${base} x ${times})` : ""}
          </div>
          <Button
            onClick={() =>
              void commit(
                {
                  freeVideosPerMonth: Number(freeVideos) || 0,
                  freeResetDays: Number(resetDays) || 30,
                  promoMultiplier: Number(multiplier) || 1,
                  promoLabel,
                  promoEndsAt,
                },
                "Plan limits"
              )
            }
            disabled={save.isPending}
            className="glass-btn glass-btn-primary ml-auto text-xs"
          >
            <Save className="mr-1 h-3.5 w-3.5" />
            Save limits
          </Button>
        </div>
      </div>

      {/* ── credit value ── */}
      <div className="neo-card p-5">
        <div className="mb-1 flex items-center gap-2">
          <Coins className="h-4 w-4 text-teal-600" />
          <h3 className="font-syne font-bold">What a credit is worth</h3>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">
          Used when you grant credits by value on the Users tab, so a refund can be
          "give them $10 back" rather than working out the number of renders.
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <Label className="font-dm text-sm">Dollars per credit</Label>
            <Input
              value={creditValue}
              onChange={(e) => setCreditValue(e.target.value)}
              inputMode="decimal"
              className="mt-1 w-32"
            />
          </div>
          <p className="text-sm text-muted-foreground">
            $10 grants {Math.max(0, Math.round(10 / (Number(creditValue) || 0.5)))} credits
          </p>
          <Button
            onClick={() =>
              void commit({ creditDollarValue: Number(creditValue) || 0.5 }, "Credit value")
            }
            disabled={save.isPending}
            className="glass-btn glass-btn-secondary ml-auto text-xs"
          >
            <Save className="mr-1 h-3.5 w-3.5" />
            Save
          </Button>
        </div>
      </div>

      {/* ── announcement bar ── */}
      <div className="neo-card p-5">
        <div className="mb-1 flex items-center gap-2">
          <Megaphone className="h-4 w-4 text-teal-600" />
          <h3 className="font-syne font-bold">Message above the navbar</h3>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">
          For a limited offer, a domain change, or warning people before maintenance.
          Unlike maintenance mode, the site keeps working.
        </p>

        <div className="space-y-4">
          <div>
            <Label className="font-dm text-sm">Message</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={2}
              maxLength={300}
              placeholder="Launch offer: every free account gets 24 videos this month."
              className="mt-1"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <Label className="font-dm text-sm">Style</Label>
              <Select value={level} onValueChange={(v) => setLevel(v as Level)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">Information (green)</SelectItem>
                  <SelectItem value="warning">Warning (amber)</SelectItem>
                  <SelectItem value="success">Good news (emerald)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="font-dm text-sm">Button link (optional)</Label>
              <Input
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="/pricing"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="font-dm text-sm">Button text</Label>
              <Input
                value={linkLabel}
                onChange={(e) => setLinkLabel(e.target.value)}
                placeholder="See plans"
                maxLength={60}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="font-dm text-sm">Show from / until</Label>
              <div className="mt-1 flex gap-2">
                <Input value={startsAt} onChange={(e) => setStartsAt(e.target.value)} type="date" />
                <Input value={endsAt} onChange={(e) => setEndsAt(e.target.value)} type="date" />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={active} onCheckedChange={setActive} />
              <span className="font-dm">Live on the site</span>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={dismissible} onCheckedChange={setDismissible} />
              <span className="font-dm">Visitors can close it</span>
            </label>
            <Button
              onClick={() =>
                void commit(
                  {
                    announcement: {
                      message,
                      level,
                      linkUrl,
                      linkLabel,
                      active,
                      dismissible,
                      startsAt,
                      endsAt,
                    },
                  },
                  "Announcement"
                )
              }
              disabled={save.isPending}
              className="glass-btn glass-btn-primary ml-auto text-xs"
            >
              <Save className="mr-1 h-3.5 w-3.5" />
              Save message
            </Button>
          </div>

          {/* What it will look like, so nothing goes live unseen. */}
          {message.trim() ? (
            <div>
              <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                Preview {active ? "" : "(not live yet)"}
              </p>
              <div
                className={`rounded-lg px-4 py-2 text-[13.5px] font-medium ${
                  level === "warning"
                    ? "bg-amber-500 text-amber-950"
                    : level === "success"
                      ? "bg-emerald-600 text-white"
                      : "bg-teal-700 text-white"
                }`}
              >
                {message}
                {linkUrl ? (
                  <span className="ml-2 rounded-full bg-black/20 px-2 py-0.5 text-[12px]">
                    {linkLabel || "Find out more"}
                  </span>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
