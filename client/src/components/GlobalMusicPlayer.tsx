import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Volume2, VolumeX, Music, ChevronDown, ChevronUp, SkipBack, SkipForward, Play, Pause } from "lucide-react";
import type { AudioTrack } from "@shared/schema";

export default function GlobalMusicPlayer() {
  const audioRef       = useRef<HTMLAudioElement | null>(null);
  const trackListRef   = useRef<AudioTrack[]>([]);
  const currentIdxRef  = useRef<number>(-1);
  const mutedRef       = useRef<boolean>(localStorage.getItem("bgm_muted") === "true");

  const [muted, setMuted]         = useState(mutedRef.current);
  const [playing, setPlaying]     = useState(false);
  const [currentIdx, setCurrentIdx] = useState<number>(-1);
  const [collapsed, setCollapsed] = useState(true);
  const [started, setStarted]     = useState(false);

  const { data: tracks = [] } = useQuery<AudioTrack[]>({
    queryKey: ["/api/audio"],
    staleTime: 60000,
  });

  useEffect(() => {
    trackListRef.current = tracks;
  }, [tracks]);

  const pickRandom = useCallback((exclude: number, total: number) => {
    if (total === 0) return -1;
    if (total === 1) return 0;
    let idx: number;
    do { idx = Math.floor(Math.random() * total); } while (idx === exclude);
    return idx;
  }, []);

  const playTrack = useCallback((idx: number) => {
    const audio  = audioRef.current;
    const list   = trackListRef.current;
    if (!audio || idx < 0 || idx >= list.length) return;
    const track = list[idx];
    const url = `/uploads/audio/${track.filename}`;
    if (audio.src.endsWith(url) || audio.currentSrc.endsWith(url)) {
      try { audio.currentTime = 0; } catch {}
    } else {
      audio.src = url;
    }
    audio.volume = 0.35;
    audio.muted  = mutedRef.current;
    audio.play()
      .then(() => {
        currentIdxRef.current = idx;
        setCurrentIdx(idx);
        setPlaying(true);
      })
      .catch(() => setPlaying(false));
  }, []);

  const playNext = useCallback(() => {
    const list = trackListRef.current;
    if (list.length === 0) return;
    if (list.length === 1) { playTrack(0); return; }
    const next = pickRandom(currentIdxRef.current, list.length);
    playTrack(next);
  }, [pickRandom, playTrack]);

  const playPrev = useCallback(() => {
    const list = trackListRef.current;
    if (list.length === 0) return;
    if (list.length === 1) { playTrack(0); return; }
    const prev = pickRandom(currentIdxRef.current, list.length);
    playTrack(prev);
  }, [pickRandom, playTrack]);

  const togglePlayPause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      if (currentIdxRef.current < 0 && trackListRef.current.length > 0) {
        playTrack(Math.floor(Math.random() * trackListRef.current.length));
      } else {
        audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
      }
    }
  }, [playing, playTrack]);

  useEffect(() => {
    const el = new Audio();
    el.preload = "auto";
    audioRef.current = el;

    const onEnded = () => {
      const list = trackListRef.current;
      if (list.length === 0) { setPlaying(false); return; }
      if (list.length === 1) {
        // Loop single track
        try { el.currentTime = 0; } catch {}
        el.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
        return;
      }
      const next = pickRandom(currentIdxRef.current, list.length);
      if (next >= 0) playTrack(next);
      else setPlaying(false);
    };
    const onError = () => {
      const list = trackListRef.current;
      if (list.length === 0) return;
      const next = list.length === 1 ? 0 : pickRandom(currentIdxRef.current, list.length);
      setTimeout(() => playTrack(next), 1500);
    };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);

    el.addEventListener("ended", onEnded);
    el.addEventListener("error", onError);
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);

    return () => {
      el.removeEventListener("ended", onEnded);
      el.removeEventListener("error", onError);
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
      el.pause();
      audioRef.current = null;
    };
  }, [pickRandom, playTrack]);

  useEffect(() => {
    if (!started && tracks.length > 0) {
      setStarted(true);
      const idx = Math.floor(Math.random() * tracks.length);
      playTrack(idx);
    }
  }, [tracks, started, playTrack]);

  const toggleMute = useCallback(() => {
    const next = !mutedRef.current;
    mutedRef.current = next;
    setMuted(next);
    localStorage.setItem("bgm_muted", String(next));
    if (audioRef.current) audioRef.current.muted = next;
    if (!next && !playing && tracks.length > 0) {
      const idx = currentIdxRef.current >= 0
        ? currentIdxRef.current
        : Math.floor(Math.random() * tracks.length);
      playTrack(idx);
    }
  }, [playing, tracks, playTrack]);

  if (tracks.length === 0) return null;

  const currentTrack = currentIdx >= 0 && currentIdx < tracks.length ? tracks[currentIdx] : null;
  const displayName  = currentTrack
    ? currentTrack.originalName.replace(/\.[^.]+$/, "")
    : "Loading…";

  return (
    <div
      className="fixed bottom-4 right-4 z-[9999] flex flex-col items-end gap-1"
      data-testid="global-music-player"
    >
      {!collapsed && (
        <div
          className="bg-black/90 border border-[#D4AF37]/30 rounded-xl px-3 py-2 text-xs text-white/80 max-w-[260px] text-right shadow-lg"
          data-testid="music-track-name"
        >
          <div className="text-[#D4AF37] font-semibold mb-1 truncate" title={displayName}>
            {displayName}
          </div>
          <div className="text-white/50 text-[10px] mb-2">
            {playing && !muted ? "▶ Playing" : muted ? "🔇 Muted" : "⏸ Paused"} · {tracks.length} track{tracks.length === 1 ? "" : "s"}
          </div>
          <div className="flex items-center justify-end gap-1">
            <button
              onClick={playPrev}
              className="bg-black/60 border border-[#D4AF37]/30 rounded-full p-1.5 text-[#D4AF37] hover:bg-[#D4AF37]/20 transition-colors"
              data-testid="button-music-prev"
              title="Previous track"
            >
              <SkipBack className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={togglePlayPause}
              className="bg-black/60 border border-[#D4AF37]/30 rounded-full p-1.5 text-[#D4AF37] hover:bg-[#D4AF37]/20 transition-colors"
              data-testid="button-music-playpause"
              title={playing ? "Pause" : "Play"}
            >
              {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={playNext}
              className="bg-black/60 border border-[#D4AF37]/30 rounded-full p-1.5 text-[#D4AF37] hover:bg-[#D4AF37]/20 transition-colors"
              data-testid="button-music-next"
              title="Next track"
            >
              <SkipForward className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-1">
        <button
          onClick={() => setCollapsed(c => !c)}
          className="bg-black/80 border border-[#D4AF37]/30 rounded-full p-1.5 text-[#D4AF37] hover:bg-[#D4AF37]/20 transition-colors"
          data-testid="button-music-expand"
          title={collapsed ? "Show controls" : "Hide controls"}
        >
          {collapsed ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>

        <button
          onClick={toggleMute}
          className="bg-black/80 border border-[#D4AF37]/40 rounded-full p-2 text-[#D4AF37] hover:bg-[#D4AF37]/20 transition-colors shadow-lg"
          data-testid="button-music-mute"
          title={muted ? "Unmute background music" : "Mute background music"}
        >
          {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>

        <div
          className="bg-black/80 border border-[#D4AF37]/30 rounded-full p-2"
          data-testid="music-icon"
        >
          <Music
            className={`w-4 h-4 transition-colors ${playing && !muted ? "text-[#D4AF37] animate-pulse" : "text-white/40"}`}
          />
        </div>
      </div>
    </div>
  );
}
