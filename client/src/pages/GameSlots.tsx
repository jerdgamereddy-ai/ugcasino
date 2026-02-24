import { ProtectedLayout } from "@/components/layout/ProtectedLayout";
import { SlotMachine } from "@/components/games/SlotMachine";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { useFullscreen, FullscreenButton } from "@/components/FullscreenToggle";
import { useQuery } from "@tanstack/react-query";

export default function GameSlots() {
  const { isFullscreen, toggle, containerRef } = useFullscreen();
  const { data: odds } = useQuery<{ winChance: number }>({ queryKey: ["/api/games/slots/odds"] });

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
            <h1 className="text-5xl md:text-7xl font-display font-bold text-primary mb-2 drop-shadow-[0_0_30px_rgba(212,175,55,0.8)]">Fruit Slots</h1>
            <p className="text-white font-black text-xl drop-shadow-[0_2px_10px_rgba(0,0,0,1)] uppercase tracking-widest">Match 3 fruits to win big rewards.</p>
            {odds && (
              <div className="mt-3 inline-flex items-center gap-2 bg-black/40 border border-[#D4AF37]/30 rounded-full px-4 py-1.5" data-testid="display-slots-odds">
                <span className="text-[#D4AF37]/70 text-sm font-medium">Win Odds:</span>
                <span className="text-[#D4AF37] text-sm font-bold">{odds.winChance}%</span>
              </div>
            )}
        </div>

        <SlotMachine />
      </div>
      </div>
    </ProtectedLayout>
  );
}
