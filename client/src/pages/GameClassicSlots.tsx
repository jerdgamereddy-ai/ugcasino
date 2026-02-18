import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Maximize, Minimize } from "lucide-react";
import type { User } from "@shared/schema";

export default function GameClassicSlots() {
  const [, navigate] = useLocation();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [gameReady, setGameReady] = useState(false);
  const balanceSentRef = useRef(false);

  const { data: user } = useQuery<User>({
    queryKey: ["/api/user"],
  });

  const { data: gameSettings } = useQuery<{ winOccurrence: number }>({
    queryKey: ["/api/games/classic-slots/settings"],
  });

  const betMutation = useMutation({
    mutationFn: async (data: { bet: number; totBet: number }) => {
      const res = await apiRequest("POST", "/api/games/classic-slots/bet", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    },
  });

  const winMutation = useMutation({
    mutationFn: async (data: { winAmount: number }) => {
      const res = await apiRequest("POST", "/api/games/classic-slots/win", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    },
  });

  const sendBalanceToIframe = useCallback(() => {
    if (user && gameSettings && iframeRef.current?.contentWindow && gameReady && !balanceSentRef.current) {
      iframeRef.current.contentWindow.postMessage(
        { type: "init_balance", balance: user.balance, winOccurrence: gameSettings.winOccurrence },
        "*"
      );
      balanceSentRef.current = true;
    }
  }, [user, gameReady, gameSettings]);

  const lastBetRef = useRef(0);

  const handleMessage = useCallback((event: MessageEvent) => {
    if (!event.data || !event.data.type) return;

    switch (event.data.type) {
      case "game_ready":
        setGameReady(true);
        break;
      case "bet_placed":
        lastBetRef.current = event.data.tot_bet;
        betMutation.mutate({ bet: event.data.bet, totBet: event.data.tot_bet });
        break;
      case "save_score":
        if (lastBetRef.current > 0) {
          const serverBalance = user?.balance ?? 0;
          const expectedAfterBet = serverBalance - lastBetRef.current;
          const winAmount = Math.max(0, event.data.money - expectedAfterBet);
          if (winAmount > 0) {
            winMutation.mutate({ winAmount });
          }
          lastBetRef.current = 0;
        }
        break;
      case "game_exit":
        navigate("/");
        break;
    }
  }, [betMutation, winMutation, navigate, user]);

  useEffect(() => {
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [handleMessage]);

  useEffect(() => {
    sendBalanceToIframe();
  }, [sendBalanceToIframe]);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true));
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false));
    }
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  return (
    <div ref={containerRef} className="relative min-h-screen bg-gradient-to-b from-black via-gray-900 to-black">
      <div className="flex items-center justify-between p-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/")}
          className="text-[#D4AF37]"
          data-testid="button-back-lobby"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Lobby
        </Button>
        <div className="flex items-center gap-4">
          <span className="text-[#D4AF37] font-bold text-sm" data-testid="text-balance">
            Balance: {(user?.balance ?? 0).toLocaleString()} UGX
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleFullscreen}
            className="text-[#D4AF37]"
            data-testid="button-fullscreen"
          >
            {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
          </Button>
        </div>
      </div>

      <div className="flex justify-center px-2 pb-4">
        <div className="w-full max-w-[1600px]">
          <iframe
            ref={iframeRef}
            src="/games/classic-slots/index.html"
            className="w-full border-0 rounded-lg"
            style={{ height: "calc(100vh - 80px)", minHeight: "500px" }}
            allow="autoplay; fullscreen"
            data-testid="iframe-classic-slots"
          />
        </div>
      </div>
    </div>
  );
}
