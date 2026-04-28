import { ProtectedLayout } from "@/components/layout/ProtectedLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Crosshair } from "lucide-react";
import { Link } from "wouter";
import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { playSound } from "@/lib/sounds";
import { useFullscreen, FullscreenButton } from "@/components/FullscreenToggle";

interface FishData {
  id: number;
  type: string;
  x: number;
  y: number;
  speed: number;
  direction: 1 | -1;
  size: number;
  multiplier: number;
  color: string;
  glowColor: string;
  path: string;
  amplitude: number;
  frequency: number;
  phase: number;
  hp: number;
  maxHp: number;
}

interface Bullet {
  id: number;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  progress: number;
}

interface CatchEffect {
  id: number;
  x: number;
  y: number;
  multiplier: number;
  payout: number;
}

interface Bubble {
  id: number;
  x: number;
  y: number;
  size: number;
  speed: number;
  opacity: number;
}

const FISH_TYPES: Record<string, {
  multiplier: number;
  svg: string;
  color: string;
  glowColor: string;
  size: number;
  speed: [number, number];
  hp: number;
  label: string;
}> = {
  small_fish: {
    multiplier: 2,
    svg: "small",
    color: "#4FC3F7",
    glowColor: "rgba(79,195,247,0.4)",
    size: 35,
    speed: [1.5, 3],
    hp: 1,
    label: "Small Fish",
  },
  medium_fish: {
    multiplier: 3,
    svg: "medium",
    color: "#FFB74D",
    glowColor: "rgba(255,183,77,0.4)",
    size: 45,
    speed: [1.2, 2.5],
    hp: 2,
    label: "Medium Fish",
  },
  pufferfish: {
    multiplier: 5,
    svg: "puffer",
    color: "#CE93D8",
    glowColor: "rgba(206,147,216,0.4)",
    size: 50,
    speed: [0.8, 1.5],
    hp: 3,
    label: "Pufferfish",
  },
  turtle: {
    multiplier: 4,
    svg: "turtle",
    color: "#81C784",
    glowColor: "rgba(129,199,132,0.4)",
    size: 55,
    speed: [0.5, 1],
    hp: 3,
    label: "Sea Turtle",
  },
  jellyfish: {
    multiplier: 6,
    svg: "jelly",
    color: "#F48FB1",
    glowColor: "rgba(244,143,177,0.5)",
    size: 45,
    speed: [0.4, 0.9],
    hp: 2,
    label: "Jellyfish",
  },
  shark: {
    multiplier: 10,
    svg: "shark",
    color: "#90A4AE",
    glowColor: "rgba(144,164,174,0.4)",
    size: 80,
    speed: [2, 3.5],
    hp: 5,
    label: "Shark",
  },
  octopus: {
    multiplier: 8,
    svg: "octopus",
    color: "#EF5350",
    glowColor: "rgba(239,83,80,0.5)",
    size: 60,
    speed: [0.6, 1.2],
    hp: 4,
    label: "Octopus",
  },
  whale: {
    multiplier: 15,
    svg: "whale",
    color: "#64B5F6",
    glowColor: "rgba(100,181,246,0.4)",
    size: 100,
    speed: [0.8, 1.5],
    hp: 8,
    label: "Whale",
  },
  mermaid: {
    multiplier: 20,
    svg: "mermaid",
    color: "#FFD700",
    glowColor: "rgba(255,215,0,0.6)",
    size: 65,
    speed: [1, 2],
    hp: 6,
    label: "Golden Mermaid",
  },
  scorpion_king: {
    multiplier: 50,
    svg: "scorpion",
    color: "#FF1744",
    glowColor: "rgba(255,23,68,0.7)",
    size: 90,
    speed: [1.5, 2.5],
    hp: 10,
    label: "Scorpion King",
  },
};

function drawFishShape(type: string, size: number, color: string, direction: number): string {
  const s = size;
  const d = direction;
  switch (type) {
    case "small":
      return `M${d > 0 ? 0 : s} ${s / 2} Q${s * 0.3 * d + (d < 0 ? s : 0)} ${s * 0.1}, ${s * 0.6 * d + (d < 0 ? s : 0)} ${s * 0.2} L${s * 0.8 * d + (d < 0 ? s : 0)} ${s * 0.35} L${s * d + (d < 0 ? s : 0)} ${s * 0.25} L${s * d + (d < 0 ? s : 0)} ${s * 0.75} L${s * 0.8 * d + (d < 0 ? s : 0)} ${s * 0.65} L${s * 0.6 * d + (d < 0 ? s : 0)} ${s * 0.8} Q${s * 0.3 * d + (d < 0 ? s : 0)} ${s * 0.9}, ${d > 0 ? 0 : s} ${s / 2}`;
    case "shark":
      return `M${d > 0 ? 0 : s} ${s * 0.5} L${s * 0.15 * d + (d < 0 ? s : 0)} ${s * 0.3} L${s * 0.3 * d + (d < 0 ? s : 0)} ${s * 0.1} L${s * 0.35 * d + (d < 0 ? s : 0)} ${s * 0.3} L${s * 0.7 * d + (d < 0 ? s : 0)} ${s * 0.25} L${s * d + (d < 0 ? s : 0)} ${s * 0.15} L${s * 0.85 * d + (d < 0 ? s : 0)} ${s * 0.45} L${s * d + (d < 0 ? s : 0)} ${s * 0.85} L${s * 0.7 * d + (d < 0 ? s : 0)} ${s * 0.65} L${s * 0.2 * d + (d < 0 ? s : 0)} ${s * 0.7} Z`;
    default:
      return `M${d > 0 ? 0 : s} ${s / 2} Q${s * 0.25 * d + (d < 0 ? s : 0)} ${s * 0.15}, ${s * 0.5 * d + (d < 0 ? s : 0)} ${s * 0.2} Q${s * 0.75 * d + (d < 0 ? s : 0)} ${s * 0.25}, ${s * d + (d < 0 ? s : 0)} ${s * 0.3} L${s * 0.85 * d + (d < 0 ? s : 0)} ${s * 0.15} L${s * 0.85 * d + (d < 0 ? s : 0)} ${s * 0.85} L${s * d + (d < 0 ? s : 0)} ${s * 0.7} Q${s * 0.75 * d + (d < 0 ? s : 0)} ${s * 0.75}, ${s * 0.5 * d + (d < 0 ? s : 0)} ${s * 0.8} Q${s * 0.25 * d + (d < 0 ? s : 0)} ${s * 0.85}, ${d > 0 ? 0 : s} ${s / 2}`;
  }
}

function FishSVG({ fish }: { fish: FishData }) {
  const t = FISH_TYPES[fish.type];
  const healthPercent = fish.hp / fish.maxHp;

  return (
    <svg
      width={fish.size}
      height={fish.size}
      viewBox={`0 0 ${fish.size} ${fish.size}`}
      style={{
        filter: `drop-shadow(0 0 ${fish.type === 'scorpion_king' ? 12 : 6}px ${fish.glowColor})`,
        transform: `scaleX(${fish.direction})`,
      }}
    >
      <defs>
        <radialGradient id={`fish-grad-${fish.id}`} cx="30%" cy="30%">
          <stop offset="0%" stopColor={fish.color} stopOpacity="1" />
          <stop offset="70%" stopColor={fish.color} stopOpacity="0.7" />
          <stop offset="100%" stopColor={fish.color} stopOpacity="0.4" />
        </radialGradient>
        {fish.type === 'scorpion_king' && (
          <radialGradient id={`scorpion-glow-${fish.id}`} cx="50%" cy="50%">
            <stop offset="0%" stopColor="#FF1744" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#FF6F00" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#FF1744" stopOpacity="0" />
          </radialGradient>
        )}
      </defs>

      {fish.type === 'scorpion_king' && (
        <circle cx={fish.size / 2} cy={fish.size / 2} r={fish.size * 0.48} fill={`url(#scorpion-glow-${fish.id})`}>
          <animate attributeName="r" values={`${fish.size * 0.4};${fish.size * 0.5};${fish.size * 0.4}`} dur="1.5s" repeatCount="indefinite" />
        </circle>
      )}

      <ellipse
        cx={fish.size / 2}
        cy={fish.size / 2}
        rx={fish.size * 0.4}
        ry={fish.size * 0.3}
        fill={`url(#fish-grad-${fish.id})`}
        stroke={fish.color}
        strokeWidth="1.5"
        opacity="0.9"
      />

      <polygon
        points={`${fish.size * 0.85},${fish.size * 0.5} ${fish.size},${fish.size * 0.3} ${fish.size},${fish.size * 0.7}`}
        fill={fish.color}
        opacity="0.7"
      />

      <circle
        cx={fish.size * 0.25}
        cy={fish.size * 0.42}
        r={fish.size * 0.06}
        fill="white"
      />
      <circle
        cx={fish.size * 0.25}
        cy={fish.size * 0.42}
        r={fish.size * 0.03}
        fill="#111"
      />

      {fish.type === 'scorpion_king' && (
        <>
          <polygon
            points={`${fish.size * 0.15},${fish.size * 0.2} ${fish.size * 0.05},${fish.size * 0.05} ${fish.size * 0.25},${fish.size * 0.15}`}
            fill="#FF1744"
            opacity="0.8"
          />
          <polygon
            points={`${fish.size * 0.15},${fish.size * 0.8} ${fish.size * 0.05},${fish.size * 0.95} ${fish.size * 0.25},${fish.size * 0.85}`}
            fill="#FF1744"
            opacity="0.8"
          />
          <text x={fish.size * 0.5} y={fish.size * 0.95} textAnchor="middle" fill="#FFD700" fontSize="10" fontWeight="900">
            KING
          </text>
        </>
      )}

      {fish.type === 'mermaid' && (
        <>
          <circle cx={fish.size * 0.3} cy={fish.size * 0.15} r="3" fill="#FFD700">
            <animate attributeName="opacity" values="0.5;1;0.5" dur="0.8s" repeatCount="indefinite" />
          </circle>
          <circle cx={fish.size * 0.5} cy={fish.size * 0.1} r="2" fill="#FFD700">
            <animate attributeName="opacity" values="0.3;1;0.3" dur="1.2s" repeatCount="indefinite" />
          </circle>
        </>
      )}

      {healthPercent < 1 && (
        <g>
          <rect x={fish.size * 0.1} y={2} width={fish.size * 0.8} height={4} rx="2" fill="rgba(0,0,0,0.5)" />
          <rect x={fish.size * 0.1} y={2} width={fish.size * 0.8 * healthPercent} height={4} rx="2" fill={healthPercent > 0.5 ? "#4CAF50" : healthPercent > 0.25 ? "#FF9800" : "#F44336"} />
        </g>
      )}

      <text
        x={fish.size / 2}
        y={fish.size - 2}
        textAnchor="middle"
        fill="white"
        fontSize="9"
        fontWeight="900"
        style={{ textShadow: "0 1px 3px rgba(0,0,0,0.8)" }}
      >
        x{t?.multiplier || 2}
      </text>
    </svg>
  );
}

function UnderwaterScene({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative w-full h-full overflow-hidden rounded-xl" style={{
      background: "linear-gradient(180deg, #001a33 0%, #003366 30%, #004080 50%, #002244 70%, #001122 100%)",
    }}>
      <div className="absolute inset-0 pointer-events-none" style={{
        background: "radial-gradient(ellipse at 30% 20%, rgba(0,100,200,0.15) 0%, transparent 60%), radial-gradient(ellipse at 70% 80%, rgba(0,50,100,0.1) 0%, transparent 50%)",
      }} />

      {/* Light water shimmer — slow horizontal drift, GPU-cheap */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-40 mix-blend-screen">
        <div className="fishhunt-water-shimmer absolute -inset-x-1/4 inset-y-0" />
      </div>
      {/* Subtle surface caustics near the top */}
      <div className="absolute inset-x-0 top-0 h-24 pointer-events-none overflow-hidden opacity-30 mix-blend-screen">
        <div className="fishhunt-water-caustics absolute -inset-x-1/4 inset-y-0" />
      </div>

      <svg className="absolute bottom-0 left-0 w-full h-32 pointer-events-none" viewBox="0 0 1200 120" preserveAspectRatio="none">
        <path d="M0,120 Q100,80 200,100 Q300,120 400,90 Q500,60 600,85 Q700,110 800,75 Q900,40 1000,80 Q1100,100 1200,70 L1200,120 Z" fill="#0a2a1a" opacity="0.6" />
        <path d="M0,120 Q150,95 300,110 Q450,120 600,100 Q750,80 900,105 Q1050,120 1200,95 L1200,120 Z" fill="#0a3a2a" opacity="0.4" />
        {[100, 250, 400, 600, 800, 950].map((x, i) => (
          <g key={i}>
            <path d={`M${x},120 Q${x - 5},${90 - i * 5} ${x + 3},${70 - i * 3} Q${x + 8},${55 - i * 2} ${x + 2},${40}`} stroke="#1a5a3a" strokeWidth="3" fill="none" opacity="0.5">
              <animate attributeName="d" values={`M${x},120 Q${x - 5},${90 - i * 5} ${x + 3},${70 - i * 3} Q${x + 8},${55 - i * 2} ${x + 2},${40};M${x},120 Q${x + 5},${90 - i * 5} ${x - 3},${70 - i * 3} Q${x - 8},${55 - i * 2} ${x - 2},${40};M${x},120 Q${x - 5},${90 - i * 5} ${x + 3},${70 - i * 3} Q${x + 8},${55 - i * 2} ${x + 2},${40}`} dur={`${3 + i * 0.5}s`} repeatCount="indefinite" />
            </path>
          </g>
        ))}
      </svg>

      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
        {[...Array(8)].map((_, i) => (
          <div
            key={`ray-${i}`}
            className="absolute top-0"
            style={{
              left: `${10 + i * 12}%`,
              width: "2px",
              height: "100%",
              background: `linear-gradient(180deg, rgba(100,200,255,${0.03 + i * 0.005}) 0%, transparent 60%)`,
              transform: `rotate(${-5 + i * 1.5}deg)`,
              transformOrigin: "top center",
            }}
          />
        ))}
      </div>

      {children}
    </div>
  );
}

function BubbleLayer({ bubbles }: { bubbles: Bubble[] }) {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {bubbles.map(b => (
        <div
          key={b.id}
          className="absolute rounded-full"
          style={{
            left: b.x,
            top: b.y,
            width: b.size,
            height: b.size,
            background: "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.4), rgba(100,200,255,0.1))",
            border: "1px solid rgba(255,255,255,0.15)",
            opacity: b.opacity,
          }}
        />
      ))}
    </div>
  );
}

function CannonSVG({ angle }: { angle: number }) {
  return (
    <div className="relative" style={{ transform: `rotate(${angle}deg)`, transformOrigin: "center bottom" }}>
      <svg width="60" height="80" viewBox="0 0 60 80">
        <defs>
          <linearGradient id="cannon-body" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#5D4037" />
            <stop offset="50%" stopColor="#8D6E63" />
            <stop offset="100%" stopColor="#5D4037" />
          </linearGradient>
          <linearGradient id="cannon-barrel" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#455A64" />
            <stop offset="50%" stopColor="#78909C" />
            <stop offset="100%" stopColor="#455A64" />
          </linearGradient>
          <radialGradient id="cannon-glow" cx="50%" cy="0%">
            <stop offset="0%" stopColor="#FFD700" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#FFD700" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="30" cy="10" r="8" fill="url(#cannon-glow)">
          <animate attributeName="r" values="6;10;6" dur="1.5s" repeatCount="indefinite" />
        </circle>
        <rect x="22" y="10" width="16" height="45" rx="4" fill="url(#cannon-barrel)" stroke="#37474F" strokeWidth="1" />
        <rect x="20" y="50" width="20" height="25" rx="6" fill="url(#cannon-body)" stroke="#4E342E" strokeWidth="1" />
        <circle cx="30" cy="62" r="8" fill="#3E2723" stroke="#5D4037" strokeWidth="1.5" />
        <circle cx="30" cy="62" r="4" fill="#FFD700" opacity="0.6">
          <animate attributeName="opacity" values="0.4;0.8;0.4" dur="2s" repeatCount="indefinite" />
        </circle>
        <rect x="24" y="6" width="12" height="6" rx="2" fill="#FF6F00" opacity="0.8" />
      </svg>
    </div>
  );
}

function NetAnimation({ bullet }: { bullet: Bullet }) {
  const x = bullet.x + (bullet.targetX - bullet.x) * bullet.progress;
  const y = bullet.y + (bullet.targetY - bullet.y) * bullet.progress;

  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{ left: x - 12, top: y - 12 }}
      initial={{ scale: 0.3, opacity: 1 }}
      animate={{ scale: 1, opacity: 0.8 }}
      transition={{ duration: 0.3 }}
    >
      <svg width="24" height="24" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" fill="none" stroke="#FFD700" strokeWidth="2" opacity="0.8" />
        <line x1="2" y1="12" x2="22" y2="12" stroke="#FFD700" strokeWidth="1" opacity="0.5" />
        <line x1="12" y1="2" x2="12" y2="22" stroke="#FFD700" strokeWidth="1" opacity="0.5" />
        <line x1="5" y1="5" x2="19" y2="19" stroke="#FFD700" strokeWidth="0.5" opacity="0.3" />
        <line x1="19" y1="5" x2="5" y2="19" stroke="#FFD700" strokeWidth="0.5" opacity="0.3" />
        <circle cx="12" cy="12" r="3" fill="#FFD700" opacity="0.6">
          <animate attributeName="r" values="2;5;2" dur="0.5s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.8;0.2;0.8" dur="0.5s" repeatCount="indefinite" />
        </circle>
      </svg>
    </motion.div>
  );
}

const SPAWN_WEIGHTS = [
  { type: "small_fish", weight: 30 },
  { type: "medium_fish", weight: 25 },
  { type: "pufferfish", weight: 10 },
  { type: "turtle", weight: 8 },
  { type: "jellyfish", weight: 8 },
  { type: "octopus", weight: 6 },
  { type: "shark", weight: 5 },
  { type: "whale", weight: 3 },
  { type: "mermaid", weight: 3 },
  { type: "scorpion_king", weight: 2 },
];

function pickRandomFishType(): string {
  const totalWeight = SPAWN_WEIGHTS.reduce((sum, w) => sum + w.weight, 0);
  let r = Math.random() * totalWeight;
  for (const sw of SPAWN_WEIGHTS) {
    r -= sw.weight;
    if (r <= 0) return sw.type;
  }
  return "small_fish";
}

export default function GameFishHunt() {
  const [bet, setBet] = useState(500);
  const [fishes, setFishes] = useState<FishData[]>([]);
  const [bullets, setBullets] = useState<Bullet[]>([]);
  const [catchEffects, setCatchEffects] = useState<CatchEffect[]>([]);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [cannonAngle, setCannonAngle] = useState(0);
  const [isShooting, setIsShooting] = useState(false);
  const [totalWon, setTotalWon] = useState(0);
  const [totalShots, setTotalShots] = useState(0);
  const [recentCatches, setRecentCatches] = useState<{ type: string; multiplier: number; payout: number }[]>([]);
  const gameAreaRef = useRef<HTMLDivElement>(null);
  const nextIdRef = useRef(1);
  const animFrameRef = useRef<number>();
  const fishesRef = useRef<FishData[]>([]);
  const { toast } = useToast();
  const { isFullscreen, toggle, containerRef: fullscreenRef } = useFullscreen();

  fishesRef.current = fishes;

  const spawnFish = useCallback(() => {
    const type = pickRandomFishType();
    const ft = FISH_TYPES[type];
    const direction: 1 | -1 = Math.random() > 0.5 ? 1 : -1;
    const speed = ft.speed[0] + Math.random() * (ft.speed[1] - ft.speed[0]);
    const y = 40 + Math.random() * 300;

    const fish: FishData = {
      id: nextIdRef.current++,
      type,
      x: direction === 1 ? -ft.size : 1100,
      y,
      speed,
      direction,
      size: ft.size,
      multiplier: ft.multiplier,
      color: ft.color,
      glowColor: ft.glowColor,
      path: ft.svg,
      amplitude: 15 + Math.random() * 25,
      frequency: 0.01 + Math.random() * 0.02,
      phase: Math.random() * Math.PI * 2,
      hp: ft.hp,
      maxHp: ft.hp,
    };

    setFishes(prev => [...prev, fish]);
  }, []);

  useEffect(() => {
    for (let i = 0; i < 5; i++) {
      setTimeout(() => spawnFish(), i * 500);
    }

    const spawnInterval = setInterval(() => {
      if (fishesRef.current.length < 12) {
        spawnFish();
      }
    }, 1500);

    return () => clearInterval(spawnInterval);
  }, [spawnFish]);

  useEffect(() => {
    const initialBubbles: Bubble[] = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: Math.random() * 1100,
      y: Math.random() * 500,
      size: 3 + Math.random() * 8,
      speed: 0.3 + Math.random() * 0.7,
      opacity: 0.2 + Math.random() * 0.4,
    }));
    setBubbles(initialBubbles);

    const bubbleInterval = setInterval(() => {
      setBubbles(prev =>
        prev.map(b => ({
          ...b,
          y: b.y - b.speed,
          x: b.x + Math.sin(b.y * 0.02) * 0.5,
          opacity: b.y < 20 ? b.opacity * 0.95 : b.opacity,
        })).map(b => b.y < -10 ? { ...b, y: 500, x: Math.random() * 1100, opacity: 0.2 + Math.random() * 0.4 } : b)
      );
    }, 50);

    // Soft ambient bubble pops every 5–9s (very low volume — atmosphere only)
    let ambientTimer: ReturnType<typeof setTimeout>;
    const queueAmbient = () => {
      ambientTimer = setTimeout(() => {
        if (!document.hidden) playSound('bubble', 0.07);
        queueAmbient();
      }, 5000 + Math.random() * 4000);
    };
    queueAmbient();

    return () => {
      clearInterval(bubbleInterval);
      clearTimeout(ambientTimer);
    };
  }, []);

  useEffect(() => {
    let frameCount = 0;

    const animate = () => {
      frameCount++;

      setFishes(prev =>
        prev
          .map(f => ({
            ...f,
            x: f.x + f.speed * f.direction,
            y: f.y + Math.sin(frameCount * f.frequency + f.phase) * f.amplitude * 0.05,
          }))
          .filter(f => f.direction === 1 ? f.x < 1150 : f.x > -f.size - 50)
      );

      setBullets(prev =>
        prev
          .map(b => ({ ...b, progress: Math.min(b.progress + 0.08, 1) }))
          .filter(b => b.progress < 1)
      );

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  const handleShoot = async (fish: FishData) => {
    if (isShooting) return;
    setIsShooting(true);
    playSound('shoot', 0.3);

    const gameArea = gameAreaRef.current;
    if (!gameArea) { setIsShooting(false); return; }

    const bulletId = nextIdRef.current++;
    const cannonX = gameArea.offsetWidth / 2;
    const cannonY = gameArea.offsetHeight - 30;
    const targetX = fish.x + fish.size / 2;
    const targetY = fish.y + fish.size / 2;

    const dx = targetX - cannonX;
    const dy = targetY - cannonY;
    const angle = Math.atan2(dx, -dy) * (180 / Math.PI);
    setCannonAngle(angle);

    setBullets(prev => [...prev, { id: bulletId, x: cannonX, y: cannonY, targetX, targetY, progress: 0 }]);

    setTotalShots(prev => prev + 1);

    try {
      const res = await fetch("/api/games/fishhunt/shoot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bet, fishType: fish.type }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setTimeout(() => {
        playSound('bubble', 0.2);

        if (data.caught) {
          playSound('splash', 0.4);
          setFishes(prev => prev.filter(f => f.id !== fish.id));

          const effectId = nextIdRef.current++;
          setCatchEffects(prev => [...prev, {
            id: effectId,
            x: fish.x + fish.size / 2,
            y: fish.y,
            multiplier: data.multiplier,
            payout: data.payout,
          }]);

          setTotalWon(prev => prev + data.payout);
          setRecentCatches(prev => [{ type: fish.type, multiplier: data.multiplier, payout: data.payout }, ...prev].slice(0, 8));

          if (data.multiplier >= 10) {
            playSound('jackpot', 0.5);
            toast({
              title: data.multiplier >= 50 ? "SCORPION KING CAUGHT!" : "LEGENDARY CATCH!",
              description: `x${data.multiplier} - Won UGX ${data.payout.toLocaleString()}!`,
              className: "bg-gradient-to-r from-amber-600 to-red-600 text-white font-bold",
            });
          } else {
            playSound('win', 0.3);
            toast({
              title: "Catch!",
              description: `x${data.multiplier} - Won UGX ${data.payout.toLocaleString()}`,
              className: "bg-green-600 text-white",
            });
          }

          setTimeout(() => {
            setCatchEffects(prev => prev.filter(e => e.id !== effectId));
          }, 2000);
        } else {
          playSound('lose', 0.15);
        }

        queryClient.invalidateQueries({ queryKey: ["/api/user"] });
        setIsShooting(false);
      }, 400);
    } catch (err: any) {
      setIsShooting(false);
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  return (
    <ProtectedLayout>
      <div ref={fullscreenRef} className={isFullscreen ? "bg-background p-4 overflow-auto h-screen" : ""}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Link href="/">
            <Button variant="ghost" className="pl-0 transition-all text-primary" data-testid="button-back-lobby">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Lobby
            </Button>
          </Link>
          <FullscreenButton isFullscreen={isFullscreen} onToggle={toggle} />
        </div>

        <div className="text-center mb-2">
          <h1 className="text-3xl md:text-5xl font-display font-bold text-primary mb-1" data-testid="text-fishhunt-title">
            Fish Hunt: Scorpion King
          </h1>
          <p className="text-muted-foreground text-xs uppercase tracking-widest">Shoot to catch. Bigger prey = bigger rewards.</p>
        </div>

        <div className="max-w-[1600px] mx-auto grid lg:grid-cols-[1fr_280px] gap-4 items-start">
          <div className="relative" style={{ perspective: "1200px" }}>
            <div style={{ transform: "rotateX(3deg)", transformStyle: "preserve-3d" }}>
              <div
                ref={gameAreaRef}
                className="relative border-2 border-cyan-900/50 rounded-xl cursor-crosshair select-none"
                style={{ width: "100%", height: "600px", maxWidth: "1100px" }}
                data-testid="fishhunt-game-area"
              >
                <UnderwaterScene>
                  <BubbleLayer bubbles={bubbles} />

                  {fishes.map(fish => (
                    <motion.div
                      key={fish.id}
                      className="absolute cursor-pointer"
                      style={{
                        left: fish.x,
                        top: fish.y,
                        zIndex: fish.type === 'scorpion_king' ? 20 : fish.type === 'whale' ? 15 : 10,
                      }}
                      onClick={() => handleShoot(fish)}
                      whileHover={{ scale: 1.15 }}
                      whileTap={{ scale: 0.9 }}
                      data-testid={`fish-target-${fish.id}`}
                    >
                      <FishSVG fish={fish} />
                    </motion.div>
                  ))}

                  {bullets.map(b => (
                    <NetAnimation key={b.id} bullet={b} />
                  ))}

                  <AnimatePresence>
                    {catchEffects.map(e => (
                      <motion.div
                        key={e.id}
                        className="absolute z-30 pointer-events-none"
                        style={{ left: e.x - 50, top: e.y - 20 }}
                        initial={{ opacity: 1, y: 0, scale: 0.5 }}
                        animate={{ opacity: 0, y: -80, scale: 1.5 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1.8, ease: "easeOut" }}
                      >
                        <div className="text-center">
                          <div className="text-yellow-400 font-black text-2xl drop-shadow-lg">
                            x{e.multiplier}
                          </div>
                          <div className="text-white font-bold text-sm">
                            +UGX {e.payout.toLocaleString()}
                          </div>
                        </div>
                        {[...Array(8)].map((_, i) => (
                          <motion.div
                            key={i}
                            className="absolute w-2 h-2 rounded-full"
                            style={{
                              left: 50,
                              top: 20,
                              background: ["#FFD700", "#FF6347", "#00CED1", "#98FB98"][i % 4],
                            }}
                            animate={{
                              x: Math.cos((i / 8) * Math.PI * 2) * 60,
                              y: Math.sin((i / 8) * Math.PI * 2) * 60,
                              opacity: 0,
                            }}
                            transition={{ duration: 1, ease: "easeOut" }}
                          />
                        ))}
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-30" data-testid="fishhunt-cannon">
                    <CannonSVG angle={cannonAngle} />
                  </div>

                  <div className="absolute top-3 left-3 z-30 flex items-center gap-2" data-testid="fishhunt-crosshair-indicator">
                    <Crosshair className="w-4 h-4 text-cyan-400" />
                    <span className="text-cyan-400 text-xs font-bold uppercase tracking-wider">
                      Click a fish to shoot
                    </span>
                  </div>

                  {isShooting && (
                    <div className="absolute top-3 right-3 z-30" data-testid="status-reloading">
                      <span className="text-yellow-400 text-xs font-bold animate-pulse">RELOADING...</span>
                    </div>
                  )}
                </UnderwaterScene>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <Card className="bg-black/60 border-white/10 p-4 space-y-4">
              <div className="space-y-2">
                <label className="text-xs uppercase font-bold text-primary tracking-wider">Shot Cost (UGX)</label>
                <div className="flex flex-wrap gap-1.5">
                  {[100, 200, 500, 1000, 2000, 5000, 10000].map(amt => (
                    <Button
                      key={amt}
                      size="sm"
                      variant={bet === amt ? "default" : "outline"}
                      onClick={() => { setBet(amt); playSound('bet', 0.2); }}
                      disabled={isShooting}
                      data-testid={`button-fishhunt-bet-${amt}`}
                      className="font-mono text-xs"
                    >
                      {amt.toLocaleString()}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="bg-white/5 rounded-md p-2">
                  <div className="text-xs text-muted-foreground">Shots</div>
                  <div className="text-lg font-bold font-mono text-foreground" data-testid="text-total-shots">{totalShots}</div>
                </div>
                <div className="bg-white/5 rounded-md p-2">
                  <div className="text-xs text-muted-foreground">Won</div>
                  <div className="text-lg font-bold font-mono text-primary" data-testid="text-total-won">
                    {totalWon > 0 ? `+${totalWon.toLocaleString()}` : "0"}
                  </div>
                </div>
              </div>
            </Card>

            <Card className="bg-black/60 border-white/10 p-4" data-testid="card-fish-payouts">
              <h3 className="text-xs uppercase font-bold text-primary tracking-wider mb-2">Creature Payouts</h3>
              <div className="space-y-1">
                {Object.entries(FISH_TYPES)
                  .sort((a, b) => a[1].multiplier - b[1].multiplier)
                  .map(([key, ft]) => (
                    <div key={key} className="flex items-center gap-2 text-xs" data-testid={`payout-row-${key}`}>
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: ft.color, boxShadow: `0 0 4px ${ft.glowColor}` }} />
                      <span className="text-foreground truncate flex-1">{ft.label}</span>
                      <span className="text-primary font-bold tabular-nums">x{ft.multiplier}</span>
                    </div>
                  ))}
              </div>
            </Card>

            {recentCatches.length > 0 && (
              <Card className="bg-black/60 border-white/10 p-4" data-testid="card-recent-catches">
                <h3 className="text-xs uppercase font-bold text-primary tracking-wider mb-2">Recent Catches</h3>
                <div className="space-y-1">
                  {recentCatches.map((c, i) => {
                    const ft = FISH_TYPES[c.type];
                    return (
                      <div key={i} className="flex items-center gap-2 text-xs" data-testid={`text-recent-catch-${i}`}>
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: ft?.color || "#fff" }} />
                        <span className="text-foreground truncate flex-1">{ft?.label || c.type}</span>
                        <span className="text-primary font-bold tabular-nums">+{c.payout.toLocaleString()}</span>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
      </div>
    </ProtectedLayout>
  );
}
