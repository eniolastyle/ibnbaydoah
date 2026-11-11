import React, { useState } from 'react';
import { Poem, PoemVerse } from '../types';
import { useLanguage } from '../context/LanguageContext';
import {
  Copy,
  Check,
  Search,
  Feather,
  Sliders,
  ArrowRight
} from 'lucide-react';

interface PoetryViewerProps {
  poem: Poem;
  onBack?: () => void;
}

export const PoetryViewer: React.FC<PoetryViewerProps> = ({ poem, onBack }) => {
  const { lang, t, translateMeter, translateCategory } = useLanguage();
  const [fontSize, setFontSize] = useState<'normal' | 'large' | 'xlarge'>('large');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [focusedVerse, setFocusedVerse] = useState<number | null>(null);

  const handleCopyVerse = (verse: PoemVerse, index: number) => {
    const text = `${verse.sadr} ۞ ${verse.ajuz}\n[${poem.title} - ${t('verse_word')} ${verse.number}]`;
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2200);
  };

  const filteredVerses = poem.verses.filter(v => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return v.sadr.toLowerCase().includes(q) || v.ajuz.toLowerCase().includes(q) || String(v.number) === q;
  });

  const getFontSizeClass = () => {
    switch (fontSize) {
      case 'normal':
        return 'text-base sm:text-lg leading-loose';
      case 'large':
        return 'text-lg sm:text-2xl leading-loose';
      case 'xlarge':
        return 'text-xl sm:text-3xl leading-[2.6]';
    }
  };

  return (
    <div className="bg-[#FDFBF7] min-h-[600px] rounded-2xl border-2 border-[#C5A880]/40 shadow-xl overflow-hidden">
      {/* Poem Header Banner */}
      <div className="bg-gradient-to-b from-[#0F382C] to-[#164E3D] text-[#FDFBF7] p-6 sm:p-8 relative overflow-hidden">
        {/* Subtle geometric background motif */}
        <div className="absolute inset-0 bg-arabesque-dark opacity-30 pointer-events-none" />

        <div className="relative z-10">
          {onBack && (
            <button
              onClick={onBack}
              className="inline-flex items-center gap-2 mb-4 text-[#DFC7A5] hover:text-white transition font-readex text-sm font-semibold"
            >
              <ArrowRight className="w-4 h-4 rtl:rotate-0 ltr:rotate-180" />
              <span>{t('back_to_poetry')}</span>
            </button>
          )}

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#C5A880]/20 border border-[#C5A880]/40 text-[#DFC7A5] text-xs font-readex mb-2">
                <Feather className="w-3.5 h-3.5" />
                <span>{translateMeter(poem.meter)}</span>
                <span>•</span>
                <span>{translateCategory(poem.category)}</span>
                {poem.year && (
                  <>
                    <span>•</span>
                    <span>{poem.year}</span>
                  </>
                )}
              </div>
              <h2 className="font-amiri font-bold text-2xl sm:text-4xl text-[#FDFBF7] mb-2 drop-shadow-sm">
                {poem.title}
              </h2>
              <p className="text-[#DFC7A5]/90 text-sm sm:text-base font-naskh max-w-3xl leading-relaxed">
                {poem.summary}
              </p>
            </div>

            {/* Total verses badge */}
            <div className="shrink-0 flex md:flex-col items-center justify-center p-3 rounded-xl bg-[#0F382C]/70 border border-[#C5A880]/40 text-center">
              <span className="font-amiri font-bold text-2xl sm:text-3xl text-[#DFC7A5]">
                {poem.totalVerses}
              </span>
              <span className="text-xs text-white/80 font-readex">{t('poem_verses_total')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Control Bar: Search, Font Size, Verse Jump */}
      <div className="bg-[#F4EFE6] border-b border-[#C5A880]/30 px-4 py-3 sm:px-8 flex flex-wrap items-center justify-between gap-4">
        {/* Search input */}
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={t('search_verses_placeholder')}
            className="w-full pl-9 pr-9 py-2 text-sm bg-white rounded-lg border border-[#C5A880]/40 focus:outline-none focus:ring-2 focus:ring-[#0F382C] text-[#1E1E1E] font-readex"
          />
          <Search className="w-4 h-4 text-[#A58455] absolute top-2.5 right-3" />
        </div>

        {/* Font Size Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#0F382C] font-readex font-medium flex items-center gap-1">
            <Sliders className="w-3.5 h-3.5 text-[#C5A880]" />
            {t('font_size')}:
          </span>
          <div className="inline-flex rounded-lg border border-[#C5A880]/40 bg-white p-0.5">
            <button
              onClick={() => setFontSize('normal')}
              className={`px-2.5 py-1 text-xs rounded font-readex transition ${
                fontSize === 'normal'
                  ? 'bg-[#0F382C] text-white font-bold'
                  : 'text-[#1E1E1E] hover:bg-[#F4EFE6]'
              }`}
            >
              {t('font_normal')}
            </button>
            <button
              onClick={() => setFontSize('large')}
              className={`px-2.5 py-1 text-xs rounded font-readex transition ${
                fontSize === 'large'
                  ? 'bg-[#0F382C] text-white font-bold'
                  : 'text-[#1E1E1E] hover:bg-[#F4EFE6]'
              }`}
            >
              {t('font_large')}
            </button>
            <button
              onClick={() => setFontSize('xlarge')}
              className={`px-2.5 py-1 text-xs rounded font-readex transition ${
                fontSize === 'xlarge'
                  ? 'bg-[#0F382C] text-white font-bold'
                  : 'text-[#1E1E1E] hover:bg-[#F4EFE6]'
              }`}
            >
              {t('font_grand')}
            </button>
          </div>
        </div>
      </div>

      {/* Classical Two-Hemistich List (Al-Sadr wa Al-'Ajuz) */}
      <div className="p-4 sm:p-8 space-y-4 max-w-5xl mx-auto">
        {filteredVerses.length === 0 ? (
          <div className="text-center py-12 text-[#A58455] font-naskh">
            {t('no_verses_found')}
          </div>
        ) : (
          filteredVerses.map((verse, idx) => {
            const isCopied = copiedIndex === idx;
            const isFocused = focusedVerse === verse.number;

            return (
              <div
                key={verse.number || idx}
                onClick={() => setFocusedVerse(isFocused ? null : verse.number)}
                className={`group relative p-4 sm:p-6 rounded-xl border transition-all duration-200 cursor-pointer ${
                  isFocused
                    ? 'bg-[#0F382C]/5 border-[#0F382C] shadow-md ring-1 ring-[#0F382C]'
                    : 'bg-white hover:bg-[#FCF9F2] border-[#C5A880]/25 hover:border-[#C5A880]/60 hover:shadow-sm'
                }`}
              >
                {/* Verse Number & Copy Button Header Row */}
                <div className="flex items-center justify-between mb-3 text-xs text-[#A58455]">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-full bg-[#F4EFE6] border border-[#C5A880]/40 flex items-center justify-center font-bold text-[#0F382C] text-xs font-amiri">
                      {verse.number}
                    </span>
                    <span className="font-readex text-[11px] text-[#A58455]">
                      {t('verse_word')} {verse.number}
                    </span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopyVerse(verse, idx);
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#F4EFE6] hover:bg-[#C5A880]/20 text-[#0F382C] text-xs transition border border-[#C5A880]/30"
                    title={t('copy_verse')}
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700 font-readex text-[11px] font-semibold">
                          {t('verse_copied')}
                        </span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-[#A58455]" />
                        <span className="font-readex text-[11px]">{t('copy_verse')}</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Classical Two-Hemistich Display: Pristine Arabic Verses */}
                <div
                  dir="rtl"
                  className={`grid grid-cols-1 md:grid-cols-[1fr,auto,1fr] items-center gap-2 sm:gap-6 font-amiri text-[#1E1E1E] text-center md:text-justify ${getFontSizeClass()}`}
                >
                  {/* الصدر (Al-Sadr - Right Hemistich) */}
                  <div className="text-center md:text-right font-medium px-2 py-1 select-text">
                    {verse.sadr}
                  </div>

                  {/* Ornamental Classical Islamic Divider ۞ */}
                  <div className="flex items-center justify-center select-none text-[#C5A880] text-xl sm:text-2xl py-1 md:py-0">
                    <span className="inline-block transition-transform duration-300 group-hover:scale-125">
                      ۞
                    </span>
                  </div>

                  {/* العجز (Al-'Ajuz - Left Hemistich) */}
                  <div className="text-center md:text-left font-medium px-2 py-1 select-text">
                    {verse.ajuz}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Info */}
      <div className="bg-[#F4EFE6] border-t border-[#C5A880]/30 p-4 text-center text-xs text-[#0F382C] font-readex">
        <span>«{poem.title}» • {t('poem_by_author')}</span>
      </div>
    </div>
  );
};
