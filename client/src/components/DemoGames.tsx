import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import coinHeads from "@assets/coin_heads.jpg";
import coinTails from "@assets/coin_tails.jpg";
import bananaImg from "@assets/banana_1770797891098.png";
import berriesImg from "@assets/berries_1770797891098.png";
import coconutImg from "@assets/coconut_1770797891098.png";
import mangoImg from "@assets/mango2_1770797891098.png";
import melonImg from "@assets/melon_1770797891098.png";
import orangeImg from "@assets/orange_1770797891098.png";
import pineappleImg from "@assets/pineapple_1770797891098.png";

const SLOT_IMAGES = [bananaImg, berriesImg, coconutImg, mangoImg, melonImg, orangeImg, pineappleImg];

function MiniSlots() {
  const [reels, setReels] = useState([0, 1, 2]);
  const [spinning, setSpinning] = useState(false);
  const innerRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    const spin = () => {
      setSpinning(true);
      let ticks = 0;
      const maxTicks = 12 + Math.floor(Math.random() * 8);
      if (innerRef.current) clearInterval(innerRef.current);
      innerRef.current = setInterval(() => {
        setReels([
          Math.floor(Math.random() * SLOT_IMAGES.length),
          Math.floor(Math.random() * SLOT_IMAGES.length),
          Math.floor(Math.random() * SLOT_IMAGES.length),
        ]);
        ticks++;
        if (ticks >= maxTicks) {
          clearInterval(innerRef.current);
          const final0 = Math.floor(Math.random() * SLOT_IMAGES.length);
          setReels(prev => {
            if (Math.random() < 0.3) return [final0, final0, final0];
            return prev;
          });
          setSpinning(false);
        }
      }, 80);
    };

    spin();
    const loop = setInterval(spin, 4000);
    return () => { clearInterval(loop); if (innerRef.current) clearInterval(innerRef.current); };
  }, []);

  const isWin = reels[0] === reels[1] && reels[1] === reels[2];

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="text-[10px] uppercase tracking-widest text-primary/70 font-bold">Fruit Slots</div>
      <div className="flex gap-1.5">
        {reels.map((r, i) => (
          <motion.div
            key={i}
            className="w-10 h-12 rounded-md bg-black/80 border border-primary/30 flex items-center justify-center"
            animate={spinning ? { y: [0, -4, 4, 0] } : {}}
            transition={{ duration: 0.08, repeat: spinning ? Infinity : 0 }}
          >
            <img src={SLOT_IMAGES[r]} alt="fruit" className="w-8 h-8 object-contain" draggable={false} />
          </motion.div>
        ))}
      </div>
      <AnimatePresence>
        {isWin && !spinning && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="text-[9px] font-black text-primary uppercase tracking-widest"
          >
            JACKPOT!
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MiniRoulette() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const angleRef = useRef(0);
  const speedRef = useRef(0);
  const frameRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const size = 90;
    canvas.width = size;
    canvas.height = size;
    const cx = size / 2;
    const cy = size / 2;
    const r = 38;
    const segments = 12;
    const colors = ["#b91c1c", "#1a1a1a"];

    const startSpin = () => {
      speedRef.current = 0.15 + Math.random() * 0.1;
    };

    startSpin();
    const spinInterval = setInterval(startSpin, 5000);

    const draw = () => {
      ctx.clearRect(0, 0, size, size);
      angleRef.current += speedRef.current;
      speedRef.current *= 0.995;
      if (speedRef.current < 0.001) speedRef.current = 0;

      for (let i = 0; i < segments; i++) {
        const startAngle = angleRef.current + (i * Math.PI * 2) / segments;
        const endAngle = startAngle + Math.PI * 2 / segments;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, r, startAngle, endAngle);
        ctx.closePath();
        ctx.fillStyle = colors[i % 2];
        ctx.fill();
        ctx.strokeStyle = "rgba(212,175,55,0.3)";
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(212,175,55,0.6)";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(cx, cy, 6, 0, Math.PI * 2);
      ctx.fillStyle = "#FFD700";
      ctx.fill();

      const ballAngle = -angleRef.current * 0.7 + Math.PI;
      const ballR = r - 8;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(ballAngle) * ballR, cy + Math.sin(ballAngle) * ballR, 3, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.shadowBlur = 6;
      ctx.shadowColor = "#ffffff";
      ctx.fill();
      ctx.shadowBlur = 0;

      frameRef.current = requestAnimationFrame(draw);
    };

    frameRef.current = requestAnimationFrame(draw);
    return () => {
      clearInterval(spinInterval);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="text-[10px] uppercase tracking-widest text-primary/70 font-bold">Roulette</div>
      <canvas ref={canvasRef} className="rounded-full" />
    </div>
  );
}

function MiniDice() {
  const [dice, setDice] = useState([3, 5]);
  const [rolling, setRolling] = useState(false);
  const innerRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    const roll = () => {
      setRolling(true);
      let ticks = 0;
      if (innerRef.current) clearInterval(innerRef.current);
      innerRef.current = setInterval(() => {
        setDice([Math.ceil(Math.random() * 6), Math.ceil(Math.random() * 6)]);
        ticks++;
        if (ticks > 10) {
          clearInterval(innerRef.current);
          setRolling(false);
        }
      }, 60);
    };

    roll();
    const loop = setInterval(roll, 3500);
    return () => { clearInterval(loop); if (innerRef.current) clearInterval(innerRef.current); };
  }, []);

  const dotPositions: Record<number, [number, number][]> = {
    1: [[50, 50]],
    2: [[25, 25], [75, 75]],
    3: [[25, 25], [50, 50], [75, 75]],
    4: [[25, 25], [75, 25], [25, 75], [75, 75]],
    5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
    6: [[25, 25], [75, 25], [25, 50], [75, 50], [25, 75], [75, 75]],
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="text-[10px] uppercase tracking-widest text-primary/70 font-bold">Royal Dice</div>
      <div className="flex gap-2">
        {dice.map((d, i) => (
          <motion.div
            key={i}
            className="w-10 h-10 bg-gradient-to-br from-zinc-800 to-zinc-900 rounded-md border border-primary/30 relative"
            animate={rolling ? { rotate: [0, 90, 180, 270, 360] } : { rotate: 0 }}
            transition={{ duration: 0.3, repeat: rolling ? Infinity : 0 }}
          >
            <svg viewBox="0 0 100 100" className="w-full h-full">
              {dotPositions[d]?.map(([x, y], j) => (
                <circle key={j} cx={x} cy={y} r={8} fill="#FFD700" />
              ))}
            </svg>
          </motion.div>
        ))}
      </div>
      <div className="text-[9px] text-muted-foreground font-mono">{dice[0] + dice[1]}</div>
    </div>
  );
}

function MiniCards() {
  const [cards, setCards] = useState(["A", "K", "Q"]);
  const [flipped, setFlipped] = useState([false, false, false]);
  const suits = ["\u2660", "\u2665", "\u2666"];
  const suitColors = ["#ffffff", "#FF6347", "#00CED1"];
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const clearTimers = () => timersRef.current.forEach(t => clearTimeout(t));
    const deal = () => {
      clearTimers();
      setFlipped([false, false, false]);
      timersRef.current.push(setTimeout(() => {
        const allCards = ["A", "K", "Q", "J", "10", "9"];
        setCards([
          allCards[Math.floor(Math.random() * allCards.length)],
          allCards[Math.floor(Math.random() * allCards.length)],
          allCards[Math.floor(Math.random() * allCards.length)],
        ]);
        setFlipped([true, false, false]);
        timersRef.current.push(setTimeout(() => setFlipped([true, true, false]), 400));
        timersRef.current.push(setTimeout(() => setFlipped([true, true, true]), 800));
      }, 600));
    };

    deal();
    const loop = setInterval(deal, 4500);
    return () => { clearInterval(loop); clearTimers(); };
  }, []);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="text-[10px] uppercase tracking-widest text-primary/70 font-bold">High-Low</div>
      <div className="flex gap-1.5">
        {cards.map((card, i) => (
          <motion.div
            key={i}
            className="w-9 h-13 rounded-sm border flex items-center justify-center text-sm font-bold relative"
            animate={{
              rotateY: flipped[i] ? 0 : 180,
              borderColor: flipped[i] ? "rgba(212,175,55,0.4)" : "rgba(255,255,255,0.1)",
            }}
            transition={{ duration: 0.4 }}
            style={{
              background: flipped[i]
                ? "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)"
                : "linear-gradient(135deg, #b91c1c 0%, #7f1d1d 100%)",
              height: "3.2rem",
            }}
          >
            {flipped[i] ? (
              <div className="flex flex-col items-center leading-none">
                <span style={{ color: suitColors[i] }}>{card}</span>
                <span className="text-[8px]" style={{ color: suitColors[i] }}>{suits[i]}</span>
              </div>
            ) : (
              <div className="text-[8px] text-red-200/50">UG</div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function MiniWheel() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const angleRef = useRef(0);
  const speedRef = useRef(0);
  const frameRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const size = 90;
    canvas.width = size;
    canvas.height = size;
    const cx = size / 2;
    const cy = size / 2;
    const r = 38;
    const segments = 8;
    const multipliers = ["2x", "3x", "5x", "1x", "10x", "2x", "1x", "3x"];
    const segColors = ["#FFD700", "#b91c1c", "#16a34a", "#7c3aed", "#FFD700", "#0ea5e9", "#f97316", "#ec4899"];

    const startSpin = () => {
      speedRef.current = 0.12 + Math.random() * 0.08;
    };

    startSpin();
    const spinInterval = setInterval(startSpin, 6000);

    const draw = () => {
      ctx.clearRect(0, 0, size, size);
      angleRef.current += speedRef.current;
      speedRef.current *= 0.996;
      if (speedRef.current < 0.001) speedRef.current = 0;

      for (let i = 0; i < segments; i++) {
        const startAngle = angleRef.current + (i * Math.PI * 2) / segments;
        const endAngle = startAngle + Math.PI * 2 / segments;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, r, startAngle, endAngle);
        ctx.closePath();
        ctx.fillStyle = segColors[i];
        ctx.globalAlpha = 0.85;
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.strokeStyle = "rgba(0,0,0,0.3)";
        ctx.lineWidth = 1;
        ctx.stroke();

        const midAngle = (startAngle + endAngle) / 2;
        const tx = cx + Math.cos(midAngle) * (r * 0.65);
        const ty = cy + Math.sin(midAngle) * (r * 0.65);
        ctx.save();
        ctx.translate(tx, ty);
        ctx.rotate(midAngle + Math.PI / 2);
        ctx.fillStyle = "#000";
        ctx.font = "bold 8px monospace";
        ctx.textAlign = "center";
        ctx.fillText(multipliers[i], 0, 3);
        ctx.restore();
      }

      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(212,175,55,0.7)";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(cx, cy, 8, 0, Math.PI * 2);
      ctx.fillStyle = "#1a1a1a";
      ctx.fill();
      ctx.strokeStyle = "#FFD700";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(cx, 2);
      ctx.lineTo(cx - 5, 12);
      ctx.lineTo(cx + 5, 12);
      ctx.closePath();
      ctx.fillStyle = "#FFD700";
      ctx.fill();

      frameRef.current = requestAnimationFrame(draw);
    };

    frameRef.current = requestAnimationFrame(draw);
    return () => {
      clearInterval(spinInterval);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="text-[10px] uppercase tracking-widest text-primary/70 font-bold">Fortune Wheel</div>
      <canvas ref={canvasRef} className="rounded-full" />
    </div>
  );
}

function MiniFishHunt() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fishRef = useRef<{x: number; y: number; speed: number; size: number; color: string; dir: number}[]>([]);
  const frameRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = 130;
    const h = 80;
    canvas.width = w;
    canvas.height = h;

    const colors = ["#FFD700", "#FF6347", "#00CED1", "#98FB98", "#FF69B4", "#7B68EE"];
    fishRef.current = Array.from({ length: 6 }, () => ({
      x: Math.random() * w,
      y: 10 + Math.random() * (h - 20),
      speed: 0.3 + Math.random() * 0.7,
      size: 4 + Math.random() * 6,
      color: colors[Math.floor(Math.random() * colors.length)],
      dir: Math.random() > 0.5 ? 1 : -1,
    }));

    let bubbles: {x: number; y: number; r: number; speed: number}[] = [];
    for (let i = 0; i < 8; i++) {
      bubbles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r: 1 + Math.random() * 2,
        speed: 0.2 + Math.random() * 0.3,
      });
    }

    const draw = () => {
      const grd = ctx.createLinearGradient(0, 0, 0, h);
      grd.addColorStop(0, "#0a1628");
      grd.addColorStop(1, "#0d2847");
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, w, h);

      for (const b of bubbles) {
        b.y -= b.speed;
        if (b.y < -5) {
          b.y = h + 5;
          b.x = Math.random() * w;
        }
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,0.15)";
        ctx.fill();
      }

      for (const f of fishRef.current) {
        f.x += f.speed * f.dir;
        f.y += Math.sin(Date.now() / 500 + f.x) * 0.3;

        if (f.x > w + 10) { f.dir = -1; f.x = w + 9; }
        if (f.x < -10) { f.dir = 1; f.x = -9; }

        ctx.save();
        ctx.translate(f.x, f.y);
        if (f.dir < 0) ctx.scale(-1, 1);

        ctx.beginPath();
        ctx.ellipse(0, 0, f.size, f.size * 0.5, 0, 0, Math.PI * 2);
        ctx.fillStyle = f.color;
        ctx.globalAlpha = 0.9;
        ctx.fill();
        ctx.globalAlpha = 1;

        ctx.beginPath();
        ctx.moveTo(-f.size, 0);
        ctx.lineTo(-f.size - f.size * 0.6, -f.size * 0.4);
        ctx.lineTo(-f.size - f.size * 0.6, f.size * 0.4);
        ctx.closePath();
        ctx.fillStyle = f.color;
        ctx.globalAlpha = 0.7;
        ctx.fill();
        ctx.globalAlpha = 1;

        ctx.beginPath();
        ctx.arc(f.size * 0.4, -f.size * 0.15, 1.2, 0, Math.PI * 2);
        ctx.fillStyle = "#fff";
        ctx.fill();

        ctx.restore();
      }

      frameRef.current = requestAnimationFrame(draw);
    };

    frameRef.current = requestAnimationFrame(draw);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="text-[10px] uppercase tracking-widest text-primary/70 font-bold">Fish Hunt</div>
      <canvas ref={canvasRef} className="rounded-lg border border-cyan-900/30" />
    </div>
  );
}

function MiniCoinFlip() {
  const [side, setSide] = useState<"H" | "T">("H");
  const [flipping, setFlipping] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const flip = () => {
      setFlipping(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setSide(Math.random() > 0.5 ? "H" : "T");
        setFlipping(false);
      }, 1200);
    };

    flip();
    const loop = setInterval(flip, 3000);
    return () => { clearInterval(loop); if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="text-[10px] uppercase tracking-widest text-primary/70 font-bold">Coin Flip</div>
      <motion.div
        className="w-16 h-16 rounded-full overflow-hidden border-2 border-primary/50"
        animate={flipping ? {
          rotateX: [0, 360, 720, 1080],
          scale: [1, 0.8, 1.1, 1],
        } : {}}
        transition={{ duration: 1.2, ease: "easeOut" }}
      >
        <img
          src={side === "H" ? coinHeads : coinTails}
          alt={side === "H" ? "Heads" : "Tails"}
          className="w-full h-full object-cover"
        />
      </motion.div>
    </div>
  );
}

function MiniPlinko() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ballRef = useRef<{x: number; y: number; vx: number; vy: number; active: boolean}>({x: 55, y: 5, vx: 0, vy: 0, active: false});
  const frameRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = 110;
    const h = 80;
    canvas.width = w;
    canvas.height = h;

    const pegs: {x: number; y: number}[] = [];
    const rows = 5;
    for (let row = 0; row < rows; row++) {
      const count = row + 3;
      const spacing = w / (count + 1);
      for (let col = 0; col < count; col++) {
        pegs.push({ x: spacing * (col + 1), y: 15 + row * 12 });
      }
    }

    const dropBall = () => {
      ballRef.current = {
        x: w / 2 + (Math.random() - 0.5) * 10,
        y: 3,
        vx: (Math.random() - 0.5) * 0.5,
        vy: 0.3,
        active: true,
      };
    };

    dropBall();
    const dropInterval = setInterval(dropBall, 3000);

    const draw = () => {
      ctx.clearRect(0, 0, w, h);

      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.fillRect(0, 0, w, h);

      for (const peg of pegs) {
        ctx.beginPath();
        ctx.arc(peg.x, peg.y, 2, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(212,175,55,0.4)";
        ctx.fill();
      }

      const slots = 7;
      const slotW = w / slots;
      const slotColors = ["#FFD700", "#16a34a", "#0ea5e9", "#7c3aed", "#0ea5e9", "#16a34a", "#FFD700"];
      for (let i = 0; i < slots; i++) {
        ctx.fillStyle = slotColors[i];
        ctx.globalAlpha = 0.3;
        ctx.fillRect(i * slotW, h - 8, slotW - 1, 8);
        ctx.globalAlpha = 1;
      }

      const ball = ballRef.current;
      if (ball.active) {
        ball.vy += 0.08;
        ball.x += ball.vx;
        ball.y += ball.vy;

        for (const peg of pegs) {
          const dx = ball.x - peg.x;
          const dy = ball.y - peg.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 5) {
            ball.vx = dx > 0 ? 0.8 : -0.8;
            ball.vy = Math.abs(ball.vy) * 0.5;
            ball.y = peg.y + (dy > 0 ? 5 : -5);
          }
        }

        if (ball.y > h) ball.active = false;
        if (ball.x < 2) ball.vx = Math.abs(ball.vx);
        if (ball.x > w - 2) ball.vx = -Math.abs(ball.vx);

        ctx.beginPath();
        ctx.arc(ball.x, ball.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = "#FFD700";
        ctx.shadowBlur = 8;
        ctx.shadowColor = "#FFD700";
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      frameRef.current = requestAnimationFrame(draw);
    };

    frameRef.current = requestAnimationFrame(draw);
    return () => {
      clearInterval(dropInterval);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="text-[10px] uppercase tracking-widest text-primary/70 font-bold">Plinko</div>
      <canvas ref={canvasRef} className="rounded-lg border border-primary/20" />
    </div>
  );
}

function DemoColumn({ demos, delay }: { demos: { id: string; component: () => JSX.Element }[]; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: delay === 0.8 ? -30 : 30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 1 }}
      className="flex flex-col gap-3"
    >
      {demos.map((demo) => (
        <motion.div
          key={demo.id}
          className="bg-black/40 backdrop-blur-sm border border-white/5 rounded-xl p-3 flex items-center justify-center"
          whileHover={{ borderColor: "rgba(212,175,55,0.3)" }}
        >
          <demo.component />
        </motion.div>
      ))}
    </motion.div>
  );
}

export function DemoGamesLeft() {
  const demos = [
    { id: "slots", component: MiniSlots },
    { id: "roulette", component: MiniRoulette },
    { id: "dice", component: MiniDice },
    { id: "coin", component: MiniCoinFlip },
  ];
  return <DemoColumn demos={demos} delay={0.8} />;
}

export function DemoGamesRight() {
  const demos = [
    { id: "cards", component: MiniCards },
    { id: "wheel", component: MiniWheel },
    { id: "fish", component: MiniFishHunt },
    { id: "plinko", component: MiniPlinko },
  ];
  return <DemoColumn demos={demos} delay={1.0} />;
}
