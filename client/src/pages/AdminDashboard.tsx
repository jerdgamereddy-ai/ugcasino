import { ProtectedLayout } from "@/components/layout/ProtectedLayout";
import { useUser } from "@/hooks/use-auth";
import { useCreateVoucher, useVouchers } from "@/hooks/use-vouchers";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Shield, Plus, Users, Ticket, Copy, Banknote, CheckCircle, Loader2, Ban, Trash2, ArrowUpCircle, KeyRound, UserCog, Lock, BarChart3, Settings2, ChevronUp, ChevronDown, Megaphone, Calculator, Phone, CircleDot, Crown, Briefcase } from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { updateGameSettingsSchema, type GameSetting } from "@shared/schema";
import { z } from "zod";
import { Link } from "wouter";
import { api } from "@shared/routes";
import { queryClient } from "@/lib/queryClient";
import { User, ADMIN_SECURITY_QUESTIONS } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { BroadcastBanner } from "@/components/BroadcastBanner";
import { BroadcastSender } from "@/components/BroadcastSender";
import { ProfitCalculator } from "@/components/ProfitCalculator";
import { ChatPanel } from "@/components/ChatPanel";
import { MessageCircle } from "lucide-react";

type GameFormData = z.infer<typeof updateGameSettingsSchema>;

function GameSettingCard({ setting }: { setting: GameSetting }) {
  const { toast } = useToast();
  const [pct, setPct] = useState(Math.round(setting.winChance * 100));

  const mutation = useMutation({
    mutationFn: async (val: number) => {
      const res = await fetch(api.games.settings.update.path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameType: setting.gameType, winChance: val }),
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.games.settings.get.path] });
      toast({ title: "Updated", description: `${setting.gameType} win chance saved.` });
    },
  });

  const increment = () => setPct(p => Math.min(100, p + 1));
  const decrement = () => setPct(p => Math.max(0, p - 1));

  return (
    <Card className="glass-card">
      <CardHeader className="pb-2">
        <CardTitle className="capitalize text-base">{setting.gameType}</CardTitle>
      </CardHeader>
      <CardContent>
        <label className="text-xs text-muted-foreground">Win Probability</label>
        <div className="flex items-center gap-2 mt-2">
          <Button size="icon" variant="outline" onClick={decrement} disabled={pct <= 0 || mutation.isPending} data-testid={`button-decrease-${setting.gameType}`}>
            <ChevronDown className="h-4 w-4" />
          </Button>
          <div className="flex-1 text-center py-2 rounded-md border border-white/10 bg-white/5 font-mono text-lg font-bold" data-testid={`display-winchance-${setting.gameType}`}>
            {pct}%
          </div>
          <Button size="icon" variant="outline" onClick={increment} disabled={pct >= 100 || mutation.isPending} data-testid={`button-increase-${setting.gameType}`}>
            <ChevronUp className="h-4 w-4" />
          </Button>
        </div>
        <Button className="w-full mt-3" size="sm" onClick={() => mutation.mutate(pct)} disabled={mutation.isPending} data-testid={`button-save-${setting.gameType}`}>
          {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
        </Button>
      </CardContent>
    </Card>
  );
}

export default function AdminDashboard() {
  const { data: user } = useUser();
  const { data: users, isLoading: usersLoading } = useQuery<User[]>({
    queryKey: [api.admin.users.path],
    enabled: user?.role === 'admin',
  });
  const { data: vouchers, isLoading: vouchersLoading } = useVouchers();
  const { mutate: createVoucher, isPending: creatingVoucher } = useCreateVoucher();
  const { toast } = useToast();
  const { data: withdrawRequests, isLoading: requestsLoading } = useQuery<any[]>({
    queryKey: ["/api/withdraw/requests"],
    enabled: user?.role === 'admin',
  });
  const { data: gameSettings, isLoading: gameSettingsLoading } = useQuery<GameSetting[]>({
    queryKey: [api.games.settings.get.path],
    enabled: user?.role === 'admin',
  });
  const { data: userStats } = useQuery<{
    superManagers: { total: number; online: number };
    managers: { total: number; online: number };
    users: { total: number; online: number };
  }>({
    queryKey: ["/api/admin/user-stats"],
    enabled: user?.role === 'admin',
    refetchInterval: 30000,
  });

  const [amount, setAmount] = useState("");
  const [userPasswords, setUserPasswords] = useState<Record<number, string>>({});
  const [smPasswords, setSmPasswords] = useState<Record<number, string>>({});
  const [withdrawCodes, setWithdrawCodes] = useState<Record<number, string>>({});
  const [newUsername, setNewUsername] = useState("");

  const [securityAnswers, setSecurityAnswers] = useState<Record<string, string>>({
    [ADMIN_SECURITY_QUESTIONS[0]]: "",
    [ADMIN_SECURITY_QUESTIONS[1]]: "",
    [ADMIN_SECURITY_QUESTIONS[2]]: "",
    [ADMIN_SECURITY_QUESTIONS[3]]: "",
  });

  const { data: existingQuestions } = useQuery<any[]>({
    queryKey: ["/api/admin/security-questions"],
    enabled: user?.role === 'admin',
  });

  if (user?.role !== "admin") {
    return (
      <div className="text-center py-20">
        <Shield className="w-16 h-16 text-destructive mx-auto mb-4" />
        <h1 className="text-2xl font-bold" data-testid="text-access-denied">Access Denied</h1>
        <p className="text-muted-foreground">Admin only access.</p>
      </div>
    );
  }

  const handleCreateVoucher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) return;
    createVoucher({ amount: parseInt(amount) }, {
      onSuccess: () => {
        toast({ title: "Voucher Created", className: "bg-green-600 text-white" });
        setAmount("");
      },
      onError: (err) => {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      }
    });
  };

  const handlePromoteToSuperManager = async (userId: number) => {
    try {
      const res = await fetch("/api/admin/promote-to-super-manager", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message);
      }
      toast({ title: "User promoted to Super Manager", className: "bg-green-600 text-white" });
      queryClient.invalidateQueries({ queryKey: [api.admin.users.path] });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleSuspend = async (userId: number) => {
    try {
      const res = await fetch("/api/admin/suspend-user", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) throw new Error("Suspension failed");
      toast({ title: "User and subordinates suspended", className: "bg-green-600 text-white" });
      queryClient.invalidateQueries({ queryKey: [api.admin.users.path] });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleUnsuspend = async (userId: number) => {
    try {
      const res = await fetch("/api/admin/unsuspend-user", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) throw new Error("Unsuspension failed");
      toast({ title: "User and subordinates unsuspended", className: "bg-green-600 text-white" });
      queryClient.invalidateQueries({ queryKey: [api.admin.users.path] });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleDelete = async (userId: number) => {
    try {
      const res = await fetch("/api/admin/delete-user", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) throw new Error("Deletion failed");
      toast({ title: "User deleted and subordinates suspended", className: "bg-green-600 text-white" });
      queryClient.invalidateQueries({ queryKey: [api.admin.users.path] });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleResetSmPassword = async (userId: number) => {
    const password = smPasswords[userId];
    if (!password || password.length < 6) {
      toast({ title: "Error", description: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    try {
      const res = await fetch("/api/admin/reset-super-manager-password", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, newPassword: password }),
      });
      if (!res.ok) throw new Error("Password reset failed");
      toast({ title: "Password reset", className: "bg-green-600 text-white" });
      setSmPasswords({ ...smPasswords, [userId]: "" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleSaveSecurityQuestions = async () => {
    const answers = ADMIN_SECURITY_QUESTIONS.map(q => ({ question: q, answer: securityAnswers[q] || "" }));
    const emptyCount = answers.filter(a => !a.answer.trim()).length;
    if (emptyCount > 0) {
      toast({ title: "Error", description: "All 4 security questions must be answered", variant: "destructive" });
      return;
    }
    try {
      const res = await fetch("/api/admin/security-questions", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers }),
      });
      if (!res.ok) throw new Error("Failed to save");
      toast({ title: "Security questions saved", className: "bg-green-600 text-white" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/security-questions"] });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleUpdateUsername = async () => {
    if (!newUsername || newUsername.length < 2) {
      toast({ title: "Error", description: "Username must be at least 2 characters", variant: "destructive" });
      return;
    }
    try {
      const res = await fetch("/api/admin/update-username", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newUsername }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message);
      }
      toast({ title: "Username updated", className: "bg-green-600 text-white" });
      queryClient.invalidateQueries({ queryKey: [api.auth.me.path] });
      setNewUsername("");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleSetWithdrawCode = async (managerId: number) => {
    const code = withdrawCodes[managerId];
    if (!code || !/^\d{6}$/.test(code)) {
      toast({ title: "Error", description: "Code must be exactly 6 digits", variant: "destructive" });
      return;
    }
    try {
      const res = await fetch("/api/withdraw-code/set", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ managerId, code }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message);
      }
      toast({ title: "Withdraw code updated", className: "bg-green-600 text-white" });
      setWithdrawCodes({ ...withdrawCodes, [managerId]: "" });
      queryClient.invalidateQueries({ queryKey: [api.admin.users.path] });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleProcessWithdraw = async (id: number, status: "approved" | "rejected") => {
    try {
      const res = await fetch(`/api/withdraw/requests/${id}/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Processing failed");
      toast({ title: `Withdrawal ${status}`, className: status === 'approved' ? "bg-green-600 text-white" : "" });
      queryClient.invalidateQueries({ queryKey: ["/api/withdraw/requests"] });
      queryClient.invalidateQueries({ queryKey: [api.admin.users.path] });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: "Copied!", description: code });
  };

  const superManagers = users?.filter(u => u.role === 'super_manager') || [];
  const managers = users?.filter(u => u.role === 'manager') || [];
  const players = users?.filter(u => u.role === 'user') || [];
  const allNonAdmin = users?.filter(u => u.role !== 'admin') || [];

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'super_manager': return <Badge variant="outline" className="text-[10px] border-yellow-500/30 text-yellow-500">Super Manager</Badge>;
      case 'manager': return <Badge variant="outline" className="text-[10px] border-blue-500/30 text-blue-500">Manager</Badge>;
      case 'user': return <Badge variant="outline" className="text-[10px] border-green-500/30 text-green-500">Player</Badge>;
      default: return <Badge variant="outline" className="text-[10px]">{role}</Badge>;
    }
  };

  return (
    <ProtectedLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="bg-primary/20 p-3 rounded-xl">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-display font-bold text-primary" data-testid="text-admin-title">Admin Dashboard</h1>
            <p className="text-muted-foreground">Full control over the platform.</p>
          </div>
        </div>

        <BroadcastBanner />

        {userStats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="glass-card">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="bg-yellow-500/20 p-2.5 rounded-lg">
                      <Crown className="w-5 h-5 text-yellow-500" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Super Managers</p>
                      <p className="text-2xl font-bold" data-testid="text-total-super-managers">{userStats.superManagers.total}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10">
                    <CircleDot className="w-3 h-3 text-green-500" />
                    <span className="text-xs font-semibold text-green-500" data-testid="text-online-super-managers">{userStats.superManagers.online} online</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-500/20 p-2.5 rounded-lg">
                      <Briefcase className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Managers</p>
                      <p className="text-2xl font-bold" data-testid="text-total-managers">{userStats.managers.total}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10">
                    <CircleDot className="w-3 h-3 text-green-500" />
                    <span className="text-xs font-semibold text-green-500" data-testid="text-online-managers">{userStats.managers.online} online</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="bg-green-500/20 p-2.5 rounded-lg">
                      <Users className="w-5 h-5 text-green-500" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Players</p>
                      <p className="text-2xl font-bold" data-testid="text-total-players">{userStats.users.total}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10">
                    <CircleDot className="w-3 h-3 text-green-500" />
                    <span className="text-xs font-semibold text-green-500" data-testid="text-online-players">{userStats.users.online} online</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs defaultValue="users" className="w-full">
          <TabsList className="bg-white/5 border border-white/10 w-full justify-start flex-wrap gap-1">
            <TabsTrigger value="users" data-testid="tab-users">User Management</TabsTrigger>
            <TabsTrigger value="vouchers" data-testid="tab-vouchers">Vouchers</TabsTrigger>
            <TabsTrigger value="requests" data-testid="tab-requests">Withdrawals</TabsTrigger>
            <TabsTrigger value="gamecontrol" data-testid="tab-gamecontrol"><Settings2 className="w-3 h-3 mr-1" /> Game Control</TabsTrigger>
            <TabsTrigger value="reports" data-testid="tab-reports">Reports</TabsTrigger>
            <TabsTrigger value="profit" data-testid="tab-profit"><Calculator className="w-3 h-3 mr-1" /> Profit Calculator</TabsTrigger>
            <TabsTrigger value="broadcast" data-testid="tab-broadcast"><Megaphone className="w-3 h-3 mr-1" /> Broadcast</TabsTrigger>
            <TabsTrigger value="chat" data-testid="tab-chat"><MessageCircle className="w-3 h-3 mr-1" /> Chat</TabsTrigger>
            <TabsTrigger value="security" data-testid="tab-security">Security</TabsTrigger>
            <TabsTrigger value="settings" data-testid="tab-settings">Account</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="mt-6 space-y-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><UserCog className="w-5 h-5" /> Super Managers ({superManagers.length})</CardTitle>
                <CardDescription>Manage super managers, suspend/delete, reset passwords.</CardDescription>
              </CardHeader>
              <CardContent>
                {usersLoading ? (
                  <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
                ) : superManagers.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">No super managers. Promote a user below.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/10">
                        <TableHead>ID</TableHead>
                        <TableHead>Username</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Balance</TableHead>
                        <TableHead>Reset Password</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {superManagers.map((sm) => (
                        <TableRow key={sm.id} className="border-white/10" data-testid={`row-sm-${sm.id}`}>
                          <TableCell>#{sm.id}</TableCell>
                          <TableCell className="font-medium">{sm.username}</TableCell>
                          <TableCell>
                            {sm.phoneNumber ? (
                              <a href={`tel:${sm.phoneNumber}`} className="flex items-center gap-1 text-primary hover:underline text-xs" data-testid={`link-phone-sm-${sm.id}`}>
                                <Phone className="w-3 h-3" /> {sm.phoneNumber}
                              </a>
                            ) : (
                              <span className="text-muted-foreground text-xs">N/A</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {sm.isSuspended ? (
                              <span className="flex items-center gap-1 text-red-500 text-xs"><Ban className="w-3 h-3" /> Suspended</span>
                            ) : (
                              <span className="flex items-center gap-1 text-green-500 text-xs"><CheckCircle className="w-3 h-3" /> Active</span>
                            )}
                          </TableCell>
                          <TableCell className="text-primary font-bold">UGX {sm.balance.toLocaleString()}</TableCell>
                          <TableCell>
                            <div className="flex gap-1 items-center">
                              <Input
                                type="password"
                                placeholder="New password"
                                value={smPasswords[sm.id] || ""}
                                onChange={(e) => setSmPasswords({ ...smPasswords, [sm.id]: e.target.value })}
                                className="w-28 bg-white/5 border-white/10"
                                data-testid={`input-sm-pw-${sm.id}`}
                              />
                              <Button size="sm" onClick={() => handleResetSmPassword(sm.id)} data-testid={`button-reset-sm-pw-${sm.id}`}>
                                <KeyRound className="w-3 h-3" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {sm.isSuspended ? (
                                <Button size="sm" variant="outline" onClick={() => handleUnsuspend(sm.id)} data-testid={`button-unsuspend-${sm.id}`}>
                                  <CheckCircle className="w-3 h-3 mr-1" /> Activate
                                </Button>
                              ) : (
                                <Button size="sm" variant="outline" onClick={() => handleSuspend(sm.id)} data-testid={`button-suspend-${sm.id}`}>
                                  <Ban className="w-3 h-3 mr-1" /> Suspend
                                </Button>
                              )}
                              <Button size="sm" variant="destructive" onClick={() => handleDelete(sm.id)} data-testid={`button-delete-${sm.id}`}>
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Users className="w-5 h-5" /> All Users ({allNonAdmin.length})</CardTitle>
                <CardDescription>Promote any user to Super Manager.</CardDescription>
              </CardHeader>
              <CardContent>
                {usersLoading ? (
                  <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/10">
                        <TableHead>ID</TableHead>
                        <TableHead>Username</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Balance</TableHead>
                        <TableHead>Withdraw Code</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allNonAdmin.map((u) => (
                        <TableRow key={u.id} className="border-white/10" data-testid={`row-user-${u.id}`}>
                          <TableCell>#{u.id}</TableCell>
                          <TableCell className="font-medium">{u.username}</TableCell>
                          <TableCell>
                            {u.phoneNumber ? (
                              <a href={`tel:${u.phoneNumber}`} className="flex items-center gap-1 text-primary hover:underline text-xs" data-testid={`link-phone-user-${u.id}`}>
                                <Phone className="w-3 h-3" /> {u.phoneNumber}
                              </a>
                            ) : (
                              <span className="text-muted-foreground text-xs">N/A</span>
                            )}
                          </TableCell>
                          <TableCell>{getRoleBadge(u.role)}</TableCell>
                          <TableCell>
                            {u.isSuspended ? (
                              <span className="flex items-center gap-1 text-red-500 text-xs"><Ban className="w-3 h-3" /> Suspended</span>
                            ) : !u.isApproved ? (
                              <span className="text-yellow-500 text-xs">Pending</span>
                            ) : (
                              <span className="flex items-center gap-1 text-green-500 text-xs"><CheckCircle className="w-3 h-3" /> Active</span>
                            )}
                          </TableCell>
                          <TableCell className="text-primary font-bold">UGX {u.balance.toLocaleString()}</TableCell>
                          <TableCell>
                            {u.role === 'manager' ? (
                              <div className="flex gap-2 items-center">
                                {u.withdrawCode ? (
                                  <span className="font-mono text-xs bg-white/5 px-2 py-1 rounded" data-testid={`text-admin-wcode-${u.id}`}>{u.withdrawCode}</span>
                                ) : null}
                                <Input
                                  type="text"
                                  placeholder={u.withdrawCode ? "Change" : "Set code"}
                                  value={withdrawCodes[u.id] || ""}
                                  onChange={(e) => {
                                    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                                    setWithdrawCodes({ ...withdrawCodes, [u.id]: val });
                                  }}
                                  maxLength={6}
                                  className="w-20 bg-white/5 border-white/10 font-mono text-center tracking-widest text-xs"
                                  data-testid={`input-admin-wcode-${u.id}`}
                                />
                                <Button size="sm" onClick={() => handleSetWithdrawCode(u.id)} data-testid={`button-admin-set-code-${u.id}`}>
                                  <KeyRound className="w-3 h-3" />
                                </Button>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-xs">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1 flex-wrap">
                              {u.role !== 'super_manager' && (
                                <Button size="sm" variant="outline" onClick={() => handlePromoteToSuperManager(u.id)} data-testid={`button-promote-${u.id}`}>
                                  <ArrowUpCircle className="w-3 h-3 mr-1" /> Promote
                                </Button>
                              )}
                              {!u.isSuspended ? (
                                <Button size="sm" variant="outline" onClick={() => handleSuspend(u.id)} data-testid={`button-suspend-user-${u.id}`}>
                                  <Ban className="w-3 h-3" />
                                </Button>
                              ) : (
                                <Button size="sm" variant="outline" onClick={() => handleUnsuspend(u.id)} data-testid={`button-unsuspend-user-${u.id}`}>
                                  <CheckCircle className="w-3 h-3" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="vouchers" className="mt-6 space-y-6">
            <div className="grid md:grid-cols-3 gap-6">
              <Card className="md:col-span-1 glass-card">
                <CardHeader>
                  <CardTitle>Create Voucher</CardTitle>
                  <CardDescription>Generate credit codes for users.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCreateVoucher} className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs uppercase text-muted-foreground">Amount (UGX)</label>
                      <Input type="number" placeholder="e.g. 5000" value={amount} onChange={(e) => setAmount(e.target.value)} className="bg-black/30 border-white/10" data-testid="input-voucher-amount" />
                    </div>
                    <Button type="submit" className="w-full" disabled={creatingVoucher} data-testid="button-create-voucher">
                      {creatingVoucher ? "Generating..." : <><Plus className="w-4 h-4 mr-2" /> Generate Code</>}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <Card className="md:col-span-2 glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Ticket className="w-5 h-5" /> Recent Vouchers</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/10">
                        <TableHead>Code</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {vouchersLoading ? (
                        <TableRow><TableCell colSpan={4} className="text-center">Loading...</TableCell></TableRow>
                      ) : vouchers?.length === 0 ? (
                        <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No vouchers yet</TableCell></TableRow>
                      ) : (
                        vouchers?.map((v) => (
                          <TableRow key={v.id} className="border-white/10">
                            <TableCell className="font-mono">{v.code}</TableCell>
                            <TableCell className="text-primary font-bold">UGX {v.amount.toLocaleString()}</TableCell>
                            <TableCell>
                              <span className={`px-2 py-1 rounded text-xs ${v.isRedeemed ? "bg-green-500/20 text-green-500" : "bg-yellow-500/20 text-yellow-500"}`}>
                                {v.isRedeemed ? "Redeemed" : "Active"}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Button size="icon" variant="ghost" onClick={() => copyToClipboard(v.code)} data-testid={`button-copy-${v.id}`}>
                                <Copy className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="requests" className="mt-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Banknote className="w-5 h-5" /> Pending Withdrawals</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10">
                      <TableHead>Player ID</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Manager Code</TableHead>
                      <TableHead>Manager</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requestsLoading ? (
                      <TableRow><TableCell colSpan={6} className="text-center">Loading...</TableCell></TableRow>
                    ) : !withdrawRequests || withdrawRequests.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No pending requests</TableCell></TableRow>
                    ) : (
                      withdrawRequests.map((req: any) => {
                        const mgr = users?.find(u => u.id === req.managerId);
                        return (
                          <TableRow key={req.id} className="border-white/10" data-testid={`row-withdraw-${req.id}`}>
                            <TableCell>#{req.userId}</TableCell>
                            <TableCell className="font-bold text-primary">UGX {req.amount.toLocaleString()}</TableCell>
                            <TableCell><span className="font-mono text-xs bg-white/5 px-2 py-1 rounded">{req.managerCode || 'N/A'}</span></TableCell>
                            <TableCell>{mgr?.username || `#${req.managerId || 'N/A'}`}</TableCell>
                            <TableCell>{new Date(req.createdAt).toLocaleString()}</TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button size="sm" onClick={() => handleProcessWithdraw(req.id, "approved")} data-testid={`button-approve-${req.id}`}>Approve</Button>
                                <Button size="sm" variant="destructive" onClick={() => handleProcessWithdraw(req.id, "rejected")} data-testid={`button-reject-${req.id}`}>Reject</Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="gamecontrol" className="mt-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Settings2 className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-bold">Game Win Probabilities</h2>
              </div>
              <p className="text-sm text-muted-foreground mb-4">Set the win probability percentage for each game. Higher values mean players win more often.</p>
              {gameSettingsLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {gameSettings?.map((s) => (
                    <GameSettingCard key={s.id} setting={s} />
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="reports" className="mt-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><BarChart3 className="w-5 h-5" /> Business Reports</CardTitle>
                <CardDescription>View detailed financial reports with time-based filtering, manager filtering, and key business metrics.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild>
                  <Link href="/reports" data-testid="link-open-reports">
                    <BarChart3 className="w-4 h-4 mr-2" /> Open Full Reports
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="profit" className="mt-6">
            <ProfitCalculator viewerRole="admin" />
          </TabsContent>

          <TabsContent value="broadcast" className="mt-6">
            <BroadcastSender senderRole="admin" />
          </TabsContent>

          <TabsContent value="security" className="mt-6">
            <Card className="glass-card max-w-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Lock className="w-5 h-5" /> Security Questions</CardTitle>
                <CardDescription>
                  Set up your 4 security questions. At least 2 correct answers are required for password recovery.
                  {existingQuestions && existingQuestions.length > 0 && (
                    <span className="block mt-1 text-green-500 text-xs">Security questions are already set up. You can update them below.</span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {ADMIN_SECURITY_QUESTIONS.map((q) => (
                  <div key={q} className="space-y-1">
                    <label className="text-xs text-muted-foreground">{q}</label>
                    <Input
                      placeholder="Your answer"
                      value={securityAnswers[q] || ""}
                      onChange={(e) => setSecurityAnswers({ ...securityAnswers, [q]: e.target.value })}
                      className="bg-white/5 border-white/10"
                      data-testid={`input-security-${q.substring(0, 10).replace(/\s/g, '-')}`}
                    />
                  </div>
                ))}
                <Button className="w-full" onClick={handleSaveSecurityQuestions} data-testid="button-save-security">
                  Save Security Questions
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="chat" className="mt-6">
            {user && users && (
              <ChatPanel
                currentUserId={user.id}
                chatTargets={users.filter(u => u.role !== 'admin')}
                title="Admin Chat"
              />
            )}
          </TabsContent>

          <TabsContent value="settings" className="mt-6">
            <Card className="glass-card max-w-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><UserCog className="w-5 h-5" /> Account Settings</CardTitle>
                <CardDescription>Change your login username. "Admin" will always remain available as a login name.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs uppercase text-muted-foreground font-bold">Current Username</label>
                  <p className="text-sm font-medium" data-testid="text-current-username">{user?.username}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-xs uppercase text-muted-foreground font-bold">New Username</label>
                  <Input
                    placeholder="Enter new username"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    className="bg-white/5 border-white/10"
                    data-testid="input-new-username"
                  />
                </div>
                <Button onClick={handleUpdateUsername} className="w-full" data-testid="button-update-username">
                  Update Username
                </Button>
                <p className="text-[10px] text-muted-foreground">Note: You can always switch back to "Admin" as your username.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </ProtectedLayout>
  );
}
