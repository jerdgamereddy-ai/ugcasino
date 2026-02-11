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
    <div className="space-y-1 mb-3" data-testid="broadcast-banner-container">
      {broadcasts.map((b) => {
        const font = b.fontFamily || "sans-serif";
        const textColor = b.color || "#FFD700";
        const repeatedText = `${b.message}`;
        
        return (
          <div
            key={b.id}
            className="relative flex items-center rounded-md overflow-hidden"
            style={{
              background: "linear-gradient(90deg, rgba(0,0,0,0.9) 0%, rgba(20,10,0,0.95) 50%, rgba(0,0,0,0.9) 100%)",
              border: `1px solid ${textColor}33`,
            }}
            data-testid={`broadcast-item-${b.id}`}
          >
            <div className="flex-shrink-0 px-2 py-1.5 flex items-center gap-1.5 z-10 bg-black/80" style={{ borderRight: `1px solid ${textColor}33` }}>
              <Megaphone className="h-3.5 w-3.5" style={{ color: textColor }} />
              <span className="text-[10px] uppercase font-bold tracking-wider" style={{ color: textColor }}>
                {b.senderRole === 'admin' ? 'Admin' : b.senderRole === 'super_manager' ? 'SM' : 'MGR'}
              </span>
            </div>

            <div className="flex-1 overflow-hidden py-1.5">
              <div
                className="marquee-scroll whitespace-nowrap"
                style={{
                  fontFamily: font,
                  color: textColor,
                  fontSize: "0.875rem",
                  fontWeight: "bold",
                  textShadow: `0 0 8px ${textColor}66, 0 0 16px ${textColor}33`,
                  animationDuration: `${b.scrollSpeed || 15}s`,
                }}
              >
                <span className="marquee-text">
                  {repeatedText}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{repeatedText}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{repeatedText}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                </span>
              </div>
            </div>

            <div className="flex-shrink-0 z-10 bg-black/80 px-1" style={{ borderLeft: `1px solid ${textColor}33` }}>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => dismissMutation.mutate(b.id)}
                disabled={dismissMutation.isPending}
                data-testid={`button-dismiss-broadcast-${b.id}`}
                className=""
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
