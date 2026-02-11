import { useState, useEffect, useRef, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLogin, useRegister } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Coins, Loader2, Ticket, Trophy, Star, Gem, Crown, Sparkles, Megaphone } from "lucide-react";
import { DemoGamesLeft, DemoGamesRight } from "@/components/DemoGames";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { type Broadcast } from "@shared/schema";

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

function FireworksCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const frameRef = useRef<number>();
  const nextIdRef = useRef(0);

  const FIREWORK_COLORS = [
    "#FFD700", "#FFA500", "#FF6347", "#FF69B4",
    "#00CED1", "#7B68EE", "#98FB98", "#FFFFFF",
    "#FFE4B5", "#F0E68C",
  ];

  const spawnFirework = useCallback((cx: number, cy: number) => {
    const color = FIREWORK_COLORS[Math.floor(Math.random() * FIREWORK_COLORS.length)];
    const count = 30 + Math.floor(Math.random() * 30);
    const newParticles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.3;
      const speed = 1.5 + Math.random() * 3;
      const maxLife = 60 + Math.floor(Math.random() * 40);
      newParticles.push({
        id: nextIdRef.current++,
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: maxLife,
        maxLife,
        color,
        size: 1.5 + Math.random() * 2,
      });
    }
    particlesRef.current = [...particlesRef.current, ...newParticles];
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const launchInterval = setInterval(() => {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height * 0.6;
      spawnFirework(x, y);
    }, 1800);

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const alive: Particle[] = [];

      for (const p of particlesRef.current) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.03;
        p.vx *= 0.99;
        p.life--;
        if (p.life <= 0) continue;

        const alpha = p.life / p.maxLife;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 8;
        ctx.shadowColor = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
        ctx.fill();

        if (alpha > 0.3 && Math.random() < 0.3) {
          ctx.globalAlpha = alpha * 0.3;
          ctx.beginPath();
          ctx.arc(p.x - p.vx * 2, p.y - p.vy * 2, p.size * 0.5 * alpha, 0, Math.PI * 2);
          ctx.fill();
        }

        alive.push(p);
      }

      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
      particlesRef.current = alive;
      frameRef.current = requestAnimationFrame(animate);
    };

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("resize", resize);
      clearInterval(launchInterval);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [spawnFirework]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 z-0 pointer-events-none"
      style={{ mixBlendMode: "screen" }}
    />
  );
}

function GrowingJackpot() {
  const [amount, setAmount] = useState(247_835_920);

  useEffect(() => {
    const interval = setInterval(() => {
      setAmount(prev => prev + Math.floor(Math.random() * 8000) + 2000);
    }, 120);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.8 }}
      className="text-center mb-4"
    >
      <div className="text-[10px] uppercase tracking-[0.3em] text-primary/70 font-medium mb-1">
        Progressive Jackpot
      </div>
      <div className="relative inline-block">
        <div
          className="text-2xl sm:text-3xl font-bold tabular-nums tracking-tight"
          style={{
            background: "linear-gradient(180deg, #FFD700 0%, #FFA500 40%, #FF8C00 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            filter: "drop-shadow(0 0 12px rgba(255,215,0,0.4))",
          }}
          data-testid="text-login-jackpot"
        >
          UGX {amount.toLocaleString()}
        </div>
      </div>
    </motion.div>
  );
}

function FloatingIcon({ icon: Icon, delay, x, y, duration }: { icon: LucideIcon; delay: number; x: string; y: string; duration: number }) {
  return (
    <motion.div
      className="absolute text-primary/20 pointer-events-none"
      style={{ left: x, top: y }}
      initial={{ opacity: 0, y: 20 }}
      animate={{
        opacity: [0, 0.4, 0],
        y: [20, -30, -60],
        rotate: [0, 15, -15, 0],
      }}
      transition={{
        duration,
        repeat: Infinity,
        delay,
        ease: "easeInOut",
      }}
    >
      <Icon className="w-6 h-6" />
    </motion.div>
  );
}

type LucideIcon = typeof Coins;

function LiveStatBar() {
  const stats = [
    { label: "Players Online", value: 1247, icon: Star },
    { label: "Won Today", value: 89_420_000, prefix: "UGX ", icon: Trophy },
    { label: "Games Played", value: 34_891, icon: Gem },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6, duration: 0.8 }}
      className="flex items-center justify-center gap-4 sm:gap-6 text-[10px] sm:text-xs mb-3"
    >
      {stats.map((stat, i) => (
        <StatCounter key={stat.label} stat={stat} index={i} />
      ))}
    </motion.div>
  );
}

function StatCounter({ stat, index }: { stat: { label: string; value: number; prefix?: string; icon: LucideIcon }; index: number }) {
  const [count, setCount] = useState(0);
  const frameRef = useRef<number>();

  useEffect(() => {
    const startTime = performance.now();
    const duration = 2500 + index * 300;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * stat.value));
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      }
    };

    frameRef.current = requestAnimationFrame(animate);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [stat.value, index]);

  const Icon = stat.icon;

  return (
    <div className="flex items-center gap-1.5 text-muted-foreground">
      <Icon className="w-3 h-3 text-primary/60" />
      <div>
        <span className="font-bold text-primary/80 tabular-nums">{stat.prefix || ""}{count.toLocaleString()}</span>
        <span className="ml-1 hidden sm:inline opacity-70">{stat.label}</span>
      </div>
    </div>
  );
}

function GlowingOrb({ color, size, x, y, delay }: { color: string; size: number; x: string; y: string; delay: number }) {
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{
        left: x,
        top: y,
        width: size,
        height: size,
        background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
      }}
      animate={{
        opacity: [0.1, 0.35, 0.1],
        scale: [0.8, 1.2, 0.8],
      }}
      transition={{
        duration: 4 + Math.random() * 2,
        repeat: Infinity,
        delay,
        ease: "easeInOut",
      }}
    />
  );
}

function PublicBroadcastBanner() {
  const { data: broadcasts } = useQuery<Broadcast[]>({
    queryKey: ["/api/broadcasts/public"],
    refetchInterval: 30000,
  });

  if (!broadcasts || broadcasts.length === 0) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 space-y-0" data-testid="public-broadcast-container">
      {broadcasts.map((b) => {
        const font = b.fontFamily || "sans-serif";
        const textColor = b.color || "#FFD700";

        return (
          <div
            key={b.id}
            className="relative flex items-center overflow-hidden"
            style={{
              background: "linear-gradient(90deg, rgba(0,0,0,0.95) 0%, rgba(20,10,0,0.97) 50%, rgba(0,0,0,0.95) 100%)",
              borderBottom: `1px solid ${textColor}22`,
            }}
            data-testid={`public-broadcast-${b.id}`}
          >
            <div className="flex-shrink-0 px-3 py-1.5 flex items-center gap-1.5 z-10 bg-black/90" style={{ borderRight: `1px solid ${textColor}33` }}>
              <Megaphone className="h-3.5 w-3.5" style={{ color: textColor }} />
            </div>
            <div className="flex-1 overflow-hidden py-1.5">
              <div
                className="marquee-scroll whitespace-nowrap"
                style={{
                  fontFamily: font,
                  color: textColor,
                  fontSize: "0.875rem",
                  fontWeight: "bold",
                  textShadow: `0 0 8px ${textColor}66, 0 0 16px ${textColor}33`,
                }}
              >
                <span className="marquee-text">
                  {b.message}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{b.message}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{b.message}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function Login() {
  const [_, setLocation] = useLocation();
  const { mutate: login, isPending: isLoginPending } = useLogin();
  const { mutate: register, isPending: isRegisterPending } = useRegister();
  const { toast } = useToast();
  const [voucherCode, setVoucherCode] = useState("");
  const [isVoucherLoading, setIsVoucherLoading] = useState(false);

  const onVoucherLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voucherCode) return;
    setIsVoucherLoading(true);
    try {
      const res = await fetch("/api/login/voucher", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: voucherCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      
      toast({ title: "Welcome!", description: data.message, className: "bg-primary text-black" });
      window.location.href = "/";
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsVoucherLoading(false);
    }
  };

  const loginForm = useForm({
    defaultValues: { username: "", password: "" },
  });

  const registerForm = useForm({
    defaultValues: { username: "", password: "", managerCode: "" },
  });

  const onLogin = (data: any) => {
    login(data, {
      onSuccess: () => {
        toast({ title: "Welcome back!", className: "bg-primary text-black" });
        setLocation("/");
      },
      onError: (err) => {
        toast({ title: "Login Failed", description: err.message, variant: "destructive" });
      },
    });
  };

  const onRegister = (data: any) => {
    register(data, {
      onSuccess: (result: any) => {
        toast({ title: "Account created!", description: result.message || "Please wait for your manager to approve your account.", className: "bg-green-600 text-white" });
        registerForm.reset();
      },
      onError: (err) => {
        toast({ title: "Registration Failed", description: err.message, variant: "destructive" });
      },
    });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden bg-black overflow-y-auto">
      <PublicBroadcastBanner />
      <div className="absolute inset-0 bg-gradient-to-b from-black via-zinc-950 to-black" />

      <GlowingOrb color="rgba(255,215,0,0.15)" size={400} x="-5%" y="10%" delay={0} />
      <GlowingOrb color="rgba(255,140,0,0.1)" size={300} x="70%" y="60%" delay={1.5} />
      <GlowingOrb color="rgba(212,175,55,0.08)" size={500} x="40%" y="-10%" delay={0.8} />

      <FireworksCanvas />

      <FloatingIcon icon={Crown} delay={0} x="10%" y="15%" duration={5} />
      <FloatingIcon icon={Gem} delay={1.2} x="85%" y="20%" duration={6} />
      <FloatingIcon icon={Star} delay={0.5} x="15%" y="75%" duration={4.5} />
      <FloatingIcon icon={Sparkles} delay={2} x="80%" y="70%" duration={5.5} />
      <FloatingIcon icon={Trophy} delay={0.8} x="50%" y="8%" duration={7} />
      <FloatingIcon icon={Coins} delay={1.5} x="5%" y="45%" duration={6} />

      <div className="relative z-10 w-full max-w-6xl flex items-start justify-center gap-4">
        <div className="hidden lg:block flex-shrink-0" data-testid="demo-games-left">
          <DemoGamesLeft />
        </div>

        <div className="w-full max-w-md flex flex-col items-center flex-shrink-0">
        <GrowingJackpot />
        <LiveStatBar />

        <Card className="w-full border-white/10 bg-black/60 backdrop-blur-xl shadow-2xl shadow-primary/5">
          <CardHeader className="text-center space-y-4">
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="mx-auto bg-gradient-to-br from-yellow-400 to-yellow-600 p-3 rounded-xl w-fit shadow-lg shadow-yellow-500/20"
            >
              <Coins className="h-8 w-8 text-black" />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
            >
              <CardTitle className="text-3xl font-display text-primary" data-testid="text-app-title">Royal Fortune</CardTitle>
              <CardDescription className="text-muted-foreground mt-2">Enter the world of luxury gaming</CardDescription>
            </motion.div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-6 bg-white/5">
                <TabsTrigger value="login" data-testid="tab-login">Login</TabsTrigger>
                <TabsTrigger value="register" data-testid="tab-register">Register</TabsTrigger>
                <TabsTrigger value="voucher" data-testid="tab-voucher">Voucher</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login">
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                    <FormField
                      control={loginForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter username" {...field} data-testid="input-login-username" className="bg-white/5 border-white/10 focus:border-primary/50" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={loginForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="••••••••" {...field} data-testid="input-login-password" className="bg-white/5 border-white/10 focus:border-primary/50" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" className="w-full" variant="luxury" disabled={isLoginPending} data-testid="button-login-submit">
                      {isLoginPending ? <Loader2 className="animate-spin" /> : "Access Account"}
                    </Button>
                    <div className="text-center pt-2">
                      <a href="/forgot-password" className="text-xs text-primary underline" data-testid="link-forgot-password">Forgot Admin Password?</a>
                    </div>
                  </form>
                </Form>
              </TabsContent>

              <TabsContent value="register">
                <Form {...registerForm}>
                  <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-4">
                    <FormField
                      control={registerForm.control}
                      name="managerCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Manager Code</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter 6-digit manager code" maxLength={6} {...field} onChange={(e) => field.onChange(e.target.value.replace(/\D/g, '').slice(0, 6))} data-testid="input-register-manager-code" className="bg-white/5 border-white/10 font-mono text-center tracking-widest" />
                          </FormControl>
                          <FormMessage />
                          <p className="text-[10px] text-muted-foreground">Get this code from your manager to register</p>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <Input placeholder="Choose username" {...field} data-testid="input-register-username" className="bg-white/5 border-white/10" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="Create password" {...field} data-testid="input-register-password" className="bg-white/5 border-white/10" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" className="w-full" variant="outline" disabled={isRegisterPending} data-testid="button-register-submit">
                      {isRegisterPending ? <Loader2 className="animate-spin" /> : "Create Account"}
                    </Button>
                    <p className="text-[10px] text-center text-muted-foreground">Your account will need manager approval before you can play</p>
                  </form>
                </Form>
              </TabsContent>
              <TabsContent value="voucher">
                <form onSubmit={onVoucherLogin} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Voucher Code</label>
                    <Input 
                      placeholder="Enter your luxury voucher code" 
                      value={voucherCode}
                      onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                      data-testid="input-voucher-code"
                      className="bg-white/5 border-white/10 focus:border-primary/50 text-center font-mono text-lg tracking-widest"
                    />
                  </div>
                  <Button type="submit" className="w-full" variant="luxury" disabled={isVoucherLoading} data-testid="button-voucher-submit">
                    {isVoucherLoading ? <Loader2 className="animate-spin" /> : <><Ticket className="w-4 h-4 mr-2" /> Play Now</>}
                  </Button>
                  <p className="text-[10px] text-center text-muted-foreground uppercase tracking-tighter">
                    Instant access. No account required.
                  </p>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="text-[10px] text-muted-foreground/50 text-center mt-4 tracking-wider uppercase"
        >
          Play responsibly. 18+ only.
        </motion.p>
        </div>

        <div className="hidden lg:block flex-shrink-0" data-testid="demo-games-right">
          <DemoGamesRight />
        </div>
      </div>
    </div>
  );
}
