import React, { useState } from 'react';
import { useAudio } from '../context/AudioContext';
import { useLanguage } from '../context/LanguageContext';
import { IslamicSeal } from './IslamicSeal';
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
  AlertCircle,
  RefreshCw,
  Maximize2
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
    audioError,
    togglePlay,
    seek,
    skip,
    setRate,
    setAudioVolume,
    toggleMute,
    closePlayer,
    retryTrack
  } = useAudio();

  const { lang, t, translateLevel, translateCategory } = useLanguage();
  const [isExpandedMobile, setIsExpandedMobile] = useState(false);
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
      case 'مبتدئ':
        return 'bg-emerald-950/70 text-emerald-200 border-emerald-500/40';
      case 'intermediate':
      case 'متوسط':
        return 'bg-amber-950/70 text-amber-200 border-amber-500/40';
      case 'advanced':
      case 'متقدم':
      case 'متقدم / مفصل':
        return 'bg-purple-950/70 text-purple-200 border-purple-500/40';
      default:
        return 'bg-emerald-950/70 text-emerald-200 border-emerald-500/40';
    }
  };

  return (
    <>
      {/* ============================================================ */}
      {/* 1. MOBILE EXPANDED FULL-SCREEN SHEET (Visible when opened) */}
      {/* ============================================================ */}
      {isExpandedMobile && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={lang === 'ar' ? 'مشغل الشرح الصوتي' : 'Audio Player'}
          className="lg:hidden fixed inset-0 z-50 bg-[#0A261D]/98 backdrop-blur-xl text-[#FDFBF7] flex flex-col justify-between p-5 pb-8 animate-in fade-in slide-in-from-bottom-8 duration-200 overflow-y-auto"
        >
          {/* Header Bar */}
          <div className="flex items-center justify-between pb-3 border-b border-[#C5A880]/20">
            <button
              onClick={() => setIsExpandedMobile(false)}
              className="p-2.5 rounded-full bg-white/10 text-[#DFC7A5] hover:text-white hover:bg-white/15 transition active:scale-95"
              title={lang === 'ar' ? 'تصغير المشغل' : 'Minimize player'}
            >
              <ChevronDown className="w-5 h-5" />
            </button>

            <div className="text-center">
              <span className="text-[11px] font-readex uppercase tracking-widest text-[#DFC7A5]/80 block">
                {lang === 'ar' ? 'المجلس الصوتي الجاري' : 'Now Playing'}
              </span>
              <span className="text-xs font-readex text-white/90 font-medium truncate max-w-[200px] block">
                {currentTrack.series}
              </span>
            </div>

            <button
              onClick={closePlayer}
              className="p-2.5 rounded-full bg-white/10 text-red-300 hover:text-red-100 hover:bg-red-900/40 transition active:scale-95"
              title={lang === 'ar' ? 'إغلاق المشغل' : 'Close player'}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Central Arabesque Emblem Visual (Strictly NO taswir) */}
          <div className="my-auto py-6 flex flex-col items-center text-center space-y-6">
            <div className="relative">
              {/* Soft pulsating gold glow aura when playing */}
              <div
                className={`absolute inset-0 rounded-full bg-[#C5A880]/20 blur-2xl transition-opacity duration-700 ${
                  isPlaying ? 'opacity-100 scale-110' : 'opacity-0 scale-90'
                }`}
              />
              <div className="relative transform hover:scale-105 transition-transform duration-300">
                <IslamicSeal size="xl" variant="gold" />
              </div>
            </div>

            {/* Track Metadata */}
            <div className="space-y-2 max-w-sm px-2">
              <div className="flex items-center justify-center gap-2 flex-wrap">
                {currentTrack.category && (
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#164E3D] text-[#DFC7A5] border border-[#C5A880]/30 font-readex font-medium">
                    {translateCategory(currentTrack.category)}
                  </span>
                )}
                {currentTrack.level && (
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full border font-readex font-semibold ${getLevelBadgeClass(
                      currentTrack.levelId || currentTrack.level
                    )}`}
                  >
                    {translateLevel(currentTrack.level)}
                  </span>
                )}
              </div>

              <h3 className="font-amiri font-bold text-2xl sm:text-3xl text-[#FDFBF7] leading-relaxed">
                {currentTrack.title}
              </h3>
              <p className="text-sm font-readex text-[#DFC7A5] font-medium">
                {currentTrack.series}
              </p>
            </div>

            {/* Error Message & Retry Banner if streaming fails */}
            {audioError && (
              <div className="w-full max-w-sm mx-auto p-3 rounded-xl bg-red-950/80 border border-red-500/50 text-red-200 text-xs font-readex flex items-center justify-between gap-2 shadow-lg">
                <div className="flex items-center gap-2 text-right">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span className="leading-snug">{audioError}</span>
                </div>
                <button
                  onClick={retryTrack}
                  className="px-2.5 py-1 rounded-lg bg-red-800 hover:bg-red-700 text-white font-bold flex items-center gap-1 shrink-0 transition"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>{lang === 'ar' ? 'إعادة' : 'Retry'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Controls Suite */}
          <div className="space-y-5 max-w-md mx-auto w-full">
            {/* Scrubber & Timestamps */}
            <div className="space-y-1.5">
              <div className="relative flex items-center py-1">
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="0.1"
                  value={isNaN(progressPercent) ? 0 : progressPercent}
                  onChange={handleSeekChange}
                  aria-label={lang === 'ar' ? 'مؤشر التقدم في الشرح' : 'Audio Progress Slider'}
                  className="w-full h-2.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-[#C5A880] focus:outline-none"
                />
              </div>
              <div className="flex justify-between items-center text-xs font-latin text-[#DFC7A5] px-1 tabular-nums">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Primary Transport Controls */}
            <div className="flex items-center justify-center gap-6 pt-1">
              {/* Skip -15s */}
              <button
                onClick={() => skip(-15)}
                className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-[#DFC7A5] hover:text-white flex flex-col items-center justify-center transition"
                title={lang === 'ar' ? 'تأخير ١٥ ثانية' : 'Skip backward 15s'}
              >
                <RotateCcw className="w-5 h-5" />
                <span className="text-[9px] font-latin font-bold -mt-0.5">15</span>
              </button>

              {/* Play / Pause Giant Button */}
              <button
                onClick={togglePlay}
                className="w-18 h-18 rounded-full bg-[#C5A880] text-[#0F382C] flex items-center justify-center shadow-[0_4px_24px_rgba(197,168,128,0.4)] hover:bg-[#DFC7A5] hover:scale-105 active:scale-95 transition"
                title={isPlaying ? (lang === 'ar' ? 'إيقاف مؤقت' : 'Pause') : (lang === 'ar' ? 'تشغيل' : 'Play')}
              >
                {isLoading ? (
                  <div className="w-8 h-8 border-3 border-[#0F382C] border-t-transparent rounded-full animate-spin" />
                ) : isPlaying ? (
                  <Pause className="w-8 h-8 fill-current" />
                ) : (
                  <Play className="w-8 h-8 fill-current ml-1" />
                )}
              </button>

              {/* Skip +15s */}
              <button
                onClick={() => skip(15)}
                className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-[#DFC7A5] hover:text-white flex flex-col items-center justify-center transition"
                title={lang === 'ar' ? 'تقديم ١٥ ثانية' : 'Skip forward 15s'}
              >
                <RotateCw className="w-5 h-5" />
                <span className="text-[9px] font-latin font-bold -mt-0.5">15</span>
              </button>
            </div>

            {/* Speed Pills Bar */}
            <div className="flex items-center justify-center gap-2 pt-2">
              <span className="text-[11px] font-readex text-[#DFC7A5]/80 mr-1">
                {lang === 'ar' ? 'السرعة:' : 'Speed:'}
              </span>
              {speeds.map(rate => (
                <button
                  key={rate}
                  onClick={() => setRate(rate)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-latin font-bold transition active:scale-95 ${
                    playbackRate === rate
                      ? 'bg-[#C5A880] text-[#0F382C] shadow-md'
                      : 'bg-white/10 text-white/80 hover:bg-white/15'
                  }`}
                >
                  {rate}x
                </button>
              ))}
            </div>

            {/* Utility Actions (Download & Mute) */}
            <div className="flex items-center justify-center gap-4 pt-3 border-t border-white/10">
              <button
                onClick={toggleMute}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-[#DFC7A5] font-readex transition"
              >
                {isMuted || volume === 0 ? (
                  <>
                    <VolumeX className="w-4 h-4" />
                    <span>{lang === 'ar' ? 'إلغاء الكتم' : 'Unmute'}</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-4 h-4" />
                    <span>{lang === 'ar' ? 'كتم الصوت' : 'Mute'}</span>
                  </>
                )}
              </button>

              <a
                href={currentTrack.audioUrl}
                download
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-[#DFC7A5] font-readex transition"
              >
                <Download className="w-4 h-4" />
                <span>{lang === 'ar' ? 'تحميل MP3' : 'Download MP3'}</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 2. MOBILE COMPACT MINI-BAR (Docked at bottom-14 above Nav) */}
      {/* ============================================================ */}
      <div className="lg:hidden fixed left-0 right-0 bottom-14 z-45 bg-[#0F382C]/95 backdrop-blur-md text-[#FDFBF7] border-t border-[#C5A880]/40 shadow-2xl">
        {/* Top Slim Progress Hairline */}
        <div className="w-full h-1 bg-white/10 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#C5A880] to-[#DFC7A5] transition-all duration-200"
            style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
          />
        </div>

        {/* Mini Content */}
        <div className="px-3 py-2 flex items-center justify-between gap-2.5">
          {/* Left: Tap to open full sheet */}
          <button
            onClick={() => setIsExpandedMobile(true)}
            className="flex items-center gap-2.5 min-w-0 flex-1 text-left rtl:text-right active:opacity-80"
          >
            <div className="w-10 h-10 rounded-full bg-[#164E3D] border border-[#C5A880]/50 flex items-center justify-center shrink-0 shadow-inner relative">
              <IslamicSeal size="sm" variant="gold" />
              {isPlaying && (
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full ring-2 ring-[#0F382C] animate-pulse" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="font-amiri font-bold text-xs sm:text-sm text-[#FDFBF7] truncate">
                {currentTrack.title}
              </h4>
              <p className="text-[11px] text-[#DFC7A5]/80 font-readex truncate">
                {currentTrack.series}
              </p>
            </div>
          </button>

          {/* Right: Touch Controls */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Play/Pause Button (min 44px hit target) */}
            <button
              onClick={togglePlay}
              className="w-11 h-11 rounded-full bg-[#C5A880] text-[#0F382C] flex items-center justify-center shadow-md active:scale-95 transition"
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

            {/* Expand Sheet Button */}
            <button
              onClick={() => setIsExpandedMobile(true)}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-[#DFC7A5] flex items-center justify-center transition active:scale-95"
              title={lang === 'ar' ? 'توسيع المشغل' : 'Expand full player'}
            >
              <Maximize2 className="w-4 h-4" />
            </button>

            {/* Dismiss / Close */}
            <button
              onClick={closePlayer}
              className="w-9 h-9 rounded-full bg-white/5 hover:bg-red-950/40 text-red-300 hover:text-red-100 flex items-center justify-center transition active:scale-95"
              title={lang === 'ar' ? 'إغلاق المشغل' : 'Close player'}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 3. DESKTOP SLEEK ARABESQUE DOCK (Visible on lg screens)     */}
      {/* ============================================================ */}
      <div className="hidden lg:block fixed left-0 right-0 bottom-0 z-50 transition-all duration-300">
        {/* Accent Bar */}
        <div className="h-1 bg-gradient-to-r from-[#0F382C] via-[#C5A880] to-[#0F382C]" />

        {/* Error notification header if streaming has issue */}
        {audioError && (
          <div className="bg-red-900/90 text-red-100 text-xs py-1.5 px-4 font-readex flex items-center justify-center gap-3 border-b border-red-700/50">
            <AlertCircle className="w-4 h-4 text-red-300" />
            <span>{audioError}</span>
            <button
              onClick={retryTrack}
              className="px-2 py-0.5 rounded bg-red-800 hover:bg-red-700 text-white font-bold flex items-center gap-1 transition"
            >
              <RefreshCw className="w-3 h-3" />
              <span>{lang === 'ar' ? 'إعادة المحاولة' : 'Retry'}</span>
            </button>
          </div>
        )}

        <div className="bg-[#0F382C] text-[#FDFBF7] shadow-2xl backdrop-blur-md px-6 py-3 border-t border-[#C5A880]/30">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-6">
            {/* Left: Track Information */}
            <div className="flex items-center gap-3.5 min-w-0 max-w-sm">
              <div className="w-12 h-12 rounded-full bg-[#164E3D] border border-[#C5A880]/60 flex items-center justify-center shrink-0 shadow-inner relative">
                <IslamicSeal size="sm" variant="gold" />
                {isPlaying && (
                  <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full ring-2 ring-[#0F382C] animate-pulse" />
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-amiri font-bold text-base text-[#FDFBF7] truncate">
                    {currentTrack.title}
                  </h4>
                  {currentTrack.level && (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full border shrink-0 font-readex ${getLevelBadgeClass(
                        currentTrack.levelId || currentTrack.level
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
            <div className="flex-1 max-w-xl flex flex-col items-center gap-1.5">
              <div className="flex items-center gap-4">
                {/* 15s backward */}
                <button
                  onClick={() => skip(-15)}
                  title={lang === 'ar' ? 'تأخير ١٥ ثانية' : 'Skip backward 15s'}
                  className="p-2 rounded-full hover:bg-white/10 text-[#DFC7A5] hover:text-white transition active:scale-95"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                {/* Play / Pause Primary */}
                <button
                  onClick={togglePlay}
                  className="w-11 h-11 rounded-full bg-[#C5A880] text-[#0F382C] flex items-center justify-center shadow-lg hover:bg-[#DFC7A5] hover:scale-105 active:scale-95 transition"
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
                  className="p-2 rounded-full hover:bg-white/10 text-[#DFC7A5] hover:text-white transition active:scale-95"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
              </div>

              {/* Progress Bar & Timestamps */}
              <div className="w-full flex items-center gap-3 text-xs font-latin">
                <span className="text-[#DFC7A5] w-10 text-right tabular-nums">
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
                    aria-label={lang === 'ar' ? 'مؤشر التقدم في الشرح' : 'Audio Progress Slider'}
                    className="w-full h-1.5 bg-black/40 rounded-lg appearance-none cursor-pointer accent-[#C5A880] hover:h-2 transition-all"
                  />
                </div>
                <span className="text-white/60 w-10 text-left tabular-nums">
                  {formatTime(duration)}
                </span>
              </div>
            </div>

            {/* Right: Audio Speed, Volume, Download, Close */}
            <div className="flex items-center gap-3">
              {/* Speed Controller */}
              <div className="relative">
                <button
                  onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                  className="text-xs px-2.5 py-1 rounded-lg bg-[#164E3D] border border-[#C5A880]/40 text-[#DFC7A5] hover:bg-[#164E3D]/80 font-latin font-bold transition"
                  title={lang === 'ar' ? 'سرعة التشغيل' : 'Playback speed'}
                >
                  {playbackRate}x
                </button>
                {showSpeedMenu && (
                  <div className="absolute bottom-full mb-2 bg-[#0F382C] border border-[#C5A880]/50 rounded-xl shadow-2xl py-1 z-50 flex flex-col min-w-[80px]">
                    {speeds.map(r => (
                      <button
                        key={r}
                        onClick={() => {
                          setRate(r);
                          setShowSpeedMenu(false);
                        }}
                        className={`px-3 py-1.5 text-xs text-center hover:bg-white/10 transition ${
                          playbackRate === r ? 'text-[#DFC7A5] font-bold bg-white/5' : 'text-white/80'
                        }`}
                      >
                        {r}x
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Volume Slider */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={toggleMute}
                  className="p-1.5 rounded-lg text-[#DFC7A5] hover:text-white hover:bg-white/10 transition"
                  title={isMuted ? (lang === 'ar' ? 'إلغاء الكتم' : 'Unmute') : (lang === 'ar' ? 'كتم الصوت' : 'Mute')}
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="w-4 h-4 text-red-300" />
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
                  aria-label={lang === 'ar' ? 'مستوى الصوت' : 'Audio Volume'}
                  className="w-20 h-1.5 bg-black/40 rounded-lg appearance-none cursor-pointer accent-[#C5A880]"
                />
              </div>

              {/* Direct Download audio */}
              <a
                href={currentTrack.audioUrl}
                download
                target="_blank"
                rel="noreferrer"
                className="p-2 rounded-full hover:bg-white/10 text-[#DFC7A5] hover:text-white transition"
                title={lang === 'ar' ? 'تحميل الملف الصوتي' : 'Download audio file'}
              >
                <Download className="w-4 h-4" />
              </a>

              {/* Close Player */}
              <button
                onClick={closePlayer}
                className="p-2 rounded-full hover:bg-red-950/40 text-red-300 hover:text-red-100 transition"
                title={lang === 'ar' ? 'إغلاق المشغل' : 'Close player'}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
