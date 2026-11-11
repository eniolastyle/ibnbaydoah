import React from 'react';
import { IslamicSeal } from './IslamicSeal';
import { Profile } from '../types';
import { useLanguage } from '../context/LanguageContext';
import {
  BookOpen,
  Headphones,
  Feather,
  Calendar,
  Award,
  MapPin,
  Clock,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  MessageSquare,
  BookmarkCheck,
  Compass
} from 'lucide-react';

interface HeroProps {
  profile: Profile;
  onNavigate: (tab: string) => void;
  stats?: {
    booksCount: number;
    audiosCount: number;
    poemsCount: number;
    articlesCount: number;
  };
}

export const Hero: React.FC<HeroProps> = ({ profile, onNavigate, stats }) => {
  const { lang, t } = useLanguage();

  const ArrowIcon = lang === 'ar' ? ArrowLeft : ArrowRight;

  const displayedName =
    lang === 'ar'
      ? profile.name
      : (profile.englishName || "Abu Sa'eed Mas'uud bn Mahmood Ibn Baydoah");

  const displayedTitle =
    lang === 'ar'
      ? profile.title
      : (profile.englishTitle || "Student of Knowledge & Researcher in Shari'ah and Arabic Linguistic Sciences");

  const displayedDegree =
    lang === 'ar'
      ? profile.degree
      : (profile.englishDegree || "B.A. in Arabic Language & Islamic Studies (First Class Honours) - Bayero University Kano");

  const displayedBio =
    lang === 'ar'
      ? profile.bio
      : "A dedicated scholar and researcher specializing in classical creed (Aqeedah), prophetic traditions (Hadith), Islamic jurisprudence (Fiqh), Arabic grammar (Nahw), and linguistic sciences. Graduated from Bayero University Kano with First Class Honours. Author of over 35 treatises and research studies, over 500 daily reflections (Khawātir Ibn Baydoah), major didactic poems on Islamic pedagogy, and dozens of recorded audio courses. He conducts regular teaching circles at Markaz Al-Imām Sībawayh in Ilorin, Nigeria, alongside his global virtual academy.";

  const displayedLocation =
    lang === 'ar'
      ? profile.location
      : (profile.locationEnglish || "Markaz Al-Imām Sībawayh, Oloje Road, Ilorin, Kwara State, Nigeria");

  const displayedSchedule =
    lang === 'ar'
      ? profile.teaching_schedule
      : (profile.teachingScheduleEnglish || "Friday, Saturday, & Sunday (After 'Asr to before Maghrib)");

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#FDFBF7] via-[#F8F3EA] to-[#FDFBF7] pt-8 sm:pt-14 pb-20 sm:pb-28 border-b border-[#E8DCC9]">
      {/* Background Subtle Arabesque Texture */}
      <div className="absolute inset-0 bg-arabesque-pattern opacity-25 pointer-events-none" />

      {/* Decorative Golden Arch Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-72 bg-gradient-to-b from-[#C5A880]/15 to-transparent blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* 1. Classical Basmala & Archival Crest */}
        <div className="text-center mb-8 sm:mb-12 space-y-3">
          <p className="font-amiri text-lg sm:text-2xl text-[#A58455] font-semibold tracking-wide select-none drop-shadow-xs">
            بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
          </p>
          <div className="flex items-center justify-center gap-3">
            <span className="h-px w-12 sm:w-20 bg-gradient-to-r from-transparent to-[#C5A880]/60" />
            <span className="text-[11px] sm:text-xs font-readex uppercase tracking-widest text-[#7A6440] font-semibold">
              {lang === 'ar' ? 'الْمَنَصَّةُ الْعِلْمِيَّةُ وَالْمَوْسُوعَةُ الشَّرْعِيَّةُ الرَّسْمِيَّةُ' : 'OFFICIAL CLASSICAL ISLAMIC & LINGUISTIC SCHOLARLY PLATFORM'}
            </span>
            <span className="h-px w-12 sm:w-20 bg-gradient-to-l from-transparent to-[#C5A880]/60" />
          </div>
        </div>

        {/* 2. Main Two-Column Asymmetric Modern Layout on Desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-start mb-16 sm:mb-24">
          {/* Main Editorial Column (7 cols) */}
          <div className="lg:col-span-7 space-y-6 sm:space-y-8">
            {/* Top Academic Distinction Badge */}
            <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/90 border border-[#E0D3BE] shadow-xs text-[#0F382C] text-xs sm:text-sm font-readex">
              <Award className="w-4 h-4 text-[#A58455] shrink-0" />
              <span className="font-semibold truncate max-w-[280px] sm:max-w-none">{displayedDegree}</span>
            </div>

            {/* Scholar Title Lockup with Distinctive Classical Fonts */}
            <div className="space-y-3">
              <h1 className="font-amiri font-bold text-3xl sm:text-5xl lg:text-6xl text-[#0F382C] leading-[1.25] tracking-tight drop-shadow-xs">
                {displayedName}
              </h1>

              <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm font-readex text-[#8C6D3B]">
                <span className="font-cinzel tracking-wider font-semibold uppercase">
                  {lang === 'ar' ? profile.englishName : "Abu Sa'eed Mas'uud bn Mahmood"}
                </span>
                <span>•</span>
                <span className="font-medium">
                  {lang === 'ar' ? 'حَفِظَهُ اللَّهُ وَنَفَعَ بِعُلُومِهِ' : 'May Allah preserve him'}
                </span>
              </div>
            </div>

            {/* Scholarly Role & Focus */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white/80 border border-[#E8DCC9] shadow-xs">
              <p className="font-readex text-sm sm:text-base text-[#1E2420] font-semibold leading-relaxed">
                {displayedTitle}
              </p>
            </div>

            {/* Scholarly Bio Paragraph with generous leading */}
            <p className="font-naskh text-[#343C37] text-base sm:text-lg leading-[2.1] sm:leading-[2.3] text-justify sm:text-start">
              {displayedBio}
            </p>

            {/* Primary Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 pt-2">
              <button
                onClick={() => onNavigate('library')}
                className="flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-[#0F382C] text-[#FDFBF7] font-readex text-xs sm:text-sm font-bold shadow-sm hover:bg-[#164E3D] hover:shadow-md transition border border-[#0F382C] group"
              >
                <BookOpen className="w-4 h-4 text-[#DFC7A5]" />
                <span>{t('explore_library')}</span>
                <ArrowIcon className="w-4 h-4 text-[#DFC7A5] group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform" />
              </button>

              <button
                onClick={() => onNavigate('audios')}
                className="flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-[#C5A880] text-[#0F382C] font-readex text-xs sm:text-sm font-bold shadow-xs hover:bg-[#DFC7A5] transition group"
              >
                <Headphones className="w-4 h-4" />
                <span>{t('listen_audios')}</span>
              </button>

              <button
                onClick={() => onNavigate('poetry')}
                className="flex items-center gap-2 px-5 py-3.5 rounded-xl bg-white text-[#0F382C] font-readex text-xs sm:text-sm font-semibold border border-[#E0D4C1] hover:bg-[#F2ECE1] transition shadow-xs"
              >
                <Feather className="w-4 h-4 text-[#A58455]" />
                <span>{t('read_poetry')}</span>
              </button>

              <button
                onClick={() => onNavigate('contact')}
                className="flex items-center gap-2 px-5 py-3.5 rounded-xl bg-white text-[#7A6440] font-readex text-xs sm:text-sm font-semibold border border-[#E0D4C1] hover:bg-[#F2ECE1] transition shadow-xs"
              >
                <MessageSquare className="w-4 h-4 text-[#A58455]" />
                <span>{lang === 'ar' ? 'طرح سؤال' : 'Ask Question'}</span>
              </button>
            </div>
          </div>

          {/* Curated Showcase Spotlight Column (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Feature Card 1: Pearl from the Scholar's Didactic Poetry */}
            <div className="relative rounded-3xl bg-gradient-to-b from-white to-[#FAF6EE] border border-[#E0D3BE] p-6 sm:p-8 shadow-sm overflow-hidden">
              {/* Corner Ornamental Accents */}
              <div className="absolute top-3 left-3 text-[#C5A880]/40 font-amiri text-lg select-none">۞</div>
              <div className="absolute top-3 right-3 text-[#C5A880]/40 font-amiri text-lg select-none">۞</div>
              <div className="absolute bottom-3 left-3 text-[#C5A880]/40 font-amiri text-lg select-none">۞</div>
              <div className="absolute bottom-3 right-3 text-[#C5A880]/40 font-amiri text-lg select-none">۞</div>

              <div className="relative z-10 space-y-4">
                <div className="flex items-center justify-between border-b border-[#E8DCC9] pb-3">
                  <div className="flex items-center gap-2 text-xs font-readex font-bold text-[#0F382C]">
                    <Feather className="w-4 h-4 text-[#A58455]" />
                    <span>{lang === 'ar' ? 'دُرَّةٌ مِنْ مَنْظُومَاتِ الشَّيْخِ' : 'PEARL FROM HIS DIDACTIC POETRY'}</span>
                  </div>
                  <span className="text-[11px] font-readex text-[#8C6D3B] font-semibold">
                    {lang === 'ar' ? 'بحر البسيط' : 'Al-Basīṭ Meter'}
                  </span>
                </div>

                <div className="space-y-2">
                  <h4 className="font-amiri font-bold text-lg text-[#0F382C]">
                    {lang === 'ar' ? 'مِنْ مَنْظُومَةِ «تَعْظِيمِ الْعِلْمِ» (٦٠٠ بَيْتٍ)' : 'From the Poem on "Ta‘ẓīm al-‘Ilm" (600 Verses)'}
                  </h4>
                  <p className="text-xs text-[#7A6440] font-readex">
                    {lang === 'ar' ? 'في آداب الطلب وسبل تحصيل العلوم وضبط الأصول:' : 'On the manners of seeking knowledge and master discipline:'}
                  </p>
                </div>

                {/* Two-hemistich classical verses display */}
                <div dir="rtl" className="bg-[#0F382C] text-[#FDFBF7] p-5 rounded-2xl shadow-inner space-y-3 font-amiri text-base sm:text-lg text-center leading-loose border border-[#C5A880]/40">
                  <p className="border-b border-[#C5A880]/20 pb-2">
                    «العِلْمُ يَرْفَعُ بَيْتًا لَا عِمَادَ لَهُ ... وَالجَهْلُ يَهْدِمُ بَيْتَ العِزِّ وَالشَّرَفِ»
                  </p>
                  <p className="text-[#DFC7A5]">
                    «وَحِلْيَةُ الطَّالِبِ التَّعْظِيمُ لِلأَثَرِ ... مَعَ التَّقَى وَصَفَاءِ القَلْبِ فِي السَّحَرِ»
                  </p>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button
                    onClick={() => onNavigate('poetry')}
                    className="text-xs font-readex font-bold text-[#0F382C] hover:text-[#164E3D] flex items-center gap-1.5 transition"
                  >
                    <span>{lang === 'ar' ? 'قراءة المنظومة كاملة' : 'Read Full Poem in Diwan'}</span>
                    <ArrowIcon className="w-3.5 h-3.5" />
                  </button>

                  <span className="text-[11px] text-[#8C6D3B] font-readex">
                    {lang === 'ar' ? '٦٠٠ بيت محرر' : '600 edited verses'}
                  </span>
                </div>
              </div>
            </div>

            {/* Feature Card 2: Physical Venue & Schedule */}
            <div className="rounded-3xl bg-white border border-[#E0D3BE] p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2 text-xs font-readex font-bold text-[#0F382C] border-b border-[#E8DCC9] pb-3">
                <Compass className="w-4 h-4 text-[#A58455]" />
                <span>{lang === 'ar' ? 'مَقَرُّ الدَّرْسِ وَالْمَجَالِسِ الْحُضُورِيَّةِ' : 'PHYSICAL TEACHING CIRCLE'}</span>
              </div>

              <div className="space-y-3 text-xs sm:text-sm font-readex">
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-[#A58455] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-[#0F382C] block">
                      {lang === 'ar' ? 'مركز الإمام سيبويه' : 'Markaz Al-Imām Sībawayh'}
                    </span>
                    <span className="text-[#6A5A40] text-xs">
                      {displayedLocation}
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Clock className="w-4 h-4 text-[#A58455] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-[#0F382C] block">
                      {lang === 'ar' ? 'المواعيد الأسبوعية' : 'Weekly Schedule'}
                    </span>
                    <span className="text-[#6A5A40] text-xs">
                      {displayedSchedule}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-[#E8DCC9]">
                <button
                  onClick={() => onNavigate('schedule')}
                  className="w-full py-2.5 rounded-xl bg-[#F4EFE6] hover:bg-[#EAE2D3] text-[#0F382C] text-xs font-readex font-bold text-center transition flex items-center justify-center gap-1.5"
                >
                  <Calendar className="w-3.5 h-3.5 text-[#A58455]" />
                  <span>{lang === 'ar' ? 'تفاصيل الحلقات والأكاديمية الافتراضية' : 'View Schedule & Virtual Academy'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Four Core Scholarly Pillars / Key Metrics with Spacious Luxury Math */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 lg:gap-8 max-w-6xl mx-auto">
          <div
            onClick={() => onNavigate('library')}
            className="p-6 sm:p-8 rounded-3xl bg-white border border-[#E8DCC9] shadow-[0_2px_12px_-2px_rgba(15,56,44,0.04)] hover:shadow-lg hover:border-[#0F382C]/40 transition text-center cursor-pointer group"
          >
            <div className="font-amiri font-bold text-4xl sm:text-5xl text-[#0F382C] group-hover:scale-105 transition-transform mb-2">
              {t('metrics_books_num')}
            </div>
            <div className="text-xs sm:text-sm font-readex text-[#8C6D3B] font-bold">
              {t('metrics_books_label')}
            </div>
            <div className="text-[11px] sm:text-xs text-[#5A635E] font-readex mt-1.5">
              {t('metrics_books_desc')}
            </div>
          </div>

          <div
            onClick={() => onNavigate('articles')}
            className="p-6 sm:p-8 rounded-3xl bg-white border border-[#E8DCC9] shadow-[0_2px_12px_-2px_rgba(15,56,44,0.04)] hover:shadow-lg hover:border-[#0F382C]/40 transition text-center cursor-pointer group"
          >
            <div className="font-amiri font-bold text-4xl sm:text-5xl text-[#0F382C] group-hover:scale-105 transition-transform mb-2">
              {t('metrics_reflections_num')}
            </div>
            <div className="text-xs sm:text-sm font-readex text-[#8C6D3B] font-bold">
              {t('metrics_reflections_label')}
            </div>
            <div className="text-[11px] sm:text-xs text-[#5A635E] font-readex mt-1.5">
              {t('metrics_reflections_desc')}
            </div>
          </div>

          <div
            onClick={() => onNavigate('poetry')}
            className="p-6 sm:p-8 rounded-3xl bg-white border border-[#E8DCC9] shadow-[0_2px_12px_-2px_rgba(15,56,44,0.04)] hover:shadow-lg hover:border-[#0F382C]/40 transition text-center cursor-pointer group"
          >
            <div className="font-amiri font-bold text-4xl sm:text-5xl text-[#0F382C] group-hover:scale-105 transition-transform mb-2">
              {t('metrics_poetry_num')}
            </div>
            <div className="text-xs sm:text-sm font-readex text-[#8C6D3B] font-bold">
              {t('metrics_poetry_label')}
            </div>
            <div className="text-[11px] sm:text-xs text-[#5A635E] font-readex mt-1.5">
              {t('metrics_poetry_desc')}
            </div>
          </div>

          <div
            onClick={() => onNavigate('audios')}
            className="p-6 sm:p-8 rounded-3xl bg-white border border-[#E8DCC9] shadow-[0_2px_12px_-2px_rgba(15,56,44,0.04)] hover:shadow-lg hover:border-[#0F382C]/40 transition text-center cursor-pointer group"
          >
            <div className="font-amiri font-bold text-4xl sm:text-5xl text-[#0F382C] group-hover:scale-105 transition-transform mb-2">
              {t('metrics_audios_num')}
            </div>
            <div className="text-xs sm:text-sm font-readex text-[#8C6D3B] font-bold">
              {t('metrics_audios_label')}
            </div>
            <div className="text-[11px] sm:text-xs text-[#5A635E] font-readex mt-1.5">
              {t('metrics_audios_desc')}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
