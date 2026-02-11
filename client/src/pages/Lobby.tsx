import { ProtectedLayout } from "@/components/layout/ProtectedLayout";
import { useUser } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Coins, Trophy, CreditCard, ChevronRight, Club, Dice5, Dices, Banknote, Sparkles, Zap, Star, Gem, RotateCcw, LucideIcon, Club as Cards, Target, Crown, Diamond, Fish } from "lucide-react";
import { useRedeemVoucher } from "@/hooks/use-vouchers";
import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { motion, AnimatePresence } from "framer-motion";

import { playSound } from "@/lib/sounds";
import { BroadcastBanner } from "@/components/BroadcastBanner";

function AnimatedCounter({ target, duration = 2000, prefix = "", suffix = "" }: { target: number; duration?: number; prefix?: string; suffix?: string }) {
  const [count, setCount] = useState(0);
  const frameRef = useRef<number>();

  useEffect(() => {
    let start = 0;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.floor(eased * target);
      setCount(current);
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      }
    };

    frameRef.current = requestAnimationFrame(animate);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [target, duration]);

  return (
    <span className="tabular-nums">
      {prefix}{count.toLocaleString()}{suffix}
    </span>
  );
}

function JackpotTicker() {
  const [jackpot, setJackpot] = useState(247835920);

  useEffect(() => {
    const interval = setInterval(() => {
      setJackpot(prev => prev + Math.floor(Math.random() * 5000) + 1000);
    }, 100);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative overflow-hidden rounded-2xl border-2 border-primary/50 bg-gradient-to-r from-black via-zinc-900 to-black p-4 md:p-6"
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-primary rounded-full"
            initial={{ x: `${Math.random() * 100}%`, y: `${Math.random() * 100}%`, opacity: 0 }}
            animate={{
              opacity: [0, 1, 0],
              scale: [0, 1.5, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>
      <div className="flex flex-col items-center gap-2 relative z-10">
        <div className="flex items-center gap-2">
          <motion.div
            animate={{ rotate: [0, 15, -15, 0] }}
            transition={{ duration: 1, repeat: Infinity, repeatDelay: 2 }}
          >
            <Crown className="w-5 h-5 text-primary" />
          </motion.div>
          <span className="text-[10px] md:text-xs font-black uppercase tracking-[0.3em] text-primary">Progressive Jackpot</span>
          <motion.div
            animate={{ rotate: [0, -15, 15, 0] }}
            transition={{ duration: 1, repeat: Infinity, repeatDelay: 2 }}
          >
            <Crown className="w-5 h-5 text-primary" />
          </motion.div>
        </div>
        <motion.div
          className="text-2xl md:text-5xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-r from-primary via-yellow-200 to-primary tracking-wider"
          animate={{ textShadow: ["0 0 20px rgba(212,175,55,0.3)", "0 0 40px rgba(212,175,55,0.6)", "0 0 20px rgba(212,175,55,0.3)"] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          UGX {jackpot.toLocaleString()}
        </motion.div>
      </div>

      <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-primary rounded-tl-lg" />
      <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-primary rounded-tr-lg" />
      <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-primary rounded-bl-lg" />
      <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-primary rounded-br-lg" />
    </motion.div>
  );
}

function LiveStatsBillboard() {
  const [stats, setStats] = useState({
    totalBets: 1247893,
    totalWins: 892341,
    playersOnline: 342,
    biggestWin: 5000000,
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setStats(prev => ({
        totalBets: prev.totalBets + Math.floor(Math.random() * 50),
        totalWins: prev.totalWins + Math.floor(Math.random() * 30),
        playersOnline: Math.max(200, prev.playersOnline + Math.floor(Math.random() * 10) - 5),
        biggestWin: prev.biggestWin,
      }));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const items = [
    { label: "Total Bets", value: stats.totalBets, icon: Coins, color: "text-amber-400" },
    { label: "Total Wins", value: stats.totalWins, icon: Trophy, color: "text-emerald-400" },
    { label: "Players Online", value: stats.playersOnline, icon: Zap, color: "text-cyan-400" },
    { label: "Biggest Win", value: stats.biggestWin, icon: Diamond, color: "text-purple-400", prefix: "UGX " },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {items.map((item, idx) => (
        <motion.div
          key={item.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.1 }}
          className="relative bg-zinc-900/80 rounded-xl p-3 md:p-4 border border-white/5 text-center overflow-hidden group"
        >
          <div className="absolute inset-0 bg-gradient-to-t from-white/[0.02] to-transparent pointer-events-none" />
          <item.icon className={`w-5 h-5 ${item.color} mx-auto mb-1 opacity-60`} />
          <div className={`text-lg md:text-xl font-black font-mono ${item.color}`}>
            <AnimatedCounter target={item.value} duration={2500} prefix={item.prefix || ""} />
          </div>
          <div className="text-[9px] md:text-[10px] text-muted-foreground uppercase tracking-widest mt-1 font-bold">{item.label}</div>
        </motion.div>
      ))}
    </div>
  );
}

export default function Lobby() {
  const { data: user } = useUser();
  const [voucherCode, setVoucherCode] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [managerCode, setManagerCode] = useState("");
  const { mutate: redeem, isPending } = useRedeemVoucher();
  const { toast } = useToast();

  const handleRedeem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!voucherCode) return;
    redeem({ code: voucherCode }, {
      onSuccess: (data) => {
        playSound('win');
        toast({ title: "Success!", description: data.message, className: "bg-emerald-600 text-white font-bold" });
        setVoucherCode("");
      },
      onError: (err) => {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      }
    });
  };

  const handleWithdrawRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseInt(withdrawAmount);
    if (!amount || amount < 500) {
      toast({ title: "Error", description: "Minimum withdrawal is UGX 500", variant: "destructive" });
      return;
    }
    if (!managerCode || managerCode.length !== 6) {
      toast({ title: "Error", description: "Please enter a valid 6-digit manager code", variant: "destructive" });
      return;
    }

    try {
      const res = await fetch("/api/withdraw/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, managerCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      
      toast({ title: "Request Sent", description: "Your withdrawal request has been sent to the manager.", className: "bg-green-600 text-white" });
      setWithdrawAmount("");
      setManagerCode("");
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1
    }
  };

  return (
    <ProtectedLayout>
      <BroadcastBanner />
      <motion.div 
        className="space-y-8"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        {/* Jackpot Billboard */}
        <motion.div variants={itemVariants}>
          <JackpotTicker />
        </motion.div>

        {/* Animated Hero Header */}
        <motion.div 
          className="relative overflow-hidden rounded-3xl p-8 md:p-12 bg-gradient-to-br from-black via-emerald-900/30 to-black border border-emerald-500/20 shadow-[0_0_50px_rgba(16,185,129,0.15)]"
          variants={itemVariants}
        >
          <div className="absolute top-0 right-0 p-4 opacity-20 pointer-events-none">
            <Sparkles className="w-64 h-64 text-emerald-500 animate-pulse" />
          </div>
          
            <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
            <div className="space-y-4">
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 text-xs font-bold uppercase tracking-widest shadow-[0_0_15px_rgba(16,185,129,0.3)]"
              >
                <Sparkles className="w-3 h-3 text-emerald-400 animate-pulse" /> Uganda's #1 Luxury Lounge
              </motion.div>
              <h1 className="text-4xl md:text-6xl font-display font-bold text-white leading-tight drop-shadow-[0_2px_15px_rgba(16,185,129,0.4)]">
                Welcome, <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-emerald-400 to-primary animate-gradient drop-shadow-none">{user?.username}</span>
              </h1>
              <p className="text-lg text-white font-bold max-w-xl drop-shadow-[0_2px_10px_rgba(0,0,0,1)] uppercase tracking-wide leading-relaxed">
                Experience the thrill of <span className="text-emerald-400">Emerald Lounge</span>. Your <span className="text-rose-500">Royal streak</span> starts right here.
              </p>
            </div>
            
            <motion.div 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 flex items-center gap-6 shadow-xl"
            >
               <div className="bg-gradient-to-tr from-primary to-yellow-200 p-4 rounded-xl shadow-[0_0_20px_rgba(212,175,55,0.3)]">
                  <CreditCard className="w-8 h-8 text-black" />
               </div>
               <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Available Balance</p>
                  <motion.p 
                    key={user?.balance}
                    initial={{ scale: 1.2, color: "#d4af37" }}
                    animate={{ scale: 1, color: "#ffffff" }}
                    className="text-3xl font-mono font-bold text-white"
                  >
                    UGX {user?.balance.toLocaleString()}
                  </motion.p>
               </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Live Stats Billboard */}
        <motion.div variants={itemVariants}>
          <LiveStatsBillboard />
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Animated Voucher Redemption */}
          <motion.div variants={itemVariants}>
            <Card className="glass-card border-white/10 h-full overflow-hidden relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <CreditCard className="w-5 h-5 text-primary" />
                  </div>
                  Deposit Funds
                </CardTitle>
                <CardDescription>Redeem your luxury voucher codes instantly.</CardDescription>
              </CardHeader>
              <CardContent className="relative z-10">
                <form onSubmit={handleRedeem} className="flex gap-4">
                  <Input 
                    placeholder="Enter Voucher Code" 
                    value={voucherCode} 
                    onChange={(e) => setVoucherCode(e.target.value)}
                    className="bg-black/40 border-white/10 focus:border-primary/50 transition-colors h-12"
                    data-testid="input-voucher-code"
                  />
                  <Button type="submit" disabled={isPending} variant="secondary" className="h-12 px-8 font-bold hover-elevate" data-testid="button-redeem-voucher">
                    {isPending ? "Redeeming..." : "Redeem"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>

          {/* Animated Withdrawal Request */}
          <motion.div variants={itemVariants}>
            <Card className="glass-card border-white/10 h-full overflow-hidden relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Banknote className="w-5 h-5 text-primary" />
                  </div>
                  Withdraw Funds
                </CardTitle>
                <CardDescription>Enter amount and manager's 6-digit code</CardDescription>
              </CardHeader>
              <CardContent className="relative z-10">
                <form onSubmit={handleWithdrawRequest} className="space-y-3">
                  <div className="flex gap-3">
                    <Input 
                      type="number"
                      placeholder="Amount (UGX)" 
                      value={withdrawAmount} 
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      className="bg-black/40 border-white/10 focus:border-primary/50 transition-colors h-12 flex-1"
                      data-testid="input-withdraw-amount"
                    />
                    <Input 
                      type="text"
                      placeholder="Manager Code" 
                      value={managerCode}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                        setManagerCode(val);
                      }}
                      maxLength={6}
                      className="bg-black/40 border-white/10 focus:border-primary/50 transition-colors h-12 w-36 text-center tracking-widest font-mono"
                      data-testid="input-manager-code"
                    />
                  </div>
                  <Button type="submit" variant="luxury" className="w-full font-bold" data-testid="button-withdraw-request">
                    Request Withdrawal
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Games Section Label */}
        <motion.div 
          variants={itemVariants}
          className="flex items-center gap-4 py-4"
        >
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          <h2 className="text-2xl font-display font-bold text-white/80 flex items-center gap-2">
            <Star className="w-5 h-5 text-primary fill-primary" />
            Featured Games
            <Star className="w-5 h-5 text-primary fill-primary" />
          </h2>
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </motion.div>

        {/* Enhanced Games Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {[
            {
              href: "/slots",
              img: "https://images.unsplash.com/photo-1596838132731-3301c3fd4317?q=80&w=2070",
              icon: Coins,
              tag: "Featured",
              tagColor: "bg-primary",
              title: "Fruit Slots",
              desc: "Match tropical fruits for ultimate golden treasures.",
              id: "slots"
            },
            {
              href: "/roulette",
              img: "https://images.unsplash.com/photo-1605870445919-838d190e8e1b?q=80&w=2072",
              icon: Trophy,
              tag: "Classic",
              tagColor: "bg-secondary",
              title: "European Roulette",
              desc: "Predict the wheel and claim your fortune.",
              id: "roulette"
            },
            {
              href: "/dice",
              img: "https://images.unsplash.com/photo-1595131838585-34435997c65b?q=80&w=2070",
              icon: Dices,
              tag: "Trending",
              tagColor: "bg-purple-600",
              title: "Royal Dice",
              desc: "Test your intuition with every single roll.",
              id: "dice"
            },
            {
              href: "/hilo",
              img: "https://images.unsplash.com/photo-1511193311914-0346f16efe90?q=80&w=2073",
              icon: Club,
              tag: "High Stakes",
              tagColor: "bg-blue-600",
              title: "High-Low Cards",
              desc: "Master the deck in this classic card duel.",
              id: "hilo"
            },
            {
              href: "/coinflip",
              img: "https://images.unsplash.com/photo-1596464716127-f2a82984de30?q=80&w=2070",
              icon: Coins,
              tag: "50/50",
              tagColor: "bg-emerald-600",
              title: "Double or Nothing",
              desc: "Flip the royal coin and double your fortune.",
              id: "coinflip"
            },
            {
              href: "/plinko",
              img: "https://images.unsplash.com/photo-1605870445919-838d190e8e1b?q=80&w=2072",
              icon: Zap,
              tag: "Exciting",
              tagColor: "bg-green-600",
              title: "Plinko",
              desc: "Watch the ball drop for massive multipliers.",
              id: "plinko"
            },
            {
              href: "/mines",
              img: "https://images.unsplash.com/photo-1596838132731-3301c3fd4317?q=80&w=2070",
              icon: Gem,
              tag: "Strategy",
              tagColor: "bg-red-600",
              title: "Diamond Mines",
              desc: "Avoid the mines and find the hidden gems.",
              id: "mines"
            },
            {
              href: "/wheel",
              img: "https://images.unsplash.com/photo-1605870445919-838d190e8e1b?q=80&w=2072",
              icon: RotateCcw as LucideIcon,
              tag: "New",
              tagColor: "bg-primary",
              title: "Wheel of Fortune",
              desc: "Spin the luxury wheel for instant wins.",
              id: "wheel"
            },
            {
              href: "/poker",
              img: "https://images.unsplash.com/photo-1511193311914-0346f16efe90?q=80&w=2073",
              icon: Cards as LucideIcon,
              tag: "Hot",
              tagColor: "bg-red-500",
              title: "Video Poker",
              desc: "Jacks or better for big payouts.",
              id: "poker"
            },
            {
              href: "/keno",
              img: "https://images.unsplash.com/photo-1596838132731-3301c3fd4317?q=80&w=2070",
              icon: Target as LucideIcon,
              tag: "Classic",
              tagColor: "bg-blue-600",
              title: "Luxury Keno",
              desc: "Select your numbers and win the luxury jackpot.",
              id: "keno"
            },
            {
              href: "/fishhunt",
              img: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?q=80&w=2070",
              icon: Fish as LucideIcon,
              tag: "NEW",
              tagColor: "bg-cyan-600",
              title: "Fish Hunt",
              desc: "Hunt legendary sea creatures for massive multipliers!",
              id: "fishhunt"
            }
          ].map((game, idx) => (
            <motion.div 
              key={game.id}
              variants={itemVariants}
              whileHover={{ y: -10 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <Link href={game.href}>
                <div className="group relative h-72 rounded-3xl overflow-hidden cursor-pointer border border-white/10 hover:border-primary/50 transition-all duration-500 shadow-2xl hover:shadow-[0_0_50px_rgba(212,175,55,0.2)]" data-testid={`card-game-${game.id}`}>
                  {/* Image Background with Parallax effect */}
                  <motion.div 
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110" 
                    style={{ backgroundImage: `url(${game.img})` }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent group-hover:from-black/90 transition-all" />
                  
                  <div className="absolute inset-0 p-8 flex flex-col justify-end">
                    <div className="space-y-3 transform translate-y-6 group-hover:translate-y-0 transition-transform duration-500">
                      <div className="flex items-center gap-3">
                         <game.icon className="text-primary w-8 h-8 drop-shadow-[0_0_10px_rgba(212,175,55,0.8)]" />
                         <span className={`text-[10px] font-black ${game.tagColor} text-white px-2.5 py-1 rounded-full uppercase tracking-tighter shadow-lg`}>
                           {game.tag}
                         </span>
                      </div>
                      <h3 className="text-4xl font-display font-bold text-white tracking-tight drop-shadow-lg">{game.title}</h3>
                      <p className="text-gray-300 text-sm max-w-xs opacity-0 group-hover:opacity-100 transition-all duration-500 delay-100">
                        {game.desc}
                      </p>
                      <motion.div
                        className="pt-2 opacity-0 group-hover:opacity-100 transition-all duration-500 delay-200"
                      >
                        <Button variant="luxury" className="w-full sm:w-auto h-12 px-8 shadow-[0_5px_15px_rgba(0,0,0,0.3)]">
                          Play Now <ChevronRight className="w-4 h-4 ml-2" />
                        </Button>
                      </motion.div>
                    </div>
                  </div>
                  
                  {/* Decorative overlay for extra "luxury" feel */}
                  <div className="absolute inset-0 border-[0.5px] border-white/5 rounded-3xl pointer-events-none" />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </ProtectedLayout>
  );
}
