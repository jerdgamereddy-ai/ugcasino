import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSpinSlots } from "@/hooks/use-games";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Coins, Loader2, Sparkles } from "lucide-react";
import { playSound } from "@/lib/sounds";

import bananaImg from "@assets/banana_1770797891098.png";
import berriesImg from "@assets/berries_1770797891098.png";
import coconutImg from "@assets/coconut_1770797891098.png";
import mangoImg from "@assets/mango2_1770797891098.png";
import melonImg from "@assets/melon_1770797891098.png";
import orangeImg from "@assets/orange_1770797891098.png";
import pineappleImg from "@assets/pineapple_1770797891098.png";

const SYMBOL_CONFIGS = [
  { id: "banana", image: bananaImg, glow: "rgba(255,215,0,0.6)", label: "Banana" },
  { id: "berries", image: berriesImg, glow: "rgba(220,38,38,0.6)", label: "Berries" },
  { id: "coconut", image: coconutImg, glow: "rgba(139,90,43,0.6)", label: "Coconut" },
  { id: "mango", image: mangoImg, glow: "rgba(255,0,100,0.6)", label: "Mango" },
  { id: "melon", image: melonImg, glow: "rgba(34,197,94,0.6)", label: "Melon" },
  { id: "orange", image: orangeImg, glow: "rgba(251,146,60,0.6)", label: "Orange" },
  { id: "pineapple", image: pineappleImg, glow: "rgba(234,179,8,0.6)", label: "Pineapple" },
];

const SYMBOL_MAP: Record<string, number> = {
  "banana": 0, "berries": 1, "coconut": 2, "mango": 3, "melon": 4, "orange": 5, "pineapple": 6,
};

function Symbol3D({ symbolIndex, isSpinning, delay = 0 }: { symbolIndex: number; isSpinning: boolean; delay?: number }) {
  const config = SYMBOL_CONFIGS[symbolIndex % SYMBOL_CONFIGS.length];

  return (
    <motion.div
      className="relative flex items-center justify-center w-full h-full"
      initial={{ rotateX: isSpinning ? -90 : 0, scale: isSpinning ? 0.5 : 1 }}
      animate={{ rotateX: 0, scale: 1 }}
      transition={{
        type: "spring",
        stiffness: 200,
        damping: 15,
        delay: isSpinning ? 0 : delay * 0.15,
      }}
      style={{ perspective: "600px" }}
    >
      <div
        className="relative p-1 rounded-2xl"
        style={{
          filter: `drop-shadow(0 0 12px ${config.glow}) drop-shadow(0 4px 8px rgba(0,0,0,0.5))`,
          transform: "translateZ(20px)",
        }}
      >
        <img
          src={config.image}
          alt={config.label}
          className="w-14 h-14 md:w-20 md:h-20 object-contain"
          style={{
            filter: `drop-shadow(0 0 8px ${config.glow})`,
          }}
          draggable={false}
        />
      </div>
      <div
        className="absolute inset-0 rounded-2xl pointer-events-none"
        style={{
          background: "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.15) 0%, transparent 60%)",
        }}
      />
    </motion.div>
  );
}

export function SlotMachine() {
  const [reels, setReels] = useState([4, 4, 4]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [bet, setBet] = useState(500);
  const [showWinEffect, setShowWinEffect] = useState(false);
  const { mutate: spin, isPending } = useSpinSlots();
  const { toast } = useToast();

  const handleSpin = () => {
    playSound('spin');
    setIsSpinning(true);
    setShowWinEffect(false);

    const interval = setInterval(() => {
      setReels(prev => prev.map(() => Math.floor(Math.random() * SYMBOL_CONFIGS.length)));
    }, 80);

    spin(
      { bet },
      {
        onSuccess: (data) => {
          setTimeout(() => {
            clearInterval(interval);
            setIsSpinning(false);
            const mappedReels = data.reels.map((name: string) => {
              return SYMBOL_MAP[name] ?? Math.floor(Math.random() * SYMBOL_CONFIGS.length);
            });
            setReels(mappedReels);

            if (data.won) {
              playSound('jackpot', 0.6);
              setShowWinEffect(true);
              setTimeout(() => setShowWinEffect(false), 3000);
              toast({
                title: "JACKPOT!",
                description: `You won UGX ${data.payout.toLocaleString()}`,
                className: "bg-emerald-600 border-emerald-400 text-white font-black",
              });
            } else {
              playSound('lose');
              toast({
                title: "Try Again",
                description: "Better luck next time!",
                variant: "destructive"
              });
            }
          }, 1200);
        },
        onError: (err) => {
          clearInterval(interval);
          setIsSpinning(false);
          toast({
            title: "Error",
            description: err.message,
            variant: "destructive",
          });
        },
      }
    );
  };

  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-4xl mx-auto p-4 md:p-8">

      <div className="relative bg-gradient-to-b from-neutral-800 to-neutral-900 p-8 rounded-3xl border-4 border-primary shadow-[0_0_60px_rgba(212,175,55,0.4)] w-full">
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-primary px-8 py-3 rounded-t-2xl border-t-2 border-l-2 border-r-2 border-yellow-200 shadow-[0_-5px_20px_rgba(212,175,55,0.5)]">
             <span className="font-display font-black text-black tracking-[0.2em] text-lg">FRUIT SLOTS</span>
        </div>

        <AnimatePresence>
          {showWinEffect && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-20 pointer-events-none rounded-3xl overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/20 to-transparent animate-pulse" />
              {[...Array(12)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ y: -20, x: Math.random() * 100 + "%", opacity: 1, scale: 0 }}
                  animate={{
                    y: "120%",
                    opacity: [1, 1, 0],
                    scale: [0, 1.5, 0.5],
                    rotate: [0, 360],
                  }}
                  transition={{ duration: 2, delay: i * 0.15, ease: "easeOut" }}
                  className="absolute"
                >
                  <Sparkles className="w-6 h-6 text-primary" />
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex gap-2 md:gap-4 justify-center bg-black p-6 rounded-2xl border-4 border-yellow-900/50 shadow-[inset_0_0_40px_rgba(0,0,0,1)] relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-white/5 via-transparent to-white/5 pointer-events-none" />

          {reels.map((symbolIdx, i) => (
            <div
              key={i}
              className="w-24 h-28 md:w-36 md:h-44 bg-gradient-to-b from-zinc-900 via-zinc-800 to-zinc-900 rounded-xl flex items-center justify-center shadow-[inset_0_0_20px_rgba(0,0,0,0.8),0_0_15px_rgba(212,175,55,0.1)] border-2 border-white/10 relative overflow-hidden"
              style={{ perspective: "800px" }}
            >
              <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-white/10 pointer-events-none" />
              <div className="absolute top-0 left-0 right-0 h-6 bg-gradient-to-b from-black/60 to-transparent pointer-events-none z-10" />
              <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-black/60 to-transparent pointer-events-none z-10" />

              <AnimatePresence mode="wait">
                <motion.div
                  key={isSpinning ? `spin-${Date.now()}-${i}` : `stop-${symbolIdx}-${i}`}
                  initial={{ y: isSpinning ? -60 : 0, opacity: isSpinning ? 0.4 : 1, rotateX: isSpinning ? -45 : 0 }}
                  animate={{ y: 0, opacity: 1, rotateX: 0 }}
                  transition={{
                    type: isSpinning ? "tween" : "spring",
                    duration: isSpinning ? 0.08 : 0.5,
                    stiffness: 200,
                    damping: 12,
                    delay: isSpinning ? 0 : i * 0.2,
                  }}
                >
                  <Symbol3D symbolIndex={symbolIdx} isSpinning={isSpinning} delay={i} />
                </motion.div>
              </AnimatePresence>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-col md:flex-row items-center justify-between gap-6 bg-neutral-900/50 p-6 rounded-xl border border-white/5">
           <div className="flex flex-col gap-2 w-full md:w-auto">
               <label className="text-xs text-muted-foreground uppercase tracking-widest">Bet Amount</label>
               <div className="flex flex-wrap gap-2">
                   {[500, 1000, 2000, 5000, 10000, 20000, 50000].map((amount) => (
                       <button
                           key={amount}
                           onClick={() => { setBet(amount); playSound('bet', 0.2); }}
                           disabled={isSpinning || isPending}
                           data-testid={`button-bet-${amount}`}
                           className={`px-3 py-1.5 rounded text-sm font-mono border transition-all ${bet === amount ? "bg-primary text-black border-primary font-bold" : "bg-transparent text-muted-foreground border-white/10 hover:border-primary/50"}`}
                       >
                           {amount.toLocaleString()}
                       </button>
                   ))}
               </div>
           </div>

           <Button
                size="lg"
                variant="luxury"
                className="w-full md:w-auto min-w-[200px] h-16 text-xl relative overflow-visible group"
                onClick={handleSpin}
                disabled={isSpinning || isPending}
                data-testid="button-spin"
           >
                {isSpinning ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                    <span className="relative z-10 flex items-center gap-2">
                        SPIN <Sparkles className="w-5 h-5" />
                    </span>
                )}
           </Button>
        </div>
      </div>

      <div className="text-center text-muted-foreground text-sm">
          <p>Min Bet: UGX 500 - 3 Matching Fruits Wins</p>
      </div>
    </div>
  );
}
