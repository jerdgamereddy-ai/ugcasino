import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, ShieldOff, ShieldCheck, Search, Crown, Briefcase, Users as UsersIcon } from "lucide-react";
import { GAMES_REGISTRY, type User } from "@shared/schema";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Admin-only "Game Access Control" panel.
// Picks any user in the system, then shows a switch per game. Toggling a
// switch hits POST /api/admin/users/:id/disabled-games which writes to the
// user_game_disables table. The server-side gateGame() walks the createdBy
// chain on every game request, so disabling a game for a super_manager or
// manager automatically blocks every player below them.
export function GameAccessControl() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const { data: users, isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
  });

  const disabledQueryKey = ["/api/admin/users", selectedId, "disabled-games"];
  const { data: disabledData, isLoading: disabledLoading } = useQuery<{ own: string[]; effective: string[] }>({
    queryKey: disabledQueryKey,
    enabled: !!selectedId,
    queryFn: async () => {
      const res = await fetch(`/api/admin/users/${selectedId}/disabled-games`);
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
  });

  const toggle = useMutation({
    mutationFn: async ({ gameType, disabled }: { gameType: string; disabled: boolean }) => {
      const res = await fetch(`/api/admin/users/${selectedId}/disabled-games`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameType, disabled }),
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: disabledQueryKey });
      queryClient.invalidateQueries({ queryKey: ["/api/user/disabled-games"] });
      toast({
        title: vars.disabled ? "Game turned OFF" : "Game turned ON",
        description: `${vars.gameType} ${vars.disabled ? "is now blocked" : "is now allowed"} for this user (and everyone they manage).`,
        className: vars.disabled ? "bg-rose-600 text-white" : "bg-emerald-600 text-white",
      });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const filtered = (users ?? []).filter(u =>
    u.role !== "admin" &&
    (search === "" || u.username.toLowerCase().includes(search.toLowerCase()) || String(u.id).includes(search))
  );

  const selectedUser = users?.find(u => u.id === selectedId);

  const roleIcon = (role: string) =>
    role === "super_manager" ? <Crown className="w-4 h-4 text-purple-400" /> :
    role === "manager" ? <Briefcase className="w-4 h-4 text-blue-400" /> :
    <UsersIcon className="w-4 h-4 text-emerald-400" />;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* USER PICKER */}
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5 text-primary" /> Pick a User
          </CardTitle>
          <CardDescription>
            Disabling a game for a super manager or manager <strong>cascades</strong> — every user below them is also blocked from that game.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            placeholder="Search username or ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            data-testid="input-game-access-search"
          />
          <div className="max-h-[480px] overflow-y-auto space-y-1 pr-1">
            {usersLoading && <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin" /></div>}
            {filtered.map(u => (
              <button
                key={u.id}
                onClick={() => setSelectedId(u.id)}
                className={`w-full text-left px-3 py-2 rounded-lg border flex items-center justify-between gap-2 transition ${
                  selectedId === u.id
                    ? "bg-primary/10 border-primary/50"
                    : "bg-white/[0.02] border-white/5 hover-elevate"
                }`}
                data-testid={`button-pick-user-${u.id}`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {roleIcon(u.role)}
                  <span className="truncate font-medium">{u.username}</span>
                </div>
                <Badge variant="outline" className="text-[9px] uppercase">{u.role.replace("_", " ")}</Badge>
              </button>
            ))}
            {!usersLoading && filtered.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-6">No users match.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* GAME TOGGLES */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {selectedUser ? <ShieldCheck className="w-5 h-5 text-emerald-400" /> : <ShieldOff className="w-5 h-5 text-muted-foreground" />}
            Game Access
            {selectedUser && (
              <span className="ml-2 text-base font-mono text-primary">
                {selectedUser.username}
              </span>
            )}
          </CardTitle>
          <CardDescription>
            Switch <span className="text-rose-400 font-bold">OFF</span> to instantly block the game for this user and everyone underneath them. Use this to disable buggy games during a deploy without removing them.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!selectedUser && (
            <div className="text-center py-12 text-muted-foreground text-sm">
              Pick a user from the left to manage their game access.
            </div>
          )}

          {selectedUser && disabledLoading && (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>
          )}

          {selectedUser && disabledData && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {GAMES_REGISTRY.map(g => {
                const ownDisabled = disabledData.own.includes(g.id);
                const effectiveDisabled = disabledData.effective.includes(g.id);
                // "inheritedOff" = blocked by an ancestor (not directly toggled here).
                const inheritedOff = effectiveDisabled && !ownDisabled;
                const enabled = !ownDisabled;
                return (
                  <div
                    key={g.id}
                    className={`flex items-center justify-between gap-3 p-4 rounded-xl border transition ${
                      effectiveDisabled
                        ? "bg-rose-500/5 border-rose-500/30"
                        : "bg-emerald-500/5 border-emerald-500/20"
                    }`}
                    data-testid={`row-game-toggle-${g.id}`}
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-sm">{g.label}</div>
                      <div className="text-[10px] uppercase tracking-wider mt-0.5">
                        {inheritedOff ? (
                          <span className="text-amber-400">Off — inherited from manager above</span>
                        ) : effectiveDisabled ? (
                          <span className="text-rose-400">Disabled</span>
                        ) : (
                          <span className="text-emerald-400">Enabled</span>
                        )}
                      </div>
                    </div>
                    <Switch
                      checked={enabled}
                      disabled={toggle.isPending || inheritedOff}
                      onCheckedChange={(checked) => toggle.mutate({ gameType: g.id, disabled: !checked })}
                      data-testid={`switch-game-${g.id}`}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
