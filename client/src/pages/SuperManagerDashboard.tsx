import { ProtectedLayout } from "@/components/layout/ProtectedLayout";
import { DirectCreditDialog } from "@/components/DirectCreditDialog";
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
import { Shield, Plus, Users, UserCog, Loader2, Ban, CheckCircle, Megaphone, Calculator, Phone, KeyRound, BarChart3, TrendingUp, TrendingDown, Wallet, Trophy, ArrowDownCircle, ArrowUpCircle, DollarSign, RefreshCw, Filter, Banknote, ArrowDownToLine, ArrowUpFromLine, Settings2, RotateCcw } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { User } from "@shared/schema";
import { BroadcastBanner } from "@/components/BroadcastBanner";
import { BroadcastSender } from "@/components/BroadcastSender";
import { ProfitCalculator } from "@/components/ProfitCalculator";
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

// Per-manager casino-pool controls: credit money in, withdraw profits out,
// adjust the separate businessMoney column directly, toggle which column
// acts as the pool, and stamp a non-destructive reports cutoff.
function ManagerPoolControls({ mgr }: { mgr: User }) {
  const { toast } = useToast();
  const [creditAmt, setCreditAmt] = useState("");
  const [withdrawAmt, setWithdrawAmt] = useState("");
  const [adjustAmt, setAdjustAmt] = useState("");
  const [creditOpen, setCreditOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });

  const callRoute = async (path: string, body: any, successMsg: string) => {
    try {
      await apiRequest("POST", `/api/super-manager/managers/${mgr.id}/${path}`, body);
      toast({ title: successMsg, className: "bg-green-600 text-white" });
      refresh();
      return true;
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "Failed", variant: "destructive" });
      return false;
    }
  };

  const toggleMode = async (useSeparate: boolean) => {
    try {
      await apiRequest("PATCH", `/api/super-manager/managers/${mgr.id}/business-money-mode`, { useSeparate });
      toast({ title: useSeparate ? "Switched to separate pool" : "Switched to wallet pool", className: "bg-green-600 text-white" });
      refresh();
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "Failed", variant: "destructive" });
    }
  };

  const resetReports = async () => {
    if (!confirm(`Reset reports for ${mgr.username}? Activity before now will be hidden from their reports (non-destructive).`)) return;
    await callRoute("reset-reports", {}, "Reports cutoff stamped");
  };

  return (
    <div className="flex flex-wrap gap-1.5 items-center">
      {/* Credit pool */}
      <Dialog open={creditOpen} onOpenChange={setCreditOpen}>
        <DialogTrigger asChild>
          <Button size="sm" variant="outline" className="h-7 px-2 text-xs" data-testid={`button-credit-${mgr.id}`}>
            <ArrowDownToLine className="w-3 h-3 mr-1" /> Credit
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Credit Pool of {mgr.username}</DialogTitle>
            <DialogDescription>Move money from your wallet into this manager's casino pool.</DialogDescription>
          </DialogHeader>
          <Input
            type="number"
            placeholder="Amount (UGX)"
            value={creditAmt}
            onChange={(e) => setCreditAmt(e.target.value)}
            data-testid={`input-credit-amount-${mgr.id}`}
          />
          <DialogFooter>
            <Button onClick={async () => {
              const n = parseInt(creditAmt, 10);
              if (!Number.isFinite(n) || n <= 0) return;
              const ok = await callRoute("credit", { amount: n }, "Credited");
              if (ok) { setCreditAmt(""); setCreditOpen(false); }
            }} data-testid={`button-confirm-credit-${mgr.id}`}>Credit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Withdraw profits */}
      <Dialog open={withdrawOpen} onOpenChange={setWithdrawOpen}>
        <DialogTrigger asChild>
          <Button size="sm" variant="outline" className="h-7 px-2 text-xs" data-testid={`button-withdraw-${mgr.id}`}>
            <ArrowUpFromLine className="w-3 h-3 mr-1" /> Profits
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Withdraw Profits from {mgr.username}</DialogTitle>
            <DialogDescription>Move money from this manager's casino pool back into your wallet.</DialogDescription>
          </DialogHeader>
          <Input
            type="number"
            placeholder="Amount (UGX)"
            value={withdrawAmt}
            onChange={(e) => setWithdrawAmt(e.target.value)}
            data-testid={`input-withdraw-amount-${mgr.id}`}
          />
          <DialogFooter>
            <Button onClick={async () => {
              const n = parseInt(withdrawAmt, 10);
              if (!Number.isFinite(n) || n <= 0) return;
              const ok = await callRoute("withdraw-profits", { amount: n }, "Profits withdrawn");
              if (ok) { setWithdrawAmt(""); setWithdrawOpen(false); }
            }} data-testid={`button-confirm-withdraw-${mgr.id}`}>Withdraw</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Adjust businessMoney directly (only meaningful in separate-pool mode) */}
      <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
        <DialogTrigger asChild>
          <Button size="sm" variant="outline" className="h-7 px-2 text-xs" data-testid={`button-adjust-${mgr.id}`}>
            <Settings2 className="w-3 h-3 mr-1" /> Adjust
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Business Money for {mgr.username}</DialogTitle>
            <DialogDescription>
              Direct +/- ledger edit to the separate businessMoney column. Does NOT touch your wallet.
              Use a negative number to deduct.
            </DialogDescription>
          </DialogHeader>
          <Input
            type="number"
            placeholder="Delta (e.g. 10000 or -5000)"
            value={adjustAmt}
            onChange={(e) => setAdjustAmt(e.target.value)}
            data-testid={`input-adjust-amount-${mgr.id}`}
          />
          <DialogFooter>
            <Button onClick={async () => {
              const n = parseInt(adjustAmt, 10);
              if (!Number.isFinite(n) || n === 0) return;
              const ok = await callRoute("adjust-business-money", { delta: n }, "Adjusted");
              if (ok) { setAdjustAmt(""); setAdjustOpen(false); }
            }} data-testid={`button-confirm-adjust-${mgr.id}`}>Apply</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Toggle pool mode */}
      <div className="flex items-center gap-1 px-1">
        <Switch
          checked={mgr.useSeparateBusinessMoney}
          onCheckedChange={toggleMode}
          data-testid={`switch-mode-${mgr.id}`}
        />
        <span className="text-[10px] text-muted-foreground" title="When ON, the casino pool is the separate businessMoney column instead of the wallet balance.">
          <Banknote className="w-3 h-3 inline" />
        </span>
      </div>

      {/* Reset reports cutoff */}
      <Button
        size="sm"
        variant="outline"
        className="h-7 px-2 text-xs"
        onClick={resetReports}
        data-testid={`button-reset-reports-${mgr.id}`}
        title="Stamp now() as the reports start date for this manager (non-destructive)"
      >
        <RotateCcw className="w-3 h-3 mr-1" /> Reset Reports
      </Button>
    </div>
  );
}

export default function SuperManagerDashboard() {
  const { data: user } = useUser();
  const { toast } = useToast();
  const [newManagerUsername, setNewManagerUsername] = useState("");
  const [newManagerPassword, setNewManagerPassword] = useState("");
  const [newManagerPhone, setNewManagerPhone] = useState("");
  const [period, setPeriod] = useState<PeriodPreset>("today");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [selectedManager, setSelectedManager] = useState<string>("all");

  const { data: subordinates, isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    enabled: user?.role === 'super_manager',
  });

  const createManagerMutation = useMutation({
    mutationFn: async (data: { username: string; password: string; phoneNumber?: string }) => {
      const res = await fetch("/api/super-manager/create-manager", {
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
      toast({ title: "Manager created successfully", className: "bg-green-600 text-white" });
      setNewManagerUsername("");
      setNewManagerPassword("");
      setNewManagerPhone("");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const [playerSearch, setPlayerSearch] = useState("");
  const [userPasswords, setUserPasswords] = useState<Record<number, string>>({});
  const [withdrawCodes, setWithdrawCodes] = useState<Record<number, string>>({});

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
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  if (user?.role !== "super_manager") {
    return (
      <div className="text-center py-20">
        <Shield className="w-16 h-16 text-destructive mx-auto mb-4" />
        <h1 className="text-2xl font-bold" data-testid="text-access-denied">Access Denied</h1>
        <p className="text-muted-foreground">Super Managers only.</p>
      </div>
    );
  }

  const managers = subordinates?.filter(u => u.role === 'manager') || [];
  const players = subordinates?.filter(u => u.role === 'user') || [];

  const queryParams = useMemo(() => {
    const range = getDateRange(period, customFrom, customTo);
    const params = new URLSearchParams();
    if (range.from) params.set("from", range.from);
    if (range.to) params.set("to", range.to);
    if (selectedManager !== "all") params.set("managerId", selectedManager);
    return params.toString();
  }, [period, customFrom, customTo, selectedManager]);

  const { data: reports, isLoading: reportsLoading, refetch: refetchReports } = useQuery<ReportData>({
    queryKey: ["/api/reports", queryParams],
    queryFn: async () => {
      const res = await fetch(`/api/reports?${queryParams}`);
      if (!res.ok) throw new Error("Failed to fetch reports");
      return res.json();
    },
    enabled: user?.role === 'super_manager',
  });

  const statCards = reports ? [
    { title: "Profit / Loss", value: reports.profit, icon: reports.profit >= 0 ? TrendingUp : TrendingDown, color: reports.profit >= 0 ? "text-green-500" : "text-red-500" },
    { title: "Amount in Accounts", value: reports.totalAccountBalances, icon: Wallet, color: "text-blue-500" },
    { title: "Total Deposited", value: reports.totalDeposits, icon: ArrowDownCircle, color: "text-green-500" },
    { title: "Total Withdrawn", value: reports.totalWithdrawals, icon: ArrowUpCircle, color: "text-orange-500" },
    { title: "Amount Won", value: reports.totalWins, icon: Trophy, color: "text-yellow-500" },
    { title: "Amount Bet", value: reports.totalBets, icon: DollarSign, color: "text-purple-500" },
  ] : [];

  return (
    <ProtectedLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="bg-primary/20 p-3 rounded-xl">
            <UserCog className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-display font-bold text-primary" data-testid="text-sm-title">Super Manager Panel</h1>
            <p className="text-muted-foreground">Create and manage your managers.</p>
          </div>
        </div>

        <BroadcastBanner />

        <Tabs defaultValue="managers" className="w-full">
          <TabsList className="bg-white/5 border border-white/10 w-full justify-start flex-wrap gap-1">
            <TabsTrigger value="managers" data-testid="tab-managers">Managers ({managers.length})</TabsTrigger>
            <TabsTrigger value="players" data-testid="tab-players">Players ({players.length})</TabsTrigger>
            <TabsTrigger value="create" data-testid="tab-create">Create Manager</TabsTrigger>
            <TabsTrigger value="reports" data-testid="tab-reports"><BarChart3 className="w-3 h-3 mr-1" /> Reports</TabsTrigger>
            <TabsTrigger value="profit" data-testid="tab-profit"><Calculator className="w-3 h-3 mr-1" /> Profit Calculator</TabsTrigger>
            <TabsTrigger value="broadcast" data-testid="tab-broadcast"><Megaphone className="w-3 h-3 mr-1" /> Broadcast</TabsTrigger>
            <TabsTrigger value="chat" data-testid="tab-chat"><MessageCircle className="w-3 h-3 mr-1" /> Chat</TabsTrigger>
          </TabsList>

          <TabsContent value="managers" className="mt-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Users className="w-5 h-5" /> My Managers</CardTitle>
                <CardDescription>Managers you've created and their status.</CardDescription>
              </CardHeader>
              <CardContent>
                {usersLoading ? (
                  <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
                ) : managers.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8" data-testid="text-no-managers">No managers yet. Create one from the "Create Manager" tab.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/10">
                        <TableHead>ID</TableHead>
                        <TableHead>Username</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Wallet</TableHead>
                        <TableHead>Casino Pool</TableHead>
                        <TableHead>Reports Since</TableHead>
                        <TableHead>Casino Pool Actions</TableHead>
                        <TableHead>Withdraw Code</TableHead>
                        <TableHead>Change Password</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {managers.map((mgr) => (
                        <TableRow key={mgr.id} className="border-white/10" data-testid={`row-manager-${mgr.id}`}>
                          <TableCell>#{mgr.id}</TableCell>
                          <TableCell className="font-medium">{mgr.username}</TableCell>
                          <TableCell>
                            {mgr.phoneNumber ? (
                              <a href={`tel:${mgr.phoneNumber}`} className="flex items-center gap-1 text-primary hover:underline text-xs" data-testid={`link-phone-${mgr.id}`}>
                                <Phone className="w-3 h-3" /> {mgr.phoneNumber}
                              </a>
                            ) : (
                              <span className="text-muted-foreground text-xs">N/A</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {mgr.isSuspended ? (
                              <span className="flex items-center gap-1 text-red-500 text-xs"><Ban className="w-3 h-3" /> Suspended</span>
                            ) : (
                              <span className="flex items-center gap-1 text-green-500 text-xs"><CheckCircle className="w-3 h-3" /> Active</span>
                            )}
                          </TableCell>
                          <TableCell className="text-primary font-bold">UGX {mgr.balance.toLocaleString()}</TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <span className="font-bold text-amber-400" data-testid={`text-pool-${mgr.id}`}>
                                UGX {(mgr.useSeparateBusinessMoney ? mgr.businessMoney : mgr.balance).toLocaleString()}
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                {mgr.useSeparateBusinessMoney ? "Separate pool" : "= Wallet"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-xs text-muted-foreground" data-testid={`text-since-${mgr.id}`}>
                              {mgr.reportSinceAt ? new Date(mgr.reportSinceAt).toLocaleString() : "All time"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <ManagerPoolControls mgr={mgr} />
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2 items-center">
                              {mgr.withdrawCode ? (
                                <span className="font-mono text-xs bg-white/5 px-2 py-1 rounded" data-testid={`text-withdraw-code-${mgr.id}`}>{mgr.withdrawCode}</span>
                              ) : null}
                              <Input
                                type="text"
                                placeholder={mgr.withdrawCode ? "Change code" : "Set code"}
                                value={withdrawCodes[mgr.id] || ""}
                                onChange={(e) => {
                                  const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                                  setWithdrawCodes({ ...withdrawCodes, [mgr.id]: val });
                                }}
                                maxLength={6}
                                className="w-24 bg-white/5 border-white/10 font-mono text-center tracking-widest"
                                data-testid={`input-withdraw-code-${mgr.id}`}
                              />
                              <Button size="sm" onClick={() => handleSetWithdrawCode(mgr.id)} data-testid={`button-set-code-${mgr.id}`}>
                                <KeyRound className="w-3 h-3 mr-1" /> Set
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2 items-center">
                              <Input
                                type="password"
                                placeholder="New password"
                                value={userPasswords[mgr.id] || ""}
                                onChange={(e) => setUserPasswords({ ...userPasswords, [mgr.id]: e.target.value })}
                                className="w-32 bg-white/5 border-white/10"
                                data-testid={`input-password-${mgr.id}`}
                              />
                              <Button size="sm" onClick={() => handleChangePassword(mgr.id)} data-testid={`button-change-pw-${mgr.id}`}>Set</Button>
                              <DirectCreditDialog userId={mgr.id} username={mgr.username} currentBalance={mgr.balance} invalidateKeys={["/api/admin/users"]} />
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

          <TabsContent value="players" className="mt-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Users className="w-5 h-5" /> Players Under My Network</CardTitle>
                <CardDescription>Players created by your managers.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-3">
                  <Input
                    placeholder="Search by username..."
                    value={playerSearch}
                    onChange={e => setPlayerSearch(e.target.value)}
                    className="bg-white/5 border-white/10 max-w-xs"
                    data-testid="input-search-players"
                  />
                </div>
                {usersLoading ? (
                  <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
                ) : players.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8" data-testid="text-no-players">No players yet.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/10">
                        <TableHead>ID</TableHead>
                        <TableHead>Username</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Balance</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {players.filter(p => p.username.toLowerCase().includes(playerSearch.toLowerCase())).map((p) => (
                        <TableRow key={p.id} className="border-white/10" data-testid={`row-player-${p.id}`}>
                          <TableCell>#{p.id}</TableCell>
                          <TableCell>{p.username}</TableCell>
                          <TableCell>
                            {p.phoneNumber ? (
                              <a href={`tel:${p.phoneNumber}`} className="flex items-center gap-1 text-primary hover:underline text-xs" data-testid={`link-phone-player-${p.id}`}>
                                <Phone className="w-3 h-3" /> {p.phoneNumber}
                              </a>
                            ) : (
                              <span className="text-muted-foreground text-xs">N/A</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {p.isSuspended ? (
                              <span className="flex items-center gap-1 text-red-500 text-xs"><Ban className="w-3 h-3" /> Suspended</span>
                            ) : (
                              <span className="flex items-center gap-1 text-green-500 text-xs"><CheckCircle className="w-3 h-3" /> Active</span>
                            )}
                          </TableCell>
                          <TableCell className="text-primary font-bold">UGX {p.balance.toLocaleString()}</TableCell>
                          <TableCell>
                            <DirectCreditDialog userId={p.id} username={p.username} currentBalance={p.balance} invalidateKeys={["/api/admin/users"]} />
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
                <CardTitle className="flex items-center gap-2"><Plus className="w-5 h-5" /> Create New Manager</CardTitle>
                <CardDescription>Create a manager who can then create players.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  createManagerMutation.mutate({ username: newManagerUsername, password: newManagerPassword, phoneNumber: newManagerPhone || undefined });
                }} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs uppercase text-muted-foreground font-bold">Username</label>
                    <Input
                      placeholder="Manager username"
                      value={newManagerUsername}
                      onChange={(e) => setNewManagerUsername(e.target.value)}
                      className="bg-white/5 border-white/10"
                      data-testid="input-new-manager-username"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs uppercase text-muted-foreground font-bold">Password</label>
                    <Input
                      type="password"
                      placeholder="Manager password (min 6 chars)"
                      value={newManagerPassword}
                      onChange={(e) => setNewManagerPassword(e.target.value)}
                      className="bg-white/5 border-white/10"
                      data-testid="input-new-manager-password"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs uppercase text-muted-foreground font-bold">Phone Number (optional)</label>
                    <Input
                      type="tel"
                      placeholder="e.g. +256 700 000000"
                      value={newManagerPhone}
                      onChange={(e) => setNewManagerPhone(e.target.value)}
                      className="bg-white/5 border-white/10"
                      data-testid="input-new-manager-phone"
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={createManagerMutation.isPending} data-testid="button-create-manager">
                    {createManagerMutation.isPending ? <Loader2 className="animate-spin" /> : "Create Manager"}
                  </Button>
                </form>
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

                    <div className="space-y-1.5">
                      <label className="text-xs uppercase text-muted-foreground font-semibold">Filter by Manager</label>
                      <Select value={selectedManager} onValueChange={setSelectedManager}>
                        <SelectTrigger className="w-[200px]" data-testid="select-report-manager">
                          <SelectValue placeholder="All Managers" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Managers</SelectItem>
                          {managers.map((mgr) => (
                            <SelectItem key={mgr.id} value={String(mgr.id)}>{mgr.username}</SelectItem>
                          ))}
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

          <TabsContent value="profit" className="mt-6">
            <ProfitCalculator viewerRole="super_manager" />
          </TabsContent>

          <TabsContent value="broadcast" className="mt-6">
            <BroadcastSender senderRole="super_manager" />
          </TabsContent>

          <TabsContent value="chat" className="mt-6">
            {user && (
              <ChatPanel
                currentUserId={user.id}
                chatTargets={managers}
                title="Chat with Managers"
              />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </ProtectedLayout>
  );
}
