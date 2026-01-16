import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { z } from "zod";

export function useSpinSlots() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: z.infer<typeof api.games.slots.spin.input>) => {
      const res = await fetch(api.games.slots.spin.path, {
        method: api.games.slots.spin.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });

      if (!res.ok) {
        if (res.status === 400) {
          const err = api.games.slots.spin.responses[400].parse(await res.json());
          throw new Error(err.message);
        }
        throw new Error("Failed to spin");
      }
      return api.games.slots.spin.responses[200].parse(await res.json());
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [api.auth.me.path] });
    },
  });
}

export function useSpinRoulette() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: z.infer<typeof api.games.roulette.spin.input>) => {
      const res = await fetch(api.games.roulette.spin.path, {
        method: api.games.roulette.spin.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });

      if (!res.ok) {
        if (res.status === 400) {
          const err = api.games.roulette.spin.responses[400].parse(await res.json());
          throw new Error(err.message);
        }
        throw new Error("Failed to spin");
      }
      return api.games.roulette.spin.responses[200].parse(await res.json());
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [api.auth.me.path] });
    },
  });
}
