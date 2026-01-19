import { ProtectedLayout } from "@/components/layout/ProtectedLayout";
import { useUser } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Coins, Trophy, CreditCard, ChevronRight, Club, Dice5, Dices } from "lucide-react";
import { useRedeemVoucher } from "@/hooks/use-vouchers";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

export default function Lobby() {
  const { data: user } = useUser();
  const [voucherCode, setVoucherCode] = useState("");
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

  return (
    <ProtectedLayout>
      <div className="space-y-8">
        {/* Welcome Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-in slide-in-from-top duration-500">
          <div>
            <h1 className="text-4xl font-display font-bold text-white mb-2">
              Welcome, <span className="text-primary">{user?.username}</span>
            </h1>
            <p className="text-muted-foreground">Select a game to start winning.</p>
          </div>
          
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-4">
             <div className="bg-yellow-500/20 p-2 rounded-full">
                <CreditCard className="w-6 h-6 text-primary" />
             </div>
             <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Current Balance</p>
                <p className="text-2xl font-mono font-bold text-white">UGX {user?.balance.toLocaleString()}</p>
             </div>
          </div>
        </div>

        {/* Voucher Redemption */}
        <Card className="glass-card border-white/10">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" /> Deposit Funds
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRedeem} className="flex gap-4 max-w-md">
              <Input 
                placeholder="Enter Voucher Code" 
                value={voucherCode} 
                onChange={(e) => setVoucherCode(e.target.value)}
                className="bg-black/30 border-white/10"
              />
              <Button type="submit" disabled={isPending} variant="secondary">
                {isPending ? "Redeeming..." : "Redeem"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Games Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Slots Card */}
          <Link href="/slots">
            <div className="group relative h-64 rounded-2xl overflow-hidden cursor-pointer border border-white/10 hover:border-primary/50 transition-all duration-300 shadow-xl hover:shadow-[0_0_30px_rgba(212,175,55,0.15)]">
              {/* Image Background */}
              <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1596838132731-3301c3fd4317?q=80&w=2070')] bg-cover bg-center transition-transform duration-500 group-hover:scale-110" />
              <div className="absolute inset-0 bg-black/60 group-hover:bg-black/40 transition-colors" />
              
              <div className="absolute inset-0 p-8 flex flex-col justify-end">
                <div className="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                  <div className="flex items-center gap-2 mb-2">
                     <Coins className="text-primary w-6 h-6" />
                     <span className="text-xs font-bold bg-primary text-black px-2 py-0.5 rounded uppercase">Featured</span>
                  </div>
                  <h3 className="text-3xl font-display font-bold text-white mb-2">Royal Slots</h3>
                  <p className="text-gray-300 mb-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    Try your luck with our premium slot machines. Big jackpots await!
                  </p>
                  <Button variant="luxury" className="w-full sm:w-auto">Play Now <ChevronRight className="w-4 h-4 ml-2" /></Button>
                </div>
              </div>
            </div>
          </Link>

          {/* Roulette Card */}
          <Link href="/roulette">
            <div className="group relative h-64 rounded-2xl overflow-hidden cursor-pointer border border-white/10 hover:border-primary/50 transition-all duration-300 shadow-xl hover:shadow-[0_0_30px_rgba(212,175,55,0.15)]">
               <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1605870445919-838d190e8e1b?q=80&w=2072')] bg-cover bg-center transition-transform duration-500 group-hover:scale-110" />
               <div className="absolute inset-0 bg-black/60 group-hover:bg-black/40 transition-colors" />
               
               <div className="absolute inset-0 p-8 flex flex-col justify-end">
                <div className="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                  <div className="flex items-center gap-2 mb-2">
                     <Trophy className="text-primary w-6 h-6" />
                     <span className="text-xs font-bold bg-secondary text-white px-2 py-0.5 rounded uppercase">Classic</span>
                  </div>
                  <h3 className="text-3xl font-display font-bold text-white mb-2">European Roulette</h3>
                  <p className="text-gray-300 mb-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    Place your bets on Red, Black, or your lucky number.
                  </p>
                  <Button variant="luxury" className="w-full sm:w-auto">Play Now <ChevronRight className="w-4 h-4 ml-2" /></Button>
                </div>
              </div>
            </div>
          </Link>

          {/* Dice Card */}
          <Link href="/dice">
            <div className="group relative h-64 rounded-2xl overflow-hidden cursor-pointer border border-white/10 hover:border-primary/50 transition-all duration-300 shadow-xl hover:shadow-[0_0_30px_rgba(212,175,55,0.15)]">
               <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1595131838585-34435997c65b?q=80&w=2070')] bg-cover bg-center transition-transform duration-500 group-hover:scale-110" />
               <div className="absolute inset-0 bg-black/60 group-hover:bg-black/40 transition-colors" />
               
               <div className="absolute inset-0 p-8 flex flex-col justify-end">
                <div className="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                  <div className="flex items-center gap-2 mb-2">
                     <Dices className="text-primary w-6 h-6" />
                     <span className="text-xs font-bold bg-purple-500 text-white px-2 py-0.5 rounded uppercase">New</span>
                  </div>
                  <h3 className="text-3xl font-display font-bold text-white mb-2">Royal Dice</h3>
                  <p className="text-gray-300 mb-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    Test your luck with a roll of the dice. High or Low?
                  </p>
                  <Button variant="luxury" className="w-full sm:w-auto">Play Now <ChevronRight className="w-4 h-4 ml-2" /></Button>
                </div>
              </div>
            </div>
          </Link>

          {/* HiLo Card */}
          <Link href="/hilo">
            <div className="group relative h-64 rounded-2xl overflow-hidden cursor-pointer border border-white/10 hover:border-primary/50 transition-all duration-300 shadow-xl hover:shadow-[0_0_30px_rgba(212,175,55,0.15)]">
               <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1511193311914-0346f16efe90?q=80&w=2073')] bg-cover bg-center transition-transform duration-500 group-hover:scale-110" />
               <div className="absolute inset-0 bg-black/60 group-hover:bg-black/40 transition-colors" />
               
               <div className="absolute inset-0 p-8 flex flex-col justify-end">
                <div className="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                  <div className="flex items-center gap-2 mb-2">
                     <Club className="text-primary w-6 h-6" />
                     <span className="text-xs font-bold bg-blue-500 text-white px-2 py-0.5 rounded uppercase">Featured</span>
                  </div>
                  <h3 className="text-3xl font-display font-bold text-white mb-2">High-Low Cards</h3>
                  <p className="text-gray-300 mb-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    Predict the next card in this high-stakes game.
                  </p>
                  <Button variant="luxury" className="w-full sm:w-auto">Play Now <ChevronRight className="w-4 h-4 ml-2" /></Button>
                </div>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </ProtectedLayout>
  );
}
