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
// Mirror of server FISH_CATALOG. Cosmetic-only fields (sprite, color, size)
// live here; numeric truth (multiplier, difficulty) is fetched from server.
type FishDef = { id: string; name: string; multiplier: number; difficulty: number };

// Each fish sprite is a vertical strip of `frames` animation cells.
// Source dimensions taken from the original fish-joy game assets.
type FishCosmetic = {
  sprite: string;     // public URL of the strip
  frames: number;     // number of animation frames in the strip
  aspect: number;     // single-frame aspect ratio (frameW / frameH)
  displayW: number;   // rendered width in px
  glow: string;       // halo color
  fps: number;        // swim animation speed
};
const SPRITE_BASE = "/games/fish-joy/images";
const FISH_COSMETICS: Record<string, FishCosmetic> = {
  // small_fish: fish1  55×296  / 6  -> ~55×49
  small_fish:    { sprite: `${SPRITE_BASE}/fish1.png`,  frames: 6,   aspect: 55 / (296 / 6),  displayW: 55,  glow: "#fbbf24", fps: 10 },
  // medium_fish: fish2  78×512  / 16 -> ~78×32
  medium_fish:   { sprite: `${SPRITE_BASE}/fish2.png`,  frames: 16,  aspect: 78 / (512 / 16), displayW: 70,  glow: "#60a5fa", fps: 14 },
  // turtle: fish3  72×448  / 11 -> ~72×40.7
  turtle:        { sprite: `${SPRITE_BASE}/fish3.png`,  frames: 11,  aspect: 72 / (448 / 11), displayW: 80,  glow: "#22c55e", fps: 10 },
  // pufferfish: fish4  77×472  / 15 -> ~77×31.5
  pufferfish:    { sprite: `${SPRITE_BASE}/fish4.png`,  frames: 15,  aspect: 77 / (472 / 15), displayW: 80,  glow: "#f472b6", fps: 12 },
  // jellyfish: fish5  107×976 / 43 -> ~107×22.7
  jellyfish:     { sprite: `${SPRITE_BASE}/fish5.png`,  frames: 43,  aspect: 107 / (976 / 43), displayW: 105, glow: "#a78bfa", fps: 18 },
  // octopus: fish6  105×948 / 45 -> ~105×21
  octopus:       { sprite: `${SPRITE_BASE}/fish6.png`,  frames: 45,  aspect: 105 / (948 / 45), displayW: 110, glow: "#fb7185", fps: 18 },
  // shark: fish7  92×1510 / 80 -> ~92×18.9
  shark:         { sprite: `${SPRITE_BASE}/fish7.png`,  frames: 80,  aspect: 92 / (1510 / 80), displayW: 120, glow: "#94a3b8", fps: 22 },
  // whale: fish8  174×1512 / 100 -> ~174×15.1
  whale:         { sprite: `${SPRITE_BASE}/fish8.png`,  frames: 100, aspect: 174 / (1512 / 100), displayW: 170, glow: "#38bdf8", fps: 24 },
  // mermaid: fish9  166×2196 / 104 -> ~166×21.1
  mermaid:       { sprite: `${SPRITE_BASE}/fish9.png`,  frames: 104, aspect: 166 / (2196 / 104), displayW: 150, glow: "#f0abfc", fps: 22 },
  // scorpion_king: fish10  178×1870 / 121 -> ~178×15.5
  scorpion_king: { sprite: `${SPRITE_BASE}/fish10.png`, frames: 121, aspect: 178 / (1870 / 121), displayW: 180, glow: "#ef4444", fps: 26 },
};
const ARENA_BG = `${SPRITE_BASE}/game_bg_2_hd.gif`;
const CANNON_SPRITE = `${SPRITE_BASE}/cannon1.png`;  // 74×370, 11 frames
const BULLET_SPRITE = `${SPRITE_BASE}/bullet1.png`;  // 24×26

// Renders one animated fish frame using the vertical sprite strip.
// Background height is set to `frames * 100%` and animated through steps()
// so we cycle through every cell, showing one crisp frame at a time.
function FishSprite({ cosm, flip }: { cosm: FishCosmetic; flip: boolean }) {
  const w = cosm.displayW;
  const h = w / cosm.aspect;
  const dur = cosm.frames / cosm.fps;
  // Keyframe `fishhunt-swim` (declared once in the page) shifts
  // background-position-y from 0% → 100% in `steps(N)`, cycling through
  // every frame of the vertical sprite strip.
  return (
    <div
      style={{
        width: w,
        height: h,
        backgroundImage: `url(${cosm.sprite})`,
        backgroundRepeat: "no-repeat",
        backgroundSize: `100% ${cosm.frames * 100}%`,
        backgroundPosition: "0 0",
        animation: `fishhunt-swim ${dur}s steps(${cosm.frames}) infinite`,
        transform: flip ? "scaleX(-1)" : undefined,
        filter: `drop-shadow(0 0 12px ${cosm.glow})`,
        imageRendering: "auto",
      }}
    />
  );
}

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
      {/* Sprite-strip keyframe used by every <FishSprite> instance.
          One global rule works for any frame count because the steps()
          divisor is set per-sprite in inline style. */}
      <style>{`@keyframes fishhunt-swim { from { background-position-y: 0%; } to { background-position-y: 100%; } }`}</style>
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
            backgroundImage: `url(${ARENA_BG})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            boxShadow: "0 0 80px rgba(8,145,178,0.45), inset 0 0 60px rgba(0,0,0,0.55)",
          }}
          data-testid="fishhunt-arena"
        >
          {/* Subtle dim overlay so fish read clearly over the busy GIF */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/30" />
          {/* Light rays */}
          <div className="pointer-events-none absolute inset-0 opacity-25"
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
                data-testid={`fish-${f.fishId}-${f.uid}`}
              >
                <div className="flex flex-col items-center">
                  <FishSprite cosm={cosm} flip={f.flip} />
                  <span className="text-[10px] md:text-xs font-mono font-bold text-yellow-200 bg-black/60 px-1.5 py-0.5 rounded mt-0.5 border border-yellow-400/40">
                    ×{def.multiplier}
                  </span>
                </div>
              </motion.div>
            );
          })}

          {/* Bullets — use real bullet sprite */}
          {bullets.map(b => (
            <motion.div
              key={b.uid}
              className="absolute pointer-events-none"
              style={{
                width: 18, height: 20,
                backgroundImage: `url(${BULLET_SPRITE})`,
                backgroundSize: "contain",
                backgroundRepeat: "no-repeat",
                backgroundPosition: "center",
                transform: "translate(-50%, -50%)",
                filter: "drop-shadow(0 0 8px rgba(253,224,71,0.9))",
              }}
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

          {/* Cannon — real cannon1.png sprite (frame 1 only) at bottom-center */}
          <div
            className="absolute pointer-events-none z-20 left-1/2"
            style={{ bottom: 4, transform: "translateX(-50%)" }}
          >
            <div
              className="origin-bottom"
              style={{
                transform: `rotate(${cannonAngle - 90}deg)`,
                width: 74,
                height: 370 / 11,   // single frame height (~33.6px)
                backgroundImage: `url(${CANNON_SPRITE})`,
                backgroundSize: `100% ${11 * 100}%`,
                backgroundPosition: "0 0",
                backgroundRepeat: "no-repeat",
                filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.8))",
              }}
            />
            <div className="w-20 h-6 -mt-1 bg-gradient-to-b from-zinc-600 via-zinc-800 to-black rounded-b-xl border-2 border-zinc-900 mx-auto shadow-[0_4px_12px_rgba(0,0,0,0.6)]" />
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
                      <div className="w-16 flex items-center justify-center">
                        <FishSprite cosm={cosm} flip={false} />
                      </div>
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
