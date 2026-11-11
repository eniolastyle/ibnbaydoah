import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { AudienceLevelId } from '../types';

export interface ActiveTrack {
  id: string;
  title: string;
  series: string;
  category?: string;
  level?: string;
  levelId?: AudienceLevelId;
  audioUrl: string;
  duration?: string;
}

interface AudioContextType {
  currentTrack: ActiveTrack | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  volume: number;
  isMuted: boolean;
  isLoading: boolean;
  playTrack: (track: ActiveTrack) => void;
  togglePlay: () => void;
  pause: () => void;
  resume: () => void;
  seek: (time: number) => void;
  skip: (seconds: number) => void;
  setRate: (rate: number) => void;
  setAudioVolume: (volume: number) => void;
  toggleMute: () => void;
  closePlayer: () => void;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTrack, setCurrentTrack] = useState<ActiveTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [volume, setVolume] = useState<number>(0.85);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const onLoadedMetadata = () => {
      setDuration(audio.duration || 0);
      setIsLoading(false);
    };

    const onWaiting = () => setIsLoading(true);
    const onPlaying = () => {
      setIsLoading(false);
      setIsPlaying(true);
    };
    const onPause = () => setIsPlaying(false);
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('playing', onPlaying);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.pause();
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('waiting', onWaiting);
      audio.removeEventListener('playing', onPlaying);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
    };
  }, []);

  const playTrack = (track: ActiveTrack) => {
    if (!audioRef.current) return;
    const audio = audioRef.current;

    // If same track is already loaded
    if (currentTrack?.id === track.id) {
      if (audio.paused) {
        audio.play().catch(console.error);
        setIsPlaying(true);
      } else {
        audio.pause();
        setIsPlaying(false);
      }
      return;
    }

    setCurrentTrack(track);
    setIsLoading(true);
    audio.src = track.audioUrl;
    audio.playbackRate = playbackRate;
    audio.volume = isMuted ? 0 : volume;
    audio.play().then(() => {
      setIsPlaying(true);
      setIsLoading(false);
    }).catch(err => {
      console.warn('Audio playback error (could be blocked by browser policy until user interacts):', err);
      setIsLoading(false);
      setIsPlaying(false);
    });
  };

  const togglePlay = () => {
    if (!audioRef.current || !currentTrack) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(console.error);
    }
  };

  const pause = () => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    setIsPlaying(false);
  };

  const resume = () => {
    if (!audioRef.current || !currentTrack) return;
    audioRef.current.play().then(() => setIsPlaying(true)).catch(console.error);
  };

  const seek = (time: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = time;
    setCurrentTime(time);
  };

  const skip = (seconds: number) => {
    if (!audioRef.current) return;
    const target = Math.min(Math.max(audioRef.current.currentTime + seconds, 0), duration || audioRef.current.duration || 9999);
    audioRef.current.currentTime = target;
    setCurrentTime(target);
  };

  const setRate = (rate: number) => {
    if (!audioRef.current) return;
    audioRef.current.playbackRate = rate;
    setPlaybackRate(rate);
  };

  const setAudioVolume = (vol: number) => {
    if (!audioRef.current) return;
    const clamped = Math.max(0, Math.min(1, vol));
    audioRef.current.volume = isMuted ? 0 : clamped;
    setVolume(clamped);
    if (clamped > 0 && isMuted) {
      setIsMuted(false);
    }
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    if (isMuted) {
      audioRef.current.volume = volume;
      setIsMuted(false);
    } else {
      audioRef.current.volume = 0;
      setIsMuted(true);
    }
  };

  const closePlayer = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsPlaying(false);
    setCurrentTrack(null);
    setCurrentTime(0);
  };

  return (
    <AudioContext.Provider
      value={{
        currentTrack,
        isPlaying,
        currentTime,
        duration,
        playbackRate,
        volume,
        isMuted,
        isLoading,
        playTrack,
        togglePlay,
        pause,
        resume,
        seek,
        skip,
        setRate,
        setAudioVolume,
        toggleMute,
        closePlayer,
      }}
    >
      {children}
    </AudioContext.Provider>
  );
};

export const useAudio = () => {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
};
