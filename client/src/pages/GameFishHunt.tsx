import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Volume2, VolumeX, Info, Maximize, Minimize,
  Plus, Minus, Crosshair, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@shared/schema";

// === FISH CATALOG ===
// Mirror of server FISH_CATALOG. Cosmetic-only fields (emoji, color, size)
// live here; numeric truth (multiplier, difficulty) is fetched from server.
type FishDef = { id: string; name: string; multiplier: number; difficulty: number };
const FISH_COSMETICS: Record<string, { emoji: string; glow: string; sizePx: number }> = {
  small_fish:    { emoji: "🐠", glow: "#fbbf24", sizePx: 44 },
  medium_fish:   { emoji: "🐟", glow: "#60a5fa", sizePx: 54 },
  turtle:        { emoji: "🐢", glow: "#22c55e", sizePx: 64 },
  pufferfish:    { emoji: "🐡", glow: "#f472b6", sizePx: 56 },
  jellyfish:     { emoji: "🪼", glow: "#a78bfa", sizePx: 60 },
  octopus:       { emoji: "🐙", glow: "#fb7185", sizePx: 70 },
  shark:         { emoji: "🦈", glow: "#94a3b8", sizePx: 84 },
  whale:         { emoji: "🐳", glow: "#38bdf8", sizePx: 100 },
  mermaid:       { emoji: "🧜‍♀️", glow: "#f0abfc", sizePx: 80 },
  scorpion_king: { emoji: "🦂", glow: "#ef4444", sizePx: 90 },
};

const BET_AMOUNTS = [100, 500, 1000, 2000, 5000, 10000];

type ActiveFish = {
  uid: string;
  fishId: string;
  yPct: number;         // 0..100 vertical position
  startX: number;       // -20 or 120 (offscreen)
  endX: number;
  duration: number;     // seconds to cross
  startedAt: number;    // performance.now()
  flip: boolean;        // mirrored horizontally (swimming right→left)
};

type Bullet = {
  uid: string;
  fromX: number; fromY: number;
  toX: number; toY: number;
  startedAt: number;
};

type Splash = {
  uid: string;
  x: number; y: number;
  kind: "hit" | "miss";
  amount?: number;
  multiplier?: number;
  startedAt: number;
};

// Simple sound effect helper using WebAudio — no asset dependencies.
let _ctx: AudioContext | null = null;
function audioCtx() {
  if (!_ctx) {
    try { _ctx = new (window.AudioContext || (window as any).webkitAudioContext)(); } catch {}
  }
  return _ctx;
}
function tone(freq: number, durMs: number, type: OscillatorType = "sine", vol = 0.15) {
  const ctx = audioCtx(); if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type; osc.frequency.value = freq;
  gain.gain.value = vol;
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + durMs / 1000);
  osc.connect(gain).connect(ctx.destination);
  osc.start(); osc.stop(ctx.currentTime + durMs / 1000);
}

export default function GameFishHunt() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const pageRef = useRef<HTMLDivElement>(null);
  const arenaRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [muted, setMuted] = useState(false);
  const [showPaytable, setShowPaytable] = useState(false);

  const [betIdx, setBetIdx] = useState(1);
  const bet = BET_AMOUNTS[betIdx] ?? BET_AMOUNTS[0];

  const [lastWin, setLastWin] = useState(0);
  const [aim, setAim] = useState({ x: 50, y: 50 }); // percentages
  const [autoFire, setAutoFire] = useState(false);

  const [activeFish, setActiveFish] = useState<ActiveFish[]>([]);
  const [bullets, setBullets] = useState<Bullet[]>([]);
  const [splashes, setSplashes] = useState<Splash[]>([]);

  // Queries
  const { data: user } = useQuery<User>({ queryKey: ["/api/user"] });
  const { data: catalog } = useQuery<{ fish: FishDef[]; baseWinChance: number }>({
    queryKey: ["/api/games/fishhunt/catalog"],
  });
  const fishList: FishDef[] = catalog?.fish ?? [];
  const fishById = useMemo(() => new Map(fishList.map(f => [f.id, f])), [fishList]);

  const sound = useCallback((kind: "shoot" | "hit" | "miss" | "coin") => {
    if (muted) return;
    if (kind === "shoot") tone(660, 70, "square", 0.08);
    else if (kind === "hit") { tone(440, 120, "triangle", 0.18); setTimeout(() => tone(880, 180, "triangle", 0.18), 70); }
    else if (kind === "coin") tone(1320, 90, "sine", 0.12);
    else tone(220, 180, "sawtooth", 0.05);
  }, [muted]);

  // Fish spawner: keep ~6-9 fish alive at all times.
  useEffect(() => {
    if (fishList.length === 0) return;
    let cancelled = false;
    const TARGET_MIN = 6, TARGET_MAX = 9;
    const spawnOne = () => {
      // weight spawn probability by difficulty (commoner fish appear more often)
      const totalW = fishList.reduce((s, f) => s + f.difficulty, 0);
      let r = Math.random() * totalW;
      let pick = fishList[0];
      for (const f of fishList) { if ((r -= f.difficulty) <= 0) { pick = f; break; } }
      const flip = Math.random() < 0.5;
      const startX = flip ? 115 : -15;
      const endX = flip ? -15 : 115;
      const yPct = 15 + Math.random() * 65;
      // Bigger / rarer fish swim slower → easier to track but worth more.
      const baseDur = 10 + (1 - pick.difficulty) * 14;
      const duration = baseDur + Math.random() * 4;
      setActiveFish(prev => [...prev, {
        uid: `f${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        fishId: pick.id, yPct, startX, endX, duration,
        startedAt: performance.now(), flip,
      }]);
    };
    const tick = () => {
      if (cancelled) return;
      setActiveFish(prev => {
        // prune any that have finished crossing
        const now = performance.now();
        const alive = prev.filter(f => (now - f.startedAt) / 1000 < f.duration + 0.5);
        const need = Math.max(0, TARGET_MIN - alive.length);
        if (need > 0 && alive.length < TARGET_MAX) {
          // schedule new spawns
          setTimeout(spawnOne, 50);
        }
        return alive;
      });
    };
    // initial burst
    for (let i = 0; i < TARGET_MIN; i++) setTimeout(spawnOne, i * 250);
    const interval = setInterval(tick, 800);
    return () => { cancelled = true; clearInterval(interval); };
  }, [fishList]);

  // === Shot mutation: single authoritative call. House edge cross-check happens server-side. ===
  const shotMutation = useMutation({
    mutationFn: async (data: { bet: number; fishType: string }) => {
      const res = await apiRequest("POST", "/api/games/fishhunt/shoot", data);
      return res.json() as Promise<{
        caught: boolean; payout: number; multiplier: number;
        fishType: string; fishName: string; balance: number;
      }>;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/user"] }),
  });

  // Compute the live position of an active fish at the current moment.
  const fishPositionNow = useCallback((f: ActiveFish) => {
    const t = Math.min(1, (performance.now() - f.startedAt) / (f.duration * 1000));
    return { x: f.startX + (f.endX - f.startX) * t, y: f.yPct };
  }, []);

  // Fire at a specific fish. Triggered by clicking it.
  const fireAt = useCallback(async (target: ActiveFish) => {
    if (!user || user.balance < bet) {
      toast({ title: "Insufficient balance", variant: "destructive" });
      setAutoFire(false);
      return;
    }
    sound("shoot");
    // Cannon at bottom-center
    const fromX = 50, fromY = 98;
    const tgtPos = fishPositionNow(target);
    const bulletUid = `b${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setBullets(prev => [...prev, {
      uid: bulletUid, fromX, fromY,
      toX: tgtPos.x, toY: tgtPos.y, startedAt: performance.now(),
    }]);
    // Remove the bullet after travel.
    setTimeout(() => {
      if (mountedRef.current) setBullets(prev => prev.filter(b => b.uid !== bulletUid));
    }, 350);

    let result;
    try {
      result = await shotMutation.mutateAsync({ bet, fishType: target.fishId });
    } catch (err: any) {
      const bankrollBlocked = /bankroll/i.test(err?.message || "");
      toast({
        title: bankrollBlocked ? "Bet too large" : "Shot failed",
        description: bankrollBlocked
          ? "Maximum possible payout exceeds the house bankroll. Lower your bet."
          : "Could not place bet. Please try again.",
        variant: "destructive",
      });
      setAutoFire(false);
      return;
    }
    if (!mountedRef.current) return;

    // Splash at the fish position when the bullet lands.
    setTimeout(() => {
      if (!mountedRef.current) return;
      const landed = fishPositionNow(target);
      const splashUid = `s${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setSplashes(prev => [...prev, {
        uid: splashUid, x: landed.x, y: landed.y,
        kind: result.caught ? "hit" : "miss",
        amount: result.caught ? result.payout : undefined,
        multiplier: result.caught ? result.multiplier : undefined,
        startedAt: performance.now(),
      }]);
      setTimeout(() => {
        if (mountedRef.current) setSplashes(prev => prev.filter(s => s.uid !== splashUid));
      }, 1500);
      if (result.caught) {
        // Remove the caught fish so the player sees it was taken out.
        setActiveFish(prev => prev.filter(f => f.uid !== target.uid));
        setLastWin(result.payout);
        sound("hit"); setTimeout(() => sound("coin"), 120);
        toast({
          title: result.payout >= bet * 10 ? "BIG CATCH!" : "Caught!",
          description: `${result.fishName} ×${result.multiplier} — +UGX ${result.payout.toLocaleString()}`,
          className: "bg-emerald-600 border-emerald-400 text-white font-black",
        });
      } else {
        sound("miss");
      }
    }, 320);
  }, [user, bet, sound, fishPositionNow, shotMutation, toast]);

  // Auto-fire loop — picks the highest-value fish currently onscreen.
  useEffect(() => {
    if (!autoFire) return;
    const id = setInterval(() => {
      if (shotMutation.isPending) return;
      // Pick a random visible fish, weighted toward higher multipliers.
      const visible = activeFish.filter(f => {
        const p = fishPositionNow(f);
        return p.x > 5 && p.x < 95;
      });
      if (visible.length === 0) return;
      const weighted = visible.map(f => ({ f, w: fishById.get(f.fishId)?.multiplier ?? 1 }));
      const total = weighted.reduce((s, x) => s + x.w, 0);
      let r = Math.random() * total;
      let chosen = weighted[0].f;
      for (const x of weighted) { if ((r -= x.w) <= 0) { chosen = x.f; break; } }
      fireAt(chosen);
    }, 900);
    return () => clearInterval(id);
  }, [autoFire, activeFish, fishById, fireAt, fishPositionNow, shotMutation.isPending]);

  // Aim follows mouse / touch on the arena.
  const handleArenaMove = (e: React.MouseEvent | React.TouchEvent) => {
    const el = arenaRef.current; if (!el) return;
    const rect = el.getBoundingClientRect();
    const point = "touches" in e ? e.touches[0] : (e as React.MouseEvent);
    if (!point) return;
    const x = ((point.clientX - rect.left) / rect.width) * 100;
    const y = ((point.clientY - rect.top) / rect.height) * 100;
    setAim({ x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) });
  };

  // Click anywhere → fire at nearest fish to the click point (within tolerance).
  const handleArenaClick = (e: React.MouseEvent) => {
    if (!user) return;
    const el = arenaRef.current; if (!el) return;
    const rect = el.getBoundingClientRect();
    const xPct = ((e.clientX - rect.left) / rect.width) * 100;
    const yPct = ((e.clientY - rect.top) / rect.height) * 100;
    // Find nearest fish within ~12% radius
    let best: { f: ActiveFish; d: number } | null = null;
    for (const f of activeFish) {
      const p = fishPositionNow(f);
      const dx = p.x - xPct, dy = p.y - yPct;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < 12 && (!best || d < best.d)) best = { f, d };
    }
    if (best) fireAt(best.f);
  };

  // Fullscreen
  const toggleFullscreen = () => {
    const el = pageRef.current;
    if (!document.fullscreenElement && el) {
      el.requestFullscreen?.().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen?.().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };
  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // Cannon rotation angle (degrees, 0 = straight up).
  const cannonAngle = useMemo(() => {
    const dx = aim.x - 50;
    const dy = aim.y - 98;
    return (Math.atan2(dy, dx) * 180) / Math.PI + 90;
  }, [aim]);

  return (
    <div
      ref={pageRef}
      className="relative min-h-screen h-screen overflow-y-auto bg-gradient-to-b from-[#012c4a] via-[#013a63] to-[#011d3d]"
      data-testid="page-fishhunt"
    >
      {/* Top bar */}
      <div className="flex items-center justify-between p-3 sticky top-0 z-40 backdrop-blur-md bg-black/40 border-b border-cyan-700/30">
        <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="text-cyan-300 hover:text-cyan-100" data-testid="button-back-lobby">
          <ArrowLeft className="w-4 h-4 mr-1" /> Lobby
        </Button>
        <div className="flex items-center gap-3">
          <span className="text-cyan-200 font-bold text-sm md:text-base" data-testid="text-balance">
            UGX {(user?.balance ?? 0).toLocaleString()}
          </span>
          <Button variant="ghost" size="icon" onClick={() => setMuted(m => !m)} className="text-cyan-300" data-testid="button-mute">
            {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setShowPaytable(true)} className="text-cyan-300" data-testid="button-paytable">
            <Info className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={toggleFullscreen} className="text-cyan-300" data-testid="button-fullscreen">
            {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
          </Button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-3 pb-6 pt-4 space-y-4">
        <div className="text-center">
          <h1 className="text-3xl md:text-5xl font-display font-black text-cyan-100 drop-shadow-[0_0_25px_rgba(56,189,248,0.6)] tracking-wider" data-testid="text-title">
            FISH HUNT
          </h1>
          <p className="text-xs md:text-sm text-cyan-200/70 uppercase tracking-[0.3em] mt-1">
            Aim · Shoot · Catch · Win
          </p>
        </div>

        {/* Arena */}
        <div
          ref={arenaRef}
          onMouseMove={handleArenaMove}
          onTouchMove={handleArenaMove}
          onClick={handleArenaClick}
          className="relative w-full aspect-[16/10] rounded-2xl overflow-hidden border-4 border-cyan-700/60 cursor-crosshair select-none"
          style={{
            background: "radial-gradient(ellipse at top, #0e7490 0%, #0c4a6e 40%, #082f49 100%)",
            boxShadow: "0 0 80px rgba(8,145,178,0.45), inset 0 0 60px rgba(0,0,0,0.55)",
          }}
          data-testid="fishhunt-arena"
        >
          {/* Light rays */}
          <div className="pointer-events-none absolute inset-0 opacity-30"
            style={{ background: "repeating-linear-gradient(105deg, transparent 0 60px, rgba(186,230,253,0.08) 60px 80px)" }} />
          {/* Bubbles */}
          {Array.from({ length: 14 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full bg-cyan-200/30"
              style={{
                left: `${(i * 7 + (i % 3) * 4) % 100}%`,
                width: 6 + (i % 4) * 3, height: 6 + (i % 4) * 3,
              }}
              initial={{ y: "110%" }}
              animate={{ y: "-10%" }}
              transition={{ duration: 6 + (i % 5), repeat: Infinity, ease: "linear", delay: i * 0.4 }}
            />
          ))}

          {/* Fish */}
          {activeFish.map(f => {
            const cosm = FISH_COSMETICS[f.fishId];
            const def = fishById.get(f.fishId);
            if (!cosm || !def) return null;
            return (
              <motion.div
                key={f.uid}
                className="absolute pointer-events-none"
                style={{ top: `${f.yPct}%`, left: 0, transform: `translate(-50%, -50%)` }}
                initial={{ x: `${f.startX}%` }}
                animate={{ x: `${f.endX}%` }}
                transition={{ duration: f.duration, ease: "linear" }}
              >
                <div
                  className="flex flex-col items-center"
                  style={{
                    filter: `drop-shadow(0 0 12px ${cosm.glow})`,
                    transform: f.flip ? "scaleX(-1)" : undefined,
                  }}
                >
                  <span style={{ fontSize: cosm.sizePx, lineHeight: 1 }} data-testid={`fish-${f.fishId}-${f.uid}`}>
                    {cosm.emoji}
                  </span>
                  <span className="text-[10px] md:text-xs font-mono font-bold text-yellow-200 bg-black/50 px-1.5 py-0.5 rounded mt-0.5"
                    style={{ transform: f.flip ? "scaleX(-1)" : undefined }}>
                    ×{def.multiplier}
                  </span>
                </div>
              </motion.div>
            );
          })}

          {/* Bullets */}
          {bullets.map(b => (
            <motion.div
              key={b.uid}
              className="absolute rounded-full bg-yellow-300 shadow-[0_0_12px_rgba(253,224,71,0.9)] pointer-events-none"
              style={{ width: 10, height: 10, transform: "translate(-50%, -50%)" }}
              initial={{ left: `${b.fromX}%`, top: `${b.fromY}%`, scale: 1 }}
              animate={{ left: `${b.toX}%`, top: `${b.toY}%`, scale: 0.6 }}
              transition={{ duration: 0.32, ease: "easeOut" }}
            />
          ))}

          {/* Splashes */}
          <AnimatePresence>
            {splashes.map(s => (
              <motion.div
                key={s.uid}
                className="absolute pointer-events-none"
                style={{ left: `${s.x}%`, top: `${s.y}%`, transform: "translate(-50%, -50%)" }}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.3 }}
                transition={{ duration: 1.2 }}
              >
                {s.kind === "hit" ? (
                  <div className="flex flex-col items-center">
                    <div className="text-3xl md:text-5xl">💥</div>
                    <div className="mt-1 px-3 py-1 rounded-full bg-gradient-to-r from-yellow-400 via-yellow-200 to-yellow-400 text-black font-black text-sm md:text-base shadow-[0_0_30px_rgba(253,224,71,0.9)] whitespace-nowrap">
                      +UGX {(s.amount ?? 0).toLocaleString()} <span className="text-xs">×{s.multiplier}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-3xl md:text-4xl opacity-70">💧</div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Aim crosshair */}
          <div
            className="absolute pointer-events-none z-20"
            style={{ left: `${aim.x}%`, top: `${aim.y}%`, transform: "translate(-50%, -50%)" }}
          >
            <Crosshair className="w-10 h-10 text-red-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.9)]" />
          </div>

          {/* Cannon at bottom */}
          <div
            className="absolute pointer-events-none z-20 left-1/2 bottom-1"
            style={{ transform: `translateX(-50%)` }}
          >
            <div
              className="relative origin-bottom"
              style={{ transform: `rotate(${cannonAngle - 90}deg)` }}
            >
              <div className="w-3 h-14 md:w-4 md:h-20 bg-gradient-to-t from-zinc-700 via-zinc-500 to-zinc-300 rounded-t-full mx-auto border border-black/40 shadow-[0_0_10px_rgba(0,0,0,0.7)]" />
            </div>
            <div className="w-16 h-6 md:w-20 md:h-7 -mt-2 bg-gradient-to-b from-zinc-600 via-zinc-800 to-black rounded-b-xl border-2 border-zinc-900 mx-auto shadow-[0_4px_12px_rgba(0,0,0,0.6)]" />
          </div>

          {/* Loading overlay until catalog arrives */}
          {fishList.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-30">
              <Loader2 className="w-8 h-8 text-cyan-300 animate-spin" />
            </div>
          )}
        </div>

        {/* Control panel */}
        <div className="grid grid-cols-3 gap-2 md:gap-4 items-center bg-black/50 p-3 md:p-4 rounded-xl border border-cyan-700/30">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] md:text-xs uppercase tracking-widest text-cyan-200/70">Bet / Shot</span>
            <div className="flex items-center gap-1">
              <Button size="icon" variant="outline" className="h-8 w-8 border-cyan-700/50"
                onClick={() => setBetIdx(i => Math.max(0, i - 1))}
                disabled={betIdx === 0} data-testid="button-bet-down">
                <Minus className="w-3 h-3" />
              </Button>
              <div className="flex-1 text-center bg-black/60 border border-cyan-700/40 rounded px-2 py-1 font-mono text-cyan-200 font-bold text-sm md:text-base" data-testid="text-bet">
                {bet.toLocaleString()}
              </div>
              <Button size="icon" variant="outline" className="h-8 w-8 border-cyan-700/50"
                onClick={() => setBetIdx(i => Math.min(BET_AMOUNTS.length - 1, i + 1))}
                disabled={betIdx === BET_AMOUNTS.length - 1} data-testid="button-bet-up">
                <Plus className="w-3 h-3" />
              </Button>
            </div>
          </div>

          <div className="text-center">
            <span className="text-[10px] md:text-xs uppercase tracking-widest text-cyan-200/70 block">Tap a fish to shoot</span>
            <p className="text-[10px] text-cyan-200/40 mt-1">Bigger fish = higher payout, harder to catch.</p>
          </div>

          <div className="flex flex-col gap-1 items-stretch">
            <span className="text-[10px] md:text-xs uppercase tracking-widest text-cyan-200/70">Last Win</span>
            <div className="bg-black/60 border border-cyan-700/40 rounded px-2 py-1 font-mono text-emerald-400 font-bold text-sm md:text-base text-center" data-testid="text-last-win">
              {lastWin.toLocaleString()}
            </div>
            <Button size="sm" variant={autoFire ? "destructive" : "outline"} className="h-7 text-xs border-cyan-700/50"
              onClick={() => setAutoFire(a => !a)} data-testid="button-auto">
              {autoFire ? "STOP AUTO" : "AUTO FIRE"}
            </Button>
          </div>
        </div>

        <p className="text-center text-[10px] md:text-xs text-cyan-200/40 tracking-wider">
          Min bet UGX {BET_AMOUNTS[0].toLocaleString()}
        </p>
      </div>

      {/* Paytable modal */}
      <AnimatePresence>
        {showPaytable && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowPaytable(false)}
            data-testid="modal-paytable"
          >
            <motion.div
              className="bg-gradient-to-b from-[#072a45] to-[#011d3d] border-2 border-cyan-700 rounded-xl p-5 max-w-md w-full max-h-[80vh] overflow-y-auto"
              initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-2xl font-display font-black text-cyan-200 mb-4 text-center">PAYTABLE</h3>
              <div className="space-y-2">
                {fishList.map(f => {
                  const cosm = FISH_COSMETICS[f.id];
                  if (!cosm) return null;
                  return (
                    <div key={f.id} className="flex items-center gap-3 bg-black/40 rounded-lg p-2 border border-cyan-800/40" data-testid={`paytable-${f.id}`}>
                      <span style={{ fontSize: 36, filter: `drop-shadow(0 0 6px ${cosm.glow})` }}>{cosm.emoji}</span>
                      <div className="flex-1">
                        <div className="text-cyan-100 font-bold text-sm">{f.name}</div>
                        <div className="text-[10px] text-cyan-200/60">Catch rate: {Math.round(f.difficulty * 100)}%</div>
                      </div>
                      <div className="text-yellow-300 font-mono font-black text-lg">×{f.multiplier}</div>
                    </div>
                  );
                })}
              </div>
              <Button className="w-full mt-4" onClick={() => setShowPaytable(false)} data-testid="button-close-paytable">Close</Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
