import { ProtectedLayout } from "@/components/layout/ProtectedLayout";
import { useUser } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Coins, Trophy, CreditCard, ChevronRight, Club, Dice5, Dices, Banknote, Sparkles, Zap, Star, Gem, RotateCcw, LucideIcon, Club as Cards, Target } from "lucide-react";
import { useRedeemVoucher } from "@/hooks/use-vouchers";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { motion, AnimatePresence } from "framer-motion";

export default function Lobby() {
  const { data: user } = useUser();
  const [voucherCode, setVoucherCode] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const { mutate: redeem, isPending } = useRedeemVoucher();
  const { toast } = useToast();

  const handleRedeem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!voucherCode) return;
    redeem({ code: voucherCode }, {
      onSuccess: (data) => {
        toast({ title: "Success!", description: data.message, className: "bg-green-600 text-white" });
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

    try {
      const res = await fetch("/api/withdraw/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      
      toast({ title: "Request Sent", description: "Your withdrawal request is pending approval.", className: "bg-green-600 text-white" });
      setWithdrawAmount("");
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
      <motion.div 
        className="space-y-8"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        {/* Animated Hero Header */}
        <motion.div 
          className="relative overflow-hidden rounded-3xl p-8 md:p-12 bg-gradient-to-br from-black via-zinc-900 to-black border border-white/10 shadow-2xl"
          variants={itemVariants}
        >
          <div className="absolute top-0 right-0 p-4 opacity-20 pointer-events-none">
            <Sparkles className="w-64 h-64 text-primary animate-pulse" />
          </div>
          
            <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
            <div className="space-y-4">
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/30 border border-primary/50 text-white text-xs font-bold uppercase tracking-widest shadow-[0_0_15px_rgba(212,175,55,0.3)]"
              >
                <Zap className="w-3 h-3 text-yellow-300" /> Premium Casino Experience
              </motion.div>
              <h1 className="text-4xl md:text-6xl font-display font-bold text-white leading-tight drop-shadow-[0_2px_15px_rgba(212,175,55,0.4)]">
                Welcome, <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-yellow-200 to-primary animate-gradient drop-shadow-none">{user?.username}</span>
              </h1>
              <p className="text-lg text-white font-bold max-w-xl drop-shadow-[0_2px_10px_rgba(0,0,0,1)] uppercase tracking-wide">
                Experience the thrill of Uganda's most exclusive online casino. Your royal winning streak starts right here.
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
                  />
                  <Button type="submit" disabled={isPending} variant="secondary" className="h-12 px-8 font-bold hover-elevate">
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
                <CardDescription>Minimum withdrawal: UGX 500</CardDescription>
              </CardHeader>
              <CardContent className="relative z-10">
                <form onSubmit={handleWithdrawRequest} className="flex gap-4">
                  <Input 
                    type="number"
                    placeholder="Amount (UGX)" 
                    value={withdrawAmount} 
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    className="bg-black/40 border-white/10 focus:border-primary/50 transition-colors h-12"
                  />
                  <Button type="submit" variant="luxury" className="h-12 px-8 font-bold">
                    Request
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
              title: "Royal Slots",
              desc: "Spin the reels for ultimate golden treasures.",
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
            }
          ].map((game, idx) => (
            <motion.div 
              key={game.id}
              variants={itemVariants}
              whileHover={{ y: -10 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <Link href={game.href}>
                <div className="group relative h-72 rounded-3xl overflow-hidden cursor-pointer border border-white/10 hover:border-primary/50 transition-all duration-500 shadow-2xl hover:shadow-[0_0_50px_rgba(212,175,55,0.2)]">
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
