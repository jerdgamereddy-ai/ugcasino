import { useState, useEffect, useRef } from "react";
import { useUser } from "@/hooks/use-auth";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { api } from "@shared/routes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronUp, ChevronDown } from "lucide-react";
import { playSound } from "@/lib/sounds";

type Suit = "spades" | "hearts" | "diamonds" | "clubs";

const SUITS: Suit[] = ["spades", "hearts", "diamonds", "clubs"];
const SUIT_GLYPH: Record<Suit, string> = {
  spades: "♠",
  hearts: "♥",
  diamonds: "♦",
  clubs: "♣",
};
const SUIT_RED: Record<Suit, boolean> = {
  spades: false,
  hearts: true,
  diamonds: true,
  clubs: false,
};

function rankLabel(val: number) {
  const faces: Record<number, string> = { 1: "A", 11: "J", 12: "Q", 13: "K" };
  return faces[val] || String(val);
}

// Returns the (col, row) positions to draw pip symbols on a number card.
// Modeled after standard playing-card pip layouts.
function pipLayout(rank: number): Array<[number, number]> {
  switch (rank) {
    case 1:  return [[1, 1.5]];
    case 2:  return [[1, 0], [1, 3]];
    case 3:  return [[1, 0], [1, 1.5], [1, 3]];
    case 4:  return [[0, 0], [2, 0], [0, 3], [2, 3]];
    case 5:  return [[0, 0], [2, 0], [1, 1.5], [0, 3], [2, 3]];
    case 6:  return [[0, 0], [2, 0], [0, 1.5], [2, 1.5], [0, 3], [2, 3]];
    case 7:  return [[0, 0], [2, 0], [1, 0.75], [0, 1.5], [2, 1.5], [0, 3], [2, 3]];
    case 8:  return [[0, 0], [2, 0], [1, 0.75], [0, 1.5], [2, 1.5], [1, 2.25], [0, 3], [2, 3]];
    case 9:  return [[0, 0], [2, 0], [0, 1], [2, 1], [1, 1.5], [0, 2], [2, 2], [0, 3], [2, 3]];
    case 10: return [[0, 0], [2, 0], [0, 1], [2, 1], [1, 0.5], [1, 2.5], [0, 2], [2, 2], [0, 3], [2, 3]];
    default: return [];
  }
}

function PlayingCard({ rank, suit, faceDown }: { rank: number | null; suit: Suit; faceDown: boolean }) {
  const red = SUIT_RED[suit];
  const colorClass = red ? "text-red-600" : "text-zinc-900";
  const glyph = SUIT_GLYPH[suit];

  if (faceDown || rank === null) {
    return (
      <div className="w-56 h-80 rounded-2xl shadow-2xl bg-gradient-to-br from-blue-900 via-blue-700 to-blue-950 border-4 border-white/90 relative overflow-hidden" data-testid="card-back">
        <div
          className="absolute inset-2 rounded-xl border-2 border-yellow-400/60"
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg, rgba(255,215,0,0.18) 0 8px, transparent 8px 16px), repeating-linear-gradient(-45deg, rgba(255,215,0,0.18) 0 8px, transparent 8px 16px)",
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-24 h-24 rounded-full bg-yellow-400/20 border-4 border-yellow-300/80 flex items-center justify-center text-yellow-300 text-5xl font-display font-bold shadow-[0_0_30px_rgba(255,215,0,0.4)]">
            UG
          </div>
        </div>
      </div>
    );
  }

  const label = rankLabel(rank);
  const isFaceCard = rank >= 11;
  const isAce = rank === 1;

  return (
    <div
      className={`w-56 h-80 rounded-2xl shadow-2xl bg-gradient-to-br from-white to-zinc-100 border-2 border-zinc-300 relative overflow-hidden ${colorClass}`}
      data-testid={`card-${suit}-${rank}`}
      style={{ boxShadow: "0 25px 50px rgba(0,0,0,0.6), inset 0 0 0 2px rgba(255,255,255,0.6)" }}
    >
      {/* Top-left rank+suit */}
      <div className="absolute top-2 left-3 flex flex-col items-center leading-none">
        <span className="text-3xl font-bold font-serif">{label}</span>
        <span className="text-2xl">{glyph}</span>
      </div>
      {/* Bottom-right rank+suit (rotated) */}
      <div className="absolute bottom-2 right-3 flex flex-col items-center leading-none rotate-180">
        <span className="text-3xl font-bold font-serif">{label}</span>
        <span className="text-2xl">{glyph}</span>
      </div>

      {/* Center */}
      {isAce ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[8rem] leading-none drop-shadow-md">{glyph}</span>
        </div>
      ) : isFaceCard ? (
        <div className="absolute inset-8 rounded-xl border-2 border-current/30 flex flex-col items-center justify-center bg-gradient-to-b from-yellow-50 to-yellow-100">
          <div className={`text-7xl font-display font-bold ${colorClass}`}>{label}</div>
          <div className="text-4xl mt-1">{glyph}</div>
          <div className="text-[10px] uppercase tracking-widest mt-2 opacity-60">
            {label === "K" ? "King" : label === "Q" ? "Queen" : "Jack"}
          </div>
        </div>
      ) : (
        <div className="absolute inset-x-8 top-12 bottom-12 grid grid-cols-3 grid-rows-[repeat(4,1fr)]">
          {pipLayout(rank).map(([col, row], i) => (
            <span
              key={i}
              className="text-3xl flex items-center justify-center"
              style={{
                gridColumn: col + 1,
                gridRow: Math.floor(row) + 1,
                transform: `translateY(${(row % 1) * 100}%) ${row > 1.5 ? "rotate(180deg)" : ""}`,
              }}
            >
              {glyph}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function HiLoGame() {
  const { data: user } = useUser();
  const { toast } = useToast();
  const [bet, setBet] = useState(500);
  const [playing, setPlaying] = useState(false);
  const [currentCard, setCurrentCard] = useState<number | null>(null);
  const [currentSuit, setCurrentSuit] = useState<Suit>("spades");
  const [loading, setLoading] = useState(false);
  const [revealing, setRevealing] = useState(false);
  const revealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestTokenRef = useRef(0);

  useEffect(() => {
    return () => {
      if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
      requestTokenRef.current++;
    };
  }, []);

  const { data: hiloSettings } = useQuery<{ payoutMultiplier: number }>({
    queryKey: ["/api/games/hilo/settings"],
  });
  const payoutMultiplier = hiloSettings?.payoutMultiplier ?? 2;

  const cardMutation = useMutation({
    mutationFn: async (vars: { prediction: "higher" | "lower"; token: number }) => {
      const res = await fetch("/api/games/hilo/play", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bet, prediction: vars.prediction, lastCard: currentCard }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Play failed");
      }
      return res.json();
    },
    onSuccess: (data, vars) => {
      queryClient.setQueryData([api.auth.me.path], (old: any) => ({
        ...old,
        balance: data.balance,
      }));
      const token = vars.token;
      if (token !== requestTokenRef.current) return; // stale request — ignore
      setRevealing(true);
      if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
      revealTimerRef.current = setTimeout(() => {
        if (token !== requestTokenRef.current) return;
        setCurrentCard(data.card);
        setCurrentSuit(SUITS[Math.floor(Math.random() * 4)]);
        setRevealing(false);
        setLoading(false);
        if (data.won) {
          playSound('win');
          toast({
            title: "YOU WIN!",
            description: `Correct! You won UGX ${data.payout.toLocaleString()}`,
            className: "bg-green-600 text-white border-none",
          });
        } else {
          playSound('lose');
          toast({
            title: "LOST",
            description: "Incorrect prediction.",
            variant: "destructive",
          });
        }
      }, 700);
    },
    onError: (err: any, vars) => {
      if (vars.token !== requestTokenRef.current) return;
      setLoading(false);
      setRevealing(false);
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const handleStart = () => {
    if (bet < 500 || loading) return;
    playSound('deal');
    setPlaying(true);
    setCurrentCard(Math.floor(Math.random() * 13) + 1);
    setCurrentSuit(SUITS[Math.floor(Math.random() * 4)]);
  };

  const handlePredict = (prediction: "higher" | "lower") => {
    if (loading) return;
    playSound('flip');
    setLoading(true);
    const token = ++requestTokenRef.current;
    cardMutation.mutate({ prediction, token });
  };

  const handleStop = () => {
    if (loading) return;
    requestTokenRef.current++; // invalidate any in-flight callbacks
    if (revealTimerRef.current) {
      clearTimeout(revealTimerRef.current);
      revealTimerRef.current = null;
    }
    setRevealing(false);
    setPlaying(false);
    setCurrentCard(null);
  };

  return (
    <Card className="glass-card border-white/10 overflow-hidden">
      <CardHeader className="text-center border-b border-white/5">
        <CardTitle className="text-2xl font-display font-bold text-primary">High-Low Cards</CardTitle>
      </CardHeader>
      <CardContent className="p-8">
        <div className="flex flex-col items-center gap-8">
          <div className="text-center">
            <span className="text-[#D4AF37] font-bold text-lg" data-testid="text-balance-hilo">
              Balance: {(user?.balance ?? 0).toLocaleString()} UGX
            </span>
          </div>

          {/* Card felt */}
          <div className="relative p-8 rounded-3xl bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 border-4 border-yellow-600/40 shadow-[0_0_60px_rgba(212,175,55,0.4)]"
               style={{ backgroundImage: "radial-gradient(ellipse at center, rgba(255,255,255,0.05), transparent 70%)" }}>
            <div className="absolute inset-0 rounded-3xl pointer-events-none" style={{ boxShadow: "inset 0 0 80px rgba(0,0,0,0.6)" }} />
            <AnimatePresence mode="wait">
              <motion.div
                key={`${currentCard}-${currentSuit}-${revealing}`}
                initial={{ rotateY: 180, scale: 0.85, opacity: 0 }}
                animate={{ rotateY: 0, scale: 1, opacity: 1 }}
                exit={{ rotateY: -180, scale: 0.85, opacity: 0 }}
                transition={{ type: "spring", stiffness: 180, damping: 18 }}
                style={{ transformStyle: "preserve-3d" }}
              >
                <PlayingCard rank={revealing ? null : currentCard} suit={currentSuit} faceDown={revealing} />
              </motion.div>
            </AnimatePresence>
          </div>

          <p className="text-xs text-muted-foreground uppercase tracking-widest">Payout: {payoutMultiplier}x</p>

          {!playing ? (
            <div className="w-full max-w-xs space-y-4">
              <div className="space-y-2">
                <label className="text-xs uppercase text-muted-foreground tracking-widest">Bet Amount (UGX)</label>
                <div className="flex flex-wrap gap-1.5">
                  {[500, 1000, 2000, 5000, 10000, 20000, 50000].map(amt => (
                    <button key={amt} onClick={() => setBet(amt)} className={`px-3 py-1.5 rounded text-xs font-mono border transition-colors ${bet === amt ? "bg-primary text-black border-primary font-bold" : "border-white/10 text-muted-foreground"}`} data-testid={`button-bet-${amt}`}>{amt.toLocaleString()}</button>
                  ))}
                </div>
              </div>
              <Button onClick={handleStart} className="w-full h-12 text-lg font-bold" variant="luxury" data-testid="button-start-hilo">
                START GAME
              </Button>
            </div>
          ) : (
            <div className="w-full max-w-xs space-y-4 text-center">
              <p className="text-muted-foreground">Will the next card be higher or lower?</p>
              <div className="flex gap-4">
                <Button onClick={() => handlePredict("higher")} disabled={loading} className="flex-1 h-16 flex flex-col gap-1" variant="outline" data-testid="button-higher">
                  <ChevronUp className="w-6 h-6 text-green-500" />
                  HIGHER
                </Button>
                <Button onClick={() => handlePredict("lower")} disabled={loading} className="flex-1 h-16 flex flex-col gap-1" variant="outline" data-testid="button-lower">
                  <ChevronDown className="w-6 h-6 text-red-500" />
                  LOWER
                </Button>
              </div>
              <Button variant="ghost" onClick={handleStop} disabled={loading} className="text-muted-foreground" data-testid="button-cashout-hilo">
                Cash Out / Stop
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
