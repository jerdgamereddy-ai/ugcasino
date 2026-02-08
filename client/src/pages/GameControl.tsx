import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { type GameSetting } from "@shared/schema";
import { api } from "@shared/routes";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Settings2 } from "lucide-react";

function GameSettingForm({ setting }: { setting: GameSetting }) {
  const { toast } = useToast();
  const [winValue, setWinValue] = useState(String(Math.round(setting.winChance * 100)));

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

  const handleSave = () => {
    const num = Number(winValue);
    if (isNaN(num) || num < 0 || num > 100) {
      toast({ title: "Invalid value", description: "Enter a number between 0 and 100", variant: "destructive" });
      return;
    }
    mutation.mutate(num);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="capitalize">{setting.gameType} Settings</CardTitle>
        <CardDescription>Adjust the house edge by setting player win probability.</CardDescription>
      </CardHeader>
      <CardContent>
        <label className="text-sm font-medium">Win Probability</label>
        <div className="flex gap-2 items-center mt-1">
          <div className="relative flex-1">
            <input
              type="number"
              step="1"
              min={0}
              max={100}
              value={winValue}
              onChange={e => setWinValue(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 pr-8 py-1 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
              data-testid={`input-winchance-${setting.gameType}`}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono text-sm">%</span>
          </div>
          <Button onClick={handleSave} disabled={mutation.isPending}>
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
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
