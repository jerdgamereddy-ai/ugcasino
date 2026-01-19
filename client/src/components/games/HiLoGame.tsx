import { useState } from "react";
import { useUser } from "@/hooks/use-auth";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { api } from "@shared/routes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Coins, ChevronUp, ChevronDown, Club } from "lucide-react";

export function HiLoGame() {
  const { data: user } = useUser();
  const { toast } = useToast();
  const [bet, setBet] = useState(100);
  const [playing, setPlaying] = useState(false);
  const [currentCard, setCurrentCard] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const cardMutation = useMutation({
    mutationFn: async (prediction: "higher" | "lower") => {
      const res = await fetch("/api/games/hilo/play", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bet, prediction, lastCard: currentCard }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Play failed");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData([api.auth.me.path], (old: any) => ({
        ...old,
        balance: data.balance,
      }));
      
      setCurrentCard(data.card);
      setLoading(false);
      if (data.won) {
        toast({
          title: "YOU WIN!",
          description: `Correct! You won UGX ${data.payout.toLocaleString()}`,
          className: "bg-green-600 text-white border-none",
        });
      } else {
        toast({
          title: "LOST",
          description: "Incorrect prediction.",
          variant: "destructive",
        });
      }
    },
    onError: (err: any) => {
      setLoading(false);
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const handleStart = () => {
    if (bet < 100) return;
    setPlaying(true);
    setCurrentCard(Math.floor(Math.random() * 13) + 1);
  };

  const handlePredict = (prediction: "higher" | "lower") => {
    setLoading(true);
    cardMutation.mutate(prediction);
  };

  const cardDisplay = (val: number | null) => {
    if (val === null) return "?";
    const faces: Record<number, string> = { 1: "A", 11: "J", 12: "Q", 13: "K" };
    return faces[val] || val.toString();
  };

  return (
    <Card className="glass-card border-white/10 overflow-hidden">
      <CardHeader className="text-center border-b border-white/5">
        <CardTitle className="text-2xl font-display font-bold text-primary">High-Low Cards</CardTitle>
      </CardHeader>
      <CardContent className="p-8">
        <div className="flex flex-col items-center gap-8">
          {/* Card Display */}
          <div className="relative w-40 h-56 flex items-center justify-center bg-gradient-to-br from-zinc-800 to-black rounded-3xl border-4 border-primary shadow-[0_0_60px_rgba(212,175,55,0.4)] overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(212,175,55,0.1)_0%,_transparent_70%)]" />
            <AnimatePresence mode="wait">
              <motion.div
                key={currentCard || "back"}
                initial={{ rotateY: 180, scale: 0.5, opacity: 0 }}
                animate={{ rotateY: 0, scale: 1, opacity: 1 }}
                exit={{ rotateY: -180, scale: 0.5, opacity: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
                className="flex flex-col items-center w-full h-full relative"
              >
                <div className="absolute inset-2 border-2 border-primary/20 rounded-2xl pointer-events-none" />
                <Club className="w-10 h-10 text-primary drop-shadow-[0_0_10px_rgba(212,175,55,0.5)] absolute top-6 left-6" />
                <span className="text-8xl font-black font-display text-primary drop-shadow-[0_0_20px_rgba(212,175,55,0.8)] mt-4">
                  {cardDisplay(currentCard)}
                </span>
                <Club className="w-10 h-10 text-primary drop-shadow-[0_0_10px_rgba(212,175,55,0.5)] absolute bottom-6 right-6 rotate-180" />
              </motion.div>
            </AnimatePresence>
          </div>

          {!playing ? (
            <div className="w-full max-w-xs space-y-4">
              <div className="space-y-2">
                <label className="text-xs uppercase text-muted-foreground tracking-widest">Bet Amount (UGX)</label>
                <div className="relative">
                  <Coins className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                  <Input 
                    type="number"
                    value={bet}
                    onChange={(e) => setBet(Number(e.target.value))}
                    className="pl-10 bg-black/30 border-white/10 text-white font-mono"
                    min={100}
                  />
                </div>
              </div>
              <Button onClick={handleStart} className="w-full h-12 text-lg font-bold" variant="luxury">
                START GAME
              </Button>
            </div>
          ) : (
            <div className="w-full max-w-xs space-y-4 text-center">
              <p className="text-muted-foreground">Will the next card be higher or lower?</p>
              <div className="flex gap-4">
                <Button 
                  onClick={() => handlePredict("higher")} 
                  disabled={loading}
                  className="flex-1 h-16 flex flex-col gap-1"
                  variant="outline"
                >
                  <ChevronUp className="w-6 h-6 text-green-500" />
                  HIGHER
                </Button>
                <Button 
                  onClick={() => handlePredict("lower")} 
                  disabled={loading}
                  className="flex-1 h-16 flex flex-col gap-1"
                  variant="outline"
                >
                  <ChevronDown className="w-6 h-6 text-red-500" />
                  LOWER
                </Button>
              </div>
              <Button 
                variant="ghost" 
                onClick={() => { setPlaying(false); setCurrentCard(null); }}
                className="text-muted-foreground"
              >
                Cash Out / Stop
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
