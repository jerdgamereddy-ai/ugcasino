import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { type GameSetting } from "@shared/schema";
import { api } from "@shared/routes";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Settings2, ChevronUp, ChevronDown } from "lucide-react";

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
      <CardContent>
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
          {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
        </Button>
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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Settings2 className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold text-primary">Game Control</h1>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {settings?.map((s) => (
          <GameSettingForm key={s.id} setting={s} />
        ))}
      </div>
    </div>
  );
}
