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
            <h1 className="text-4xl font-display font-bold text-primary mb-2">European Roulette</h1>
            <p className="text-muted-foreground">Place your bets on the wheel of fortune.</p>
        </div>

        <RouletteBoard />
      </div>
    </ProtectedLayout>
  );
}
