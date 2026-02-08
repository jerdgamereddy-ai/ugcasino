import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useSpinRoulette } from "@/hooks/use-games";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { playSound } from "@/lib/sounds";

// Simplified roulette logic for UI
const RED_NUMBERS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];

export function RouletteBoard() {
  const [selectedBet, setSelectedBet] = useState<{ type: 'number' | 'color' | 'parity', value: number | string } | null>(null);
  const [betAmount, setBetAmount] = useState(500);
  const { mutate: spin, isPending } = useSpinRoulette();
  const { toast } = useToast();
  const [lastResult, setLastResult] = useState<{ number: number; color: string } | null>(null);

  const handleBet = (type: 'number' | 'color' | 'parity', value: number | string) => {
    playSound('bet', 0.3);
    setSelectedBet({ type, value });
  };

  const handleSpin = () => {
    if (!selectedBet) return;
    playSound('spin');

    spin(
      {
        bet: betAmount,
        type: selectedBet.type,
        value: selectedBet.value,
      },
      {
        onSuccess: (data) => {
          playSound('reveal');
          setLastResult(data.result);
          if (data.won) {
            playSound('jackpot', 0.5);
            toast({
              title: "WINNER!",
              description: `Result: ${data.result.number} (${data.result.color}). You won UGX ${data.payout.toLocaleString()}`,
              className: "bg-primary border-primary text-black font-bold",
            });
          } else {
            playSound('lose');
            toast({
              title: "Lost",
              description: `Result: ${data.result.number} (${data.result.color}). Try again!`,
              variant: "destructive",
            });
          }
        },
        onError: (err) => {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        }
      }
    );
  };

  const NumberCell = ({ num }: { num: number }) => {
    const isRed = RED_NUMBERS.includes(num);
    const isSelected = selectedBet?.type === 'number' && selectedBet.value === num;
    
    return (
      <button
        onClick={() => handleBet('number', num)}
        data-testid={`button-roulette-${num}`}
        className={cn(
            "w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center text-sm sm:text-base font-bold text-white transition-all border border-white/10 hover-elevate",
            isRed ? "bg-red-700" : "bg-neutral-800",
            isSelected && "ring-4 ring-yellow-400 z-10 scale-110 shadow-lg"
        )}
      >
        {num}
      </button>
    );
  };

  return (
    <div className="flex flex-col gap-8 items-center w-full max-w-4xl mx-auto p-4">
      {/* Wheel Representation (Simplified Visual) */}
      <div className="relative w-72 h-72 rounded-full border-[12px] border-primary shadow-[0_0_60px_rgba(212,175,55,0.4)] bg-neutral-900 flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 bg-[conic-gradient(from_0deg,#1a1a1a_0%,#333_50%,#1a1a1a_100%)] opacity-50" />
          {isPending && (
             <motion.div 
                className="absolute inset-0 border-t-8 border-primary rounded-full shadow-[0_0_30px_rgba(212,175,55,0.8)]"
                animate={{ rotate: 360 }}
                transition={{ duration: 0.4, ease: "linear", repeat: Infinity }}
             />
          )}
          <div className="text-center z-10 bg-black/60 w-40 h-40 rounded-full flex flex-col items-center justify-center border-4 border-white/10 backdrop-blur-md">
              {lastResult ? (
                  <motion.div 
                    initial={{ scale: 0.2, opacity: 0, rotate: -180 }} 
                    animate={{ scale: 1, opacity: 1, rotate: 0 }}
                    className="flex flex-col items-center"
                  >
                      <span className={cn(
                        "text-7xl font-black font-display drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]", 
                        lastResult.color === "red" ? "text-red-500" : lastResult.color === "black" ? "text-white" : "text-green-400"
                      )}>
                          {lastResult.number}
                      </span>
                      <span className={cn(
                        "text-xs font-black uppercase tracking-[0.3em] mt-2 px-3 py-1 rounded-full",
                        lastResult.color === "red" ? "bg-red-500 text-white" : lastResult.color === "black" ? "bg-zinc-800 text-white" : "bg-green-500 text-black"
                      )}>
                        {lastResult.color}
                      </span>
                  </motion.div>
              ) : (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin opacity-20" />
                    <span className="text-primary font-black text-xs uppercase tracking-[0.2em] animate-pulse">Waiting...</span>
                  </div>
              )}
          </div>
      </div>

      {/* Betting Board */}
      <div className="bg-green-600/20 p-8 rounded-3xl border-4 border-green-500/30 backdrop-blur-xl overflow-x-auto w-full shadow-[0_0_40px_rgba(34,197,94,0.15)]">
         <div className="flex flex-col gap-2 min-w-[600px]">
            {/* Zero Row */}
            <div className="flex">
                <button 
                    onClick={() => handleBet('number', 0)}
                    data-testid="button-roulette-0"
                    className={cn(
                        "w-full h-12 flex items-center justify-center text-white font-bold bg-green-700 rounded-t-lg border border-white/10 hover-elevate",
                        selectedBet?.value === 0 && "ring-4 ring-yellow-400 z-10"
                    )}
                >
                    0
                </button>
            </div>
            
            {/* Numbers Grid */}
            <div className="grid grid-cols-12 gap-1">
                {Array.from({ length: 36 }, (_, i) => i + 1).map(n => (
                    <NumberCell key={n} num={n} />
                ))}
            </div>

            {/* Outside Bets */}
            <div className="grid grid-cols-4 gap-2 mt-2">
                <button 
                    onClick={() => handleBet('color', 'red')}
                    data-testid="button-bet-red"
                    className={cn("bg-red-700 h-12 rounded text-white font-bold hover-elevate", selectedBet?.value === 'red' && "ring-2 ring-yellow-400")}
                >
                    RED
                </button>
                <button 
                    onClick={() => handleBet('color', 'black')}
                    data-testid="button-bet-black"
                    className={cn("bg-black h-12 rounded text-white font-bold border border-white/10 hover-elevate", selectedBet?.value === 'black' && "ring-2 ring-yellow-400")}
                >
                    BLACK
                </button>
                 <button 
                    onClick={() => handleBet('parity', 'even')}
                    data-testid="button-bet-even"
                    className={cn("bg-transparent border border-white/20 h-12 rounded text-white font-bold hover-elevate", selectedBet?.value === 'even' && "ring-2 ring-yellow-400 bg-white/10")}
                >
                    EVEN
                </button>
                <button 
                    onClick={() => handleBet('parity', 'odd')}
                    data-testid="button-bet-odd"
                    className={cn("bg-transparent border border-white/20 h-12 rounded text-white font-bold hover-elevate", selectedBet?.value === 'odd' && "ring-2 ring-yellow-400 bg-white/10")}
                >
                    ODD
                </button>
            </div>
         </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col md:flex-row gap-4 items-center w-full justify-between bg-neutral-900/50 p-6 rounded-xl border border-white/5">
         <div className="flex flex-wrap gap-2">
             {[500, 1000, 2000, 5000, 10000, 20000, 50000].map(amt => (
                 <button
                    key={amt}
                    onClick={() => { setBetAmount(amt); playSound('bet', 0.2); }}
                    data-testid={`button-roulette-bet-${amt}`}
                    className={cn("px-3 py-1.5 rounded font-mono text-sm border transition-colors hover-elevate", betAmount === amt ? "bg-primary text-black border-primary font-bold" : "border-white/10 text-muted-foreground")}
                 >
                     {amt.toLocaleString()}
                 </button>
             ))}
         </div>
         
         <div className="text-sm font-mono text-primary">
             Bet: UGX {betAmount} on {selectedBet ? String(selectedBet.value).toUpperCase() : '...'}
         </div>

         <Button 
            variant="luxury" 
            size="lg"
            className="min-w-[150px]"
            onClick={handleSpin} 
            disabled={!selectedBet || isPending}
            data-testid="button-roulette-spin"
        >
             {isPending ? <Loader2 className="animate-spin" /> : "SPIN"}
         </Button>
      </div>
    </div>
  );
}
