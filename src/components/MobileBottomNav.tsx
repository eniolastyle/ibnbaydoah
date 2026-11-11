import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import {
  Sparkles,
  BookOpen,
  Headphones,
  Feather,
  FileText,
  Calendar
} from 'lucide-react';

interface MobileBottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  hasAudioPlaying?: boolean;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  setActiveTab,
  hasAudioPlaying = false
}) => {
  const { lang } = useLanguage();

  const items = [
    { id: 'home', labelAr: 'الرئيسية', labelEn: 'Home', icon: Sparkles },
    { id: 'library', labelAr: 'المكتبة', labelEn: 'Library', icon: BookOpen },
    { id: 'audios', labelAr: 'الصوتيات', labelEn: 'Audios', icon: Headphones },
    { id: 'poetry', labelAr: 'الديوان', labelEn: 'Poetry', icon: Feather },
    { id: 'articles', labelAr: 'الخواطر', labelEn: 'Reflect', icon: FileText },
    { id: 'schedule', labelAr: 'الدروس', labelEn: 'Schedule', icon: Calendar },
  ];

  const handleClick = (id: string) => {
    setActiveTab(id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <nav
      aria-label="Mobile Bottom Navigation"
      className={`lg:hidden fixed left-0 right-0 z-40 bg-[#FDFBF7]/95 backdrop-blur-md border-t border-[#E8DCC9] shadow-[0_-2px_12px_rgba(0,0,0,0.06)] transition-all duration-300 pb-safe ${
        hasAudioPlaying ? 'bottom-[62px]' : 'bottom-0'
      }`}
    >
      <div className="grid grid-cols-6 items-center h-14 max-w-lg mx-auto px-1">
        {items.map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => handleClick(item.id)}
              className={`flex flex-col items-center justify-center h-full min-h-[44px] transition-colors relative ${
                isActive ? 'text-[#0F382C]' : 'text-[#7A6440] hover:text-[#0F382C]'
              }`}
            >
              <div
                className={`p-1 rounded-lg transition-transform ${
                  isActive ? 'bg-[#C5A880]/20 scale-105' : ''
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#0F382C]' : 'text-[#8A704C]'}`} />
              </div>
              <span
                className={`text-[10px] font-readex leading-tight mt-0.5 tracking-tight truncate max-w-[50px] ${
                  isActive ? 'font-bold text-[#0F382C]' : 'font-medium text-[#7A6440]'
                }`}
              >
                {lang === 'ar' ? item.labelAr : item.labelEn}
              </span>
              {isActive && (
                <span className="absolute bottom-1 w-1.5 h-1.5 bg-[#0F382C] rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
