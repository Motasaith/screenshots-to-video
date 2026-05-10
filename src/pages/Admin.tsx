import { useEffect } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";
import Navbar from "@/components/Navbar";
import { ShieldAlert, Users, Film, Activity, Clock, Play, PowerOff, XCircle, RefreshCw, Edit2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";

export default function Admin() {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && (!user || user.role !== "admin")) {
      navigate("/dashboard");
    }
  }, [user, authLoading, navigate]);

  const { data: stats } = trpc.admin.getStats.useQuery(undefined, {
    enabled: !!user && user.role === "admin",
  });

  const { data: users } = trpc.admin.listUsers.useQuery(undefined, {
    enabled: !!user && user.role === "admin",
  });

  const { data: jobs, refetch: refetchJobs } = trpc.admin.listJobs.useQuery(undefined, {
    enabled: !!user && user.role === "admin",
  });

  const utils = trpc.useUtils();
  
  const impersonateMutation = trpc.admin.impersonateUser.useMutation({
    onSuccess: () => {
      // Reload page to get new session data
      window.location.href = "/dashboard";
    }
  });

  const updatePlanMutation = trpc.admin.updateUserPlan.useMutation({
    onSuccess: () => utils.admin.listUsers.invalidate()
  });

  const [editingUser, setEditingUser] = useState<{ id: number, plan: "free" | "pro" | "team", credits: number } | null>(null);

  const cancelJobMutation = trpc.admin.cancelJob.useMutation({
    onSuccess: () => refetchJobs()
  });

  const retryJobMutation = trpc.admin.retryJob.useMutation({
    onSuccess: () => refetchJobs()
  });

  const toggleMaintenanceMutation = trpc.admin.toggleMaintenance.useMutation({
    onSuccess: () => utils.admin.getStats.invalidate()
  });

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

      <main className="w-full max-w-6xl mx-auto px-6 lg:px-12 pt-28 pb-20">
        <div className="flex items-center gap-3 mb-8 justify-between">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-8 h-8 text-primary" />
            <div>
              <h1 className="font-syne font-bold text-3xl tracking-tight">Admin Console</h1>
              <p className="font-dm text-sm text-muted-foreground">Manage users, view system health, and oversee renders.</p>
            </div>
          </div>
          <Button 
            variant="outline" 
            className={`border-2 font-syne ${stats?.maintenanceMode ? 'border-destructive text-destructive bg-destructive/10' : 'border-border'}`}
            onClick={() => toggleMaintenanceMutation.mutate({ enabled: !stats?.maintenanceMode })}
          >
            <PowerOff className="w-4 h-4 mr-2" />
            {stats?.maintenanceMode ? "Disable Maintenance Mode" : "Enable Maintenance Mode"}
          </Button>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <div className="neo-card p-6 flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="font-dm text-sm text-muted-foreground">Total Users</p>
              <h2 className="font-syne font-bold text-3xl">{stats?.totalUsers || 0}</h2>
            </div>
          </div>
          <div className="neo-card p-6 flex items-center gap-4">
            <div className="p-3 bg-accent/10 rounded-full">
              <Film className="w-6 h-6 text-accent" />
            </div>
            <div>
              <p className="font-dm text-sm text-muted-foreground">Total Projects</p>
              <h2 className="font-syne font-bold text-3xl">{stats?.totalProjects || 0}</h2>
            </div>
          </div>
          <div className="neo-card p-6 flex items-center gap-4">
            <div className="p-3 bg-destructive/10 rounded-full">
              <Activity className="w-6 h-6 text-destructive" />
            </div>
            <div>
              <p className="font-dm text-sm text-muted-foreground">Total Renders</p>
              <h2 className="font-syne font-bold text-3xl">{stats?.totalJobs || 0}</h2>
            </div>
          </div>
        </div>

        <Tabs defaultValue="users" className="w-full">
          <TabsList className="neo-card mb-8 p-1 inline-flex h-12 items-center justify-center">
            <TabsTrigger value="users" className="font-dm text-sm h-10 px-8 data-[state=active]:bg-primary/10 data-[state=active]:text-foreground data-[state=active]:border-2 data-[state=active]:border-border font-medium tracking-wide">
              Users
            </TabsTrigger>
            <TabsTrigger value="jobs" className="font-dm text-sm h-10 px-8 data-[state=active]:bg-primary/10 data-[state=active]:text-foreground data-[state=active]:border-2 data-[state=active]:border-border font-medium tracking-wide">
              Render Jobs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <div className="neo-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left font-dm text-sm">
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
                    {users?.map((u) => (
                      <tr key={u.id} className="hover:bg-muted/50">
                        <td className="p-4 text-muted-foreground">{u.id}</td>
                        <td className="p-4 font-medium flex items-center gap-2">
                            {u.avatar && <img src={u.avatar} alt="" className="w-6 h-6 rounded-full bg-muted object-cover" />}
                            {u.name || "Unknown"}
                        </td>
                        <td className="p-4">{u.email || u.unionId}</td>
                        <td className="p-4">
                          <span className={`inline-flex px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider ${u.role === "admin" ? "bg-primary text-white" : "bg-muted text-foreground"}`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="p-4 capitalize">{u.plan}</td>
                        <td className="p-4">{u.credits}</td>
                        <td className="p-4 text-muted-foreground">{new Date(u.createdAt).toLocaleDateString()}</td>
                        <td className="p-4 text-right flex justify-end gap-1">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => setEditingUser({ id: u.id, plan: u.plan as "free"|"pro"|"team", credits: u.credits ?? 0 })}
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
                                    onValueChange={(val) => setEditingUser(prev => prev ? {...prev, plan: val as "free"|"pro"|"team"} : null)}
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
                                    onChange={(e) => setEditingUser(prev => prev ? {...prev, credits: parseInt(e.target.value)} : null)}
                                  />
                                </div>
                              </div>
                              <DialogFooter>
                                <Button onClick={() => {
                                  if (editingUser) updatePlanMutation.mutate({ userId: editingUser.id, plan: editingUser.plan, credits: editingUser.credits });
                                }}>
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
                    {!users?.length && (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-muted-foreground">No users found.</td>
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
                <table className="w-full text-left font-dm text-sm">
                  <thead className="bg-muted font-syne border-b-2 border-border">
                    <tr>
                      <th className="p-4 font-bold">ID</th>
                      <th className="p-4 font-bold">Project ID</th>
                      <th className="p-4 font-bold">Status</th>
                      <th className="p-4 font-bold">Stage</th>
                      <th className="p-4 font-bold">Created</th>
                      <th className="p-4 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y-2 divide-border">
                    {jobs?.map((j) => (
                      <tr key={j.id} className="hover:bg-muted/50">
                        <td className="p-4 text-muted-foreground">{j.id}</td>
                        <td className="p-4 font-mono text-xs">{j.projectId}</td>
                        <td className="p-4">
                          <span className={`inline-flex px-2 py-0.5 border-2 text-[10px] uppercase font-bold tracking-wider ${
                            j.status === "complete" ? "border-accent text-accent bg-accent/10" : 
                            j.status === "error" ? "border-destructive text-destructive bg-destructive/10" : 
                            "border-primary text-primary bg-primary/10"
                          }`}>
                            {j.status}
                          </span>
                        </td>
                        <td className="p-4 text-muted-foreground truncate max-w-[200px]" title={j.message || j.stage || ""}>
                            {j.message || j.stage || "N/A"}
                        </td>
                        <td className="p-4 text-muted-foreground">{new Date(j.createdAt).toLocaleString()}</td>
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
                          ) : j.status === "error" || j.status === "complete" ? (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => retryJobMutation.mutate({ jobId: j.id })}
                              title="Re-queue Job"
                            >
                              <RefreshCw className="w-4 h-4 text-muted-foreground" />
                            </Button>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                    {!jobs?.length && (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-muted-foreground">No jobs found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
