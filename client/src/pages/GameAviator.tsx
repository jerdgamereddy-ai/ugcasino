import { useState, useEffect, useRef, useCallback } from "react";
import { ProtectedLayout } from "@/components/layout/ProtectedLayout";
import { useUser } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Plane, Rocket, Coins, History, Settings as SettingsIcon, Sparkles } from "lucide-react";
import { playSound } from "@/lib/sounds";
import { useFullscreen, FullscreenButton } from "@/components/FullscreenToggle";
import aviatorPlanePng from "@assets/aviator_plane_1777409200000.png";
import aviatorBgJpeg from "@assets/aviator_bg_1777409200000.jpeg";

const GROWTH = 0.06; // matches server: m(t) = exp(0.06 * seconds_elapsed)
const BET_PRESETS = [500, 1000, 2000, 5000, 10000, 25000];
const HISTORY_KEY = "aviator_history_v1";

type Phase = "idle" | "waiting" | "flying" | "cashed" | "crashed";

interface AviatorSettings {
  houseEdgePct: number;
  growth: number;
  maxMultiplier: number;
}

interface BetResp {
  roundId: string;
  startTime: number; // server ms timestamp when the round actually starts
  balance: number;
}

interface CashoutResp {
  won: boolean;
  multiplier: number;
  payout: number;
  crashed?: boolean;
  balance: number;
}

interface RevealResp {
  revealed: boolean;
  crashPoint?: number;
}

function multiplierColor(m: number): string {
  if (m < 1.5) return "text-rose-500";
  if (m < 2) return "text-orange-400";
  if (m < 5) return "text-yellow-400";
  if (m < 10) return "text-emerald-400";
  return "text-fuchsia-400";
}

function historyChipColor(m: number): string {
  if (m < 2) return "bg-rose-500/15 text-rose-400 border-rose-500/40";
  if (m < 5) return "bg-amber-500/15 text-amber-400 border-amber-500/40";
  if (m < 10) return "bg-emerald-500/15 text-emerald-400 border-emerald-500/40";
  return "bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/40";
}

export default function GameAviator() {
  const { data: user } = useUser();
  const { toast } = useToast();
  const { data: settings } = useQuery<AviatorSettings>({ queryKey: ["/api/games/aviator/settings"] });
  const { isFullscreen, toggle, containerRef } = useFullscreen();

  const [bet, setBet] = useState(500);
  const [phase, setPhase] = useState<Phase>("idle");
  const [multiplier, setMultiplier] = useState(1.0);
  const [roundId, setRoundId] = useState<string | null>(null);
  const [serverStart, setServerStart] = useState<number | null>(null);
  const [clientServerOffset, setClientServerOffset] = useState(0); // (serverNow - clientNow)
  const [countdown, setCountdown] = useState(0);
  const [crashedAt, setCrashedAt] = useState<number | null>(null);
  const [lastWin, setLastWin] = useState<{ multiplier: number; payout: number } | null>(null);
  const [bigWin, setBigWin] = useState<{ multiplier: number; payout: number } | null>(null);
  const [autoCashoutEnabled, setAutoCashoutEnabled] = useState(false);
  const [autoCashoutAt, setAutoCashoutAt] = useState(2.0);
  const [autoplay, setAutoplay] = useState(false);
  const [history, setHistory] = useState<number[]>(() => {
    if (typeof window === "undefined") return [];
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"); } catch { return []; }
  });

  const rafRef = useRef<number>();
  const phaseRef = useRef<Phase>("idle");
  const cashoutInFlightRef = useRef(false);
  const autoplayRef = useRef(autoplay);
  const autoCashoutEnabledRef = useRef(autoCashoutEnabled);
  const autoCashoutAtRef = useRef(autoCashoutAt);
  const betRef = useRef(bet);
  const userBalanceRef = useRef<number>(user?.balance ?? 0);

  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { autoplayRef.current = autoplay; }, [autoplay]);
  useEffect(() => { autoCashoutEnabledRef.current = autoCashoutEnabled; }, [autoCashoutEnabled]);
  useEffect(() => { autoCashoutAtRef.current = autoCashoutAt; }, [autoCashoutAt]);
  useEffect(() => { betRef.current = bet; }, [bet]);
  useEffect(() => { userBalanceRef.current = user?.balance ?? 0; }, [user?.balance]);

  const pushHistory = useCallback((m: number) => {
    setHistory((prev) => {
      const next = [+m.toFixed(2), ...prev].slice(0, 18);
      try { localStorage.setItem(HISTORY_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  // Cashout - shared so both manual and auto can call it
  const doCashout = useCallback(async () => {
    if (cashoutInFlightRef.current) return;
    if (phaseRef.current !== "flying" || !roundId) return;
    cashoutInFlightRef.current = true;
    try {
      const res = await fetch("/api/games/aviator/cashout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roundId }),
      });
      const data: CashoutResp = await res.json();
      if (!res.ok) throw new Error((data as any)?.message || "Cashout failed");
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      if (data.won && data.payout > 0) {
        setPhase("cashed");
        phaseRef.current = "cashed";
        setMultiplier(data.multiplier);
        setLastWin({ multiplier: data.multiplier, payout: data.payout });
        pushHistory(data.multiplier);
        playSound("jackpot", 0.5);
        if (data.multiplier >= 5) {
          setBigWin({ multiplier: data.multiplier, payout: data.payout });
          setTimeout(() => setBigWin(null), 4500);
        } else {
          toast({ title: `Cashed out at ${data.multiplier.toFixed(2)}x`, description: `+${data.payout.toLocaleString()} UGX`, className: "bg-emerald-600 text-white" });
        }
      } else {
        // Already crashed (e.g. cashout race lost)
        setPhase("crashed");
        phaseRef.current = "crashed";
        setCrashedAt(data.multiplier);
        pushHistory(data.multiplier);
        playSound("lose", 0.5);
      }
    } catch (err: any) {
      toast({ title: "Cashout error", description: err.message ?? "Unknown error", variant: "destructive" });
    } finally {
      cashoutInFlightRef.current = false;
    }
  }, [roundId, pushHistory, toast]);

  // Reveal crash point after the plane crashes
  const revealCrash = useCallback(async (rid: string) => {
    try {
      const res = await fetch("/api/games/aviator/reveal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roundId: rid }),
      });
      const data: RevealResp = await res.json();
      if (data.revealed && typeof data.crashPoint === "number") {
        setCrashedAt(data.crashPoint);
        pushHistory(data.crashPoint);
      }
    } catch {}
  }, [pushHistory]);

  // The animation loop - drives countdown + multiplier
  useEffect(() => {
    if (phase !== "waiting" && phase !== "flying") return;

    const tick = () => {
      const serverNow = Date.now() + clientServerOffset;
      if (serverStart === null) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      const elapsed = serverNow - serverStart;

      if (elapsed < 0) {
        // Pre-flight countdown
        setCountdown(Math.ceil(-elapsed / 1000));
        if (phaseRef.current !== "waiting") {
          setPhase("waiting");
          phaseRef.current = "waiting";
        }
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      if (phaseRef.current === "waiting") {
        setPhase("flying");
        phaseRef.current = "flying";
      }

      const m = Math.exp(GROWTH * (elapsed / 1000));
      setMultiplier(m);

      // Auto cashout
      if (autoCashoutEnabledRef.current && phaseRef.current === "flying" && !cashoutInFlightRef.current) {
        if (m >= autoCashoutAtRef.current) {
          doCashout();
        }
      }

      // Detect probable crash by polling reveal endpoint every ~250ms once we're flying
      // (we don't know crashPoint client-side; reveal endpoint tells us)
      // We piggyback on tick and throttle separately.

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [phase, serverStart, clientServerOffset, doCashout]);

  // Crash polling - separate interval so it's not coupled to RAF rate
  useEffect(() => {
    if (phase !== "flying" || !roundId) return;
    let stopped = false;
    const poll = async () => {
      while (!stopped) {
        await new Promise((r) => setTimeout(r, 350));
        if (stopped || phaseRef.current !== "flying" || !roundId) break;
        try {
          const res = await fetch("/api/games/aviator/reveal", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ roundId }),
          });
          const data: RevealResp = await res.json();
          if (data.revealed && typeof data.crashPoint === "number") {
            stopped = true;
            setPhase("crashed");
            phaseRef.current = "crashed";
            setCrashedAt(data.crashPoint);
            setMultiplier(data.crashPoint);
            pushHistory(data.crashPoint);
            playSound("lose", 0.4);
            return;
          }
        } catch {}
      }
    };
    poll();
    return () => { stopped = true; };
  }, [phase, roundId, pushHistory]);

  // After crash or cashout, return to idle (and trigger autoplay if on)
  useEffect(() => {
    if (phase !== "crashed" && phase !== "cashed") return;
    const timer = setTimeout(() => {
      setPhase("idle");
      phaseRef.current = "idle";
      setRoundId(null);
      setServerStart(null);
      setMultiplier(1.0);
      setCountdown(0);
      setCrashedAt(null);
      if (autoplayRef.current && betRef.current <= userBalanceRef.current) {
        placeBet();
      }
    }, 2200);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const placeBet = useCallback(async () => {
    if (phaseRef.current !== "idle") return;
    const stakeBet = betRef.current;
    if (stakeBet < 100) {
      toast({ title: "Minimum bet is UGX 100", variant: "destructive" });
      return;
    }
    if ((user?.balance ?? 0) < stakeBet) {
      toast({ title: "Insufficient balance", variant: "destructive" });
      setAutoplay(false);
      return;
    }
    try {
      playSound("bet", 0.4);
      const res = await fetch("/api/games/aviator/bet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bet: stakeBet }),
      });
      const data: BetResp = await res.json();
      if (!res.ok) throw new Error((data as any)?.message || "Bet failed");
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      const offset = data.startTime - Date.now() - 3000 + 0; // server start was set to serverNow + 3000 at that moment
      // More robust: align using "received now" vs server.startTime - 3000
      const approximateServerNow = data.startTime - 3000;
      setClientServerOffset(approximateServerNow - Date.now());
      setServerStart(data.startTime);
      setRoundId(data.roundId);
      setLastWin(null);
      setMultiplier(1.0);
      setPhase("waiting");
      phaseRef.current = "waiting";
    } catch (err: any) {
      toast({ title: "Bet error", description: err.message ?? "Unknown error", variant: "destructive" });
      setAutoplay(false);
    }
  }, [user?.balance, toast]);

  const adjustBet = (delta: number) => {
    setBet((b) => Math.max(100, b + delta));
  };

  // Plane position based on multiplier (pseudo path)
  const planeProgress = phase === "flying" || phase === "waiting"
    ? Math.min(1, Math.log(Math.max(1, multiplier)) / Math.log(20))
    : phase === "crashed"
      ? Math.min(1, Math.log(Math.max(1, crashedAt ?? multiplier)) / Math.log(20))
      : 0;

  const planeX = 5 + planeProgress * 75; // 5% -> 80%
  const planeY = 80 - planeProgress * 65; // 80% -> 15%

  return (
    <ProtectedLayout>
      <div ref={containerRef} className={isFullscreen ? "bg-background p-4 overflow-auto h-screen" : ""}>
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Plane className="w-7 h-7 text-primary" />
              <h1 className="text-3xl md:text-5xl font-display font-bold text-white tracking-tight">Aviator</h1>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-primary font-bold text-sm" data-testid="text-balance">
                Balance: {(user?.balance ?? 0).toLocaleString()} UGX
              </span>
              <FullscreenButton isFullscreen={isFullscreen} onToggle={toggle} />
            </div>
          </div>

          {/* Round history strip */}
          <Card className="glass-card">
            <CardContent className="p-3 flex items-center gap-2 overflow-x-auto">
              <History className="w-4 h-4 text-muted-foreground shrink-0" />
              {history.length === 0 ? (
                <span className="text-xs text-muted-foreground">No rounds yet — be the first to fly!</span>
              ) : (
                history.map((m, i) => (
                  <span
                    key={i}
                    className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-mono font-bold border ${historyChipColor(m)}`}
                    data-testid={`history-${i}`}
                  >
                    {m.toFixed(2)}x
                  </span>
                ))
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Sky / multiplier display */}
            <div className="lg:col-span-2">
              <Card className="glass-card overflow-hidden">
                <CardContent className="p-0">
                  <div className="relative w-full h-[420px] md:h-[480px] overflow-hidden bg-black">
                    {/* Spribe-style rotating sun-ray background */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                      <div
                        className="absolute"
                        style={{
                          top: "50%",
                          left: "50%",
                          width: "180%",
                          height: "180%",
                          transform: "translate(-50%, -50%)",
                          backgroundImage: `url(${aviatorBgJpeg})`,
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                          backgroundRepeat: "no-repeat",
                          animation: phase === "flying" ? "aviator-spin 8s linear infinite" : "aviator-spin 24s linear infinite",
                          opacity: phase === "crashed" ? 0.35 : 0.85,
                          transition: "opacity 0.5s ease",
                        }}
                      />
                      {/* Vignette so the multiplier reads cleanly over the rays */}
                      <div className="absolute inset-0" style={{
                        background: "radial-gradient(circle at 50% 50%, rgba(0,0,0,0) 0%, rgba(0,0,0,0.55) 75%, rgba(0,0,0,0.85) 100%)",
                      }} />
                    </div>

                    {/* Trail */}
                    {(phase === "flying" || phase === "crashed") && (
                      <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none" viewBox="0 0 100 100">
                        <defs>
                          <linearGradient id="trailGradient" x1="0%" y1="100%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="rgba(212,175,55,0)" />
                            <stop offset="60%" stopColor="rgba(212,175,55,0.6)" />
                            <stop offset="100%" stopColor="rgba(255,200,80,1)" />
                          </linearGradient>
                        </defs>
                        <path
                          d={`M 5 80 Q ${(5 + planeX) / 2} 80 ${planeX} ${planeY}`}
                          stroke={phase === "crashed" ? "rgba(244,63,94,0.7)" : "url(#trailGradient)"}
                          strokeWidth="0.8"
                          fill="none"
                        />
                      </svg>
                    )}

                    {/* Plane (real Aviator red plane asset) */}
                    <AnimatePresence>
                      {(phase === "waiting" || phase === "flying") && (
                        <motion.div
                          key="plane"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="absolute"
                          style={{ left: `${planeX}%`, top: `${planeY}%`, transform: "translate(-50%, -50%)" }}
                        >
                          <motion.div
                            animate={{ rotate: phase === "flying" ? -18 : 0, y: phase === "flying" ? [0, -3, 0] : 0 }}
                            transition={{ y: { repeat: Infinity, duration: 0.6 } }}
                            className="origin-center relative"
                          >
                            <img
                              src={aviatorPlanePng}
                              alt=""
                              aria-hidden="true"
                              width={500}
                              height={318}
                              decoding="async"
                              draggable={false}
                              className="w-28 md:w-36 h-auto drop-shadow-[0_0_18px_rgba(220,53,69,0.55)]"
                              style={{ pointerEvents: "none" }}
                            />
                            {/* Spinning propeller overlaid on the plane's nose */}
                            <div
                              className="absolute pointer-events-none"
                              style={{
                                left: "6%",
                                top: "50%",
                                transform: "translate(-50%, -50%)",
                              }}
                              data-testid="aviator-propeller"
                            >
                              {/* Soft motion-blur disc */}
                              <div
                                className="rounded-full"
                                style={{
                                  width: "28px",
                                  height: "28px",
                                  background:
                                    "radial-gradient(circle, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.18) 45%, rgba(255,255,255,0) 70%)",
                                  filter: "blur(1px)",
                                }}
                              />
                              {/* Spinning blades */}
                              <div
                                className="absolute inset-0 flex items-center justify-center"
                                style={{
                                  animation:
                                    phase === "flying"
                                      ? "aviator-prop 0.08s linear infinite"
                                      : "aviator-prop 0.4s linear infinite",
                                }}
                              >
                                <div
                                  style={{
                                    width: "26px",
                                    height: "3px",
                                    background:
                                      "linear-gradient(90deg, rgba(40,40,40,0.95), rgba(220,220,220,0.95), rgba(40,40,40,0.95))",
                                    borderRadius: "2px",
                                    boxShadow: "0 0 4px rgba(0,0,0,0.6)",
                                    position: "absolute",
                                  }}
                                />
                                <div
                                  style={{
                                    width: "26px",
                                    height: "3px",
                                    background:
                                      "linear-gradient(90deg, rgba(40,40,40,0.95), rgba(220,220,220,0.95), rgba(40,40,40,0.95))",
                                    borderRadius: "2px",
                                    boxShadow: "0 0 4px rgba(0,0,0,0.6)",
                                    position: "absolute",
                                    transform: "rotate(90deg)",
                                  }}
                                />
                                {/* Hub */}
                                <div
                                  className="absolute rounded-full"
                                  style={{
                                    width: "6px",
                                    height: "6px",
                                    background:
                                      "radial-gradient(circle, #fff 0%, #d4af37 60%, #6b4f00 100%)",
                                    boxShadow: "0 0 4px rgba(255,215,0,0.8)",
                                  }}
                                />
                              </div>
                            </div>
                          </motion.div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Crash explosion */}
                    <AnimatePresence>
                      {phase === "crashed" && (
                        <motion.div
                          key="boom"
                          initial={{ scale: 0, opacity: 1 }}
                          animate={{ scale: [0, 1.4, 1.6], opacity: [1, 1, 0] }}
                          transition={{ duration: 1.6 }}
                          className="absolute"
                          style={{ left: `${planeX}%`, top: `${planeY}%`, transform: "translate(-50%, -50%)" }}
                        >
                          <div className="w-24 h-24 rounded-full bg-gradient-to-r from-red-500 via-orange-500 to-yellow-400 blur-md" />
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Center multiplier + status */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      {phase === "idle" && (
                        <div className="text-center">
                          <Rocket className="w-16 h-16 text-primary mx-auto mb-3 opacity-60" />
                          <p className="text-2xl font-display font-bold text-white/80">Place your bet to fly</p>
                          <p className="text-xs text-muted-foreground mt-2">Cash out before the plane flies away!</p>
                        </div>
                      )}
                      {phase === "waiting" && (
                        <div className="text-center">
                          <p className="text-xs uppercase tracking-[0.3em] text-primary/80 mb-2">Next round in</p>
                          <motion.p
                            key={countdown}
                            initial={{ scale: 0.7, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="text-7xl md:text-8xl font-black font-mono text-primary"
                            data-testid="text-countdown"
                          >
                            {countdown}
                          </motion.p>
                        </div>
                      )}
                      {(phase === "flying" || phase === "cashed") && (
                        <motion.div
                          key="mult"
                          animate={phase === "cashed" ? { scale: [1, 1.4, 1] } : {}}
                          className={`text-7xl md:text-9xl font-black font-mono tracking-tighter ${multiplierColor(multiplier)} drop-shadow-[0_0_30px_currentColor]`}
                          data-testid="text-multiplier"
                        >
                          {multiplier.toFixed(2)}x
                        </motion.div>
                      )}
                      {phase === "crashed" && (
                        <div className="text-center">
                          <p className="text-xs uppercase tracking-[0.3em] text-rose-400 mb-2">Flew away at</p>
                          <p className="text-7xl md:text-8xl font-black font-mono text-rose-500 drop-shadow-[0_0_30px_rgba(244,63,94,0.6)]" data-testid="text-crash">
                            {(crashedAt ?? multiplier).toFixed(2)}x
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Bet panel */}
            <div className="space-y-4">
              <Card className="glass-card">
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-center gap-2">
                    <Coins className="w-4 h-4 text-primary" />
                    <span className="text-xs uppercase tracking-widest text-muted-foreground">Bet Amount (UGX)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => adjustBet(-500)} disabled={phase !== "idle"} data-testid="button-bet-down">−</Button>
                    <Input
                      type="number"
                      value={bet}
                      onChange={(e) => setBet(Math.max(100, parseInt(e.target.value || "0")))}
                      disabled={phase !== "idle"}
                      className="text-center font-mono font-bold"
                      data-testid="input-bet"
                    />
                    <Button variant="outline" size="sm" onClick={() => adjustBet(500)} disabled={phase !== "idle"} data-testid="button-bet-up">+</Button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {BET_PRESETS.map((p) => (
                      <Button
                        key={p}
                        variant="outline"
                        size="sm"
                        onClick={() => setBet(p)}
                        disabled={phase !== "idle"}
                        className="text-xs font-mono"
                        data-testid={`button-preset-${p}`}
                      >
                        {p >= 1000 ? `${p / 1000}K` : p}
                      </Button>
                    ))}
                  </div>

                  {phase === "idle" && (
                    <Button
                      variant="luxury"
                      className="w-full h-14 text-lg font-bold"
                      onClick={placeBet}
                      data-testid="button-place-bet"
                    >
                      <Rocket className="w-5 h-5 mr-2" /> Place Bet
                    </Button>
                  )}
                  {phase === "waiting" && (
                    <Button variant="outline" className="w-full h-14 text-base" disabled data-testid="button-waiting">
                      Bet locked — taking off in {countdown}s
                    </Button>
                  )}
                  {phase === "flying" && (
                    <Button
                      className="w-full h-14 text-lg font-bold bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white"
                      onClick={doCashout}
                      data-testid="button-cashout"
                    >
                      Cash Out — {(bet * multiplier).toLocaleString(undefined, { maximumFractionDigits: 0 })} UGX
                    </Button>
                  )}
                  {phase === "cashed" && lastWin && (
                    <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-center">
                      <p className="text-xs uppercase tracking-widest text-emerald-400">You cashed out!</p>
                      <p className="text-2xl font-black font-mono text-emerald-300" data-testid="text-last-win">
                        +{lastWin.payout.toLocaleString()} UGX
                      </p>
                      <p className="text-xs text-muted-foreground">at {lastWin.multiplier.toFixed(2)}x</p>
                    </div>
                  )}
                  {phase === "crashed" && (
                    <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-center">
                      <p className="text-xs uppercase tracking-widest text-rose-400">Plane flew away</p>
                      <p className="text-2xl font-black font-mono text-rose-300">−{bet.toLocaleString()} UGX</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="glass-card">
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-center gap-2">
                    <SettingsIcon className="w-4 h-4 text-primary" />
                    <span className="text-xs uppercase tracking-widest text-muted-foreground">Auto Controls</span>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1">
                      <label className="text-xs text-muted-foreground">Auto Cashout at</label>
                      <Input
                        type="number"
                        step="0.1"
                        min="1.1"
                        value={autoCashoutAt}
                        onChange={(e) => setAutoCashoutAt(Math.max(1.1, parseFloat(e.target.value || "0")))}
                        disabled={phase !== "idle"}
                        className="text-center font-mono"
                        data-testid="input-auto-cashout"
                      />
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <Switch
                        checked={autoCashoutEnabled}
                        onCheckedChange={setAutoCashoutEnabled}
                        data-testid="switch-auto-cashout"
                      />
                      <span className="text-[10px] text-muted-foreground">{autoCashoutEnabled ? "ON" : "OFF"}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1">
                      <label className="text-xs text-muted-foreground">Autoplay (auto-bet next round)</label>
                      <p className="text-[10px] text-muted-foreground/70">Stops if balance is too low.</p>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <Switch
                        checked={autoplay}
                        onCheckedChange={setAutoplay}
                        data-testid="switch-autoplay"
                      />
                      <span className="text-[10px] text-muted-foreground">{autoplay ? "ON" : "OFF"}</span>
                    </div>
                  </div>

                  {settings && (
                    <div className="text-[10px] text-muted-foreground/70 pt-2 border-t border-white/5">
                      House edge: {settings.houseEdgePct}% &middot; Target RTP: {(100 - settings.houseEdgePct).toFixed(1)}%
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Big-win celebration overlay */}
        <AnimatePresence>
          {bigWin && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm pointer-events-none"
            >
              <motion.div
                initial={{ scale: 0.5, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0.5, opacity: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                className="relative pointer-events-auto"
              >
                <div className="absolute inset-0 -m-20">
                  {[...Array(30)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute w-2 h-2 rounded-full"
                      style={{
                        left: "50%",
                        top: "50%",
                        background: ["#fbbf24", "#f59e0b", "#fde047", "#fb923c"][i % 4],
                      }}
                      animate={{
                        x: [0, (Math.cos((i / 30) * Math.PI * 2) * 280)],
                        y: [0, (Math.sin((i / 30) * Math.PI * 2) * 280)],
                        opacity: [1, 0],
                        scale: [1, 0],
                      }}
                      transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.04 }}
                    />
                  ))}
                </div>
                <div className="relative rounded-3xl border-4 border-primary bg-gradient-to-br from-amber-500 via-yellow-400 to-amber-600 p-10 text-center shadow-[0_0_120px_rgba(212,175,55,0.7)]">
                  <Sparkles className="w-12 h-12 text-white mx-auto mb-2 drop-shadow-lg" />
                  <p className="text-sm uppercase tracking-[0.3em] text-black/80 font-bold">Big Win!</p>
                  <p className="text-6xl md:text-7xl font-black font-mono text-black drop-shadow-lg my-2">{bigWin.multiplier.toFixed(2)}x</p>
                  <p className="text-3xl md:text-4xl font-black text-black">+{bigWin.payout.toLocaleString()} UGX</p>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ProtectedLayout>
  );
}
