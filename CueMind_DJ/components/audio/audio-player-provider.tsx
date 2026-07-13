"use client";

import { resolvePlaybackUrl } from "@/lib/audio/resolve-playback-url";
import type { PlayableTrack } from "@/types/audio";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";

type AudioPlayerContextValue = {
  currentTrack: PlayableTrack | null;
  isPlaying: boolean;
  isLoading: boolean;
  currentTime: number;
  duration: number;
  playTrack: (track: PlayableTrack) => Promise<void>;
  togglePlay: () => Promise<void>;
  pause: () => void;
  seek: (ratio: number) => void;
};

const AudioPlayerContext = createContext<AudioPlayerContextValue | null>(null);

export function useAudioPlayer() {
  const ctx = useContext(AudioPlayerContext);
  if (!ctx) {
    throw new Error("useAudioPlayer must be used within AudioPlayerProvider");
  }
  return ctx;
}

type AudioPlayerProviderProps = {
  children: ReactNode;
};

export function AudioPlayerProvider({ children }: AudioPlayerProviderProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentTrack, setCurrentTrack] = useState<PlayableTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onDurationChange = () => {
      if (Number.isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    };
    const onEnded = () => setIsPlaying(false);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("durationchange", onDurationChange);
    audio.addEventListener("loadedmetadata", onDurationChange);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("durationchange", onDurationChange);
      audio.removeEventListener("loadedmetadata", onDurationChange);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
    };
  }, []);

  const pause = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    }
    setCurrentTrack(null);
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);
  }, []);

  const togglePlay = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;

    if (isPlaying) {
      audio.pause();
      return;
    }

    try {
      await audio.play();
    } catch {
      toast.error("Lecture impossible");
    }
  }, [currentTrack, isPlaying]);

  const playTrack = useCallback(
    async (track: PlayableTrack) => {
      const audio = audioRef.current;
      if (!audio) return;

      if (currentTrack?.id === track.id) {
        await togglePlay();
        return;
      }

      setIsLoading(true);
      setCurrentTime(0);
      setDuration(track.duration_seconds ?? 0);

      try {
        const url = await resolvePlaybackUrl(track);
        setCurrentTrack(track);
        audio.src = url;
        await audio.play();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Erreur de lecture";
        toast.error(message);
        setCurrentTrack(null);
      } finally {
        setIsLoading(false);
      }
    },
    [currentTrack?.id, togglePlay]
  );

  const seek = useCallback((ratio: number) => {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(audio.duration)) return;
    audio.currentTime = Math.max(0, Math.min(1, ratio)) * audio.duration;
  }, []);

  return (
    <AudioPlayerContext.Provider
      value={{
        currentTrack,
        isPlaying,
        isLoading,
        currentTime,
        duration,
        playTrack,
        togglePlay,
        pause,
        seek,
      }}
    >
      {children}
      <audio ref={audioRef} preload="metadata" className="hidden" />
    </AudioPlayerContext.Provider>
  );
}
