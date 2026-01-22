import { ProtectedLayout } from "@/components/layout/ProtectedLayout";
import { useUser } from "@/hooks/use-auth";
import { useUsersList } from "@/hooks/use-admin";
import { useCreateVoucher, useVouchers } from "@/hooks/use-vouchers";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ReportsResponse } from "@shared/schema";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';

export default function AdminDashboard() {
  const { data: user } = useUser();
  const { data: users, isLoading: usersLoading } = useUsersList();
  const { data: vouchers, isLoading: vouchersLoading } = useVouchers();
  const { data: withdrawRequests, isLoading: requestsLoading } = useQuery<any[]>({
    queryKey: ["/api/withdraw/requests"],
  });
  const { data: reports, isLoading: reportsLoading } = useQuery<ReportsResponse>({
    queryKey: [api.admin.reports.path],
    enabled: user?.role === 'admin' || user?.role === 'manager'
  });

  const { data: gameSettings, isLoading: settingsLoading } = useQuery<any[]>({
    queryKey: [api.games.settings.get.path],
  });

  const updateSettingMutation = useMutation({
    mutationFn: async ({ gameType, winChance }: { gameType: string, winChance: number }) => {
      const res = await fetch(api.games.settings.update.path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameType, winChance }),
      });
      if (!res.ok) throw new Error("Failed to update setting");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.games.settings.get.path] });
      toast({ title: "Setting Updated", className: "bg-green-600 text-white" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  });

  const handleUpdateWinChance = (gameType: string, chance: string) => {
    const value = parseInt(chance);
    if (isNaN(value) || value < 0 || value > 100) return;
    updateSettingMutation.mutate({ gameType, winChance: value });
  };
  
  const [amount, setAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState<Record<number, string>>({});
  const [userPasswords, setUserPasswords] = useState<Record<number, string>>({});

  if (user?.role !== "admin" && user?.role !== "manager") {
    return (
      <div className="text-center py-20">
        <Shield className="w-16 h-16 text-destructive mx-auto mb-4" />
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p className="text-muted-foreground">You do not have permission to view this page.</p>
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

  const handleWithdraw = async (userId: number) => {
    const val = withdrawAmount[userId];
    if (!val) return;
    
    try {
      const res = await fetch(api.admin.withdraw.path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, amount: parseInt(val) }),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      
      toast({ title: "Success", description: data.message });
      setWithdrawAmount({ ...withdrawAmount, [userId]: "" });
      queryClient.invalidateQueries({ queryKey: [api.admin.users.path] });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleApprove = async (userId: number) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/approve`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error("Approval failed");
      toast({ title: "User Approved", className: "bg-green-600 text-white" });
      queryClient.invalidateQueries({ queryKey: [api.admin.users.path] });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

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
      toast({ title: "Success", description: "Password updated successfully", className: "bg-green-600 text-white" });
      setUserPasswords({ ...userPasswords, [userId]: "" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleProcessWithdraw = async (id: number, status: "approved" | "rejected") => {
    try {
      const res = await fetch(`/api/admin/withdraw/requests/${id}/process`, {
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

  const reportStats = reports ? [
    { title: "Total Deposits", value: reports.totalDeposits, icon: Wallet, color: "text-green-500" },
    { title: "Total Withdrawals", value: reports.totalWithdrawals, icon: TrendingDown, color: "text-red-500" },
    { title: "Total Bets", value: reports.totalBets, icon: Dice5, color: "text-blue-500" },
    { title: "Total Wins", value: reports.totalWins, icon: Trophy, color: "text-yellow-500" },
    { title: "Player Balances", value: reports.totalPendingBalance, icon: Users, color: "text-purple-500" },
    { title: "Net Revenue", value: reports.netRevenue, icon: TrendingUp, color: reports.netRevenue >= 0 ? "text-green-500" : "text-red-500" },
  ] : [];

  return (
    <ProtectedLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="bg-primary/20 p-3 rounded-xl">
             <Shield className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-display font-bold text-primary">Admin Dashboard</h1>
            <p className="text-muted-foreground">Manage users, vouchers, and view performance reports.</p>
          </div>
        </div>

        <Tabs defaultValue="reports" className="w-full">
          <TabsList className="bg-white/5 border border-white/10 w-full justify-start">
            <TabsTrigger value="reports">Performance Reports</TabsTrigger>
            <TabsTrigger value="vouchers">Voucher Management</TabsTrigger>
            <TabsTrigger value="requests">Withdrawal Requests</TabsTrigger>
            <TabsTrigger value="users">User Management</TabsTrigger>
            <TabsTrigger value="games">Game Controls</TabsTrigger>
          </TabsList>

          <TabsContent value="reports" className="mt-6 space-y-6">
            {reportsLoading ? (
              <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin" /></div>
            ) : reports ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {reportStats.map((stat) => (
                    <Card key={stat.title} className="glass-card">
                      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                        <stat.icon className={`h-4 w-4 ${stat.color}`} />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-primary">UGX {stat.value.toLocaleString()}</div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" /> Daily Activity
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={reports.dailyStats}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                        <XAxis dataKey="date" stroke="#888" />
                        <YAxis stroke="#888" />
                        <RechartsTooltip 
                          contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                          itemStyle={{ color: '#fff' }}
                        />
                        <Legend />
                        <Bar dataKey="bets" name="Total Bets" fill="#3b82f6" />
                        <Bar dataKey="wins" name="Total Wins" fill="#eab308" />
                        <Bar dataKey="deposits" name="Total Deposits" fill="#22c55e" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle>Recent Transactions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow className="border-white/10">
                          <TableHead>Date</TableHead>
                          <TableHead>User ID</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reports.transactions.map((tx: any) => (
                          <TableRow key={tx.id} className="border-white/10 hover:bg-white/5">
                            <TableCell className="text-sm">{new Date(tx.createdAt!).toLocaleString()}</TableCell>
                            <TableCell className="font-mono">#{tx.userId}</TableCell>
                            <TableCell className="capitalize text-xs">
                              <span className="px-2 py-0.5 rounded-full bg-white/5">{tx.type.replace('_', ' ')}</span>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">{tx.description}</TableCell>
                            <TableCell className={`text-right font-bold ${tx.amount >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                              UGX {Math.abs(tx.amount).toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </>
            ) : (
              <div className="text-center p-12 text-muted-foreground">No reporting data available.</div>
            )}
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
                        <Input 
                            type="number" 
                            placeholder="e.g. 5000" 
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="bg-black/30 border-white/10"
                        />
                    </div>
                    <Button type="submit" className="w-full" disabled={creatingVoucher}>
                      {creatingVoucher ? "Generating..." : <><Plus className="w-4 h-4 mr-2" /> Generate Code</>}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <Card className="md:col-span-2 glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                      <Ticket className="w-5 h-5" /> Recent Vouchers
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/10 hover:bg-white/5">
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
                        <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No vouchers created yet</TableCell></TableRow>
                      ) : (
                        vouchers?.map((v) => (
                          <TableRow key={v.id} className="border-white/10 hover:bg-white/5">
                            <TableCell className="font-mono">{v.code}</TableCell>
                            <TableCell className="text-primary font-bold">UGX {v.amount.toLocaleString()}</TableCell>
                            <TableCell>
                              <span className={`px-2 py-1 rounded text-xs ${v.isRedeemed ? "bg-green-500/20 text-green-500" : "bg-yellow-500/20 text-yellow-500"}`}>
                                {v.isRedeemed ? "Redeemed" : "Active"}
                              </span>
                            </TableCell>
                            <TableCell>
                                <Button size="sm" variant="ghost" onClick={() => copyToClipboard(v.code)}>
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
                <CardTitle className="flex items-center gap-2"><Banknote className="w-5 h-5"/> Pending Withdrawals</CardTitle>
                <CardDescription>Review and approve player withdrawal requests.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10">
                      <TableHead>User ID</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requestsLoading ? (
                      <TableRow><TableCell colSpan={4} className="text-center">Loading...</TableCell></TableRow>
                    ) : !withdrawRequests || withdrawRequests.length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No pending requests</TableCell></TableRow>
                    ) : (
                      withdrawRequests.map((req: any) => (
                        <TableRow key={req.id} className="border-white/10">
                          <TableCell>#{req.userId}</TableCell>
                          <TableCell className="font-bold text-primary">UGX {req.amount.toLocaleString()}</TableCell>
                          <TableCell>{new Date(req.createdAt).toLocaleString()}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => handleProcessWithdraw(req.id, "approved")} className="bg-green-600 hover:bg-green-700">Approve</Button>
                              <Button size="sm" variant="destructive" onClick={() => handleProcessWithdraw(req.id, "rejected")}>Reject</Button>
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

          <TabsContent value="games" className="mt-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Dice5 className="w-5 h-5"/> Win Probability Control</CardTitle>
                <CardDescription>Adjust winning percentages for each game (0-100%). Higher values mean more player wins.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10">
                      <TableHead>Game Name</TableHead>
                      <TableHead>Current Win Chance (%)</TableHead>
                      <TableHead>Adjust Level</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {settingsLoading ? (
                      <TableRow><TableCell colSpan={4} className="text-center">Loading...</TableCell></TableRow>
                    ) : gameSettings?.map((setting) => (
                      <TableRow key={setting.id} className="border-white/10">
                        <TableCell className="capitalize font-bold text-primary">{setting.gameType}</TableCell>
                        <TableCell className="font-mono">{Math.round(setting.winChance * 100)}%</TableCell>
                        <TableCell>
                          <Input 
                            type="number" 
                            min="0" 
                            max="100"
                            defaultValue={Math.round(setting.winChance * 100)}
                            className="w-24 bg-black/30 border-white/10"
                            onBlur={(e) => handleUpdateWinChance(setting.gameType, e.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                           <span className="text-xs text-muted-foreground italic">Auto-saves on blur</span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="mt-6">
            <Card className="glass-card">
              <CardHeader>
                 <CardTitle className="flex items-center gap-2"><Users className="w-5 h-5"/> User Database</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                    <TableHeader>
                      <TableRow className="border-white/10 hover:bg-white/5">
                        <TableHead>ID</TableHead>
                        <TableHead>Username</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Balance</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Joined</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                        {usersLoading ? (
                            <TableRow><TableCell colSpan={7} className="text-center">Loading...</TableCell></TableRow>
                        ) : (
                            users?.map((u) => (
                                <TableRow key={u.id} className="border-white/10 hover:bg-white/5">
                                    <TableCell className="font-mono text-muted-foreground">#{u.id}</TableCell>
                                    <TableCell className="font-medium">{u.username}</TableCell>
                                    <TableCell className="capitalize">{u.role}</TableCell>
                                    <TableCell className="font-mono">UGX {u.balance.toLocaleString()}</TableCell>
                                    <TableCell>
                                      <span className={`px-2 py-1 rounded text-xs ${u.isApproved ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500"}`}>
                                        {u.isApproved ? "Approved" : "Pending"}
                                      </span>
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex gap-2 items-center">
                                        {!u.isApproved && (u.role === 'user' || user?.role === 'admin') && (
                                          <Button size="sm" variant="luxury" onClick={() => handleApprove(u.id)} className="h-8">
                                            <CheckCircle className="w-4 h-4 mr-1" /> Approve
                                          </Button>
                                        )}
                                        {user?.role === 'admin' && u.role === 'user' && (
                                          <>
                                            <Input 
                                              type="number" 
                                              placeholder="UGX" 
                                              className="w-24 h-8 text-xs bg-black/30 border-white/10" 
                                              value={withdrawAmount[u.id] || ""}
                                              onChange={(e) => setWithdrawAmount({...withdrawAmount, [u.id]: e.target.value})}
                                            />
                                            <Button size="sm" variant="outline" onClick={() => handleWithdraw(u.id)} className="h-8">
                                              <Banknote className="w-4 h-4 mr-1" /> Withdraw
                                            </Button>
                                            <div className="flex gap-1 ml-2">
                                              <Input 
                                                type="text" 
                                                placeholder="New Pwd" 
                                                className="w-24 h-8 text-xs bg-black/30 border-white/10" 
                                                value={userPasswords[u.id] || ""}
                                                onChange={(e) => setUserPasswords({...userPasswords, [u.id]: e.target.value})}
                                              />
                                              <Button size="sm" variant="outline" onClick={() => handleChangePassword(u.id)} className="h-8">
                                                Update
                                              </Button>
                                            </div>
                                          </>
                                        )}
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground text-sm">
                                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '-'}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </ProtectedLayout>
  );
}
