import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSpinSlots } from "@/hooks/use-games";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Coins, Loader2, Sparkles } from "lucide-react";

// Symbols for the slots
const SYMBOLS = ["🍒", "💎", "7️⃣", "🍋", "🎰", "⭐"];

import { playSound } from "@/lib/sounds";

export function SlotMachine() {
  const [reels, setReels] = useState(["🎰", "🎰", "🎰"]);
  const [bet, setBet] = useState(100);
  const [isSpinning, setIsSpinning] = useState(false);
  const { mutate: spin, isPending } = useSpinSlots();
  const { toast } = useToast();

  const handleSpin = () => {
    playSound('spin');
    setIsSpinning(true);
    
    // Optimistic animation start
    const interval = setInterval(() => {
        setReels(prev => prev.map(() => SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]));
    }, 100);

    spin(
      { bet },
      {
        onSuccess: (data) => {
          setTimeout(() => {
            clearInterval(interval);
            setIsSpinning(false);
            setReels(data.reels);
            
            if (data.won) {
              playSound('win');
              toast({
                title: "WINNER! 🎉",
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
          }, 1000); // Artificial delay for suspense
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
    <div className="flex flex-col items-center gap-8 w-full max-w-2xl mx-auto p-4 md:p-8">
      
      {/* Machine Frame */}
      <div className="relative bg-gradient-to-b from-neutral-800 to-neutral-900 p-8 rounded-3xl border-4 border-primary shadow-[0_0_60px_rgba(212,175,55,0.4)] w-full">
        {/* Decorative Top */}
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-primary px-8 py-3 rounded-t-2xl border-t-2 border-l-2 border-r-2 border-yellow-200 shadow-[0_-5px_20px_rgba(212,175,55,0.5)]">
             <span className="font-display font-black text-black tracking-[0.2em] text-lg">LUCKY SLOTS</span>
        </div>

        {/* Reels Container */}
        <div className="flex gap-2 md:gap-4 justify-center bg-black p-6 rounded-2xl border-4 border-yellow-900/50 shadow-[inset_0_0_40px_rgba(0,0,0,1)]">
          {reels.map((symbol, i) => (
            <div
              key={i}
              className="w-20 h-28 md:w-32 md:h-40 bg-gradient-to-b from-white via-gray-100 to-white rounded-xl flex items-center justify-center text-5xl md:text-7xl shadow-[inset_0_0_20px_rgba(0,0,0,0.3),0_0_15px_rgba(255,255,255,0.2)] border-2 border-gray-300 relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/10 pointer-events-none" />
              <motion.div
                key={isSpinning ? `spinning-${i}-${Date.now()}` : `stopped-${i}`}
                initial={{ y: isSpinning ? -100 : 0, opacity: isSpinning ? 0.3 : 1 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="filter drop-shadow-[0_2px_5px_rgba(0,0,0,0.5)]"
              >
                {symbol}
              </motion.div>
            </div>
          ))}
        </div>

        {/* Controls */}
        <div className="mt-8 flex flex-col md:flex-row items-center justify-between gap-6 bg-neutral-900/50 p-6 rounded-xl border border-white/5">
           <div className="flex flex-col gap-2 w-full md:w-auto">
               <label className="text-xs text-muted-foreground uppercase tracking-widest">Bet Amount</label>
               <div className="flex gap-2">
                   {[100, 500, 1000, 5000].map((amount) => (
                       <button
                           key={amount}
                           onClick={() => setBet(amount)}
                           disabled={isSpinning || isPending}
                           className={`px-3 py-1 rounded text-sm font-mono border transition-all ${bet === amount ? "bg-primary text-black border-primary" : "bg-transparent text-muted-foreground border-white/10 hover:border-primary/50"}`}
                       >
                           {amount}
                       </button>
                   ))}
               </div>
           </div>

           <Button 
                size="lg" 
                variant="luxury"
                className="w-full md:w-auto min-w-[200px] h-16 text-xl relative overflow-hidden group"
                onClick={handleSpin}
                disabled={isSpinning || isPending}
           >
                {isSpinning ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                    <>
                        <span className="relative z-10 flex items-center gap-2">
                            SPIN <Sparkles className="w-5 h-5" />
                        </span>
                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                    </>
                )}
           </Button>
        </div>
      </div>
      
      <div className="text-center text-muted-foreground text-sm">
          <p>Min Bet: UGX 100 • 3 Matching Symbols Wins</p>
      </div>
    </div>
  );
}
