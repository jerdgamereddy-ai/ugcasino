import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { type Broadcast } from "@shared/schema";
import { X, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BroadcastBanner() {
  const { data: broadcasts } = useQuery<Broadcast[]>({
    queryKey: ["/api/broadcasts"],
    refetchInterval: 30000,
  });

  const dismissMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/broadcasts/${id}/dismiss`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to dismiss");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/broadcasts"] });
    },
  });

  if (!broadcasts || broadcasts.length === 0) return null;

  return (
    <div className="space-y-2 mb-4" data-testid="broadcast-banner-container">
      {broadcasts.map((b) => (
        <div
          key={b.id}
          className="flex items-start gap-3 p-3 rounded-md border bg-primary/10 border-primary/30"
          data-testid={`broadcast-item-${b.id}`}
        >
          <Megaphone className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium break-words" data-testid={`broadcast-message-${b.id}`}>{b.message}</p>
            <p className="text-xs text-muted-foreground mt-1">
              From {b.senderRole === 'admin' ? 'Admin' : b.senderRole === 'super_manager' ? 'Super Manager' : 'Manager'}
              {b.createdAt && ` \u00b7 ${new Date(b.createdAt).toLocaleString()}`}
            </p>
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => dismissMutation.mutate(b.id)}
            disabled={dismissMutation.isPending}
            data-testid={`button-dismiss-broadcast-${b.id}`}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  );
}
