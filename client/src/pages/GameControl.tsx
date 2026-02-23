import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { type GameSetting } from "@shared/schema";
import { api } from "@shared/routes";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Settings2, ChevronUp, ChevronDown } from "lucide-react";

const ACTIVE_GAMES = ["slots", "roulette", "dice", "hilo", "coinflip", "plinko", "wheel", "fishhunt", "classic-slots"];

function CoinflipMultiplierCard({ setting }: { setting: GameSetting }) {
  const { toast } = useToast();
  const [multiplierVal, setMultiplierVal] = useState(setting.payoutMultiplier ?? 1.95);

  const multiplierMutation = useMutation({
    mutationFn: async (val: number) => {
      const res = await fetch("/api/games/settings/payout-multiplier", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameType: "coinflip", payoutMultiplier: val }),
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.games.settings.get.path] });
      toast({ title: "Payout Updated", description: `Coin Flip payout multiplier set to ${multiplierVal}x.` });
    },
  });

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader>
        <CardTitle>Coin Flip Payout Odds</CardTitle>
        <CardDescription>Set the payout multiplier for winning coin flip bets. For example, 1.95x means a player betting 1000 UGX wins 1950 UGX.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3 max-w-md">
          <Input
            type="number"
            min={1.01}
            max={10}
            step={0.05}
            value={multiplierVal}
            onChange={(e) => setMultiplierVal(Math.max(1.01, parseFloat(e.target.value) || 1.01))}
            className="font-mono text-lg font-bold text-center"
            data-testid="input-coinflip-multiplier"
          />
          <span className="text-lg font-bold text-muted-foreground">x</span>
          <Button
            onClick={() => multiplierMutation.mutate(multiplierVal)}
            disabled={multiplierMutation.isPending}
            data-testid="button-save-coinflip-multiplier"
          >
            {multiplierMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function GameSettingForm({ setting }: { setting: GameSetting }) {
  const { toast } = useToast();
  const [pct, setPct] = useState(Math.round(setting.winChance * 100));

  const mutation = useMutation({
    mutationFn: async (val: number) => {
      const res = await fetch(api.games.settings.update.path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameType: setting.gameType, winChance: val }),
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.games.settings.get.path] });
      toast({ title: "Settings Updated", description: `Win chance for ${setting.gameType} set successfully.` });
    },
  });

  const increment = () => setPct(p => Math.min(100, p + 1));
  const decrement = () => setPct(p => Math.max(0, p - 1));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="capitalize">{setting.gameType} Settings</CardTitle>
        <CardDescription>Adjust the house edge by setting player win probability.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium">Win Probability</label>
          <div className="flex items-center gap-2 mt-2">
            <Button size="icon" variant="outline" onClick={decrement} disabled={pct <= 0 || mutation.isPending} data-testid={`button-decrease-${setting.gameType}`}>
              <ChevronDown className="h-4 w-4" />
            </Button>
            <div className="flex-1 text-center py-2 rounded-md border font-mono text-lg font-bold" data-testid={`display-winchance-${setting.gameType}`}>
              {pct}%
            </div>
            <Button size="icon" variant="outline" onClick={increment} disabled={pct >= 100 || mutation.isPending} data-testid={`button-increase-${setting.gameType}`}>
              <ChevronUp className="h-4 w-4" />
            </Button>
          </div>
          <Button className="w-full mt-3" size="sm" onClick={() => mutation.mutate(pct)} disabled={mutation.isPending} data-testid={`button-save-${setting.gameType}`}>
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Win Chance"}
          </Button>
        </div>

      </CardContent>
    </Card>
  );
}

export default function GameControl() {
  const { data: settings, isLoading } = useQuery<GameSetting[]>({
    queryKey: [api.games.settings.get.path],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const activeSettings = settings?.filter(s => ACTIVE_GAMES.includes(s.gameType));
  const coinflipSetting = activeSettings?.find(s => s.gameType === "coinflip");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Settings2 className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold text-primary">Game Control</h1>
      </div>

      {coinflipSetting && <CoinflipMultiplierCard setting={coinflipSetting} />}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {activeSettings?.map((s) => (
          <GameSettingForm key={s.id} setting={s} />
        ))}
      </div>
    </div>
  );
}
