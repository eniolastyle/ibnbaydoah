import React, { useState } from 'react';
import { Book } from '../types';
import { useLanguage } from '../context/LanguageContext';
import {
  BookOpen,
  Search,
  Filter,
  Download,
  MessageCircle,
  Clock,
  Layers,
  Sparkles
} from 'lucide-react';

interface LibraryExplorerProps {
  books: Book[];
  categories: string[];
  whatsappNumber: string;
}

export const LibraryExplorer: React.FC<LibraryExplorerProps> = ({
  books,
  categories,
  whatsappNumber
}) => {
  const { lang, t, translateCategory, translateStatus } = useLanguage();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'مطبوع' | 'مخطوط'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeBook, setActiveBook] = useState<Book | null>(null);

  const filteredBooks = books.filter(book => {
    const matchesCategory =
      selectedCategory === 'all' || book.category === selectedCategory;
    const matchesStatus =
      statusFilter === 'all' || book.status === statusFilter;
    const matchesSearch =
      !searchQuery.trim() ||
      book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (book.subtitle && book.subtitle.toLowerCase().includes(searchQuery.toLowerCase())) ||
      book.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      book.category.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesCategory && matchesStatus && matchesSearch;
  });

  const generateWhatsAppLink = (book: Book) => {
    const msg = encodeURIComponent(
      `As-Salāmu ‘alaykum wa Raḥmatullāhi wa Barakātuh, Ustādh Abu Sa'eed.\nI would like to inquire about your treatise: «${book.title}» (${book.category} - ${book.status}).\nMay Allah bless you and benefit through your knowledge.`
    );
    return `https://wa.me/${whatsappNumber.replace(/[^0-9]/g, '')}?text=${msg}`;
  };

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'العقيدة والتوحيد':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'الفقه وأصوله':
        return 'bg-amber-50 text-amber-900 border-amber-200';
      case 'الحديث وعلومه':
        return 'bg-blue-50 text-blue-900 border-blue-200';
      case 'النحو والصرف':
        return 'bg-emerald-50 text-[#0F382C] border-[#0F382C]/30';
      case 'الأدب والبلاغة واللغة':
        return 'bg-purple-50 text-purple-900 border-purple-200';
      case 'التفسير وعلوم القرآن':
        return 'bg-teal-50 text-teal-900 border-teal-200';
      default:
        return 'bg-stone-50 text-stone-800 border-stone-200';
    }
  };

  return (
    <div className="space-y-10 sm:space-y-16">
      {/* Explorer Header */}
      <div className="bg-[#0F382C] text-[#FDFBF7] rounded-3xl p-8 sm:p-12 relative overflow-hidden shadow-xl">
        <div className="absolute inset-0 bg-arabesque-dark opacity-30 pointer-events-none" />
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#C5A880]/20 border border-[#C5A880]/40 text-[#DFC7A5] text-xs font-readex">
            <BookOpen className="w-3.5 h-3.5" />
            <span className="font-semibold">{t('library_header_badge')}</span>
          </div>
          <h2 className="font-amiri font-bold text-3xl sm:text-4xl text-[#FDFBF7]">
            {t('library_header_title')}
          </h2>
          <p className="font-naskh text-[#DFC7A5]/90 text-sm sm:text-base leading-[2.1]">
            {t('library_header_desc')}
          </p>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="bg-white rounded-3xl border border-[#E8DCC9] p-6 sm:p-8 shadow-xs space-y-6">
        {/* Search Bar */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={t('search_placeholder')}
            className="w-full pl-11 pr-4 py-3.5 text-xs sm:text-sm rounded-xl border border-[#E0D4C1] bg-[#FDFBF7] focus:outline-none focus:ring-2 focus:ring-[#0F382C]/30 focus:border-[#0F382C] text-[#1E1E1E] font-readex"
          />
          <Search className="w-4 h-4 text-[#A58455] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Science Category Badges Filter (Al-Funun) */}
        <div>
          <div className="text-xs text-[#8C6D3B] font-readex font-bold mb-3 flex items-center gap-2">
            <Filter className="w-3.5 h-3.5" />
            <span>{t('filter_by_science')}</span>
          </div>
          <div className="flex flex-wrap gap-2 sm:gap-2.5">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3.5 py-2 rounded-xl text-xs font-readex font-medium transition ${
                selectedCategory === 'all'
                  ? 'bg-[#0F382C] text-white shadow-xs font-bold'
                  : 'bg-[#F4EFE6] text-[#0F382C] hover:bg-[#C5A880]/20'
              }`}
            >
              {t('all_categories')} ({books.length})
            </button>
            {categories.map(cat => {
              const count = books.filter(b => b.category === cat).length;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-readex font-medium transition ${
                    selectedCategory === cat
                      ? 'bg-[#0F382C] text-white shadow-xs font-bold'
                      : 'bg-[#F4EFE6] text-[#0F382C] hover:bg-[#C5A880]/20'
                  }`}
                >
                  {translateCategory(cat)} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Status Filter (Printed vs Manuscript) */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-[#E8DCC9] text-xs font-readex">
          <div className="flex items-center gap-3">
            <span className="text-[#8C6D3B] font-bold">{t('filter_by_status')}:</span>
            <div className="inline-flex rounded-xl border border-[#E0D4C1] bg-[#FDFBF7] p-1">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs transition ${
                  statusFilter === 'all'
                    ? 'bg-[#0F382C] text-white font-bold shadow-xs'
                    : 'text-[#1E1E1E] hover:bg-[#F4EFE6]'
                }`}
              >
                {t('all_statuses')}
              </button>
              <button
                onClick={() => setStatusFilter('مطبوع')}
                className={`px-3 py-1.5 rounded-lg text-xs transition ${
                  statusFilter === 'مطبوع'
                    ? 'bg-[#0F382C] text-white font-bold shadow-xs'
                    : 'text-[#1E1E1E] hover:bg-[#F4EFE6]'
                }`}
              >
                {t('printed')}
              </button>
              <button
                onClick={() => setStatusFilter('مخطوط')}
                className={`px-3 py-1.5 rounded-lg text-xs transition ${
                  statusFilter === 'مخطوط'
                    ? 'bg-[#0F382C] text-white font-bold shadow-xs'
                    : 'text-[#1E1E1E] hover:bg-[#F4EFE6]'
                }`}
              >
                {t('manuscript')}
              </button>
            </div>
          </div>

          <div className="text-xs text-[#8C6D3B] font-medium">
            {t('showing_count')} {filteredBooks.length} {t('of_total')} {books.length} {t('books_unit')}
          </div>
        </div>
      </div>

      {/* Books Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 sm:gap-10">
        {filteredBooks.length === 0 ? (
          <div className="col-span-full bg-white rounded-3xl p-16 text-center border border-[#E8DCC9] shadow-xs">
            <BookOpen className="w-12 h-12 text-[#C5A880] mx-auto mb-4 opacity-60" />
            <h3 className="font-amiri font-bold text-2xl text-[#0F382C] mb-2">
              {t('no_books_found')}
            </h3>
            <p className="text-xs text-[#8C6D3B] font-readex">
              {t('no_books_found_desc')}
            </p>
          </div>
        ) : (
          filteredBooks.map(book => {
            const isPrinted = book.status === 'مطبوع';

            return (
              <div
                key={book.id}
                className="bg-white rounded-3xl border border-[#E8DCC9] shadow-[0_2px_12px_-2px_rgba(15,56,44,0.04)] hover:shadow-lg hover:border-[#0F382C]/40 transition-all duration-300 flex flex-col justify-between overflow-hidden group"
              >
                {/* Book Card Top Banner */}
                <div className="p-7 sm:p-8 pb-4">
                  {/* Category & Status Badges */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span
                      className={`text-[11px] font-readex font-medium px-2.5 py-1 rounded-md border ${getCategoryColor(
                        book.category
                      )}`}
                    >
                      {translateCategory(book.category)}
                    </span>

                    <span
                      className={`text-[11px] font-readex font-bold px-2 py-0.5 rounded border ${
                        isPrinted
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : 'bg-amber-100 text-amber-800 border-amber-300'
                      }`}
                    >
                      {translateStatus(book.status)}
                    </span>
                  </div>

                  {/* Title & Subtitle */}
                  <h3 className="font-amiri font-bold text-2xl text-[#0F382C] mb-1.5 group-hover:text-[#164E3D] transition">
                    {book.title}
                  </h3>

                  {book.collaborative && (
                    <div className="text-[11px] font-readex text-[#A58455] font-semibold mb-2 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-[#C5A880]" />
                      <span>{lang === 'ar' ? (book.collaborators || 'بالمشاركة العلمية') : 'Collaborative Scholarly Work'}</span>
                    </div>
                  )}

                  {book.subtitle && (
                    <p className="text-xs font-readex text-[#A58455] mb-3 line-clamp-1">
                      {book.subtitle}
                    </p>
                  )}

                  {/* Description */}
                  <p className="font-naskh text-sm text-[#2D332F] leading-[2.1] line-clamp-3 mb-5">
                    {book.description}
                  </p>

                  {/* Book Metadata details */}
                  <div className="flex items-center gap-4 text-xs font-readex text-[#6B7570] pt-4 border-t border-[#E8DCC9]">
                    <div className="flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-[#A58455]" />
                      <span>{book.pages} {t('pages')}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#A58455]" />
                      <span>{book.year}</span>
                    </div>
                  </div>
                </div>

                {/* Card Actions Bottom */}
                <div className="p-4 sm:p-5 bg-[#FAF6EE] border-t border-[#E8DCC9] flex items-center justify-between gap-3">
                  <button
                    onClick={() => setActiveBook(book)}
                    className="text-xs font-readex text-[#0F382C] hover:underline font-semibold flex items-center gap-1"
                  >
                    <span>{t('treatise_details')}</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    {book.hasPdf ? (
                      <a
                        href={book.downloadUrl || '#'}
                        onClick={e => {
                          if (book.downloadUrl === '#') {
                            e.preventDefault();
                            alert(lang === 'ar'
                              ? `سيتم إتاحة النسخة الرقمية لكتاب «${book.title}» قريباً بإذن الله`
                              : `The digital PDF edition for "${book.title}" will be released shortly inshā'Allāh`);
                          }
                        }}
                        className="px-3 py-1.5 rounded-lg bg-[#0F382C] text-[#FDFBF7] hover:bg-[#164E3D] text-xs font-readex flex items-center gap-1 shadow-sm transition"
                      >
                        <Download className="w-3.5 h-3.5 text-[#DFC7A5]" />
                        <span>{t('download_pdf')}</span>
                      </a>
                    ) : (
                      <a
                        href={generateWhatsAppLink(book)}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-lg bg-[#C5A880]/20 hover:bg-[#C5A880]/40 text-[#0F382C] border border-[#C5A880]/50 text-xs font-readex flex items-center gap-1 transition"
                        title={t('request_manuscript')}
                      >
                        <MessageCircle className="w-3.5 h-3.5 text-emerald-700" />
                        <span>{lang === 'ar' ? 'طلب المخطوط' : 'Request Manuscript'}</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Book Detailed Modal */}
      {activeBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#FDFBF7] rounded-3xl max-w-2xl w-full border-2 border-[#C5A880] shadow-2xl overflow-hidden p-6 sm:p-8">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <span className="text-xs font-readex px-2.5 py-1 rounded bg-[#0F382C]/10 text-[#0F382C] border border-[#C5A880]/40 font-semibold">
                  {translateCategory(activeBook.category)} • {translateStatus(activeBook.status)}
                </span>
                <h3 className="font-amiri font-bold text-2xl sm:text-3xl text-[#0F382C] mt-2">
                  {activeBook.title}
                </h3>
                {activeBook.subtitle && (
                  <p className="text-sm text-[#A58455] font-readex mt-1">
                    {activeBook.subtitle}
                  </p>
                )}
              </div>
              <button
                onClick={() => setActiveBook(null)}
                className="w-8 h-8 rounded-full bg-[#F4EFE6] text-[#0F382C] hover:bg-[#C5A880]/30 flex items-center justify-center text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 my-6 font-naskh text-[#1E1E1E]">
              <div className="p-4 rounded-xl bg-white border border-[#C5A880]/30 text-sm leading-relaxed">
                {activeBook.description}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-readex">
                <div className="p-3 rounded-lg bg-[#F4EFE6] text-center">
                  <span className="text-[#A58455] block">{t('pages')}</span>
                  <span className="font-bold text-[#0F382C] text-sm">{activeBook.pages} {t('pages')}</span>
                </div>
                <div className="p-3 rounded-lg bg-[#F4EFE6] text-center">
                  <span className="text-[#A58455] block">{t('year')}</span>
                  <span className="font-bold text-[#0F382C] text-sm">{activeBook.year}</span>
                </div>
                <div className="p-3 rounded-lg bg-[#F4EFE6] text-center col-span-2 sm:col-span-1">
                  <span className="text-[#A58455] block">{t('filter_by_status')}</span>
                  <span className="font-bold text-[#0F382C] text-sm">{translateStatus(activeBook.status)}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-[#C5A880]/30 font-readex text-xs">
              <button
                onClick={() => setActiveBook(null)}
                className="px-4 py-2 rounded-xl text-[#1E1E1E] hover:bg-[#F4EFE6]"
              >
                {t('close_modal')}
              </button>
              <a
                href={generateWhatsAppLink(activeBook)}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2.5 rounded-xl bg-[#0F382C] text-white flex items-center gap-1.5 shadow hover:bg-[#164E3D]"
              >
                <MessageCircle className="w-4 h-4 text-[#DFC7A5]" />
                <span>{t('whatsapp_request')}</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
