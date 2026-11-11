import React, { useState } from 'react';
import { Poem } from '../types';
import { PoetryViewer } from './PoetryViewer';
import { useLanguage } from '../context/LanguageContext';
import {
  Feather,
  Search,
  Layers,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface PoetryDiwanProps {
  poems: Poem[];
}

export const PoetryDiwan: React.FC<PoetryDiwanProps> = ({ poems }) => {
  const { lang, dir, t, translateMeter, translateCategory } = useLanguage();
  const [selectedPoem, setSelectedPoem] = useState<Poem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredPoems = poems.filter(p => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.title.toLowerCase().includes(q) ||
      p.meter.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      p.summary.toLowerCase().includes(q)
    );
  });

  // If a poem is selected, render the dedicated PoetryViewer
  if (selectedPoem) {
    return (
      <PoetryViewer
        poem={selectedPoem}
        onBack={() => setSelectedPoem(null)}
      />
    );
  }

  return (
    <div className="space-y-10 sm:space-y-16">
      {/* Poetry Hub Header */}
      <div className="bg-[#0F382C] text-[#FDFBF7] rounded-3xl p-8 sm:p-12 relative overflow-hidden shadow-xl">
        <div className="absolute inset-0 bg-arabesque-dark opacity-30 pointer-events-none" />
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#C5A880]/20 border border-[#C5A880]/40 text-[#DFC7A5] text-xs font-readex">
            <Feather className="w-3.5 h-3.5" />
            <span className="font-semibold">{t('poetry_header_badge')}</span>
          </div>
          <h2 className="font-amiri font-bold text-3xl sm:text-4xl text-[#FDFBF7]">
            {t('poetry_header_title')}
          </h2>
          <p className="font-naskh text-[#DFC7A5]/90 text-sm sm:text-base leading-[2.1]">
            {t('poetry_header_desc')}
          </p>
        </div>
      </div>

      {/* Search and stats bar */}
      <div className="bg-white rounded-3xl border border-[#E8DCC9] p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:max-w-md">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={t('poetry_search_placeholder')}
            className="w-full pl-11 pr-4 py-3 text-xs sm:text-sm rounded-xl border border-[#E0D4C1] bg-[#FDFBF7] focus:outline-none focus:ring-2 focus:ring-[#0F382C]/30 focus:border-[#0F382C] font-readex text-[#1E1E1E]"
          />
          <Search className="w-4 h-4 text-[#A58455] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        <div className="text-xs font-readex text-[#0F382C] flex items-center gap-3">
          <span className="font-bold">
            {filteredPoems.length} {t('poetry_box_title')}
          </span>
          <span>•</span>
          <span className="text-[#8C6D3B]">
            {lang === 'ar' ? 'تنسيق الشطرين (الصدر والعجز) ۞' : 'Classical Hemistich Layout ۞'}
          </span>
        </div>
      </div>

      {/* Poems Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-10">
        {filteredPoems.map(poem => {
          const sampleVerse = poem.verses && poem.verses.length > 0 ? poem.verses[0] : null;

          return (
            <div
              key={poem.id}
              onClick={() => setSelectedPoem(poem)}
              className="bg-white rounded-3xl border border-[#E8DCC9] shadow-[0_2px_12px_-2px_rgba(15,56,44,0.04)] hover:shadow-lg hover:border-[#0F382C]/40 transition-all duration-300 p-7 sm:p-8 flex flex-col justify-between cursor-pointer group"
            >
              <div>
                {/* Meta header */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="text-xs font-readex font-medium px-3 py-1 rounded-full bg-[#0F382C]/10 text-[#0F382C] border border-[#E0D4C1]">
                    {translateMeter(poem.meter)}
                  </span>
                  <div className="flex items-center gap-1.5 text-xs text-[#8C6D3B] font-readex font-semibold">
                    <Layers className="w-3.5 h-3.5" />
                    <span>{poem.totalVerses} {t('verses_count')}</span>
                  </div>
                </div>

                {/* Poem Title */}
                <h3 className="font-amiri font-bold text-2xl sm:text-3xl text-[#0F382C] mb-2 group-hover:text-[#164E3D] transition">
                  {poem.title}
                </h3>

                <p className="font-naskh text-sm sm:text-base text-[#2D332F] leading-[2.1] mb-5">
                  {poem.summary}
                </p>

                {/* Sample Verse Preview Card */}
                {sampleVerse && (
                  <div className="p-4 rounded-2xl bg-[#FAF6EE] border border-[#E8DCC9] my-4 font-amiri text-sm sm:text-base text-[#0F382C] leading-loose">
                    <div className="text-center font-semibold mb-1">
                      {sampleVerse.sadr} ۞ {sampleVerse.ajuz}
                    </div>
                    <div className="text-[11px] text-center text-[#8C6D3B] font-readex">
                      [{t('opening_verse')}]
                    </div>
                  </div>
                )}
              </div>

              {/* Action Bottom */}
              <div className="pt-4 border-t border-[#E8DCC9] flex items-center justify-between text-xs font-readex text-[#0F382C] mt-2">
                <span className="text-[#8C6D3B] font-medium">{translateCategory(poem.category)}</span>
                <span className="font-bold flex items-center gap-1.5 group-hover:translate-x-[-4px] transition-transform rtl:group-hover:translate-x-[-4px] ltr:group-hover:translate-x-[4px]">
                  <span>{t('read_full_poem')}</span>
                  {dir === 'rtl' ? (
                    <ChevronLeft className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
