import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Maximize, Minimize } from "lucide-react";
import type { User } from "@shared/schema";

const COIN_SCALE = 500;

export default function GameFishJoy() {
  const [, navigate] = useLocation();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [gameReady, setGameReady] = useState(false);
  const balanceSentRef = useRef(false);

  const { data: user } = useQuery<User>({ queryKey: ["/api/user"] });

  const betMutation = useMutation({
    mutationFn: async (data: { bet: number }) => {
      const res = await apiRequest("POST", "/api/games/fishjoy/bet", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    },
  });

  const winMutation = useMutation({
    mutationFn: async (data: { winAmount: number }) => {
      const res = await apiRequest("POST", "/api/games/fishjoy/win", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    },
  });

  const sendBalanceToIframe = useCallback(() => {
    if (user && iframeRef.current?.contentWindow && gameReady && !balanceSentRef.current) {
      const gameCoins = Math.floor(user.balance / COIN_SCALE);
      iframeRef.current.contentWindow.postMessage({
        type: "init_balance",
        balance: gameCoins,
      }, "*");
      balanceSentRef.current = true;
    }
  }, [user, gameReady]);

  const handleMessage = useCallback((event: MessageEvent) => {
    if (!event.data || !event.data.type) return;
    switch (event.data.type) {
      case "game_ready":
        setGameReady(true);
        break;
      case "bet_placed":
        betMutation.mutate({ bet: event.data.bet * COIN_SCALE });
        break;
      case "win_result":
        if (event.data.winAmount > 0) {
          winMutation.mutate({ winAmount: event.data.winAmount * COIN_SCALE });
        }
        break;
      case "game_exit":
        navigate("/");
        break;
    }
  }, [betMutation, winMutation, navigate]);

  useEffect(() => {
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [handleMessage]);

  useEffect(() => { sendBalanceToIframe(); }, [sendBalanceToIframe]);

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
    <div ref={containerRef} className="relative min-h-screen bg-gradient-to-b from-blue-950 via-blue-900 to-cyan-900">
      <div className="flex items-center justify-between p-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="text-[#D4AF37]" data-testid="button-back-lobby">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Lobby
        </Button>
        <div className="flex items-center gap-4">
          <span className="text-[#D4AF37] font-bold text-sm" data-testid="text-balance">
            Balance: {(user?.balance ?? 0).toLocaleString()} UGX
          </span>
          <Button variant="ghost" size="icon" onClick={toggleFullscreen} className="text-[#D4AF37]" data-testid="button-fullscreen">
            {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
          </Button>
        </div>
      </div>
      <div className="flex justify-center px-2 pb-4">
        <div className="w-full max-w-[1600px]">
          <iframe
            ref={iframeRef}
            src="/games/fish-joy/index.html"
            className="w-full border-0 rounded-lg"
            style={{ height: "calc(100vh - 80px)", minHeight: "500px" }}
            allow="autoplay; fullscreen"
            data-testid="iframe-fish-joy"
          />
        </div>
      </div>
    </div>
  );
}
