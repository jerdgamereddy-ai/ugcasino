import { useState } from "react";
import { ProtectedLayout } from "@/components/layout/ProtectedLayout";
import { useUser } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Coins, RotateCw } from "lucide-react";
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
  const { isFullscreen, toggle, containerRef } = useFullscreen();

  const play = async (choice: "heads" | "tails") => {
    if (bet < 500) return toast({ title: "Minimum bet is UGX 500", variant: "destructive" });
    if (user && user.balance < bet) return toast({ title: "Insufficient balance", variant: "destructive" });

    playSound('flip');
    setIsFlipping(true);
    setResult(null);

    try {
      const res = await fetch("/api/games/coinflip/play", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bet, choice }),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      // Animation delay
      setTimeout(() => {
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
      }, 2000);
    } catch (err: any) {
      setIsFlipping(false);
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
            <AnimatePresence mode="wait">
              <motion.div
                key={isFlipping ? "flipping" : result}
                initial={{ rotateY: 0, scale: 0.8 }}
                animate={isFlipping ? { rotateY: 1800, scale: 1.1 } : { rotateY: 0, scale: 1 }}
                transition={isFlipping ? { duration: 2, ease: "easeInOut" } : { type: "spring", damping: 15 }}
                className="relative w-56 h-56"
              >
                <div className={`w-full h-full rounded-full border-[6px] border-primary shadow-[0_0_80px_rgba(212,175,55,0.6)] relative overflow-hidden`}>
                  {isFlipping ? (
                    <div className="w-full h-full bg-gradient-to-tr from-primary via-yellow-200 to-primary flex items-center justify-center">
                      <div className="text-8xl font-display font-black text-black select-none drop-shadow-md">?</div>
                    </div>
                  ) : result ? (
                    <img
                      src={result === "heads" ? coinHeads : coinTails}
                      alt={result === "heads" ? "Heads" : "Tails"}
                      className="w-full h-full object-cover"
                      data-testid={`img-coin-${result}`}
                    />
                  ) : (
                    <img src={coinHeads} alt="Coin" className="w-full h-full object-cover" />
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
            
            <div className="mt-12 h-8">
              {result && !isFlipping && (
                <motion.p 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`text-2xl font-bold uppercase tracking-widest ${lastWon ? "text-green-500" : "text-red-500"}`}
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
                className="h-20 text-xl font-bold uppercase tracking-widest bg-zinc-800 hover:bg-zinc-700 border border-white/10"
              >
                Heads
              </Button>
              <Button
                disabled={isFlipping}
                onClick={() => play("tails")}
                className="h-20 text-xl font-bold uppercase tracking-widest bg-zinc-800 hover:bg-zinc-700 border border-white/10"
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
