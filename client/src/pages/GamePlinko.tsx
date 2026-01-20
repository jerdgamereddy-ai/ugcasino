import { ProtectedLayout } from "@/components/layout/ProtectedLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Zap } from "lucide-react";
import { Link } from "wouter";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

export default function GamePlinko() {
  const [bet, setBet] = useState(100);
  const [isDropping, setIsDropping] = useState(false);
  const [ballPath, setBallPath] = useState<number[]>([]);
  const [multiplier, setMultiplier] = useState<number | null>(null);
  const { toast } = useToast();

  const handlePlay = async () => {
    if (isDropping) return;
    setIsDropping(true);
    setMultiplier(null);
    
    try {
      const res = await fetch("/api/games/plinko/play", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bet }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      
      // Simulate ball path (for visual effect)
      const path = [];
      let currentPos = 4; // Start in middle
      for (let i = 0; i < 8; i++) {
        currentPos += Math.random() > 0.5 ? 0.5 : -0.5;
        path.push(currentPos);
      }
      setBallPath(path);
      
      setTimeout(() => {
        setIsDropping(false);
        setMultiplier(data.multiplier);
        queryClient.invalidateQueries({ queryKey: ["/api/user"] });
        if (data.multiplier > 1) {
          toast({ title: "WIN!", description: `You won UGX ${data.payout.toLocaleString()}`, className: "bg-green-600 text-white" });
        }
      }, 2000);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      setIsDropping(false);
    }
  };

  return (
    <ProtectedLayout>
      <div className="space-y-6">
        <Link href="/">
          <Button variant="ghost" className="pl-0 hover:pl-2 transition-all text-[#D4AF37]">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Lobby
          </Button>
        </Link>
        
        <div className="text-center mb-8">
          <h1 className="text-5xl md:text-7xl font-display font-bold text-primary mb-2 drop-shadow-[0_0_30px_rgba(212,175,55,0.8)]">Plinko</h1>
          <p className="text-white font-black text-xl drop-shadow-[0_2px_10px_rgba(0,0,0,1)] uppercase tracking-widest">Watch the ball drop for massive multipliers.</p>
        </div>

        <div className="max-w-4xl mx-auto grid md:grid-cols-3 gap-8">
          <Card className="glass-card border-white/10 p-6 bg-black/60">
            <CardContent className="p-0 space-y-6">
              <div className="space-y-2">
                <label className="text-xs uppercase font-bold text-[#D4AF37]">Bet Amount (UGX)</label>
                <div className="grid grid-cols-2 gap-2">
                  {[100, 500, 1000, 5000].map((amt) => (
                    <Button 
                      key={amt} 
                      variant={bet === amt ? "luxury" : "outline"}
                      onClick={() => setBet(amt)}
                      className="h-10 text-xs font-bold"
                    >
                      {amt.toLocaleString()}
                    </Button>
                  ))}
                </div>
              </div>
              <Button 
                onClick={handlePlay} 
                disabled={isDropping}
                className="w-full h-16 text-xl font-black uppercase tracking-tighter bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.3)]"
              >
                {isDropping ? "Dropping..." : "Drop Ball"}
              </Button>
            </CardContent>
          </Card>

          <div className="md:col-span-2 relative aspect-square bg-zinc-900/50 rounded-3xl border border-white/5 overflow-hidden flex flex-col items-center justify-center p-8">
            <div className="grid grid-rows-9 gap-4 w-full h-full relative">
              {/* Simplified visual representation of peg board */}
              {Array.from({ length: 9 }).map((_, row) => (
                <div key={row} className="flex justify-center gap-4">
                  {Array.from({ length: row + 3 }).map((_, i) => (
                    <div key={i} className="w-2 h-2 rounded-full bg-white/20 shadow-[0_0_5px_rgba(255,255,255,0.2)]" />
                  ))}
                </div>
              ))}
              
              <AnimatePresence>
                {isDropping && (
                  <motion.div 
                    initial={{ top: "0%", left: "50%" }}
                    animate={{ top: "90%", left: `${45 + (Math.random() * 10)}%` }}
                    transition={{ duration: 2, ease: "easeOut" }}
                    className="absolute w-4 h-4 bg-primary rounded-full shadow-[0_0_15px_rgba(212,175,55,1)] z-20"
                  />
                )}
              </AnimatePresence>
            </div>
            
            <div className="flex justify-between w-full mt-4 gap-1">
              {[0.2, 0.5, 1.2, 2, 5, 2, 1.2, 0.5, 0.2].map((m, i) => (
                <div 
                  key={i} 
                  className={`flex-1 h-12 flex items-center justify-center rounded-lg text-[10px] font-bold border border-white/10 transition-all ${
                    multiplier === m ? "bg-primary text-black scale-110 shadow-[0_0_15px_rgba(212,175,55,0.5)]" : "bg-white/5 text-white"
                  }`}
                >
                  {m}x
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </ProtectedLayout>
  );
}
