import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useSpinRoulette } from "@/hooks/use-games";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { useUser } from "@/hooks/use-auth";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { playSound } from "@/lib/sounds";

// Simplified roulette logic for UI
const RED_NUMBERS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];

export function RouletteBoard() {
  const { data: user } = useUser();
  const [selectedBet, setSelectedBet] = useState<{ type: 'number' | 'color' | 'parity', value: number | string } | null>(null);
  const [betAmount, setBetAmount] = useState(500);
  const { mutate: spin, isPending } = useSpinRoulette();
  const { toast } = useToast();
  const [lastResult, setLastResult] = useState<{ number: number; color: string } | null>(null);
  const { data: rouletteOdds } = useQuery<{ numberOdds: number; colorOdds: number; parityOdds: number }>({
    queryKey: ["/api/games/roulette/settings"],
    staleTime: 60000,
  });
  const numberOdds = rouletteOdds?.numberOdds ?? 35;
  const colorOdds = rouletteOdds?.colorOdds ?? 1;
  const parityOdds = rouletteOdds?.parityOdds ?? 1;

  const handleBet = (type: 'number' | 'color' | 'parity', value: number | string) => {
    playSound('bet', 0.3);
    setSelectedBet({ type, value });
  };

  const [wheelAngle, setWheelAngle] = useState(0);
  const [ballAngle, setBallAngle] = useState(0);
  const [ballLanded, setBallLanded] = useState(true);
  const [isAnimatingSpin, setIsAnimatingSpin] = useState(false);
  const tickTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const spinTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const stopTicking = () => {
    if (tickTimeoutRef.current) {
      clearTimeout(tickTimeoutRef.current);
      tickTimeoutRef.current = null;
    }
  };
  const clearSpinTimers = () => {
    spinTimersRef.current.forEach(t => clearTimeout(t));
    spinTimersRef.current = [];
  };
  const trackTimer = (cb: () => void, ms: number) => {
    const id = setTimeout(cb, ms);
    spinTimersRef.current.push(id);
    return id;
  };

  // Cleanup all timers on unmount
  useEffect(() => {
    return () => {
      stopTicking();
      clearSpinTimers();
    };
  }, []);

  const handleSpin = () => {
    if (!selectedBet || isAnimatingSpin) return;
    // Cancel any orphaned timers from a prior spin before starting fresh
    stopTicking();
    clearSpinTimers();

    playSound('spin');
    setLastResult(null);
    setBallLanded(false);
    setIsAnimatingSpin(true);

    // Wheel spins ~5 full revolutions, ball counter-spins faster — both will land via state
    setWheelAngle(prev => prev + 360 * 5 + Math.random() * 360);
    setBallAngle(prev => prev - (360 * 8 + Math.random() * 360));

    // Mechanical ticking while wheel is in motion (decelerates via growing gap)
    let tickGap = 90;
    const scheduleTick = () => {
      tickTimeoutRef.current = setTimeout(() => {
        playSound('tick', 0.18);
        tickGap = Math.min(320, tickGap + 14);
        scheduleTick();
      }, tickGap);
    };
    scheduleTick();

    spin(
      {
        bet: betAmount,
        type: selectedBet.type,
        value: selectedBet.value,
      },
      {
        onSuccess: (data) => {
          // Let wheel animation play out before revealing
          trackTimer(() => {
            stopTicking();
            playSound('bounce', 0.55); // ball-drop thunk
            setBallLanded(true);
            setLastResult(data.result);
            trackTimer(() => playSound('reveal', 0.4), 180);
            if (data.won) {
              trackTimer(() => playSound('jackpot', 0.5), 350);
              toast({
                title: "WINNER!",
                description: `Result: ${data.result.number} (${data.result.color}). You won UGX ${data.payout.toLocaleString()}`,
                className: "bg-primary border-primary text-black font-bold",
              });
            } else {
              trackTimer(() => playSound('lose', 0.35), 350);
              toast({
                title: "Lost",
                description: `Result: ${data.result.number} (${data.result.color}). Try again!`,
                variant: "destructive",
              });
            }
            // Free the SPIN button shortly after the reveal cues
            trackTimer(() => setIsAnimatingSpin(false), 600);
          }, 2400);
        },
        onError: (err) => {
            stopTicking();
            clearSpinTimers();
            setBallLanded(true);
            setIsAnimatingSpin(false);
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
      {/* Balance display */}
      <div className="w-full text-center">
        <span className="text-[#D4AF37] font-bold text-lg" data-testid="text-balance-roulette">
          Balance: {(user?.balance ?? 0).toLocaleString()} UGX
        </span>
      </div>

      {/* Odds Reference Table */}
      <div className="w-full grid grid-cols-3 gap-3 text-center text-xs">
        <div className="bg-white/5 border border-white/10 rounded-lg p-2">
          <div className="text-muted-foreground">Single Number</div>
          <div className="text-primary font-bold text-base">{numberOdds}:1</div>
        </div>
        <div className="bg-red-900/30 border border-red-500/20 rounded-lg p-2">
          <div className="text-muted-foreground">Red / Black</div>
          <div className="text-primary font-bold text-base">{colorOdds}:1</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-lg p-2">
          <div className="text-muted-foreground">Even / Odd</div>
          <div className="text-primary font-bold text-base">{parityOdds}:1</div>
        </div>
      </div>
      {/* Wheel Representation (Simplified Visual) */}
      <div className="relative w-72 h-72 rounded-full border-[12px] border-primary shadow-[0_0_60px_rgba(212,175,55,0.4)] bg-neutral-900 flex items-center justify-center overflow-hidden">
          {/* Wheel face — segmented colors that rotate as one piece (decelerating) */}
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{
              background: "conic-gradient(from 0deg, #b91c1c 0deg 10deg, #18181b 10deg 20deg, #b91c1c 20deg 30deg, #18181b 30deg 40deg, #b91c1c 40deg 50deg, #18181b 50deg 60deg, #b91c1c 60deg 70deg, #18181b 70deg 80deg, #b91c1c 80deg 90deg, #18181b 90deg 100deg, #16a34a 100deg 110deg, #b91c1c 110deg 120deg, #18181b 120deg 130deg, #b91c1c 130deg 140deg, #18181b 140deg 150deg, #b91c1c 150deg 160deg, #18181b 160deg 170deg, #b91c1c 170deg 180deg, #18181b 180deg 190deg, #b91c1c 190deg 200deg, #18181b 200deg 210deg, #b91c1c 210deg 220deg, #18181b 220deg 230deg, #b91c1c 230deg 240deg, #18181b 240deg 250deg, #b91c1c 250deg 260deg, #18181b 260deg 270deg, #b91c1c 270deg 280deg, #18181b 280deg 290deg, #b91c1c 290deg 300deg, #18181b 300deg 310deg, #b91c1c 310deg 320deg, #18181b 320deg 330deg, #b91c1c 330deg 340deg, #18181b 340deg 350deg, #b91c1c 350deg 360deg)",
              opacity: 0.55,
            }}
            animate={{ rotate: wheelAngle }}
            transition={{ duration: ballLanded ? 0.3 : 2.6, ease: [0.17, 0.67, 0.3, 1] }}
          />
          {/* Static highlight ring */}
          <div className="absolute inset-2 rounded-full border-2 border-amber-400/30 pointer-events-none" />

          {/* Ball — orbits in opposite direction, decelerates and "lands" */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            animate={{ rotate: ballAngle }}
            transition={{ duration: ballLanded ? 0.4 : 2.4, ease: [0.18, 0.82, 0.32, 1] }}
          >
            <div
              className="absolute left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.9),0_0_16px_rgba(255,255,255,0.5)]"
              style={{ top: ballLanded ? "16px" : "8px", transition: "top 0.3s ease-out" }}
            />
          </motion.div>

          {/* Pointer arrow at the top of the wheel */}
          <div className="absolute top-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[10px] border-l-transparent border-r-transparent border-t-amber-300 z-20 drop-shadow-[0_0_4px_rgba(255,215,0,0.8)]" />

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
                    className={cn("bg-red-700 h-14 rounded text-white font-bold hover-elevate flex flex-col items-center justify-center gap-0.5", selectedBet?.value === 'red' && "ring-2 ring-yellow-400")}
                >
                    <span>RED</span><span className="text-[10px] opacity-70">{colorOdds}:1</span>
                </button>
                <button 
                    onClick={() => handleBet('color', 'black')}
                    data-testid="button-bet-black"
                    className={cn("bg-black h-14 rounded text-white font-bold border border-white/10 hover-elevate flex flex-col items-center justify-center gap-0.5", selectedBet?.value === 'black' && "ring-2 ring-yellow-400")}
                >
                    <span>BLACK</span><span className="text-[10px] opacity-70">{colorOdds}:1</span>
                </button>
                 <button 
                    onClick={() => handleBet('parity', 'even')}
                    data-testid="button-bet-even"
                    className={cn("bg-transparent border border-white/20 h-14 rounded text-white font-bold hover-elevate flex flex-col items-center justify-center gap-0.5", selectedBet?.value === 'even' && "ring-2 ring-yellow-400 bg-white/10")}
                >
                    <span>EVEN</span><span className="text-[10px] opacity-70">{parityOdds}:1</span>
                </button>
                <button 
                    onClick={() => handleBet('parity', 'odd')}
                    data-testid="button-bet-odd"
                    className={cn("bg-transparent border border-white/20 h-14 rounded text-white font-bold hover-elevate flex flex-col items-center justify-center gap-0.5", selectedBet?.value === 'odd' && "ring-2 ring-yellow-400 bg-white/10")}
                >
                    <span>ODD</span><span className="text-[10px] opacity-70">{parityOdds}:1</span>
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
            disabled={!selectedBet || isPending || isAnimatingSpin}
            data-testid="button-roulette-spin"
        >
             {(isPending || isAnimatingSpin) ? <Loader2 className="animate-spin" /> : "SPIN"}
         </Button>
      </div>
    </div>
  );
}
