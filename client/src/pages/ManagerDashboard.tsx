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
import { Shield, Plus, Users, Loader2, Ban, CheckCircle, Megaphone, Phone } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { User } from "@shared/schema";
import { BroadcastBanner } from "@/components/BroadcastBanner";
import { BroadcastSender } from "@/components/BroadcastSender";

export default function ManagerDashboard() {
  const { data: user } = useUser();
  const { toast } = useToast();
  const [newUserUsername, setNewUserUsername] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserPhone, setNewUserPhone] = useState("");

  const { data: myUsers, isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
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

  if (user?.role !== "manager") {
    return (
      <div className="text-center py-20">
        <Shield className="w-16 h-16 text-destructive mx-auto mb-4" />
        <h1 className="text-2xl font-bold" data-testid="text-access-denied">Access Denied</h1>
        <p className="text-muted-foreground">Managers only.</p>
      </div>
    );
  }

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
            <TabsTrigger value="broadcast" data-testid="tab-broadcast"><Megaphone className="w-3 h-3 mr-1" /> Broadcast</TabsTrigger>
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

          <TabsContent value="broadcast" className="mt-6">
            <BroadcastSender senderRole="manager" />
          </TabsContent>
        </Tabs>
      </div>
    </ProtectedLayout>
  );
}
