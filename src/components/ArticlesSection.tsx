import React, { useState } from 'react';
import { Article } from '../types';
import { useLanguage } from '../context/LanguageContext';
import {
  FileText,
  Search,
  Calendar,
  Copy,
  Check,
  BookOpen,
  ArrowRight
} from 'lucide-react';

interface ArticlesSectionProps {
  articles: Article[];
}

export const ArticlesSection: React.FC<ArticlesSectionProps> = ({ articles }) => {
  const { lang, t, translateCategory, translateArticleType } = useLanguage();
  const [selectedType, setSelectedType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [readingArticle, setReadingArticle] = useState<Article | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredArticles = articles.filter(art => {
    const matchesType = selectedType === 'all' || art.type === selectedType;
    const matchesSearch =
      !searchQuery.trim() ||
      art.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      art.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      art.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      art.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesType && matchesSearch;
  });

  const handleCopyContent = (art: Article) => {
    const text = `${art.title}\n\n${art.content}\n\n[${t('written_by_attribution')} - ${art.date}]`;
    navigator.clipboard.writeText(text);
    setCopiedId(art.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <div className="space-y-10 sm:space-y-16">
      {/* Header Banner */}
      <div className="bg-[#0F382C] text-[#FDFBF7] rounded-3xl p-8 sm:p-12 relative overflow-hidden shadow-xl">
        <div className="absolute inset-0 bg-arabesque-dark opacity-30 pointer-events-none" />
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#C5A880]/20 border border-[#C5A880]/40 text-[#DFC7A5] text-xs font-readex">
            <FileText className="w-3.5 h-3.5" />
            <span className="font-semibold">{t('articles_header_badge')}</span>
          </div>
          <h2 className="font-amiri font-bold text-3xl sm:text-4xl text-[#FDFBF7]">
            {t('articles_header_title')}
          </h2>
          <p className="font-naskh text-[#DFC7A5]/90 text-sm sm:text-base leading-[2.1]">
            {t('articles_header_desc')}
          </p>
        </div>
      </div>

      {/* Full Reading View if an article is open */}
      {readingArticle ? (
        <div className="bg-white rounded-3xl border border-[#E8DCC9] shadow-xl p-8 sm:p-12 space-y-8">
          <button
            onClick={() => setReadingArticle(null)}
            className="inline-flex items-center gap-2 text-xs font-readex font-bold text-[#0F382C] hover:text-[#164E3D] px-3 py-1.5 rounded-lg bg-[#F4EFE6]"
          >
            <ArrowRight className="w-4 h-4 rtl:rotate-0 ltr:rotate-180" />
            <span>{t('back_to_articles')}</span>
          </button>

          {/* Article Header */}
          <div className="border-b border-[#C5A880]/30 pb-6">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#0F382C]/10 text-[#0F382C] border border-[#C5A880]/40 font-readex font-semibold">
                {translateArticleType(readingArticle.type)}
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded bg-[#F4EFE6] text-[#A58455] font-readex font-medium">
                {translateCategory(readingArticle.category)}
              </span>
              <div className="flex items-center gap-1 text-xs text-[#1E1E1E]/60 font-readex mr-auto rtl:mr-auto ltr:ml-auto">
                <Calendar className="w-3.5 h-3.5 text-[#A58455]" />
                <span>{readingArticle.date}</span>
              </div>
            </div>

            <h1 className="font-amiri font-bold text-3xl sm:text-4xl text-[#0F382C] mb-4">
              {readingArticle.title}
            </h1>

            {/* Tags */}
            <div className="flex flex-wrap items-center gap-1.5">
              {readingArticle.tags.map(tag => (
                <span
                  key={tag}
                  className="text-[11px] font-readex px-2 py-0.5 rounded bg-[#FDFBF7] border border-[#C5A880]/30 text-[#A58455]"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>

          {/* Article Body */}
          <div className="font-naskh text-[#1E1E1E] text-base sm:text-lg leading-loose space-y-4 whitespace-pre-line select-text">
            {readingArticle.content}
          </div>

          {/* Bottom Actions */}
          <div className="pt-6 border-t border-[#C5A880]/30 flex flex-wrap items-center justify-between gap-4">
            <button
              onClick={() => handleCopyContent(readingArticle)}
              className="px-4 py-2 rounded-xl bg-[#0F382C] text-white hover:bg-[#164E3D] text-xs font-readex flex items-center gap-2 shadow-sm font-semibold"
            >
              {copiedId === readingArticle.id ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>{t('article_copied')}</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-[#DFC7A5]" />
                  <span>{t('copy_full_article')}</span>
                </>
              )}
            </button>

            <span className="text-xs font-amiri text-[#A58455]">
              «{t('written_by_attribution')}»
            </span>
          </div>
        </div>
      ) : (
        <>
          {/* Filters Bar */}
          <div className="bg-white rounded-3xl border border-[#E8DCC9] p-6 sm:p-8 shadow-xs space-y-6">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={t('search_articles_placeholder')}
                className="w-full pl-11 pr-4 py-3.5 text-xs sm:text-sm rounded-xl border border-[#E0D4C1] bg-[#FDFBF7] focus:outline-none focus:ring-2 focus:ring-[#0F382C]/30 focus:border-[#0F382C] font-readex text-[#1E1E1E]"
              />
              <Search className="w-4 h-4 text-[#A58455] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Type selector */}
            <div className="flex flex-wrap items-center gap-2.5 text-xs font-readex">
              <span className="text-[#8C6D3B] font-bold">{t('article_type_filter')}</span>
              <button
                onClick={() => setSelectedType('all')}
                className={`px-3.5 py-2 rounded-xl transition ${
                  selectedType === 'all'
                    ? 'bg-[#0F382C] text-white font-bold shadow-xs'
                    : 'bg-[#F4EFE6] text-[#0F382C] hover:bg-[#C5A880]/20 font-medium'
                }`}
              >
                {t('all_articles')} ({articles.length})
              </button>
              <button
                onClick={() => setSelectedType('خواطر ابن بيضاء')}
                className={`px-3.5 py-2 rounded-xl transition ${
                  selectedType === 'خواطر ابن بيضاء'
                    ? 'bg-[#0F382C] text-white font-bold shadow-xs'
                    : 'bg-[#F4EFE6] text-[#0F382C] hover:bg-[#C5A880]/20 font-medium'
                }`}
              >
                {translateArticleType('خواطر ابن بيضاء')}
              </button>
              <button
                onClick={() => setSelectedType('بحث أكاديمي')}
                className={`px-3.5 py-2 rounded-xl transition ${
                  selectedType === 'بحث أكاديمي'
                    ? 'bg-[#0F382C] text-white font-bold shadow-xs'
                    : 'bg-[#F4EFE6] text-[#0F382C] hover:bg-[#C5A880]/20 font-medium'
                }`}
              >
                {translateArticleType('بحث أكاديمي')}
              </button>
              <button
                onClick={() => setSelectedType('مقال عقدي')}
                className={`px-3.5 py-2 rounded-xl transition ${
                  selectedType === 'مقال عقدي'
                    ? 'bg-[#0F382C] text-white font-bold shadow-xs'
                    : 'bg-[#F4EFE6] text-[#0F382C] hover:bg-[#C5A880]/20 font-medium'
                }`}
              >
                {translateArticleType('مقال عقدي')}
              </button>
            </div>
          </div>

          {/* Articles Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-10">
            {filteredArticles.map(art => {
              const isKhatira = art.type === 'خواطر ابن بيضاء';

              return (
                <div
                  key={art.id}
                  className="bg-white rounded-3xl border border-[#E8DCC9] shadow-[0_2px_12px_-2px_rgba(15,56,44,0.04)] hover:shadow-lg hover:border-[#0F382C]/40 transition flex flex-col justify-between p-7 sm:p-8 group"
                >
                  <div>
                    {/* Header line */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span
                        className={`text-[11px] font-readex font-semibold px-2.5 py-0.5 rounded-full border ${
                          isKhatira
                            ? 'bg-amber-50 text-amber-900 border-amber-200'
                            : 'bg-emerald-50 text-emerald-900 border-emerald-200'
                        }`}
                      >
                        {translateArticleType(art.type)}
                      </span>
                      <span className="text-xs text-[#A58455] font-readex flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{art.date}</span>
                      </span>
                    </div>

                    {/* Title */}
                    <h3
                      onClick={() => setReadingArticle(art)}
                      className="font-amiri font-bold text-2xl text-[#0F382C] mb-2 group-hover:text-[#164E3D] cursor-pointer transition"
                    >
                      {art.title}
                    </h3>

                    {/* Summary */}
                    <p className="font-naskh text-sm text-[#1E1E1E]/80 leading-relaxed line-clamp-3 mb-4">
                      {art.summary || art.content.slice(0, 160) + '...'}
                    </p>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1 mb-4">
                      {art.tags.slice(0, 3).map(tag => (
                        <span
                          key={tag}
                          className="text-[10px] font-readex px-2 py-0.5 rounded bg-[#FDFBF7] border border-[#C5A880]/30 text-[#A58455]"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Actions footer */}
                  <div className="pt-4 border-t border-[#C5A880]/20 flex items-center justify-between text-xs font-readex">
                    <button
                      onClick={() => setReadingArticle(art)}
                      className="text-[#0F382C] hover:underline font-bold flex items-center gap-1"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>{t('read_full')}</span>
                    </button>

                    <button
                      onClick={() => handleCopyContent(art)}
                      className="p-1.5 rounded-lg text-[#A58455] hover:bg-[#F4EFE6] hover:text-[#0F382C] transition"
                      title={t('copy_full_article')}
                    >
                      {copiedId === art.id ? (
                        <Check className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
