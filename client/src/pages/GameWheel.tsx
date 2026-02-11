import { ProtectedLayout } from "@/components/layout/ProtectedLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { playSound } from "@/lib/sounds";

const SEGMENTS = [
  { multiplier: 0,   label: "MISS",  color: "#1a1a2e", accent: "#2a2a4e" },
  { multiplier: 0.5, label: "x0.5",  color: "#6b2fa0", accent: "#8b4fc0" },
  { multiplier: 0,   label: "MISS",  color: "#1e1e38", accent: "#2e2e58" },
  { multiplier: 1,   label: "x1",    color: "#1565c0", accent: "#2196f3" },
  { multiplier: 0,   label: "MISS",  color: "#1a1a2e", accent: "#2a2a4e" },
  { multiplier: 1.5, label: "x1.5",  color: "#00838f", accent: "#00acc1" },
  { multiplier: 0,   label: "MISS",  color: "#1e1e38", accent: "#2e2e58" },
  { multiplier: 2,   label: "x2",    color: "#2e7d32", accent: "#43a047" },
  { multiplier: 0,   label: "MISS",  color: "#1a1a2e", accent: "#2a2a4e" },
  { multiplier: 0.5, label: "x0.5",  color: "#6b2fa0", accent: "#8b4fc0" },
  { multiplier: 0,   label: "MISS",  color: "#1e1e38", accent: "#2e2e58" },
  { multiplier: 3,   label: "x3",    color: "#e65100", accent: "#ff6d00" },
  { multiplier: 0,   label: "MISS",  color: "#1a1a2e", accent: "#2a2a4e" },
  { multiplier: 1,   label: "x1",    color: "#1565c0", accent: "#2196f3" },
  { multiplier: 5,   label: "x5",    color: "#c62828", accent: "#ef5350" },
  { multiplier: 10,  label: "x10",   color: "#B8860B", accent: "#FFD700" },
];

const TOTAL_SEGMENTS = SEGMENTS.length;
const SEGMENT_ANGLE = 360 / TOTAL_SEGMENTS;

function WheelSVG({ size }: { size: number }) {
  const center = size / 2;
  const radius = size / 2 - 6;
  const innerRadius = radius * 0.15;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <defs>
        <filter id="wheel-shadow">
          <feDropShadow dx="0" dy="4" stdDeviation="8" floodColor="rgba(0,0,0,0.6)" />
        </filter>
        <filter id="inner-glow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <radialGradient id="wheel-shine" cx="35%" cy="35%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.12)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
        <radialGradient id="center-grad" cx="40%" cy="40%">
          <stop offset="0%" stopColor="#FFD700" />
          <stop offset="50%" stopColor="#B8860B" />
          <stop offset="100%" stopColor="#8B6914" />
        </radialGradient>
        {SEGMENTS.map((seg, i) => (
          <linearGradient key={`grad-${i}`} id={`seg-grad-${i}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={seg.accent} />
            <stop offset="50%" stopColor={seg.color} />
            <stop offset="100%" stopColor={seg.color} stopOpacity="0.85" />
          </linearGradient>
        ))}
      </defs>

      <circle cx={center} cy={center} r={radius + 5} fill="none" stroke="#8B6914" strokeWidth="3" />
      <circle cx={center} cy={center} r={radius + 3} fill="none" stroke="#FFD700" strokeWidth="2" opacity="0.5" />
      <circle cx={center} cy={center} r={radius + 7} fill="none" stroke="#FFD700" strokeWidth="1" opacity="0.2" />

      {SEGMENTS.map((seg, i) => {
        const startAngle = (i * SEGMENT_ANGLE - 90) * (Math.PI / 180);
        const endAngle = ((i + 1) * SEGMENT_ANGLE - 90) * (Math.PI / 180);
        const x1 = center + radius * Math.cos(startAngle);
        const y1 = center + radius * Math.sin(startAngle);
        const x2 = center + radius * Math.cos(endAngle);
        const y2 = center + radius * Math.sin(endAngle);
        const largeArc = SEGMENT_ANGLE > 180 ? 1 : 0;

        const midAngle = ((i + 0.5) * SEGMENT_ANGLE - 90) * (Math.PI / 180);
        const textR = radius * 0.7;
        const tx = center + textR * Math.cos(midAngle);
        const ty = center + textR * Math.sin(midAngle);
        const textRotation = (i + 0.5) * SEGMENT_ANGLE;

        const isHighValue = seg.multiplier >= 5;
        const fontSize = seg.multiplier === 0 ? "8" : isHighValue ? "12" : "10";

        return (
          <g key={i}>
            <path
              d={`M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`}
              fill={`url(#seg-grad-${i})`}
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="0.5"
            />
            <path
              d={`M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`}
              fill="url(#wheel-shine)"
              opacity="0.4"
            />
            <text
              x={tx}
              y={ty}
              textAnchor="middle"
              dominantBaseline="central"
              transform={`rotate(${textRotation}, ${tx}, ${ty})`}
              fill={seg.multiplier === 10 ? "#1a1a2e" : seg.multiplier === 0 ? "rgba(255,255,255,0.4)" : "#ffffff"}
              fontWeight="900"
              fontSize={fontSize}
              style={{ textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}
            >
              {seg.label}
            </text>
            {isHighValue && (
              <circle
                cx={center + radius * 0.45 * Math.cos(midAngle)}
                cy={center + radius * 0.45 * Math.sin(midAngle)}
                r="3"
                fill={seg.multiplier === 10 ? "#1a1a2e" : "rgba(255,255,255,0.4)"}
              >
                <animate attributeName="opacity" values="0.3;0.9;0.3" dur="1.8s" repeatCount="indefinite" begin={`${i * 0.15}s`} />
              </circle>
            )}
          </g>
        );
      })}

      <circle cx={center} cy={center} r={radius} fill="url(#wheel-shine)" opacity="0.2" />

      <circle cx={center} cy={center} r={innerRadius + 5} fill="none" stroke="#FFD700" strokeWidth="1.5" opacity="0.3" />
      <circle cx={center} cy={center} r={innerRadius} fill="url(#center-grad)" filter="url(#inner-glow)" />
      <circle cx={center} cy={center} r={innerRadius - 3} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />

      {[...Array(TOTAL_SEGMENTS)].map((_, i) => {
        const angle = (i * SEGMENT_ANGLE - 90) * (Math.PI / 180);
        const dotR = radius + 9;
        const dx = center + dotR * Math.cos(angle);
        const dy = center + dotR * Math.sin(angle);
        return (
          <circle key={`dot-${i}`} cx={dx} cy={dy} r="2.5" fill="#FFD700">
            <animate attributeName="opacity" values="0.3;1;0.3" dur="1.5s" repeatCount="indefinite" begin={`${i * 0.1}s`} />
          </circle>
        );
      })}
    </svg>
  );
}

function WinParticles({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {[...Array(28)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 rounded-full"
          style={{
            left: "50%",
            top: "50%",
            background: ["#FFD700", "#FF6347", "#00CED1", "#FF69B4", "#98FB98", "#FFA500", "#7B68EE"][i % 7],
            boxShadow: `0 0 6px ${["#FFD700", "#FF6347", "#00CED1", "#FF69B4", "#98FB98", "#FFA500", "#7B68EE"][i % 7]}`,
          }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{
            x: (Math.cos((i / 28) * Math.PI * 2) * 200) + (Math.random() - 0.5) * 100,
            y: (Math.sin((i / 28) * Math.PI * 2) * 200) + (Math.random() - 0.5) * 100,
            opacity: 0,
            scale: [1, 2.5, 0],
          }}
          transition={{ duration: 1.8, ease: "easeOut" }}
        />
      ))}
    </div>
  );
}

function getMultiplierColor(m: number) {
  if (m === 0) return "text-muted-foreground";
  if (m <= 0.5) return "text-purple-400";
  if (m <= 1) return "text-blue-400";
  if (m <= 1.5) return "text-cyan-400";
  if (m <= 2) return "text-green-400";
  if (m <= 3) return "text-orange-400";
  if (m <= 5) return "text-red-400";
  return "text-yellow-400";
}

const ODDS_TABLE = [
  { label: "x0 (MISS)", odds: "~44%", color: "#2a2a4e" },
  { label: "x0.5", odds: "~12%", color: "#8b4fc0" },
  { label: "x1", odds: "~10%", color: "#2196f3" },
  { label: "x1.5", odds: "~8%", color: "#00acc1" },
  { label: "x2", odds: "~7%", color: "#43a047" },
  { label: "x3", odds: "~5%", color: "#ff6d00" },
  { label: "x5", odds: "~3%", color: "#ef5350" },
  { label: "x10", odds: "~1%", color: "#FFD700" },
];

export default function GameWheel() {
  const [bet, setBet] = useState(500);
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [lastResult, setLastResult] = useState<{ won: boolean; multiplier: number; payout: number } | null>(null);
  const [showParticles, setShowParticles] = useState(false);
  const [recentResults, setRecentResults] = useState<number[]>([]);
  const tickCountRef = useRef(0);
  const { toast } = useToast();

  const handleSpin = async () => {
    if (isSpinning) return;
    playSound('spin');
    setIsSpinning(true);
    setLastResult(null);
    setShowParticles(false);
    tickCountRef.current = 0;
    
    try {
      const res = await fetch("/api/games/wheel/play", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bet }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      
      const targetSegment = data.segmentIndex;
      const segmentCenter = targetSegment * SEGMENT_ANGLE + SEGMENT_ANGLE / 2;
      const fullSpins = 360 * 6;
      setRotation(prev => {
        const currentAngle = prev % 360;
        const targetAngle = (360 - segmentCenter) % 360;
        let additionalRotation = targetAngle - currentAngle;
        if (additionalRotation < 0) additionalRotation += 360;
        return prev + fullSpins + additionalRotation;
      });

      const tickInterval = setInterval(() => {
        tickCountRef.current++;
        if (tickCountRef.current < 35) {
          playSound('tick', 0.12);
        } else {
          clearInterval(tickInterval);
        }
      }, 140);

      setTimeout(() => {
        clearInterval(tickInterval);
        setIsSpinning(false);
        setLastResult({ won: data.won, multiplier: data.multiplier, payout: data.payout });
        setRecentResults(prev => [data.multiplier, ...prev].slice(0, 12));
        
        if (data.won && data.multiplier >= 1) {
          setShowParticles(true);
          if (data.multiplier >= 5) {
            playSound('jackpot', 0.6);
          } else {
            playSound('win', 0.5);
          }
          toast({
            title: data.multiplier >= 5 ? "JACKPOT!" : "Winner!",
            description: `x${data.multiplier} - Won UGX ${data.payout.toLocaleString()}!`,
            className: "bg-green-600 text-white",
          });
        } else if (data.won) {
          playSound('reveal', 0.3);
          toast({
            title: "Partial Win",
            description: `x${data.multiplier} - Got back UGX ${data.payout.toLocaleString()}`,
          });
        } else {
          playSound('lose');
          toast({ title: "No luck this time!", description: "Spin again!", variant: "destructive" });
        }
        queryClient.invalidateQueries({ queryKey: ["/api/user"] });
        setTimeout(() => setShowParticles(false), 2000);
      }, 5500);
    } catch (err: any) {
      setIsSpinning(false);
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  return (
    <ProtectedLayout>
      <div className="space-y-6">
        <Link href="/">
          <Button variant="ghost" className="pl-0 transition-all text-primary" data-testid="button-back-lobby">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Lobby
          </Button>
        </Link>
        
        <div className="text-center mb-4">
          <h1 className="text-4xl md:text-6xl font-display font-bold text-primary mb-2" data-testid="text-wheel-title">Wheel of Fortune</h1>
          <p className="text-muted-foreground text-sm uppercase tracking-widest">16 segments. 8 multipliers. Dare to win big.</p>
        </div>

        <div className="max-w-6xl mx-auto grid md:grid-cols-[1fr_auto] gap-8 items-start">
          <div className="flex flex-col items-center gap-6">
            <div style={{ perspective: "900px" }}>
              <div style={{ transform: "rotateX(10deg)", transformStyle: "preserve-3d" }}>
                <div className="absolute -inset-8 rounded-full pointer-events-none"
                  style={{ background: "radial-gradient(circle, rgba(255,215,0,0.06) 0%, transparent 70%)" }}
                />

                <div className="absolute left-1/2 -translate-x-1/2 -top-5 z-20" data-testid="wheel-pointer">
                  <div className="relative">
                    <div
                      className="w-0 h-0"
                      style={{
                        borderLeft: "14px solid transparent",
                        borderRight: "14px solid transparent",
                        borderTop: "30px solid #FFD700",
                        filter: "drop-shadow(0 3px 8px rgba(255,215,0,0.6))",
                      }}
                    />
                    <div
                      className="absolute top-0 left-1/2 -translate-x-1/2 w-0 h-0"
                      style={{
                        borderLeft: "7px solid transparent",
                        borderRight: "7px solid transparent",
                        borderTop: "15px solid #FFF8DC",
                        opacity: 0.4,
                      }}
                    />
                  </div>
                </div>

                <motion.div
                  animate={{ rotate: rotation }}
                  transition={{ duration: 5.5, ease: [0.17, 0.67, 0.12, 0.99] }}
                  style={{
                    filter: isSpinning ? "drop-shadow(0 0 25px rgba(255,215,0,0.25))" : "drop-shadow(0 6px 16px rgba(0,0,0,0.5))",
                    transformStyle: "preserve-3d",
                    transition: "filter 0.5s ease",
                  }}
                  data-testid="wheel-spinner"
                >
                  <WheelSVG size={380} />
                </motion.div>

                <div
                  className="absolute inset-0 rounded-full pointer-events-none"
                  style={{
                    background: "linear-gradient(145deg, rgba(255,255,255,0.04) 0%, transparent 40%, rgba(0,0,0,0.12) 100%)",
                    borderRadius: "50%",
                  }}
                />

                <WinParticles active={showParticles} />
              </div>
            </div>

            {lastResult && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className="text-center"
                data-testid="wheel-result-display"
              >
                <div className={`text-3xl font-black ${getMultiplierColor(lastResult.multiplier)}`} data-testid="text-wheel-result">
                  {lastResult.multiplier > 0 ? `x${lastResult.multiplier}` : "MISS"}
                </div>
                {lastResult.payout > 0 && (
                  <div className="text-sm text-primary font-bold" data-testid="text-wheel-payout">+UGX {lastResult.payout.toLocaleString()}</div>
                )}
              </motion.div>
            )}
          </div>

          <div className="flex flex-col gap-4 min-w-[280px]">
            <Card className="bg-black/60 border-white/10 p-5 space-y-5">
              <div className="space-y-2">
                <label className="text-xs uppercase font-bold text-primary tracking-wider">Bet Amount (UGX)</label>
                <div className="flex flex-wrap gap-1.5">
                  {[500, 1000, 2000, 5000, 10000, 20000, 50000].map(amt => (
                    <Button
                      key={amt}
                      size="sm"
                      variant={bet === amt ? "default" : "outline"}
                      onClick={() => { setBet(amt); playSound('bet', 0.2); }}
                      disabled={isSpinning}
                      data-testid={`button-wheel-bet-${amt}`}
                      className="font-mono text-xs"
                    >
                      {amt.toLocaleString()}
                    </Button>
                  ))}
                </div>
              </div>

              <Button 
                onClick={handleSpin} 
                disabled={isSpinning}
                variant="luxury"
                size="lg"
                className="w-full"
                data-testid="button-wheel-spin"
              >
                {isSpinning ? "Spinning..." : "SPIN THE WHEEL"}
              </Button>
            </Card>

            <Card className="bg-black/60 border-white/10 p-5" data-testid="card-odds-table">
              <h3 className="text-xs uppercase font-bold text-primary tracking-wider mb-3">Multiplier Odds</h3>
              <div className="space-y-1.5">
                {ODDS_TABLE.map((row, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs" data-testid={`odds-row-${i}`}>
                    <div
                      className="w-3 h-3 rounded-sm flex-shrink-0"
                      style={{ background: row.color }}
                    />
                    <span className="font-bold text-foreground">{row.label}</span>
                    <span className="text-muted-foreground ml-auto tabular-nums">{row.odds}</span>
                  </div>
                ))}
              </div>
            </Card>

            {recentResults.length > 0 && (
              <Card className="bg-black/60 border-white/10 p-5" data-testid="card-recent-spins">
                <h3 className="text-xs uppercase font-bold text-primary tracking-wider mb-3">Recent Spins</h3>
                <div className="flex flex-wrap gap-2">
                  {recentResults.map((m, i) => (
                    <div
                      key={i}
                      className={`px-2 py-1 rounded text-xs font-bold ${getMultiplierColor(m)} bg-white/5 border border-white/10`}
                      data-testid={`text-recent-spin-${i}`}
                    >
                      {m === 0 ? "MISS" : `x${m}`}
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </ProtectedLayout>
  );
}
