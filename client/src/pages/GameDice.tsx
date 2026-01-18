import { ProtectedLayout } from "@/components/layout/ProtectedLayout";
import { DiceGame } from "@/components/games/DiceGame";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

export default function GameDice() {
  return (
    <ProtectedLayout>
      <div className="space-y-6">
        <Link href="/">
          <Button variant="ghost" className="pl-0 hover:pl-2 transition-all">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Lobby
          </Button>
        </Link>
        
        <div className="text-center mb-8">
            <h1 className="text-4xl font-display font-bold text-primary mb-2">Royal Dice</h1>
            <p className="text-muted-foreground">Predict high or low rolls for double payouts.</p>
        </div>

        <div className="max-w-2xl mx-auto">
          <DiceGame />
        </div>
      </div>
    </ProtectedLayout>
  );
}
