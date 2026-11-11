import React, { useState, useEffect } from 'react';
import { IslamicSeal } from './IslamicSeal';
import { useLanguage } from '../context/LanguageContext';
import {
  BookOpen,
  Headphones,
  Feather,
  FileText,
  Calendar,
  MessageSquare,
  Lock,
  Menu,
  X,
  Languages,
  Search,
  Sparkles,
  MapPin
} from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenSearch?: () => void;
  duaHeader?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenSearch,
  duaHeader = 'رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ'
}) => {
  const { lang, toggleLanguage } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile drawer when resizing to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Prevent background scroll when mobile drawer is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [mobileMenuOpen]);

  // Clean, focused navigation tabs
  const navItems = [
    { id: 'home', labelAr: 'الرئيسية', labelEn: 'Home', icon: Sparkles },
    { id: 'library', labelAr: 'المكتبة', labelEn: 'Library', icon: BookOpen },
    { id: 'audios', labelAr: 'الصوتيات', labelEn: 'Audios', icon: Headphones },
    { id: 'poetry', labelAr: 'الديوان', labelEn: 'Poetry', icon: Feather },
    { id: 'articles', labelAr: 'الخواطر', labelEn: 'Reflections', icon: FileText },
    { id: 'schedule', labelAr: 'الدروس', labelEn: 'Schedule', icon: Calendar },
  ];

  const handleNavClick = (id: string) => {
    setActiveTab(id);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const displayedDua =
    lang === 'ar'
      ? `«${duaHeader}»`
      : '“Our Lord, grant us good in this world and good in the Hereafter, and protect us from the Fire.”';

  return (
    <header className="sticky top-0 z-40 bg-[#FDFBF7]/95 backdrop-blur-md border-b border-[#E8DCC9] shadow-xs">
      {/* 1. Serene Top Du'ā Ribbon - Single-line, perfectly balanced */}
      <div className="bg-[#0B2C23] text-[#DFC7A5] py-2 px-3 sm:px-4 border-b border-[#C5A880]/20 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-arabesque-dark opacity-25 pointer-events-none" />
        <div className="max-w-5xl mx-auto flex items-center justify-center relative z-10">
          <p className="text-[11px] sm:text-xs md:text-sm font-medium tracking-wide text-[#E8D7BE] select-text font-amiri text-center truncate">
            <span className="text-[#C5A880]/70 mx-1.5">۞</span>
            {displayedDua}
            <span className="text-[#C5A880]/70 mx-1.5">۞</span>
          </p>
        </div>
      </div>

      {/* 2. Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18 sm:h-20 gap-2 sm:gap-4">
          {/* Brand & Seal - Mobile-Optimized */}
          <div
            onClick={() => handleNavClick('home')}
            className="flex items-center gap-2.5 sm:gap-3.5 cursor-pointer group select-none min-w-0"
          >
            {/* Seal with responsive size */}
            <div className="shrink-0">
              <IslamicSeal size="sm" variant="emerald" />
            </div>

            <div className="flex flex-col min-w-0">
              <span className="font-amiri font-bold text-base sm:text-xl text-[#0F382C] tracking-tight group-hover:text-[#185341] transition truncate">
                {lang === 'ar' ? 'أَبُو سَعِيدٍ ابْنُ بَيْضَاءَ' : 'Ibn Baydoah'}
              </span>
              <span className="hidden sm:inline text-[11px] text-[#9A7947] font-readex font-medium truncate max-w-[220px] lg:max-w-none">
                {lang === 'ar' ? 'طالب علم وباحث في العلوم الشرعية واللغوية' : 'Classical Islamic & Linguistic Studies'}
              </span>
            </div>
          </div>

          {/* Desktop Nav Items - Clean, uncluttered tabs */}
          <nav className="hidden lg:flex items-center gap-1.5 xl:gap-2">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs xl:text-sm font-readex transition-all duration-200 whitespace-nowrap ${
                    isActive
                      ? 'bg-[#0F382C] text-white shadow-xs font-semibold'
                      : 'text-[#2D312E] hover:text-[#0F382C] hover:bg-[#F2ECE1] font-medium'
                  }`}
                >
                  {lang === 'ar' ? item.labelAr : item.labelEn}
                </button>
              );
            })}
          </nav>

          {/* Right Action Utilities */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Quick Ask CTA Button (Desktop & Tablet) */}
            <button
              onClick={() => handleNavClick('contact')}
              className={`hidden md:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-readex font-semibold transition border shadow-xs ${
                activeTab === 'contact'
                  ? 'bg-[#0F382C] text-white border-[#0F382C]'
                  : 'bg-[#C5A880]/15 text-[#0F382C] border-[#C5A880]/40 hover:bg-[#C5A880]/25'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5 text-[#A58455]" />
              <span>{lang === 'ar' ? 'طرح سؤال' : 'Ask Question'}</span>
            </button>

            {/* Quick Search */}
            {onOpenSearch && (
              <button
                onClick={onOpenSearch}
                className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl text-[#0F382C] hover:bg-[#F2ECE1] border border-[#E0D4C1] transition"
                title={lang === 'ar' ? 'بحث شامل في المنصة' : 'Search platform'}
                aria-label="Search"
              >
                <Search className="w-4 h-4" />
              </button>
            )}

            {/* Language Switcher */}
            <button
              onClick={toggleLanguage}
              className="h-9 sm:h-10 px-2.5 sm:px-3 flex items-center gap-1.5 rounded-xl border border-[#E0D4C1] bg-white text-xs font-readex text-[#0F382C] hover:bg-[#F2ECE1] transition shadow-xs"
              title="تغيير اللغة / Switch Language"
              aria-label="Toggle language"
            >
              <Languages className="w-3.5 h-3.5 text-[#A58455]" />
              <span className="font-bold text-[11px] sm:text-xs">{lang === 'ar' ? 'EN' : 'عربي'}</span>
            </button>

            {/* Discreet Admin Lock Button (Desktop) */}
            <button
              onClick={() => handleNavClick('admin')}
              className={`hidden sm:flex w-9 h-9 sm:w-10 sm:h-10 items-center justify-center rounded-xl border transition ${
                activeTab === 'admin'
                  ? 'bg-[#0F382C] text-white border-[#0F382C]'
                  : 'text-[#A58455] hover:text-[#0F382C] border-[#E0D4C1] hover:bg-[#F2ECE1]'
              }`}
              title={lang === 'ar' ? 'لوحة تحكم الإدارة' : 'Admin Portal'}
              aria-label="Admin Portal"
            >
              <Lock className="w-4 h-4" />
            </button>

            {/* Mobile Menu Button - Guaranteed Touch Target */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden w-10 h-10 flex items-center justify-center rounded-xl text-[#0F382C] hover:bg-[#F2ECE1] border border-[#E0D4C1] transition"
              title={lang === 'ar' ? 'القائمة الرئيسية' : 'Main Menu'}
              aria-label="Toggle mobile menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* 3. Full Mobile Drawer & Backdrop */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 top-[calc(theme(spacing.18)+theme(spacing.8)+1px)] sm:top-[calc(theme(spacing.20)+theme(spacing.8)+1px)] z-50 bg-[#0B2C23]/40 backdrop-blur-sm">
          <div className="bg-[#FDFBF7] border-b border-[#E8DCC9] shadow-2xl px-5 pt-3 pb-8 space-y-4 max-h-[calc(100vh-100px)] overflow-y-auto animate-fadeIn">
            <div className="space-y-1">
              <p className="text-[11px] font-readex uppercase tracking-wider text-[#A58455] px-2 py-1 font-semibold">
                {lang === 'ar' ? 'أقسام المنصة العلمية' : 'Platform Sections'}
              </p>
              {navItems.map((item) => {
                const isActive = activeTab === item.id;
                const IconComponent = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-readex transition ${
                      isActive
                        ? 'bg-[#0F382C] text-white font-bold shadow-xs'
                        : 'text-[#1E1E1E] hover:bg-[#F4EFE6] font-medium'
                    }`}
                  >
                    <IconComponent className={`w-4 h-4 ${isActive ? 'text-[#DFC7A5]' : 'text-[#A58455]'}`} />
                    <span>{lang === 'ar' ? item.labelAr : item.labelEn}</span>
                  </button>
                );
              })}
            </div>

            {/* Quick Actions in Mobile Drawer */}
            <div className="pt-3 border-t border-[#E8DCC9] space-y-2">
              <button
                onClick={() => handleNavClick('contact')}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#0F382C] text-white text-xs font-readex font-bold shadow-xs hover:bg-[#164E3D] transition"
              >
                <MessageSquare className="w-4 h-4 text-[#DFC7A5]" />
                <span>{lang === 'ar' ? 'طرح سؤال أو استفتاء شرعي' : 'Ask Scholarly Question / Inquiry'}</span>
              </button>

              <button
                onClick={() => handleNavClick('admin')}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-[#E8DCC9] bg-white text-xs font-readex text-[#7A6440] hover:bg-[#F4EFE6] transition"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>{lang === 'ar' ? 'بوابة إدارة المنصة (Admin)' : 'Admin Portal & Content Management'}</span>
              </button>
            </div>

            {/* Quick Scholar Location Note */}
            <div className="pt-2 text-center text-[11px] text-[#7A6440] font-readex flex items-center justify-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#A58455]" />
              <span>{lang === 'ar' ? 'مركز الإمام سيبويه، إلورن - نيجيريا' : 'Markaz Sībawayh, Ilorin, Nigeria'}</span>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
