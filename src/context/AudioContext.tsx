import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
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
  audioError: string | null;
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
  retryTrack: () => void;
  clearError: () => void;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTrack, setCurrentTrack] = useState<ActiveTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [volume, setVolume] = useState<number>(0.9);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [audioError, setAudioError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const clearError = useCallback(() => {
    setAudioError(null);
  }, []);

  const skip = useCallback((seconds: number) => {
    if (!audioRef.current) return;
    const audio = audioRef.current;
    const dur = audio.duration || duration || 0;
    const newTime = Math.min(Math.max(audio.currentTime + seconds, 0), dur || 9999);
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  }, [duration]);

  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'metadata';
    audioRef.current = audio;

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const onLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration)) {
        setDuration(audio.duration);
      }
      setIsLoading(false);
      setAudioError(null);
    };

    const onCanPlay = () => {
      setIsLoading(false);
    };

    const onWaiting = () => {
      setIsLoading(true);
    };

    const onPlaying = () => {
      setIsLoading(false);
      setIsPlaying(true);
      setAudioError(null);
    };

    const onPause = () => {
      setIsPlaying(false);
    };

    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const onError = () => {
      setIsLoading(false);
      setIsPlaying(false);
      const code = audio.error?.code;
      let msg = 'تعذر تشغيل الملف الصوتي. يرجى التحقق من الاتصال بالإنترنت.';
      if (code === 1) msg = 'تم إلغاء تحميل الملف الصوتي.';
      else if (code === 2) msg = 'حدث خطأ في شبكة الاتصال أثناء تحميل الصوت.';
      else if (code === 3) msg = 'تعذر فك تشفير الملف الصوتي أو تنسيق غير مدعوم.';
      else if (code === 4) msg = 'الملف الصوتي غير متاح أو تعذر الوصول إلى الرابط.';
      setAudioError(msg);
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('canplay', onCanPlay);
    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('playing', onPlaying);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);

    return () => {
      audio.pause();
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('canplay', onCanPlay);
      audio.removeEventListener('waiting', onWaiting);
      audio.removeEventListener('playing', onPlaying);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
    };
  }, []);

  const updateMediaSession = (track: ActiveTrack) => {
    if (typeof window !== 'undefined' && 'mediaSession' in navigator) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: track.title,
          artist: "أبو سعيد مسعود ابن بيضاء",
          album: track.series || "الشروح الصوتية",
        });

        navigator.mediaSession.setActionHandler('play', () => {
          if (audioRef.current) {
            audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
          }
        });

        navigator.mediaSession.setActionHandler('pause', () => {
          if (audioRef.current) {
            audioRef.current.pause();
            setIsPlaying(false);
          }
        });

        navigator.mediaSession.setActionHandler('seekbackward', () => skip(-15));
        navigator.mediaSession.setActionHandler('seekforward', () => skip(15));
      } catch (e) {
        console.debug('MediaSession setup:', e);
      }
    }
  };

  const playTrack = (track: ActiveTrack) => {
    if (!audioRef.current) return;
    const audio = audioRef.current;

    setAudioError(null);

    // If same track is already loaded
    if (currentTrack?.id === track.id) {
      if (audio.paused) {
        audio.play().then(() => {
          setIsPlaying(true);
        }).catch(err => {
          console.warn('Playback resume failed:', err);
          setAudioError('اضغط زر التشغيل للبدء (سياسة المتصفح تطلب تفاعلاً)');
        });
      } else {
        audio.pause();
        setIsPlaying(false);
      }
      return;
    }

    setCurrentTrack(track);
    setIsLoading(true);
    setCurrentTime(0);

    audio.src = track.audioUrl;
    audio.playbackRate = playbackRate;
    audio.volume = isMuted ? 0 : volume;

    updateMediaSession(track);

    audio.play().then(() => {
      setIsPlaying(true);
      setIsLoading(false);
      setAudioError(null);
    }).catch(err => {
      console.warn('Audio playback start warning:', err);
      setIsLoading(false);
      setIsPlaying(false);
      setAudioError('يرجى النقر على زر التشغيل لبدء الاستماع');
    });
  };

  const togglePlay = () => {
    if (!audioRef.current || !currentTrack) return;
    setAudioError(null);
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      setIsLoading(true);
      audioRef.current.play().then(() => {
        setIsPlaying(true);
        setIsLoading(false);
      }).catch(err => {
        setIsLoading(false);
        setIsPlaying(false);
        setAudioError('تعذر التشغيل، يرجى المحاولة مرة أخرى');
      });
    }
  };

  const retryTrack = () => {
    if (!audioRef.current || !currentTrack) return;
    setAudioError(null);
    setIsLoading(true);
    const audio = audioRef.current;
    audio.src = currentTrack.audioUrl;
    audio.load();
    audio.play().then(() => {
      setIsPlaying(true);
      setIsLoading(false);
    }).catch(err => {
      setIsLoading(false);
      setIsPlaying(false);
      setAudioError('تعذر الاتصال بالخادم، يرجى المحاولة لاحقاً');
    });
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
      audioRef.current.src = '';
    }
    setIsPlaying(false);
    setCurrentTrack(null);
    setCurrentTime(0);
    setAudioError(null);
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
        audioError,
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
        retryTrack,
        clearError,
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
