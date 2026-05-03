import { useState, useEffect, useRef } from "react";
import { ProtectedLayout } from "@/components/layout/ProtectedLayout";
import { useUser } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { playSound } from "@/lib/sounds";
import coinHeads from "@assets/coin_heads.jpg";
import coinTails from "@assets/coin_tails.jpg";
import { useFullscreen, FullscreenButton } from "@/components/FullscreenToggle";

export default function CoinFlip() {
  const { data: user } = useUser();
  const { toast } = useToast();
  const { data: coinSettings } = useQuery<{ payoutMultiplier: number }>({
    queryKey: ["/api/games/coinflip/settings"],
  });
  const payoutMultiplier = coinSettings?.payoutMultiplier ?? 1.95;
  const [bet, setBet] = useState(500);
  const [isFlipping, setIsFlipping] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [lastWon, setLastWon] = useState<boolean | null>(null);
  const [rotation, setRotation] = useState(0);
  const [transitionDuration, setTransitionDuration] = useState(0.6);
  const { isFullscreen, toggle, containerRef } = useFullscreen();
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
    };
  }, []);

  // Reset to neutral when not flipping and no result yet
  useEffect(() => {
    if (!isFlipping && result === null) setRotation(0);
  }, [isFlipping, result]);

  const play = async (choice: "heads" | "tails") => {
    if (bet < 500) return toast({ title: "Minimum bet is UGX 500", variant: "destructive" });
    if (user && user.balance < bet) return toast({ title: "Insufficient balance", variant: "destructive" });

    playSound('flip');
    setIsFlipping(true);
    setResult(null);
    // Kick off a long continuous spin while we wait for the server.
    // Using a large angle + long duration makes the coin appear to spin
    // continuously regardless of network latency. We'll cut the duration
    // short and snap to the final face when the result arrives.
    setTransitionDuration(8);
    setRotation((r) => r + 360 * 24); // ~3 spins per second over 8s

    const startedAt = Date.now();
    const minSpinMs = 1200; // ensure at least this much spin time for drama

    try {
      const res = await fetch("/api/games/coinflip/play", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bet, choice }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      const elapsed = Date.now() - startedAt;
      const wait = Math.max(0, minSpinMs - elapsed);

      if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
      settleTimerRef.current = setTimeout(() => {
        if (!isMountedRef.current) return;
        // Settle the coin smoothly onto the correct face.
        setTransitionDuration(0.9);
        setRotation((r) => {
          const extra = 720; // a couple more full spins to slow down
          const target = data.result === "heads" ? 0 : 180;
          const base = r + extra;
          const mod = ((base % 360) + 360) % 360;
          return base + ((target - mod + 360) % 360);
        });
        setIsFlipping(false);
        setResult(data.result);
        setLastWon(data.won);
        queryClient.invalidateQueries({ queryKey: ["/api/user"] });

        if (data.won) {
          playSound('jackpot', 0.5);
          toast({ title: `You Won!`, description: `Payout: UGX ${data.payout}`, className: "bg-green-600 text-white" });
        } else {
          playSound('lose');
        }
      }, wait);
    } catch (err: any) {
      if (!isMountedRef.current) return;
      setIsFlipping(false);
      setTransitionDuration(0.4);
      setRotation(0);
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  return (
    <ProtectedLayout>
      <div ref={containerRef} className={isFullscreen ? "bg-background p-4 overflow-auto h-screen" : ""}>
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-center justify-end gap-4">
          <span className="text-primary font-bold text-sm" data-testid="text-balance">
            Balance: {(user?.balance ?? 0).toLocaleString()} UGX
          </span>
          <FullscreenButton isFullscreen={isFullscreen} onToggle={toggle} />
        </div>

        <div className="text-center space-y-4">
          <h1 className="text-5xl md:text-8xl font-display font-bold text-white tracking-tighter drop-shadow-[0_0_30px_rgba(212,175,55,0.5)]">
            Double or <span className="text-primary">Nothing</span>
          </h1>
          <p className="text-white font-bold text-xl drop-shadow-md">Pick a side, flip the coin, win big.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 items-center">
          <Card className="glass-card border-white/10 p-8 flex flex-col items-center justify-center min-h-[400px] bg-gradient-to-b from-black/60 to-zinc-900/60">
            {/* Perspective wrapper for true 3D */}
            <div
              className="relative w-56 h-56"
              style={{ perspective: "1200px" }}
            >
              <motion.div
                className="relative w-full h-full"
                style={{ transformStyle: "preserve-3d" }}
                animate={{ rotateY: rotation, scale: isFlipping ? 1.08 : 1 }}
                transition={{
                  rotateY: { duration: transitionDuration, ease: isFlipping ? "linear" : [0.2, 0.8, 0.2, 1] },
                  scale: { duration: 0.4 },
                }}
                data-testid="coin-3d"
                role="img"
                aria-label={result ? (result === "heads" ? "Heads" : "Tails") : isFlipping ? "Coin flipping" : "Coin"}
              >
                {/* Heads face (front) — decorative; semantic label is on the wrapper */}
                <div
                  className="absolute inset-0 rounded-full border-[6px] border-primary shadow-[0_0_80px_rgba(212,175,55,0.6)] overflow-hidden"
                  style={{
                    backfaceVisibility: "hidden",
                    WebkitBackfaceVisibility: "hidden",
                    transform: "translateZ(2px)",
                  }}
                  data-testid="img-coin-heads"
                >
                  <img src={coinHeads} alt="" aria-hidden="true" draggable={false} className="w-full h-full object-cover" />
                </div>

                {/* Tails face (back, rotated 180deg around Y) — decorative */}
                <div
                  className="absolute inset-0 rounded-full border-[6px] border-primary shadow-[0_0_80px_rgba(212,175,55,0.6)] overflow-hidden"
                  style={{
                    backfaceVisibility: "hidden",
                    WebkitBackfaceVisibility: "hidden",
                    transform: "rotateY(180deg) translateZ(2px)",
                  }}
                  data-testid="img-coin-tails"
                >
                  <img src={coinTails} alt="" aria-hidden="true" draggable={false} className="w-full h-full object-cover" />
                </div>

                {/* Coin edge — a thin gold band sitting between the two faces */}
                <div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background:
                      "radial-gradient(ellipse at center, rgba(212,175,55,0.0) 65%, rgba(212,175,55,0.85) 70%, rgba(120,90,10,0.95) 100%)",
                    transform: "translateZ(0px)",
                    pointerEvents: "none",
                  }}
                />
              </motion.div>
            </div>

            <div className="mt-12 h-8" aria-live="polite" aria-atomic="true">
              {result && !isFlipping && (
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`text-2xl font-bold uppercase tracking-widest ${lastWon ? "text-green-500" : "text-red-500"}`}
                  data-testid="text-coin-result"
                >
                  {result === "heads" ? "Heads" : "Tails"} - {lastWon ? "You Win!" : "You Lost"}
                </motion.p>
              )}
            </div>
          </Card>

          <Card className="glass-card border-white/10 p-8 space-y-6">
            <div className="space-y-4">
              <label className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Bet Amount (UGX)</label>
              <div className="flex flex-wrap gap-2">
                {[500, 1000, 2000, 5000, 10000, 20000, 50000].map(amt => (
                  <Button
                    key={amt}
                    variant={bet === amt ? "default" : "outline"}
                    size="sm"
                    onClick={() => setBet(amt)}
                    className="border-white/5 transition-colors"
                    disabled={isFlipping}
                    data-testid={`button-bet-${amt}`}
                  >
                    {amt.toLocaleString()}
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Button
                disabled={isFlipping}
                onClick={() => play("heads")}
                className="h-20 text-2xl font-black uppercase tracking-widest text-black bg-gradient-to-b from-yellow-300 via-amber-400 to-yellow-600 hover:from-yellow-200 hover:via-amber-300 hover:to-yellow-500 border-2 border-yellow-200 shadow-[0_0_30px_rgba(212,175,55,0.7)] hover:shadow-[0_0_40px_rgba(212,175,55,0.95)] transition-all"
                data-testid="button-heads"
              >
                Heads
              </Button>
              <Button
                disabled={isFlipping}
                onClick={() => play("tails")}
                className="h-20 text-2xl font-black uppercase tracking-widest text-white bg-gradient-to-b from-rose-500 via-red-600 to-rose-800 hover:from-rose-400 hover:via-red-500 hover:to-rose-700 border-2 border-rose-300 shadow-[0_0_30px_rgba(244,63,94,0.7)] hover:shadow-[0_0_40px_rgba(244,63,94,0.95)] transition-all"
                data-testid="button-tails"
              >
                Tails
              </Button>
            </div>

            <div className="pt-4 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-widest">Payout: {payoutMultiplier}x</p>
            </div>
          </Card>
        </div>
      </div>
      </div>
    </ProtectedLayout>
  );
}
