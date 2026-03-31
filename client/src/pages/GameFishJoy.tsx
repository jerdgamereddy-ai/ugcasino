import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Maximize, Minimize } from "lucide-react";
import type { User } from "@shared/schema";

export default function GameFishJoy() {
  const [, navigate] = useLocation();
  const iframeRef    = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [gameReady,    setGameReady]    = useState(false);
  const initSentRef = useRef(false);

  const { data: user }         = useQuery<User>({ queryKey: ["/api/user"] });
  const { data: fishSettings } = useQuery<{ fishOdds: number[]; winOccurrence?: number }>({
    queryKey: ["/api/games/fishjoy/settings"],
  });

  const betMutation = useMutation({
    mutationFn: async (data: { bet: number }) => {
      const res = await apiRequest("POST", "/api/games/fishjoy/bet", data);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      iframeRef.current?.contentWindow?.postMessage(
        { type: "init_balance", balance: data.balance }, "*"
      );
    },
  });

  const winMutation = useMutation({
    mutationFn: async (data: { winAmount: number }) => {
      const res = await apiRequest("POST", "/api/games/fishjoy/win", data);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      iframeRef.current?.contentWindow?.postMessage(
        { type: "init_balance", balance: data.balance }, "*"
      );
    },
  });

  const sendInitToIframe = useCallback(() => {
    if (!user || !iframeRef.current?.contentWindow || !gameReady || initSentRef.current) return;
    if (!fishSettings) return;
    initSentRef.current = true;
    iframeRef.current.contentWindow.postMessage(
      { type: "init_balance", balance: user.balance }, "*"
    );
    iframeRef.current.contentWindow.postMessage(
      { type: "init_settings", fishOdds: fishSettings.fishOdds, winOccurrence: fishSettings.winOccurrence ?? 45 }, "*"
    );
  }, [user, gameReady, fishSettings]);

  const handleMessage = useCallback((event: MessageEvent) => {
    if (!event.data?.type) return;
    switch (event.data.type) {
      case "ready":
        setGameReady(true);
        break;
      case "bet":
        if (event.data.amount > 0) betMutation.mutate({ bet: event.data.amount });
        break;
      case "win":
        if (event.data.amount > 0) winMutation.mutate({ winAmount: event.data.amount });
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

  useEffect(() => { sendInitToIframe(); }, [sendInitToIframe]);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement)
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true));
    else
      document.exitFullscreen().then(() => setIsFullscreen(false));
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  useEffect(() => { if (document.fullscreenElement) setIsFullscreen(true); }, []);

  return (
    <div ref={containerRef} className="relative bg-black" style={{ height: "100vh", overflow: "hidden" }}>
      {!isFullscreen && (
        <div className="flex items-center justify-between p-3" style={{ height: "56px" }}>
          <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="text-[#D4AF37]" data-testid="button-back-lobby">
            <ArrowLeft className="w-4 h-4 mr-1" /> Lobby
          </Button>
          <div className="flex items-center gap-4">
            <span className="text-[#D4AF37] font-bold text-sm" data-testid="text-balance">
              Balance: {(user?.balance ?? 0).toLocaleString()} UGX
            </span>
            <Button variant="ghost" size="icon" onClick={toggleFullscreen} className="text-[#D4AF37]" data-testid="button-fullscreen">
              <Maximize className="w-5 h-5" />
            </Button>
          </div>
        </div>
      )}
      {isFullscreen && (
        <Button
          variant="ghost" size="icon" onClick={toggleFullscreen}
          className="text-[#D4AF37] absolute top-2 right-2 z-50"
          data-testid="button-fullscreen-exit"
          style={{ background: "rgba(0,0,0,0.5)" }}
        >
          <Minimize className="w-5 h-5" />
        </Button>
      )}
      <iframe
        ref={iframeRef}
        src="/games/fish-new/index.html"
        className="w-full border-0"
        style={{ height: isFullscreen ? "100vh" : "calc(100vh - 56px)", display: "block" }}
        allow="autoplay; fullscreen"
        data-testid="iframe-fish-joy"
      />
    </div>
  );
}
