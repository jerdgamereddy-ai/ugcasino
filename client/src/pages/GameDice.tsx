import { ProtectedLayout } from "@/components/layout/ProtectedLayout";
import { DiceGame } from "@/components/games/DiceGame";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { useFullscreen, FullscreenButton } from "@/components/FullscreenToggle";

export default function GameDice() {
  const { isFullscreen, toggle, containerRef } = useFullscreen();

  return (
    <ProtectedLayout>
      <div ref={containerRef} className={isFullscreen ? "bg-background p-4 overflow-auto h-screen" : ""}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Link href="/">
            <Button variant="ghost" className="pl-0 hover:pl-2 transition-all">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Lobby
            </Button>
          </Link>
          <FullscreenButton isFullscreen={isFullscreen} onToggle={toggle} />
        </div>
        
        <div className="text-center mb-8">
            <h1 className="text-5xl md:text-7xl font-display font-bold text-primary mb-2 drop-shadow-[0_0_30px_rgba(212,175,55,0.8)]">Royal Dice</h1>
            <p className="text-white font-black text-xl drop-shadow-[0_2px_10px_rgba(0,0,0,1)] uppercase tracking-widest">Predict high or low rolls for double payouts.</p>
        </div>

        <div className="max-w-4xl mx-auto">
          <DiceGame />
        </div>
      </div>
      </div>
    </ProtectedLayout>
  );
}
