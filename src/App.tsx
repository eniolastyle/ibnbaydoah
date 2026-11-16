import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  AppRoute,
  AppTab,
  parseRoute,
  buildPath,
  getCanonicalUrl,
  getShareableUrl,
  copyShareUrl,
  isValidTab
} from './utils/routing';
import { ArrowRight, ChevronLeft, Home, Share2, Check, Eye } from 'lucide-react';
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
  const [route, setRoute] = useState<AppRoute>(() =>
    typeof window !== 'undefined' ? parseRoute(window.location.pathname) : { tab: 'home', itemId: null }
  );
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isLoadingPoems, setIsLoadingPoems] = useState(true);
  const [pageLinkCopied, setPageLinkCopied] = useState(false);

  const activeTab = route.tab;
  const activeItemId = route.itemId ?? null;

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
      const adminToken =
        typeof window !== 'undefined' ? localStorage.getItem('ibn_baydoah_admin_token') : null;
      const questionHeaders: HeadersInit = adminToken
        ? { Authorization: `Bearer ${adminToken}` }
        : {};

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
        fetch('/api/questions', { headers: questionHeaders }).then(r => r.json()).catch(() => null),
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
    } finally {
      setIsLoadingPoems(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Sync browser Back / Forward buttons with app route
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!window.history.state || typeof window.history.state.appNavDepth !== 'number') {
      const initial = parseRoute(window.location.pathname);
      window.history.replaceState({ ...initial, appNavDepth: 0 }, '', buildPath(initial));
    }

    const handlePopState = () => {
      const parsed = parseRoute(window.location.pathname);
      setRoute(parsed);
      setPageLinkCopied(false);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = useCallback(
    (
      nextTab: AppTab | string,
      nextItemId: string | null = null,
      options?: { preserveScroll?: boolean; replace?: boolean }
    ) => {
      const tab: AppTab = isValidTab(nextTab) ? nextTab : 'home';
      const itemId = nextItemId || null;
      const nextRoute: AppRoute = { tab, itemId };
      const targetPath = buildPath(nextRoute);

      if (typeof window !== 'undefined' && window.location.pathname !== targetPath) {
        const currentDepth =
          typeof window.history.state?.appNavDepth === 'number' ? window.history.state.appNavDepth : 0;
        if (options?.replace) {
          window.history.replaceState({ ...nextRoute, appNavDepth: currentDepth }, '', targetPath);
        } else {
          window.history.pushState({ ...nextRoute, appNavDepth: currentDepth + 1 }, '', targetPath);
        }
      }

      setRoute(nextRoute);
      setPageLinkCopied(false);
      if (!options?.preserveScroll) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    },
    []
  );

  const handleNavigate = useCallback(
    (tab: string) => {
      navigateTo(tab, null);
    },
    [navigateTo]
  );

  const handleBack = useCallback(() => {
    if (typeof window !== 'undefined') {
      const depth =
        typeof window.history.state?.appNavDepth === 'number' ? window.history.state.appNavDepth : 0;
      if (depth > 0) {
        window.history.back();
        return;
      }
    }
    // Fallback when visitor landed directly on a shared URL
    if (activeItemId) {
      navigateTo(activeTab, null);
    } else if (activeTab !== 'home') {
      navigateTo('home', null);
    }
  }, [activeItemId, activeTab, navigateTo]);

  // Resolve current item title (for breadcrumbs, page <title>, and canonical SEO)
  const activeItemTitle = useMemo(() => {
    if (!activeItemId) return null;
    switch (activeTab) {
      case 'library':
        return books.find(b => b.id === activeItemId)?.title || null;
      case 'audios':
        return audios.find(a => a.id === activeItemId)?.title || null;
      case 'poetry':
        return poems.find(p => p.id === activeItemId)?.title || null;
      case 'articles':
        return articles.find(a => a.id === activeItemId)?.title || null;
      default:
        return null;
    }
  }, [activeItemId, activeTab, books, audios, poems, articles]);

  // Keep document title, canonical URL, and OpenGraph URL synchronized with active path
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const baseTitle =
      lang === 'ar'
        ? 'منصة أبي سعيد ابن بيضاء العلمية'
        : 'Abu Sa\'eed Ibn Baydoah Platform';
    const sectionTitles: Record<AppTab, string> = {
      home: lang === 'ar' ? 'منصة أبي سعيد ابن بيضاء العلمية | Ibn Baydoah Platform' : 'Ibn Baydoah Platform | Classical Islamic & Linguistic Studies',
      library: t('library'),
      audios: t('audios'),
      poetry: t('poetry'),
      articles: t('articles'),
      schedule: t('schedule'),
      contact: t('contact'),
      admin: t('admin'),
    };

    const computedTitle =
      activeTab === 'home'
        ? sectionTitles.home
        : activeItemTitle
        ? `${activeItemTitle} | ${sectionTitles[activeTab]} | ${baseTitle}`
        : `${sectionTitles[activeTab]} | ${baseTitle}`;

    document.title = computedTitle;

    const canonicalUrl = getCanonicalUrl(route);
    const canonicalLink = document.querySelector('link[rel="canonical"]');
    if (canonicalLink) {
      canonicalLink.setAttribute('href', canonicalUrl);
    }
    const ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogUrl) {
      ogUrl.setAttribute('content', canonicalUrl);
    }
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) {
      ogTitle.setAttribute('content', computedTitle);
    }
  }, [route, activeTab, activeItemTitle, lang, t]);

  const handleShareCurrentPage = async () => {
    const url = getShareableUrl(route);
    const ok = await copyShareUrl(url);
    if (ok) {
      setPageLinkCopied(true);
      setTimeout(() => setPageLinkCopied(false), 2200);
    }
  };

  const handleQuestionSubmitted = (newQ: StudentQuestion) => {
    if (newQ.answer && newQ.answer.trim().length > 0) {
      setQuestions(prev => [newQ, ...prev]);
    }
  };

  const sectionLabelMap: Record<AppTab, string> = {
    home: t('home'),
    library: t('library'),
    audios: t('audios'),
    poetry: t('poetry'),
    articles: t('articles'),
    schedule: t('schedule'),
    contact: t('contact'),
    admin: t('admin'),
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FDFBF7] text-[#1E1E1E]">
      {/* Universal Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={handleNavigate}
        onOpenSearch={() => setIsSearchOpen(true)}
        duaHeader={profile.dua_header}
      />

      {/* Main Body Pages View */}
      <main className="flex-1 pb-32 sm:pb-36 lg:pb-24">
        {activeTab !== 'home' && (
          <div className="bg-[#FAF6EE]/90 border-b border-[#E8DCC9]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 min-w-0">
                <button
                  type="button"
                  onClick={handleBack}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#E0D4C1] hover:border-[#0F382C]/40 hover:bg-[#F4EFE6] text-[#0F382C] text-xs font-readex font-bold shadow-2xs transition shrink-0"
                >
                  <ArrowRight className="w-3.5 h-3.5 rtl:rotate-0 ltr:rotate-180 text-[#A58455]" />
                  <span>{t('back_btn')}</span>
                </button>

                <nav
                  aria-label="Breadcrumb"
                  className="flex items-center gap-1.5 text-xs font-readex text-[#7A6440] min-w-0 flex-wrap"
                >
                  <button
                    type="button"
                    onClick={() => navigateTo('home', null)}
                    className="inline-flex items-center gap-1 hover:text-[#0F382C] font-medium transition"
                  >
                    <Home className="w-3.5 h-3.5 text-[#A58455]" />
                    <span>{t('home')}</span>
                  </button>

                  <ChevronLeft className="w-3.5 h-3.5 text-[#C5A880] ltr:rotate-180 shrink-0" />

                  <button
                    type="button"
                    onClick={() => navigateTo(activeTab, null)}
                    className={`truncate transition ${
                      activeItemTitle
                        ? 'hover:text-[#0F382C] font-medium'
                        : 'text-[#0F382C] font-bold'
                    }`}
                  >
                    {sectionLabelMap[activeTab]}
                  </button>

                  {activeItemTitle && (
                    <>
                      <ChevronLeft className="w-3.5 h-3.5 text-[#C5A880] ltr:rotate-180 shrink-0" />
                      <span className="text-[#0F382C] font-bold truncate max-w-[200px] sm:max-w-xs">
                        {activeItemTitle}
                      </span>
                    </>
                  )}
                </nav>
              </div>

              <button
                type="button"
                onClick={handleShareCurrentPage}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#E0D4C1] hover:border-[#0F382C]/40 hover:bg-[#F4EFE6] text-[#0F382C] text-xs font-readex font-semibold shadow-2xs transition shrink-0"
                title={getShareableUrl(route)}
              >
                {pageLinkCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">{t('link_copied')}</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-3.5 h-3.5 text-[#A58455]" />
                    <span>{t('share_page')}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'home' && (
          <div className="space-y-20 sm:space-y-28 lg:space-y-36">
            <Hero
              profile={profile}
              onNavigate={handleNavigate}
              onOpenPoem={(poemId) => navigateTo('poetry', poemId)}
              poems={poems}
              isLoadingPoems={isLoadingPoems}
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
                  {(books.some(b => b.featured) ? books.filter(b => b.featured) : books).slice(0, 3).map(book => (
                    <div
                      key={book.id}
                      onClick={() => navigateTo('library', book.id)}
                      className="p-7 sm:p-8 rounded-3xl bg-white border border-[#E8DCC9] hover:border-[#0F382C]/40 shadow-[0_2px_12px_-2px_rgba(15,56,44,0.04)] hover:shadow-lg transition-all duration-300 cursor-pointer flex flex-col justify-between group"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-4">
                          <span className="text-xs font-readex px-3 py-1 rounded-lg bg-[#F4EFE6] text-[#0F382C] font-semibold">
                            {translateCategory(book.category)}
                          </span>
                          <div className="flex items-center gap-1.5">
                            {book.isPaid && (
                              <span className="text-[11px] font-readex font-bold px-2 py-0.5 rounded bg-[#FAF3E3] text-[#8C5B15] border border-[#C5A880]">
                                {book.price ? `${t('paid_book')} • ${book.price}` : t('paid_book')}
                              </span>
                            )}
                            <span className="text-xs font-readex font-bold text-[#8C6D3B]">
                              {translateStatus(book.status)}
                            </span>
                          </div>
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

                  {(() => {
                    const featuredHomePoems = (
                      poems.some(p => p.featured) ? poems.filter(p => p.featured) : poems
                    ).slice(0, 3);
                    if (featuredHomePoems.length === 0) {
                      return (
                        <div className="p-6 rounded-2xl bg-[#FAF6EE] border border-[#E8DCC9] text-center font-readex text-xs text-[#7A6440]">
                          {lang === 'ar'
                            ? 'لا توجد منظومات منشورة في الديوان حالياً.'
                            : 'No didactic poems are currently published.'}
                        </div>
                      );
                    }
                    return featuredHomePoems.map(poem => (
                      <div
                        key={poem.id}
                        onClick={() => navigateTo('poetry', poem.id)}
                        className="p-5 rounded-2xl bg-[#FAF6EE] border border-[#E8DCC9] cursor-pointer hover:border-[#0F382C]/50 transition"
                      >
                        <div className="flex items-center justify-between text-xs font-readex text-[#8C6D3B] mb-2 font-medium">
                          <span>{translateMeter(poem.meter)}</span>
                          <span>{poem.totalVerses || poem.verses?.length || 0} {t('verses_count')}</span>
                        </div>
                        <h4 className="font-amiri font-bold text-xl text-[#0F382C] mb-2">
                          {poem.title}
                        </h4>
                        {poem.verses?.[0] && (
                          <div dir="rtl" className="p-4 bg-white rounded-xl border border-[#E8DCC9] text-center font-amiri text-sm sm:text-base text-[#0F382C] leading-loose shadow-2xs">
                            {poem.verses[0].sadr} ۞ {poem.verses[0].ajuz}
                          </div>
                        )}
                      </div>
                    ));
                  })()}
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
                        onClick={() => navigateTo('articles', art.id)}
                        className="p-5 rounded-2xl bg-[#FAF6EE] border border-[#E8DCC9] hover:border-[#0F382C]/50 transition cursor-pointer"
                      >
                        <div className="flex items-center justify-between text-xs font-readex text-[#8C6D3B] mb-2 font-medium">
                          <span className="font-semibold text-[#0F382C]">{translateArticleType(art.type)}</span>
                          <span className="flex items-center gap-3">
                            <span className="flex items-center gap-1 text-[#0F382C]">
                              <Eye className="w-3.5 h-3.5 text-[#A58455]" />
                              <span>{art.views || 1}</span>
                            </span>
                            <span>{art.date}</span>
                          </span>
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
              initialBookId={activeItemId}
              onSelectBook={(bookId) => navigateTo('library', bookId, { preserveScroll: true })}
            />
          </div>
        )}

        {/* Audios Tab */}
        {activeTab === 'audios' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
            <AudioLecturesHub
              audios={audios}
              categories={categories}
              initialCourseId={activeItemId}
              onSelectCourse={(courseId) => navigateTo('audios', courseId, { preserveScroll: true })}
            />
          </div>
        )}

        {/* Poetry Diwan Tab */}
        {activeTab === 'poetry' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
            <PoetryDiwan
              poems={poems}
              initialPoemId={activeItemId}
              onSelectPoem={(poemId) => navigateTo('poetry', poemId)}
              onClearInitialPoem={() => navigateTo('poetry', null)}
            />
          </div>
        )}

        {/* Articles & Khawatir Tab */}
        {activeTab === 'articles' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
            <ArticlesSection
              articles={articles}
              initialArticleId={activeItemId}
              onSelectArticle={(articleId) => navigateTo('articles', articleId)}
              onArticleViewed={(articleId, views) =>
                setArticles(prev => prev.map(a => (a.id === articleId ? { ...a, views } : a)))
              }
            />
          </div>
        )}

        {/* Schedule & Teaching Circles Tab */}
        {activeTab === 'schedule' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
            <ScheduleSection
              scheduleData={scheduleData}
              questions={questions}
              whatsappNumber={profile.whatsapp}
              categories={categories}
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
              categories={categories}
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
        onSelectResult={(tab, id) => navigateTo(tab, id ?? null)}
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
