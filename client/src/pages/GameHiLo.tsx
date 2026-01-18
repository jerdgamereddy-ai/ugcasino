import { ProtectedLayout } from "@/components/layout/ProtectedLayout";
import { HiLoGame } from "@/components/games/HiLoGame";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

export default function GameHiLo() {
  return (
    <ProtectedLayout>
      <div className="space-y-6">
        <Link href="/">
          <Button variant="ghost" className="pl-0 hover:pl-2 transition-all">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Lobby
          </Button>
        </Link>
        
        <div className="text-center mb-8">
            <h1 className="text-4xl font-display font-bold text-primary mb-2">High-Low Cards</h1>
            <p className="text-muted-foreground">Predict if the next card will be higher or lower.</p>
        </div>

        <div className="max-w-2xl mx-auto">
          <HiLoGame />
        </div>
      </div>
    </ProtectedLayout>
  );
}
