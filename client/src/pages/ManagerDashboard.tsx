import { ProtectedLayout } from "@/components/layout/ProtectedLayout";
import { useUser } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Shield, Plus, Users, Loader2, Ban, CheckCircle, Megaphone, Phone, Banknote, BarChart3, UserPlus, Ticket, TrendingUp, TrendingDown, Wallet, Trophy, ArrowDownCircle, ArrowUpCircle, DollarSign, RefreshCw, Filter, Copy } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { User, Voucher } from "@shared/schema";
import { BroadcastBanner } from "@/components/BroadcastBanner";
import { BroadcastSender } from "@/components/BroadcastSender";
import { ChatPanel } from "@/components/ChatPanel";
import { MessageCircle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';

type PeriodPreset = "15min" | "30min" | "1hour" | "6hours" | "today" | "yesterday" | "7days" | "30days" | "3months" | "6months" | "1year" | "custom";

function getDateRange(preset: PeriodPreset, customFrom?: string, customTo?: string): { from?: string; to?: string } {
  const now = new Date();
  if (preset === "custom") {
    return {
      from: customFrom ? new Date(customFrom).toISOString() : undefined,
      to: customTo ? new Date(customTo + "T23:59:59").toISOString() : undefined,
    };
  }
  let from = new Date(now);
  switch (preset) {
    case "15min": from.setMinutes(now.getMinutes() - 15); break;
    case "30min": from.setMinutes(now.getMinutes() - 30); break;
    case "1hour": from.setHours(now.getHours() - 1); break;
    case "6hours": from.setHours(now.getHours() - 6); break;
    case "today": from.setHours(0, 0, 0, 0); break;
    case "yesterday":
      from.setDate(now.getDate() - 1);
      from.setHours(0, 0, 0, 0);
      const yesterdayEnd = new Date(now);
      yesterdayEnd.setDate(now.getDate() - 1);
      yesterdayEnd.setHours(23, 59, 59, 999);
      return { from: from.toISOString(), to: yesterdayEnd.toISOString() };
    case "7days": from.setDate(now.getDate() - 7); break;
    case "30days": from.setDate(now.getDate() - 30); break;
    case "3months": from.setMonth(now.getMonth() - 3); break;
    case "6months": from.setMonth(now.getMonth() - 6); break;
    case "1year": from.setFullYear(now.getFullYear() - 1); break;
  }
  return { from: from.toISOString(), to: now.toISOString() };
}

interface ReportData {
  totalDeposits: number;
  totalWithdrawals: number;
  totalBets: number;
  totalWins: number;
  totalAccountBalances: number;
  profit: number;
  playersCount: number;
  dailyStats: { date: string; bets: number; wins: number; deposits: number; withdrawals: number }[];
}

export default function ManagerDashboard() {
  const { data: user } = useUser();
  const { toast } = useToast();
  const [newUserUsername, setNewUserUsername] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserPhone, setNewUserPhone] = useState("");

  const [period, setPeriod] = useState<PeriodPreset>("today");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [voucherAmount, setVoucherAmount] = useState("");

  const { data: myUsers, isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    enabled: user?.role === 'manager',
  });

  const { data: creatorUser } = useQuery<User>({
    queryKey: ["/api/user", user?.createdBy],
    queryFn: async () => {
      const res = await fetch(`/api/user/${user?.createdBy}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!user?.createdBy,
  });

  const { data: pendingSignups, isLoading: pendingLoading } = useQuery<User[]>({
    queryKey: ["/api/manager/pending-signups"],
    enabled: user?.role === 'manager',
    refetchInterval: 10000,
  });

  const { data: managerVouchers, isLoading: vouchersLoading } = useQuery<Voucher[]>({
    queryKey: ["/api/manager/vouchers"],
    enabled: user?.role === 'manager',
  });

  const queryParams = useMemo(() => {
    const range = getDateRange(period, customFrom, customTo);
    const params = new URLSearchParams();
    if (range.from) params.set("from", range.from);
    if (range.to) params.set("to", range.to);
    return params.toString();
  }, [period, customFrom, customTo]);

  const { data: reports, isLoading: reportsLoading, refetch: refetchReports } = useQuery<ReportData>({
    queryKey: ["/api/reports", queryParams],
    queryFn: async () => {
      const res = await fetch(`/api/reports?${queryParams}`);
      if (!res.ok) throw new Error("Failed to fetch reports");
      return res.json();
    },
    enabled: user?.role === 'manager',
  });

  const createUserMutation = useMutation({
    mutationFn: async (data: { username: string; password: string; phoneNumber?: string }) => {
      const res = await fetch("/api/manager/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message);
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Player created successfully", className: "bg-green-600 text-white" });
      setNewUserUsername("");
      setNewUserPassword("");
      setNewUserPhone("");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const createVoucherMutation = useMutation({
    mutationFn: async (amount: number) => {
      const res = await fetch("/api/vouchers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message);
      }
      return res.json();
    },
    onSuccess: (data: any) => {
      toast({ title: "Voucher Created", description: `Code: ${data.code}`, className: "bg-green-600 text-white" });
      setVoucherAmount("");
      queryClient.invalidateQueries({ queryKey: ["/api/manager/vouchers"] });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const { data: withdrawRequests, isLoading: requestsLoading } = useQuery<any[]>({
    queryKey: ["/api/withdraw/requests"],
    enabled: user?.role === 'manager',
  });

  const [userPasswords, setUserPasswords] = useState<Record<number, string>>({});

  const handleChangePassword = async (userId: number) => {
    const password = userPasswords[userId];
    if (!password || password.length < 6) {
      toast({ title: "Error", description: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    try {
      const res = await fetch(`/api/admin/users/${userId}/password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) throw new Error("Password update failed");
      toast({ title: "Password updated", className: "bg-green-600 text-white" });
      setUserPasswords({ ...userPasswords, [userId]: "" });
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
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleApproveSignup = async (userId: number) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error("Approval failed");
      toast({ title: "Player approved", className: "bg-green-600 text-white" });
      queryClient.invalidateQueries({ queryKey: ["/api/manager/pending-signups"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleRejectSignup = async (userId: number) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error("Rejection failed");
      toast({ title: "Signup rejected", variant: "destructive" });
      queryClient.invalidateQueries({ queryKey: ["/api/manager/pending-signups"] });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: "Copied!", description: code });
  };

  if (user?.role !== "manager") {
    return (
      <div className="text-center py-20">
        <Shield className="w-16 h-16 text-destructive mx-auto mb-4" />
        <h1 className="text-2xl font-bold" data-testid="text-access-denied">Access Denied</h1>
        <p className="text-muted-foreground">Managers only.</p>
      </div>
    );
  }

  const statCards = reports ? [
    { title: "Profit / Loss", value: reports.profit, icon: reports.profit >= 0 ? TrendingUp : TrendingDown, color: reports.profit >= 0 ? "text-green-500" : "text-red-500" },
    { title: "Amount in Accounts", value: reports.totalAccountBalances, icon: Wallet, color: "text-blue-500" },
    { title: "Total Deposited", value: reports.totalDeposits, icon: ArrowDownCircle, color: "text-green-500" },
    { title: "Total Withdrawn", value: reports.totalWithdrawals, icon: ArrowUpCircle, color: "text-orange-500" },
    { title: "Amount Won", value: reports.totalWins, icon: Trophy, color: "text-yellow-500" },
    { title: "Amount Bet", value: reports.totalBets, icon: DollarSign, color: "text-purple-500" },
  ] : [];

  const pendingCount = pendingSignups?.length || 0;

  return (
    <ProtectedLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="bg-primary/20 p-3 rounded-xl">
            <Users className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-display font-bold text-primary" data-testid="text-mgr-title">Manager Panel</h1>
            <p className="text-muted-foreground">Create and manage your players.</p>
          </div>
        </div>

        <BroadcastBanner />

        <Tabs defaultValue="users" className="w-full">
          <TabsList className="bg-white/5 border border-white/10 w-full justify-start flex-wrap gap-1">
            <TabsTrigger value="users" data-testid="tab-users">My Players ({myUsers?.length || 0})</TabsTrigger>
            <TabsTrigger value="create" data-testid="tab-create-user">Create Player</TabsTrigger>
            <TabsTrigger value="pending" data-testid="tab-pending">
              <UserPlus className="w-3 h-3 mr-1" /> Pending Signups {pendingCount > 0 && <span className="ml-1 bg-red-500 text-white text-[10px] rounded-full px-1.5">{pendingCount}</span>}
            </TabsTrigger>
            <TabsTrigger value="reports" data-testid="tab-reports"><BarChart3 className="w-3 h-3 mr-1" /> Reports</TabsTrigger>
            <TabsTrigger value="vouchers" data-testid="tab-vouchers"><Ticket className="w-3 h-3 mr-1" /> Vouchers</TabsTrigger>
            <TabsTrigger value="withdrawals" data-testid="tab-withdrawals"><Banknote className="w-3 h-3 mr-1" /> Withdrawals ({withdrawRequests?.length || 0})</TabsTrigger>
            <TabsTrigger value="broadcast" data-testid="tab-broadcast"><Megaphone className="w-3 h-3 mr-1" /> Broadcast</TabsTrigger>
            <TabsTrigger value="chat" data-testid="tab-chat"><MessageCircle className="w-3 h-3 mr-1" /> Chat</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="mt-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Users className="w-5 h-5" /> My Players</CardTitle>
              </CardHeader>
              <CardContent>
                {usersLoading ? (
                  <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
                ) : !myUsers || myUsers.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8" data-testid="text-no-users">No players yet. Create one from the "Create Player" tab.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/10">
                        <TableHead>ID</TableHead>
                        <TableHead>Username</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Balance</TableHead>
                        <TableHead>Change Password</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {myUsers.map((u) => (
                        <TableRow key={u.id} className="border-white/10" data-testid={`row-user-${u.id}`}>
                          <TableCell>#{u.id}</TableCell>
                          <TableCell className="font-medium">{u.username}</TableCell>
                          <TableCell>
                            {u.phoneNumber ? (
                              <a href={`tel:${u.phoneNumber}`} className="flex items-center gap-1 text-primary hover:underline text-xs" data-testid={`link-phone-${u.id}`}>
                                <Phone className="w-3 h-3" /> {u.phoneNumber}
                              </a>
                            ) : (
                              <span className="text-muted-foreground text-xs">N/A</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {u.isSuspended ? (
                              <span className="flex items-center gap-1 text-red-500 text-xs"><Ban className="w-3 h-3" /> Suspended</span>
                            ) : (
                              <span className="flex items-center gap-1 text-green-500 text-xs"><CheckCircle className="w-3 h-3" /> Active</span>
                            )}
                          </TableCell>
                          <TableCell className="text-primary font-bold">UGX {u.balance.toLocaleString()}</TableCell>
                          <TableCell>
                            <div className="flex gap-2 items-center">
                              <Input
                                type="password"
                                placeholder="New password"
                                value={userPasswords[u.id] || ""}
                                onChange={(e) => setUserPasswords({ ...userPasswords, [u.id]: e.target.value })}
                                className="w-32 bg-white/5 border-white/10"
                                data-testid={`input-password-${u.id}`}
                              />
                              <Button size="sm" onClick={() => handleChangePassword(u.id)} data-testid={`button-change-pw-${u.id}`}>Set</Button>
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

          <TabsContent value="create" className="mt-6">
            <Card className="glass-card max-w-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Plus className="w-5 h-5" /> Create New Player</CardTitle>
                <CardDescription>Create a player account under your management.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  createUserMutation.mutate({ username: newUserUsername, password: newUserPassword, phoneNumber: newUserPhone || undefined });
                }} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs uppercase text-muted-foreground font-bold">Username</label>
                    <Input
                      placeholder="Player username"
                      value={newUserUsername}
                      onChange={(e) => setNewUserUsername(e.target.value)}
                      className="bg-white/5 border-white/10"
                      data-testid="input-new-user-username"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs uppercase text-muted-foreground font-bold">Password</label>
                    <Input
                      type="password"
                      placeholder="Password (min 6 chars)"
                      value={newUserPassword}
                      onChange={(e) => setNewUserPassword(e.target.value)}
                      className="bg-white/5 border-white/10"
                      data-testid="input-new-user-password"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs uppercase text-muted-foreground font-bold">Phone Number (optional)</label>
                    <Input
                      type="tel"
                      placeholder="e.g. +256 700 000000"
                      value={newUserPhone}
                      onChange={(e) => setNewUserPhone(e.target.value)}
                      className="bg-white/5 border-white/10"
                      data-testid="input-new-user-phone"
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={createUserMutation.isPending} data-testid="button-create-user">
                    {createUserMutation.isPending ? <Loader2 className="animate-spin" /> : "Create Player"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pending" className="mt-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><UserPlus className="w-5 h-5" /> Pending Signups</CardTitle>
                <CardDescription>New players who registered with your code and need your approval.</CardDescription>
              </CardHeader>
              <CardContent>
                {pendingLoading ? (
                  <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
                ) : !pendingSignups || pendingSignups.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8" data-testid="text-no-pending">No pending signups at the moment.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/10">
                        <TableHead>ID</TableHead>
                        <TableHead>Username</TableHead>
                        <TableHead>Signed Up</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingSignups.map((p) => (
                        <TableRow key={p.id} className="border-white/10" data-testid={`row-pending-${p.id}`}>
                          <TableCell>#{p.id}</TableCell>
                          <TableCell className="font-medium">{p.username}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{p.createdAt ? new Date(p.createdAt).toLocaleString() : 'N/A'}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => handleApproveSignup(p.id)} data-testid={`button-approve-signup-${p.id}`}>
                                <CheckCircle className="w-3 h-3 mr-1" /> Approve
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => handleRejectSignup(p.id)} data-testid={`button-reject-signup-${p.id}`}>
                                <Ban className="w-3 h-3 mr-1" /> Decline
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
          </TabsContent>

          <TabsContent value="reports" className="mt-6">
            <div className="space-y-6">
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Filter className="w-4 h-4" /> Report Filters</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-4 items-end">
                    <div className="space-y-1.5">
                      <label className="text-xs uppercase text-muted-foreground font-semibold">Time Period</label>
                      <Select value={period} onValueChange={(v: PeriodPreset) => setPeriod(v)}>
                        <SelectTrigger className="w-[180px]" data-testid="select-report-period">
                          <SelectValue placeholder="Select period" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="15min">Last 15 Minutes</SelectItem>
                          <SelectItem value="30min">Last 30 Minutes</SelectItem>
                          <SelectItem value="1hour">Last 1 Hour</SelectItem>
                          <SelectItem value="6hours">Last 6 Hours</SelectItem>
                          <SelectItem value="today">Today</SelectItem>
                          <SelectItem value="yesterday">Yesterday</SelectItem>
                          <SelectItem value="7days">Last 7 Days</SelectItem>
                          <SelectItem value="30days">Last 30 Days</SelectItem>
                          <SelectItem value="3months">Last 3 Months</SelectItem>
                          <SelectItem value="6months">Last 6 Months</SelectItem>
                          <SelectItem value="1year">Last Year</SelectItem>
                          <SelectItem value="custom">Custom Range</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {period === "custom" && (
                      <>
                        <div className="space-y-1.5">
                          <label className="text-xs uppercase text-muted-foreground font-semibold">From</label>
                          <Input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="w-[160px]" data-testid="input-report-from" />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs uppercase text-muted-foreground font-semibold">To</label>
                          <Input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="w-[160px]" data-testid="input-report-to" />
                        </div>
                      </>
                    )}

                    <Button variant="outline" size="sm" onClick={() => refetchReports()} data-testid="button-refresh-reports">
                      <RefreshCw className="w-4 h-4 mr-1" /> Refresh
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {reportsLoading ? (
                <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin" /></div>
              ) : reports ? (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {statCards.map((stat) => {
                      const Icon = stat.icon;
                      return (
                        <Card key={stat.title} className="glass-card">
                          <CardContent className="p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <Icon className={`w-4 h-4 ${stat.color}`} />
                              <span className="text-xs text-muted-foreground">{stat.title}</span>
                            </div>
                            <div className={`text-lg font-bold ${stat.color}`} data-testid={`text-stat-${stat.title.toLowerCase().replace(/\s+/g, '-')}`}>
                              UGX {Math.abs(stat.value).toLocaleString()}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>

                  {reports.dailyStats && reports.dailyStats.length > 0 && (
                    <Card className="glass-card">
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2"><BarChart3 className="w-4 h-4" /> Daily Activity</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={reports.dailyStats}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#999' }} />
                            <YAxis tick={{ fontSize: 10, fill: '#999' }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                            <RechartsTooltip
                              contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                              labelStyle={{ color: '#FFD700' }}
                              formatter={(value: number) => [`UGX ${value.toLocaleString()}`, undefined]}
                            />
                            <Legend />
                            <Bar dataKey="deposits" name="Deposits" fill="#22c55e" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="bets" name="Bets" fill="#a855f7" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="wins" name="Wins" fill="#eab308" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="withdrawals" name="Withdrawals" fill="#f97316" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  )}
                </>
              ) : (
                <p className="text-center text-muted-foreground py-8">No report data available.</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="vouchers" className="mt-6">
            <div className="space-y-6">
              <Card className="glass-card max-w-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Ticket className="w-5 h-5" /> Create Voucher</CardTitle>
                  <CardDescription>Generate deposit vouchers for your players.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    const amount = parseInt(voucherAmount);
                    if (!amount || amount < 500) {
                      toast({ title: "Error", description: "Minimum voucher amount is UGX 500", variant: "destructive" });
                      return;
                    }
                    createVoucherMutation.mutate(amount);
                  }} className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs uppercase text-muted-foreground font-bold">Amount (UGX)</label>
                      <Input
                        type="number"
                        placeholder="e.g. 10000"
                        value={voucherAmount}
                        onChange={(e) => setVoucherAmount(e.target.value)}
                        min={500}
                        className="bg-white/5 border-white/10"
                        data-testid="input-voucher-amount"
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={createVoucherMutation.isPending} data-testid="button-create-voucher">
                      {createVoucherMutation.isPending ? <Loader2 className="animate-spin" /> : "Generate Voucher"}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Ticket className="w-5 h-5" /> My Vouchers</CardTitle>
                  <CardDescription>Vouchers you have created.</CardDescription>
                </CardHeader>
                <CardContent>
                  {vouchersLoading ? (
                    <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
                  ) : !managerVouchers || managerVouchers.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8" data-testid="text-no-vouchers">No vouchers created yet.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="border-white/10">
                          <TableHead>Code</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead>Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {managerVouchers.map((v) => (
                          <TableRow key={v.id} className="border-white/10" data-testid={`row-voucher-${v.id}`}>
                            <TableCell className="font-mono font-bold tracking-wider">{v.code}</TableCell>
                            <TableCell className="text-primary font-bold">UGX {v.amount.toLocaleString()}</TableCell>
                            <TableCell>
                              {v.isRedeemed ? (
                                <span className="text-muted-foreground text-xs">Redeemed</span>
                              ) : (
                                <span className="text-green-500 text-xs">Available</span>
                              )}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">{v.createdAt ? new Date(v.createdAt).toLocaleString() : 'N/A'}</TableCell>
                            <TableCell>
                              {!v.isRedeemed && (
                                <Button size="sm" variant="outline" onClick={() => copyToClipboard(v.code)} data-testid={`button-copy-voucher-${v.id}`}>
                                  <Copy className="w-3 h-3 mr-1" /> Copy
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="withdrawals" className="mt-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Banknote className="w-5 h-5" /> Pending Withdrawal Requests</CardTitle>
                <CardDescription>Withdrawal requests directed to you by players using your code{user?.withdrawCode ? `: ${user.withdrawCode}` : ''}.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10">
                      <TableHead>Player ID</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requestsLoading ? (
                      <TableRow><TableCell colSpan={4} className="text-center">Loading...</TableCell></TableRow>
                    ) : !withdrawRequests || withdrawRequests.length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No pending withdrawal requests</TableCell></TableRow>
                    ) : (
                      withdrawRequests.map((req: any) => (
                        <TableRow key={req.id} className="border-white/10" data-testid={`row-withdraw-${req.id}`}>
                          <TableCell>#{req.userId}</TableCell>
                          <TableCell className="font-bold text-primary">UGX {req.amount.toLocaleString()}</TableCell>
                          <TableCell>{new Date(req.createdAt).toLocaleString()}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => handleProcessWithdraw(req.id, "approved")} data-testid={`button-approve-${req.id}`}>Approve</Button>
                              <Button size="sm" variant="destructive" onClick={() => handleProcessWithdraw(req.id, "rejected")} data-testid={`button-reject-${req.id}`}>Reject</Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="broadcast" className="mt-6">
            <BroadcastSender senderRole="manager" />
          </TabsContent>

          <TabsContent value="chat" className="mt-6">
            {user && creatorUser && (
              <ChatPanel
                currentUserId={user.id}
                chatTargets={[creatorUser as User]}
                title="Chat with Super Manager"
              />
            )}
            {user && !user.createdBy && (
              <Card className="glass-card">
                <CardContent className="py-8 text-center text-muted-foreground">
                  No super manager assigned to chat with.
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </ProtectedLayout>
  );
}
