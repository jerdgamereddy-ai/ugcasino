import { ProtectedLayout } from "@/components/layout/ProtectedLayout";
import { RouletteBoard } from "@/components/games/RouletteBoard";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

export default function GameRoulette() {
  return (
    <ProtectedLayout>
        <div className="space-y-6">
        <Link href="/">
          <Button variant="ghost" className="pl-0 hover:pl-2 transition-all">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Lobby
          </Button>
        </Link>
        
        <div className="text-center mb-8">
            <h1 className="text-5xl md:text-7xl font-display font-bold text-primary mb-2 drop-shadow-[0_0_30px_rgba(212,175,55,0.8)]">European Roulette</h1>
            <p className="text-white font-black text-xl drop-shadow-[0_2px_10px_rgba(0,0,0,1)] uppercase tracking-widest">Place your bets on the wheel of fortune.</p>
        </div>

        <RouletteBoard />
      </div>
    </ProtectedLayout>
  );
}
