import { useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, Mail, Send, Users } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/**
 * Writing and sending campaigns.
 *
 * The order of the page is the order of the job: check the connection works, write
 * the thing, send it to yourself, then send it to everyone. The real send button
 * stays disabled until a test has gone out, because there is no undo on a campaign.
 */
export function EmailTab() {
  const utils = trpc.useUtils();
  const status = trpc.admin.mailStatus.useQuery();
  const campaigns = trpc.admin.listCampaigns.useQuery(undefined, { refetchInterval: 5_000 });

  const saveCampaign = trpc.admin.saveCampaign.useMutation();
  const sendTest = trpc.admin.sendTestEmail.useMutation();
  const sendCampaign = trpc.admin.sendCampaign.useMutation();

  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [testTo, setTestTo] = useState("");
  const [tested, setTested] = useState(false);
  const [draftId, setDraftId] = useState<number | null>(null);

  const ready = status.data?.configured && status.data?.ok;

  const save = async () => {
    try {
      const res = await saveCampaign.mutateAsync({ id: draftId ?? undefined, subject, body });
      setDraftId(res.id);
      await utils.admin.listCampaigns.invalidate();
      toast.success("Draft saved.");
      return res.id;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save the draft.");
      return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* ── connection ── */}
      <div className="neo-card p-5">
        <div className="mb-3 flex items-center gap-2">
          <Mail className="h-4 w-4 text-teal-600" />
          <h3 className="font-syne font-bold">Mail connection</h3>
        </div>

        {status.isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : ready ? (
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
              Brevo is connected
            </span>
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <Users className="h-4 w-4" />
              {status.data?.audienceSize ?? 0} people have opted in to marketing email
            </span>
          </div>
        ) : (
          <div className="rounded-lg border border-amber-500/40 bg-amber-50 p-3 text-sm text-amber-900">
            <p className="flex items-center gap-1.5 font-semibold">
              <AlertCircle className="h-4 w-4" />
              Not sending yet
            </p>
            <p className="mt-1">{status.data?.error ?? "Checking..."}</p>
          </div>
        )}
        <p className="mt-3 text-[12.5px] text-muted-foreground">
          Messages about a customer's own renders are separate from campaigns and are
          sent whether or not they opted in to marketing.
        </p>
      </div>

      {/* ── compose ── */}
      <div className="neo-card p-5">
        <h3 className="mb-3 font-syne font-bold">Write a campaign</h3>

        <div className="space-y-4">
          <div>
            <Label className="font-dm text-sm">Subject</Label>
            <Input
              value={subject}
              onChange={(e) => {
                setSubject(e.target.value);
                setTested(false);
              }}
              maxLength={200}
              placeholder="New: record your own voiceover"
              className="mt-1"
            />
          </div>
          <div>
            <Label className="font-dm text-sm">Message</Label>
            <Textarea
              value={body}
              onChange={(e) => {
                setBody(e.target.value);
                setTested(false);
              }}
              rows={9}
              maxLength={20000}
              placeholder={"Hi,\n\nYou can now record your own voice instead of using ours...\n\nThe AIVideo team"}
              className="mt-1 text-sm"
            />
            <p className="mt-1 text-[12px] text-muted-foreground">
              Plain text. An unsubscribe link is added automatically, so you never have
              to remember it.
            </p>
          </div>

          <div className="flex flex-wrap items-end gap-3 border-t border-border pt-4">
            <div className="min-w-[220px] flex-1">
              <Label className="font-dm text-sm">Send a test to</Label>
              <Input
                value={testTo}
                onChange={(e) => setTestTo(e.target.value)}
                type="email"
                placeholder="you@yourdomain.com"
                className="mt-1"
              />
            </div>
            <Button
              variant="ghost"
              disabled={!ready || !subject.trim() || !body.trim() || !testTo.trim() || sendTest.isPending}
              onClick={async () => {
                try {
                  await sendTest.mutateAsync({ to: testTo.trim(), subject, body });
                  setTested(true);
                  toast.success("Test sent. Check that inbox before sending to everyone.");
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "The test did not send.");
                }
              }}
              className="glass-btn glass-btn-secondary text-xs"
            >
              {sendTest.isPending ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
              Send test
            </Button>
            <Button
              variant="ghost"
              onClick={() => void save()}
              disabled={!subject.trim() || !body.trim() || saveCampaign.isPending}
              className="glass-btn glass-btn-secondary text-xs"
            >
              Save draft
            </Button>
            <Button
              disabled={!ready || !tested || sendCampaign.isPending}
              onClick={async () => {
                const id = draftId ?? (await save());
                if (!id) return;
                if (
                  !window.confirm(
                    `Send "${subject}" to all ${status.data?.audienceSize ?? 0} people who opted in? This cannot be undone.`
                  )
                ) {
                  return;
                }
                try {
                  const res = await sendCampaign.mutateAsync({ id });
                  toast.success(`Sending to ${res.recipients} people. Progress is in the list below.`);
                  setSubject("");
                  setBody("");
                  setDraftId(null);
                  setTested(false);
                  await utils.admin.listCampaigns.invalidate();
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Could not start the send.");
                }
              }}
              className="glass-btn glass-btn-primary text-xs"
              title={tested ? "" : "Send a test to yourself first"}
            >
              <Send className="mr-1 h-3.5 w-3.5" />
              Send to everyone
            </Button>
          </div>
          {!tested && subject.trim() && body.trim() ? (
            <p className="text-[12.5px] text-amber-700">
              Send yourself a test first. There is no way to unsend a campaign.
            </p>
          ) : null}
        </div>
      </div>

      {/* ── history ── */}
      <div className="neo-card overflow-hidden">
        <div className="border-b-2 border-border bg-muted/30 p-4">
          <h3 className="font-syne font-bold">Campaigns</h3>
        </div>
        {!campaigns.data?.length ? (
          <p className="p-6 text-center text-sm text-muted-foreground">
            Nothing sent yet. Drafts and sent campaigns appear here.
          </p>
        ) : (
          <div className="divide-y divide-border/60">
            {campaigns.data.map((c) => (
              <div key={c.id} className="flex flex-wrap items-center gap-3 p-3 text-sm">
                <span
                  className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                    c.status === "sent"
                      ? "bg-emerald-100 text-emerald-800"
                      : c.status === "sending"
                        ? "bg-blue-100 text-blue-800"
                        : c.status === "failed"
                          ? "bg-red-100 text-red-800"
                          : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {c.status}
                </span>
                <span className="min-w-0 flex-1 truncate font-semibold">{c.subject}</span>
                <span className="text-[12px] text-muted-foreground tabular-nums">
                  {c.sentCount}/{c.recipientCount} sent
                  {c.failedCount > 0 ? `, ${c.failedCount} failed` : ""}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {new Date(c.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
