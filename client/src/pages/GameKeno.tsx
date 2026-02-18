import { ProtectedLayout } from "@/components/layout/ProtectedLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Target } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

import { playSound } from "@/lib/sounds";
import { useFullscreen, FullscreenButton } from "@/components/FullscreenToggle";

export default function GameKeno() {
  const [bet, setBet] = useState(500);
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [results, setResults] = useState<number[]>([]);
  const { toast } = useToast();
  const { isFullscreen, toggle, containerRef } = useFullscreen();

  const toggleNumber = (num: number) => {
    if (isSpinning) return;
    playSound('click');
    if (selectedNumbers.includes(num)) {
      setSelectedNumbers(selectedNumbers.filter(n => n !== num));
    } else if (selectedNumbers.length < 10) {
      setSelectedNumbers([...selectedNumbers, num]);
    } else {
      toast({ title: "Limit Reached", description: "You can select up to 10 numbers." });
    }
  };

  const handlePlay = async () => {
    if (selectedNumbers.length === 0) {
      toast({ title: "Select Numbers", description: "Please select at least one number." });
      return;
    }
    playSound('spin');
    setIsSpinning(true);
    setResults([]);

    try {
      const res = await fetch("/api/games/keno/play", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bet, selectedNumbers }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setResults(data.drawnNumbers);
      
      if (data.won) {
        playSound('win');
        toast({ 
          title: "YOU WON!", 
          description: `Payout: UGX ${data.payout.toLocaleString()}`, 
          className: "bg-emerald-600 text-white font-bold" 
        });
      } else {
        playSound('lose');
        toast({ title: "Better luck next time!", variant: "destructive" });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsSpinning(false);
    }
  };

  return (
    <ProtectedLayout>
      <div ref={containerRef} className={isFullscreen ? "bg-background p-4 overflow-auto h-screen" : ""}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Link href="/">
            <Button variant="ghost" className="pl-0 hover:pl-2 transition-all text-[#D4AF37]">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Lobby
            </Button>
          </Link>
          <FullscreenButton isFullscreen={isFullscreen} onToggle={toggle} />
        </div>
        
        <div className="text-center mb-8">
          <h1 className="text-5xl md:text-7xl font-display font-bold text-primary mb-2 drop-shadow-[0_0_30px_rgba(212,175,55,0.8)]">Luxury Keno</h1>
          <p className="text-white font-black text-xl drop-shadow-[0_2px_10_rgba(0,0,0,1)] uppercase tracking-widest">Select up to 10 numbers to win big.</p>
        </div>

        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-8">
          <Card className="glass-card border-white/10 p-6 bg-black/60">
            <CardContent className="p-0 space-y-6">
              <div className="space-y-2">
                <label className="text-xs uppercase font-bold text-[#D4AF37]">Bet Amount (UGX)</label>
                <div className="flex flex-wrap gap-1.5">
                  {[500, 1000, 2000, 5000, 10000, 20000, 50000].map(amt => (
                    <button key={amt} onClick={() => setBet(amt)} disabled={isSpinning} className={`px-3 py-1.5 rounded text-xs font-mono border transition-colors ${bet === amt ? "bg-primary text-black border-primary font-bold" : "border-white/10 text-muted-foreground"}`}>{amt.toLocaleString()}</button>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-primary/10 rounded-lg border border-primary/20 text-center">
                <p className="text-xs text-primary font-bold uppercase mb-1">Numbers Selected</p>
                <p className="text-2xl font-black text-white">{selectedNumbers.length} / 10</p>
              </div>

              <Button 
                onClick={handlePlay} 
                disabled={isSpinning || selectedNumbers.length === 0}
                className="w-full h-16 text-xl font-black uppercase bg-primary text-black shadow-[0_0_30px_rgba(212,175,55,0.3)]"
              >
                {isSpinning ? "Drawing..." : "Draw Numbers"}
              </Button>
            </CardContent>
          </Card>

          <div className="md:col-span-2 grid grid-cols-8 gap-2 bg-zinc-900/50 p-4 rounded-3xl border border-white/5">
            {Array.from({ length: 80 }).map((_, i) => {
              const num = i + 1;
              const isSelected = selectedNumbers.includes(num);
              const isResult = results.includes(num);
              const isHit = isSelected && isResult;

              return (
                <motion.button
                  key={num}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => toggleNumber(num)}
                  disabled={isSpinning}
                  className={`aspect-square rounded-lg flex items-center justify-center text-sm font-bold transition-all border ${
                    isHit 
                      ? "bg-green-500 text-white border-green-400 shadow-[0_0_15px_rgba(34,197,94,0.5)]" 
                      : isResult
                      ? "bg-primary text-black border-primary shadow-[0_0_15px_rgba(212,175,55,0.5)]"
                      : isSelected
                      ? "bg-[#D4AF37]/20 text-[#D4AF37] border-[#D4AF37]"
                      : "bg-white/5 border-white/10 hover:bg-white/10 text-white/50"
                  }`}
                >
                  {num}
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>
      </div>
    </ProtectedLayout>
  );
}
