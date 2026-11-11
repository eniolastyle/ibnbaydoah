import React, { useState, useEffect } from 'react';
import { Book, AudioCourse, Poem, Article } from '../types';
import { useLanguage } from '../context/LanguageContext';
import {
  Search,
  BookOpen,
  Headphones,
  Feather,
  FileText,
  ArrowRight
} from 'lucide-react';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  books: Book[];
  audios: AudioCourse[];
  poems: Poem[];
  articles: Article[];
  onSelectResult: (type: 'library' | 'audios' | 'poetry' | 'articles', id?: string) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  books,
  audios,
  poems,
  articles,
  onSelectResult
}) => {
  const { lang, t, translateCategory, translateStatus, translateLevel, translateMeter, translateArticleType } = useLanguage();
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const q = query.toLowerCase().trim();

  const matchedBooks = q
    ? books.filter(
        b =>
          b.title.toLowerCase().includes(q) ||
          b.category.toLowerCase().includes(q) ||
          b.description.toLowerCase().includes(q)
      )
    : [];

  const matchedAudios = q
    ? audios.filter(
        a =>
          a.title.toLowerCase().includes(q) ||
          a.series.toLowerCase().includes(q) ||
          a.category.toLowerCase().includes(q)
      )
    : [];

  const matchedPoems = q
    ? poems.filter(
        p =>
          p.title.toLowerCase().includes(q) ||
          p.meter.toLowerCase().includes(q) ||
          p.verses.some(v => v.sadr.includes(q) || v.ajuz.includes(q))
      )
    : [];

  const matchedArticles = q
    ? articles.filter(
        art =>
          art.title.toLowerCase().includes(q) ||
          art.content.toLowerCase().includes(q) ||
          art.tags.some(t => t.includes(q))
      )
    : [];

  const totalMatches =
    matchedBooks.length + matchedAudios.length + matchedPoems.length + matchedArticles.length;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#FDFBF7] rounded-3xl max-w-2xl w-full border-2 border-[#C5A880] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        {/* Search Input Bar */}
        <div className="p-4 sm:p-5 border-b border-[#C5A880]/30 flex items-center gap-3 bg-white">
          <Search className="w-5 h-5 text-[#A58455]" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={t('search_modal_placeholder')}
            className="flex-1 bg-transparent text-sm sm:text-base font-readex focus:outline-none text-[#1E1E1E]"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-xs text-[#A58455] hover:text-[#0F382C] font-readex"
            >
              {t('clear_btn')}
            </button>
          )}
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#F4EFE6] hover:bg-[#C5A880]/30 text-[#0F382C] flex items-center justify-center font-bold"
          >
            ✕
          </button>
        </div>

        {/* Results Container */}
        <div className="overflow-y-auto p-4 sm:p-6 space-y-6">
          {!q ? (
            <div className="text-center py-8 text-[#A58455] font-readex text-xs">
              {t('search_empty_hint')}
            </div>
          ) : totalMatches === 0 ? (
            <div className="text-center py-8 text-[#A58455] font-readex text-xs">
              {t('search_no_results')} «{query}»
            </div>
          ) : (
            <>
              {/* Books Results */}
              {matchedBooks.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-readex font-bold text-[#A58455] flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>{t('search_books_section')} ({matchedBooks.length})</span>
                  </h4>
                  <div className="space-y-1.5">
                    {matchedBooks.map(b => (
                      <div
                        key={b.id}
                        onClick={() => {
                          onSelectResult('library', b.id);
                          onClose();
                        }}
                        className="p-3 rounded-xl bg-white hover:bg-[#F4EFE6] border border-[#C5A880]/30 cursor-pointer flex items-center justify-between text-xs font-readex transition"
                      >
                        <div>
                          <span className="font-amiri font-bold text-base text-[#0F382C] block">
                            {b.title}
                          </span>
                          <span className="text-[#A58455] text-[11px]">
                            {translateCategory(b.category)} • {translateStatus(b.status)}
                          </span>
                        </div>
                        <ArrowRight className="w-4 h-4 text-[#A58455] rtl:rotate-180" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Audios Results */}
              {matchedAudios.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-readex font-bold text-[#A58455] flex items-center gap-1.5">
                    <Headphones className="w-3.5 h-3.5" />
                    <span>{t('search_audios_section')} ({matchedAudios.length})</span>
                  </h4>
                  <div className="space-y-1.5">
                    {matchedAudios.map(a => (
                      <div
                        key={a.id}
                        onClick={() => {
                          onSelectResult('audios', a.id);
                          onClose();
                        }}
                        className="p-3 rounded-xl bg-white hover:bg-[#F4EFE6] border border-[#C5A880]/30 cursor-pointer flex items-center justify-between text-xs font-readex transition"
                      >
                        <div>
                          <span className="font-amiri font-bold text-base text-[#0F382C] block">
                            {a.title}
                          </span>
                          <span className="text-[#A58455] text-[11px]">
                            {a.series} • {translateLevel(a.level)}
                          </span>
                        </div>
                        <ArrowRight className="w-4 h-4 text-[#A58455] rtl:rotate-180" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Poems Results */}
              {matchedPoems.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-readex font-bold text-[#A58455] flex items-center gap-1.5">
                    <Feather className="w-3.5 h-3.5" />
                    <span>{t('search_poetry_section')} ({matchedPoems.length})</span>
                  </h4>
                  <div className="space-y-1.5">
                    {matchedPoems.map(p => (
                      <div
                        key={p.id}
                        onClick={() => {
                          onSelectResult('poetry', p.id);
                          onClose();
                        }}
                        className="p-3 rounded-xl bg-white hover:bg-[#F4EFE6] border border-[#C5A880]/30 cursor-pointer flex items-center justify-between text-xs font-readex transition"
                      >
                        <div>
                          <span className="font-amiri font-bold text-base text-[#0F382C] block">
                            {p.title}
                          </span>
                          <span className="text-[#A58455] text-[11px]">
                            {translateMeter(p.meter)} • {p.totalVerses} {t('verses_count')}
                          </span>
                        </div>
                        <ArrowRight className="w-4 h-4 text-[#A58455] rtl:rotate-180" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Articles Results */}
              {matchedArticles.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-readex font-bold text-[#A58455] flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" />
                    <span>{t('search_articles_section')} ({matchedArticles.length})</span>
                  </h4>
                  <div className="space-y-1.5">
                    {matchedArticles.map(art => (
                      <div
                        key={art.id}
                        onClick={() => {
                          onSelectResult('articles', art.id);
                          onClose();
                        }}
                        className="p-3 rounded-xl bg-white hover:bg-[#F4EFE6] border border-[#C5A880]/30 cursor-pointer flex items-center justify-between text-xs font-readex transition"
                      >
                        <div>
                          <span className="font-amiri font-bold text-base text-[#0F382C] block">
                            {art.title}
                          </span>
                          <span className="text-[#A58455] text-[11px]">
                            {translateArticleType(art.type)} • {art.date}
                          </span>
                        </div>
                        <ArrowRight className="w-4 h-4 text-[#A58455] rtl:rotate-180" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
