import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Maximize, Minimize } from "lucide-react";

export function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const updateState = useCallback(() => {
    setIsFullscreen(!!document.fullscreenElement);
  }, []);

  useEffect(() => {
    document.addEventListener("fullscreenchange", updateState);
    return () => document.removeEventListener("fullscreenchange", updateState);
  }, [updateState]);

  const toggle = useCallback(() => {
    if (!containerRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      containerRef.current.requestFullscreen();
    }
  }, []);

  return { isFullscreen, toggle, containerRef };
}

export function FullscreenButton({ isFullscreen, onToggle }: { isFullscreen: boolean; onToggle: () => void }) {
  return (
    <Button
      size="icon"
      variant="ghost"
      onClick={onToggle}
      className="text-white/70"
      data-testid="button-fullscreen-toggle"
    >
      {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
    </Button>
  );
}
