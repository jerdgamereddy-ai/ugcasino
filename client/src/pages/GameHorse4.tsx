import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Maximize, Minimize, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@shared/schema";

export default function GameHorse4() {
  const [, navigate] = useLocation();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const balanceSentRef = useRef(false);
  const iframeLoadedRef = useRef(false);
  const { toast } = useToast();

  const { data: user } = useQuery<User>({ queryKey: ["/api/user"] });
  const { data: gameSettings } = useQuery<{ winOccurrence: number; odds?: number[]; placeOdds?: number[]; showOdds?: number[] }>({
    queryKey: ["/api/games/horse4/settings"],
  });

  const postBetBalanceRef = useRef<number | null>(null);
  const lastBetRef = useRef(0);
  const roundIdRef = useRef<string | null>(null);
  // Holds the iframe's end-of-race money if `save_score` arrives BEFORE the
  // /bet response. The bet's onSuccess will drain it. Without this, slow bet
  // responses (e.g. universal-house-edge DB checks under load) caused wins to
  // be silently dropped after a 5s polling timeout.
  const pendingWinIframeMoneyRef = useRef<number | null>(null);

  const settleWin = useCallback((iframeMoney: number) => {
    if (postBetBalanceRef.current === null || !roundIdRef.current) return;
    const winAmount = Math.max(0, iframeMoney - postBetBalanceRef.current);
    if (winAmount > 0) winMutation.mutate({ winAmount, roundId: roundIdRef.current });
    lastBetRef.current = 0;
    postBetBalanceRef.current = null;
    roundIdRef.current = null;
    pendingWinIframeMoneyRef.current = null;
  // winMutation defined below; safe to reference via closure on call.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const betMutation = useMutation({
    mutationFn: async (data: { bet: number; totBet: number }) => {
      const res = await apiRequest("POST", "/api/games/horse4/bet", data);
      return res.json();
    },
    onSuccess: (data: { balance: number; forceLose?: boolean; roundId?: string }) => {
      postBetBalanceRef.current = data.balance;
      roundIdRef.current = data.roundId ?? null;
      iframeRef.current?.contentWindow?.postMessage(
        { type: "set_win_chance", winOccurrence: data.forceLose ? 0 : (gameSettings?.winOccurrence ?? 40) },
        "*"
      );
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      // Drain a save_score that arrived while /bet was still in flight.
      if (pendingWinIframeMoneyRef.current !== null) {
        settleWin(pendingWinIframeMoneyRef.current);
      }
    },
    onError: () => {
      lastBetRef.current = 0;
      postBetBalanceRef.current = null;
      pendingWinIframeMoneyRef.current = null;
    },
  });

  const winMutation = useMutation({
    mutationFn: async (data: { winAmount: number; roundId: string | null }) => {
      const res = await apiRequest("POST", "/api/games/horse4/win", data);
      return res.json();
    },
    onSuccess: (data: { balance: number; blocked?: boolean }) => {
      if (data.blocked) {
        iframeRef.current?.contentWindow?.postMessage(
          { type: "sync_balance", balance: data.balance },
          "*"
        );
        toast({
          title: "Round result voided",
          description: "Your balance has been refreshed to the live server amount.",
          variant: "destructive",
        });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    },
  });

  const trySendBalance = useCallback(() => {
    if (balanceSentRef.current || !iframeLoadedRef.current) return;
    if (!user || !gameSettings || !iframeRef.current?.contentWindow) return;
    iframeRef.current.contentWindow.postMessage(
      { type: "init_balance", balance: user.balance, winOccurrence: gameSettings.winOccurrence, odds: gameSettings.odds, placeOdds: gameSettings.placeOdds, showOdds: gameSettings.showOdds },
      "*"
    );
    balanceSentRef.current = true;
  }, [user, gameSettings]);

  const handleIframeLoad = useCallback(() => {
    iframeLoadedRef.current = true;
    trySendBalance();
  }, [trySendBalance]);

  useEffect(() => { trySendBalance(); }, [trySendBalance]);

  const handleMessage = useCallback((event: MessageEvent) => {
    if (!event.data || !event.data.type) return;
    switch (event.data.type) {
      case "game_ready":
        iframeLoadedRef.current = true;
        trySendBalance();
        break;
      case "bet_placed":
        lastBetRef.current = event.data.tot_bet;
        postBetBalanceRef.current = null;
        betMutation.mutate({ bet: event.data.bet, totBet: event.data.tot_bet });
        break;
      case "save_score":
        if (lastBetRef.current > 0) {
          const iframeMoney = event.data.money;
          if (postBetBalanceRef.current !== null && roundIdRef.current) {
            // Bet response already back — settle immediately.
            settleWin(iframeMoney);
          } else {
            // /bet still in flight; queue the win so betMutation.onSuccess
            // can settle it once the response (and roundId) arrive.
            pendingWinIframeMoneyRef.current = iframeMoney;
          }
        }
        break;
      case "game_exit":
        navigate("/");
        break;
    }
  }, [betMutation, winMutation, navigate, trySendBalance, settleWin]);

  useEffect(() => {
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [handleMessage]);

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

  useEffect(() => {
    if (document.fullscreenElement) setIsFullscreen(true);
  }, []);

  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    const fresh = await queryClient.fetchQuery<User>({ queryKey: ["/api/user"] });
    if (fresh && iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        { type: "sync_balance", balance: fresh.balance },
        "*"
      );
      toast({ title: "Balance refreshed", description: `${fresh.balance.toLocaleString()} UGX` });
    }
  }, [toast]);

  return (
    <div ref={containerRef} className="relative bg-black" style={{ height: "100vh", overflow: "hidden" }}>
      {!isFullscreen && (
      <div className="flex items-center justify-between p-3" style={{ height: "56px" }}>
        <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="text-[#D4AF37]" data-testid="button-back-lobby">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Lobby
        </Button>
        <div className="flex items-center gap-4">
          <span className="text-[#D4AF37] font-bold text-sm" data-testid="text-balance">
            Balance: {(user?.balance ?? 0).toLocaleString()} UGX
          </span>
          <Button variant="ghost" size="icon" onClick={handleRefresh} className="text-[#D4AF37]" data-testid="button-refresh-balance" title="Refresh balance">
            <RefreshCw className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={toggleFullscreen} className="text-[#D4AF37]" data-testid="button-fullscreen">
            <Maximize className="w-5 h-5" />
          </Button>
        </div>
      </div>
      )}
      {isFullscreen && (
        <Button variant="ghost" size="icon" onClick={toggleFullscreen} className="text-[#D4AF37] absolute top-2 right-2 z-50" style={{ background: "rgba(0,0,0,0.5)" }} data-testid="button-fullscreen-exit">
          <Minimize className="w-5 h-5" />
        </Button>
      )}
      <iframe
        ref={iframeRef}
        src="/games/horse4/index.html"
        className="w-full border-0"
        style={{ height: isFullscreen ? "100vh" : "calc(100vh - 56px)", display: "block" }}
        allow="autoplay; fullscreen"
        onLoad={handleIframeLoad}
        data-testid="iframe-horse4"
      />
    </div>
  );
}
