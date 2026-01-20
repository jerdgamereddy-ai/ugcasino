import { ProtectedLayout } from "@/components/layout/ProtectedLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Gem, Bomb } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Input } from "@/components/ui/input";

export default function GameMines() {
  const [bet, setBet] = useState(100);
  const [minesCount, setMinesCount] = useState(3);
  const [gameState, setGameState] = useState<"betting" | "playing" | "ended">("betting");
  const [selectedCells, setSelectedCells] = useState<number[]>([]);
  const [revealedCells, setRevealedCells] = useState<Record<number, "gem" | "bomb">>({});
  const { toast } = useToast();

  const handleStart = () => {
    setGameState("playing");
    setSelectedCells([]);
    setRevealedCells({});
  };

  const handleCellClick = async (index: number) => {
    if (gameState !== "playing" || revealedCells[index]) return;
    
    const newSelected = [...selectedCells, index];
    setSelectedCells(newSelected);
    
    try {
      const res = await fetch("/api/games/mines/play", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bet, minesCount, selectedCells: newSelected }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      
      if (data.won) {
        setRevealedCells({ ...revealedCells, [index]: "gem" });
        toast({ title: "GEM FOUND!", description: `Current Payout: UGX ${data.payout.toLocaleString()}`, className: "bg-green-600 text-white" });
      } else {
        setRevealedCells({ ...revealedCells, [index]: "bomb" });
        setGameState("ended");
        toast({ title: "BOOM!", description: "You hit a mine!", variant: "destructive" });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
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
          <h1 className="text-5xl md:text-7xl font-display font-bold text-primary mb-2 drop-shadow-[0_0_30px_rgba(212,175,55,0.8)]">Diamond Mines</h1>
          <p className="text-white font-black text-xl drop-shadow-[0_2px_10_rgba(0,0,0,1)] uppercase tracking-widest">Find gems, avoid the mines.</p>
        </div>

        <div className="max-w-4xl mx-auto grid md:grid-cols-3 gap-8">
          <Card className="glass-card border-white/10 p-6 bg-black/60">
            <CardContent className="p-0 space-y-6">
              <div className="space-y-2">
                <label className="text-xs uppercase font-bold text-[#D4AF37]">Bet Amount (UGX)</label>
                <Input 
                  type="number" 
                  value={bet} 
                  onChange={(e) => setBet(Number(e.target.value))}
                  className="bg-black/40 border-white/10"
                  disabled={gameState === "playing"}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase font-bold text-[#D4AF37]">Mines Count</label>
                <div className="grid grid-cols-3 gap-2">
                  {[1, 3, 5, 10, 15, 20].map((num) => (
                    <Button 
                      key={num} 
                      variant={minesCount === num ? "luxury" : "outline"}
                      onClick={() => setMinesCount(num)}
                      className="h-10 text-xs font-bold"
                      disabled={gameState === "playing"}
                    >
                      {num}
                    </Button>
                  ))}
                </div>
              </div>
              {gameState === "betting" || gameState === "ended" ? (
                <Button 
                  onClick={handleStart} 
                  className="w-full h-16 text-xl font-black uppercase bg-primary text-black shadow-[0_0_30px_rgba(212,175,55,0.3)]"
                >
                  Start Game
                </Button>
              ) : (
                <Button 
                  onClick={() => setGameState("ended")}
                  variant="outline"
                  className="w-full h-16 text-xl font-black uppercase text-white border-white/20"
                >
                  Cash Out
                </Button>
              )}
            </CardContent>
          </Card>

          <div className="md:col-span-2 grid grid-cols-5 gap-2 bg-zinc-900/50 p-4 rounded-3xl border border-white/5">
            {Array.from({ length: 25 }).map((_, i) => (
              <motion.button
                key={i}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleCellClick(i)}
                className={`aspect-square rounded-xl flex items-center justify-center text-2xl transition-all ${
                  revealedCells[i] === "gem" 
                    ? "bg-green-500/20 text-green-500 border-green-500/50" 
                    : revealedCells[i] === "bomb"
                    ? "bg-red-500/20 text-red-500 border-red-500/50"
                    : "bg-white/5 border-white/10 hover:bg-white/10"
                } border shadow-lg`}
              >
                {revealedCells[i] === "gem" && <Gem className="w-8 h-8 animate-bounce" />}
                {revealedCells[i] === "bomb" && <Bomb className="w-8 h-8 animate-ping" />}
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    </ProtectedLayout>
  );
}
