import { useState } from "react";
import { Loader2, Mail, MessageSquare, UserRound } from "lucide-react";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../api/router";

/**
 * The support queue.
 *
 * A list on the left, one ticket open on the right. The detail pane shows the
 * chat that preceded the request, because the first thing anyone answering needs
 * to know is what the assistant already tried.
 *
 * Replies land on the ticket, which the customer's widget polls, so answering
 * here appears in their chat within about fifteen seconds. No email is sent
 * unless a provider is configured; see api/lib/notify.ts.
 */

const STATUS_STYLES: Record<string, string> = {
  open: "bg-amber-100 text-amber-800",
  in_progress: "bg-blue-100 text-blue-800",
  waiting: "bg-slate-100 text-slate-700",
  resolved: "bg-emerald-100 text-emerald-800",
};

const STATUS_LABELS: Record<string, string> = {
  open: "Open",
  in_progress: "In progress",
  waiting: "Waiting on customer",
  resolved: "Resolved",
};

type Ticket = inferRouterOutputs<AppRouter>["admin"]["getTicket"];

/** One line in the queue. */
function TicketRow({
  ticket,
  active,
  onSelect,
}: {
  ticket: Ticket;
  active: boolean;
  onSelect: () => void;
}) {
  const lastReply = (ticket.replies ?? []).at(-1);
  return (
    <button
      onClick={onSelect}
      className={`block w-full border-b border-border/60 p-3 text-left transition-colors hover:bg-muted/40 ${
        active ? "bg-teal-500/10" : ""
      }`}
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${STATUS_STYLES[ticket.status]}`}>
          {STATUS_LABELS[ticket.status]}
        </span>
        <span className="text-[10px] text-muted-foreground">
          {new Date(ticket.createdAt).toLocaleDateString()}
        </span>
      </div>
      <p className="truncate text-sm font-semibold">{ticket.subject}</p>
      <p className="truncate text-xs text-muted-foreground">
        {ticket.name ? `${ticket.name} · ` : ""}
        {ticket.email}
      </p>
      {lastReply ? (
        <p className="mt-1 truncate text-[11px] text-muted-foreground">
          {lastReply.from === "admin" ? "You: " : "They replied: "}
          {lastReply.content}
        </p>
      ) : null}
    </button>
  );
}

export function SupportTab() {
  const [statusFilter, setStatusFilter] = useState<
    "open" | "in_progress" | "waiting" | "resolved" | "all"
  >("open");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [reply, setReply] = useState("");
  const [note, setNote] = useState("");

  const utils = trpc.useUtils();
  const { data, isFetching } = trpc.admin.listTickets.useQuery(
    { status: statusFilter, limit: 50 },
    { refetchInterval: 20_000 },
  );

  const sendReply = trpc.admin.replyToTicket.useMutation();
  const setStatus = trpc.admin.setTicketStatus.useMutation();
  const saveNote = trpc.admin.setTicketNote.useMutation();

  // The open ticket is fetched by id, not read out of the list: replying moves
  // it to "waiting" and it would vanish from the default "open" filter mid-read.
  const { data: selected } = trpc.admin.getTicket.useQuery(
    { ticketId: selectedId ?? 0 },
    { enabled: selectedId !== null },
  );

  const tickets = data?.tickets ?? [];

  const refresh = async () => {
    await utils.admin.listTickets.invalidate();
    if (selectedId !== null) await utils.admin.getTicket.invalidate({ ticketId: selectedId });
  };

  const submitReply = async (resolve: boolean) => {
    if (!selected || reply.trim().length === 0) return;
    try {
      await sendReply.mutateAsync({ ticketId: selected.id, message: reply.trim(), resolve });
      setReply("");
      await refresh();
      toast.success(resolve ? "Replied and resolved." : "Reply sent to the customer's chat.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send that reply.");
    }
  };

  return (
    <div className="neo-card overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 border-b-2 border-border bg-muted/30 p-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-teal-600" />
          <span className="font-syne font-bold">Support requests</span>
          {data?.openCount ? (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">
              {data.openCount} open
            </span>
          ) : null}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Label className="font-dm text-sm">Status:</Label>
          <Select
            value={statusFilter}
            onValueChange={(v) => {
              setStatusFilter(v as typeof statusFilter);
              setSelectedId(null);
            }}
          >
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_progress">In progress</SelectItem>
              <SelectItem value="waiting">Waiting on customer</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
          {isFetching ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : null}
        </div>
      </div>

      <div className="grid lg:grid-cols-[320px_1fr]">
        {/* ── queue ── */}
        <div className="max-h-[640px] overflow-y-auto border-b-2 border-border lg:border-b-0 lg:border-r-2">
          {/* Replying moves a ticket out of the "open" filter. Pinning it here
              keeps the list honest about what is on screen, instead of showing
              an empty queue beside a ticket the admin is reading. */}
          {selected && !tickets.some((t) => t.id === selected.id) ? (
            <>
              <p className="border-b border-border/60 bg-muted/40 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                Reading, outside this filter
              </p>
              <TicketRow ticket={selected} active onSelect={() => {}} />
            </>
          ) : null}

          {tickets.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              Nothing here. Requests raised from the support widget appear in this list.
            </p>
          ) : (
            tickets.map((ticket) => (
              <TicketRow
                key={ticket.id}
                ticket={ticket}
                active={selectedId === ticket.id}
                onSelect={() => {
                  setSelectedId(ticket.id);
                  setReply("");
                  setNote(ticket.internalNote ?? "");
                }}
              />
            ))
          )}
        </div>

        {/* ── detail ── */}
        <div className="max-h-[640px] overflow-y-auto p-4">
          {!selected ? (
            <p className="py-16 text-center text-sm text-muted-foreground">
              Pick a request to read it.
            </p>
          ) : (
            <div className="space-y-4">
              <div>
                <h3 className="font-syne text-lg font-bold">{selected.subject}</h3>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {selected.email}
                  </span>
                  {selected.userId ? (
                    <span>user #{selected.userId}</span>
                  ) : (
                    <span className="text-amber-700">no account</span>
                  )}
                  {selected.pageUrl ? <span>from {selected.pageUrl}</span> : null}
                  <span>{new Date(selected.createdAt).toLocaleString()}</span>
                </p>
                {selected.accountSummary ? (
                  <p className="mt-1.5 rounded bg-muted/50 px-2 py-1 text-[11px] text-muted-foreground">
                    {selected.accountSummary}
                  </p>
                ) : null}
              </div>

              <div className="rounded-lg border border-border p-3">
                <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                  What they wrote
                </p>
                <p className="whitespace-pre-wrap text-sm">{selected.message}</p>
              </div>

              {/* What the assistant already tried, so nobody repeats it. */}
              {selected.transcript?.length ? (
                <details className="rounded-lg border border-border p-3">
                  <summary className="cursor-pointer text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                    Chat before the request ({selected.transcript.length} messages)
                  </summary>
                  <div className="mt-2 space-y-2">
                    {selected.transcript.map((turn, i) => (
                      <div key={i} className="text-xs">
                        <span className={turn.role === "user" ? "font-bold" : "text-muted-foreground"}>
                          {turn.role === "user" ? "Customer" : "Assistant"}:
                        </span>{" "}
                        <span className="whitespace-pre-wrap">{turn.content}</span>
                      </div>
                    ))}
                  </div>
                </details>
              ) : null}

              {selected.replies?.length ? (
                <div className="space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                    Conversation
                  </p>
                  {selected.replies.map((r, i) => (
                    <div
                      key={i}
                      className={`rounded-lg p-2.5 text-sm ${
                        r.from === "admin" ? "ml-6 bg-teal-500/10" : "mr-6 bg-muted/60"
                      }`}
                    >
                      <p className="mb-0.5 flex items-center gap-1 text-[10px] font-bold uppercase text-muted-foreground">
                        <UserRound className="h-3 w-3" />
                        {r.from === "admin" ? "You" : selected.name || "Customer"}
                        <span className="font-normal">· {new Date(r.at).toLocaleString()}</span>
                      </p>
                      <p className="whitespace-pre-wrap">{r.content}</p>
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="rounded-lg border-2 border-border p-3">
                <Label className="font-dm text-sm font-bold">Reply</Label>
                <p className="mb-2 mt-0.5 text-[11px] text-muted-foreground">
                  Appears in their support chat within about fifteen seconds. An email is only sent
                  if a mail provider is configured.
                </p>
                <Textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  rows={4}
                  maxLength={4000}
                  placeholder="Write the reply the customer will see..."
                  className="text-sm"
                />
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Button
                    onClick={() => void submitReply(false)}
                    disabled={reply.trim().length === 0 || sendReply.isPending}
                    className="glass-btn glass-btn-primary text-xs"
                  >
                    {sendReply.isPending ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
                    Send reply
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => void submitReply(true)}
                    disabled={reply.trim().length === 0 || sendReply.isPending}
                    className="glass-btn glass-btn-secondary text-xs"
                  >
                    Send and resolve
                  </Button>

                  <Select
                    value={selected.status}
                    onValueChange={async (v) => {
                      await setStatus.mutateAsync({
                        ticketId: selected.id,
                        status: v as "open" | "in_progress" | "waiting" | "resolved",
                      });
                      await refresh();
                    }}
                  >
                    <SelectTrigger className="ml-auto w-44">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="in_progress">In progress</SelectItem>
                      <SelectItem value="waiting">Waiting on customer</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="font-dm text-sm">Internal note (never shown to the customer)</Label>
                <div className="mt-1 flex gap-2">
                  <Input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="For your own reference..."
                    className="text-sm"
                  />
                  <Button
                    variant="ghost"
                    onClick={async () => {
                      await saveNote.mutateAsync({ ticketId: selected.id, note });
                      await refresh();
                      toast.success("Note saved.");
                    }}
                    className="glass-btn glass-btn-secondary text-xs"
                  >
                    Save
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
