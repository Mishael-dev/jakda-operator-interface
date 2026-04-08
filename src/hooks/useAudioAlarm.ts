import { useEffect, useRef, useCallback } from "react";

const ALARM_SOUND_PATH = "/assets/alarm-sound.mp3";

export function useAudioAlarm(shouldPlay: boolean) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio(ALARM_SOUND_PATH);
    audio.loop = true;
    audio.volume = 0.5;
    audioRef.current = audio;

    return () => {
      audio.pause();
      audio.currentTime = 0;
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (shouldPlay) {
      audio.play().catch((err) => {
        console.warn("Audio play blocked (needs user interaction first):", err);
      });
    } else {
      audio.pause();
      audio.currentTime = 0;
    }
  }, [shouldPlay]);

  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
  }, []);

  const play = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.play().catch((err) => {
        console.warn("Audio play blocked:", err);
      });
    }
  }, []);

  return { stop, play };
}
