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
import { Dice1, Dice2, Dice3, Dice4, Dice5, Dice6, Coins } from "lucide-react";

const DiceIcons = [Dice1, Dice2, Dice3, Dice4, Dice5, Dice6];

export function DiceGame() {
  const { data: user } = useUser();
  const { toast } = useToast();
  const [bet, setBet] = useState(100);
  const [choice, setChoice] = useState<"low" | "high">("low");
  const [rolling, setRolling] = useState(false);
  const [result, setResult] = useState<number | null>(null);

  const rollMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/games/dice/roll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bet, choice }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Roll failed");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData([api.auth.me.path], (old: any) => ({
        ...old,
        balance: data.balance,
      }));
      
      setTimeout(() => {
        setRolling(false);
        setResult(data.roll);
        if (data.won) {
          toast({
            title: "YOU WIN!",
            description: `Congratulations! You won UGX ${data.payout.toLocaleString()}`,
            className: "bg-green-600 text-white border-none",
          });
        }
      }, 1000);
    },
    onError: (err: any) => {
      setRolling(false);
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const handleRoll = () => {
    if (bet < 100) return;
    setRolling(true);
    setResult(null);
    rollMutation.mutate();
  };

  const ActiveDice = result ? DiceIcons[result - 1] : Dice5;

  return (
    <Card className="glass-card border-white/10 overflow-hidden">
      <CardHeader className="text-center border-b border-white/5">
        <CardTitle className="text-2xl font-display font-bold text-primary">Royal Dice</CardTitle>
      </CardHeader>
      <CardContent className="p-8">
        <div className="flex flex-col items-center gap-8">
          {/* Dice Display */}
          <div className="relative w-40 h-40 flex items-center justify-center bg-gradient-to-br from-white/10 to-transparent rounded-[2.5rem] border-2 border-primary shadow-[0_0_60px_rgba(212,175,55,0.3)]">
            <div className="absolute inset-0 bg-primary/5 blur-xl rounded-full animate-pulse" />
            <AnimatePresence mode="wait">
              <motion.div
                key={rolling ? "rolling" : (result || "idle")}
                initial={{ rotate: -180, scale: 0.5, opacity: 0 }}
                animate={{ 
                  rotate: rolling ? [0, 90, 180, 270, 360] : 0,
                  scale: 1,
                  opacity: 1 
                }}
                transition={{ 
                  rotate: rolling ? { repeat: Infinity, duration: 0.15, ease: "linear" } : { type: "spring", damping: 12 },
                  duration: 0.3 
                }}
                className="relative z-10"
              >
                <ActiveDice className={`w-24 h-24 ${rolling ? 'text-primary animate-bounce' : 'text-primary drop-shadow-[0_0_15px_rgba(212,175,55,0.8)]'}`} />
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="w-full max-w-xs space-y-6">
            <div className="flex gap-2">
              <Button 
                variant={choice === "low" ? "luxury" : "outline"} 
                className="flex-1"
                onClick={() => setChoice("low")}
                disabled={rolling}
              >
                LOW (1-3)
              </Button>
              <Button 
                variant={choice === "high" ? "luxury" : "outline"} 
                className="flex-1"
                onClick={() => setChoice("high")}
                disabled={rolling}
              >
                HIGH (4-6)
              </Button>
            </div>

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
                  disabled={rolling}
                />
              </div>
            </div>

            <Button 
              onClick={handleRoll} 
              disabled={rolling || (user?.balance || 0) < bet}
              className="w-full h-12 text-lg font-bold shadow-[0_4px_20px_rgba(212,175,55,0.3)]"
              variant="luxury"
            >
              {rolling ? "ROLLING..." : "ROLL DICE"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
