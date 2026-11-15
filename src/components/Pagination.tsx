import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  className = ''
}) => {
  const { lang, dir } = useLanguage();
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  if (totalPages <= 1) return null;

  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const startItem = (safePage - 1) * pageSize + 1;
  const endItem = Math.min(safePage * pageSize, totalItems);

  // Build smart page numbers array with ellipses
  const getPageNumbers = (): (number | 'ellipsis-left' | 'ellipsis-right')[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages: (number | 'ellipsis-left' | 'ellipsis-right')[] = [1];

    if (safePage > 3) {
      pages.push('ellipsis-left');
    }

    const start = Math.max(2, safePage - 1);
    const end = Math.min(totalPages - 1, safePage + 1);
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (safePage < totalPages - 2) {
      pages.push('ellipsis-right');
    }

    pages.push(totalPages);
    return pages;
  };

  const handleSelect = (page: number) => {
    if (page < 1 || page > totalPages || page === safePage) return;
    onPageChange(page);
  };

  const PrevIcon = dir === 'rtl' ? ChevronRight : ChevronLeft;
  const NextIcon = dir === 'rtl' ? ChevronLeft : ChevronRight;

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-[#E8DCC9] font-readex ${className}`}
    >
      {/* Count indicator */}
      <div className="text-xs text-[#8C6D3B] font-medium">
        {lang === 'ar'
          ? `عرض ${startItem}–${endItem} من أصل ${totalItems}`
          : `Showing ${startItem}–${endItem} of ${totalItems}`}
      </div>

      {/* Page buttons */}
      <nav
        aria-label={lang === 'ar' ? 'التنقل بين الصفحات' : 'Pagination'}
        className="flex flex-wrap items-center justify-center gap-1.5"
      >
        <button
          type="button"
          onClick={() => handleSelect(safePage - 1)}
          disabled={safePage === 1}
          aria-label={lang === 'ar' ? 'الصفحة السابقة' : 'Previous page'}
          className="min-w-[38px] h-9 px-2.5 rounded-xl border border-[#E0D4C1] bg-white text-[#0F382C] hover:bg-[#F4EFE6] disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-1 text-xs font-semibold transition"
        >
          <PrevIcon className="w-4 h-4" />
          <span className="hidden xs:inline">{lang === 'ar' ? 'السابق' : 'Prev'}</span>
        </button>

        {getPageNumbers().map((item) => {
          if (item === 'ellipsis-left' || item === 'ellipsis-right') {
            return (
              <span
                key={item}
                className="px-2 text-xs text-[#A58455] select-none"
              >
                ...
              </span>
            );
          }

          const isActive = item === safePage;
          return (
            <button
              key={item}
              type="button"
              onClick={() => handleSelect(item)}
              aria-current={isActive ? 'page' : undefined}
              className={`min-w-[38px] h-9 px-2.5 rounded-xl text-xs font-latin font-bold transition ${
                isActive
                  ? 'bg-[#0F382C] text-white shadow-xs border border-[#0F382C]'
                  : 'bg-white text-[#0F382C] border border-[#E0D4C1] hover:bg-[#F4EFE6]'
              }`}
            >
              {item}
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => handleSelect(safePage + 1)}
          disabled={safePage === totalPages}
          aria-label={lang === 'ar' ? 'الصفحة التالية' : 'Next page'}
          className="min-w-[38px] h-9 px-2.5 rounded-xl border border-[#E0D4C1] bg-white text-[#0F382C] hover:bg-[#F4EFE6] disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-1 text-xs font-semibold transition"
        >
          <span className="hidden xs:inline">{lang === 'ar' ? 'التالي' : 'Next'}</span>
          <NextIcon className="w-4 h-4" />
        </button>
      </nav>
    </div>
  );
};
