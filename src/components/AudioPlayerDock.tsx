import React, { useState } from 'react';
import { useAudio } from '../context/AudioContext';
import { useLanguage } from '../context/LanguageContext';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  X,
  ChevronUp,
  ChevronDown,
  Download,
  Headphones,
  Radio
} from 'lucide-react';

export const AudioPlayerDock: React.FC = () => {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    playbackRate,
    volume,
    isMuted,
    isLoading,
    togglePlay,
    seek,
    skip,
    setRate,
    setAudioVolume,
    toggleMute,
    closePlayer
  } = useAudio();

  const { lang, t, translateLevel } = useLanguage();
  const [isMinimized, setIsMinimized] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);

  if (!currentTrack) return null;

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    const mm = m < 10 ? `0${m}` : `${m}`;
    const ss = s < 10 ? `0${s}` : `${s}`;
    return `${mm}:${ss}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    seek((val / 100) * duration);
  };

  const speeds = [0.75, 1, 1.25, 1.5, 2];

  const getLevelBadgeClass = (levelId?: string) => {
    switch (levelId) {
      case 'beginner':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'intermediate':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'advanced':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      default:
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    }
  };

  return (
    <div
      className={`fixed left-0 right-0 z-45 transition-all duration-300 ${
        isMinimized ? 'translate-y-[calc(100%-48px)]' : 'translate-y-0'
      } bottom-14 lg:bottom-0`}
    >
      {/* Top Border with Islamic Gold & Emerald Accent */}
      <div className="h-1 bg-gradient-to-r from-[#0F382C] via-[#C5A880] to-[#0F382C]" />

      <div className="bg-[#164E3D] text-[#FDFBF7] shadow-2xl backdrop-blur-md px-3 py-2.5 sm:px-6 sm:py-3">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between gap-4">
            {/* Left: Track Information */}
            <div className="flex items-center gap-3 min-w-0 max-w-[40%] sm:max-w-xs md:max-w-sm">
              <div className="w-10 h-10 rounded-full bg-[#0F382C] border border-[#C5A880]/50 flex items-center justify-center shrink-0 shadow-inner">
                {isPlaying ? (
                  <Radio className="w-5 h-5 text-[#DFC7A5] animate-pulse" />
                ) : (
                  <Headphones className="w-5 h-5 text-[#DFC7A5]" />
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-amiri font-bold text-sm sm:text-base text-[#FDFBF7] truncate">
                    {currentTrack.title}
                  </h4>
                  {currentTrack.level && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded border shrink-0 font-readex ${getLevelBadgeClass(
                        currentTrack.levelId
                      )}`}
                    >
                      {translateLevel(currentTrack.level)}
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#DFC7A5]/80 font-readex truncate">
                  {currentTrack.series}
                </p>
              </div>
            </div>

            {/* Center: Controls & Scrubber */}
            <div className="flex-1 max-w-xl flex flex-col items-center gap-1">
              <div className="flex items-center gap-3 sm:gap-4">
                {/* 15s backward */}
                <button
                  onClick={() => skip(-15)}
                  title={lang === 'ar' ? 'تأخير ١٥ ثانية' : 'Skip backward 15s'}
                  className="p-1.5 rounded-full hover:bg-white/10 text-[#DFC7A5] hover:text-white transition"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                {/* Play / Pause Primary */}
                <button
                  onClick={togglePlay}
                  className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#C5A880] text-[#0F382C] flex items-center justify-center shadow-lg hover:bg-[#DFC7A5] hover:scale-105 active:scale-95 transition"
                  title={isPlaying ? (lang === 'ar' ? 'إيقاف مؤقت' : 'Pause') : (lang === 'ar' ? 'تشغيل' : 'Play')}
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-[#0F382C] border-t-transparent rounded-full animate-spin" />
                  ) : isPlaying ? (
                    <Pause className="w-5 h-5 fill-current" />
                  ) : (
                    <Play className="w-5 h-5 fill-current ml-0.5" />
                  )}
                </button>

                {/* 15s forward */}
                <button
                  onClick={() => skip(15)}
                  title={lang === 'ar' ? 'تقديم ١٥ ثانية' : 'Skip forward 15s'}
                  className="p-1.5 rounded-full hover:bg-white/10 text-[#DFC7A5] hover:text-white transition"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
              </div>

              {/* Progress Bar & Timestamps */}
              <div className="w-full flex items-center gap-2 text-[11px] font-latin">
                <span className="text-[#DFC7A5] w-9 text-right tabular-nums">
                  {formatTime(currentTime)}
                </span>
                <div className="relative flex-1 flex items-center">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="0.1"
                    value={isNaN(progressPercent) ? 0 : progressPercent}
                    onChange={handleSeekChange}
                    className="w-full h-1.5 bg-[#0F382C] rounded-lg appearance-none cursor-pointer accent-[#C5A880]"
                  />
                </div>
                <span className="text-white/60 w-9 text-left tabular-nums">
                  {formatTime(duration)}
                </span>
              </div>
            </div>

            {/* Right: Audio Speed, Volume, Download, Minimize & Close */}
            <div className="flex items-center gap-1 sm:gap-3">
              {/* Speed Controller */}
              <div className="relative">
                <button
                  onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                  className="text-xs px-2 py-1 rounded bg-[#0F382C] border border-[#C5A880]/30 text-[#DFC7A5] hover:bg-[#0F382C]/80 font-latin"
                  title={lang === 'ar' ? 'سرعة التشغيل' : 'Playback speed'}
                >
                  {playbackRate}x
                </button>
                {showSpeedMenu && (
                  <div className="absolute bottom-full mb-2 bg-[#0F382C] border border-[#C5A880]/40 rounded-lg shadow-xl py-1 z-50 flex flex-col min-w-[70px]">
                    {speeds.map(r => (
                      <button
                        key={r}
                        onClick={() => {
                          setRate(r);
                          setShowSpeedMenu(false);
                        }}
                        className={`px-3 py-1 text-xs text-left hover:bg-white/10 ${
                          playbackRate === r ? 'text-[#DFC7A5] font-bold' : 'text-white/80'
                        }`}
                      >
                        {r}x
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Volume Slider (hidden on small screens) */}
              <div className="hidden lg:flex items-center gap-1.5">
                <button
                  onClick={toggleMute}
                  className="p-1 rounded text-[#DFC7A5] hover:text-white"
                  title={isMuted ? (lang === 'ar' ? 'إلغاء الكتم' : 'Unmute') : (lang === 'ar' ? 'كتم الصوت' : 'Mute')}
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="w-4 h-4" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={e => setAudioVolume(parseFloat(e.target.value))}
                  className="w-16 h-1 bg-[#0F382C] rounded appearance-none cursor-pointer accent-[#C5A880]"
                />
              </div>

              {/* Direct Download audio */}
              <a
                href={currentTrack.audioUrl}
                download
                target="_blank"
                rel="noreferrer"
                className="p-1.5 rounded-full hover:bg-white/10 text-[#DFC7A5] hover:text-white transition"
                title={lang === 'ar' ? 'تحميل الملف الصوتي' : 'Download audio file'}
              >
                <Download className="w-4 h-4" />
              </a>

              {/* Minimize / Expand Toggle */}
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1.5 rounded-full hover:bg-white/10 text-white/70 hover:text-white"
                title={isMinimized ? (lang === 'ar' ? 'توسيع المشغل' : 'Expand player') : (lang === 'ar' ? 'تصغير المشغل' : 'Minimize player')}
              >
                {isMinimized ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {/* Close Player */}
              <button
                onClick={closePlayer}
                className="p-1.5 rounded-full hover:bg-white/10 text-red-300 hover:text-red-100"
                title={lang === 'ar' ? 'إغلاق المشغل' : 'Close player'}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
