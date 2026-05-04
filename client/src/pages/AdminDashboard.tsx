import { ProtectedLayout } from "@/components/layout/ProtectedLayout";
import { DirectCreditDialog } from "@/components/DirectCreditDialog";
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
import { Shield, Plus, Users, Ticket, Copy, Banknote, CheckCircle, Loader2, Ban, Trash2, ArrowUpCircle, KeyRound, UserCog, Lock, BarChart3, Settings2, ChevronUp, ChevronDown, Megaphone, Calculator, Phone, CircleDot, Crown, Briefcase, Printer, Music, Upload, X, Palette, Clock } from "lucide-react";
import { AppearanceControl } from "@/components/AppearanceControl";
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
import { GameAccessControl } from "@/components/GameAccessControl";
import { MessageCircle, Globe } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { apiRequest } from "@/lib/queryClient";

type GameFormData = z.infer<typeof updateGameSettingsSchema>;

type UniversalHouseEdgeData = {
  id: number;
  enabled: boolean;
  houseEdgePct: number;
  minHouseBalance: number;
  totalBet: number;
  totalPaid: number;
  bankroll: number;
  currentRTP: number;
  bypassClassicSlotsBankroll: boolean;
  bypassHorse4Bankroll: boolean;
};

function UniversalHouseEdgePanel() {
  const { toast } = useToast();
  const { data, isLoading } = useQuery<UniversalHouseEdgeData>({
    queryKey: ['/api/admin/universal-house-edge'],
    refetchInterval: 5000,
  });
  const [houseEdgePct, setHouseEdgePct] = useState<string>("");
  const [minHouseBalance, setMinHouseBalance] = useState<string>("");
  const loadedRef = useRef(false);
  useEffect(() => {
    if (data && !loadedRef.current) {
      loadedRef.current = true;
      setHouseEdgePct(String(data.houseEdgePct));
      setMinHouseBalance(String(data.minHouseBalance));
    }
  }, [data]);

  const update = useMutation({
    mutationFn: async (body: { enabled?: boolean; houseEdgePct?: number; minHouseBalance?: number; bypassClassicSlotsBankroll?: boolean; bypassHorse4Bankroll?: boolean }) => {
      const res = await apiRequest("PATCH", "/api/admin/universal-house-edge", body);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/universal-house-edge'] });
      toast({ title: "Saved", description: "Universal house edge updated." });
    },
    onError: () => toast({ title: "Failed to save", variant: "destructive" }),
  });

  const reset = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/universal-house-edge/reset-stats", {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/universal-house-edge'] });
      toast({ title: "Stats reset" });
    },
  });

  const resetBankroll = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/house-bankroll/reset", {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/universal-house-edge'] });
      queryClient.invalidateQueries({ queryKey: ['/api/games/settings'] });
      toast({ title: "House bankroll counters reset", description: "All per-game and universal totalBet/totalPaid have been zeroed." });
    },
    onError: () => toast({ title: "Reset failed", variant: "destructive" }),
  });

  if (isLoading || !data) {
    return <Card className="glass-card"><CardContent className="py-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin" /></CardContent></Card>;
  }

  const fmt = (n: number) => n.toLocaleString();
  const rtpPct = (data.currentRTP * 100).toFixed(2);
  const targetRtpPct = (100 - data.houseEdgePct).toFixed(2);
  const bankrollLow = data.minHouseBalance > 0 && data.bankroll < data.minHouseBalance;

  return (
    <Card className="glass-card border-amber-500/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-amber-400">
          <Globe className="w-5 h-5" /> Universal House Edge
          {data.enabled && <Badge className="ml-2 bg-amber-500 text-black" data-testid="badge-universal-active">ACTIVE</Badge>}
        </CardTitle>
        <CardDescription>
          When enabled, this single configuration overrides every per-game house edge. Wins are also blocked
          whenever the combined house bankroll (admin + super managers + managers) would fall below the minimum.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-center justify-between p-3 rounded-md bg-white/5 border border-white/10">
          <div>
            <p className="font-semibold">Enable universal house edge</p>
            <p className="text-xs text-muted-foreground">Overrides all per-game house edge settings.</p>
          </div>
          <Switch
            checked={data.enabled}
            onCheckedChange={(v) => update.mutate({ enabled: v })}
            data-testid="switch-universal-enabled"
          />
        </div>

        <div className="flex items-center justify-between p-3 rounded-md bg-white/5 border border-white/10">
          <div>
            <p className="font-semibold">Allow Classic Slots below bankroll floor</p>
            <p className="text-xs text-muted-foreground">When ON, Classic Slots ignores the minimum-bankroll check and stays playable. The win-side cap still applies, so any payout that would breach the floor is voided server-side.</p>
          </div>
          <Switch
            checked={!!data.bypassClassicSlotsBankroll}
            onCheckedChange={(v) => update.mutate({ bypassClassicSlotsBankroll: v })}
            data-testid="switch-bypass-classic-slots-bankroll"
          />
        </div>

        <div className="flex items-center justify-between p-3 rounded-md bg-white/5 border border-white/10">
          <div>
            <p className="font-semibold">Allow 8-Horse Racing below bankroll floor</p>
            <p className="text-xs text-muted-foreground">When ON, the 8-Horse race ignores the minimum-bankroll check and stays playable even when a player could dutching-bet across all 8 horses. Excessive payouts are still voided server-side.</p>
          </div>
          <Switch
            checked={!!data.bypassHorse4Bankroll}
            onCheckedChange={(v) => update.mutate({ bypassHorse4Bankroll: v })}
            data-testid="switch-bypass-horse4-bankroll"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs uppercase text-muted-foreground font-bold">House Edge %</label>
            <div className="flex gap-2">
              <Input
                type="number" step="0.1" min="0" max="100"
                value={houseEdgePct}
                onChange={(e) => setHouseEdgePct(e.target.value)}
                data-testid="input-universal-house-edge-pct"
              />
              <Button
                onClick={() => update.mutate({ houseEdgePct: Number(houseEdgePct) })}
                disabled={update.isPending}
                data-testid="button-save-universal-house-edge-pct"
              >Save</Button>
            </div>
            <p className="text-xs text-muted-foreground">Target RTP: {targetRtpPct}%</p>
          </div>
          <div className="space-y-2">
            <label className="text-xs uppercase text-muted-foreground font-bold">Min House Bankroll (UGX)</label>
            <div className="flex gap-2">
              <Input
                type="number" step="1000" min="0"
                value={minHouseBalance}
                onChange={(e) => setMinHouseBalance(e.target.value)}
                data-testid="input-universal-min-bankroll"
              />
              <Button
                onClick={() => update.mutate({ minHouseBalance: Math.max(0, Math.floor(Number(minHouseBalance))) })}
                disabled={update.isPending}
                data-testid="button-save-universal-min-bankroll"
              >Save</Button>
            </div>
            <p className="text-xs text-muted-foreground">Wins are denied if they would drop the bankroll below this.</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 rounded-md bg-white/5 border border-white/10">
            <p className="text-[10px] uppercase text-muted-foreground">House Bankroll</p>
            <p className={`text-lg font-bold ${bankrollLow ? 'text-red-400' : 'text-amber-400'}`} data-testid="text-house-bankroll">{fmt(data.bankroll)}</p>
            {bankrollLow && <p className="text-[10px] text-red-400">Below minimum — wins blocked</p>}
          </div>
          <div className="p-3 rounded-md bg-white/5 border border-white/10">
            <p className="text-[10px] uppercase text-muted-foreground">Total Bet</p>
            <p className="text-lg font-bold" data-testid="text-universal-total-bet">{fmt(data.totalBet)}</p>
          </div>
          <div className="p-3 rounded-md bg-white/5 border border-white/10">
            <p className="text-[10px] uppercase text-muted-foreground">Total Paid</p>
            <p className="text-lg font-bold" data-testid="text-universal-total-paid">{fmt(data.totalPaid)}</p>
          </div>
          <div className="p-3 rounded-md bg-white/5 border border-white/10">
            <p className="text-[10px] uppercase text-muted-foreground">Current RTP</p>
            <p className="text-lg font-bold" data-testid="text-universal-current-rtp">{rtpPct}%</p>
            <p className="text-[10px] text-muted-foreground">Target: {targetRtpPct}%</p>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline" size="sm"
            onClick={() => reset.mutate()}
            disabled={reset.isPending}
            data-testid="button-reset-universal-stats"
          >Reset Universal Stats</Button>
          <Button
            variant="destructive" size="sm"
            onClick={() => {
              if (window.confirm("Reset every game's totalBet/totalPaid counters AND the universal counters? Player balances and house bankroll are NOT affected — only the RTP-tracking stats.")) {
                resetBankroll.mutate();
              }
            }}
            disabled={resetBankroll.isPending}
            data-testid="button-reset-house-bankroll"
          >Reset House Bankroll Stats</Button>
        </div>
      </CardContent>
    </Card>
  );
}

const FISH_JOY_NAMES = ['Tiny Fish','Small Fish','Sea Fish','Stripe Fish','Angel Fish','Puffer Fish','Sword Fish','Bat Fish','Coral Fish','Bull Fish','Shark','Giant Shark'];
const FISH_JOY_DEFAULT_ODDS     = [2, 4, 6, 10, 15, 25, 40, 60, 80, 100, 150, 300];
const FISH_JOY_DEFAULT_WIN_RATES = [55, 50, 45, 40, 35, 30, 25, 20, 15, 10, 5, 2];

function FishJoyOddsCard() {
  const { toast } = useToast();
  const [odds,     setOdds]     = useState<number[]>(FISH_JOY_DEFAULT_ODDS);
  const [winRates, setWinRates] = useState<number[]>(FISH_JOY_DEFAULT_WIN_RATES);
  const { data: settings } = useQuery<{ fishOdds: number[]; fishWinRates?: number[] }>({ queryKey: ["/api/games/fishjoy/settings"] });
  const loadedRef = useRef(false);
  useEffect(() => {
    if (settings && !loadedRef.current) {
      loadedRef.current = true;
      if (settings.fishOdds)     setOdds(settings.fishOdds);
      if (settings.fishWinRates) setWinRates(settings.fishWinRates);
    }
  }, [settings]);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/games/fishjoy/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fishOdds: odds, fishWinRates: winRates }),
      });
      if (!res.ok) throw new Error("Failed to save");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/games/fishjoy/settings"] });
      toast({ title: "Fish Joy Updated", description: "Fish odds and win rates saved." });
    },
  });

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">🐟 Fish Joy — Per-Fish Settings</CardTitle>
        <CardDescription>Set the payout multiplier (×Bet) and win chance (%) independently for each fish type.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 mb-4">
          {FISH_JOY_NAMES.map((name, i) => (
            <div key={i} className="flex flex-col gap-1.5 border border-white/5 rounded-lg p-2.5 bg-white/2">
              <span className="text-xs font-semibold text-[#D4AF37]">{name}</span>
              <div className="flex gap-2 items-center">
                <div className="flex-1">
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Odds (×Bet)</label>
                  <Input
                    type="number"
                    min={0.1}
                    step={0.5}
                    value={odds[i]}
                    onChange={e => {
                      const v = parseFloat(e.target.value) || 1;
                      setOdds(prev => { const n = [...prev]; n[i] = v; return n; });
                    }}
                    className="bg-white/5 border-white/10 h-7 text-sm mt-0.5"
                    data-testid={`input-fish-odds-${i}`}
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Win Rate (%)</label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    value={winRates[i]}
                    onChange={e => {
                      const v = Math.min(100, Math.max(0, parseFloat(e.target.value) || 0));
                      setWinRates(prev => { const n = [...prev]; n[i] = v; return n; });
                    }}
                    className="bg-white/5 border-white/10 h-7 text-sm mt-0.5"
                    data-testid={`input-fish-winrate-${i}`}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
        <Button onClick={() => mutation.mutate()} disabled={mutation.isPending} size="sm" data-testid="button-save-fish-odds">
          {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Fish Settings"}
        </Button>
      </CardContent>
    </Card>
  );
}

const ACTIVE_GAME_TYPES = ["classic-slots", "roulette", "dice", "hilo", "coinflip", "plinko", "wheel", "fishhunt", "dog-racing", "horse4", "horse-js", "aviator"];

type GameSchedule = {
  id: number;
  gameType: string;
  label: string;
  startTime: string;
  endTime: string;
  daysOfWeek: string;
  winChancePct: number | null;
  payoutMultiplier: number | null;
  enabled: boolean;
};

const DOW_LABELS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

function ScheduleManager() {
  const { toast } = useToast();
  const { data: schedules = [], isLoading } = useQuery<GameSchedule[]>({ queryKey: ["/api/admin/game-schedules"] });
  const [gameType, setGameType] = useState<string>("roulette");
  const [label, setLabel] = useState("");
  const [startTime, setStartTime] = useState("18:00");
  const [endTime, setEndTime] = useState("22:00");
  const [days, setDays] = useState<Set<string>>(new Set(["0","1","2","3","4","5","6"]));
  const [winChancePct, setWinChancePct] = useState<string>("");
  const [payoutMultiplier, setPayoutMultiplier] = useState<string>("");
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["/api/admin/game-schedules"] });

  const createMut = useMutation({
    mutationFn: async () => {
      const body: any = {
        gameType, label: label || `${gameType} ${startTime}-${endTime}`,
        startTime, endTime,
        daysOfWeek: Array.from(days).sort().join(",") || "0,1,2,3,4,5,6",
        enabled: true,
      };
      if (winChancePct !== "") body.winChancePct = parseFloat(winChancePct);
      if (payoutMultiplier !== "") body.payoutMultiplier = parseFloat(payoutMultiplier);
      const res = await fetch("/api/admin/game-schedules", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error((await res.json()).message || "Failed");
      return res.json();
    },
    onSuccess: () => { invalidate(); setLabel(""); setWinChancePct(""); setPayoutMultiplier(""); toast({ title: "Schedule added", description: "It will apply at the next minute tick." }); },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const toggleMut = useMutation({
    mutationFn: async ({ id, enabled }: { id: number; enabled: boolean }) => {
      const res = await fetch(`/api/admin/game-schedules/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled }) });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => invalidate(),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/admin/game-schedules/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => invalidate(),
  });

  const toggleDay = (d: string) => setDays(prev => { const n = new Set(prev); n.has(d) ? n.delete(d) : n.add(d); return n; });

  return (
    <div className="space-y-6">
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Plus className="w-4 h-4" /> Add Auto Schedule</CardTitle>
          <CardDescription>Define a time window during which a game's win-chance and/or payout-multiplier are applied automatically. Leave a value blank to skip changing it.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Game</label>
              <select value={gameType} onChange={e => setGameType(e.target.value)} className="w-full mt-1 bg-white/5 border border-white/10 rounded h-9 px-2 text-sm" data-testid="select-schedule-game">
                {ACTIVE_GAME_TYPES.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Label (optional)</label>
              <Input value={label} onChange={e => setLabel(e.target.value)} placeholder="Evening rush" className="bg-white/5 border-white/10 h-9 mt-1" data-testid="input-schedule-label" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Start (HH:MM, 24h)</label>
              <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="bg-white/5 border-white/10 h-9 mt-1" data-testid="input-schedule-start" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">End (HH:MM, 24h)</label>
              <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="bg-white/5 border-white/10 h-9 mt-1" data-testid="input-schedule-end" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Win Chance %</label>
              <Input type="number" min={0} max={100} step={1} value={winChancePct} onChange={e => setWinChancePct(e.target.value)} placeholder="e.g. 25" className="bg-white/5 border-white/10 h-9 mt-1 font-mono" data-testid="input-schedule-winchance" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Payout Multiplier (x)</label>
              <Input type="number" min={1.01} max={100} step={0.05} value={payoutMultiplier} onChange={e => setPayoutMultiplier(e.target.value)} placeholder="e.g. 1.8" className="bg-white/5 border-white/10 h-9 mt-1 font-mono" data-testid="input-schedule-multiplier" />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Days</label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {DOW_LABELS.map((lbl, i) => {
                const v = String(i);
                const on = days.has(v);
                return (
                  <button key={v} type="button" onClick={() => toggleDay(v)} className={`px-2.5 py-1 rounded text-xs border transition ${on ? "bg-primary text-primary-foreground border-primary" : "bg-white/5 border-white/10 text-muted-foreground"}`} data-testid={`button-day-${v}`}>
                    {lbl}
                  </button>
                );
              })}
            </div>
          </div>
          <Button size="sm" onClick={() => createMut.mutate()} disabled={createMut.isPending || (!winChancePct && !payoutMultiplier) || days.size === 0} data-testid="button-add-schedule">
            {createMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add Schedule"}
          </Button>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Clock className="w-4 h-4" /> Active Schedules ({schedules.length})</CardTitle>
          <CardDescription>The background scheduler reapplies these every minute. Last-defined active rule per game wins. Overnight windows (e.g. 22:00–02:00) are supported.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : schedules.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No schedules yet. Add one above.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10">
                    <TableHead>Game</TableHead>
                    <TableHead>Label</TableHead>
                    <TableHead>Window</TableHead>
                    <TableHead>Days</TableHead>
                    <TableHead className="text-right">Win %</TableHead>
                    <TableHead className="text-right">Payout x</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schedules.map((s) => (
                    <TableRow key={s.id} className="border-white/10" data-testid={`row-schedule-${s.id}`}>
                      <TableCell className="font-medium capitalize">{s.gameType}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{s.label}</TableCell>
                      <TableCell className="font-mono text-xs">{s.startTime}–{s.endTime}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{s.daysOfWeek.split(",").map(d => DOW_LABELS[parseInt(d)]).join(" ")}</TableCell>
                      <TableCell className="text-right font-mono">{s.winChancePct == null ? "—" : `${s.winChancePct}%`}</TableCell>
                      <TableCell className="text-right font-mono">{s.payoutMultiplier == null ? "—" : `${s.payoutMultiplier}x`}</TableCell>
                      <TableCell>
                        <Badge variant={s.enabled ? "default" : "secondary"} className="text-[10px]">{s.enabled ? "Enabled" : "Paused"}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 justify-end">
                          <Button size="sm" variant="ghost" onClick={() => toggleMut.mutate({ id: s.id, enabled: !s.enabled })} disabled={toggleMut.isPending} data-testid={`button-toggle-schedule-${s.id}`}>
                            {s.enabled ? "Pause" : "Resume"}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => { if (confirm("Delete this schedule?")) deleteMut.mutate(s.id); }} disabled={deleteMut.isPending} data-testid={`button-delete-schedule-${s.id}`}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


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
  const isPlinko = setting.gameType === "plinko";
  const isWheel = setting.gameType === "wheel";
  const PLINKO_DEFAULTS = [0.2, 0.5, 1.2, 2, 5, 2, 1.2, 0.5, 0.2];
  const WHEEL_DEFAULTS = [0, 0.5, 0, 1, 0, 1.5, 0, 2, 0, 0.5, 0, 3, 0, 1, 5, 10];
  const extraParsed = (() => { try { return setting.extraSettings ? JSON.parse(setting.extraSettings) : {}; } catch { return {}; } })();
  const [plinkoMults, setPlinkoMults] = useState<number[]>(
    Array.isArray(extraParsed.multipliers) && extraParsed.multipliers.length === 9 ? extraParsed.multipliers : PLINKO_DEFAULTS
  );
  const [wheelMults, setWheelMults] = useState<number[]>(
    Array.isArray(extraParsed.multipliers) && extraParsed.multipliers.length === 16 ? extraParsed.multipliers : WHEEL_DEFAULTS
  );
  // Re-sync from server payload whenever extraSettings changes (e.g. after a refetch
  // or after the admin saves on a different tab) so the inputs don't show stale values.
  useEffect(() => {
    if (isPlinko && Array.isArray(extraParsed.multipliers) && extraParsed.multipliers.length === 9) {
      setPlinkoMults(extraParsed.multipliers);
    }
    if (isWheel && Array.isArray(extraParsed.multipliers) && extraParsed.multipliers.length === 16) {
      setWheelMults(extraParsed.multipliers);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setting.extraSettings]);
  const [maxLaps, setMaxLaps] = useState<number>(extraParsed.maxLaps ?? 1);
  const defaultPlaceFor = (arr: number[]) => arr.map(o => Math.max(1.05, +(o * 0.45).toFixed(2)));
  const defaultShowFor = (arr: number[]) => arr.map(o => Math.max(1.02, +(o * 0.25).toFixed(2)));
  const horseJsDefault = [2.0, 2.5, 3.0, 3.5];
  const [horseOdds, setHorseOdds] = useState<number[]>(extraParsed.odds ?? horseJsDefault);
  const [horsePlaceOdds, setHorsePlaceOdds] = useState<number[]>(extraParsed.placeOdds ?? defaultPlaceFor(extraParsed.odds ?? horseJsDefault));
  const [horseShowOdds, setHorseShowOdds] = useState<number[]>(extraParsed.showOdds ?? defaultShowFor(extraParsed.odds ?? horseJsDefault));
  const [horse4Odds, setHorse4Odds] = useState<number[]>(extraParsed.odds ?? HORSE4_DEFAULT_ODDS);
  const [horse4PlaceOdds, setHorse4PlaceOdds] = useState<number[]>(extraParsed.placeOdds ?? defaultPlaceFor(extraParsed.odds ?? HORSE4_DEFAULT_ODDS));
  const [horse4ShowOdds, setHorse4ShowOdds] = useState<number[]>(extraParsed.showOdds ?? defaultShowFor(extraParsed.odds ?? HORSE4_DEFAULT_ODDS));
  const [dogOdds, setDogOdds] = useState<number[]>(extraParsed.odds ?? DOG_DEFAULT_ODDS);
  const [dogPlaceOdds, setDogPlaceOdds] = useState<number[]>(extraParsed.placeOdds ?? defaultPlaceFor(extraParsed.odds ?? DOG_DEFAULT_ODDS));
  const [dogShowOdds, setDogShowOdds] = useState<number[]>(extraParsed.showOdds ?? defaultShowFor(extraParsed.odds ?? DOG_DEFAULT_ODDS));
  const [numberOdds, setNumberOdds] = useState<number>(extraParsed.numberOdds ?? 35);
  const [colorOdds, setColorOdds] = useState<number>(extraParsed.colorOdds ?? 1);
  const [parityOdds, setParityOdds] = useState<number>(extraParsed.parityOdds ?? 1);
  const [houseEdgePct, setHouseEdgePct] = useState<number>((setting as any).houseEdgePct ?? 5);
  const [highBetThreshold, setHighBetThreshold] = useState<number>((setting as any).highBetThreshold ?? 0);
  const [highBetMult, setHighBetMult] = useState<number>((setting as any).highBetWagerMultiplier ?? 5);
  const totalBet = (setting as any).totalBet ?? 0;
  const totalPaid = (setting as any).totalPaid ?? 0;
  const actualRtp = totalBet > 0 ? ((totalPaid / totalBet) * 100).toFixed(1) : "—";

  const houseEdgeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/games/settings/house-edge", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameType: setting.gameType,
          houseEdgePct,
          highBetThreshold,
          highBetWagerMultiplier: highBetMult,
        }),
      });
      if (!res.ok) throw new Error("Failed to update house edge");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.games.settings.get.path] });
      toast({ title: "House Edge Updated", description: `${setting.gameType} house edge set to ${houseEdgePct}%.` });
    },
  });

  const resetStatsMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/games/settings/reset-stats", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameType: setting.gameType }),
      });
      if (!res.ok) throw new Error("Failed to reset stats");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.games.settings.get.path] });
      toast({ title: "Stats Reset", description: `${setting.gameType} totals cleared.` });
    },
  });

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
        body: JSON.stringify({ maxLaps, odds: horseOdds, placeOdds: horsePlaceOdds, showOdds: horseShowOdds }),
      });
      if (!res.ok) throw new Error("Failed to update horse-js settings");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.games.settings.get.path] });
      toast({ title: "Horse Race Updated", description: "Max laps and Win/Place/Show odds saved." });
    },
  });

  const horse4Mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/games/horse4/settings", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ odds: horse4Odds, placeOdds: horse4PlaceOdds, showOdds: horse4ShowOdds }),
      });
      if (!res.ok) throw new Error("Failed to update horse4 settings");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.games.settings.get.path] });
      toast({ title: "Horse4 Updated", description: "8-horse Win/Place/Show odds saved." });
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

  const plinkoMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/games/plinko/settings", {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ multipliers: plinkoMults }),
      });
      if (!res.ok) throw new Error("Failed to update plinko multipliers");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.games.settings.get.path] });
      queryClient.invalidateQueries({ queryKey: ["/api/games/plinko/settings"] });
      toast({ title: "Plinko Updated", description: "Slot multipliers saved." });
    },
  });

  const wheelMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/games/wheel/settings", {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ multipliers: wheelMults }),
      });
      if (!res.ok) throw new Error("Failed to update wheel multipliers");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.games.settings.get.path] });
      queryClient.invalidateQueries({ queryKey: ["/api/games/wheel/settings"] });
      toast({ title: "Wheel Updated", description: "Segment multipliers saved." });
    },
  });

  const dogRacingMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/games/dog-racing/settings", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ odds: dogOdds, placeOdds: dogPlaceOdds, showOdds: dogShowOdds }),
      });
      if (!res.ok) throw new Error("Failed to update dog racing settings");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.games.settings.get.path] });
      toast({ title: "Dog Racing Updated", description: "Greyhound Win/Place/Show odds saved." });
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
        <div className="border-t border-white/10 pt-4 space-y-3">
          <label className="text-xs text-muted-foreground font-semibold">House Edge & High-Bet Protection</label>
          <div>
            <label className="text-[11px] text-muted-foreground">House Edge % (auto-balance to keep this margin)</label>
            <Input
              type="number" min={0} max={99} step={0.5}
              value={houseEdgePct}
              onChange={(e) => setHouseEdgePct(Math.min(99, Math.max(0, parseFloat(e.target.value) || 0)))}
              className="font-mono text-sm text-center bg-white/5 border-white/10 mt-1"
              data-testid={`input-house-edge-${setting.gameType}`}
            />
          </div>
          <div>
            <label className="text-[11px] text-muted-foreground">High-Bet Threshold (UGX) — 0 = disabled</label>
            <Input
              type="number" min={0} step={1000}
              value={highBetThreshold}
              onChange={(e) => setHighBetThreshold(Math.max(0, parseInt(e.target.value) || 0))}
              className="font-mono text-sm text-center bg-white/5 border-white/10 mt-1"
              data-testid={`input-high-bet-threshold-${setting.gameType}`}
            />
          </div>
          <div>
            <label className="text-[11px] text-muted-foreground">Wager Multiplier (player must wager threshold × this much first)</label>
            <Input
              type="number" min={1} step={1}
              value={highBetMult}
              onChange={(e) => setHighBetMult(Math.max(1, parseInt(e.target.value) || 1))}
              className="font-mono text-sm text-center bg-white/5 border-white/10 mt-1"
              data-testid={`input-high-bet-mult-${setting.gameType}`}
            />
          </div>
          <div className="text-[11px] text-muted-foreground bg-black/30 rounded p-2 font-mono space-y-0.5">
            <div>Total Bet: {totalBet.toLocaleString()} UGX</div>
            <div>Total Paid: {totalPaid.toLocaleString()} UGX</div>
            <div>Actual RTP: {actualRtp}% (target: {(100 - houseEdgePct).toFixed(1)}%)</div>
          </div>
          <div className="flex gap-2">
            <Button
              className="flex-1" size="sm" variant="secondary"
              onClick={() => houseEdgeMutation.mutate()}
              disabled={houseEdgeMutation.isPending}
              data-testid={`button-save-house-edge-${setting.gameType}`}
            >
              {houseEdgeMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
            <Button
              size="sm" variant="outline"
              onClick={() => { if (confirm("Reset bet/paid totals for this game?")) resetStatsMutation.mutate(); }}
              disabled={resetStatsMutation.isPending}
              data-testid={`button-reset-stats-${setting.gameType}`}
            >
              {resetStatsMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Reset Stats"}
            </Button>
          </div>
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
              <div className="grid grid-cols-[72px_repeat(3,minmax(72px,1fr))] gap-2 items-center text-[11px] text-muted-foreground">
                <span>Horse</span>
                <span className="text-center">Win</span>
                <span className="text-center">Place</span>
                <span className="text-center">Show</span>
              </div>
              {horseOdds.map((odd, i) => (
                <div key={i} className="grid grid-cols-[72px_repeat(3,minmax(72px,1fr))] gap-2 items-center">
                  <span className="text-xs text-muted-foreground">{(['White','Blue','Green','Brown'])[i]}</span>
                  <Input type="number" min={1.01} max={100} step={0.1} value={odd}
                    onChange={(e) => { const u=[...horseOdds]; u[i]=Math.max(1.01, parseFloat(e.target.value)||1.01); setHorseOdds(u); }}
                    className="font-mono text-xs text-center bg-white/5 border-white/10 h-8"
                    data-testid={`input-horse-js-odds-${i}`} />
                  <Input type="number" min={1.01} max={100} step={0.1} value={horsePlaceOdds[i] ?? 1.5}
                    onChange={(e) => { const u=[...horsePlaceOdds]; u[i]=Math.max(1.01, parseFloat(e.target.value)||1.01); setHorsePlaceOdds(u); }}
                    className="font-mono text-xs text-center bg-white/5 border-white/10 h-8"
                    data-testid={`input-horse-js-place-odds-${i}`} />
                  <Input type="number" min={1.01} max={100} step={0.1} value={horseShowOdds[i] ?? 1.2}
                    onChange={(e) => { const u=[...horseShowOdds]; u[i]=Math.max(1.01, parseFloat(e.target.value)||1.01); setHorseShowOdds(u); }}
                    className="font-mono text-xs text-center bg-white/5 border-white/10 h-8"
                    data-testid={`input-horse-js-show-odds-${i}`} />
                </div>
              ))}
              <p className="text-[10px] text-muted-foreground italic">Win=1st only · Place=top 2 · Show=top 3</p>
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
            <label className="text-xs text-muted-foreground font-semibold">8-Horse Race — Win / Place / Show Odds (x)</label>
            <div className="space-y-1">
              <div className="grid grid-cols-[72px_repeat(3,minmax(72px,1fr))] gap-2 items-center text-[11px] text-muted-foreground">
                <span>Horse</span>
                <span className="text-center">Win</span>
                <span className="text-center">Place</span>
                <span className="text-center">Show</span>
              </div>
              {HORSE4_NAMES.map((name, i) => (
                <div key={i} className="grid grid-cols-[72px_repeat(3,minmax(72px,1fr))] gap-2 items-center">
                  <span className="text-xs text-muted-foreground capitalize truncate">{name}</span>
                  <Input type="number" min={1.01} max={200} step={0.05} value={horse4Odds[i] ?? HORSE4_DEFAULT_ODDS[i]}
                    onChange={(e) => { const u=[...horse4Odds]; u[i]=Math.max(1.01, parseFloat(e.target.value)||1.01); setHorse4Odds(u); }}
                    className="font-mono text-xs text-center bg-white/5 border-white/10 h-8"
                    data-testid={`input-horse4-odds-${i}`} />
                  <Input type="number" min={1.01} max={200} step={0.05} value={horse4PlaceOdds[i] ?? 1.5}
                    onChange={(e) => { const u=[...horse4PlaceOdds]; u[i]=Math.max(1.01, parseFloat(e.target.value)||1.01); setHorse4PlaceOdds(u); }}
                    className="font-mono text-xs text-center bg-white/5 border-white/10 h-8"
                    data-testid={`input-horse4-place-odds-${i}`} />
                  <Input type="number" min={1.01} max={200} step={0.05} value={horse4ShowOdds[i] ?? 1.2}
                    onChange={(e) => { const u=[...horse4ShowOdds]; u[i]=Math.max(1.01, parseFloat(e.target.value)||1.01); setHorse4ShowOdds(u); }}
                    className="font-mono text-xs text-center bg-white/5 border-white/10 h-8"
                    data-testid={`input-horse4-show-odds-${i}`} />
                </div>
              ))}
              <p className="text-[10px] text-muted-foreground italic">Win=1st only · Place=top 2 · Show=top 3 (the imported game currently uses Win odds in-game; Place/Show are stored for upcoming side-bet support)</p>
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
        {isPlinko && (
          <div className="border-t border-white/10 pt-4 space-y-3">
            <label className="text-xs text-muted-foreground font-semibold">Plinko Slot Multipliers (9 slots, left → right)</label>
            <div className="grid grid-cols-9 gap-1">
              {plinkoMults.map((m, i) => (
                <Input key={i} type="number" min={0} max={1000} step={0.1} value={m}
                  onChange={(e) => { const u=[...plinkoMults]; u[i]=Math.max(0, parseFloat(e.target.value)||0); setPlinkoMults(u); }}
                  className="font-mono text-xs text-center bg-white/5 border-white/10 h-9 px-1"
                  data-testid={`input-plinko-mult-${i}`} />
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground italic">Outer slots = miss / low. Center slots = win. Set 0 for instant loss on that slot.</p>
            <Button className="w-full" size="sm" variant="secondary" onClick={() => plinkoMutation.mutate()} disabled={plinkoMutation.isPending} data-testid="button-save-plinko-mults">
              {plinkoMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Plinko Multipliers"}
            </Button>
          </div>
        )}
        {isWheel && (
          <div className="border-t border-white/10 pt-4 space-y-3">
            <label className="text-xs text-muted-foreground font-semibold">Wheel Segment Multipliers (16 segments, clockwise from top)</label>
            <div className="grid grid-cols-8 gap-1">
              {wheelMults.map((m, i) => (
                <div key={i} className="flex flex-col items-center gap-1">
                  <span className="text-[9px] text-muted-foreground font-mono">#{i+1}</span>
                  <Input type="number" min={0} max={1000} step={0.5} value={m}
                    onChange={(e) => { const u=[...wheelMults]; u[i]=Math.max(0, parseFloat(e.target.value)||0); setWheelMults(u); }}
                    className="font-mono text-xs text-center bg-white/5 border-white/10 h-9 px-1"
                    data-testid={`input-wheel-mult-${i}`} />
                </div>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground italic">Set 0 for a MISS segment. The wheel UI auto-colors segments by payout tier.</p>
            <Button className="w-full" size="sm" variant="secondary" onClick={() => wheelMutation.mutate()} disabled={wheelMutation.isPending} data-testid="button-save-wheel-mults">
              {wheelMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Wheel Multipliers"}
            </Button>
          </div>
        )}
        {isDogRacing && (
          <div className="border-t border-white/10 pt-4 space-y-3">
            <label className="text-xs text-muted-foreground font-semibold">Greyhound Race — Win / Place / Show Odds (x)</label>
            <div className="space-y-1">
              <div className="grid grid-cols-[72px_repeat(3,minmax(72px,1fr))] gap-2 items-center text-[11px] text-muted-foreground">
                <span>Dog</span>
                <span className="text-center">Win</span>
                <span className="text-center">Place</span>
                <span className="text-center">Show</span>
              </div>
              {DOG_NAMES.map((name, i) => (
                <div key={i} className="grid grid-cols-[72px_repeat(3,minmax(72px,1fr))] gap-2 items-center">
                  <span className="text-xs text-muted-foreground capitalize truncate">{name}</span>
                  <Input type="number" min={1.01} max={200} step={0.05} value={dogOdds[i] ?? DOG_DEFAULT_ODDS[i]}
                    onChange={(e) => { const u=[...dogOdds]; u[i]=Math.max(1.01, parseFloat(e.target.value)||1.01); setDogOdds(u); }}
                    className="font-mono text-xs text-center bg-white/5 border-white/10 h-8"
                    data-testid={`input-dog-odds-${i}`} />
                  <Input type="number" min={1.01} max={200} step={0.05} value={dogPlaceOdds[i] ?? 1.5}
                    onChange={(e) => { const u=[...dogPlaceOdds]; u[i]=Math.max(1.01, parseFloat(e.target.value)||1.01); setDogPlaceOdds(u); }}
                    className="font-mono text-xs text-center bg-white/5 border-white/10 h-8"
                    data-testid={`input-dog-place-odds-${i}`} />
                  <Input type="number" min={1.01} max={200} step={0.05} value={dogShowOdds[i] ?? 1.2}
                    onChange={(e) => { const u=[...dogShowOdds]; u[i]=Math.max(1.01, parseFloat(e.target.value)||1.01); setDogShowOdds(u); }}
                    className="font-mono text-xs text-center bg-white/5 border-white/10 h-8"
                    data-testid={`input-dog-show-odds-${i}`} />
                </div>
              ))}
              <p className="text-[10px] text-muted-foreground italic">Win=1st only · Place=top 2 · Show=top 3 (the imported game currently uses Win odds in-game; Place/Show are stored for upcoming side-bet support)</p>
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
            <TabsTrigger value="gameaccess" data-testid="tab-gameaccess"><Lock className="w-3 h-3 mr-1" /> Game Access</TabsTrigger>
            <TabsTrigger value="schedules" data-testid="tab-schedules"><Clock className="w-3 h-3 mr-1" /> Auto Schedule</TabsTrigger>
            <TabsTrigger value="reports" data-testid="tab-reports">Reports</TabsTrigger>
            <TabsTrigger value="profit" data-testid="tab-profit"><Calculator className="w-3 h-3 mr-1" /> Profit Calculator</TabsTrigger>
            <TabsTrigger value="broadcast" data-testid="tab-broadcast"><Megaphone className="w-3 h-3 mr-1" /> Broadcast</TabsTrigger>
            <TabsTrigger value="chat" data-testid="tab-chat"><MessageCircle className="w-3 h-3 mr-1" /> Chat</TabsTrigger>
            <TabsTrigger value="security" data-testid="tab-security">Security</TabsTrigger>
            <TabsTrigger value="settings" data-testid="tab-settings">Account</TabsTrigger>
            <TabsTrigger value="audio" data-testid="tab-audio"><Music className="w-3 h-3 mr-1" /> Music</TabsTrigger>
            <TabsTrigger value="appearance" data-testid="tab-appearance"><Palette className="w-3 h-3 mr-1" /> Appearance</TabsTrigger>
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
                              <DirectCreditDialog userId={u.id} username={u.username} currentBalance={u.balance} invalidateKeys={[api.admin.users.path]} />
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
              <UniversalHouseEdgePanel />
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

          <TabsContent value="gameaccess" className="mt-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-bold">Game Access Control</h2>
              </div>
              <GameAccessControl />
            </div>
          </TabsContent>

          <TabsContent value="schedules" className="mt-6">
            <ScheduleManager />
          </TabsContent>

          <TabsContent value="appearance" className="mt-6">
            <AppearanceControl />
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

          <TabsContent value="audio" className="mt-6">
            <AudioManagementTab />
          </TabsContent>
        </Tabs>
      </div>
    </ProtectedLayout>
  );
}

function AudioManagementTab() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const { data: tracks = [], isLoading, refetch } = useQuery<any[]>({
    queryKey: ["/api/audio"],
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum file size is 10MB.", variant: "destructive" });
      return;
    }
    if (tracks.length >= 20) {
      toast({ title: "Limit reached", description: "You can only have 20 audio tracks. Delete one first.", variant: "destructive" });
      return;
    }
    const formData = new FormData();
    formData.append("audio", file);
    setUploading(true);
    try {
      const res = await fetch("/api/admin/audio", { method: "POST", body: formData });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Upload failed" }));
        throw new Error(err.message);
      }
      toast({ title: "Track uploaded", description: `${file.name} added to background music.` });
      refetch();
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (id: number, name: string) => {
    try {
      const res = await fetch(`/api/admin/audio/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      toast({ title: "Track removed", description: `${name} deleted.` });
      refetch();
    } catch {
      toast({ title: "Error", description: "Could not delete track.", variant: "destructive" });
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Music className="w-5 h-5" /> Background Music ({tracks.length}/20)
        </CardTitle>
        <CardDescription>Upload audio files that play randomly as background music across the site. Max 20 files, 10MB each.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*,.mp3,.wav,.ogg,.aac,.m4a,.flac,.webm"
            className="hidden"
            onChange={handleFileChange}
            data-testid="input-audio-file"
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || tracks.length >= 20}
            className="gap-2"
            data-testid="button-upload-audio"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {uploading ? "Uploading..." : "Upload Audio File"}
          </Button>
          {tracks.length >= 20 && (
            <span className="text-sm text-amber-400">Maximum 20 tracks reached</span>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading tracks...
          </div>
        ) : tracks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Music className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>No audio tracks uploaded yet.</p>
            <p className="text-sm">Upload MP3, WAV, OGG, AAC or other audio files.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>File Name</TableHead>
                <TableHead>Size</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tracks.map((track: any, idx: number) => (
                <TableRow key={track.id} data-testid={`row-audio-${track.id}`}>
                  <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Music className="w-4 h-4 text-[#D4AF37]" />
                      <span className="truncate max-w-[200px]" title={track.originalName}>
                        {track.originalName}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{formatSize(track.size)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(track.id, track.originalName)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                      data-testid={`button-delete-audio-${track.id}`}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
