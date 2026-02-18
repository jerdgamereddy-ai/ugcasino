import { ProtectedLayout } from "@/components/layout/ProtectedLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Club as Cards } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Input } from "@/components/ui/input";
import { playSound } from "@/lib/sounds";
import { useFullscreen, FullscreenButton } from "@/components/FullscreenToggle";

const SUITS = ["♠", "♣", "♥", "♦"];
const VALUES = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

export default function GamePoker() {
  const [bet, setBet] = useState(500);
  const [gameState, setGameState] = useState<"betting" | "playing" | "ended">("betting");
  const [hand, setHand] = useState<{ value: string; suit: string; held: boolean }[]>([]);
  const [result, setResult] = useState<string>("");
  const { toast } = useToast();
  const { isFullscreen, toggle, containerRef } = useFullscreen();

  const handleDeal = async () => {
    if (gameState === "playing") return;
    
    try {
      const res = await fetch("/api/games/poker/deal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bet }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      
      playSound('deal');
      setHand(data.hand.map((card: any) => ({ ...card, held: false })));
      setGameState("playing");
      setResult("");
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const toggleHold = (index: number) => {
    if (gameState !== "playing") return;
    playSound('click');
    const newHand = [...hand];
    newHand[index].held = !newHand[index].held;
    setHand(newHand);
  };

  const handleDraw = async () => {
    try {
      const res = await fetch("/api/games/poker/draw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          bet, 
          holds: hand.map(c => c.held),
          hand: hand.map(c => ({ value: c.value, suit: c.suit }))
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      
      setHand(data.hand.map((c: any) => ({ ...c, held: false })));
      setGameState("ended");
      setResult(data.result);
      
      if (data.won) {
        playSound('jackpot', 0.5);
        toast({ title: data.result, description: `You won UGX ${data.payout}!`, className: "bg-green-600 text-white" });
      } else {
        playSound('lose');
        toast({ title: "No Pair", description: "Better luck next time!", variant: "destructive" });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
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
          <h1 className="text-5xl md:text-7xl font-display font-bold text-primary mb-2">Video Poker</h1>
          <p className="text-white font-black text-xl uppercase tracking-widest">Jacks or Better.</p>
        </div>

        <div className="max-w-6xl mx-auto space-y-8">
          <div className="grid grid-cols-5 gap-4">
            <AnimatePresence mode="wait">
              {hand.length > 0 ? hand.map((card, i) => (
                <motion.div
                  key={`${card.value}-${card.suit}-${i}`}
                  initial={{ rotateY: 90, opacity: 0 }}
                  animate={{ rotateY: 0, opacity: 1 }}
                  className={`aspect-[2/3] rounded-xl flex flex-col items-center justify-center text-4xl font-bold cursor-pointer transition-all border-2 ${
                    card.held ? "border-primary shadow-[0_0_15px_rgba(212,175,55,0.5)]" : "border-white/10"
                  } ${["♥", "♦"].includes(card.suit) ? "text-red-500 bg-white" : "text-black bg-white"}`}
                  onClick={() => toggleHold(i)}
                >
                  <div className="absolute top-2 left-2 text-xl">{card.suit}</div>
                  <div>{card.value}</div>
                  <div className="absolute bottom-2 right-2 text-xl rotate-180">{card.suit}</div>
                  {card.held && (
                    <div className="absolute -top-4 bg-primary text-black text-xs px-2 py-1 rounded font-black uppercase">Held</div>
                  )}
                </motion.div>
              )) : Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="aspect-[2/3] rounded-xl bg-zinc-900 border-2 border-white/5" />
              ))}
            </AnimatePresence>
          </div>

          <Card className="glass-card p-6 bg-black/60 border-white/10">
            <div className="flex flex-col md:flex-row gap-6 items-center justify-between">
              <div className="space-y-1">
                <label className="text-xs uppercase font-bold text-[#D4AF37]">Bet Amount</label>
                <div className="flex flex-wrap gap-1.5">
                  {[500, 1000, 2000, 5000, 10000, 20000, 50000].map(amt => (
                    <button key={amt} onClick={() => setBet(amt)} disabled={gameState === "playing"} className={`px-3 py-1.5 rounded text-xs font-mono border transition-colors ${bet === amt ? "bg-primary text-black border-primary font-bold" : "border-white/10 text-muted-foreground"}`}>{amt.toLocaleString()}</button>
                  ))}
                </div>
              </div>
              
              <div className="flex-1 text-center">
                {result && (
                  <motion.div 
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-3xl font-black text-primary uppercase italic"
                  >
                    {result}
                  </motion.div>
                )}
              </div>

              {gameState !== "playing" ? (
                <Button onClick={handleDeal} className="h-16 px-12 text-xl font-black uppercase bg-primary text-black">
                  Deal
                </Button>
              ) : (
                <Button onClick={handleDraw} className="h-16 px-12 text-xl font-black uppercase bg-primary text-black">
                  Draw
                </Button>
              )}
            </div>
          </Card>
        </div>
      </div>
      </div>
    </ProtectedLayout>
  );
}
