import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";
import Navbar from "@/components/Navbar";
import { SupportTab } from "./admin/SupportTab";
import { SettingsTab } from "./admin/SettingsTab";
import { EmailTab } from "./admin/EmailTab";
import {
  ShieldAlert,
  Users,
  Film,
  Activity,
  Clock,
  Play,
  PowerOff,
  XCircle,
  RefreshCw,
  Edit2,
  Search,
  Trash2,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Coins,
  UserPlus,
  Video,
  MessageSquare,
  SlidersHorizontal,
  Send,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

type StatusFilter = "all" | "draft" | "processing" | "complete" | "error";

export default function Admin() {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && (!user || user.role !== "admin")) {
      navigate("/dashboard");
    }
  }, [user, authLoading, navigate]);

  const isAdmin = !!user && user.role === "admin";

  // ── Queries ──
  const { data: stats, refetch: refetchStats } = trpc.admin.getDetailedStats.useQuery(undefined, {
    enabled: isAdmin,
    refetchInterval: 15_000,
  });

  const { data: timeseries } = trpc.admin.getTimeseries.useQuery(undefined, {
    enabled: isAdmin,
  });

  const { data: users, refetch: refetchUsers } = trpc.admin.listUsers.useQuery(undefined, {
    enabled: isAdmin,
  });

  const { data: jobs, refetch: refetchJobs } = trpc.admin.listJobs.useQuery(undefined, {
    enabled: isAdmin,
    refetchInterval: 10_000,
  });

  const [projectStatus, setProjectStatus] = useState<StatusFilter>("all");
  const { data: projects, refetch: refetchProjects } = trpc.admin.listProjects.useQuery(
    { status: projectStatus === "all" ? undefined : projectStatus },
    { enabled: isAdmin },
  );

  // Only the count is wanted here; the Support tab runs its own full query.
  const { data: ticketSummary } = trpc.admin.listTickets.useQuery(
    { status: "open", limit: 1 },
    { refetchInterval: 60_000 }
  );

  const { data: expiredProjects } = trpc.admin.getExpiredProjects.useQuery(undefined, {
    enabled: isAdmin,
  });

  // ── Mutations ──
  const utils = trpc.useUtils();

  const impersonateMutation = trpc.admin.impersonateUser.useMutation({
    onSuccess: () => {
      window.location.href = "/dashboard";
    },
  });

  const updatePlanMutation = trpc.admin.updateUserPlan.useMutation({
    onSuccess: () => {
      utils.admin.listUsers.invalidate();
      toast.success("User subscription updated");
    },
  });

  const [editingUser, setEditingUser] = useState<{
    id: number;
    plan: "free" | "pro" | "team";
    credits: number;
  } | null>(null);

  const cancelJobMutation = trpc.admin.cancelJob.useMutation({
    onSuccess: () => {
      refetchJobs();
      toast.success("Job cancelled");
    },
  });

  const retryJobMutation = trpc.admin.retryJob.useMutation({
    onSuccess: () => {
      refetchJobs();
      toast.success("Job re-queued");
    },
  });

  const deleteProjectMutation = trpc.admin.deleteProject.useMutation({
    onSuccess: () => {
      refetchProjects();
      toast.success("Project deleted");
    },
  });

  const toggleMaintenanceMutation = trpc.admin.toggleMaintenance.useMutation({
    onSuccess: () => {
      utils.admin.getDetailedStats.invalidate();
      toast.success("Maintenance mode toggled");
    },
  });

  const runCleanupMutation = trpc.admin.runCleanup.useMutation({
    onSuccess: (data) => {
      utils.admin.getExpiredProjects.invalidate();
      toast.success(`Cleanup complete: ${data.cleaned} projects removed`);
    },
  });

  // ── User search ──
  const [searchQuery, setSearchQuery] = useState("");
  const { data: searchResults, isFetching: searching } = trpc.admin.searchUsers.useQuery(
    { query: searchQuery },
    { enabled: isAdmin && searchQuery.length >= 2 },
  );

  const displayedUsers = useMemo(() => {
    if (searchQuery.length >= 2 && searchResults) return searchResults;
    return users ?? [];
  }, [users, searchResults, searchQuery]);

  // ── Sparkline data ──
  const maxUsers = useMemo(
    () => Math.max(1, ...(timeseries ?? []).map((d) => d.users)),
    [timeseries],
  );
  const maxJobs = useMemo(
    () => Math.max(1, ...(timeseries ?? []).map((d) => d.jobs)),
    [timeseries],
  );

  if (authLoading || !user || user.role !== "admin") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <Clock className="w-6 h-6 animate-spin text-muted-foreground mb-4" />
        <p className="font-dm text-sm text-muted-foreground">Checking credentials...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-12 pt-28 pb-20">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-8 justify-between">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-8 h-8 text-primary" />
            <div>
              <h1 className="font-syne font-bold text-3xl tracking-tight">Admin Console</h1>
              <p className="font-dm text-sm text-muted-foreground">
                Manage users, monitor renders, and oversee system health.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                refetchStats();
                refetchUsers();
                refetchJobs();
                refetchProjects();
              }}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              className={`font-syne ${
                stats?.maintenanceMode
                  ? "border-destructive text-destructive bg-destructive/10"
                  : "border-border"
              }`}
              onClick={() =>
                toggleMaintenanceMutation.mutate({ enabled: !stats?.maintenanceMode })
              }
            >
              <PowerOff className="w-4 h-4 mr-2" />
              {stats?.maintenanceMode ? "Disable Maintenance" : "Enable Maintenance"}
            </Button>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon={<Users className="w-5 h-5" />}
            label="Total Users"
            value={stats?.users.total ?? 0}
            sub={`+${stats?.users.new24h ?? 0} today`}
            trend={stats?.users.new24h ?? 0}
            tint="primary"
          />
          <StatCard
            icon={<Film className="w-5 h-5" />}
            label="Projects"
            value={stats?.projects.total ?? 0}
            sub={`${stats?.jobs.processing ?? 0} processing`}
            tint="accent"
          />
          <StatCard
            icon={<Activity className="w-5 h-5" />}
            label="Render Jobs"
            value={stats?.jobs.total ?? 0}
            sub={`${stats?.jobs.processing ?? 0} processing`}
            tint="destructive"
          />
          <StatCard
            icon={<Coins className="w-5 h-5" />}
            label="Credits Issued"
            value={stats?.credits.totalIssued ?? 0}
            sub={`${stats?.users.active24h ?? 0} active 24h`}
            tint="primary"
          />
        </div>

        {/* Sparklines */}
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          <Card className="neo-card p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-primary" />
                <h3 className="font-syne font-bold text-sm tracking-wide">
                  Signups (14 days)
                </h3>
              </div>
              <Badge variant="secondary" className="font-dm">
                {timeseries?.reduce((a, b) => a + b.users, 0) ?? 0} total
              </Badge>
            </div>
            <Sparkline
              data={(timeseries ?? []).map((d) => d.users)}
              max={maxUsers}
              color="hsl(var(--primary))"
            />
          </Card>

          <Card className="neo-card p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Video className="w-4 h-4 text-accent" />
                <h3 className="font-syne font-bold text-sm tracking-wide">
                  Render Jobs (14 days)
                </h3>
              </div>
              <Badge variant="secondary" className="font-dm">
                {timeseries?.reduce((a, b) => a + b.jobs, 0) ?? 0} total
              </Badge>
            </div>
            <Sparkline
              data={(timeseries ?? []).map((d) => d.jobs)}
              max={maxJobs}
              color="hsl(var(--accent))"
            />
          </Card>
        </div>

        {/* Job health row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <MiniStat
            icon={<Loader2 className="w-4 h-4" />}
            label="Queued"
            value={stats?.jobs.queued ?? 0}
            color="text-primary"
          />
          <MiniStat
            icon={<Activity className="w-4 h-4" />}
            label="Processing"
            value={stats?.jobs.processing ?? 0}
            color="text-accent"
          />
          <MiniStat
            icon={<CheckCircle2 className="w-4 h-4" />}
            label="Complete"
            value={stats?.jobs.complete ?? 0}
            color="text-green-600"
          />
          <MiniStat
            icon={<AlertTriangle className="w-4 h-4" />}
            label={`Error (${stats?.jobs.errorRate ?? 0}%)`}
            value={stats?.jobs.error ?? 0}
            color="text-destructive"
          />
        </div>

        {/* Plan distribution */}
        <Card className="neo-card p-5 mb-8">
          <h3 className="font-syne font-bold text-sm tracking-wide mb-4">
            Plan Distribution
          </h3>
          <div className="space-y-3">
            <PlanBar
              label="Free"
              value={stats?.users.byPlan.free ?? 0}
              total={stats?.users.total ?? 1}
              color="bg-muted-foreground"
            />
            <PlanBar
              label="Pro"
              value={stats?.users.byPlan.pro ?? 0}
              total={stats?.users.total ?? 1}
              color="bg-primary"
            />
            <PlanBar
              label="Team"
              value={stats?.users.byPlan.team ?? 0}
              total={stats?.users.total ?? 1}
              color="bg-accent"
            />
          </div>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="users" className="w-full">
          <TabsList className="neo-card mb-8 p-1 inline-flex h-auto sm:h-12 items-center justify-center flex-wrap admin-tabs-mobile">
            <TabsTrigger
              value="users"
              className="font-dm text-sm h-10 px-6 data-[state=active]:bg-primary/10 data-[state=active]:border-2 data-[state=active]:border-border font-medium"
            >
              Users
            </TabsTrigger>
            <TabsTrigger
              value="jobs"
              className="font-dm text-sm h-10 px-6 data-[state=active]:bg-primary/10 data-[state=active]:border-2 data-[state=active]:border-border font-medium"
            >
              Render Jobs
            </TabsTrigger>
            <TabsTrigger
              value="projects"
              className="font-dm text-sm h-10 px-6 data-[state=active]:bg-primary/10 data-[state=active]:border-2 data-[state=active]:border-border font-medium"
            >
              Studio Jobs
            </TabsTrigger>
            <TabsTrigger
              value="projects"
              className="font-dm text-sm h-10 px-6 data-[state=active]:bg-primary/10 data-[state=active]:border-2 data-[state=active]:border-border font-medium"
            >
              Projects
            </TabsTrigger>
            <TabsTrigger
              value="cleanup"
              className="font-dm text-sm h-10 px-6 data-[state=active]:bg-primary/10 data-[state=active]:border-2 data-[state=active]:border-border font-medium"
            >
              Cleanup
            </TabsTrigger>
            <TabsTrigger
              value="email"
              className="font-dm text-sm h-10 px-6 data-[state=active]:bg-primary/10 data-[state=active]:border-2 data-[state=active]:border-border font-medium"
            >
              <Send className="mr-1.5 h-3.5 w-3.5" />
              Email
            </TabsTrigger>
            <TabsTrigger
              value="settings"
              className="font-dm text-sm h-10 px-6 data-[state=active]:bg-primary/10 data-[state=active]:border-2 data-[state=active]:border-border font-medium"
            >
              <SlidersHorizontal className="mr-1.5 h-3.5 w-3.5" />
              Settings
            </TabsTrigger>
            <TabsTrigger
              value="support"
              className="font-dm text-sm h-10 px-6 data-[state=active]:bg-primary/10 data-[state=active]:border-2 data-[state=active]:border-border font-medium"
            >
              <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
              Support
              {ticketSummary?.openCount ? (
                <span className="ml-1.5 rounded-full bg-amber-500 px-1.5 text-[10px] font-bold text-white">
                  {ticketSummary.openCount}
                </span>
              ) : null}
            </TabsTrigger>
            <TabsTrigger
              value="logs"
              className="font-dm text-sm h-10 px-6 data-[state=active]:bg-primary/10 data-[state=active]:border-2 data-[state=active]:border-border font-medium"
            >
              Logs
            </TabsTrigger>
            <TabsTrigger
              value="system"
              className="font-dm text-sm h-10 px-6 data-[state=active]:bg-primary/10 data-[state=active]:border-2 data-[state=active]:border-border font-medium"
            >
              System
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <div className="neo-card overflow-hidden">
              <div className="p-4 border-b-2 border-border bg-muted/30">
                <div className="relative max-w-sm">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, email, or ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                  {searching && (
                    <Loader2 className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground" />
                  )}
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left font-dm text-sm admin-table-mobile">
                  <thead className="bg-muted font-syne border-b-2 border-border">
                    <tr>
                      <th className="p-4 font-bold">ID</th>
                      <th className="p-4 font-bold">Name</th>
                      <th className="p-4 font-bold">Email</th>
                      <th className="p-4 font-bold">Role</th>
                      <th className="p-4 font-bold">Plan</th>
                      <th className="p-4 font-bold">Credits</th>
                      <th className="p-4 font-bold">Joined</th>
                      <th className="p-4 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y-2 divide-border">
                    {displayedUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-muted/50">
                        <td className="p-4 text-muted-foreground">{u.id}</td>
                        <td className="p-4 font-medium flex items-center gap-2">
                          {u.avatar && (
                            <img
                              src={u.avatar}
                              alt=""
                              className="w-6 h-6 rounded-full bg-muted object-cover"
                            />
                          )}
                          {u.name || "Unknown"}
                        </td>
                        <td className="p-4">{u.email || u.unionId}</td>
                        <td className="p-4">
                          <span
                            className={`inline-flex px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider ${
                              u.role === "admin"
                                ? "bg-primary text-white"
                                : "bg-muted text-foreground"
                            }`}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td className="p-4 capitalize">{u.plan}</td>
                        <td className="p-4">{u.credits}</td>
                        <td className="p-4 text-muted-foreground">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </td>
                        <td className="p-4 text-right flex justify-end gap-1">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  setEditingUser({
                                    id: u.id,
                                    plan: u.plan as "free" | "pro" | "team",
                                    credits: u.credits ?? 0,
                                  })
                                }
                                title="Edit Subscription"
                              >
                                <Edit2 className="w-4 h-4 text-primary" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Edit User Subscription</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4 pt-4">
                                <div className="space-y-2">
                                  <Label>Current Plan</Label>
                                  <Select
                                    value={editingUser?.plan || "free"}
                                    onValueChange={(val) =>
                                      setEditingUser((prev) =>
                                        prev
                                          ? {
                                              ...prev,
                                              plan: val as "free" | "pro" | "team",
                                            }
                                          : null,
                                      )
                                    }
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="free">Free</SelectItem>
                                      <SelectItem value="pro">Pro</SelectItem>
                                      <SelectItem value="team">Team</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-2">
                                  <Label>Credits Remaining</Label>
                                  <Input
                                    type="number"
                                    value={editingUser?.credits ?? 0}
                                    onChange={(e) =>
                                      setEditingUser((prev) =>
                                        prev
                                          ? {
                                              ...prev,
                                              credits: parseInt(e.target.value) || 0,
                                            }
                                          : null,
                                      )
                                    }
                                  />
                                </div>
                              </div>
                              <DialogFooter>
                                <DialogClose asChild>
                                  <Button variant="outline">Cancel</Button>
                                </DialogClose>
                                <Button
                                  onClick={() => {
                                    if (editingUser)
                                      updatePlanMutation.mutate({
                                        userId: editingUser.id,
                                        plan: editingUser.plan,
                                        credits: editingUser.credits,
                                      });
                                  }}
                                >
                                  Save Changes
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => impersonateMutation.mutate({ userId: u.id })}
                            title="Log in as user"
                          >
                            <Play className="w-4 h-4 text-primary" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {!displayedUsers.length && (
                      <tr>
                        <td
                          colSpan={8}
                          className="p-8 text-center text-muted-foreground"
                        >
                          {searchQuery.length >= 2
                            ? "No users match your search."
                            : "No users found."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="jobs">
            <div className="neo-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left font-dm text-sm admin-table-mobile">
                  <thead className="bg-muted font-syne border-b-2 border-border">
                    <tr>
                      <th className="p-4 font-bold">ID</th>
                      <th className="p-4 font-bold">Project ID</th>
                      <th className="p-4 font-bold">Status</th>
                      <th className="p-4 font-bold">Progress</th>
                      <th className="p-4 font-bold">Stage</th>
                      <th className="p-4 font-bold">Created</th>
                      <th className="p-4 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y-2 divide-border">
                    {jobs?.map((j) => {
                      const total = j.totalSteps ?? 0;
                      const current = j.currentStep ?? 0;
                      const pct =
                        total > 0
                          ? Math.round((current / total) * 100)
                          : 0;
                      return (
                        <tr key={j.id} className="hover:bg-muted/50">
                          <td className="p-4 text-muted-foreground">{j.id}</td>
                          <td className="p-4 font-mono text-xs">{j.projectId}</td>
                          <td className="p-4">
                            <StatusBadge status={j.status} />
                          </td>
                          <td className="p-4 min-w-[120px]">
                            {j.status === "processing" || j.status === "queued" ? (
                              <div className="flex items-center gap-2">
                                <Progress value={pct} className="h-2 flex-1" />
                                <span className="text-xs text-muted-foreground w-8">
                                  {pct}%
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">n/a</span>
                            )}
                          </td>
                          <td
                            className="p-4 text-muted-foreground truncate max-w-[200px]"
                            title={j.message || j.stage || ""}
                          >
                            {j.message || j.stage || "N/A"}
                          </td>
                          <td className="p-4 text-muted-foreground">
                            {new Date(j.createdAt).toLocaleString()}
                          </td>
                          <td className="p-4 text-right flex justify-end gap-1">
                            {j.status === "queued" || j.status === "processing" ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => cancelJobMutation.mutate({ jobId: j.id })}
                                title="Cancel Job"
                              >
                                <XCircle className="w-4 h-4 text-destructive" />
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => retryJobMutation.mutate({ jobId: j.id })}
                                title="Re-queue Job"
                              >
                                <RefreshCw className="w-4 h-4 text-muted-foreground" />
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {!jobs?.length && (
                      <tr>
                        <td
                          colSpan={7}
                          className="p-8 text-center text-muted-foreground"
                        >
                          No jobs found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          {/* ── Projects Tab ── */}
          <TabsContent value="projects">
            <div className="neo-card overflow-hidden">
              <div className="p-4 border-b-2 border-border bg-muted/30 flex items-center gap-3">
                <Label className="font-syne text-sm">Filter:</Label>
                <Select
                  value={projectStatus}
                  onValueChange={(v) => setProjectStatus(v as StatusFilter)}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="complete">Complete</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left font-dm text-sm admin-table-mobile">
                  <thead className="bg-muted font-syne border-b-2 border-border">
                    <tr>
                      <th className="p-4 font-bold">ID</th>
                      <th className="p-4 font-bold">Title</th>
                      <th className="p-4 font-bold">Owner</th>
                      <th className="p-4 font-bold">Platform</th>
                      <th className="p-4 font-bold">Status</th>
                      <th className="p-4 font-bold">Resolution</th>
                      <th className="p-4 font-bold">Created</th>
                      <th className="p-4 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y-2 divide-border">
                    {projects?.map(({ project, userName, userEmail }) => (
                      <tr key={project.id} className="hover:bg-muted/50">
                        <td className="p-4 text-muted-foreground">{project.id}</td>
                        <td className="p-4 font-medium truncate max-w-[200px]">
                          {project.title}
                        </td>
                        <td className="p-4 text-muted-foreground truncate max-w-[160px]">
                          {userName || userEmail || `User #${project.userId}`}
                        </td>
                        <td className="p-4 capitalize">{project.platform}</td>
                        <td className="p-4">
                          <StatusBadge status={project.status} />
                        </td>
                        <td className="p-4">{project.resolution}</td>
                        <td className="p-4 text-muted-foreground">
                          {new Date(project.createdAt).toLocaleDateString()}
                        </td>
                        <td className="p-4 text-right">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                title="Delete Project"
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Delete Project</DialogTitle>
                              </DialogHeader>
                              <p className="font-dm text-sm text-muted-foreground pt-2">
                                Are you sure you want to delete project "
                                {project.title}" (ID: {project.id})? This action cannot
                                be undone.
                              </p>
                              <DialogFooter>
                                <DialogClose asChild>
                                  <Button variant="outline">Cancel</Button>
                                </DialogClose>
                                <DialogClose asChild>
                                  <Button
                                    variant="destructive"
                                    onClick={() =>
                                      deleteProjectMutation.mutate({
                                        projectId: project.id,
                                      })
                                    }
                                  >
                                    Delete
                                  </Button>
                                </DialogClose>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </td>
                      </tr>
                    ))}
                    {!projects?.length && (
                      <tr>
                        <td
                          colSpan={8}
                          className="p-8 text-center text-muted-foreground"
                        >
                          No projects found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          {/* ── Cleanup Tab ── */}
          <TabsContent value="cleanup">
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="neo-card p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Trash2 className="w-5 h-5 text-primary" />
                  <h3 className="font-syne font-bold text-lg">Run Cleanup</h3>
                </div>
                <p className="font-dm text-sm text-muted-foreground mb-4">
                  Remove expired projects and their associated assets from storage.
                  This frees up R2 space and keeps the database tidy.
                </p>
                <Button
                  onClick={() => runCleanupMutation.mutate()}
                  disabled={runCleanupMutation.isPending}
                >
                  {runCleanupMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4 mr-2" />
                  )}
                  Run Cleanup Now
                </Button>
              </Card>

              <Card className="neo-card p-6">
                <h3 className="font-syne font-bold text-lg mb-4">Expiry Status</h3>
                <div className="space-y-3 font-dm text-sm">
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded">
                    <span className="text-muted-foreground">Expired Projects</span>
                    <Badge variant="destructive">
                      {expiredProjects?.expired?.length ?? 0}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded">
                    <span className="text-muted-foreground">
                      Pending Expiry (soon)
                    </span>
                    <Badge variant="secondary">
                      {expiredProjects?.pending?.length ?? 0}
                    </Badge>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* ── Logs Tab ── */}
          <TabsContent value="email">
            <EmailTab />
          </TabsContent>

          <TabsContent value="settings">
            <SettingsTab />
          </TabsContent>

          <TabsContent value="support">
            <SupportTab />
          </TabsContent>

          <TabsContent value="logs">
            <LogsTab />
          </TabsContent>

          {/* ── System Tab ── */}
          <TabsContent value="system">
            <SystemTab />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

// ── Sub-components ──

function LogsTab() {
  const [logDate, setLogDate] = useState<string>("today");
  const [logLevel, setLogLevel] = useState<string>("all");
  const [logSearch, setLogSearch] = useState<string>("");
  const [logUserId, setLogUserId] = useState<string>("");
  const [logSource, setLogSource] = useState<string>("all");

  const { data: logDates } = trpc.admin.getLogDates.useQuery(undefined);
  const { data: logStats } = trpc.admin.getLogStats.useQuery(undefined);

  const { data: logData, isFetching: logsLoading } = trpc.admin.getLogs.useQuery(
    {
      date: logDate === "today" ? undefined : logDate,
      level: logLevel === "all" ? undefined : (logLevel as "debug" | "info" | "warn" | "error"),
      userId: logUserId ? parseInt(logUserId) : undefined,
      search: logSearch || undefined,
      pathPrefix: logSource === "all" ? undefined : logSource,
      limit: 200,
    },
    { refetchInterval: 10_000 },
  );

  const levelColors: Record<string, string> = {
    error: "text-destructive bg-destructive/10",
    warn: "text-amber-600 bg-amber-500/10",
    info: "text-blue-600 bg-blue-500/10",
    debug: "text-muted-foreground bg-muted",
  };

  return (
    <div className="space-y-4">
      {/* Log stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        <Card className="neo-card p-3">
          <p className="font-dm text-xs text-muted-foreground">Log Files</p>
          <p className="font-syne font-bold text-lg">{logStats?.totalFiles ?? 0}</p>
        </Card>
        <Card className="neo-card p-3">
          <p className="font-dm text-xs text-muted-foreground">Size</p>
          <p className="font-syne font-bold text-lg">
            {((logStats?.totalSizeBytes ?? 0) / 1024 / 1024).toFixed(1)} MB
          </p>
        </Card>
        <Card className="neo-card p-3">
          <p className="font-dm text-xs text-muted-foreground">Errors Today</p>
          <p className="font-syne font-bold text-lg text-destructive">
            {logStats?.todayCounts.error ?? 0}
          </p>
        </Card>
        <Card className="neo-card p-3">
          <p className="font-dm text-xs text-muted-foreground">Warnings Today</p>
          <p className="font-syne font-bold text-lg text-amber-600">
            {logStats?.todayCounts.warn ?? 0}
          </p>
        </Card>
        <Card className="neo-card p-3">
          <p className="font-dm text-xs text-muted-foreground">Info Today</p>
          <p className="font-syne font-bold text-lg text-blue-600">
            {logStats?.todayCounts.info ?? 0}
          </p>
        </Card>
      </div>

      {/* Filters */}
      <div className="neo-card p-3 sm:p-4 flex flex-wrap items-center gap-2 sm:gap-3">
        <Label className="font-syne text-sm">Date:</Label>
        <Select value={logDate} onValueChange={setLogDate}>
          <SelectTrigger className="w-28 sm:w-40">
            <SelectValue placeholder="Today" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            {(logDates ?? [])
              .filter((d) => d !== new Date().toISOString().slice(0, 10))
              .map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>

        <Label className="font-syne text-sm">Level:</Label>
        <Select value={logLevel} onValueChange={setLogLevel}>
          <SelectTrigger className="w-24 sm:w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="error">Error</SelectItem>
            <SelectItem value="warn">Warn</SelectItem>
            <SelectItem value="info">Info</SelectItem>
            <SelectItem value="debug">Debug</SelectItem>
          </SelectContent>
        </Select>

        {/* Source filter.
            Every subsystem already tags its entries with a `path`, so these are
            prefix matches rather than a new field: "support" catches both
            supportRouter and the support.* tRPC paths. */}
        <Label className="font-syne text-sm">Source:</Label>
        <Select value={logSource} onValueChange={setLogSource}>
          <SelectTrigger className="w-32 sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sources</SelectItem>
            <SelectItem value="support">Support widget</SelectItem>
            <SelectItem value="whisper">Voice transcription</SelectItem>
            <SelectItem value="ai">AI / editor guide</SelectItem>
            <SelectItem value="render">Render</SelectItem>
            <SelectItem value="worker">Render worker</SelectItem>
            <SelectItem value="project">Projects</SelectItem>
            <SelectItem value="step">Scenes</SelectItem>
            <SelectItem value="auth">Auth</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
          </SelectContent>
        </Select>

        <Label className="font-syne text-sm">User ID:</Label>
        <Input
          type="number"
          placeholder="Filter by user..."
          value={logUserId}
          onChange={(e) => setLogUserId(e.target.value)}
          className="w-24 sm:w-36"
        />

        <div className="relative flex-1 min-w-[140px] sm:min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search logs..."
            value={logSearch}
            onChange={(e) => setLogSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {logsLoading && (
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        )}

        <Badge variant="secondary" className="font-dm">
          {logData?.total ?? 0} entries
        </Badge>
      </div>

      {/* Log entries */}
      <div className="neo-card overflow-hidden">
        <div className="max-h-[600px] overflow-y-auto">
          {logData?.entries?.length ? (
            <div className="divide-y divide-border">
              {logData.entries.map((entry, i) => (
                <div
                  key={i}
                  className="p-3 hover:bg-muted/50 font-mono text-xs"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-muted-foreground">
                      {new Date(entry.ts).toLocaleTimeString()}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold ${
                        levelColors[entry.level] || ""
                      }`}
                    >
                      {entry.level}
                    </span>
                    {entry.userId !== undefined && (
                      <span className="text-muted-foreground">
                        user:{entry.userId}
                      </span>
                    )}
                    {entry.ip && entry.ip !== "unknown" && (
                      <span className="text-muted-foreground">
                        ip:{entry.ip}
                      </span>
                    )}
                    {entry.path && (
                      <span className="text-muted-foreground">
                        {entry.path}
                      </span>
                    )}
                  </div>
                  <p className="text-foreground break-all">{entry.msg}</p>
                  {entry.error && (
                    <p className="text-destructive mt-1 break-all">
                      {entry.error}
                    </p>
                  )}
                  {entry.stack && (
                    <details className="mt-1">
                      <summary className="text-muted-foreground cursor-pointer hover:text-foreground">
                        Stack trace
                      </summary>
                      <pre className="mt-1 text-muted-foreground whitespace-pre-wrap break-all">
                        {entry.stack}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground font-dm text-sm">
              No log entries found for the selected filters.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SystemTab() {
  const { data: storageStats } = trpc.admin.getStorageStats.useQuery(undefined);
  const { data: queueStats } = trpc.admin.getQueueStats.useQuery(undefined, {
    refetchInterval: 10_000,
  });

  return (
    <div className="space-y-6">
      {/* Render Queue Status */}
      <Card className="neo-card p-6">
        <h3 className="font-syne font-bold text-lg mb-4">Render Queue</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="font-dm text-xs text-muted-foreground">Queued</p>
            <p className="font-syne font-bold text-xl text-primary">
              {queueStats?.queued ?? 0}
            </p>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="font-dm text-xs text-muted-foreground">Processing</p>
            <p className="font-syne font-bold text-xl text-accent">
              {queueStats?.processing ?? 0}
            </p>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="font-dm text-xs text-muted-foreground">Errors</p>
            <p className="font-syne font-bold text-xl text-destructive">
              {queueStats?.errors ?? 0}
            </p>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="font-dm text-xs text-muted-foreground">Max Queue</p>
            <p className="font-syne font-bold text-xl">
              {queueStats?.maxQueueDepth ?? 0}
            </p>
          </div>
        </div>
        <div className="space-y-2 font-dm text-sm">
          <div className="flex items-center justify-between p-2 bg-muted/30 rounded">
            <span className="text-muted-foreground">Max concurrent renders per user</span>
            <Badge variant="secondary">{queueStats?.maxConcurrentPerUser ?? 1}</Badge>
          </div>
          <div className="flex items-center justify-between p-2 bg-muted/30 rounded">
            <span className="text-muted-foreground">Render timeout</span>
            <Badge variant="secondary">
              {queueStats ? `${queueStats.renderTimeoutMs / 1000 / 60} min` : "n/a"}
            </Badge>
          </div>
          <div className="flex items-center justify-between p-2 bg-muted/30 rounded">
            <span className="text-muted-foreground">Credit cost (720p / 1080p / 4K)</span>
            <div className="flex gap-1">
              <Badge variant="secondary">{queueStats?.creditCost?.["720p"] ?? 1}</Badge>
              <Badge variant="secondary">{queueStats?.creditCost?.["1080p"] ?? 2}</Badge>
              <Badge variant="secondary">{queueStats?.creditCost?.["4k"] ?? 4}</Badge>
            </div>
          </div>
        </div>
      </Card>

      {/* Storage Usage */}
      <Card className="neo-card p-6">
        <h3 className="font-syne font-bold text-lg mb-4">Storage Usage</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="font-dm text-xs text-muted-foreground">Projects with Files</p>
            <p className="font-syne font-bold text-xl">
              {storageStats?.totalProjectsWithFiles ?? 0}
            </p>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="font-dm text-xs text-muted-foreground">Steps with Files</p>
            <p className="font-syne font-bold text-xl">
              {storageStats?.totalStepsWithFiles ?? 0}
            </p>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="font-dm text-xs text-muted-foreground">Est. Total Files</p>
            <p className="font-syne font-bold text-xl">
              {storageStats?.estimatedFiles ?? 0}
            </p>
          </div>
        </div>
        <div className="space-y-2 font-dm text-sm">
          <div className="flex items-center justify-between p-2 bg-muted/30 rounded">
            <span className="text-muted-foreground">Expired (overdue for deletion)</span>
            <Badge variant="destructive">
              {storageStats?.expiredOverdue ?? 0}
            </Badge>
          </div>
          <div className="flex items-center justify-between p-2 bg-muted/30 rounded">
            <span className="text-muted-foreground">Pending expiry (soon)</span>
            <Badge variant="secondary">
              {storageStats?.expiredPending ?? 0}
            </Badge>
          </div>
          <div className="flex items-center justify-between p-2 bg-muted/30 rounded">
            <span className="text-muted-foreground">Storage alert threshold</span>
            <Badge variant="secondary">
              {storageStats?.alertThresholdGB ?? 50} GB
            </Badge>
          </div>
          <div className="flex items-center justify-between p-2 bg-muted/30 rounded">
            <span className="text-muted-foreground">Storage hard limit</span>
            <Badge variant="secondary">
              {storageStats?.hardLimitGB ?? 100} GB
            </Badge>
          </div>
        </div>
      </Card>

      {/* Retention Policy */}
      <Card className="neo-card p-6">
        <h3 className="font-syne font-bold text-lg mb-4">Retention Policy</h3>
        <p className="font-dm text-sm text-muted-foreground mb-4">
          Completed videos are automatically deleted from storage after the
          retention period for each plan. Project metadata stays in the database.
        </p>
        <div className="space-y-2 font-dm text-sm">
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <span className="font-medium">Free Plan</span>
            <Badge variant="secondary">
              {storageStats?.retentionDays?.free ?? 7} days
            </Badge>
          </div>
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <span className="font-medium">Pro Plan</span>
            <Badge variant="secondary">
              {storageStats?.retentionDays?.pro ?? 90} days
            </Badge>
          </div>
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <span className="font-medium">Team Plan</span>
            <Badge variant="secondary">
              {storageStats?.retentionDays?.team ?? 365} days
            </Badge>
          </div>
        </div>
      </Card>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
  trend,
  tint,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  sub: string;
  trend?: number;
  tint: "primary" | "accent" | "destructive";
}) {
  const tintMap = {
    primary: "bg-primary/10 text-primary",
    accent: "bg-accent/10 text-accent",
    destructive: "bg-destructive/10 text-destructive",
  };
  return (
    <Card className="neo-card p-5">
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2.5 rounded-full ${tintMap[tint]}`}>{icon}</div>
        {trend !== undefined && trend > 0 && (
          <span className="flex items-center gap-0.5 text-xs font-dm text-green-600">
            <TrendingUp className="w-3 h-3" />
            {trend}
          </span>
        )}
      </div>
      <p className="font-dm text-xs text-muted-foreground uppercase tracking-wide mb-1">
        {label}
      </p>
      <h2 className="font-syne font-bold text-2xl">{value.toLocaleString()}</h2>
      <p className="font-dm text-xs text-muted-foreground mt-1">{sub}</p>
    </Card>
  );
}

function MiniStat({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <Card className="neo-card p-4 flex items-center gap-3">
      <span className={color}>{icon}</span>
      <div>
        <p className="font-dm text-xs text-muted-foreground">{label}</p>
        <p className="font-syne font-bold text-lg">{value}</p>
      </div>
    </Card>
  );
}

function PlanBar({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-1 font-dm text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">
          {value} ({pct}%)
        </span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function Sparkline({
  data,
  max,
  color,
}: {
  data: number[];
  max: number;
  color: string;
}) {
  if (!data.length) {
    return (
      <div className="h-16 flex items-center justify-center text-xs text-muted-foreground font-dm">
        No data
      </div>
    );
  }
  const w = 100;
  const h = 40;
  const step = data.length > 1 ? w / (data.length - 1) : w;
  const points = data
    .map((v, i) => {
      const x = i * step;
      const y = h - (v / max) * h;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="w-full h-16"
      preserveAspectRatio="none"
    >
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
      <polyline
        points={`0,${h} ${points} ${w},${h}`}
        fill={color}
        opacity="0.1"
        stroke="none"
      />
    </svg>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    complete: "border-accent text-accent bg-accent/10",
    error: "border-destructive text-destructive bg-destructive/10",
    queued: "border-primary text-primary bg-primary/10",
    processing: "border-primary text-primary bg-primary/10",
    draft: "border-muted-foreground text-muted-foreground bg-muted",
    scripted: "border-blue-500 text-blue-500 bg-blue-500/10",
    media_ready: "border-purple-500 text-purple-500 bg-purple-500/10",
  };
  return (
    <span
      className={`inline-flex px-2 py-0.5 border-2 text-[10px] uppercase font-bold tracking-wider ${
        map[status] || "border-border text-foreground bg-muted"
      }`}
    >
      {status}
    </span>
  );
}
