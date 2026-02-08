import { ProtectedLayout } from "@/components/layout/ProtectedLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Input } from "@/components/ui/input";

export default function GameWheel() {
  const [bet, setBet] = useState(500);
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const { toast } = useToast();

  const handleSpin = async () => {
    if (isSpinning) return;
    setIsSpinning(true);
    
    try {
      const res = await fetch("/api/games/wheel/play", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bet }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      
      const segmentSize = 360 / 8;
      const targetRotation = 360 * 5 + (data.segmentIndex * segmentSize);
      setRotation(targetRotation);
      
      setTimeout(() => {
        setIsSpinning(false);
        if (data.won) {
          toast({ title: "WINNER!", description: `Multiplier: x${data.multiplier}`, className: "bg-green-600 text-white" });
        } else {
          toast({ title: "Better luck next time!", description: "Try again!", variant: "destructive" });
        }
        queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      }, 5000);
    } catch (err: any) {
      setIsSpinning(false);
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
          <h1 className="text-5xl md:text-7xl font-display font-bold text-primary mb-2">Wheel of Fortune</h1>
          <p className="text-white font-black text-xl uppercase tracking-widest">Spin the wheel of luxury.</p>
        </div>

        <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <Card className="glass-card p-8 bg-black/60">
            <div className="space-y-8">
              <div className="space-y-2">
                <label className="text-xs uppercase font-bold text-[#D4AF37]">Bet Amount (UGX)</label>
                <Input 
                  type="number" 
                  value={bet} 
                  onChange={(e) => setBet(Number(e.target.value))}
                  className="bg-black/40 border-white/10 text-white text-xl h-14"
                  disabled={isSpinning}
                  min={500}
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {[500, 1000, 2000, 5000, 10000, 20000, 50000].map(amt => (
                    <button key={amt} onClick={() => setBet(amt)} disabled={isSpinning} className={`px-2 py-1 rounded text-xs font-mono border transition-colors ${bet === amt ? "bg-primary text-black border-primary" : "border-white/10 text-muted-foreground"}`}>{amt.toLocaleString()}</button>
                  ))}
                </div>
              </div>
              <Button 
                onClick={handleSpin} 
                disabled={isSpinning}
                className="w-full h-20 text-2xl font-black uppercase bg-primary text-black"
              >
                {isSpinning ? "Spinning..." : "Spin Wheel"}
              </Button>
            </div>
          </Card>

          <div className="relative aspect-square flex items-center justify-center">
            <div className="absolute top-0 z-10 -mt-4">
              <div className="w-8 h-8 bg-primary rotate-45 border-4 border-black" />
            </div>
            <motion.div 
              className="w-full h-full rounded-full border-8 border-primary/20 bg-zinc-900 relative overflow-hidden"
              animate={{ rotate: rotation }}
              transition={{ duration: 5, ease: "easeOut" }}
            >
              {[...Array(8)].map((_, i) => (
                <div 
                  key={i}
                  className="absolute top-0 left-1/2 w-1/2 h-full origin-left flex items-center justify-end pr-8 border-l border-white/5"
                  style={{ transform: `rotate(${i * 45}deg)` }}
                >
                  <span className="text-primary font-bold text-xl rotate-90">
                    {i % 2 === 0 ? "x2" : "x0"}
                  </span>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </div>
    </ProtectedLayout>
  );
}
