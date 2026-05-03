import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Maximize, Minimize, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@shared/schema";

interface HorseJsSettings {
  winOccurrence: number;
  maxLaps: number;
  odds: number[];
  placeOdds?: number[];
  showOdds?: number[];
}

export default function GameHorseJS() {
  const [, navigate] = useLocation();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [gameReady, setGameReady] = useState(false);
  const balanceSentRef = useRef(false);
  const { toast } = useToast();

  const { data: user } = useQuery<User>({ queryKey: ["/api/user"] });

  const { data: gameSettings } = useQuery<HorseJsSettings>({
    queryKey: ["/api/games/horse-js/settings"],
  });

  const postBetBalanceRef = useRef<number | null>(null);
  const lastBetRef = useRef(0);
  const roundIdRef = useRef<string | null>(null);
  // If win_result arrives before /bet responds, stash the winAmount here so
  // betMutation.onSuccess can settle it (instead of relying on a 5s poll
  // that occasionally drops wins under DB load).
  const pendingWinAmountRef = useRef<number | null>(null);

  const settleWin = useCallback((winAmount: number) => {
    if (!roundIdRef.current) return;
    if (winAmount > 0) winMutation.mutate({ winAmount, roundId: roundIdRef.current });
    lastBetRef.current = 0;
    roundIdRef.current = null;
    pendingWinAmountRef.current = null;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const betMutation = useMutation({
    mutationFn: async (data: { bet: number; totBet: number }) => {
      const res = await apiRequest("POST", "/api/games/horse-js/bet", data);
      return res.json();
    },
    onSuccess: (data: { balance: number; forceLose?: boolean; roundId?: string }) => {
      postBetBalanceRef.current = data.balance;
      roundIdRef.current = data.roundId ?? null;
      iframeRef.current?.contentWindow?.postMessage(
        { type: "set_force_lose", forceLose: !!data.forceLose },
        "*"
      );
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      if (pendingWinAmountRef.current !== null) {
        settleWin(pendingWinAmountRef.current);
      }
    },
    onError: async (err: Error) => {
      lastBetRef.current = 0;
      postBetBalanceRef.current = null;
      pendingWinAmountRef.current = null;
      const bankrollBlocked = /bankroll/i.test(err.message);
      await queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      const fresh = await queryClient.fetchQuery<User>({ queryKey: ["/api/user"] });
      if (fresh) {
        iframeRef.current?.contentWindow?.postMessage({ type: "sync_balance", balance: fresh.balance }, "*");
      }
      toast({
        title: bankrollBlocked ? "Bet too large" : "Bet failed",
        description: bankrollBlocked
          ? "Maximum possible payout exceeds the house bankroll. Please lower your bet and try again."
          : "Your bet could not be placed. Please try again.",
        variant: "destructive",
      });
    },
  });

  const winMutation = useMutation({
    mutationFn: async (data: { winAmount: number; roundId: string | null }) => {
      const res = await apiRequest("POST", "/api/games/horse-js/win", data);
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

  const sendBalanceToIframe = useCallback(() => {
    if (user && gameSettings && iframeRef.current?.contentWindow && gameReady && !balanceSentRef.current) {
      iframeRef.current.contentWindow.postMessage({
        type: "init_balance",
        balance: user.balance,
        winOccurrence: gameSettings.winOccurrence,
        maxLaps: gameSettings.maxLaps,
        odds: gameSettings.odds,
        placeOdds: gameSettings.placeOdds,
        showOdds: gameSettings.showOdds,
      }, "*");
      balanceSentRef.current = true;
    }
  }, [user, gameReady, gameSettings]);

  const handleMessage = useCallback((event: MessageEvent) => {
    if (!event.data || !event.data.type) return;
    switch (event.data.type) {
      case "game_ready":
        setGameReady(true);
        break;
      case "bet_placed":
        lastBetRef.current = event.data.tot_bet;
        postBetBalanceRef.current = null;
        betMutation.mutate({ bet: event.data.bet, totBet: event.data.tot_bet });
        break;
      case "win_result":
        if (lastBetRef.current > 0 && event.data.winAmount > 0) {
          const winAmount = event.data.winAmount;
          if (roundIdRef.current) {
            settleWin(winAmount);
          } else {
            // /bet still in flight — queue the win for betMutation.onSuccess
            // so it cannot be lost.
            pendingWinAmountRef.current = winAmount;
          }
        } else if (lastBetRef.current > 0) {
          lastBetRef.current = 0;
          roundIdRef.current = null;
          pendingWinAmountRef.current = null;
        }
        break;
      case "save_score":
        break;
      case "game_exit":
        navigate("/");
        break;
    }
  }, [betMutation, winMutation, navigate, settleWin]);

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

  useEffect(() => { if (document.fullscreenElement) setIsFullscreen(true); }, []);

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
        src="/games/horse-js/index.html"
        className="w-full border-0"
        style={{ height: isFullscreen ? "100vh" : "calc(100vh - 56px)", display: "block" }}
        allow="autoplay; fullscreen"
        data-testid="iframe-horse-js"
      />
    </div>
  );
}
