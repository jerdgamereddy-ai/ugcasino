import { ProtectedLayout } from "@/components/layout/ProtectedLayout";
import { useUser } from "@/hooks/use-auth";
import { useCreateVoucher, useVouchers } from "@/hooks/use-vouchers";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useRef, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Shield, Plus, Users, Ticket, Copy, Banknote, CheckCircle, Loader2, Ban, Trash2, ArrowUpCircle, KeyRound, UserCog, Lock, BarChart3, Settings2, ChevronUp, ChevronDown, Megaphone, Calculator, Phone, CircleDot, Crown, Briefcase, Printer } from "lucide-react";
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

const FISH_JOY_NAMES = ['Tiny Fish','Small Fish','Sea Fish','Stripe Fish','Angel Fish','Puffer Fish','Sword Fish','Bat Fish','Coral Fish','Bull Fish','Shark','Giant Shark'];
const FISH_JOY_DEFAULT_ODDS = [2, 4, 6, 10, 15, 25, 40, 60, 80, 100, 150, 300];

function FishJoyOddsCard() {
  const { toast } = useToast();
  const [odds, setOdds] = useState<number[]>(FISH_JOY_DEFAULT_ODDS);
  const { data: settings } = useQuery<{ fishOdds: number[] }>({ queryKey: ["/api/games/fishjoy/settings"] });
  const loadedRef = useRef(false);
  useEffect(() => {
    if (settings?.fishOdds && !loadedRef.current) { loadedRef.current = true; setOdds(settings.fishOdds); }
  }, [settings]);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/games/fishjoy/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fishOdds: odds }),
      });
      if (!res.ok) throw new Error("Failed to save");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/games/fishjoy/settings"] });
      toast({ title: "Fish Joy Updated", description: "Fish odds saved." });
    },
  });

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">🐟 Fish Joy — Fish Odds (×Bet)</CardTitle>
        <CardDescription>Multiplier applied to the bet amount when each fish type is caught.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
          {FISH_JOY_NAMES.map((name, i) => (
            <div key={i} className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">{name}</label>
              <Input
                type="number"
                min={0.1}
                step={0.5}
                value={odds[i]}
                onChange={e => {
                  const v = parseFloat(e.target.value) || 1;
                  setOdds(prev => { const n = [...prev]; n[i] = v; return n; });
                }}
                className="bg-white/5 border-white/10 h-8 text-sm"
                data-testid={`input-fish-odds-${i}`}
              />
            </div>
          ))}
        </div>
        <Button onClick={() => mutation.mutate()} disabled={mutation.isPending} size="sm" data-testid="button-save-fish-odds">
          {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Fish Odds"}
        </Button>
      </CardContent>
    </Card>
  );
}

const ACTIVE_GAME_TYPES = ["classic-slots", "roulette", "dice", "hilo", "coinflip", "plinko", "wheel", "fishhunt", "dog-racing", "horse4", "horse-js"];

const HORSE4_NAMES = ["Engineer", "Pin", "Doughnut", "Mayhem", "Last Things", "Chatterbox", "Hypno", "Croquette"];
const HORSE4_DEFAULT_ODDS = [3.7, 5.5, 2.2, 11.75, 17.25, 8.75, 7.15, 6.15];
const DOG_NAMES = ["Psycho", "All Saturdays", "The Norman", "T-Rex", "Nice Tuft", "Baloo"];
const DOG_DEFAULT_ODDS = [3.7, 5.5, 2.2, 11.75, 17.25, 8.75];

function GameSettingCard({ setting }: { setting: GameSetting }) {
  const { toast } = useToast();
  const [pct, setPct] = useState(Math.round(setting.winChance * 100));
  const hasMultiplier = ["coinflip", "classic-slots", "dice", "hilo"].includes(setting.gameType);
  const defaultMultiplier = setting.gameType === "classic-slots" ? 10 : setting.gameType === "coinflip" ? 1.95 : 2;
  const [multiplierVal, setMultiplierVal] = useState(setting.payoutMultiplier ?? defaultMultiplier);
  const isHorseJs = setting.gameType === "horse-js";
  const isHorse4 = setting.gameType === "horse4";
  const isRoulette = setting.gameType === "roulette";
  const isDogRacing = setting.gameType === "dog-racing";
  const extraParsed = (() => { try { return setting.extraSettings ? JSON.parse(setting.extraSettings) : {}; } catch { return {}; } })();
  const [maxLaps, setMaxLaps] = useState<number>(extraParsed.maxLaps ?? 1);
  const [horseOdds, setHorseOdds] = useState<number[]>(extraParsed.odds ?? [2.0, 2.5, 3.0, 3.5]);
  const [horse4Odds, setHorse4Odds] = useState<number[]>(extraParsed.odds ?? HORSE4_DEFAULT_ODDS);
  const [dogOdds, setDogOdds] = useState<number[]>(extraParsed.odds ?? DOG_DEFAULT_ODDS);
  const [numberOdds, setNumberOdds] = useState<number>(extraParsed.numberOdds ?? 35);
  const [colorOdds, setColorOdds] = useState<number>(extraParsed.colorOdds ?? 1);
  const [parityOdds, setParityOdds] = useState<number>(extraParsed.parityOdds ?? 1);

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

  const multiplierMutation = useMutation({
    mutationFn: async (val: number) => {
      const res = await fetch("/api/games/settings/payout-multiplier", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameType: setting.gameType, payoutMultiplier: val }),
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.games.settings.get.path] });
      toast({ title: "Payout Updated", description: `${setting.gameType} payout set to ${multiplierVal}x.` });
    },
  });

  const horseJsMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/games/horse-js/settings", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maxLaps, odds: horseOdds }),
      });
      if (!res.ok) throw new Error("Failed to update horse-js settings");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.games.settings.get.path] });
      toast({ title: "Horse Race Updated", description: "Max laps and horse odds saved." });
    },
  });

  const horse4Mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/games/horse4/settings", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ odds: horse4Odds }),
      });
      if (!res.ok) throw new Error("Failed to update horse4 settings");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.games.settings.get.path] });
      toast({ title: "Horse4 Updated", description: "8-horse odds saved." });
    },
  });

  const rouletteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/games/roulette/settings", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ numberOdds, colorOdds, parityOdds }),
      });
      if (!res.ok) throw new Error("Failed to update roulette odds");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.games.settings.get.path] });
      toast({ title: "Roulette Updated", description: "Roulette odds saved." });
    },
  });

  const dogRacingMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/games/dog-racing/settings", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ odds: dogOdds }),
      });
      if (!res.ok) throw new Error("Failed to update dog racing settings");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.games.settings.get.path] });
      toast({ title: "Dog Racing Updated", description: "Greyhound win odds saved." });
    },
  });

  const increment = () => setPct(p => Math.min(100, p + 1));
  const decrement = () => setPct(p => Math.max(0, p - 1));

  return (
    <Card className="glass-card">
      <CardHeader className="pb-2">
        <CardTitle className="capitalize text-base">{setting.gameType}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
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
        </div>
        {hasMultiplier && (
          <div className="border-t border-white/10 pt-4">
            <label className="text-xs text-muted-foreground">Payout Odds (Multiplier)</label>
            <div className="flex items-center gap-2 mt-2">
              <Input
                type="number"
                min={1.01}
                max={100}
                step={0.05}
                value={multiplierVal}
                onChange={(e) => setMultiplierVal(Math.max(1.01, parseFloat(e.target.value) || 1.01))}
                className="font-mono text-lg font-bold text-center bg-white/5 border-white/10"
                data-testid={`input-multiplier-${setting.gameType}`}
              />
              <span className="text-sm font-bold text-muted-foreground">x</span>
            </div>
            <Button
              className="w-full mt-3"
              size="sm"
              variant="secondary"
              onClick={() => multiplierMutation.mutate(multiplierVal)}
              disabled={multiplierMutation.isPending}
              data-testid={`button-save-multiplier-${setting.gameType}`}
            >
              {multiplierMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Payout Odds"}
            </Button>
          </div>
        )}
        {isHorseJs && (
          <div className="border-t border-white/10 pt-4 space-y-3">
            <label className="text-xs text-muted-foreground font-semibold">Quick Horse Race Settings</label>
            <div>
              <label className="text-xs text-muted-foreground">Max Laps</label>
              <Input
                type="number"
                min={1}
                max={20}
                step={1}
                value={maxLaps}
                onChange={(e) => setMaxLaps(Math.max(1, parseInt(e.target.value) || 1))}
                className="font-mono font-bold text-center bg-white/5 border-white/10 mt-1"
                data-testid="input-horse-js-max-laps"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Per-Horse Win Odds (x)</label>
              {horseOdds.map((odd, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-16">Horse {i + 1}</span>
                  <Input
                    type="number"
                    min={1.01}
                    max={100}
                    step={0.1}
                    value={odd}
                    onChange={(e) => {
                      const updated = [...horseOdds];
                      updated[i] = Math.max(1.01, parseFloat(e.target.value) || 1.01);
                      setHorseOdds(updated);
                    }}
                    className="font-mono text-sm text-center bg-white/5 border-white/10"
                    data-testid={`input-horse-js-odds-${i}`}
                  />
                  <span className="text-xs text-muted-foreground">x</span>
                </div>
              ))}
            </div>
            <Button
              className="w-full"
              size="sm"
              variant="secondary"
              onClick={() => horseJsMutation.mutate()}
              disabled={horseJsMutation.isPending}
              data-testid="button-save-horse-js-settings"
            >
              {horseJsMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Horse Settings"}
            </Button>
          </div>
        )}
        {isHorse4 && (
          <div className="border-t border-white/10 pt-4 space-y-3">
            <label className="text-xs text-muted-foreground font-semibold">8-Horse Race — Win Odds (x)</label>
            <div className="space-y-2">
              {HORSE4_NAMES.map((name, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-24 capitalize">{name}</span>
                  <Input
                    type="number"
                    min={1.01}
                    max={200}
                    step={0.05}
                    value={horse4Odds[i] ?? HORSE4_DEFAULT_ODDS[i]}
                    onChange={(e) => {
                      const updated = [...horse4Odds];
                      updated[i] = Math.max(1.01, parseFloat(e.target.value) || 1.01);
                      setHorse4Odds(updated);
                    }}
                    className="font-mono text-sm text-center bg-white/5 border-white/10"
                    data-testid={`input-horse4-odds-${i}`}
                  />
                  <span className="text-xs text-muted-foreground">x</span>
                </div>
              ))}
            </div>
            <Button
              className="w-full"
              size="sm"
              variant="secondary"
              onClick={() => horse4Mutation.mutate()}
              disabled={horse4Mutation.isPending}
              data-testid="button-save-horse4-settings"
            >
              {horse4Mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save 8-Horse Odds"}
            </Button>
          </div>
        )}
        {isRoulette && (
          <div className="border-t border-white/10 pt-4 space-y-3">
            <label className="text-xs text-muted-foreground font-semibold">Roulette Payout Odds</label>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-28">Single Number</span>
                <Input type="number" min={1} max={200} step={1} value={numberOdds} onChange={(e) => setNumberOdds(Math.max(1, parseFloat(e.target.value) || 1))} className="font-mono text-sm text-center bg-white/5 border-white/10" data-testid="input-roulette-number-odds" />
                <span className="text-xs text-muted-foreground">:1</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-28">Red / Black</span>
                <Input type="number" min={0.1} max={50} step={0.1} value={colorOdds} onChange={(e) => setColorOdds(Math.max(0.1, parseFloat(e.target.value) || 0.1))} className="font-mono text-sm text-center bg-white/5 border-white/10" data-testid="input-roulette-color-odds" />
                <span className="text-xs text-muted-foreground">:1</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-28">Even / Odd</span>
                <Input type="number" min={0.1} max={50} step={0.1} value={parityOdds} onChange={(e) => setParityOdds(Math.max(0.1, parseFloat(e.target.value) || 0.1))} className="font-mono text-sm text-center bg-white/5 border-white/10" data-testid="input-roulette-parity-odds" />
                <span className="text-xs text-muted-foreground">:1</span>
              </div>
            </div>
            <Button
              className="w-full"
              size="sm"
              variant="secondary"
              onClick={() => rouletteMutation.mutate()}
              disabled={rouletteMutation.isPending}
              data-testid="button-save-roulette-odds"
            >
              {rouletteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Roulette Odds"}
            </Button>
          </div>
        )}
        {isDogRacing && (
          <div className="border-t border-white/10 pt-4 space-y-3">
            <label className="text-xs text-muted-foreground font-semibold">Greyhound Race — Win Odds (x)</label>
            <div className="space-y-2">
              {DOG_NAMES.map((name, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-28 capitalize">{name}</span>
                  <Input
                    type="number"
                    min={1.01}
                    max={200}
                    step={0.05}
                    value={dogOdds[i] ?? DOG_DEFAULT_ODDS[i]}
                    onChange={(e) => {
                      const updated = [...dogOdds];
                      updated[i] = Math.max(1.01, parseFloat(e.target.value) || 1.01);
                      setDogOdds(updated);
                    }}
                    className="font-mono text-sm text-center bg-white/5 border-white/10"
                    data-testid={`input-dog-odds-${i}`}
                  />
                  <span className="text-xs text-muted-foreground">x</span>
                </div>
              ))}
            </div>
            <Button
              className="w-full"
              size="sm"
              variant="secondary"
              onClick={() => dogRacingMutation.mutate()}
              disabled={dogRacingMutation.isPending}
              data-testid="button-save-dog-odds"
            >
              {dogRacingMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Greyhound Odds"}
            </Button>
          </div>
        )}
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
  const [userSearch, setUserSearch] = useState("");
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

  const printVoucher = (v: { code: string; amount: number; createdAt?: string | null }) => {
    const w = window.open("", "_blank", "width=400,height=520");
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>UG Casino Voucher</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #fff; }
      .voucher { border: 3px dashed #c9a227; border-radius: 12px; padding: 24px; max-width: 340px; margin: 0 auto; text-align: center; }
      .logo { font-size: 22px; font-weight: bold; color: #c9a227; margin-bottom: 4px; }
      .subtitle { font-size: 12px; color: #666; margin-bottom: 16px; }
      .label { font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
      .code { font-size: 28px; font-weight: bold; color: #1a0a00; letter-spacing: 6px; border: 2px solid #c9a227; border-radius: 8px; padding: 10px 16px; margin: 8px 0; background: #fff9e6; }
      .amount { font-size: 22px; font-weight: bold; color: #c9a227; margin: 8px 0; }
      .date { font-size: 11px; color: #aaa; margin-top: 12px; }
      .note { font-size: 10px; color: #bbb; margin-top: 8px; border-top: 1px solid #eee; padding-top: 8px; }
    </style></head><body>
    <div class="voucher">
      <div class="logo">🎰 UG Casino</div>
      <div class="subtitle">Deposit Voucher</div>
      <div class="label">Voucher Code</div>
      <div class="code">${v.code}</div>
      <div class="label">Amount</div>
      <div class="amount">UGX ${v.amount.toLocaleString()}</div>
      <div class="date">Generated: ${v.createdAt ? new Date(v.createdAt).toLocaleString() : new Date().toLocaleString()}</div>
      <div class="note">Valid for one-time use only. Not redeemable if scratched or tampered.</div>
    </div>
    <script>window.onload = function() { window.print(); window.onafterprint = function() { window.close(); }; }</script>
    </body></html>`);
    w.document.close();
  };

  const printAllVouchers = (voucherList: { code: string; amount: number; isRedeemed: boolean }[]) => {
    const unredeemed = voucherList.filter(v => !v.isRedeemed);
    if (unredeemed.length === 0) { toast({ title: "No active vouchers to print", variant: "destructive" }); return; }
    const w = window.open("", "_blank", "width=800,height=600");
    if (!w) return;
    const rows = unredeemed.map(v => `
      <div class="voucher">
        <div class="logo">🎰 UG Casino</div>
        <div class="label">Voucher Code</div>
        <div class="code">${v.code}</div>
        <div class="amount">UGX ${v.amount.toLocaleString()}</div>
        <div class="note">One-time use only</div>
      </div>`).join("");
    w.document.write(`<!DOCTYPE html><html><head><title>UG Casino Vouchers</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 0; padding: 16px; background: #fff; }
      .grid { display: flex; flex-wrap: wrap; gap: 16px; justify-content: center; }
      .voucher { border: 2px dashed #c9a227; border-radius: 8px; padding: 16px; width: 200px; text-align: center; page-break-inside: avoid; }
      .logo { font-size: 14px; font-weight: bold; color: #c9a227; margin-bottom: 4px; }
      .label { font-size: 9px; color: #888; text-transform: uppercase; letter-spacing: 1px; }
      .code { font-size: 16px; font-weight: bold; letter-spacing: 3px; border: 1px solid #c9a227; border-radius: 4px; padding: 6px; margin: 4px 0; background: #fff9e6; }
      .amount { font-size: 16px; font-weight: bold; color: #c9a227; }
      .note { font-size: 8px; color: #bbb; margin-top: 6px; }
    </style></head><body>
    <div class="grid">${rows}</div>
    <script>window.onload = function() { window.print(); window.onafterprint = function() { window.close(); }; }</script>
    </body></html>`);
    w.document.close();
  };

  const superManagers = users?.filter(u => u.role === 'super_manager') || [];
  const managers = users?.filter(u => u.role === 'manager') || [];
  const players = users?.filter(u => u.role === 'user') || [];
  const allNonAdmin = users?.filter(u => u.role !== 'admin') || [];
  const filteredUsers = allNonAdmin.filter(u => u.username.toLowerCase().includes(userSearch.toLowerCase()));

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
                <CardTitle className="flex items-center gap-2"><Users className="w-5 h-5" /> All Users ({filteredUsers.length}{userSearch ? ` of ${allNonAdmin.length}` : ""})</CardTitle>
                <CardDescription>Promote any user to Super Manager.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-3">
                  <Input
                    placeholder="Search by username..."
                    value={userSearch}
                    onChange={e => setUserSearch(e.target.value)}
                    className="bg-white/5 border-white/10 max-w-xs"
                    data-testid="input-search-users"
                  />
                </div>
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
                      {filteredUsers.map((u) => (
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
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2"><Ticket className="w-5 h-5" /> Recent Vouchers</CardTitle>
                    {vouchers && vouchers.length > 0 && (
                      <Button size="sm" variant="outline" onClick={() => printAllVouchers(vouchers)} data-testid="button-print-all-vouchers">
                        <Printer className="w-4 h-4 mr-1" /> Print All Active
                      </Button>
                    )}
                  </div>
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
                              <div className="flex gap-1">
                                <Button size="icon" variant="ghost" onClick={() => copyToClipboard(v.code)} data-testid={`button-copy-${v.id}`}>
                                  <Copy className="w-4 h-4" />
                                </Button>
                                <Button size="icon" variant="ghost" onClick={() => printVoucher(v)} data-testid={`button-print-${v.id}`}>
                                  <Printer className="w-4 h-4" />
                                </Button>
                              </div>
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
            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Settings2 className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-bold">Game Win Probabilities</h2>
                </div>
                <p className="text-sm text-muted-foreground mb-4">Set the win probability percentage for each game. Higher values mean players win more often.</p>
                {gameSettingsLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {gameSettings?.filter(s => ACTIVE_GAME_TYPES.includes(s.gameType)).map((s) => (
                      <GameSettingCard key={s.id} setting={s} />
                    ))}
                  </div>
                )}
              </div>
              <FishJoyOddsCard />
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
