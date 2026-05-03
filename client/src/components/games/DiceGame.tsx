import { useState, useEffect, useRef } from "react";
import { useUser } from "@/hooks/use-auth";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { api } from "@shared/routes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { playSound } from "@/lib/sounds";

// Pip layout for each face value (1-6) inside a 3x3 grid (1=top-left ... 9=bottom-right)
const PIP_POSITIONS: Record<number, number[]> = {
  1: [5],
  2: [1, 9],
  3: [1, 5, 9],
  4: [1, 3, 7, 9],
  5: [1, 3, 5, 7, 9],
  6: [1, 3, 4, 6, 7, 9],
};

function DiceFace({ value }: { value: number }) {
  const positions = PIP_POSITIONS[value] || [];
  return (
    <div className="grid grid-cols-3 grid-rows-3 gap-2 w-full h-full p-4">
      {Array.from({ length: 9 }, (_, i) => i + 1).map((pos) => (
        <div key={pos} className="flex items-center justify-center">
          {positions.includes(pos) && (
            <div
              className="w-5 h-5 rounded-full bg-zinc-900 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]"
              style={{ background: "radial-gradient(circle at 30% 30%, #4a4a4a, #050505 70%)" }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// Each face of the cube needs its own rotation in 3D space.
// Cube size: 160px → translateZ(80px).
const FACE_TRANSFORMS: Record<number, string> = {
  1: "rotateY(0deg)   translateZ(80px)",
  6: "rotateY(180deg) translateZ(80px)",
  3: "rotateY(90deg)  translateZ(80px)",
  4: "rotateY(-90deg) translateZ(80px)",
  2: "rotateX(90deg)  translateZ(80px)",
  5: "rotateX(-90deg) translateZ(80px)",
};

// Final-resting rotation needed to bring each face value to the front.
// Inverse of the face transform (so face 1 stays as-is, face 6 needs Y -180, etc.).
const REST_ROTATION: Record<number, { x: number; y: number }> = {
  1: { x: 0,    y: 0    },
  6: { x: 0,    y: 180  },
  3: { x: 0,    y: -90  },
  4: { x: 0,    y: 90   },
  2: { x: -90,  y: 0    },
  5: { x: 90,   y: 0    },
};

function Dice3D({ value, rolling }: { value: number; rolling: boolean }) {
  const [rot, setRot] = useState({ x: -20, y: 20 });
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (rolling) {
      // Spin continuously while waiting for the result.
      let r = { x: rot.x, y: rot.y };
      const tick = () => {
        r = { x: r.x + 14, y: r.y + 18 };
        setRot({ ...r });
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
      return () => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
      };
    } else if (value) {
      // Land on the requested face with several extra spins for drama.
      const target = REST_ROTATION[value];
      // Keep the current rotation increasing so the transition spins forward.
      setRot((cur) => {
        const turnsX = Math.ceil(cur.x / 360) * 360 + 720 + target.x;
        const turnsY = Math.ceil(cur.y / 360) * 360 + 720 + target.y;
        return { x: turnsX, y: turnsY };
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rolling, value]);

  return (
    <div
      className="dice-3d-stage"
      style={{
        width: 220,
        height: 220,
        perspective: 900,
        perspectiveOrigin: "50% 40%",
      }}
    >
      <div
        className="dice-3d-cube"
        style={{
          position: "relative",
          width: 160,
          height: 160,
          margin: "30px auto",
          transformStyle: "preserve-3d",
          transform: `rotateX(${rot.x}deg) rotateY(${rot.y}deg)`,
          transition: rolling ? "none" : "transform 1.4s cubic-bezier(0.2, 0.9, 0.2, 1.05)",
        }}
      >
        {[1, 2, 3, 4, 5, 6].map((face) => (
          <div
            key={face}
            className="dice-3d-face"
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: 18,
              background: "linear-gradient(135deg, #fffbe6 0%, #f5f5dc 50%, #d4af37 110%)",
              border: "2px solid #b8860b",
              boxShadow: "inset 0 0 18px rgba(0,0,0,0.25), 0 8px 24px rgba(0,0,0,0.5)",
              transform: FACE_TRANSFORMS[face],
              backfaceVisibility: "hidden",
            }}
          >
            <DiceFace value={face} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function DiceGame() {
  const { data: user } = useUser();
  const { toast } = useToast();
  const [bet, setBet] = useState(500);
  const [choice, setChoice] = useState<"low" | "high">("low");
  const [rolling, setRolling] = useState(false);
  const [result, setResult] = useState<number>(5);
  const timersRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const requestTokenRef = useRef(0);

  useEffect(() => {
    return () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
      requestTokenRef.current++;
    };
  }, []);

  const { data: diceSettings } = useQuery<{ payoutMultiplier: number }>({
    queryKey: ["/api/games/dice/settings"],
  });
  const payoutMultiplier = diceSettings?.payoutMultiplier ?? 2;

  const rollMutation = useMutation({
    mutationFn: async (vars: { token: number }) => {
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
    onSuccess: (data, vars) => {
      queryClient.setQueryData([api.auth.me.path], (old: any) => ({
        ...old,
        balance: data.balance,
      }));
      if (vars.token !== requestTokenRef.current) return;
      // Let the cube spin for ~1.2s before settling on the actual result.
      const t1 = setTimeout(() => {
        if (vars.token !== requestTokenRef.current) return;
        setRolling(false);
        setResult(data.roll);
        const t2 = setTimeout(() => {
          if (vars.token !== requestTokenRef.current) return;
          if (data.won) {
            playSound('win');
            toast({
              title: "YOU WIN!",
              description: `Congratulations! You won UGX ${data.payout.toLocaleString()}`,
              className: "bg-green-600 text-white border-none",
            });
          } else {
            playSound('lose');
            toast({ title: `Rolled ${data.roll}`, description: "Better luck next roll.", variant: "destructive" });
          }
        }, 1200);
        timersRef.current.push(t2);
      }, 1200);
      timersRef.current.push(t1);
    },
    onError: (err: any, vars) => {
      if (vars.token !== requestTokenRef.current) return;
      setRolling(false);
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const handleRoll = () => {
    if (bet < 500 || rolling) return;
    playSound('roll');
    setRolling(true);
    const token = ++requestTokenRef.current;
    rollMutation.mutate({ token });
  };

  return (
    <Card className="glass-card border-white/10 overflow-hidden">
      <CardHeader className="text-center border-b border-white/5">
        <CardTitle className="text-2xl font-display font-bold text-primary">Royal Dice</CardTitle>
      </CardHeader>
      <CardContent className="p-8">
        <div className="flex flex-col items-center gap-8">
          <div className="text-center">
            <span className="text-[#D4AF37] font-bold text-lg" data-testid="text-balance-dice">
              Balance: {(user?.balance ?? 0).toLocaleString()} UGX
            </span>
          </div>

          {/* 3D dice on a felt arena */}
          <div
            className="relative w-80 h-80 flex items-center justify-center rounded-[2.5rem] overflow-hidden"
            style={{
              background: "radial-gradient(circle at 50% 35%, #14532d 0%, #052e16 70%, #000 110%)",
              boxShadow: "inset 0 0 80px rgba(0,0,0,0.7), 0 0 80px rgba(212,175,55,0.3)",
              border: "4px solid rgba(212,175,55,0.4)",
            }}
          >
            {/* Arena floor shadow under the cube */}
            <div
              className="absolute"
              style={{
                bottom: 40,
                left: "50%",
                transform: "translateX(-50%)",
                width: 180,
                height: 24,
                borderRadius: "50%",
                background: "radial-gradient(ellipse at center, rgba(0,0,0,0.6) 0%, transparent 70%)",
                filter: "blur(4px)",
              }}
            />
            <Dice3D value={result} rolling={rolling} />
          </div>

          <div className="w-full max-w-xs space-y-6">
            <div className="flex gap-2">
              <Button
                variant={choice === "low" ? "luxury" : "outline"}
                className="flex-1"
                onClick={() => setChoice("low")}
                disabled={rolling}
                data-testid="button-choice-low"
              >
                LOW (1-3)
              </Button>
              <Button
                variant={choice === "high" ? "luxury" : "outline"}
                className="flex-1"
                onClick={() => setChoice("high")}
                disabled={rolling}
                data-testid="button-choice-high"
              >
                HIGH (4-6)
              </Button>
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase text-muted-foreground tracking-widest">Bet Amount (UGX)</label>
              <div className="flex flex-wrap gap-1.5">
                {[500, 1000, 2000, 5000, 10000, 20000, 50000].map(amt => (
                  <button
                    key={amt}
                    onClick={() => setBet(amt)}
                    disabled={rolling}
                    className={`px-3 py-1.5 rounded text-xs font-mono border transition-colors ${bet === amt ? "bg-primary text-black border-primary font-bold" : "border-white/10 text-muted-foreground"}`}
                    data-testid={`button-bet-${amt}`}
                  >
                    {amt.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>

            <Button
              onClick={handleRoll}
              disabled={rolling || (user?.balance || 0) < bet}
              className="w-full h-12 text-lg font-bold shadow-[0_4px_20px_rgba(212,175,55,0.3)]"
              variant="luxury"
              data-testid="button-roll-dice"
            >
              {rolling ? "ROLLING..." : "ROLL DICE"}
            </Button>

            <p className="text-xs text-muted-foreground uppercase tracking-widest text-center pt-2">Payout: {payoutMultiplier}x</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
