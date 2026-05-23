import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Maximize, Minimize, Sparkles, Loader2, Info, Volume2, VolumeX, Plus, Minus } from "lucide-react";
import type { User } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { playSound } from "@/lib/sounds";

const REELS = 5;
const ROWS = 3;
const SYMBOL_COUNT = 7;

const SPRITE_BASE = "/games/classic-slots/sprites";

type SymbolDef = {
  id: number;
  label: string;
  image: string;
  glow: string;
  paytable: number[];
};

const SYMBOLS: SymbolDef[] = [
  { id: 1, label: "Seven",   image: `${SPRITE_BASE}/symbol_1.png`, glow: "rgba(255,68,68,0.85)",  paytable: [0, 0, 100, 150, 200] },
  { id: 2, label: "Bar",     image: `${SPRITE_BASE}/symbol_2.png`, glow: "rgba(255,200,80,0.8)",  paytable: [0, 0, 50, 100, 150] },
  { id: 3, label: "Bell",    image: `${SPRITE_BASE}/symbol_3.png`, glow: "rgba(255,215,0,0.8)",   paytable: [0, 10, 25, 50, 100] },
  { id: 4, label: "Diamond", image: `${SPRITE_BASE}/symbol_4.png`, glow: "rgba(120,220,255,0.85)",paytable: [0, 10, 25, 50, 100] },
  { id: 5, label: "Cherry",  image: `${SPRITE_BASE}/symbol_5.png`, glow: "rgba(255,80,120,0.8)",  paytable: [0, 5, 15, 25, 50] },
  { id: 6, label: "Lemon",   image: `${SPRITE_BASE}/symbol_6.png`, glow: "rgba(255,235,80,0.8)",  paytable: [0, 2, 10, 20, 35] },
  { id: 7, label: "Orange",  image: `${SPRITE_BASE}/symbol_7.png`, glow: "rgba(255,160,60,0.8)",  paytable: [0, 1, 5, 10, 15] },
];

// 5 paylines across the 3x5 grid. Each entry is the row index (0=top,1=mid,2=bot)
// for each of the 5 reels.
const PAYLINES: { id: number; rows: number[]; color: string }[] = [
  { id: 1, rows: [1, 1, 1, 1, 1], color: "#FFD700" },   // middle straight
  { id: 2, rows: [0, 0, 0, 0, 0], color: "#FF4D6D" },   // top straight
  { id: 3, rows: [2, 2, 2, 2, 2], color: "#3DDC97" },   // bottom straight
  { id: 4, rows: [0, 1, 2, 1, 0], color: "#FF8C42" },   // V
  { id: 5, rows: [2, 1, 0, 1, 2], color: "#8E7CFF" },   // inverted V
];

const BET_AMOUNTS = [500, 1000, 2000, 5000, 10000, 20000, 50000];

// Picks a symbol where lower-id (higher value) symbols are rarer.
function randomSymbol(): number {
  // weights inversely proportional to symbol id (7,6,5,4,3,2,1 -> rare to common)
  // weighting: id 1 (top) gets weight 1, id 7 (low) gets weight 7
  const r = Math.random() * 28; // sum of 1..7
  let acc = 0;
  for (let id = 7; id >= 1; id--) {
    acc += id;
    if (r < acc) return 8 - id; // map 7..1 to indices 1..7 reversed
  }
  return 7;
}

function randomReelStrip(length: number): number[] {
  return Array.from({ length }, () => randomSymbol());
}

// Build a fully random 3x5 grid of symbol ids (1..7).
function randomGrid(): number[][] {
  return Array.from({ length: REELS }, () => [randomSymbol(), randomSymbol(), randomSymbol()]);
}

// One reel column with a continuous strip animation effect.
function Reel({
  finalColumn,
  spinning,
  delay,
  highlightedRows,
}: {
  finalColumn: number[];           // [top, mid, bot]
  spinning: boolean;
  delay: number;                   // ms before stop
  highlightedRows: Set<number>;
}) {
  const [strip, setStrip] = useState<number[]>(() => randomReelStrip(20));
  const [stopped, setStopped] = useState(true);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stopRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (spinning) {
      setStopped(false);
      tickRef.current = setInterval(() => {
        setStrip(prev => {
          const next = [randomSymbol(), ...prev];
          if (next.length > 24) next.pop();
          return next;
        });
      }, 60);
      stopRef.current = setTimeout(() => {
        if (tickRef.current) clearInterval(tickRef.current);
        tickRef.current = null;
        // Lock in the final 3 visible rows
        const tail = randomReelStrip(12);
        setStrip([...finalColumn, ...tail]);
        setStopped(true);
        playSound('tick', 0.4);
      }, delay);
    }
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
      if (stopRef.current) clearTimeout(stopRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spinning, delay]);

  // When not spinning, just show finalColumn as the first 3.
  useEffect(() => {
    if (!spinning) setStrip([...finalColumn, ...randomReelStrip(8)]);
  }, [spinning, finalColumn]);

  const visible = strip.slice(0, ROWS);

  return (
    <div
      className="relative flex-1 min-w-0 bg-gradient-to-b from-zinc-900 via-black to-zinc-900 rounded-xl border-2 border-yellow-700/40 overflow-hidden shadow-[inset_0_0_30px_rgba(0,0,0,0.95)]"
      style={{ aspectRatio: "1 / 3" }}
      data-testid="reel-column"
    >
      <div className="absolute inset-0 bg-gradient-to-b from-white/5 via-transparent to-white/5 pointer-events-none z-10" />
      <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-black/80 to-transparent pointer-events-none z-20" />
      <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-black/80 to-transparent pointer-events-none z-20" />

      <motion.div
        animate={!stopped ? { y: [-0, -120] } : { y: 0 }}
        transition={!stopped ? { duration: 0.18, repeat: Infinity, ease: "linear" } : { type: "spring", stiffness: 180, damping: 16 }}
        className="flex flex-col h-full"
      >
        {visible.map((symId, rowIdx) => {
          const sym = SYMBOLS.find(s => s.id === symId) ?? SYMBOLS[6];
          const lit = stopped && highlightedRows.has(rowIdx);
          return (
            <div
              key={`${rowIdx}-${symId}`}
              className={`flex-1 flex items-center justify-center relative transition-all ${lit ? "" : ""}`}
              data-testid={`cell-${rowIdx}-${symId}`}
            >
              {lit && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: [0.4, 0.9, 0.4], scale: [1, 1.06, 1] }}
                  transition={{ duration: 1.1, repeat: Infinity }}
                  className="absolute inset-2 rounded-xl bg-yellow-300/20 ring-2 ring-yellow-300 shadow-[0_0_40px_rgba(255,215,0,0.85)]"
                />
              )}
              <img
                src={sym.image}
                alt={sym.label}
                draggable={false}
                className="relative z-10 w-[70%] h-[70%] object-contain select-none"
                style={{
                  filter: `drop-shadow(0 0 ${lit ? 18 : 6}px ${sym.glow}) drop-shadow(0 4px 6px rgba(0,0,0,0.6))`,
                  transform: lit ? "scale(1.08)" : undefined,
                  transition: "transform 0.3s",
                }}
                onError={(e) => {
                  const img = e.target as HTMLImageElement;
                  img.style.display = "none";
                  const span = img.nextElementSibling as HTMLElement | null;
                  if (span) span.style.opacity = "1";
                }}
              />
              {/* Letter fallback — invisible unless the sprite fails to load */}
              <span className="absolute inset-0 flex items-center justify-center text-3xl md:text-5xl font-black text-yellow-300 opacity-0 pointer-events-none">
                {sym.label[0]}
              </span>
            </div>
          );
        })}
      </motion.div>
    </div>
  );
}

export default function GameClassicSlots() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [muted, setMuted] = useState(false);
  const [showPaytable, setShowPaytable] = useState(false);

  const [betIdx, setBetIdx] = useState(0); // index into BET_AMOUNTS
  const bet = BET_AMOUNTS[betIdx] ?? BET_AMOUNTS[0];

  const [grid, setGrid] = useState<number[][]>(() => randomGrid());
  const [spinning, setSpinning] = useState(false);
  const [highlightLines, setHighlightLines] = useState<number[]>([]);
  const [lastWin, setLastWin] = useState(0);
  const [autoSpin, setAutoSpin] = useState(false);

  const autoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
      if (autoTimerRef.current) clearTimeout(autoTimerRef.current);
    };
  }, []);

  const { data: user } = useQuery<User>({ queryKey: ["/api/user"] });
  const { data: gameSettings } = useQuery<{ winOccurrence: number }>({
    queryKey: ["/api/games/classic-slots/settings"],
  });
  const winOccurrence = gameSettings?.winOccurrence ?? 30; // 0-100

  const sound = useCallback((name: string, vol = 0.5) => {
    if (!muted) playSound(name, vol);
  }, [muted]);

  // Single authoritative spin: the server decides win/loss AFTER consulting
  // the house edge (same flow as coinflip/hilo). The client only animates.
  const spinMutation = useMutation({
    mutationFn: async (data: { bet: number }) => {
      const res = await apiRequest("POST", "/api/games/classic-slots/spin", data);
      return res.json() as Promise<{
        won: boolean;
        payout: number;
        balance: number;
        grid: number[][];
        winningLineIndex: number | null;
      }>;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/user"] }),
  });

  const handleSpin = useCallback(async () => {
    if (spinning) return;
    if (!user || user.balance < bet) {
      toast({ title: "Insufficient balance", variant: "destructive" });
      setAutoSpin(false);
      return;
    }

    setHighlightLines([]);
    setLastWin(0);

    // 1) Ask the server for the authoritative outcome.
    let result: Awaited<ReturnType<typeof spinMutation.mutateAsync>>;
    try {
      result = await spinMutation.mutateAsync({ bet });
    } catch (err: any) {
      const bankrollBlocked = /bankroll/i.test(err?.message || "");
      toast({
        title: bankrollBlocked ? "Bet too large" : "Spin failed",
        description: bankrollBlocked
          ? "Maximum possible payout exceeds the house bankroll. Lower your bet."
          : "Could not place bet. Please try again.",
        variant: "destructive",
      });
      setAutoSpin(false);
      return;
    }

    // 2) Start animation; reels will land on the server-supplied grid.
    sound('spin', 0.6);
    setSpinning(true);
    setGrid(result.grid);

    // 3) After reel-stop animation, reveal win/loss exactly as the server decided.
    if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
    settleTimerRef.current = setTimeout(() => {
      if (!mountedRef.current) return;
      setSpinning(false);
      if (result.won && result.payout > 0) {
        setLastWin(result.payout);
        if (result.winningLineIndex !== null) {
          setHighlightLines([result.winningLineIndex]);
        }
        sound('jackpot', 0.7);
        toast({
          title: result.payout >= bet * 5 ? "BIG WIN!" : "You won!",
          description: `+ UGX ${result.payout.toLocaleString()}`,
          className: "bg-emerald-600 border-emerald-400 text-white font-black",
        });
      } else {
        sound('lose', 0.3);
      }
    }, 1700);
  }, [spinning, user, bet, sound, spinMutation, toast]);

  // Auto-spin loop
  useEffect(() => {
    if (autoSpin && !spinning) {
      autoTimerRef.current = setTimeout(() => {
        handleSpin();
      }, lastWin > 0 ? 1800 : 600);
    }
    return () => {
      if (autoTimerRef.current) {
        clearTimeout(autoTimerRef.current);
        autoTimerRef.current = null;
      }
    };
  }, [autoSpin, spinning, lastWin, handleSpin]);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }, []);

  useEffect(() => {
    const h = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", h);
    return () => document.removeEventListener("fullscreenchange", h);
  }, []);

  // Rows to highlight in each reel column based on winning lines
  const highlightedRowsPerReel = useMemo(() => {
    const arr: Set<number>[] = Array.from({ length: REELS }, () => new Set<number>());
    if (highlightLines.length === 0) return arr;
    // For each winning line, light up the matched reels' cells
    highlightLines.forEach(li => {
      const line = PAYLINES[li];
      const sym = grid[0][line.rows[0]];
      let len = 1;
      for (let r = 1; r < REELS; r++) {
        if (grid[r][line.rows[r]] === sym) len++; else break;
      }
      for (let r = 0; r < len; r++) arr[r].add(line.rows[r]);
    });
    return arr;
  }, [highlightLines, grid]);

  return (
    <div
      ref={containerRef}
      className="relative min-h-screen bg-gradient-to-b from-[#1a0510] via-[#0a0307] to-black"
      data-testid="page-classic-slots"
    >
      {/* Top bar */}
      <div className="flex items-center justify-between p-3 sticky top-0 z-30 backdrop-blur-md bg-black/40 border-b border-yellow-700/20">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/")}
          className="text-[#D4AF37] hover:text-yellow-200"
          data-testid="button-back-lobby"
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Lobby
        </Button>
        <div className="flex items-center gap-3">
          <span className="text-[#D4AF37] font-bold text-sm md:text-base" data-testid="text-balance">
            UGX {(user?.balance ?? 0).toLocaleString()}
          </span>
          <Button variant="ghost" size="icon" onClick={() => setMuted(m => !m)} className="text-[#D4AF37]" data-testid="button-mute">
            {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setShowPaytable(true)} className="text-[#D4AF37]" data-testid="button-paytable">
            <Info className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={toggleFullscreen} className="text-[#D4AF37]" data-testid="button-fullscreen">
            {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
          </Button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-3 pb-6 pt-4 space-y-4">
        {/* Title */}
        <div className="text-center">
          <h1 className="text-3xl md:text-5xl font-display font-black text-[#D4AF37] drop-shadow-[0_0_25px_rgba(212,175,55,0.7)] tracking-wider">
            CLASSIC SLOTS
          </h1>
          <p className="text-xs md:text-sm text-yellow-200/70 uppercase tracking-[0.3em] mt-1">
            5 Reels · 5 Paylines · Match 3 from left
          </p>
        </div>

        {/* Cabinet */}
        <div className="relative bg-gradient-to-b from-[#3a1a0a] via-[#1d0a05] to-[#3a1a0a] rounded-2xl p-3 md:p-5 border-4 border-yellow-700 shadow-[0_0_60px_rgba(212,175,55,0.35),inset_0_0_30px_rgba(0,0,0,0.6)]">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-b from-yellow-300 to-yellow-600 px-6 py-1 rounded-b-lg border-x-2 border-b-2 border-yellow-800 shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
            <span className="font-display font-black text-black text-xs md:text-sm tracking-[0.25em]">JACKPOT</span>
          </div>

          {/* Reels + payline overlay */}
          <div className="relative">
            <div className="flex gap-1 md:gap-2 bg-black p-2 md:p-3 rounded-xl border-2 border-yellow-900/60 shadow-[inset_0_0_40px_rgba(0,0,0,0.95)]">
              {Array.from({ length: REELS }).map((_, i) => (
                <Reel
                  key={i}
                  finalColumn={grid[i]}
                  spinning={spinning}
                  delay={700 + i * 220}
                  highlightedRows={highlightedRowsPerReel[i]}
                />
              ))}
            </div>

            {/* Payline overlay (SVG) */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              viewBox="0 0 100 60"
              preserveAspectRatio="none"
            >
              {highlightLines.map(li => {
                const line = PAYLINES[li];
                const xs = [10, 28, 50, 72, 90];
                const yMap = [12, 30, 48];
                const pts = line.rows.map((r, i) => `${xs[i]},${yMap[r]}`).join(" ");
                return (
                  <polyline
                    key={li}
                    points={pts}
                    fill="none"
                    stroke={line.color}
                    strokeWidth={0.9}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    opacity={0.95}
                    style={{ filter: `drop-shadow(0 0 1.5px ${line.color})` }}
                  />
                );
              })}
            </svg>

            {/* Big-win burst */}
            <AnimatePresence>
              {lastWin > 0 && !spinning && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.6 }}
                  className="absolute inset-0 flex items-center justify-center pointer-events-none z-30"
                >
                  <div className="bg-gradient-to-r from-yellow-400 via-yellow-200 to-yellow-400 text-black px-6 py-3 rounded-full font-black text-xl md:text-3xl shadow-[0_0_40px_rgba(255,215,0,0.9)] border-2 border-yellow-700">
                    + UGX {lastWin.toLocaleString()}
                  </div>
                  {[...Array(14)].map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ y: 0, x: (Math.random() - 0.5) * 200, opacity: 1, scale: 0 }}
                      animate={{ y: -160 - Math.random() * 120, opacity: 0, scale: 1.4, rotate: 360 }}
                      transition={{ duration: 1.6, delay: i * 0.06, ease: "easeOut" }}
                      className="absolute"
                    >
                      <Sparkles className="w-6 h-6 text-yellow-300" />
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Control panel */}
          <div className="mt-4 grid grid-cols-3 gap-2 md:gap-4 items-center bg-black/50 p-3 md:p-4 rounded-xl border border-yellow-700/30">
            {/* Bet */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] md:text-xs uppercase tracking-widest text-yellow-200/70">Bet</span>
              <div className="flex items-center gap-1">
                <Button
                  size="icon"
                  variant="outline"
                  className="h-8 w-8 border-yellow-700/50"
                  onClick={() => { setBetIdx(i => Math.max(0, i - 1)); sound('bet', 0.2); }}
                  disabled={spinning || betIdx === 0}
                  data-testid="button-bet-down"
                >
                  <Minus className="w-3 h-3" />
                </Button>
                <div className="flex-1 text-center bg-black/60 border border-yellow-700/40 rounded px-2 py-1 font-mono text-[#D4AF37] font-bold text-sm md:text-base" data-testid="text-bet">
                  {bet.toLocaleString()}
                </div>
                <Button
                  size="icon"
                  variant="outline"
                  className="h-8 w-8 border-yellow-700/50"
                  onClick={() => { setBetIdx(i => Math.min(BET_AMOUNTS.length - 1, i + 1)); sound('bet', 0.2); }}
                  disabled={spinning || betIdx === BET_AMOUNTS.length - 1}
                  data-testid="button-bet-up"
                >
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
            </div>

            {/* Spin button */}
            <Button
              size="lg"
              variant="luxury"
              className="h-14 md:h-16 text-lg md:text-2xl font-display font-black"
              onClick={handleSpin}
              disabled={spinning}
              data-testid="button-spin"
            >
              {spinning ? <Loader2 className="w-6 h-6 animate-spin" /> : "SPIN"}
            </Button>

            {/* Auto / Last win */}
            <div className="flex flex-col gap-1 items-stretch">
              <span className="text-[10px] md:text-xs uppercase tracking-widest text-yellow-200/70">Last Win</span>
              <div className="bg-black/60 border border-yellow-700/40 rounded px-2 py-1 font-mono text-emerald-400 font-bold text-sm md:text-base text-center" data-testid="text-last-win">
                {lastWin.toLocaleString()}
              </div>
              <Button
                size="sm"
                variant={autoSpin ? "destructive" : "outline"}
                className="h-7 text-xs border-yellow-700/50"
                onClick={() => setAutoSpin(a => !a)}
                data-testid="button-auto"
              >
                {autoSpin ? "STOP AUTO" : "AUTO"}
              </Button>
            </div>
          </div>
        </div>

        <p className="text-center text-[10px] md:text-xs text-yellow-200/40 tracking-wider">
          Min bet UGX {BET_AMOUNTS[0].toLocaleString()}
        </p>
      </div>

      {/* Paytable modal */}
      <AnimatePresence>
        {showPaytable && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowPaytable(false)}
            data-testid="modal-paytable"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="bg-gradient-to-b from-[#2a140a] to-[#1a0a05] border-2 border-yellow-700 rounded-2xl p-5 max-w-md w-full shadow-[0_0_50px_rgba(212,175,55,0.4)]"
            >
              <h2 className="text-2xl font-display font-black text-[#D4AF37] mb-3 text-center">PAYTABLE</h2>
              <p className="text-xs text-yellow-200/70 mb-4 text-center">
                Match symbols on a payline starting from the leftmost reel. Payouts are per-line multipliers of your bet share (bet ÷ 5).
              </p>
              <div className="space-y-2">
                {SYMBOLS.map(s => (
                  <div key={s.id} className="flex items-center gap-3 bg-black/40 p-2 rounded border border-yellow-700/30">
                    <img src={s.image} alt={s.label} className="w-10 h-10 object-contain" style={{ filter: `drop-shadow(0 0 8px ${s.glow})` }} />
                    <span className="flex-1 text-yellow-100 font-bold text-sm">{s.label}</span>
                    <div className="flex gap-2 text-xs font-mono text-yellow-200">
                      <span>3× <b className="text-yellow-400">{(s.paytable[2] / 10).toFixed(1)}×</b></span>
                      <span>4× <b className="text-yellow-400">{(s.paytable[3] / 10).toFixed(1)}×</b></span>
                      <span>5× <b className="text-yellow-400">{(s.paytable[4] / 10).toFixed(1)}×</b></span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 grid grid-cols-5 gap-1 text-center text-[10px] text-yellow-200/80">
                {PAYLINES.map(l => (
                  <div key={l.id} className="flex flex-col items-center gap-1">
                    <span style={{ color: l.color }} className="font-bold">Line {l.id}</span>
                    <svg viewBox="0 0 50 30" className="w-full">
                      <polyline
                        points={l.rows.map((r, i) => `${5 + i * 10},${5 + r * 10}`).join(" ")}
                        fill="none"
                        stroke={l.color}
                        strokeWidth={1.5}
                      />
                    </svg>
                  </div>
                ))}
              </div>
              <Button className="w-full mt-4" variant="luxury" onClick={() => setShowPaytable(false)} data-testid="button-close-paytable">
                Close
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
