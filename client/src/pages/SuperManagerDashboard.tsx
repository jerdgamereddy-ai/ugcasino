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
import { Shield, Plus, Users, UserCog, Loader2, Ban, CheckCircle, Megaphone } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { User } from "@shared/schema";
import { BroadcastBanner } from "@/components/BroadcastBanner";
import { BroadcastSender } from "@/components/BroadcastSender";

export default function SuperManagerDashboard() {
  const { data: user } = useUser();
  const { toast } = useToast();
  const [newManagerUsername, setNewManagerUsername] = useState("");
  const [newManagerPassword, setNewManagerPassword] = useState("");

  const { data: subordinates, isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    enabled: user?.role === 'super_manager',
  });

  const createManagerMutation = useMutation({
    mutationFn: async (data: { username: string; password: string }) => {
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
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
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
                        <TableHead>Status</TableHead>
                        <TableHead>Balance</TableHead>
                        <TableHead>Change Password</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {managers.map((mgr) => (
                        <TableRow key={mgr.id} className="border-white/10" data-testid={`row-manager-${mgr.id}`}>
                          <TableCell>#{mgr.id}</TableCell>
                          <TableCell className="font-medium">{mgr.username}</TableCell>
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
                  createManagerMutation.mutate({ username: newManagerUsername, password: newManagerPassword });
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
                  <Button type="submit" className="w-full" disabled={createManagerMutation.isPending} data-testid="button-create-manager">
                    {createManagerMutation.isPending ? <Loader2 className="animate-spin" /> : "Create Manager"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="broadcast" className="mt-6">
            <BroadcastSender senderRole="super_manager" />
          </TabsContent>
        </Tabs>
      </div>
    </ProtectedLayout>
  );
}
