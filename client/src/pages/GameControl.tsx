import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { updateGameSettingsSchema, type GameSetting } from "@shared/schema";
import { api, buildUrl } from "@shared/routes";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Settings2 } from "lucide-react";
import { z } from "zod";

type FormData = z.infer<typeof updateGameSettingsSchema>;

function GameSettingForm({ setting }: { setting: GameSetting }) {
  const { toast } = useToast();
  const form = useForm<FormData>({
    resolver: zodResolver(updateGameSettingsSchema),
    defaultValues: {
      gameType: setting.gameType,
      winChance: setting.winChance * 100,
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const res = await fetch(api.games.settings.update.path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.games.settings.get.path] });
      toast({ title: "Settings Updated", description: `Win chance for ${setting.gameType} set successfully.` });
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="capitalize">{setting.gameType} Settings</CardTitle>
        <CardDescription>Adjust the house edge by setting player win probability.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
            <FormField
              control={form.control}
              name="winChance"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Win Probability (%)</FormLabel>
                  <FormControl>
                    <div className="flex gap-2 items-center">
                      <div className="relative flex-1">
                        <Input type="number" step="1" min={0} max={100} {...field} onChange={e => field.onChange(Number(e.target.value))} className="pr-8" />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono text-sm">%</span>
                      </div>
                      <Button type="submit" disabled={mutation.isPending}>
                        {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
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
