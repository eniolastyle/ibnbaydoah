import React, { useState, useEffect } from 'react';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { AudioProvider, useAudio } from './context/AudioContext';
import { Navbar } from './components/Navbar';
import { MobileBottomNav } from './components/MobileBottomNav';
import { Hero } from './components/Hero';
import { LibraryExplorer } from './components/LibraryExplorer';
import { AudioLecturesHub } from './components/AudioLecturesHub';
import { PoetryDiwan } from './components/PoetryDiwan';
import { ArticlesSection } from './components/ArticlesSection';
import { ScheduleSection } from './components/ScheduleSection';
import { AdminDashboard } from './components/AdminDashboard';
import { AudioPlayerDock } from './components/AudioPlayerDock';
import { SearchModal } from './components/SearchModal';
import { Footer } from './components/Footer';
import {
  Profile,
  Book,
  AudioCourse,
  Poem,
  Article,
  ScheduleData,
  StudentQuestion
} from './types';

// Fallback initial data in case of immediate render before API responds
const initialProfile: Profile = {
  name: "أَبُو سَعِيدٍ مَسْعُودُ بْنُ مَحْمُودِ ابْن بَيْضَاءَ",
  englishName: "Abu Sa'eed Mas'uud bn Mahmood Ibn Baydoah",
  title: "طالب علم وباحث في العلوم الشرعية واللغوية",
  englishTitle: "Student of Knowledge & Researcher in Shari'ah and Arabic Linguistic Sciences",
  degree: "ليسانس في اللغة العربية والعلوم الإسلامية بمرتبة الشرف الأولى - جامعة بايرو كنو",
  englishDegree: "B.A. in Arabic Language & Islamic Studies (First Class Honours) - Bayero University Kano",
  dua_header: "رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ",
  whatsapp: "2348100966260",
  phoneDisplay: "+234 810 096 6260",
  location: "إلورن، ولاية كوارا، نيجيريا - شارع أولوجي، مركز الإمام سيبويه",
  locationEnglish: "Markaz Al-Imām Sībawayh, Oloje Road, Ilorin, Kwara State, Nigeria",
  teaching_schedule: "الجمعة والسبت والأحد بعد العصر إلى قبيل المغرب",
  teachingScheduleEnglish: "Friday, Saturday, & Sunday (After 'Asr to before Maghrib)",
  bio: "باحث ومصنّف معتنٍ بتحرير مسائل الاعتقاد والسنة والفقه والحديث واللغة، تخرج في جامعة بايرو كنو بمرتبة الشرف الأولى. له أكثر من ٣٥ مصنفاً بين مطبوع ومخطوط، وأكثر من ٥٠٠ خاطرة محررة، وعشرات المنظومات التعليمية والقصائد، ومئات الدروس الصوتية المسجلة.",
  telegram: "https://t.me/ibnbaydoah",
  youtube: "https://youtube.com",
  email: "ibnbaydoah@gmail.com"
};

const initialCategories = [
  "العقيدة والتوحيد",
  "الفقه وأصوله",
  "الحديث وعلومه",
  "التفسير وعلوم القرآن",
  "النحو والصرف",
  "الأدب والبلاغة واللغة"
];

function MainContent() {
  const { lang, t, translateCategory, translateStatus, translateMeter, translateArticleType } = useLanguage();
  const { currentTrack } = useAudio();
  const [activeTab, setActiveTab] = useState<string>('home');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Data states
  const [profile, setProfile] = useState<Profile>(initialProfile);
  const [categories, setCategories] = useState<string[]>(initialCategories);
  const [books, setBooks] = useState<Book[]>([]);
  const [audios, setAudios] = useState<AudioCourse[]>([]);
  const [poems, setPoems] = useState<Poem[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [scheduleData, setScheduleData] = useState<ScheduleData>({
    weeklyCircles: [],
    distanceAcademy: {
      name: "الأكاديمية الافتراضية للشيخ أبي سعيد ابن بيضاء",
      description: "منظومة دراسية إلكترونية متكاملة تضم طلبة العلم من داخل نيجيريا وخارجها عبر قنوات تيليجرام وغرف البث الصوتي المباشر.",
      features: [
        "بث مباشر للدروس الحضورية من مركز الإمام سيبويه بجودة صوتية عالية",
        "تفريغ الدروس والمذكرات بصيغة PDF وتوزيعها مجاناً",
        "حلقات مذاكرة وإجابة على أسئلة الطلاب أسبوعياً",
        "اختبارات مرحلية ومنح شهادات إتمام للمتون المقروءة"
      ],
      telegramLink: "https://t.me/ibnbaydoah",
      whatsappGroup: "https://wa.me/2348100966260"
    },
    announcements: []
  });
  const [questions, setQuestions] = useState<StudentQuestion[]>([]);
  const [stats, setStats] = useState({
    booksCount: 35,
    audiosCount: 40,
    poemsCount: 7,
    articlesCount: 500
  });

  const loadAllData = async () => {
    try {
      const [
        profileRes,
        booksRes,
        audiosRes,
        poemsRes,
        articlesRes,
        scheduleRes,
        questionsRes,
        statsRes
      ] = await Promise.all([
        fetch('/api/profile').then(r => r.json()).catch(() => null),
        fetch('/api/books').then(r => r.json()).catch(() => null),
        fetch('/api/audios').then(r => r.json()).catch(() => null),
        fetch('/api/poetry').then(r => r.json()).catch(() => null),
        fetch('/api/articles').then(r => r.json()).catch(() => null),
        fetch('/api/schedule').then(r => r.json()).catch(() => null),
        fetch('/api/questions').then(r => r.json()).catch(() => null),
        fetch('/api/stats').then(r => r.json()).catch(() => null)
      ]);

      if (profileRes?.data) setProfile(profileRes.data);
      if (profileRes?.categories) setCategories(profileRes.categories);
      if (booksRes?.data) setBooks(booksRes.data);
      if (audiosRes?.data) setAudios(audiosRes.data);
      if (poemsRes?.data) setPoems(poemsRes.data);
      if (articlesRes?.data) setArticles(articlesRes.data);
      if (scheduleRes?.data) setScheduleData(scheduleRes.data);
      if (questionsRes?.data) setQuestions(questionsRes.data);
      if (statsRes?.data) setStats(statsRes.data);
    } catch (err) {
      console.warn('API fetch warning, using loaded memory data:', err);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const handleNavigate = (tab: string) => {
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleQuestionSubmitted = (newQ: StudentQuestion) => {
    setQuestions(prev => [newQ, ...prev]);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FDFBF7] text-[#1E1E1E]">
      {/* Universal Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenSearch={() => setIsSearchOpen(true)}
        duaHeader={profile.dua_header}
      />

      {/* Main Body Pages View */}
      <main className="flex-1 pb-32 sm:pb-36 lg:pb-24">
        {activeTab === 'home' && (
          <div className="space-y-20 sm:space-y-28 lg:space-y-36">
            <Hero
              profile={profile}
              onNavigate={handleNavigate}
              stats={stats}
            />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-20 sm:space-y-28">
              {/* Featured Books Preview on Home */}
              <section className="space-y-8">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#E8DCC9] pb-6">
                  <div>
                    <span className="text-xs font-readex text-[#8C6D3B] font-bold block mb-1.5 uppercase tracking-wider">
                      {t('featured_books_sub')}
                    </span>
                    <h2 className="font-amiri font-bold text-3xl sm:text-4xl text-[#0F382C]">
                      {t('featured_books_title')}
                    </h2>
                  </div>
                  <button
                    onClick={() => handleNavigate('library')}
                    className="text-xs sm:text-sm font-readex text-[#0F382C] hover:text-[#164E3D] font-bold hover:underline"
                  >
                    {t('view_all_books')} ({books.length}) ←
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-10">
                  {books.slice(0, 3).map(book => (
                    <div
                      key={book.id}
                      onClick={() => handleNavigate('library')}
                      className="p-7 sm:p-8 rounded-3xl bg-white border border-[#E8DCC9] hover:border-[#0F382C]/40 shadow-[0_2px_12px_-2px_rgba(15,56,44,0.04)] hover:shadow-lg transition-all duration-300 cursor-pointer flex flex-col justify-between group"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-xs font-readex px-3 py-1 rounded-lg bg-[#F4EFE6] text-[#0F382C] font-semibold">
                            {translateCategory(book.category)}
                          </span>
                          <span className="text-xs font-readex font-bold text-[#8C6D3B]">
                            {translateStatus(book.status)}
                          </span>
                        </div>
                        <h3 className="font-amiri font-bold text-2xl text-[#0F382C] mb-3 group-hover:text-[#164E3D] transition">
                          {book.title}
                        </h3>
                        <p className="font-naskh text-sm text-[#2D332F] leading-[2.1] line-clamp-3">
                          {book.description}
                        </p>
                      </div>

                      <div className="pt-5 border-t border-[#E8DCC9] flex items-center justify-between text-xs font-readex text-[#8C6D3B] mt-6">
                        <span>{book.pages} {t('pages')}</span>
                        <span className="text-[#0F382C] font-bold group-hover:translate-x-[-3px] rtl:group-hover:translate-x-[-3px] ltr:group-hover:translate-x-[3px] transition-transform">
                          {t('view_details')} →
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Teaching Circle Schedule Banner */}
              <section className="bg-gradient-to-r from-[#0F382C] via-[#164E3D] to-[#0F382C] rounded-3xl p-8 sm:p-14 text-[#FDFBF7] shadow-xl relative overflow-hidden border border-[#0F382C]">
                <div className="absolute inset-0 bg-arabesque-dark opacity-30 pointer-events-none" />
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                  <div className="max-w-2xl space-y-2">
                    <span className="text-xs font-readex text-[#DFC7A5] font-semibold block uppercase tracking-wider">
                      {t('teaching_circle_box_sub')}
                    </span>
                    <h3 className="font-amiri font-bold text-3xl sm:text-4xl text-white">
                      {t('teaching_circle_box_title')}
                    </h3>
                    <p className="font-naskh text-sm sm:text-base text-[#DFC7A5]/90 leading-[2.1]">
                      {t('teaching_circle_box_desc')}
                    </p>
                  </div>

                  <button
                    onClick={() => handleNavigate('schedule')}
                    className="px-8 py-4 rounded-xl bg-[#C5A880] text-[#0F382C] font-readex text-xs sm:text-sm font-bold shadow-md hover:bg-[#DFC7A5] transition shrink-0"
                  >
                    {t('teaching_circle_btn')}
                  </button>
                </div>
              </section>

              {/* Sample Poems & Daily Reflections Previews */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 sm:gap-14">
                {/* Poetry Highlight */}
                <div className="p-8 sm:p-10 rounded-3xl bg-white border border-[#E8DCC9] shadow-xs space-y-6">
                  <div className="flex items-center justify-between border-b border-[#E8DCC9] pb-4">
                    <div>
                      <span className="text-xs text-[#8C6D3B] font-readex font-bold block mb-1">
                        {t('poetry_box_sub')}
                      </span>
                      <h3 className="font-amiri font-bold text-2xl sm:text-3xl text-[#0F382C]">
                        {t('poetry_box_title')}
                      </h3>
                    </div>
                    <button
                      onClick={() => handleNavigate('poetry')}
                      className="text-xs sm:text-sm font-readex text-[#0F382C] hover:underline font-bold"
                    >
                      {t('poetry_box_btn')} ←
                    </button>
                  </div>

                  {poems[0] && (
                    <div
                      onClick={() => handleNavigate('poetry')}
                      className="p-5 rounded-2xl bg-[#FAF6EE] border border-[#E8DCC9] cursor-pointer hover:border-[#0F382C]/50 transition"
                    >
                      <div className="flex items-center justify-between text-xs font-readex text-[#8C6D3B] mb-2 font-medium">
                        <span>{translateMeter(poems[0].meter)}</span>
                        <span>{poems[0].totalVerses} {t('verses_count')}</span>
                      </div>
                      <h4 className="font-amiri font-bold text-xl text-[#0F382C] mb-2">
                        {poems[0].title}
                      </h4>
                      {poems[0].verses[0] && (
                        <div dir="rtl" className="p-4 bg-white rounded-xl border border-[#E8DCC9] text-center font-amiri text-sm sm:text-base text-[#0F382C] leading-loose shadow-2xs">
                          {poems[0].verses[0].sadr} ۞ {poems[0].verses[0].ajuz}
                        </div>
                      )}
                    </div>
                  )}

                  {poems[1] && (
                    <div
                      onClick={() => handleNavigate('poetry')}
                      className="p-5 rounded-2xl bg-[#FAF6EE] border border-[#E8DCC9] cursor-pointer hover:border-[#0F382C]/50 transition"
                    >
                      <div className="flex items-center justify-between text-xs font-readex text-[#8C6D3B] mb-2 font-medium">
                        <span>{translateMeter(poems[1].meter)}</span>
                        <span>{poems[1].totalVerses} {t('verses_count')}</span>
                      </div>
                      <h4 className="font-amiri font-bold text-xl text-[#0F382C] mb-2">
                        {poems[1].title}
                      </h4>
                      {poems[1].verses[0] && (
                        <div dir="rtl" className="p-4 bg-white rounded-xl border border-[#E8DCC9] text-center font-amiri text-sm sm:text-base text-[#0F382C] leading-loose shadow-2xs">
                          {poems[1].verses[0].sadr} ۞ {poems[1].verses[0].ajuz}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Daily Reflections Highlight */}
                <div className="p-8 sm:p-10 rounded-3xl bg-white border border-[#E8DCC9] shadow-xs space-y-6">
                  <div className="flex items-center justify-between border-b border-[#E8DCC9] pb-4">
                    <div>
                      <span className="text-xs text-[#8C6D3B] font-readex font-bold block mb-1">
                        {t('reflections_box_sub')}
                      </span>
                      <h3 className="font-amiri font-bold text-2xl sm:text-3xl text-[#0F382C]">
                        {t('reflections_box_title')}
                      </h3>
                    </div>
                    <button
                      onClick={() => handleNavigate('articles')}
                      className="text-xs sm:text-sm font-readex text-[#0F382C] hover:underline font-bold"
                    >
                      {t('reflections_box_btn')} ←
                    </button>
                  </div>

                  <div className="space-y-4">
                    {articles.slice(0, 2).map(art => (
                      <div
                        key={art.id}
                        onClick={() => handleNavigate('articles')}
                        className="p-5 rounded-2xl bg-[#FAF6EE] border border-[#E8DCC9] hover:border-[#0F382C]/50 transition cursor-pointer"
                      >
                        <div className="flex items-center justify-between text-xs font-readex text-[#8C6D3B] mb-2 font-medium">
                          <span className="font-semibold text-[#0F382C]">{translateArticleType(art.type)}</span>
                          <span>{art.date}</span>
                        </div>
                        <h4 className="font-amiri font-bold text-xl text-[#0F382C] mb-1.5">
                          {art.title}
                        </h4>
                        <p className="font-naskh text-sm text-[#2D332F] leading-[2] line-clamp-2">
                          {art.summary || art.content.slice(0, 140)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Library Tab */}
        {activeTab === 'library' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
            <LibraryExplorer
              books={books}
              categories={categories}
              whatsappNumber={profile.whatsapp}
            />
          </div>
        )}

        {/* Audios Tab */}
        {activeTab === 'audios' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
            <AudioLecturesHub
              audios={audios}
              categories={categories}
            />
          </div>
        )}

        {/* Poetry Diwan Tab */}
        {activeTab === 'poetry' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
            <PoetryDiwan poems={poems} />
          </div>
        )}

        {/* Articles & Khawatir Tab */}
        {activeTab === 'articles' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
            <ArticlesSection articles={articles} />
          </div>
        )}

        {/* Schedule & Teaching Circles Tab */}
        {activeTab === 'schedule' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
            <ScheduleSection
              scheduleData={scheduleData}
              questions={questions}
              whatsappNumber={profile.whatsapp}
              onQuestionSubmitted={handleQuestionSubmitted}
            />
          </div>
        )}

        {/* Contact & Question Box Tab */}
        {activeTab === 'contact' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
            <ScheduleSection
              scheduleData={scheduleData}
              questions={questions}
              whatsappNumber={profile.whatsapp}
              onQuestionSubmitted={handleQuestionSubmitted}
            />
          </div>
        )}

        {/* Admin Tab */}
        {activeTab === 'admin' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
            <AdminDashboard
              profile={profile}
              books={books}
              audios={audios}
              poems={poems}
              articles={articles}
              scheduleData={scheduleData}
              questions={questions}
              categories={categories}
              onDataRefresh={loadAllData}
            />
          </div>
        )}
      </main>

      {/* Universal Search Modal */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        books={books}
        audios={audios}
        poems={poems}
        articles={articles}
        onSelectResult={(tab) => handleNavigate(tab)}
      />

      {/* Persistent Audio Dock at screen bottom */}
      <AudioPlayerDock />

      {/* Fixed Mobile Bottom Navigation */}
      <MobileBottomNav
        activeTab={activeTab}
        setActiveTab={handleNavigate}
        hasAudioPlaying={!!currentTrack}
      />

      {/* Footer */}
      <Footer
        profile={profile}
        onNavigate={handleNavigate}
      />
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AudioProvider>
        <MainContent />
      </AudioProvider>
    </LanguageProvider>
  );
}
