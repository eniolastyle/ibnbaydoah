import React, { useState, useEffect } from 'react';
import {
  Profile,
  Book,
  AudioCourse,
  Poem,
  Article,
  ScheduleData,
  StudentQuestion
} from '../types';
import { useLanguage } from '../context/LanguageContext';
import {
  ShieldCheck,
  BookOpen,
  Headphones,
  Feather,
  FileText,
  Calendar,
  MessageSquare,
  Plus,
  Trash2,
  Edit,
  Save,
  Check,
  X,
  Lock,
  LogOut,
  KeyRound,
  ShieldAlert,
  AlertCircle
} from 'lucide-react';

interface AdminDashboardProps {
  profile: Profile;
  books: Book[];
  audios: AudioCourse[];
  poems: Poem[];
  articles: Article[];
  scheduleData: ScheduleData;
  questions: StudentQuestion[];
  categories: string[];
  onDataRefresh: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  profile,
  books,
  audios,
  poems,
  articles,
  scheduleData,
  questions,
  categories,
  onDataRefresh
}) => {
  const { lang, t, translateCategory, translateStatus, translateLevel, translateMeter, translateArticleType } = useLanguage();

  // Auth states
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return Boolean(localStorage.getItem('ibn_baydoah_admin_token'));
  });
  const [isConfigured, setIsConfigured] = useState<boolean>(true);
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Initial Password Setup state
  const [setupPassword, setSetupPassword] = useState('');
  const [confirmSetupPassword, setConfirmSetupPassword] = useState('');
  const [isSettingUp, setIsSettingUp] = useState(false);

  // Change Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [changePassError, setChangePassError] = useState('');
  const [changePassSuccess, setChangePassSuccess] = useState('');
  const [isChangingPass, setIsChangingPass] = useState(false);

  // Active Admin Sub-tab
  const [activeTab, setActiveTab] = useState<
    'books' | 'audios' | 'poetry' | 'articles' | 'profile' | 'questions' | 'security'
  >('books');

  // Book CRUD state
  const [editingBook, setEditingBook] = useState<Partial<Book> | null>(null);
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);

  // Audio CRUD state
  const [editingAudio, setEditingAudio] = useState<Partial<AudioCourse> | null>(null);
  const [isAudioModalOpen, setIsAudioModalOpen] = useState(false);

  // Poem CRUD state
  const [editingPoem, setEditingPoem] = useState<Partial<Poem> | null>(null);
  const [poemRawLines, setPoemRawLines] = useState<string>('');
  const [isPoemModalOpen, setIsPoemModalOpen] = useState(false);

  // Article CRUD state
  const [editingArticle, setEditingArticle] = useState<Partial<Article> | null>(null);
  const [isArticleModalOpen, setIsArticleModalOpen] = useState(false);

  // Profile Form state
  const [profileForm, setProfileForm] = useState<Profile>(profile);
  const [profileSaved, setProfileSaved] = useState(false);

  // Answer question state
  const [answeringQId, setAnsweringQId] = useState<string | null>(null);
  const [answerText, setAnswerText] = useState('');

  // Check initial password status on mount
  useEffect(() => {
    fetch('/api/auth/status')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setIsConfigured(data.isConfigured);
          if (data.username) setUsername(data.username);
        }
      })
      .catch(console.error);
  }, []);

  // Login handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setAuthError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        localStorage.setItem('ibn_baydoah_admin_token', data.token);
        setIsAuthenticated(true);
        setPassword('');
      } else {
        setAuthError(data.message || (lang === 'ar' ? 'اسم المستخدم أو كلمة المرور غير صحيحة' : 'Invalid username or password'));
      }
    } catch (err) {
      setAuthError(lang === 'ar' ? 'حدث خطأ أثناء الاتصال بالخادم' : 'Error connecting to the server');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Initial Password Setup handler
  const handleSetupPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (setupPassword !== confirmSetupPassword) {
      setAuthError(lang === 'ar' ? 'كلمتا المرور غير متطابقتين' : 'Passwords do not match');
      return;
    }
    if (setupPassword.length < 6) {
      setAuthError(lang === 'ar' ? 'يجب أن لا تقل كلمة المرور عن 6 أحرف' : 'Password must be at least 6 characters');
      return;
    }

    setIsSettingUp(true);
    setAuthError('');
    try {
      const res = await fetch('/api/auth/setup-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: setupPassword, confirmPassword: confirmSetupPassword })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        localStorage.setItem('ibn_baydoah_admin_token', data.token);
        setIsAuthenticated(true);
        setIsConfigured(true);
      } else {
        setAuthError(data.message || 'Error configuring password');
      }
    } catch (err) {
      setAuthError('Connection error');
    } finally {
      setIsSettingUp(false);
    }
  };

  // Change Password Handler
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangePassError('');
    setChangePassSuccess('');

    if (newPassword !== confirmNewPassword) {
      setChangePassError(lang === 'ar' ? 'كلمتا المرور الجديدتان غير متطابقتين' : 'New passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      setChangePassError(lang === 'ar' ? 'يجب ألا تقل كلمة المرور عن 6 خانات' : 'Password must be at least 6 characters');
      return;
    }

    setIsChangingPass(true);
    const token = localStorage.getItem('ibn_baydoah_admin_token');

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setChangePassSuccess(lang === 'ar' ? 'تم تحديث كلمة المرور بنجاح!' : 'Password updated successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
        setTimeout(() => setChangePassSuccess(''), 4000);
      } else {
        setChangePassError(data.message || 'Error updating password');
      }
    } catch (err) {
      setChangePassError('Connection error');
    } finally {
      setIsChangingPass(false);
    }
  };

  const handleLogout = async () => {
    const token = localStorage.getItem('ibn_baydoah_admin_token');
    if (token) {
      fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      }).catch(console.error);
    }
    localStorage.removeItem('ibn_baydoah_admin_token');
    setIsAuthenticated(false);
  };

  // BOOK HANDLERS
  const openNewBook = () => {
    setEditingBook({
      title: '',
      subtitle: '',
      status: 'مخطوط',
      category: 'العقيدة والتوحيد',
      pages: 100,
      year: '١٤٤٦ هـ',
      description: '',
      hasPdf: false,
      collaborative: false
    });
    setIsBookModalOpen(true);
  };

  const handleSaveBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBook || !editingBook.title) return;

    try {
      if (editingBook.id) {
        await fetch(`/api/books/${editingBook.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editingBook)
        });
      } else {
        await fetch('/api/books', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editingBook)
        });
      }
      setIsBookModalOpen(false);
      setEditingBook(null);
      onDataRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteBook = async (id: string) => {
    if (!confirm(lang === 'ar' ? 'هل أنت متأكد من حذف هذا المصنف؟' : 'Are you sure you want to delete this treatise?')) return;
    try {
      await fetch(`/api/books/${id}`, { method: 'DELETE' });
      onDataRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  // AUDIO HANDLERS
  const openNewAudio = () => {
    setEditingAudio({
      title: '',
      series: lang === 'ar' ? 'سلسلة جديدة' : 'New Series',
      category: 'العقيدة والتوحيد',
      level: 'مبتدئ',
      levelId: 'beginner',
      status: 'درس مستمر',
      totalLessons: 10,
      duration: '٤٥ دقيقة',
      description: '',
      audioUrl: 'https://ia800301.us.archive.org/15/items/Quran-Mishari-Rashid-al-Afasy/001.mp3'
    });
    setIsAudioModalOpen(true);
  };

  const handleSaveAudio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAudio || !editingAudio.title) return;

    try {
      if (editingAudio.id) {
        await fetch(`/api/audios/${editingAudio.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editingAudio)
        });
      } else {
        await fetch('/api/audios', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editingAudio)
        });
      }
      setIsAudioModalOpen(false);
      setEditingAudio(null);
      onDataRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteAudio = async (id: string) => {
    if (!confirm(lang === 'ar' ? 'هل أنت متأكد من حذف هذا الشرح الصوتي؟' : 'Are you sure you want to delete this audio course?')) return;
    try {
      await fetch(`/api/audios/${id}`, { method: 'DELETE' });
      onDataRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  // POEM HANDLERS
  const openNewPoem = () => {
    setEditingPoem({
      title: '',
      meter: 'بحر الرجز',
      category: 'الأدب والأخلاق',
      summary: '',
      year: '١٤٤٦ هـ',
      totalVerses: 10
    });
    setPoemRawLines('الصدر الأول ۞ العجز الأول\nالصدر الثاني ۞ العجز الثاني');
    setIsPoemModalOpen(true);
  };

  const handleSavePoem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPoem || !editingPoem.title) return;

    const parsedVerses = poemRawLines
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map((line, idx) => {
        let sadr = line;
        let ajuz = '';
        if (line.includes('۞')) {
          const parts = line.split('۞');
          sadr = parts[0].trim();
          ajuz = parts[1].trim();
        } else if (line.includes('...')) {
          const parts = line.split('...');
          sadr = parts[0].trim();
          ajuz = parts[1].trim();
        }
        return {
          number: idx + 1,
          sadr,
          ajuz
        };
      });

    const poemToSave = {
      ...editingPoem,
      verses: parsedVerses,
      totalVerses: parsedVerses.length || Number(editingPoem.totalVerses) || 1
    };

    try {
      if (editingPoem.id) {
        await fetch(`/api/poetry/${editingPoem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(poemToSave)
        });
      } else {
        await fetch('/api/poetry', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(poemToSave)
        });
      }
      setIsPoemModalOpen(false);
      setEditingPoem(null);
      onDataRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeletePoem = async (id: string) => {
    if (!confirm(lang === 'ar' ? 'هل أنت متأكد من حذف هذه المنظومة؟' : 'Are you sure you want to delete this poem?')) return;
    try {
      await fetch(`/api/poetry/${id}`, { method: 'DELETE' });
      onDataRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  // ARTICLE HANDLERS
  const openNewArticle = () => {
    setEditingArticle({
      title: lang === 'ar' ? 'خاطرة رقم (٥١٣): ' : 'Reflection #513: ',
      type: 'خواطر ابن بيضاء',
      category: 'الأدب والبلاغة واللغة',
      date: 'اليوم',
      summary: '',
      content: '',
      tags: ['خواطر ابن بيضاء']
    });
    setIsArticleModalOpen(true);
  };

  const handleSaveArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingArticle || !editingArticle.title) return;

    try {
      if (editingArticle.id) {
        await fetch(`/api/articles/${editingArticle.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editingArticle)
        });
      } else {
        await fetch('/api/articles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editingArticle)
        });
      }
      setIsArticleModalOpen(false);
      setEditingArticle(null);
      onDataRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteArticle = async (id: string) => {
    if (!confirm(lang === 'ar' ? 'هل أنت متأكد من حذف هذا المقال؟' : 'Are you sure you want to delete this article?')) return;
    try {
      await fetch(`/api/articles/${id}`, { method: 'DELETE' });
      onDataRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  // PROFILE SAVE HANDLER
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileForm)
      });
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3000);
      onDataRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  // ANSWER QUESTION HANDLER
  const handleSaveAnswer = async (id: string) => {
    try {
      await fetch(`/api/questions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answer: answerText })
      });
      setAnsweringQId(null);
      setAnswerText('');
      onDataRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  // IF NOT AUTHENTICATED: Show clean, secure login/setup form
  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto my-16 bg-white rounded-2xl border border-[#EADFCB] p-8 shadow-[0_4px_20px_-4px_rgba(15,56,44,0.06)]">
        <div className="text-center mb-6">
          <div className="w-13 h-13 rounded-2xl bg-[#0F382C] border border-[#C5A880]/40 flex items-center justify-center mx-auto mb-3 shadow-xs">
            <Lock className="w-6 h-6 text-[#DFC7A5]" />
          </div>
          <h2 className="font-amiri font-bold text-2xl text-[#0F382C]">
            {lang === 'ar' ? 'لوحة تحكم إدارة المنصة' : 'Admin Control Portal'}
          </h2>
          <p className="text-xs text-[#9A7947] font-readex mt-1">
            {lang === 'ar'
              ? 'تسجيل الدخول لإدارة المؤلفات، الشروح، المنظومات والخواطر'
              : 'Sign in to manage treatises, audios, poetry, and reflections'}
          </p>
        </div>

        {!isConfigured ? (
          // Initial Password Setup View
          <form onSubmit={handleSetupPassword} className="space-y-4">
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-readex flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <span>
                {lang === 'ar'
                  ? 'يرجى تعيين كلمة مرور سرية قوية وخاصة بك لحماية لوحة الإدارة.'
                  : 'Please set your own secure master password to protect your admin dashboard.'}
              </span>
            </div>

            <div>
              <label className="block text-xs font-readex font-medium text-[#1E1E1E] mb-1">
                {lang === 'ar' ? 'كلمة المرور الجديدة (6 أحرف كحد أدنى)' : 'New Master Password (min 6 characters)'}
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={setupPassword}
                onChange={e => setSetupPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-4 py-2.5 rounded-xl border border-[#E0D4C1] text-sm font-readex focus:outline-none focus:ring-2 focus:ring-[#0F382C]"
              />
            </div>

            <div>
              <label className="block text-xs font-readex font-medium text-[#1E1E1E] mb-1">
                {lang === 'ar' ? 'تأكيد كلمة المرور' : 'Confirm Password'}
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={confirmSetupPassword}
                onChange={e => setConfirmSetupPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-4 py-2.5 rounded-xl border border-[#E0D4C1] text-sm font-readex focus:outline-none focus:ring-2 focus:ring-[#0F382C]"
              />
            </div>

            {authError && (
              <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-readex flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSettingUp}
              className="w-full py-3 rounded-xl bg-[#0F382C] hover:bg-[#164E3D] text-white font-readex text-xs font-bold shadow-sm transition disabled:opacity-50"
            >
              {isSettingUp
                ? (lang === 'ar' ? 'جاري الحفظ والتهيئة...' : 'Setting up...')
                : (lang === 'ar' ? 'حفظ وتفعيل كلمة المرور' : 'Save & Activate Password')}
            </button>
          </form>
        ) : (
          // Regular Secure Login View
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-readex font-medium text-[#1E1E1E] mb-1">
                {lang === 'ar' ? 'اسم المستخدم (Username)' : 'Username'}
              </label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="admin"
                required
                className="w-full px-4 py-2.5 rounded-xl border border-[#E0D4C1] text-sm font-readex focus:outline-none focus:ring-2 focus:ring-[#0F382C]"
              />
            </div>

            <div>
              <label className="block text-xs font-readex font-medium text-[#1E1E1E] mb-1">
                {lang === 'ar' ? 'كلمة المرور السرية' : 'Password'}
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                className="w-full px-4 py-2.5 rounded-xl border border-[#E0D4C1] text-sm font-readex focus:outline-none focus:ring-2 focus:ring-[#0F382C]"
              />
            </div>

            {authError && (
              <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-readex flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3 rounded-xl bg-[#0F382C] hover:bg-[#164E3D] text-white font-readex text-xs font-bold shadow-sm transition disabled:opacity-50"
            >
              {isLoggingIn
                ? (lang === 'ar' ? 'جاري التحقق...' : 'Verifying...')
                : (lang === 'ar' ? 'دخول لوحة التحكم' : 'Sign In')}
            </button>

            <div className="pt-2 text-center text-[11px] text-[#5A635E] font-readex">
              {lang === 'ar'
                ? 'محاولات الدخول محمية ومحددة زمنياً بواسطة التشفير الأمني'
                : 'Protected with PBKDF2 hashing and anti-brute-force rate limiting'}
            </div>
          </form>
        )}
      </div>
    );
  }

  // AUTHENTICATED ADMIN DASHBOARD
  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Top Admin Bar with clean elevation */}
      <div className="bg-[#0F382C] text-[#FDFBF7] rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm border border-[#0F382C]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-5 h-5 text-[#DFC7A5]" />
            <h2 className="font-amiri font-bold text-2xl sm:text-3xl">
              {lang === 'ar' ? 'لوحة الإدارة والتحكم العلمي' : 'Admin Scholarly Dashboard'}
            </h2>
          </div>
          <p className="text-xs text-[#DFC7A5]/80 font-readex">
            {lang === 'ar'
              ? 'مرحباً بك في لوحة تحرير محتوى منصة الشيخ أبي سعيد ابن بيضاء'
              : 'Manage publications, audio series, didactic poems, and inquiries'}
          </p>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-[#DFC7A5] font-readex text-xs font-medium border border-[#C5A880]/30 transition shrink-0"
        >
          <LogOut className="w-4 h-4" />
          <span>{lang === 'ar' ? 'تسجيل الخروج' : 'Sign Out'}</span>
        </button>
      </div>

      {/* Tabs Row with soft hairline borders */}
      <div className="flex flex-wrap gap-2 border-b border-[#EADFCB] pb-3 font-readex text-xs font-semibold">
        <button
          onClick={() => setActiveTab('books')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl transition ${
            activeTab === 'books'
              ? 'bg-[#0F382C] text-white shadow-xs'
              : 'bg-white text-[#0F382C] border border-[#E0D4C1] hover:bg-[#F2ECE1]'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>{lang === 'ar' ? `المؤلفات (${books.length})` : `Books (${books.length})`}</span>
        </button>

        <button
          onClick={() => setActiveTab('audios')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl transition ${
            activeTab === 'audios'
              ? 'bg-[#0F382C] text-white shadow-xs'
              : 'bg-white text-[#0F382C] border border-[#E0D4C1] hover:bg-[#F2ECE1]'
          }`}
        >
          <Headphones className="w-4 h-4" />
          <span>{lang === 'ar' ? `الشروح (${audios.length})` : `Audios (${audios.length})`}</span>
        </button>

        <button
          onClick={() => setActiveTab('poetry')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl transition ${
            activeTab === 'poetry'
              ? 'bg-[#0F382C] text-white shadow-xs'
              : 'bg-white text-[#0F382C] border border-[#E0D4C1] hover:bg-[#F2ECE1]'
          }`}
        >
          <Feather className="w-4 h-4" />
          <span>{lang === 'ar' ? `المنظومات (${poems.length})` : `Poetry (${poems.length})`}</span>
        </button>

        <button
          onClick={() => setActiveTab('articles')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl transition ${
            activeTab === 'articles'
              ? 'bg-[#0F382C] text-white shadow-xs'
              : 'bg-white text-[#0F382C] border border-[#E0D4C1] hover:bg-[#F2ECE1]'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>{lang === 'ar' ? `الخواطر (${articles.length})` : `Reflections (${articles.length})`}</span>
        </button>

        <button
          onClick={() => setActiveTab('questions')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl transition ${
            activeTab === 'questions'
              ? 'bg-[#0F382C] text-white shadow-xs'
              : 'bg-white text-[#0F382C] border border-[#E0D4C1] hover:bg-[#F2ECE1]'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>{lang === 'ar' ? `صندوق الأسئلة (${questions.length})` : `Inquiries (${questions.length})`}</span>
        </button>

        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl transition ${
            activeTab === 'profile'
              ? 'bg-[#0F382C] text-white shadow-xs'
              : 'bg-white text-[#0F382C] border border-[#E0D4C1] hover:bg-[#F2ECE1]'
          }`}
        >
          <Edit className="w-4 h-4" />
          <span>{lang === 'ar' ? 'بيانات الشيخ والاتصال' : 'Scholar Profile'}</span>
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl transition ${
            activeTab === 'security'
              ? 'bg-[#0F382C] text-white shadow-xs'
              : 'bg-white text-[#0F382C] border border-[#E0D4C1] hover:bg-[#F2ECE1]'
          }`}
        >
          <KeyRound className="w-4 h-4 text-[#A58455]" />
          <span>{lang === 'ar' ? 'أمان كلمة المرور' : 'Password & Security'}</span>
        </button>
      </div>

      {/* 1. BOOKS MANAGEMENT TAB */}
      {activeTab === 'books' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-amiri font-bold text-xl text-[#0F382C]">
              {lang === 'ar' ? 'إدارة المؤلفات والكتب (CRUD)' : 'Manage Books & Treatises (CRUD)'}
            </h3>
            <button
              onClick={openNewBook}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0F382C] text-white text-xs font-readex font-bold hover:bg-[#164E3D] shadow-xs"
            >
              <Plus className="w-4 h-4 text-[#DFC7A5]" />
              <span>{lang === 'ar' ? 'إضافة مؤلف جديد' : 'Add New Treatise'}</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-[#EADFCB] overflow-x-auto shadow-xs">
            <table className="w-full text-right text-xs font-readex rtl:text-right ltr:text-left">
              <thead className="bg-[#F6F1E7] border-b border-[#EADFCB] text-[#0F382C]">
                <tr>
                  <th className="p-3.5 font-bold">{lang === 'ar' ? 'عنوان المصنف' : 'Treatise Title'}</th>
                  <th className="p-3.5 font-bold">{lang === 'ar' ? 'الفن العلمي' : 'Discipline'}</th>
                  <th className="p-3.5 font-bold">{lang === 'ar' ? 'الحالة' : 'Status'}</th>
                  <th className="p-3.5 font-bold">{lang === 'ar' ? 'الصفحات' : 'Pages'}</th>
                  <th className="p-3.5 font-bold">{lang === 'ar' ? 'سنة التحرير' : 'Year'}</th>
                  <th className="p-3.5 text-center font-bold">{lang === 'ar' ? 'الإجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EADFCB]/60">
                {books.map(b => (
                  <tr key={b.id} className="hover:bg-[#FDFBF7]">
                    <td className="p-3.5 font-amiri font-bold text-base text-[#0F382C]">
                      {b.title}
                    </td>
                    <td className="p-3.5">{translateCategory(b.category)}</td>
                    <td className="p-3.5">
                      <span
                        className={`px-2 py-0.5 rounded font-bold ${
                          b.status === 'مطبوع'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {translateStatus(b.status)}
                      </span>
                    </td>
                    <td className="p-3.5">{b.pages}</td>
                    <td className="p-3.5">{b.year}</td>
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => {
                            setEditingBook(b);
                            setIsBookModalOpen(true);
                          }}
                          className="p-1 rounded text-[#0F382C] hover:bg-[#F4EFE6]"
                          title="تعديل"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteBook(b.id)}
                          className="p-1 rounded text-red-600 hover:bg-red-50"
                          title="حذف"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. AUDIOS MANAGEMENT TAB */}
      {activeTab === 'audios' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-amiri font-bold text-xl text-[#0F382C]">
              {lang === 'ar' ? 'إدارة الشروح الصوتية والسلاسل' : 'Manage Audio Lecture Series'}
            </h3>
            <button
              onClick={openNewAudio}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0F382C] text-white text-xs font-readex font-bold hover:bg-[#164E3D] shadow-xs"
            >
              <Plus className="w-4 h-4 text-[#DFC7A5]" />
              <span>{lang === 'ar' ? 'إضافة شرح صوتي جديد' : 'Add Audio Course'}</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-[#EADFCB] overflow-x-auto shadow-xs">
            <table className="w-full text-right text-xs font-readex rtl:text-right ltr:text-left">
              <thead className="bg-[#F6F1E7] border-b border-[#EADFCB] text-[#0F382C]">
                <tr>
                  <th className="p-3.5 font-bold">{lang === 'ar' ? 'عنوان الشرح' : 'Course Title'}</th>
                  <th className="p-3.5 font-bold">{lang === 'ar' ? 'السلسلة' : 'Series'}</th>
                  <th className="p-3.5 font-bold">{lang === 'ar' ? 'المستوى' : 'Level'}</th>
                  <th className="p-3.5 font-bold">{lang === 'ar' ? 'الفن' : 'Discipline'}</th>
                  <th className="p-3.5 font-bold">{lang === 'ar' ? 'الحالة' : 'Status'}</th>
                  <th className="p-3.5 text-center font-bold">{lang === 'ar' ? 'الإجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EADFCB]/60">
                {audios.map(a => (
                  <tr key={a.id} className="hover:bg-[#FDFBF7]">
                    <td className="p-3.5 font-amiri font-bold text-base text-[#0F382C]">
                      {a.title}
                    </td>
                    <td className="p-3.5">{a.series}</td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded bg-[#F4EFE6] font-bold">
                        {translateLevel(a.level)}
                      </span>
                    </td>
                    <td className="p-3.5">{translateCategory(a.category)}</td>
                    <td className="p-3.5">{a.status}</td>
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => {
                            setEditingAudio(a);
                            setIsAudioModalOpen(true);
                          }}
                          className="p-1 rounded text-[#0F382C] hover:bg-[#F4EFE6]"
                          title="تعديل"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteAudio(a.id)}
                          className="p-1 rounded text-red-600 hover:bg-red-50"
                          title="حذف"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. POETRY MANAGEMENT TAB */}
      {activeTab === 'poetry' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-amiri font-bold text-xl text-[#0F382C]">
              {lang === 'ar' ? 'إدارة المنظومات والديوان الشعري' : 'Manage Poetry & Diwan'}
            </h3>
            <button
              onClick={openNewPoem}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0F382C] text-white text-xs font-readex font-bold hover:bg-[#164E3D] shadow-xs"
            >
              <Plus className="w-4 h-4 text-[#DFC7A5]" />
              <span>{lang === 'ar' ? 'إضافة منظومة جديدة' : 'Add New Poem'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {poems.map(p => (
              <div
                key={p.id}
                className="p-5 rounded-2xl bg-white border border-[#EADFCB] shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs px-2.5 py-0.5 rounded bg-[#F4EFE6] text-[#A58455] font-readex font-semibold">
                      {translateMeter(p.meter)}
                    </span>
                    <span className="text-xs font-bold text-[#0F382C]">
                      {p.totalVerses} {t('verses_count')}
                    </span>
                  </div>
                  <h4 className="font-amiri font-bold text-xl text-[#0F382C] mb-2">
                    {p.title}
                  </h4>
                  <p className="font-naskh text-xs text-[#3A403C] line-clamp-2 leading-relaxed">
                    {p.summary}
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#EADFCB]/60 mt-3">
                  <button
                    onClick={() => {
                      setEditingPoem(p);
                      const lines = p.verses
                        .map(v => `${v.sadr} ۞ ${v.ajuz}`)
                        .join('\n');
                      setPoemRawLines(lines);
                      setIsPoemModalOpen(true);
                    }}
                    className="p-1.5 rounded hover:bg-[#F4EFE6] text-[#0F382C]"
                    title="تعديل الأبيات"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeletePoem(p.id)}
                    className="p-1.5 rounded hover:bg-red-50 text-red-600"
                    title="حذف"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. ARTICLES MANAGEMENT TAB */}
      {activeTab === 'articles' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-amiri font-bold text-xl text-[#0F382C]">
              {lang === 'ar' ? 'إدارة الخواطر والمقالات' : 'Manage Reflections & Articles'}
            </h3>
            <button
              onClick={openNewArticle}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0F382C] text-white text-xs font-readex font-bold hover:bg-[#164E3D] shadow-xs"
            >
              <Plus className="w-4 h-4 text-[#DFC7A5]" />
              <span>{lang === 'ar' ? 'نشر خاطرة أو مقال جديد' : 'New Reflection / Paper'}</span>
            </button>
          </div>

          <div className="space-y-3">
            {articles.map(art => (
              <div
                key={art.id}
                className="p-4 rounded-xl bg-white border border-[#EADFCB] shadow-xs flex items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200 font-readex font-bold">
                      {translateArticleType(art.type)}
                    </span>
                    <span className="text-xs text-[#A58455] font-readex">{art.date}</span>
                  </div>
                  <h4 className="font-amiri font-bold text-lg text-[#0F382C]">
                    {art.title}
                  </h4>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setEditingArticle(art);
                      setIsArticleModalOpen(true);
                    }}
                    className="p-1.5 rounded hover:bg-[#F4EFE6] text-[#0F382C]"
                    title="تعديل"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteArticle(art.id)}
                    className="p-1.5 rounded hover:bg-red-50 text-red-600"
                    title="حذف"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. QUESTIONS MANAGEMENT TAB */}
      {activeTab === 'questions' && (
        <div className="space-y-4">
          <h3 className="font-amiri font-bold text-xl text-[#0F382C]">
            {lang === 'ar' ? 'مراجعة وإجابة أسئلة واستفتاءات الطلاب' : 'Review & Answer Inquiries'}
          </h3>

          <div className="space-y-4">
            {questions.map(q => (
              <div
                key={q.id}
                className="p-5 rounded-2xl bg-white border border-[#EADFCB] shadow-xs space-y-3"
              >
                <div className="flex items-center justify-between text-xs font-readex">
                  <span className="font-bold text-[#0F382C]">
                    {t('inquirer')}: {q.studentName} ({translateCategory(q.category)})
                  </span>
                  <span className="text-[#A58455]">{q.date}</span>
                </div>

                <p className="font-naskh text-sm font-semibold text-[#1E1E1E]">
                  «{q.question}»
                </p>

                {answeringQId === q.id ? (
                  <div className="space-y-2 pt-2">
                    <textarea
                      rows={3}
                      value={answerText}
                      onChange={e => setAnswerText(e.target.value)}
                      placeholder={lang === 'ar' ? 'اكتب جواب الشيخ المعتمد هنا...' : 'Write answer here...'}
                      className="w-full p-3 rounded-xl border border-[#E0D4C1] text-sm font-naskh"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleSaveAnswer(q.id)}
                        className="px-3.5 py-1.5 rounded-lg bg-[#0F382C] text-white text-xs font-readex font-bold"
                      >
                        {lang === 'ar' ? 'حفظ الجواب' : 'Save Answer'}
                      </button>
                      <button
                        onClick={() => setAnsweringQId(null)}
                        className="px-3 py-1.5 rounded-lg bg-gray-100 text-xs font-readex"
                      >
                        {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    {q.answer ? (
                      <div className="p-3 rounded-xl bg-[#FDFBF7] border border-[#EADFCB] font-naskh text-xs text-[#0F382C]">
                        <span className="font-bold block mb-1">{t('shaykh_answer')}</span>
                        {q.answer}
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setAnsweringQId(q.id);
                          setAnswerText(q.answer || '');
                        }}
                        className="px-3.5 py-1.5 rounded-lg bg-[#0F382C]/10 hover:bg-[#0F382C]/20 text-[#0F382C] text-xs font-readex font-bold"
                      >
                        {lang === 'ar' ? 'إضافة جواب الشيخ' : 'Add Answer'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. PROFILE & CHANNELS TAB */}
      {activeTab === 'profile' && (
        <form onSubmit={handleSaveProfile} className="bg-white rounded-2xl border border-[#EADFCB] p-6 sm:p-8 shadow-xs space-y-5 max-w-2xl">
          <h3 className="font-amiri font-bold text-xl text-[#0F382C] mb-2">
            {lang === 'ar' ? 'تحديث بيانات الشيخ والاتصال' : 'Update Scholar Bio & Channels'}
          </h3>

          <div>
            <label className="block text-xs font-readex font-medium mb-1">اسم الشيخ بالعربية</label>
            <input
              type="text"
              value={profileForm.name}
              onChange={e => setProfileForm({ ...profileForm, name: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E0D4C1] text-sm font-amiri font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-readex font-medium mb-1">الاسم بالإنجليزية</label>
            <input
              type="text"
              value={profileForm.englishName}
              onChange={e => setProfileForm({ ...profileForm, englishName: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E0D4C1] text-sm font-latin"
            />
          </div>

          <div>
            <label className="block text-xs font-readex font-medium mb-1">المؤهل والدرجة العلمية</label>
            <input
              type="text"
              value={profileForm.degree}
              onChange={e => setProfileForm({ ...profileForm, degree: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E0D4C1] text-sm font-readex"
            />
          </div>

          <div>
            <label className="block text-xs font-readex font-medium mb-1">رقم الواتساب للتواصل</label>
            <input
              type="text"
              value={profileForm.whatsapp}
              onChange={e => setProfileForm({ ...profileForm, whatsapp: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E0D4C1] text-sm font-latin"
            />
          </div>

          <div>
            <label className="block text-xs font-readex font-medium mb-1">مقر الحلقات الحضورية</label>
            <input
              type="text"
              value={profileForm.location}
              onChange={e => setProfileForm({ ...profileForm, location: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E0D4C1] text-sm font-readex"
            />
          </div>

          <div>
            <label className="block text-xs font-readex font-medium mb-1">النبذة والتعريف</label>
            <textarea
              rows={4}
              value={profileForm.bio}
              onChange={e => setProfileForm({ ...profileForm, bio: e.target.value })}
              className="w-full p-3.5 rounded-xl border border-[#E0D4C1] text-sm font-naskh leading-relaxed"
            />
          </div>

          {profileSaved && (
            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-readex flex items-center gap-1.5 border border-emerald-200">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>{lang === 'ar' ? 'تم حفظ التعديلات بنجاح!' : 'Changes saved successfully!'}</span>
            </div>
          )}

          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl bg-[#0F382C] text-white font-readex text-xs font-bold shadow-xs hover:bg-[#164E3D]"
          >
            {t('save_changes')}
          </button>
        </form>
      )}

      {/* 7. SECURITY & PASSWORD MANAGEMENT TAB */}
      {activeTab === 'security' && (
        <form onSubmit={handleChangePassword} className="bg-white rounded-2xl border border-[#EADFCB] p-6 sm:p-8 shadow-xs space-y-5 max-w-xl">
          <div className="flex items-center gap-2 mb-2">
            <KeyRound className="w-5 h-5 text-[#0F382C]" />
            <h3 className="font-amiri font-bold text-xl text-[#0F382C]">
              {lang === 'ar' ? 'حماية الحساب وتغيير كلمة المرور' : 'Security & Change Master Password'}
            </h3>
          </div>

          <p className="text-xs text-[#5A635E] font-readex leading-relaxed">
            {lang === 'ar'
              ? 'يتم تشفير كلمات المرور على الخادم بواسطة خوارزمية PBKDF2 المشددة مع Salt فريد لحماية بيانات المنصة بالكامل.'
              : 'Passwords are cryptographically secured server-side using PBKDF2 with unique salts to protect scholarly data.'}
          </p>

          <div>
            <label className="block text-xs font-readex font-medium mb-1">
              {lang === 'ar' ? 'كلمة المرور الحالية' : 'Current Password'}
            </label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E0D4C1] text-sm font-readex focus:outline-none focus:ring-2 focus:ring-[#0F382C]"
            />
          </div>

          <div>
            <label className="block text-xs font-readex font-medium mb-1">
              {lang === 'ar' ? 'كلمة المرور الجديدة (6 خانات على الأقل)' : 'New Password (min 6 characters)'}
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E0D4C1] text-sm font-readex focus:outline-none focus:ring-2 focus:ring-[#0F382C]"
            />
          </div>

          <div>
            <label className="block text-xs font-readex font-medium mb-1">
              {lang === 'ar' ? 'تأكيد كلمة المرور الجديدة' : 'Confirm New Password'}
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={confirmNewPassword}
              onChange={e => setConfirmNewPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E0D4C1] text-sm font-readex focus:outline-none focus:ring-2 focus:ring-[#0F382C]"
            />
          </div>

          {changePassError && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-readex flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{changePassError}</span>
            </div>
          )}

          {changePassSuccess && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-readex flex items-center gap-1.5">
              <Check className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{changePassSuccess}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isChangingPass}
            className="px-6 py-2.5 rounded-xl bg-[#0F382C] text-white font-readex text-xs font-bold shadow-xs hover:bg-[#164E3D] transition disabled:opacity-50"
          >
            {isChangingPass
              ? (lang === 'ar' ? 'جاري التحديث...' : 'Updating...')
              : (lang === 'ar' ? 'تحديث كلمة المرور' : 'Update Master Password')}
          </button>
        </form>
      )}

      {/* BOOK EDIT / CREATE MODAL */}
      {isBookModalOpen && editingBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <form
            onSubmit={handleSaveBook}
            className="bg-[#FDFBF7] rounded-3xl max-w-xl w-full border border-[#EADFCB] p-6 sm:p-8 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-[#EADFCB] pb-3">
              <h3 className="font-amiri font-bold text-xl text-[#0F382C]">
                {editingBook.id ? (lang === 'ar' ? 'تعديل بيانات المصنف' : 'Edit Treatise') : (lang === 'ar' ? 'إضافة مصنف جديد' : 'Add New Treatise')}
              </h3>
              <button
                type="button"
                onClick={() => setIsBookModalOpen(false)}
                className="w-8 h-8 rounded-full bg-[#F4EFE6] text-[#0F382C] font-bold"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="block text-xs font-readex mb-1">{lang === 'ar' ? 'عنوان المصنف *' : 'Title *'}</label>
              <input
                type="text"
                required
                value={editingBook.title || ''}
                onChange={e => setEditingBook({ ...editingBook, title: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-[#E0D4C1] font-amiri font-bold text-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-readex mb-1">{lang === 'ar' ? 'العنوان الفرعي أو موضوعه' : 'Subtitle / Topic'}</label>
              <input
                type="text"
                value={editingBook.subtitle || ''}
                onChange={e => setEditingBook({ ...editingBook, subtitle: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-[#E0D4C1] text-xs font-readex"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-readex mb-1">{lang === 'ar' ? 'الفن العلمي' : 'Discipline'}</label>
                <select
                  value={editingBook.category || 'العقيدة والتوحيد'}
                  onChange={e => setEditingBook({ ...editingBook, category: e.target.value as any })}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#E0D4C1] text-xs font-readex bg-white"
                >
                  {categories.map(c => (
                    <option key={c} value={c}>{translateCategory(c)}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-readex mb-1">{lang === 'ar' ? 'الحالة' : 'Status'}</label>
                <select
                  value={editingBook.status || 'مخطوط'}
                  onChange={e => setEditingBook({ ...editingBook, status: e.target.value as any })}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#E0D4C1] text-xs font-readex bg-white"
                >
                  <option value="مطبوع">{translateStatus('مطبوع')}</option>
                  <option value="مخطوط">{translateStatus('مخطوط')}</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-readex mb-1">{t('pages')}</label>
                <input
                  type="number"
                  value={editingBook.pages || 100}
                  onChange={e => setEditingBook({ ...editingBook, pages: Number(e.target.value) })}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#E0D4C1] text-xs font-latin"
                />
              </div>

              <div>
                <label className="block text-xs font-readex mb-1">{t('year')}</label>
                <input
                  type="text"
                  value={editingBook.year || '١٤٤٦ هـ'}
                  onChange={e => setEditingBook({ ...editingBook, year: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#E0D4C1] text-xs font-readex"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-readex mb-1">{lang === 'ar' ? 'نبذة عن المصنف ومحتواه' : 'Description / Summary'}</label>
              <textarea
                rows={3}
                value={editingBook.description || ''}
                onChange={e => setEditingBook({ ...editingBook, description: e.target.value })}
                className="w-full p-3 rounded-xl border border-[#E0D4C1] text-xs font-naskh leading-relaxed"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#EADFCB] font-readex text-xs">
              <button
                type="button"
                onClick={() => setIsBookModalOpen(false)}
                className="px-4 py-2 rounded-xl text-gray-600 hover:bg-gray-100"
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-[#0F382C] text-white font-bold hover:bg-[#164E3D]"
              >
                {t('save_changes')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* AUDIO EDIT / CREATE MODAL */}
      {isAudioModalOpen && editingAudio && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <form
            onSubmit={handleSaveAudio}
            className="bg-[#FDFBF7] rounded-3xl max-w-xl w-full border border-[#EADFCB] p-6 sm:p-8 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-[#EADFCB] pb-3">
              <h3 className="font-amiri font-bold text-xl text-[#0F382C]">
                {editingAudio.id ? (lang === 'ar' ? 'تعديل الشرح الصوتي' : 'Edit Audio Course') : (lang === 'ar' ? 'إضافة شرح صوتي جديد' : 'Add Audio Course')}
              </h3>
              <button
                type="button"
                onClick={() => setIsAudioModalOpen(false)}
                className="w-8 h-8 rounded-full bg-[#F4EFE6] text-[#0F382C] font-bold"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="block text-xs font-readex mb-1">{lang === 'ar' ? 'عنوان الشرح *' : 'Course Title *'}</label>
              <input
                type="text"
                required
                value={editingAudio.title || ''}
                onChange={e => setEditingAudio({ ...editingAudio, title: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-[#E0D4C1] font-amiri font-bold text-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-readex mb-1">{t('series')}</label>
              <input
                type="text"
                value={editingAudio.series || ''}
                onChange={e => setEditingAudio({ ...editingAudio, series: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-[#E0D4C1] text-xs font-readex"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-readex mb-1">{t('level_filter')}</label>
                <select
                  value={editingAudio.levelId || 'beginner'}
                  onChange={e => {
                    const val = e.target.value;
                    const levelName = val === 'beginner' ? 'مبتدئ' : val === 'intermediate' ? 'متوسط' : 'متقدم / مفصل';
                    setEditingAudio({ ...editingAudio, levelId: val as any, level: levelName });
                  }}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#E0D4C1] text-xs font-readex bg-white"
                >
                  <option value="beginner">{t('beginner')}</option>
                  <option value="intermediate">{t('intermediate')}</option>
                  <option value="advanced">{t('advanced')}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-readex mb-1">{t('science_filter')}</label>
                <select
                  value={editingAudio.category || 'العقيدة والتوحيد'}
                  onChange={e => setEditingAudio({ ...editingAudio, category: e.target.value as any })}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#E0D4C1] text-xs font-readex bg-white"
                >
                  {categories.map(c => (
                    <option key={c} value={c}>{translateCategory(c)}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-readex mb-1">Audio URL (MP3)</label>
              <input
                type="text"
                value={editingAudio.audioUrl || ''}
                onChange={e => setEditingAudio({ ...editingAudio, audioUrl: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-[#E0D4C1] text-xs font-latin"
                placeholder="https://..."
              />
            </div>

            <div>
              <label className="block text-xs font-readex mb-1">{lang === 'ar' ? 'وصف ومحتوى الشرح' : 'Course Description'}</label>
              <textarea
                rows={3}
                value={editingAudio.description || ''}
                onChange={e => setEditingAudio({ ...editingAudio, description: e.target.value })}
                className="w-full p-3 rounded-xl border border-[#E0D4C1] text-xs font-naskh"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#EADFCB] font-readex text-xs">
              <button
                type="button"
                onClick={() => setIsAudioModalOpen(false)}
                className="px-4 py-2 rounded-xl text-gray-600 hover:bg-gray-100"
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-[#0F382C] text-white font-bold hover:bg-[#164E3D]"
              >
                {t('save_changes')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* POEM EDIT / CREATE MODAL */}
      {isPoemModalOpen && editingPoem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <form
            onSubmit={handleSavePoem}
            className="bg-[#FDFBF7] rounded-3xl max-w-2xl w-full border border-[#EADFCB] p-6 sm:p-8 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-[#EADFCB] pb-3">
              <h3 className="font-amiri font-bold text-xl text-[#0F382C]">
                {editingPoem.id ? (lang === 'ar' ? 'تعديل المنظومة' : 'Edit Poem') : (lang === 'ar' ? 'إضافة منظومة جديدة' : 'Add New Poem')}
              </h3>
              <button
                type="button"
                onClick={() => setIsPoemModalOpen(false)}
                className="w-8 h-8 rounded-full bg-[#F4EFE6] text-[#0F382C] font-bold"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-readex mb-1">{lang === 'ar' ? 'عنوان المنظومة *' : 'Poem Title *'}</label>
                <input
                  type="text"
                  required
                  value={editingPoem.title || ''}
                  onChange={e => setEditingPoem({ ...editingPoem, title: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#E0D4C1] font-amiri font-bold text-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-readex mb-1">{lang === 'ar' ? 'البحر الشعري' : 'Poetic Meter'}</label>
                <input
                  type="text"
                  value={editingPoem.meter || 'بحر الرجز'}
                  onChange={e => setEditingPoem({ ...editingPoem, meter: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#E0D4C1] text-xs font-readex"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-readex mb-1">
                {lang === 'ar'
                  ? 'الأبيات سطراً بسطر (افصل بين الصدر والعجز بالرمز ۞ أو ...)'
                  : 'Verses line-by-line (split Al-Sadr and Al-Ajuz by ۞ or ...)'}
              </label>
              <textarea
                rows={8}
                value={poemRawLines}
                onChange={e => setPoemRawLines(e.target.value)}
                className="w-full p-3.5 rounded-xl border border-[#E0D4C1] font-amiri text-base leading-loose"
                placeholder="بَدَأْتُ بِاسْمِ رَبِّنَا الرَّحْمَنِ ۞ مُصَلِّيًا عَلَى النَّبِيِّ الْعَدْنَانِ"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#EADFCB] font-readex text-xs">
              <button
                type="button"
                onClick={() => setIsPoemModalOpen(false)}
                className="px-4 py-2 rounded-xl text-gray-600 hover:bg-gray-100"
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-[#0F382C] text-white font-bold hover:bg-[#164E3D]"
              >
                {t('save_changes')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ARTICLE EDIT / CREATE MODAL */}
      {isArticleModalOpen && editingArticle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <form
            onSubmit={handleSaveArticle}
            className="bg-[#FDFBF7] rounded-3xl max-w-2xl w-full border border-[#EADFCB] p-6 sm:p-8 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-[#EADFCB] pb-3">
              <h3 className="font-amiri font-bold text-xl text-[#0F382C]">
                {editingArticle.id ? (lang === 'ar' ? 'تعديل الخاطرة أو المقال' : 'Edit Reflection') : (lang === 'ar' ? 'نشر خاطرة / مقال جديد' : 'New Reflection / Paper')}
              </h3>
              <button
                type="button"
                onClick={() => setIsArticleModalOpen(false)}
                className="w-8 h-8 rounded-full bg-[#F4EFE6] text-[#0F382C] font-bold"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="block text-xs font-readex mb-1">{lang === 'ar' ? 'العنوان *' : 'Title *'}</label>
              <input
                type="text"
                required
                value={editingArticle.title || ''}
                onChange={e => setEditingArticle({ ...editingArticle, title: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-[#E0D4C1] font-amiri font-bold text-lg"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-readex mb-1">{t('article_type_filter')}</label>
                <select
                  value={editingArticle.type || 'خواطر ابن بيضاء'}
                  onChange={e => setEditingArticle({ ...editingArticle, type: e.target.value as any })}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#E0D4C1] text-xs font-readex bg-white"
                >
                  <option value="خواطر ابن بيضاء">{translateArticleType('خواطر ابن بيضاء')}</option>
                  <option value="بحث أكاديمي">{translateArticleType('بحث أكاديمي')}</option>
                  <option value="مقال عقدي">{translateArticleType('مقال عقدي')}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-readex mb-1">{t('year')}</label>
                <input
                  type="text"
                  value={editingArticle.date || 'اليوم'}
                  onChange={e => setEditingArticle({ ...editingArticle, date: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#E0D4C1] text-xs font-readex"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-readex mb-1">{lang === 'ar' ? 'نص الخاطرة / المقال كاملاً' : 'Full Content'}</label>
              <textarea
                rows={7}
                value={editingArticle.content || ''}
                onChange={e => setEditingArticle({ ...editingArticle, content: e.target.value })}
                className="w-full p-3.5 rounded-xl border border-[#E0D4C1] text-sm font-naskh leading-relaxed"
                placeholder="كتبه أبو سعيد ابن بيضاء..."
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#EADFCB] font-readex text-xs">
              <button
                type="button"
                onClick={() => setIsArticleModalOpen(false)}
                className="px-4 py-2 rounded-xl text-gray-600 hover:bg-gray-100"
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-[#0F382C] text-white font-bold hover:bg-[#164E3D]"
              >
                {t('save_changes')}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
