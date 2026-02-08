import { ProtectedLayout } from "@/components/layout/ProtectedLayout";
import { useUser } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Shield, Plus, Users, UserCog, Loader2, Ban, CheckCircle, Megaphone, Calculator, Phone, KeyRound } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { User } from "@shared/schema";
import { BroadcastBanner } from "@/components/BroadcastBanner";
import { BroadcastSender } from "@/components/BroadcastSender";
import { ProfitCalculator } from "@/components/ProfitCalculator";

export default function SuperManagerDashboard() {
  const { data: user } = useUser();
  const { toast } = useToast();
  const [newManagerUsername, setNewManagerUsername] = useState("");
  const [newManagerPassword, setNewManagerPassword] = useState("");
  const [newManagerPhone, setNewManagerPhone] = useState("");

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
            <TabsTrigger value="profit" data-testid="tab-profit"><Calculator className="w-3 h-3 mr-1" /> Profit Calculator</TabsTrigger>
            <TabsTrigger value="broadcast" data-testid="tab-broadcast"><Megaphone className="w-3 h-3 mr-1" /> Broadcast</TabsTrigger>
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
                        <TableHead>Balance</TableHead>
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
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {players.map((p) => (
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

          <TabsContent value="profit" className="mt-6">
            <ProfitCalculator viewerRole="super_manager" />
          </TabsContent>

          <TabsContent value="broadcast" className="mt-6">
            <BroadcastSender senderRole="super_manager" />
          </TabsContent>
        </Tabs>
      </div>
    </ProtectedLayout>
  );
}
