import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useSpinRoulette } from "@/hooks/use-games";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Simplified roulette logic for UI
const RED_NUMBERS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];

export function RouletteBoard() {
  const [selectedBet, setSelectedBet] = useState<{ type: 'number' | 'color' | 'parity', value: number | string } | null>(null);
  const [betAmount, setBetAmount] = useState(100);
  const { mutate: spin, isPending } = useSpinRoulette();
  const { toast } = useToast();
  const [lastResult, setLastResult] = useState<{ number: number; color: string } | null>(null);

  const handleBet = (type: 'number' | 'color' | 'parity', value: number | string) => {
    setSelectedBet({ type, value });
  };

  const handleSpin = () => {
    if (!selectedBet) return;

    spin(
      {
        bet: betAmount,
        type: selectedBet.type,
        value: selectedBet.value,
      },
      {
        onSuccess: (data) => {
          setLastResult(data.result);
          if (data.won) {
            toast({
              title: "WINNER! 🎉",
              description: `Result: ${data.result.number} (${data.result.color}). You won UGX ${data.payout.toLocaleString()}`,
              className: "bg-primary border-primary text-black font-bold",
            });
          } else {
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
        className={cn(
            "w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center text-sm sm:text-base font-bold text-white transition-all border border-white/10",
            isRed ? "bg-red-700 hover:bg-red-600" : "bg-neutral-800 hover:bg-neutral-700",
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
      <div className="relative w-64 h-64 rounded-full border-8 border-yellow-700 shadow-[0_0_30px_rgba(0,0,0,0.5)] bg-neutral-900 flex items-center justify-center overflow-hidden">
          {isPending && (
             <motion.div 
                className="absolute inset-0 border-t-4 border-white/50 rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 0.5, ease: "linear", repeat: Infinity }}
             />
          )}
          <div className="text-center z-10">
              {lastResult ? (
                  <motion.div 
                    initial={{ scale: 0.5, opacity: 0 }} 
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex flex-col items-center"
                  >
                      <span className={cn("text-6xl font-bold font-display", lastResult.color === "red" ? "text-red-500" : lastResult.color === "black" ? "text-white" : "text-green-500")}>
                          {lastResult.number}
                      </span>
                      <span className="text-xs uppercase text-muted-foreground tracking-widest mt-2">{lastResult.color}</span>
                  </motion.div>
              ) : (
                  <span className="text-muted-foreground text-xs uppercase tracking-widest">Place Bet</span>
              )}
          </div>
      </div>

      {/* Betting Board */}
      <div className="bg-green-900/40 p-6 rounded-xl border border-green-800/30 backdrop-blur-sm overflow-x-auto w-full">
         <div className="flex flex-col gap-2 min-w-[600px]">
            {/* Zero Row */}
            <div className="flex">
                <button 
                    onClick={() => handleBet('number', 0)}
                    className={cn(
                        "w-full h-12 flex items-center justify-center text-white font-bold bg-green-700 hover:bg-green-600 rounded-t-lg border border-white/10",
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
                    className={cn("bg-red-700 h-12 rounded text-white font-bold hover:brightness-110", selectedBet?.value === 'red' && "ring-2 ring-yellow-400")}
                >
                    RED
                </button>
                <button 
                    onClick={() => handleBet('color', 'black')}
                    className={cn("bg-black h-12 rounded text-white font-bold hover:bg-gray-900 border border-white/10", selectedBet?.value === 'black' && "ring-2 ring-yellow-400")}
                >
                    BLACK
                </button>
                 <button 
                    onClick={() => handleBet('parity', 'even')}
                    className={cn("bg-transparent border border-white/20 h-12 rounded text-white font-bold hover:bg-white/5", selectedBet?.value === 'even' && "ring-2 ring-yellow-400 bg-white/10")}
                >
                    EVEN
                </button>
                <button 
                    onClick={() => handleBet('parity', 'odd')}
                    className={cn("bg-transparent border border-white/20 h-12 rounded text-white font-bold hover:bg-white/5", selectedBet?.value === 'odd' && "ring-2 ring-yellow-400 bg-white/10")}
                >
                    ODD
                </button>
            </div>
         </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col md:flex-row gap-4 items-center w-full justify-between bg-neutral-900/50 p-6 rounded-xl border border-white/5">
         <div className="flex gap-2">
             {[100, 500, 1000, 5000].map(amt => (
                 <button
                    key={amt}
                    onClick={() => setBetAmount(amt)}
                    className={cn("px-4 py-2 rounded font-mono text-sm border transition-colors", betAmount === amt ? "bg-primary text-black border-primary" : "border-white/10 text-muted-foreground hover:border-primary/50")}
                 >
                     {amt}
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
        >
             {isPending ? <Loader2 className="animate-spin" /> : "SPIN"}
         </Button>
      </div>
    </div>
  );
}
