import React, { useState, useEffect, useCallback } from 'react';
import {
  Profile,
  Book,
  AudioCourse,
  AudioLesson,
  Poem,
  Article,
  ScheduleData,
  ScheduleCircle,
  Announcement,
  StudentQuestion,
  ScienceCategory
} from '../types';
import { useLanguage } from '../context/LanguageContext';
import { Pagination } from './Pagination';
import { AdminBulkImport } from './AdminBulkImport';
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
  Check,
  Lock,
  LogOut,
  KeyRound,
  ShieldAlert,
  AlertCircle,
  Search,
  ArrowUp,
  ArrowDown,
  ListMusic,
  Globe,
  Bell,
  Tags,
  User,
  Clock,
  MapPin,
  Star,
  FolderSync,
  RefreshCw
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

const DEFAULT_SAMPLE_AUDIO_URL = 'https://cdn.mp3quran.net/audio/mishary-alafasy/r1/001.mp3';
const ADMIN_PAGE_SIZE = 6;

type AdminTab =
  | 'books'
  | 'audios'
  | 'poetry'
  | 'articles'
  | 'schedule'
  | 'questions'
  | 'profile'
  | 'bulk'
  | 'security';

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

  // Active Tab + Search + Pagination + Action Feedback
  const [activeTab, setActiveTab] = useState<AdminTab>('books');
  const [tabSearch, setTabSearch] = useState('');
  const [tabPage, setTabPage] = useState(1);
  const [questionFilter, setQuestionFilter] = useState<'all' | 'pending' | 'answered'>('all');
  const [actionBanner, setActionBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Inline Delete Confirmation Modal state
  const [pendingDelete, setPendingDelete] = useState<{
    label: string;
    onConfirm: () => Promise<void>;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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
  const [articleTagsInput, setArticleTagsInput] = useState<string>('');
  const [isArticleModalOpen, setIsArticleModalOpen] = useState(false);

  // Schedule & Academy state
  const [scheduleForm, setScheduleForm] = useState<ScheduleData>(scheduleData);
  const [editingCircle, setEditingCircle] = useState<Partial<ScheduleCircle> | null>(null);
  const [isCircleModalOpen, setIsCircleModalOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Partial<Announcement> | null>(null);
  const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);

  // Profile & Categories Form state
  const [profileForm, setProfileForm] = useState<Profile>(profile);
  const [categoriesForm, setCategoriesForm] = useState<string[]>(categories);
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingCategories, setIsSavingCategories] = useState(false);

  // Answer question state
  const [answeringQId, setAnsweringQId] = useState<string | null>(null);
  const [answerText, setAnswerText] = useState('');

  const showBanner = useCallback((type: 'success' | 'error', text: string) => {
    setActionBanner({ type, text });
    setTimeout(() => {
      setActionBanner(prev => (prev?.text === text ? null : prev));
    }, 4000);
  }, []);

  // Sync local forms with incoming props when refreshed
  useEffect(() => {
    setProfileForm(profile);
  }, [profile]);

  useEffect(() => {
    setCategoriesForm(categories);
  }, [categories]);

  useEffect(() => {
    setScheduleForm(scheduleData);
  }, [scheduleData]);

  // Reset search & pagination when switching tabs
  useEffect(() => {
    setTabPage(1);
    setTabSearch('');
  }, [activeTab]);

  useEffect(() => {
    setTabPage(1);
  }, [tabSearch, questionFilter]);

  // Verify auth status and existing token on mount
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

    const token = localStorage.getItem('ibn_baydoah_admin_token');
    if (token) {
      fetch('/api/auth/verify', {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => {
          if (!res.ok) {
            localStorage.removeItem('ibn_baydoah_admin_token');
            setIsAuthenticated(false);
          }
        })
        .catch(() => {
          // Keep current state if network transient
        });
    }
  }, []);

  // Authenticated fetch wrapper
  const authFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
    const token = localStorage.getItem('ibn_baydoah_admin_token') || '';
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string> || {}),
      Authorization: `Bearer ${token}`
    };
    if (options.body && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    const res = await fetch(url, { ...options, headers });
    if (res.status === 401) {
      localStorage.removeItem('ibn_baydoah_admin_token');
      setIsAuthenticated(false);
      setAuthError(
        lang === 'ar'
          ? 'انتهت جلسة الدخول، يرجى تسجيل الدخول مجدداً.'
          : 'Your admin session has expired. Please sign in again.'
      );
    }
    return res;
  };

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
    } catch {
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
    } catch {
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
    try {
      const res = await authFetch('/api/auth/change-password', {
        method: 'POST',
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
    } catch {
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
        headers: { Authorization: `Bearer ${token}` }
      }).catch(console.error);
    }
    localStorage.removeItem('ibn_baydoah_admin_token');
    setIsAuthenticated(false);
  };

  // Confirm delete executor
  const executePendingDelete = async () => {
    if (!pendingDelete) return;
    setIsDeleting(true);
    try {
      await pendingDelete.onConfirm();
      setPendingDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };

  // ================= BOOK HANDLERS =================
  const openNewBook = () => {
    setEditingBook({
      title: '',
      subtitle: '',
      status: 'مخطوط',
      category: (categories[0] as ScienceCategory) || 'العقيدة والتوحيد',
      pages: 100,
      year: '١٤٤٦ هـ',
      description: '',
      hasPdf: false,
      downloadUrl: '',
      featured: false,
      collaborative: false,
      collaborators: ''
    });
    setIsBookModalOpen(true);
  };

  const handleSaveBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBook || !editingBook.title) return;

    const payload = {
      ...editingBook,
      hasPdf: Boolean(editingBook.hasPdf),
      downloadUrl: editingBook.hasPdf ? (editingBook.downloadUrl?.trim() || '#') : '#',
      featured: Boolean(editingBook.featured),
      collaborative: Boolean(editingBook.collaborative),
      collaborators: editingBook.collaborative ? (editingBook.collaborators || '') : ''
    };

    try {
      const res = editingBook.id
        ? await authFetch(`/api/books/${editingBook.id}`, {
            method: 'PUT',
            body: JSON.stringify(payload)
          })
        : await authFetch('/api/books', {
            method: 'POST',
            body: JSON.stringify(payload)
          });

      if (res.ok) {
        setIsBookModalOpen(false);
        setEditingBook(null);
        onDataRefresh();
        showBanner('success', lang === 'ar' ? 'تم حفظ بيانات المصنف بنجاح' : 'Treatise saved successfully');
      }
    } catch (err) {
      console.error(err);
      showBanner('error', lang === 'ar' ? 'تعذر حفظ المصنف' : 'Failed to save treatise');
    }
  };

  const requestDeleteBook = (b: Book) => {
    setPendingDelete({
      label: lang === 'ar' ? `حذف المصنف «${b.title}»` : `Delete treatise "${b.title}"`,
      onConfirm: async () => {
        const res = await authFetch(`/api/books/${b.id}`, { method: 'DELETE' });
        if (res.ok) {
          onDataRefresh();
          showBanner('success', lang === 'ar' ? 'تم حذف المصنف بنجاح' : 'Treatise deleted');
        }
      }
    });
  };

  // ================= AUDIO & PLAYLIST HANDLERS =================
  const openNewAudio = () => {
    const starterLesson: AudioLesson = {
      id: `l-${Date.now()}`,
      title: lang === 'ar' ? 'الدرس الأول: المقدمة والتمهيد' : 'Lesson 1: Introduction',
      duration: '45:00',
      audioUrl: DEFAULT_SAMPLE_AUDIO_URL
    };

    setEditingAudio({
      title: '',
      series: lang === 'ar' ? 'سلسلة جديدة' : 'New Series',
      category: (categories[0] as ScienceCategory) || 'العقيدة والتوحيد',
      level: 'مبتدئ',
      levelId: 'beginner',
      status: 'درس مستمر',
      totalLessons: 1,
      duration: '٤٥ دقيقة لكل درس',
      description: '',
      audioUrl: starterLesson.audioUrl,
      lessons: [starterLesson]
    });
    setIsAudioModalOpen(true);
  };

  const openEditAudio = (course: AudioCourse) => {
    const existingLessons: AudioLesson[] = (course.lessons || []).map(l => ({ ...l }));

    setEditingAudio({
      ...course,
      lessons: existingLessons,
      totalLessons: existingLessons.length
    });
    setIsAudioModalOpen(true);
  };

  const handleSyncSingleCourseR2 = async (course: AudioCourse) => {
    try {
      const res = await authFetch('/api/bulk/r2-sync', {
        method: 'POST',
        body: JSON.stringify({ courseId: course.id, dryRun: false })
      });
      const json = await res.json();
      if (res.ok && json.success) {
        onDataRefresh();
        showBanner(
          'success',
          lang === 'ar'
            ? `تمت مزامنة «${course.title}» (${json.data.totalLessonsSynced} درساً)`
            : `Synced "${course.title}" (${json.data.totalLessonsSynced} lessons)`
        );
      } else {
        showBanner('error', json.message || 'R2 sync unavailable');
      }
    } catch {
      showBanner('error', lang === 'ar' ? 'تعذر مزامنة R2' : 'R2 sync error');
    }
  };

  const handleAddLessonRow = () => {
    if (!editingAudio) return;
    const currentLessons = editingAudio.lessons || [];
    const nextNum = currentLessons.length + 1;
    const newLesson: AudioLesson = {
      id: `l-${Date.now()}-${nextNum}`,
      title: lang === 'ar' ? `الدرس رقم ${nextNum}` : `Lesson ${nextNum}`,
      duration: '45:00',
      audioUrl: DEFAULT_SAMPLE_AUDIO_URL
    };
    const updatedLessons = [...currentLessons, newLesson];
    setEditingAudio({
      ...editingAudio,
      lessons: updatedLessons,
      totalLessons: updatedLessons.length
    });
  };

  const handleUpdateLessonField = (index: number, field: keyof AudioLesson, value: string) => {
    if (!editingAudio) return;
    const currentLessons = [...(editingAudio.lessons || [])];
    if (!currentLessons[index]) return;
    currentLessons[index] = { ...currentLessons[index], [field]: value };
    setEditingAudio({
      ...editingAudio,
      lessons: currentLessons,
      audioUrl: index === 0 && field === 'audioUrl' ? value : editingAudio.audioUrl
    });
  };

  const handleMoveLesson = (index: number, direction: 'up' | 'down') => {
    if (!editingAudio) return;
    const list = [...(editingAudio.lessons || [])];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= list.length) return;
    [list[index], list[targetIdx]] = [list[targetIdx], list[index]];
    setEditingAudio({
      ...editingAudio,
      lessons: list,
      audioUrl: list[0]?.audioUrl || editingAudio.audioUrl
    });
  };

  const handleRemoveLesson = (index: number) => {
    if (!editingAudio) return;
    const currentLessons = [...(editingAudio.lessons || [])];
    const updated = currentLessons.filter((_, i) => i !== index);
    setEditingAudio({
      ...editingAudio,
      lessons: updated,
      totalLessons: updated.length,
      audioUrl: updated[0]?.audioUrl || ''
    });
  };

  const handleSaveAudio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAudio || !editingAudio.title) return;

    const finalLessons = (editingAudio.lessons || [])
      .filter(l => l.title.trim() || l.audioUrl.trim())
      .map((l, idx) => ({
        id: l.id || `l-${Date.now()}-${idx}`,
        title: l.title.trim() || (lang === 'ar' ? `الدرس ${idx + 1}` : `Lesson ${idx + 1}`),
        duration: l.duration.trim() || '45:00',
        audioUrl: l.audioUrl.trim() || DEFAULT_SAMPLE_AUDIO_URL
      }));

    const payload = {
      ...editingAudio,
      lessons: finalLessons,
      totalLessons: finalLessons.length,
      audioUrl: finalLessons[0]?.audioUrl || ''
    };

    try {
      const res = editingAudio.id
        ? await authFetch(`/api/audios/${editingAudio.id}`, {
            method: 'PUT',
            body: JSON.stringify(payload)
          })
        : await authFetch('/api/audios', {
            method: 'POST',
            body: JSON.stringify(payload)
          });

      if (res.ok) {
        setIsAudioModalOpen(false);
        setEditingAudio(null);
        onDataRefresh();
        showBanner('success', lang === 'ar' ? 'تم حفظ السلسلة الصوتية ودروسها بنجاح' : 'Audio course & playlist saved');
      }
    } catch (err) {
      console.error(err);
      showBanner('error', lang === 'ar' ? 'تعذر حفظ الشرح الصوتي' : 'Failed to save audio course');
    }
  };

  const requestDeleteAudio = (a: AudioCourse) => {
    setPendingDelete({
      label: lang === 'ar' ? `حذف الشرح الصوتي «${a.title}»` : `Delete audio course "${a.title}"`,
      onConfirm: async () => {
        const res = await authFetch(`/api/audios/${a.id}`, { method: 'DELETE' });
        if (res.ok) {
          onDataRefresh();
          showBanner('success', lang === 'ar' ? 'تم حذف الشرح الصوتي' : 'Audio course deleted');
        }
      }
    });
  };

  // ================= POEM HANDLERS =================
  const openNewPoem = () => {
    setEditingPoem({
      title: '',
      meter: 'بحر الرجز',
      category: 'الأدب والأخلاق',
      summary: '',
      year: '١٤٤٦ هـ',
      totalVerses: 2
    });
    setPoemRawLines('الصدر الأول ۞ العجز الأول\nالصدر الثاني ۞ العجز الثاني');
    setIsPoemModalOpen(true);
  };

  const countParsedVerses = (raw: string) =>
    raw
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean).length;

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
          ajuz = (parts[1] || '').trim();
        } else if (line.includes('...')) {
          const parts = line.split('...');
          sadr = parts[0].trim();
          ajuz = (parts[1] || '').trim();
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
      const res = editingPoem.id
        ? await authFetch(`/api/poetry/${editingPoem.id}`, {
            method: 'PUT',
            body: JSON.stringify(poemToSave)
          })
        : await authFetch('/api/poetry', {
            method: 'POST',
            body: JSON.stringify(poemToSave)
          });

      if (res.ok) {
        setIsPoemModalOpen(false);
        setEditingPoem(null);
        onDataRefresh();
        showBanner('success', lang === 'ar' ? 'تم حفظ المنظومة بنجاح' : 'Poem saved successfully');
      }
    } catch (err) {
      console.error(err);
      showBanner('error', lang === 'ar' ? 'تعذر حفظ المنظومة' : 'Failed to save poem');
    }
  };

  const requestDeletePoem = (p: Poem) => {
    setPendingDelete({
      label: lang === 'ar' ? `حذف المنظومة «${p.title}»` : `Delete poem "${p.title}"`,
      onConfirm: async () => {
        const res = await authFetch(`/api/poetry/${p.id}`, { method: 'DELETE' });
        if (res.ok) {
          onDataRefresh();
          showBanner('success', lang === 'ar' ? 'تم حذف المنظومة' : 'Poem deleted');
        }
      }
    });
  };

  // ================= ARTICLE HANDLERS =================
  const openNewArticle = () => {
    setEditingArticle({
      title: lang === 'ar' ? 'خاطرة رقم (٥١٣): ' : 'Reflection #513: ',
      type: 'خواطر ابن بيضاء',
      category: (categories[0] as ScienceCategory) || 'الأدب والبلاغة واللغة',
      date: lang === 'ar' ? 'اليوم' : 'Today',
      summary: '',
      content: '',
      tags: ['خواطر ابن بيضاء']
    });
    setArticleTagsInput('خواطر ابن بيضاء');
    setIsArticleModalOpen(true);
  };

  const openEditArticle = (art: Article) => {
    setEditingArticle(art);
    setArticleTagsInput((art.tags || []).join(', '));
    setIsArticleModalOpen(true);
  };

  const handleSaveArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingArticle || !editingArticle.title) return;

    const tags = articleTagsInput
      .split(/[,،]/)
      .map(s => s.trim())
      .filter(Boolean);

    const payload = {
      ...editingArticle,
      tags: tags.length > 0 ? tags : ['خواطر ابن بيضاء']
    };

    try {
      const res = editingArticle.id
        ? await authFetch(`/api/articles/${editingArticle.id}`, {
            method: 'PUT',
            body: JSON.stringify(payload)
          })
        : await authFetch('/api/articles', {
            method: 'POST',
            body: JSON.stringify(payload)
          });

      if (res.ok) {
        setIsArticleModalOpen(false);
        setEditingArticle(null);
        onDataRefresh();
        showBanner('success', lang === 'ar' ? 'تم حفظ المنشور بنجاح' : 'Article saved successfully');
      }
    } catch (err) {
      console.error(err);
      showBanner('error', lang === 'ar' ? 'تعذر حفظ المقال' : 'Failed to save article');
    }
  };

  const requestDeleteArticle = (art: Article) => {
    setPendingDelete({
      label: lang === 'ar' ? `حذف المقال «${art.title}»` : `Delete article "${art.title}"`,
      onConfirm: async () => {
        const res = await authFetch(`/api/articles/${art.id}`, { method: 'DELETE' });
        if (res.ok) {
          onDataRefresh();
          showBanner('success', lang === 'ar' ? 'تم حذف المقال' : 'Article deleted');
        }
      }
    });
  };

  // ================= SCHEDULE & ACADEMY HANDLERS =================
  const persistSchedule = async (nextSchedule: ScheduleData, successMsg: string) => {
    setIsSavingSchedule(true);
    try {
      const res = await authFetch('/api/schedule', {
        method: 'PUT',
        body: JSON.stringify(nextSchedule)
      });
      if (res.ok) {
        setScheduleForm(nextSchedule);
        onDataRefresh();
        showBanner('success', successMsg);
        return true;
      }
    } catch (err) {
      console.error(err);
      showBanner('error', lang === 'ar' ? 'حدث خطأ أثناء حفظ جدول الحلقات' : 'Error updating schedule');
    } finally {
      setIsSavingSchedule(false);
    }
    return false;
  };

  const openNewCircle = () => {
    setEditingCircle({
      day: 'الجمعة',
      dayEnglish: 'Friday',
      time: 'بعد العصر إلى قبيل المغرب',
      timeEnglish: "After 'Asr to before Maghrib",
      subject: '',
      category: (categories[0] as ScienceCategory) || 'العقيدة والتوحيد',
      location: 'مركز الإمام سيبويه، شارع أولوجي، إلورن',
      locationEnglish: 'Markaz Al-Imām Sībawayh, Oloje Road, Ilorin',
      type: 'حضوري وبث مباشر'
    });
    setIsCircleModalOpen(true);
  };

  const handleSaveCircle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCircle || !editingCircle.subject) return;

    const existing = scheduleForm.weeklyCircles || [];
    let updatedCircles: ScheduleCircle[];
    if (editingCircle.id) {
      updatedCircles = existing.map(c =>
        c.id === editingCircle.id ? ({ ...c, ...editingCircle } as ScheduleCircle) : c
      );
    } else {
      const newCircle: ScheduleCircle = {
        ...(editingCircle as ScheduleCircle),
        id: `c-${Date.now()}`
      };
      updatedCircles = [...existing, newCircle];
    }

    const ok = await persistSchedule(
      { ...scheduleForm, weeklyCircles: updatedCircles },
      lang === 'ar' ? 'تم تحديث الحلقات الأسبوعية بنجاح' : 'Weekly circles updated'
    );
    if (ok) {
      setIsCircleModalOpen(false);
      setEditingCircle(null);
    }
  };

  const requestDeleteCircle = (c: ScheduleCircle) => {
    setPendingDelete({
      label: lang === 'ar' ? `حذف حلقة «${c.subject}»` : `Delete teaching circle "${c.subject}"`,
      onConfirm: async () => {
        const updatedCircles = (scheduleForm.weeklyCircles || []).filter(item => item.id !== c.id);
        await persistSchedule(
          { ...scheduleForm, weeklyCircles: updatedCircles },
          lang === 'ar' ? 'تم حذف الحلقة' : 'Circle removed'
        );
      }
    });
  };

  const openNewAnnouncement = () => {
    setEditingAnnouncement({
      title: '',
      date: lang === 'ar' ? '١٤٤٦ هـ' : '1446 AH',
      badge: 'دورة جديدة',
      details: ''
    });
    setIsAnnouncementModalOpen(true);
  };

  const handleSaveAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAnnouncement || !editingAnnouncement.title) return;

    const existing = scheduleForm.announcements || [];
    let updatedAnnouncements: Announcement[];
    if (editingAnnouncement.id) {
      updatedAnnouncements = existing.map(a =>
        a.id === editingAnnouncement.id ? ({ ...a, ...editingAnnouncement } as Announcement) : a
      );
    } else {
      const newAnn: Announcement = {
        ...(editingAnnouncement as Announcement),
        id: `ann-${Date.now()}`
      };
      updatedAnnouncements = [newAnn, ...existing];
    }

    const ok = await persistSchedule(
      { ...scheduleForm, announcements: updatedAnnouncements },
      lang === 'ar' ? 'تم حفظ الإعلان بنجاح' : 'Announcement saved'
    );
    if (ok) {
      setIsAnnouncementModalOpen(false);
      setEditingAnnouncement(null);
    }
  };

  const requestDeleteAnnouncement = (ann: Announcement) => {
    setPendingDelete({
      label: lang === 'ar' ? `حذف الإعلان «${ann.title}»` : `Delete announcement "${ann.title}"`,
      onConfirm: async () => {
        const updatedAnnouncements = (scheduleForm.announcements || []).filter(a => a.id !== ann.id);
        await persistSchedule(
          { ...scheduleForm, announcements: updatedAnnouncements },
          lang === 'ar' ? 'تم حذف الإعلان' : 'Announcement deleted'
        );
      }
    });
  };

  const handleSaveDistanceAcademy = async (e: React.FormEvent) => {
    e.preventDefault();
    await persistSchedule(
      scheduleForm,
      lang === 'ar' ? 'تم حفظ إعدادات الأكاديمية الافتراضية بنجاح' : 'Virtual academy settings saved'
    );
  };

  // ================= QUESTIONS HANDLERS =================
  const handleSaveAnswer = async (id: string) => {
    try {
      const res = await authFetch(`/api/questions/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ answer: answerText })
      });
      if (res.ok) {
        setAnsweringQId(null);
        setAnswerText('');
        onDataRefresh();
        showBanner('success', lang === 'ar' ? 'تم حفظ جواب الشيخ بنجاح' : 'Answer saved successfully');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const requestDeleteQuestion = (q: StudentQuestion) => {
    setPendingDelete({
      label: lang === 'ar' ? `حذف سؤال «${q.studentName}»` : `Delete inquiry from "${q.studentName}"`,
      onConfirm: async () => {
        const res = await authFetch(`/api/questions/${q.id}`, { method: 'DELETE' });
        if (res.ok) {
          onDataRefresh();
          showBanner('success', lang === 'ar' ? 'تم حذف السؤال' : 'Inquiry deleted');
        }
      }
    });
  };

  // ================= PROFILE & CATEGORIES HANDLERS =================
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    try {
      const res = await authFetch('/api/profile', {
        method: 'PUT',
        body: JSON.stringify(profileForm)
      });
      if (res.ok) {
        onDataRefresh();
        showBanner('success', lang === 'ar' ? 'تم تحديث بيانات الشيخ بنجاح!' : 'Scholar profile updated!');
      }
    } catch (err) {
      console.error(err);
      showBanner('error', lang === 'ar' ? 'تعذر حفظ البيانات' : 'Failed to save profile');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleAddCategory = () => {
    const val = newCategoryInput.trim();
    if (!val || categoriesForm.includes(val)) return;
    setCategoriesForm(prev => [...prev, val]);
    setNewCategoryInput('');
  };

  const handleRemoveCategory = (idx: number) => {
    if (categoriesForm.length <= 1) return;
    setCategoriesForm(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSaveCategories = async () => {
    setIsSavingCategories(true);
    try {
      const res = await authFetch('/api/categories', {
        method: 'PUT',
        body: JSON.stringify({ categories: categoriesForm })
      });
      if (res.ok) {
        onDataRefresh();
        showBanner('success', lang === 'ar' ? 'تم تحديث الفنون العلمية بنجاح' : 'Disciplines updated');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingCategories(false);
    }
  };

  // ================= UNAUTHENTICATED LOGIN / SETUP =================
  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto my-12 sm:my-16 bg-white rounded-3xl border border-[#EADFCB] p-7 sm:p-9 shadow-[0_4px_24px_-4px_rgba(15,56,44,0.08)]">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-[#0F382C] border border-[#C5A880]/40 flex items-center justify-center mx-auto mb-3 shadow-xs">
            <Lock className="w-6 h-6 text-[#DFC7A5]" />
          </div>
          <h2 className="font-amiri font-bold text-2xl text-[#0F382C]">
            {lang === 'ar' ? 'لوحة تحكم إدارة المنصة' : 'Admin Control Portal'}
          </h2>
          <p className="text-xs text-[#9A7947] font-readex mt-1">
            {lang === 'ar'
              ? 'تسجيل الدخول لإدارة المؤلفات، الشروح، الحلقات والخواطر'
              : 'Sign in to manage treatises, audio playlists, schedule, and inquiries'}
          </p>
        </div>

        {!isConfigured ? (
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

  // ================= FILTERED & PAGINATED DATA =================
  const qLower = tabSearch.trim().toLowerCase();

  const filteredBooks = books.filter(b =>
    !qLower ||
    b.title.toLowerCase().includes(qLower) ||
    b.category.toLowerCase().includes(qLower) ||
    b.status.toLowerCase().includes(qLower)
  );
  const paginatedBooks = filteredBooks.slice((tabPage - 1) * ADMIN_PAGE_SIZE, tabPage * ADMIN_PAGE_SIZE);

  const filteredAudios = audios.filter(a =>
    !qLower ||
    a.title.toLowerCase().includes(qLower) ||
    a.series.toLowerCase().includes(qLower) ||
    a.category.toLowerCase().includes(qLower)
  );
  const paginatedAudios = filteredAudios.slice((tabPage - 1) * ADMIN_PAGE_SIZE, tabPage * ADMIN_PAGE_SIZE);

  const filteredPoems = poems.filter(p =>
    !qLower ||
    p.title.toLowerCase().includes(qLower) ||
    p.meter.toLowerCase().includes(qLower) ||
    p.category.toLowerCase().includes(qLower)
  );
  const paginatedPoems = filteredPoems.slice((tabPage - 1) * ADMIN_PAGE_SIZE, tabPage * ADMIN_PAGE_SIZE);

  const filteredArticles = articles.filter(art =>
    !qLower ||
    art.title.toLowerCase().includes(qLower) ||
    art.type.toLowerCase().includes(qLower) ||
    art.category.toLowerCase().includes(qLower)
  );
  const paginatedArticles = filteredArticles.slice((tabPage - 1) * ADMIN_PAGE_SIZE, tabPage * ADMIN_PAGE_SIZE);

  const filteredQuestions = questions.filter(q => {
    const matchesStatus =
      questionFilter === 'all'
        ? true
        : questionFilter === 'pending'
        ? !q.answer
        : Boolean(q.answer);
    const matchesSearch =
      !qLower ||
      q.studentName.toLowerCase().includes(qLower) ||
      q.question.toLowerCase().includes(qLower) ||
      (q.answer && q.answer.toLowerCase().includes(qLower));
    return matchesStatus && matchesSearch;
  });
  const paginatedQuestions = filteredQuestions.slice((tabPage - 1) * ADMIN_PAGE_SIZE, tabPage * ADMIN_PAGE_SIZE);

  const pendingQuestionsCount = questions.filter(q => !q.answer).length;
  const totalLessonsAcrossAudios = audios.reduce((sum, a) => sum + (a.lessons?.length || 0), 0);

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Top Admin Header */}
      <div className="bg-[#0F382C] text-[#FDFBF7] rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-md border border-[#0F382C]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-5 h-5 text-[#DFC7A5]" />
            <h2 className="font-amiri font-bold text-2xl sm:text-3xl">
              {lang === 'ar' ? 'لوحة الإدارة والتحكم العلمي' : 'Admin Scholarly Dashboard'}
            </h2>
          </div>
          <p className="text-xs text-[#DFC7A5]/85 font-readex">
            {lang === 'ar'
              ? 'إدارة شاملة لجميع أقسام المنصة: المكتبة، الشروح ودروسها، المنظومات، الخواطر، الحلقات، والملف الشخصي'
              : 'Full CMS control over Library, Audio Playlists, Diwan, Reflections, Schedule & Virtual Academy, Inquiries & Profile'}
          </p>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-[#DFC7A5] font-readex text-xs font-medium border border-[#C5A880]/30 transition shrink-0"
        >
          <LogOut className="w-4 h-4" />
          <span>{lang === 'ar' ? 'تسجيل الخروج' : 'Sign Out'}</span>
        </button>
      </div>

      {/* Overview KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-readex">
        <button
          onClick={() => setActiveTab('books')}
          className="p-3.5 rounded-2xl bg-white border border-[#EADFCB] hover:border-[#0F382C]/40 text-start transition shadow-2xs"
        >
          <span className="text-[11px] text-[#8C6D3B] font-semibold block">{lang === 'ar' ? 'المؤلفات' : 'Books'}</span>
          <span className="font-amiri font-bold text-2xl text-[#0F382C]">{books.length}</span>
        </button>

        <button
          onClick={() => setActiveTab('audios')}
          className="p-3.5 rounded-2xl bg-white border border-[#EADFCB] hover:border-[#0F382C]/40 text-start transition shadow-2xs"
        >
          <span className="text-[11px] text-[#8C6D3B] font-semibold block">
            {lang === 'ar' ? 'السلاسل / الدروس' : 'Courses / Lessons'}
          </span>
          <span className="font-amiri font-bold text-2xl text-[#0F382C]">
            {audios.length} <span className="text-sm font-readex text-[#A58455]">({totalLessonsAcrossAudios})</span>
          </span>
        </button>

        <button
          onClick={() => setActiveTab('poetry')}
          className="p-3.5 rounded-2xl bg-white border border-[#EADFCB] hover:border-[#0F382C]/40 text-start transition shadow-2xs"
        >
          <span className="text-[11px] text-[#8C6D3B] font-semibold block">{lang === 'ar' ? 'المنظومات' : 'Poems'}</span>
          <span className="font-amiri font-bold text-2xl text-[#0F382C]">{poems.length}</span>
        </button>

        <button
          onClick={() => setActiveTab('articles')}
          className="p-3.5 rounded-2xl bg-white border border-[#EADFCB] hover:border-[#0F382C]/40 text-start transition shadow-2xs"
        >
          <span className="text-[11px] text-[#8C6D3B] font-semibold block">{lang === 'ar' ? 'الخواطر والمقالات' : 'Articles'}</span>
          <span className="font-amiri font-bold text-2xl text-[#0F382C]">{articles.length}</span>
        </button>

        <button
          onClick={() => setActiveTab('schedule')}
          className="p-3.5 rounded-2xl bg-white border border-[#EADFCB] hover:border-[#0F382C]/40 text-start transition shadow-2xs"
        >
          <span className="text-[11px] text-[#8C6D3B] font-semibold block">{lang === 'ar' ? 'الحلقات والإعلانات' : 'Circles & News'}</span>
          <span className="font-amiri font-bold text-2xl text-[#0F382C]">
            {scheduleData.weeklyCircles.length} <span className="text-sm font-readex text-[#A58455]">+ {scheduleData.announcements.length}</span>
          </span>
        </button>

        <button
          onClick={() => setActiveTab('questions')}
          className="p-3.5 rounded-2xl bg-white border border-[#EADFCB] hover:border-[#0F382C]/40 text-start transition shadow-2xs"
        >
          <span className="text-[11px] text-[#8C6D3B] font-semibold block">{lang === 'ar' ? 'الأسئلة المعلقة' : 'Pending Q&A'}</span>
          <span className="font-amiri font-bold text-2xl text-[#0F382C]">
            {pendingQuestionsCount} <span className="text-sm font-readex text-[#A58455]">/ {questions.length}</span>
          </span>
        </button>
      </div>

      {/* Action Feedback Banner */}
      {actionBanner && (
        <div
          className={`p-3.5 rounded-2xl border text-xs font-readex font-semibold flex items-center justify-between gap-2 ${
            actionBanner.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionBanner.type === 'success' ? (
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{actionBanner.text}</span>
          </div>
          <button onClick={() => setActionBanner(null)} className="text-xs px-2 py-0.5 rounded hover:bg-black/5">
            ✕
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-[#EADFCB] pb-3.5 font-readex text-xs font-semibold">
        <button
          onClick={() => setActiveTab('books')}
          className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl transition ${
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
          className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl transition ${
            activeTab === 'audios'
              ? 'bg-[#0F382C] text-white shadow-xs'
              : 'bg-white text-[#0F382C] border border-[#E0D4C1] hover:bg-[#F2ECE1]'
          }`}
        >
          <Headphones className="w-4 h-4" />
          <span>{lang === 'ar' ? `الشروح والدروس (${audios.length})` : `Audios (${audios.length})`}</span>
        </button>

        <button
          onClick={() => setActiveTab('poetry')}
          className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl transition ${
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
          className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl transition ${
            activeTab === 'articles'
              ? 'bg-[#0F382C] text-white shadow-xs'
              : 'bg-white text-[#0F382C] border border-[#E0D4C1] hover:bg-[#F2ECE1]'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>{lang === 'ar' ? `الخواطر (${articles.length})` : `Articles (${articles.length})`}</span>
        </button>

        <button
          onClick={() => setActiveTab('schedule')}
          className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl transition ${
            activeTab === 'schedule'
              ? 'bg-[#0F382C] text-white shadow-xs'
              : 'bg-white text-[#0F382C] border border-[#E0D4C1] hover:bg-[#F2ECE1]'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>{lang === 'ar' ? 'الحلقات والأكاديمية' : 'Schedule & Academy'}</span>
        </button>

        <button
          onClick={() => setActiveTab('questions')}
          className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl transition ${
            activeTab === 'questions'
              ? 'bg-[#0F382C] text-white shadow-xs'
              : 'bg-white text-[#0F382C] border border-[#E0D4C1] hover:bg-[#F2ECE1]'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>{lang === 'ar' ? `الأسئلة (${questions.length})` : `Inquiries (${questions.length})`}</span>
        </button>

        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl transition ${
            activeTab === 'profile'
              ? 'bg-[#0F382C] text-white shadow-xs'
              : 'bg-white text-[#0F382C] border border-[#E0D4C1] hover:bg-[#F2ECE1]'
          }`}
        >
          <User className="w-4 h-4" />
          <span>{lang === 'ar' ? 'السيرة والفنون' : 'Profile & Disciplines'}</span>
        </button>

        <button
          onClick={() => setActiveTab('bulk')}
          className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl transition ${
            activeTab === 'bulk'
              ? 'bg-[#0F382C] text-white shadow-xs'
              : 'bg-white text-[#0F382C] border border-[#E0D4C1] hover:bg-[#F2ECE1]'
          }`}
        >
          <FolderSync className="w-4 h-4 text-[#A58455]" />
          <span>{lang === 'ar' ? 'الاستيراد ومزامنة R2' : 'Bulk Import & R2'}</span>
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl transition ${
            activeTab === 'security'
              ? 'bg-[#0F382C] text-white shadow-xs'
              : 'bg-white text-[#0F382C] border border-[#E0D4C1] hover:bg-[#F2ECE1]'
          }`}
        >
          <KeyRound className="w-4 h-4 text-[#A58455]" />
          <span>{lang === 'ar' ? 'الأمان' : 'Security'}</span>
        </button>
      </div>

      {/* ================= 1. BOOKS MANAGEMENT TAB ================= */}
      {activeTab === 'books' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="font-amiri font-bold text-xl text-[#0F382C]">
              {lang === 'ar' ? 'إدارة المؤلفات والكتب' : 'Manage Books & Treatises'}
            </h3>
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative flex-1 sm:w-64">
                <input
                  type="text"
                  value={tabSearch}
                  onChange={e => setTabSearch(e.target.value)}
                  placeholder={lang === 'ar' ? 'بحث في الكتب...' : 'Search books...'}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#E0D4C1] bg-white text-xs font-readex"
                />
                <Search className="w-3.5 h-3.5 text-[#A58455] absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
              <button
                onClick={openNewBook}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0F382C] text-white text-xs font-readex font-bold hover:bg-[#164E3D] shadow-xs"
              >
                <Plus className="w-4 h-4 text-[#DFC7A5]" />
                <span>{lang === 'ar' ? 'إضافة مؤلف جديد' : 'Add Treatise'}</span>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#EADFCB] overflow-x-auto shadow-xs">
            <table className="w-full text-right text-xs font-readex rtl:text-right ltr:text-left">
              <thead className="bg-[#F6F1E7] border-b border-[#EADFCB] text-[#0F382C]">
                <tr>
                  <th className="p-3.5 font-bold">{lang === 'ar' ? 'عنوان المصنف' : 'Treatise Title'}</th>
                  <th className="p-3.5 font-bold">{lang === 'ar' ? 'الفن العلمي' : 'Discipline'}</th>
                  <th className="p-3.5 font-bold">{lang === 'ar' ? 'الحالة' : 'Status'}</th>
                  <th className="p-3.5 font-bold">{lang === 'ar' ? 'خيارات' : 'Flags'}</th>
                  <th className="p-3.5 font-bold">{lang === 'ar' ? 'الصفحات' : 'Pages'}</th>
                  <th className="p-3.5 text-center font-bold">{lang === 'ar' ? 'الإجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EADFCB]/60">
                {paginatedBooks.map(b => (
                  <tr key={b.id} className="hover:bg-[#FDFBF7]">
                    <td className="p-3.5">
                      <div className="font-amiri font-bold text-base text-[#0F382C]">{b.title}</div>
                      {b.subtitle && <div className="text-[11px] text-[#8C6D3B]">{b.subtitle}</div>}
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
                    <td className="p-3.5">
                      <div className="flex flex-wrap gap-1">
                        {b.featured && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 text-[10px] font-bold">
                            <Star className="w-2.5 h-2.5" />
                            {lang === 'ar' ? 'مميز' : 'Featured'}
                          </span>
                        )}
                        {b.hasPdf && (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                            PDF
                          </span>
                        )}
                        {b.collaborative && (
                          <span className="px-1.5 py-0.5 rounded bg-[#F4EFE6] text-[#0F382C] text-[10px] font-bold">
                            {lang === 'ar' ? 'مشترك' : 'Co-op'}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3.5">{b.pages}</td>
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => {
                            setEditingBook(b);
                            setIsBookModalOpen(true);
                          }}
                          className="p-1.5 rounded text-[#0F382C] hover:bg-[#F4EFE6]"
                          title={t('edit')}
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => requestDeleteBook(b)}
                          className="p-1.5 rounded text-red-600 hover:bg-red-50"
                          title={t('delete')}
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

          <Pagination
            currentPage={tabPage}
            totalItems={filteredBooks.length}
            pageSize={ADMIN_PAGE_SIZE}
            onPageChange={setTabPage}
          />
        </div>
      )}

      {/* ================= 2. AUDIOS MANAGEMENT TAB ================= */}
      {activeTab === 'audios' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="font-amiri font-bold text-xl text-[#0F382C]">
              {lang === 'ar' ? 'إدارة الشروح الصوتية وقوائم الدروس' : 'Manage Audio Series & Lesson Playlists'}
            </h3>
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative flex-1 sm:w-64">
                <input
                  type="text"
                  value={tabSearch}
                  onChange={e => setTabSearch(e.target.value)}
                  placeholder={lang === 'ar' ? 'بحث في الشروح...' : 'Search audio series...'}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#E0D4C1] bg-white text-xs font-readex"
                />
                <Search className="w-3.5 h-3.5 text-[#A58455] absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
              <button
                onClick={openNewAudio}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0F382C] text-white text-xs font-readex font-bold hover:bg-[#164E3D] shadow-xs"
              >
                <Plus className="w-4 h-4 text-[#DFC7A5]" />
                <span>{lang === 'ar' ? 'إضافة شرح صوتي جديد' : 'Add Audio Course'}</span>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#EADFCB] overflow-x-auto shadow-xs">
            <table className="w-full text-right text-xs font-readex rtl:text-right ltr:text-left">
              <thead className="bg-[#F6F1E7] border-b border-[#EADFCB] text-[#0F382C]">
                <tr>
                  <th className="p-3.5 font-bold">{lang === 'ar' ? 'عنوان الشرح' : 'Course Title'}</th>
                  <th className="p-3.5 font-bold">{lang === 'ar' ? 'المستوى' : 'Level'}</th>
                  <th className="p-3.5 font-bold">{lang === 'ar' ? 'الفن' : 'Discipline'}</th>
                  <th className="p-3.5 font-bold">{lang === 'ar' ? 'الدروس المسجلة' : 'Recorded Lessons'}</th>
                  <th className="p-3.5 font-bold">{lang === 'ar' ? 'الحالة' : 'Status'}</th>
                  <th className="p-3.5 text-center font-bold">{lang === 'ar' ? 'الإجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EADFCB]/60">
                {paginatedAudios.map(a => {
                  const lessonsCount = a.lessons?.length || 0;
                  return (
                    <tr key={a.id} className="hover:bg-[#FDFBF7]">
                      <td className="p-3.5">
                        <div className="font-amiri font-bold text-base text-[#0F382C]">{a.title}</div>
                        <div className="text-[11px] text-[#8C6D3B]">{a.series}</div>
                      </td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded bg-[#F4EFE6] font-bold">
                          {translateLevel(a.level)}
                        </span>
                      </td>
                      <td className="p-3.5">{translateCategory(a.category)}</td>
                      <td className="p-3.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border font-bold ${lessonsCount > 0 ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-[#FAF6EE] text-[#8C6D3B] border-[#EADFCB]'}`}>
                            <ListMusic className="w-3.5 h-3.5" />
                            <span>{lessonsCount}</span>
                          </span>
                          {a.expectedLessons && lessonsCount < a.expectedLessons && (
                            <span className="text-[10px] text-[#8C6D3B]">
                              / {a.expectedLessons}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3.5">{a.status}</td>
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {a.r2Prefix && (
                            <button
                              onClick={() => handleSyncSingleCourseR2(a)}
                              className="p-1.5 rounded-lg bg-[#FAF6EE] text-[#0F382C] hover:bg-[#E8DCC9] border border-[#E0D4C1]"
                              title={lang === 'ar' ? 'مزامنة من R2' : 'Sync from R2'}
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => openEditAudio(a)}
                            className="px-2.5 py-1 rounded-lg bg-[#F4EFE6] text-[#0F382C] hover:bg-[#E8DCC9] text-[11px] font-bold flex items-center gap-1"
                            title={t('edit')}
                          >
                            <Edit className="w-3.5 h-3.5" />
                            <span>{lang === 'ar' ? 'تعديل والدروس' : 'Edit & Lessons'}</span>
                          </button>
                          <button
                            onClick={() => requestDeleteAudio(a)}
                            className="p-1.5 rounded text-red-600 hover:bg-red-50"
                            title={t('delete')}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <Pagination
            currentPage={tabPage}
            totalItems={filteredAudios.length}
            pageSize={ADMIN_PAGE_SIZE}
            onPageChange={setTabPage}
          />
        </div>
      )}

      {/* ================= 3. POETRY MANAGEMENT TAB ================= */}
      {activeTab === 'poetry' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="font-amiri font-bold text-xl text-[#0F382C]">
              {lang === 'ar' ? 'إدارة المنظومات والديوان الشعري' : 'Manage Poetry & Diwan'}
            </h3>
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative flex-1 sm:w-64">
                <input
                  type="text"
                  value={tabSearch}
                  onChange={e => setTabSearch(e.target.value)}
                  placeholder={lang === 'ar' ? 'بحث في المنظومات...' : 'Search poems...'}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#E0D4C1] bg-white text-xs font-readex"
                />
                <Search className="w-3.5 h-3.5 text-[#A58455] absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
              <button
                onClick={openNewPoem}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0F382C] text-white text-xs font-readex font-bold hover:bg-[#164E3D] shadow-xs"
              >
                <Plus className="w-4 h-4 text-[#DFC7A5]" />
                <span>{lang === 'ar' ? 'إضافة منظومة جديدة' : 'Add Poem'}</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {paginatedPoems.map(p => (
              <div
                key={p.id}
                className="p-5 rounded-2xl bg-white border border-[#EADFCB] shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs px-2.5 py-0.5 rounded bg-[#F4EFE6] text-[#A58455] font-readex font-semibold">
                      {translateMeter(p.meter)} • {translateCategory(p.category)}
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

                <div className="flex items-center justify-between gap-2 pt-3 border-t border-[#EADFCB]/60 mt-3 text-xs font-readex text-[#8C6D3B]">
                  <span>{p.year}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setEditingPoem(p);
                        const lines = (p.verses || [])
                          .map(v => `${v.sadr} ۞ ${v.ajuz}`)
                          .join('\n');
                        setPoemRawLines(lines);
                        setIsPoemModalOpen(true);
                      }}
                      className="p-1.5 rounded hover:bg-[#F4EFE6] text-[#0F382C]"
                      title={t('edit')}
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => requestDeletePoem(p)}
                      className="p-1.5 rounded hover:bg-red-50 text-red-600"
                      title={t('delete')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Pagination
            currentPage={tabPage}
            totalItems={filteredPoems.length}
            pageSize={ADMIN_PAGE_SIZE}
            onPageChange={setTabPage}
          />
        </div>
      )}

      {/* ================= 4. ARTICLES MANAGEMENT TAB ================= */}
      {activeTab === 'articles' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="font-amiri font-bold text-xl text-[#0F382C]">
              {lang === 'ar' ? 'إدارة الخواطر والمقالات' : 'Manage Reflections & Articles'}
            </h3>
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative flex-1 sm:w-64">
                <input
                  type="text"
                  value={tabSearch}
                  onChange={e => setTabSearch(e.target.value)}
                  placeholder={lang === 'ar' ? 'بحث في الخواطر...' : 'Search articles...'}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#E0D4C1] bg-white text-xs font-readex"
                />
                <Search className="w-3.5 h-3.5 text-[#A58455] absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
              <button
                onClick={openNewArticle}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0F382C] text-white text-xs font-readex font-bold hover:bg-[#164E3D] shadow-xs"
              >
                <Plus className="w-4 h-4 text-[#DFC7A5]" />
                <span>{lang === 'ar' ? 'نشر خاطرة أو مقال جديد' : 'New Article'}</span>
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {paginatedArticles.map(art => (
              <div
                key={art.id}
                className="p-4 rounded-2xl bg-white border border-[#EADFCB] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] px-2.5 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200 font-readex font-bold">
                      {translateArticleType(art.type)}
                    </span>
                    <span className="text-[11px] px-2 py-0.5 rounded bg-[#F4EFE6] text-[#0F382C] font-readex">
                      {translateCategory(art.category)}
                    </span>
                    <span className="text-xs text-[#A58455] font-readex">{art.date}</span>
                  </div>
                  <h4 className="font-amiri font-bold text-lg text-[#0F382C]">{art.title}</h4>
                  {art.summary && (
                    <p className="font-naskh text-xs text-[#4B554E] line-clamp-1">{art.summary}</p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => openEditArticle(art)}
                    className="p-2 rounded-lg hover:bg-[#F4EFE6] text-[#0F382C]"
                    title={t('edit')}
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => requestDeleteArticle(art)}
                    className="p-2 rounded-lg hover:bg-red-50 text-red-600"
                    title={t('delete')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <Pagination
            currentPage={tabPage}
            totalItems={filteredArticles.length}
            pageSize={ADMIN_PAGE_SIZE}
            onPageChange={setTabPage}
          />
        </div>
      )}

      {/* ================= 5. SCHEDULE, CIRCLES & ACADEMY TAB ================= */}
      {activeTab === 'schedule' && (
        <div className="space-y-8">
          {/* Section A: Weekly Circles */}
          <div className="bg-white rounded-3xl border border-[#EADFCB] p-6 sm:p-8 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#EADFCB] pb-4">
              <div>
                <h3 className="font-amiri font-bold text-2xl text-[#0F382C] flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[#A58455]" />
                  <span>{lang === 'ar' ? 'إدارة الحلقات العلمية الأسبوعية' : 'Manage Weekly Teaching Circles'}</span>
                </h3>
                <p className="text-xs font-readex text-[#8C6D3B] mt-0.5">
                  {lang === 'ar'
                    ? 'أضف أو عدّل أو احذف أي حلقة حضورية أو بث مباشر في صفحة الجدول'
                    : 'Add, edit, or delete in-person or live-stream circles displayed on the Schedule page'}
                </p>
              </div>
              <button
                onClick={openNewCircle}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#0F382C] text-white text-xs font-readex font-bold hover:bg-[#164E3D] shadow-xs shrink-0"
              >
                <Plus className="w-4 h-4 text-[#DFC7A5]" />
                <span>{lang === 'ar' ? 'إضافة حلقة أسبوعية' : 'Add Teaching Circle'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(scheduleForm.weeklyCircles || []).map(circle => (
                <div
                  key={circle.id}
                  className="p-5 rounded-2xl bg-[#FDFBF7] border border-[#E0D4C1] flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-amiri font-bold text-lg text-[#0F382C] bg-white px-3 py-1 rounded-lg border border-[#E0D4C1]">
                        {lang === 'ar' ? circle.day : circle.dayEnglish || circle.day}
                      </span>
                      <span className="text-[11px] font-readex px-2 py-0.5 rounded bg-[#0F382C]/10 text-[#0F382C] font-semibold">
                        {translateCategory(circle.category)}
                      </span>
                    </div>
                    <h4 className="font-amiri font-bold text-lg text-[#0F382C] leading-snug">
                      {circle.subject}
                    </h4>
                    <div className="text-xs font-readex text-[#5A635E] space-y-1">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-[#A58455] shrink-0" />
                        <span>{lang === 'ar' ? circle.time : circle.timeEnglish || circle.time}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-[#A58455] shrink-0" />
                        <span className="line-clamp-1">{lang === 'ar' ? circle.location : circle.locationEnglish || circle.location}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#EADFCB] flex items-center justify-between text-xs font-readex">
                    <span className="text-emerald-700 font-semibold">{circle.type}</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setEditingCircle(circle);
                          setIsCircleModalOpen(true);
                        }}
                        className="p-1.5 rounded-lg hover:bg-[#F4EFE6] text-[#0F382C]"
                        title={t('edit')}
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => requestDeleteCircle(circle)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-red-600"
                        title={t('delete')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section B: Virtual Distance Learning Academy */}
          <form
            onSubmit={handleSaveDistanceAcademy}
            className="bg-white rounded-3xl border border-[#EADFCB] p-6 sm:p-8 shadow-xs space-y-6"
          >
            <div className="border-b border-[#EADFCB] pb-4">
              <h3 className="font-amiri font-bold text-2xl text-[#0F382C] flex items-center gap-2">
                <Globe className="w-5 h-5 text-[#A58455]" />
                <span>{lang === 'ar' ? 'إدارة الأكاديمية الافتراضية للتعليم عن بعد' : 'Virtual Distance Academy Settings'}</span>
              </h3>
              <p className="text-xs font-readex text-[#8C6D3B] mt-0.5">
                {lang === 'ar'
                  ? 'تحديث الاسم، الوصف، المزايا باللغتين، وروابط الانضمام الرسمية'
                  : 'Update bilingual name, description, feature bullets, and Telegram / WhatsApp join links'}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-readex font-semibold mb-1 text-[#1E1E1E]">
                  {lang === 'ar' ? 'اسم الأكاديمية (عربي)' : 'Academy Name (Arabic)'}
                </label>
                <input
                  type="text"
                  value={scheduleForm.distanceAcademy.name}
                  onChange={e =>
                    setScheduleForm({
                      ...scheduleForm,
                      distanceAcademy: { ...scheduleForm.distanceAcademy, name: e.target.value }
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E0D4C1] text-sm font-amiri font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-readex font-semibold mb-1 text-[#1E1E1E]">
                  {lang === 'ar' ? 'اسم الأكاديمية (إنجليزي - اختياري)' : 'Academy Name (English)'}
                </label>
                <input
                  type="text"
                  value={scheduleForm.distanceAcademy.englishName || ''}
                  onChange={e =>
                    setScheduleForm({
                      ...scheduleForm,
                      distanceAcademy: { ...scheduleForm.distanceAcademy, englishName: e.target.value }
                    })
                  }
                  placeholder="Virtual Scholarly Academy of Ustādh Abu Sa'eed Ibn Baydoah"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E0D4C1] text-xs font-latin"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-readex font-semibold mb-1 text-[#1E1E1E]">
                  {lang === 'ar' ? 'وصف الأكاديمية (عربي)' : 'Description (Arabic)'}
                </label>
                <textarea
                  rows={3}
                  value={scheduleForm.distanceAcademy.description}
                  onChange={e =>
                    setScheduleForm({
                      ...scheduleForm,
                      distanceAcademy: { ...scheduleForm.distanceAcademy, description: e.target.value }
                    })
                  }
                  className="w-full p-3 rounded-xl border border-[#E0D4C1] text-sm font-naskh leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs font-readex font-semibold mb-1 text-[#1E1E1E]">
                  {lang === 'ar' ? 'وصف الأكاديمية (إنجليزي - اختياري)' : 'Description (English)'}
                </label>
                <textarea
                  rows={3}
                  value={scheduleForm.distanceAcademy.englishDescription || ''}
                  onChange={e =>
                    setScheduleForm({
                      ...scheduleForm,
                      distanceAcademy: { ...scheduleForm.distanceAcademy, englishDescription: e.target.value }
                    })
                  }
                  placeholder="A comprehensive virtual distance-learning structure..."
                  className="w-full p-3 rounded-xl border border-[#E0D4C1] text-xs font-latin leading-relaxed"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-readex font-semibold mb-1 text-[#1E1E1E]">
                  {lang === 'ar' ? 'رابط قناة التيليجرام' : 'Telegram Channel Link'}
                </label>
                <input
                  type="url"
                  value={scheduleForm.distanceAcademy.telegramLink}
                  onChange={e =>
                    setScheduleForm({
                      ...scheduleForm,
                      distanceAcademy: { ...scheduleForm.distanceAcademy, telegramLink: e.target.value }
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E0D4C1] text-xs font-latin"
                />
              </div>

              <div>
                <label className="block text-xs font-readex font-semibold mb-1 text-[#1E1E1E]">
                  {lang === 'ar' ? 'رابط مجموعة / واتساب التوجيه' : 'WhatsApp Group / Contact Link'}
                </label>
                <input
                  type="url"
                  value={scheduleForm.distanceAcademy.whatsappGroup}
                  onChange={e =>
                    setScheduleForm({
                      ...scheduleForm,
                      distanceAcademy: { ...scheduleForm.distanceAcademy, whatsappGroup: e.target.value }
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E0D4C1] text-xs font-latin"
                />
              </div>
            </div>

            {/* Features Editor (AR & EN) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-readex font-bold text-[#0F382C]">
                    {lang === 'ar' ? 'مزايا الأكاديمية (عربي)' : 'Academy Features (Arabic)'}
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setScheduleForm({
                        ...scheduleForm,
                        distanceAcademy: {
                          ...scheduleForm.distanceAcademy,
                          features: [...(scheduleForm.distanceAcademy.features || []), '']
                        }
                      })
                    }
                    className="text-[11px] font-readex font-bold text-[#0F382C] px-2.5 py-1 rounded-lg bg-[#F4EFE6] hover:bg-[#E8DCC9]"
                  >
                    + {lang === 'ar' ? 'إضافة ميزة' : 'Add'}
                  </button>
                </div>
                {(scheduleForm.distanceAcademy.features || []).map((feat, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={feat}
                      onChange={e => {
                        const next = [...(scheduleForm.distanceAcademy.features || [])];
                        next[idx] = e.target.value;
                        setScheduleForm({
                          ...scheduleForm,
                          distanceAcademy: { ...scheduleForm.distanceAcademy, features: next }
                        });
                      }}
                      className="flex-1 px-3 py-2 rounded-xl border border-[#E0D4C1] text-xs font-naskh"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const next = (scheduleForm.distanceAcademy.features || []).filter((_, i) => i !== idx);
                        setScheduleForm({
                          ...scheduleForm,
                          distanceAcademy: { ...scheduleForm.distanceAcademy, features: next }
                        });
                      }}
                      className="p-2 rounded-lg text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-readex font-bold text-[#0F382C]">
                    {lang === 'ar' ? 'مزايا الأكاديمية (إنجليزي - اختياري)' : 'Academy Features (English)'}
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setScheduleForm({
                        ...scheduleForm,
                        distanceAcademy: {
                          ...scheduleForm.distanceAcademy,
                          englishFeatures: [...(scheduleForm.distanceAcademy.englishFeatures || []), '']
                        }
                      })
                    }
                    className="text-[11px] font-readex font-bold text-[#0F382C] px-2.5 py-1 rounded-lg bg-[#F4EFE6] hover:bg-[#E8DCC9]"
                  >
                    + {lang === 'ar' ? 'إضافة ميزة' : 'Add'}
                  </button>
                </div>
                {(scheduleForm.distanceAcademy.englishFeatures || []).map((feat, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={feat}
                      onChange={e => {
                        const next = [...(scheduleForm.distanceAcademy.englishFeatures || [])];
                        next[idx] = e.target.value;
                        setScheduleForm({
                          ...scheduleForm,
                          distanceAcademy: { ...scheduleForm.distanceAcademy, englishFeatures: next }
                        });
                      }}
                      className="flex-1 px-3 py-2 rounded-xl border border-[#E0D4C1] text-xs font-latin"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const next = (scheduleForm.distanceAcademy.englishFeatures || []).filter((_, i) => i !== idx);
                        setScheduleForm({
                          ...scheduleForm,
                          distanceAcademy: { ...scheduleForm.distanceAcademy, englishFeatures: next }
                        });
                      }}
                      className="p-2 rounded-lg text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {(!scheduleForm.distanceAcademy.englishFeatures || scheduleForm.distanceAcademy.englishFeatures.length === 0) && (
                  <p className="text-[11px] text-[#8C6D3B] font-readex italic">
                    {lang === 'ar'
                      ? 'عند تركها فارغة ستُعرض المزايا الإنجليزية الافتراضية للمنصة.'
                      : 'Leave empty to use default English highlights, or add custom bullets.'}
                  </p>
                )}
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSavingSchedule}
                className="px-6 py-2.5 rounded-xl bg-[#0F382C] text-white font-readex text-xs font-bold shadow-xs hover:bg-[#164E3D] disabled:opacity-50"
              >
                {isSavingSchedule
                  ? (lang === 'ar' ? 'جاري الحفظ...' : 'Saving...')
                  : (lang === 'ar' ? 'حفظ إعدادات الأكاديمية الافتراضية' : 'Save Virtual Academy Settings')}
              </button>
            </div>
          </form>

          {/* Section C: Announcements Board */}
          <div className="bg-white rounded-3xl border border-[#EADFCB] p-6 sm:p-8 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#EADFCB] pb-4">
              <div>
                <h3 className="font-amiri font-bold text-2xl text-[#0F382C] flex items-center gap-2">
                  <Bell className="w-5 h-5 text-[#A58455]" />
                  <span>{lang === 'ar' ? 'إدارة الإعلانات والدورات الحديثة' : 'Manage Announcements Board'}</span>
                </h3>
                <p className="text-xs font-readex text-[#8C6D3B] mt-0.5">
                  {lang === 'ar'
                    ? 'نشر الإعلانات والتنبيهات في لوحة الدورات الحديثة بصفحة الجدول'
                    : 'Publish or update announcements shown on the Schedule & Halaqat page'}
                </p>
              </div>
              <button
                onClick={openNewAnnouncement}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#0F382C] text-white text-xs font-readex font-bold hover:bg-[#164E3D] shadow-xs shrink-0"
              >
                <Plus className="w-4 h-4 text-[#DFC7A5]" />
                <span>{lang === 'ar' ? 'إضافة إعلان جديد' : 'Add Announcement'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(scheduleForm.announcements || []).map(ann => (
                <div
                  key={ann.id}
                  className="p-5 rounded-2xl bg-[#FDFBF7] border border-[#E0D4C1] flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-readex font-bold">
                        {ann.badge}
                      </span>
                      <span className="text-xs text-[#A58455] font-readex">{ann.date}</span>
                    </div>
                    <h4 className="font-amiri font-bold text-lg text-[#0F382C]">{ann.title}</h4>
                    <p className="font-naskh text-xs text-[#3A403C] leading-relaxed">{ann.details}</p>
                  </div>

                  <div className="pt-2 border-t border-[#EADFCB] flex items-center justify-end gap-2">
                    <button
                      onClick={() => {
                        setEditingAnnouncement(ann);
                        setIsAnnouncementModalOpen(true);
                      }}
                      className="p-1.5 rounded-lg hover:bg-[#F4EFE6] text-[#0F382C]"
                      title={t('edit')}
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => requestDeleteAnnouncement(ann)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-red-600"
                      title={t('delete')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ================= 6. QUESTIONS MANAGEMENT TAB ================= */}
      {activeTab === 'questions' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="font-amiri font-bold text-xl text-[#0F382C]">
              {lang === 'ar' ? 'مراجعة وإجابة أسئلة واستفتاءات الطلاب' : 'Review, Answer & Moderate Inquiries'}
            </h3>
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-xl border border-[#E0D4C1] bg-white p-1 text-xs font-readex">
                <button
                  onClick={() => setQuestionFilter('all')}
                  className={`px-3 py-1 rounded-lg transition ${questionFilter === 'all' ? 'bg-[#0F382C] text-white font-bold' : 'text-[#0F382C]'}`}
                >
                  {lang === 'ar' ? 'الكل' : 'All'} ({questions.length})
                </button>
                <button
                  onClick={() => setQuestionFilter('pending')}
                  className={`px-3 py-1 rounded-lg transition ${questionFilter === 'pending' ? 'bg-[#0F382C] text-white font-bold' : 'text-[#0F382C]'}`}
                >
                  {lang === 'ar' ? 'بانتظار الجواب' : 'Pending'} ({pendingQuestionsCount})
                </button>
                <button
                  onClick={() => setQuestionFilter('answered')}
                  className={`px-3 py-1 rounded-lg transition ${questionFilter === 'answered' ? 'bg-[#0F382C] text-white font-bold' : 'text-[#0F382C]'}`}
                >
                  {lang === 'ar' ? 'المجاب عنها' : 'Answered'} ({questions.length - pendingQuestionsCount})
                </button>
              </div>
              <div className="relative w-full sm:w-56">
                <input
                  type="text"
                  value={tabSearch}
                  onChange={e => setTabSearch(e.target.value)}
                  placeholder={lang === 'ar' ? 'بحث في الأسئلة...' : 'Search inquiries...'}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#E0D4C1] bg-white text-xs font-readex"
                />
                <Search className="w-3.5 h-3.5 text-[#A58455] absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {paginatedQuestions.map(q => (
              <div
                key={q.id}
                className="p-5 rounded-2xl bg-white border border-[#EADFCB] shadow-xs space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-readex">
                  <span className="font-bold text-[#0F382C]">
                    {t('inquirer')}: {q.studentName} ({translateCategory(q.category)})
                  </span>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${q.answer ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                      {q.answer ? (lang === 'ar' ? 'تمت الإجابة' : 'Answered') : (lang === 'ar' ? 'قيد الانتظار' : 'Pending')}
                    </span>
                    <span className="text-[#A58455]">{q.date}</span>
                    <button
                      onClick={() => requestDeleteQuestion(q)}
                      className="p-1 rounded text-red-600 hover:bg-red-50"
                      title={t('delete')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <p className="font-naskh text-sm font-semibold text-[#1E1E1E]">
                  «{q.question}»
                </p>

                {answeringQId === q.id ? (
                  <div className="space-y-2 pt-2">
                    <textarea
                      rows={4}
                      value={answerText}
                      onChange={e => setAnswerText(e.target.value)}
                      placeholder={lang === 'ar' ? 'اكتب جواب الشيخ المعتمد هنا...' : 'Write official scholarly answer here...'}
                      className="w-full p-3 rounded-xl border border-[#E0D4C1] text-sm font-naskh leading-relaxed"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleSaveAnswer(q.id)}
                        className="px-4 py-2 rounded-xl bg-[#0F382C] text-white text-xs font-readex font-bold"
                      >
                        {lang === 'ar' ? 'حفظ الجواب' : 'Save Answer'}
                      </button>
                      <button
                        onClick={() => setAnsweringQId(null)}
                        className="px-3.5 py-2 rounded-xl bg-gray-100 text-xs font-readex"
                      >
                        {t('cancel')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {q.answer && (
                      <div className="p-3.5 rounded-xl bg-[#FDFBF7] border border-[#EADFCB] font-naskh text-xs sm:text-sm text-[#0F382C] leading-relaxed">
                        <span className="font-bold block mb-1 text-xs font-readex text-[#A58455]">{t('shaykh_answer')}</span>
                        {q.answer}
                      </div>
                    )}
                    <button
                      onClick={() => {
                        setAnsweringQId(q.id);
                        setAnswerText(q.answer || '');
                      }}
                      className="px-3.5 py-1.5 rounded-lg bg-[#0F382C]/10 hover:bg-[#0F382C]/20 text-[#0F382C] text-xs font-readex font-bold inline-flex items-center gap-1.5"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>{q.answer ? (lang === 'ar' ? 'تعديل الجواب' : 'Edit Answer') : (lang === 'ar' ? 'إضافة جواب الشيخ' : 'Add Answer')}</span>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          <Pagination
            currentPage={tabPage}
            totalItems={filteredQuestions.length}
            pageSize={ADMIN_PAGE_SIZE}
            onPageChange={setTabPage}
          />
        </div>
      )}

      {/* ================= 7. PROFILE & CATEGORIES TAB ================= */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Scholar Profile Form (8 cols) */}
          <form
            onSubmit={handleSaveProfile}
            className="lg:col-span-8 bg-white rounded-3xl border border-[#EADFCB] p-6 sm:p-8 shadow-xs space-y-5"
          >
            <h3 className="font-amiri font-bold text-2xl text-[#0F382C] border-b border-[#EADFCB] pb-3">
              {lang === 'ar' ? 'تحديث السيرة الشخصية وبيانات المنصة' : 'Update Scholar Profile & Public Details'}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-readex font-semibold mb-1">{lang === 'ar' ? 'الاسم (عربي)' : 'Scholar Name (AR)'}</label>
                <input
                  type="text"
                  value={profileForm.name}
                  onChange={e => setProfileForm({ ...profileForm, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E0D4C1] text-sm font-amiri font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-readex font-semibold mb-1">{lang === 'ar' ? 'الاسم (إنجليزي)' : 'Scholar Name (EN)'}</label>
                <input
                  type="text"
                  value={profileForm.englishName}
                  onChange={e => setProfileForm({ ...profileForm, englishName: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E0D4C1] text-xs font-latin"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-readex font-semibold mb-1">{lang === 'ar' ? 'الصفة العلمية (عربي)' : 'Academic Role (AR)'}</label>
                <input
                  type="text"
                  value={profileForm.title}
                  onChange={e => setProfileForm({ ...profileForm, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E0D4C1] text-xs font-readex"
                />
              </div>
              <div>
                <label className="block text-xs font-readex font-semibold mb-1">{lang === 'ar' ? 'الصفة العلمية (إنجليزي)' : 'Academic Role (EN)'}</label>
                <input
                  type="text"
                  value={profileForm.englishTitle}
                  onChange={e => setProfileForm({ ...profileForm, englishTitle: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E0D4C1] text-xs font-latin"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-readex font-semibold mb-1">{lang === 'ar' ? 'المؤهل والدرجة (عربي)' : 'Degree (AR)'}</label>
                <input
                  type="text"
                  value={profileForm.degree}
                  onChange={e => setProfileForm({ ...profileForm, degree: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E0D4C1] text-xs font-readex"
                />
              </div>
              <div>
                <label className="block text-xs font-readex font-semibold mb-1">{lang === 'ar' ? 'المؤهل والدرجة (إنجليزي)' : 'Degree (EN)'}</label>
                <input
                  type="text"
                  value={profileForm.englishDegree}
                  onChange={e => setProfileForm({ ...profileForm, englishDegree: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E0D4C1] text-xs font-latin"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-readex font-semibold mb-1">{lang === 'ar' ? 'دعاء الشريط العلوي (Header Du\'a)' : 'Header Qur\'anic Du\'a'}</label>
              <input
                type="text"
                value={profileForm.dua_header}
                onChange={e => setProfileForm({ ...profileForm, dua_header: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E0D4C1] text-sm font-amiri"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-readex font-semibold mb-1">{lang === 'ar' ? 'النبذة التعريفية (عربي)' : 'Biography (Arabic)'}</label>
                <textarea
                  rows={4}
                  value={profileForm.bio}
                  onChange={e => setProfileForm({ ...profileForm, bio: e.target.value })}
                  className="w-full p-3 rounded-xl border border-[#E0D4C1] text-xs font-naskh leading-relaxed"
                />
              </div>
              <div>
                <label className="block text-xs font-readex font-semibold mb-1">{lang === 'ar' ? 'النبذة التعريفية (إنجليزي)' : 'Biography (English)'}</label>
                <textarea
                  rows={4}
                  value={profileForm.bioEnglish || ''}
                  onChange={e => setProfileForm({ ...profileForm, bioEnglish: e.target.value })}
                  placeholder="Optional English biography override for the Hero section..."
                  className="w-full p-3 rounded-xl border border-[#E0D4C1] text-xs font-latin leading-relaxed"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-readex font-semibold mb-1">{lang === 'ar' ? 'المقر (عربي)' : 'Location (AR)'}</label>
                <input
                  type="text"
                  value={profileForm.location}
                  onChange={e => setProfileForm({ ...profileForm, location: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E0D4C1] text-xs font-readex"
                />
              </div>
              <div>
                <label className="block text-xs font-readex font-semibold mb-1">{lang === 'ar' ? 'المقر (إنجليزي)' : 'Location (EN)'}</label>
                <input
                  type="text"
                  value={profileForm.locationEnglish}
                  onChange={e => setProfileForm({ ...profileForm, locationEnglish: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E0D4C1] text-xs font-latin"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-readex font-semibold mb-1">{lang === 'ar' ? 'مواعيد التدريس (عربي)' : 'Schedule Summary (AR)'}</label>
                <input
                  type="text"
                  value={profileForm.teaching_schedule}
                  onChange={e => setProfileForm({ ...profileForm, teaching_schedule: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E0D4C1] text-xs font-readex"
                />
              </div>
              <div>
                <label className="block text-xs font-readex font-semibold mb-1">{lang === 'ar' ? 'مواعيد التدريس (إنجليزي)' : 'Schedule Summary (EN)'}</label>
                <input
                  type="text"
                  value={profileForm.teachingScheduleEnglish}
                  onChange={e => setProfileForm({ ...profileForm, teachingScheduleEnglish: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E0D4C1] text-xs font-latin"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-readex font-semibold mb-1">{lang === 'ar' ? 'رقم واتساب (أرقام دولية)' : 'WhatsApp Number (digits)'}</label>
                <input
                  type="text"
                  value={profileForm.whatsapp}
                  onChange={e => setProfileForm({ ...profileForm, whatsapp: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E0D4C1] text-xs font-latin"
                />
              </div>
              <div>
                <label className="block text-xs font-readex font-semibold mb-1">{lang === 'ar' ? 'صيغة العرض للهاتف' : 'Phone Display Format'}</label>
                <input
                  type="text"
                  value={profileForm.phoneDisplay}
                  onChange={e => setProfileForm({ ...profileForm, phoneDisplay: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E0D4C1] text-xs font-latin"
                />
              </div>
              <div>
                <label className="block text-xs font-readex font-semibold mb-1">Telegram URL</label>
                <input
                  type="text"
                  value={profileForm.telegram || ''}
                  onChange={e => setProfileForm({ ...profileForm, telegram: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E0D4C1] text-xs font-latin"
                />
              </div>
              <div>
                <label className="block text-xs font-readex font-semibold mb-1">YouTube URL</label>
                <input
                  type="text"
                  value={profileForm.youtube || ''}
                  onChange={e => setProfileForm({ ...profileForm, youtube: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E0D4C1] text-xs font-latin"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-readex font-semibold mb-1">{lang === 'ar' ? 'البريد الإلكتروني' : 'Email'}</label>
                <input
                  type="email"
                  value={profileForm.email || ''}
                  onChange={e => setProfileForm({ ...profileForm, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E0D4C1] text-xs font-latin"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSavingProfile}
              className="px-6 py-2.5 rounded-xl bg-[#0F382C] text-white font-readex text-xs font-bold shadow-xs hover:bg-[#164E3D] disabled:opacity-50"
            >
              {isSavingProfile ? (lang === 'ar' ? 'جاري الحفظ...' : 'Saving...') : t('save_changes')}
            </button>
          </form>

          {/* Scientific Disciplines Manager (4 cols) */}
          <div className="lg:col-span-4 bg-white rounded-3xl border border-[#EADFCB] p-6 shadow-xs space-y-4">
            <h3 className="font-amiri font-bold text-xl text-[#0F382C] flex items-center gap-2 border-b border-[#EADFCB] pb-3">
              <Tags className="w-5 h-5 text-[#A58455]" />
              <span>{lang === 'ar' ? 'إدارة الفنون العلمية' : 'Disciplines (Al-Funūn)'}</span>
            </h3>

            <div className="flex gap-2">
              <input
                type="text"
                value={newCategoryInput}
                onChange={e => setNewCategoryInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCategory();
                  }
                }}
                placeholder={lang === 'ar' ? 'اسم فن علمي جديد...' : 'New discipline name...'}
                className="flex-1 px-3 py-2 rounded-xl border border-[#E0D4C1] text-xs font-readex"
              />
              <button
                type="button"
                onClick={handleAddCategory}
                className="px-3 py-2 rounded-xl bg-[#0F382C] text-white text-xs font-readex font-bold"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              {categoriesForm.map((cat, idx) => (
                <div
                  key={`${cat}-${idx}`}
                  className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-[#FDFBF7] border border-[#E0D4C1] text-xs font-readex"
                >
                  <span className="font-semibold text-[#0F382C]">{translateCategory(cat)}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveCategory(idx)}
                    disabled={categoriesForm.length <= 1}
                    className="p-1 rounded text-red-600 hover:bg-red-50 disabled:opacity-30"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={handleSaveCategories}
              disabled={isSavingCategories}
              className="w-full py-2.5 rounded-xl bg-[#C5A880] hover:bg-[#DFC7A5] text-[#0F382C] font-readex text-xs font-bold transition"
            >
              {isSavingCategories
                ? (lang === 'ar' ? 'جاري الحفظ...' : 'Saving...')
                : (lang === 'ar' ? 'حفظ قائمة الفنون العلمية' : 'Save Disciplines List')}
            </button>
          </div>
        </div>
      )}

      {/* ================= 8. SECURITY & PASSWORD TAB ================= */}
      {activeTab === 'security' && (
        <form onSubmit={handleChangePassword} className="bg-white rounded-3xl border border-[#EADFCB] p-6 sm:p-8 shadow-xs space-y-5 max-w-xl">
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

      {/* ================= 9. BULK IMPORT & R2 SYNC TAB ================= */}
      {activeTab === 'bulk' && (
        <AdminBulkImport
          categories={categories}
          authFetch={authFetch}
          onDataRefresh={onDataRefresh}
          showBanner={showBanner}
        />
      )}

      {/* ================= CONFIRM DELETE MODAL ================= */}
      {pendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-[#FDFBF7] rounded-3xl max-w-md w-full border border-[#EADFCB] p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2.5 text-red-700">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <h4 className="font-amiri font-bold text-xl">
                {lang === 'ar' ? 'تأكيد الحذف النهائي' : 'Confirm Deletion'}
              </h4>
            </div>
            <p className="text-xs sm:text-sm font-readex text-[#1E1E1E]">
              {lang === 'ar'
                ? `هل أنت متأكد من: ${pendingDelete.label}؟ لا يمكن التراجع عن هذا الإجراء.`
                : `Are you sure you want to proceed with: ${pendingDelete.label}? This action cannot be undone.`}
            </p>
            <div className="flex items-center justify-end gap-3 pt-2 font-readex text-xs">
              <button
                type="button"
                onClick={() => setPendingDelete(null)}
                className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-[#1E1E1E] font-semibold"
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={executePendingDelete}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold disabled:opacity-50"
              >
                {isDeleting ? (lang === 'ar' ? 'جاري الحذف...' : 'Deleting...') : t('delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= BOOK MODAL ================= */}
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
                className="w-full px-3.5 py-2 rounded-xl border border-[#E0D4C1] font-amiri font-bold text-lg bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-readex mb-1">{lang === 'ar' ? 'العنوان الفرعي أو موضوعه' : 'Subtitle / Topic'}</label>
              <input
                type="text"
                value={editingBook.subtitle || ''}
                onChange={e => setEditingBook({ ...editingBook, subtitle: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-[#E0D4C1] text-xs font-readex bg-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-readex mb-1">{lang === 'ar' ? 'الفن العلمي' : 'Discipline'}</label>
                <select
                  value={editingBook.category || 'العقيدة والتوحيد'}
                  onChange={e => setEditingBook({ ...editingBook, category: e.target.value as ScienceCategory })}
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
                  onChange={e => setEditingBook({ ...editingBook, status: e.target.value as Book['status'] })}
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
                  className="w-full px-3.5 py-2 rounded-xl border border-[#E0D4C1] text-xs font-latin bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-readex mb-1">{t('year')}</label>
                <input
                  type="text"
                  value={editingBook.year || '١٤٤٦ هـ'}
                  onChange={e => setEditingBook({ ...editingBook, year: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#E0D4C1] text-xs font-readex bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-readex mb-1">{lang === 'ar' ? 'نبذة عن المصنف ومحتواه' : 'Description / Summary'}</label>
              <textarea
                rows={3}
                value={editingBook.description || ''}
                onChange={e => setEditingBook({ ...editingBook, description: e.target.value })}
                className="w-full p-3 rounded-xl border border-[#E0D4C1] text-xs font-naskh leading-relaxed bg-white"
              />
            </div>

            {/* Book flags & PDF URL */}
            <div className="p-4 rounded-2xl bg-white border border-[#E0D4C1] space-y-3 font-readex text-xs">
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(editingBook.hasPdf)}
                    onChange={e => setEditingBook({ ...editingBook, hasPdf: e.target.checked })}
                    className="rounded border-[#C5A880] text-[#0F382C]"
                  />
                  <span className="font-semibold text-[#0F382C]">{lang === 'ar' ? 'متاح للتحميل PDF' : 'Available as PDF'}</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(editingBook.featured)}
                    onChange={e => setEditingBook({ ...editingBook, featured: e.target.checked })}
                    className="rounded border-[#C5A880] text-[#0F382C]"
                  />
                  <span className="font-semibold text-[#0F382C]">{lang === 'ar' ? 'إبراز في الصفحة الرئيسية' : 'Feature on Home Page'}</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(editingBook.collaborative)}
                    onChange={e => setEditingBook({ ...editingBook, collaborative: e.target.checked })}
                    className="rounded border-[#C5A880] text-[#0F382C]"
                  />
                  <span className="font-semibold text-[#0F382C]">{lang === 'ar' ? 'عمل بالمشاركة' : 'Collaborative Work'}</span>
                </label>
              </div>

              {editingBook.hasPdf && (
                <div>
                  <label className="block text-[11px] text-[#8C6D3B] mb-1">
                    {lang === 'ar' ? 'رابط ملف الـ PDF' : 'PDF Download URL'}
                  </label>
                  <input
                    type="text"
                    value={editingBook.downloadUrl || ''}
                    onChange={e => setEditingBook({ ...editingBook, downloadUrl: e.target.value })}
                    placeholder="https://... or #"
                    className="w-full px-3 py-2 rounded-xl border border-[#E0D4C1] text-xs font-latin"
                  />
                </div>
              )}

              {editingBook.collaborative && (
                <div>
                  <label className="block text-[11px] text-[#8C6D3B] mb-1">
                    {lang === 'ar' ? 'بيان المشاركة العلمية' : 'Collaborators Note'}
                  </label>
                  <input
                    type="text"
                    value={editingBook.collaborators || ''}
                    onChange={e => setEditingBook({ ...editingBook, collaborators: e.target.value })}
                    placeholder={lang === 'ar' ? 'بالمشاركة مع بعض الفضلاء' : 'In collaboration with...'}
                    className="w-full px-3 py-2 rounded-xl border border-[#E0D4C1] text-xs font-readex"
                  />
                </div>
              )}
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

      {/* ================= AUDIO COURSE & PLAYLIST MODAL ================= */}
      {isAudioModalOpen && editingAudio && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <form
            onSubmit={handleSaveAudio}
            className="bg-[#FDFBF7] rounded-3xl max-w-3xl w-full border border-[#EADFCB] p-6 sm:p-8 space-y-5 shadow-xl max-h-[92vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-[#EADFCB] pb-3">
              <div>
                <h3 className="font-amiri font-bold text-2xl text-[#0F382C]">
                  {editingAudio.id ? (lang === 'ar' ? 'تعديل الشرح الصوتي والدروس' : 'Edit Audio Course & Playlist') : (lang === 'ar' ? 'إضافة شرح صوتي جديد' : 'Add Audio Course')}
                </h3>
                <p className="text-[11px] font-readex text-[#8C6D3B]">
                  {lang === 'ar'
                    ? 'يتم تشغيل الدروس المدرجة هنا تلقائياً بالتتابع عند الضغط على استماع للشرح'
                    : 'Lessons listed below play sequentially as a playlist when clicking Listen to Lecture'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAudioModalOpen(false)}
                className="w-8 h-8 rounded-full bg-[#F4EFE6] text-[#0F382C] font-bold shrink-0"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-readex mb-1">{lang === 'ar' ? 'عنوان الشرح *' : 'Course Title *'}</label>
                <input
                  type="text"
                  required
                  value={editingAudio.title || ''}
                  onChange={e => setEditingAudio({ ...editingAudio, title: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#E0D4C1] font-amiri font-bold text-lg bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-readex mb-1">{t('series')}</label>
                <input
                  type="text"
                  value={editingAudio.series || ''}
                  onChange={e => setEditingAudio({ ...editingAudio, series: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#E0D4C1] text-xs font-readex bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-readex mb-1">{t('level_filter')}</label>
                <select
                  value={editingAudio.levelId || 'beginner'}
                  onChange={e => {
                    const val = e.target.value as AudioCourse['levelId'];
                    const levelName = val === 'beginner' ? 'مبتدئ' : val === 'intermediate' ? 'متوسط' : 'متقدم / مفصل';
                    setEditingAudio({ ...editingAudio, levelId: val, level: levelName });
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-[#E0D4C1] text-xs font-readex bg-white"
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
                  onChange={e => setEditingAudio({ ...editingAudio, category: e.target.value as ScienceCategory })}
                  className="w-full px-3 py-2 rounded-xl border border-[#E0D4C1] text-xs font-readex bg-white"
                >
                  {categories.map(c => (
                    <option key={c} value={c}>{translateCategory(c)}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-readex mb-1">{lang === 'ar' ? 'الحالة' : 'Status'}</label>
                <select
                  value={editingAudio.status || 'درس مستمر'}
                  onChange={e => setEditingAudio({ ...editingAudio, status: e.target.value as AudioCourse['status'] })}
                  className="w-full px-3 py-2 rounded-xl border border-[#E0D4C1] text-xs font-readex bg-white"
                >
                  <option value="درس مستمر">{lang === 'ar' ? 'درس مستمر' : 'Ongoing'}</option>
                  <option value="مكتمل">{lang === 'ar' ? 'مكتمل' : 'Completed'}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-readex mb-1">{lang === 'ar' ? 'متوسط المدة' : 'Duration'}</label>
                <input
                  type="text"
                  value={editingAudio.duration || ''}
                  onChange={e => setEditingAudio({ ...editingAudio, duration: e.target.value })}
                  placeholder="45m / lesson"
                  className="w-full px-3 py-2 rounded-xl border border-[#E0D4C1] text-xs font-readex bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-readex mb-1">{lang === 'ar' ? 'وصف ومحتوى الشرح' : 'Course Description'}</label>
              <textarea
                rows={2}
                value={editingAudio.description || ''}
                onChange={e => setEditingAudio({ ...editingAudio, description: e.target.value })}
                className="w-full p-3 rounded-xl border border-[#E0D4C1] text-xs font-naskh bg-white"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-readex mb-1">{lang === 'ar' ? 'بادئة مجلد R2 (Prefix)' : 'R2 Folder Prefix'}</label>
                <input
                  type="text"
                  dir="ltr"
                  value={editingAudio.r2Prefix || ''}
                  onChange={e => setEditingAudio({ ...editingAudio, r2Prefix: e.target.value })}
                  placeholder="nawaqid-al-islam"
                  className="w-full px-3 py-2 rounded-xl border border-[#E0D4C1] text-xs font-latin bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-readex mb-1">{lang === 'ar' ? 'معرف مجلد Drive' : 'Drive Folder ID'}</label>
                <input
                  type="text"
                  dir="ltr"
                  value={editingAudio.driveFolderId || ''}
                  onChange={e => setEditingAudio({ ...editingAudio, driveFolderId: e.target.value })}
                  placeholder="1vckOF1SPV..."
                  className="w-full px-3 py-2 rounded-xl border border-[#E0D4C1] text-xs font-latin bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-readex mb-1">{lang === 'ar' ? 'عدد مجالس المنهج' : 'Expected Sittings'}</label>
                <input
                  type="number"
                  min={0}
                  value={editingAudio.expectedLessons ?? ''}
                  onChange={e => setEditingAudio({ ...editingAudio, expectedLessons: e.target.value ? Number(e.target.value) : undefined })}
                  placeholder="13"
                  className="w-full px-3 py-2 rounded-xl border border-[#E0D4C1] text-xs font-latin bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-readex mb-1">{lang === 'ar' ? 'رابط متن الشرح (PDF)' : 'Matn PDF URL'}</label>
                <input
                  type="text"
                  dir="ltr"
                  value={editingAudio.matnPdfUrl || ''}
                  onChange={e => setEditingAudio({ ...editingAudio, matnPdfUrl: e.target.value })}
                  placeholder="https://.../matn.pdf"
                  className="w-full px-3 py-2 rounded-xl border border-[#E0D4C1] text-xs font-latin bg-white"
                />
              </div>
            </div>

            {/* FULL LESSONS PLAYLIST EDITOR */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#C5A880]/40 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 font-readex">
                  <ListMusic className="w-4 h-4 text-[#0F382C]" />
                  <span className="text-xs sm:text-sm font-bold text-[#0F382C]">
                    {lang === 'ar' ? 'قائمة الدروس المسجلة' : 'Course Lessons Playlist'}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                    {(editingAudio.lessons || []).length} {lang === 'ar' ? 'دروس' : 'lessons'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleAddLessonRow}
                  className="px-3 py-1.5 rounded-xl bg-[#0F382C] text-white text-xs font-readex font-bold flex items-center gap-1 hover:bg-[#164E3D]"
                >
                  <Plus className="w-3.5 h-3.5 text-[#DFC7A5]" />
                  <span>{lang === 'ar' ? 'إضافة درس' : 'Add Lesson'}</span>
                </button>
              </div>

              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {(editingAudio.lessons || []).map((lesson, idx) => (
                  <div
                    key={lesson.id || idx}
                    className="p-3 rounded-xl bg-[#FDFBF7] border border-[#E0D4C1] space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2 text-[11px] font-readex text-[#8C6D3B]">
                      <span className="font-bold text-[#0F382C]">
                        #{idx + 1}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleMoveLesson(idx, 'up')}
                          disabled={idx === 0}
                          className="p-1 rounded hover:bg-[#F4EFE6] text-[#0F382C] disabled:opacity-30"
                          title={lang === 'ar' ? 'تحريك لأعلى' : 'Move up'}
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveLesson(idx, 'down')}
                          disabled={idx === (editingAudio.lessons?.length || 1) - 1}
                          className="p-1 rounded hover:bg-[#F4EFE6] text-[#0F382C] disabled:opacity-30"
                          title={lang === 'ar' ? 'تحريك لأسفل' : 'Move down'}
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveLesson(idx)}
                          className="p-1 rounded hover:bg-red-50 text-red-600"
                          title={t('delete')}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                      <input
                        type="text"
                        required
                        value={lesson.title}
                        onChange={e => handleUpdateLessonField(idx, 'title', e.target.value)}
                        placeholder={lang === 'ar' ? 'عنوان الدرس' : 'Lesson title'}
                        className="sm:col-span-5 px-3 py-1.5 rounded-lg border border-[#E0D4C1] text-xs font-readex bg-white"
                      />
                      <input
                        type="text"
                        value={lesson.duration}
                        onChange={e => handleUpdateLessonField(idx, 'duration', e.target.value)}
                        placeholder="45:00"
                        className="sm:col-span-2 px-3 py-1.5 rounded-lg border border-[#E0D4C1] text-xs font-latin bg-white"
                      />
                      <input
                        type="text"
                        required
                        value={lesson.audioUrl}
                        onChange={e => handleUpdateLessonField(idx, 'audioUrl', e.target.value)}
                        placeholder="https://.../lesson.mp3"
                        className="sm:col-span-5 px-3 py-1.5 rounded-lg border border-[#E0D4C1] text-xs font-latin bg-white"
                      />
                    </div>
                  </div>
                ))}
              </div>
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

      {/* ================= POEM MODAL ================= */}
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
                  className="w-full px-3.5 py-2 rounded-xl border border-[#E0D4C1] font-amiri font-bold text-lg bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-readex mb-1">{lang === 'ar' ? 'البحر الشعري' : 'Poetic Meter'}</label>
                <input
                  type="text"
                  value={editingPoem.meter || 'بحر الرجز'}
                  onChange={e => setEditingPoem({ ...editingPoem, meter: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#E0D4C1] text-xs font-readex bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-readex mb-1">{lang === 'ar' ? 'الفن / الموضوع' : 'Category / Theme'}</label>
                <input
                  type="text"
                  value={editingPoem.category || ''}
                  onChange={e => setEditingPoem({ ...editingPoem, category: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#E0D4C1] text-xs font-readex bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-readex mb-1">{t('year')}</label>
                <input
                  type="text"
                  value={editingPoem.year || '١٤٤٦ هـ'}
                  onChange={e => setEditingPoem({ ...editingPoem, year: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#E0D4C1] text-xs font-readex bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-readex mb-1">{lang === 'ar' ? 'تعريف ومقدمة المنظومة' : 'Poem Summary'}</label>
              <textarea
                rows={2}
                value={editingPoem.summary || ''}
                onChange={e => setEditingPoem({ ...editingPoem, summary: e.target.value })}
                className="w-full p-3 rounded-xl border border-[#E0D4C1] text-xs font-naskh bg-white"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-readex">
                  {lang === 'ar'
                    ? 'الأبيات سطراً بسطر (افصل بين الصدر والعجز بالرمز ۞ أو ...)'
                    : 'Verses line-by-line (split Al-Sadr and Al-Ajuz by ۞ or ...)'}
                </label>
                <span className="text-[11px] font-readex font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  {countParsedVerses(poemRawLines)} {t('verses_count')}
                </span>
              </div>
              <textarea
                rows={8}
                value={poemRawLines}
                onChange={e => setPoemRawLines(e.target.value)}
                className="w-full p-3.5 rounded-xl border border-[#E0D4C1] font-amiri text-base leading-loose bg-white"
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

      {/* ================= ARTICLE MODAL ================= */}
      {isArticleModalOpen && editingArticle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <form
            onSubmit={handleSaveArticle}
            className="bg-[#FDFBF7] rounded-3xl max-w-2xl w-full border border-[#EADFCB] p-6 sm:p-8 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-[#EADFCB] pb-3">
              <h3 className="font-amiri font-bold text-xl text-[#0F382C]">
                {editingArticle.id ? (lang === 'ar' ? 'تعديل الخاطرة أو المقال' : 'Edit Reflection / Article') : (lang === 'ar' ? 'نشر خاطرة / مقال جديد' : 'New Reflection / Paper')}
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
                className="w-full px-3.5 py-2 rounded-xl border border-[#E0D4C1] font-amiri font-bold text-lg bg-white"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-readex mb-1">{t('article_type_filter')}</label>
                <select
                  value={editingArticle.type || 'خواطر ابن بيضاء'}
                  onChange={e => setEditingArticle({ ...editingArticle, type: e.target.value as Article['type'] })}
                  className="w-full px-3 py-2 rounded-xl border border-[#E0D4C1] text-xs font-readex bg-white"
                >
                  <option value="خواطر ابن بيضاء">{translateArticleType('خواطر ابن بيضاء')}</option>
                  <option value="بحث أكاديمي">{translateArticleType('بحث أكاديمي')}</option>
                  <option value="مقال عقدي">{translateArticleType('مقال عقدي')}</option>
                  <option value="مقال لغوي">{lang === 'ar' ? 'مقال لغوي' : 'Linguistic Article'}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-readex mb-1">{t('science_filter')}</label>
                <select
                  value={editingArticle.category || 'الأدب والبلاغة واللغة'}
                  onChange={e => setEditingArticle({ ...editingArticle, category: e.target.value as ScienceCategory })}
                  className="w-full px-3 py-2 rounded-xl border border-[#E0D4C1] text-xs font-readex bg-white"
                >
                  {categories.map(c => (
                    <option key={c} value={c}>{translateCategory(c)}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-readex mb-1">{lang === 'ar' ? 'التاريخ' : 'Date'}</label>
                <input
                  type="text"
                  value={editingArticle.date || 'اليوم'}
                  onChange={e => setEditingArticle({ ...editingArticle, date: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-[#E0D4C1] text-xs font-readex bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-readex mb-1">{lang === 'ar' ? 'الوسوم (افصل بفاصلة)' : 'Tags (comma-separated)'}</label>
              <input
                type="text"
                value={articleTagsInput}
                onChange={e => setArticleTagsInput(e.target.value)}
                placeholder="خواطر ابن بيضاء, العقيدة, طلب العلم"
                className="w-full px-3.5 py-2 rounded-xl border border-[#E0D4C1] text-xs font-readex bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-readex mb-1">{lang === 'ar' ? 'ملخص تمهيدي (يظهر في البطاقة)' : 'Summary Excerpt'}</label>
              <textarea
                rows={2}
                value={editingArticle.summary || ''}
                onChange={e => setEditingArticle({ ...editingArticle, summary: e.target.value })}
                className="w-full p-3 rounded-xl border border-[#E0D4C1] text-xs font-naskh bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-readex mb-1">{lang === 'ar' ? 'نص الخاطرة / المقال كاملاً' : 'Full Content'}</label>
              <textarea
                rows={7}
                value={editingArticle.content || ''}
                onChange={e => setEditingArticle({ ...editingArticle, content: e.target.value })}
                className="w-full p-3.5 rounded-xl border border-[#E0D4C1] text-sm font-naskh leading-relaxed bg-white"
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

      {/* ================= WEEKLY CIRCLE MODAL ================= */}
      {isCircleModalOpen && editingCircle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <form
            onSubmit={handleSaveCircle}
            className="bg-[#FDFBF7] rounded-3xl max-w-xl w-full border border-[#EADFCB] p-6 sm:p-8 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-[#EADFCB] pb-3">
              <h3 className="font-amiri font-bold text-xl text-[#0F382C]">
                {editingCircle.id ? (lang === 'ar' ? 'تعديل الحلقة الأسبوعية' : 'Edit Teaching Circle') : (lang === 'ar' ? 'إضافة حلقة أسبوعية' : 'Add Teaching Circle')}
              </h3>
              <button
                type="button"
                onClick={() => setIsCircleModalOpen(false)}
                className="w-8 h-8 rounded-full bg-[#F4EFE6] text-[#0F382C] font-bold"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="block text-xs font-readex mb-1">{lang === 'ar' ? 'الكتاب / المادة المقررة *' : 'Subject / Classical Text *'}</label>
              <input
                type="text"
                required
                value={editingCircle.subject || ''}
                onChange={e => setEditingCircle({ ...editingCircle, subject: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-[#E0D4C1] font-amiri font-bold text-lg bg-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-readex mb-1">{lang === 'ar' ? 'اليوم (عربي)' : 'Day (Arabic)'}</label>
                <input
                  type="text"
                  value={editingCircle.day || ''}
                  onChange={e => setEditingCircle({ ...editingCircle, day: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#E0D4C1] text-xs font-readex bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-readex mb-1">{lang === 'ar' ? 'اليوم (إنجليزي)' : 'Day (English)'}</label>
                <input
                  type="text"
                  value={editingCircle.dayEnglish || ''}
                  onChange={e => setEditingCircle({ ...editingCircle, dayEnglish: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#E0D4C1] text-xs font-latin bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-readex mb-1">{lang === 'ar' ? 'الوقت (عربي)' : 'Time (Arabic)'}</label>
                <input
                  type="text"
                  value={editingCircle.time || ''}
                  onChange={e => setEditingCircle({ ...editingCircle, time: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#E0D4C1] text-xs font-readex bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-readex mb-1">{lang === 'ar' ? 'الوقت (إنجليزي)' : 'Time (English)'}</label>
                <input
                  type="text"
                  value={editingCircle.timeEnglish || ''}
                  onChange={e => setEditingCircle({ ...editingCircle, timeEnglish: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#E0D4C1] text-xs font-latin bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-readex mb-1">{t('science_filter')}</label>
                <select
                  value={editingCircle.category || 'العقيدة والتوحيد'}
                  onChange={e => setEditingCircle({ ...editingCircle, category: e.target.value as ScienceCategory })}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#E0D4C1] text-xs font-readex bg-white"
                >
                  {categories.map(c => (
                    <option key={c} value={c}>{translateCategory(c)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-readex mb-1">{lang === 'ar' ? 'نوع الحضور' : 'Attendance Mode'}</label>
                <input
                  type="text"
                  value={editingCircle.type || ''}
                  onChange={e => setEditingCircle({ ...editingCircle, type: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#E0D4C1] text-xs font-readex bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-readex mb-1">{lang === 'ar' ? 'المكان (عربي)' : 'Location (Arabic)'}</label>
                <input
                  type="text"
                  value={editingCircle.location || ''}
                  onChange={e => setEditingCircle({ ...editingCircle, location: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#E0D4C1] text-xs font-readex bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-readex mb-1">{lang === 'ar' ? 'المكان (إنجليزي)' : 'Location (English)'}</label>
                <input
                  type="text"
                  value={editingCircle.locationEnglish || ''}
                  onChange={e => setEditingCircle({ ...editingCircle, locationEnglish: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#E0D4C1] text-xs font-latin bg-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#EADFCB] font-readex text-xs">
              <button
                type="button"
                onClick={() => setIsCircleModalOpen(false)}
                className="px-4 py-2 rounded-xl text-gray-600 hover:bg-gray-100"
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                disabled={isSavingSchedule}
                className="px-5 py-2.5 rounded-xl bg-[#0F382C] text-white font-bold hover:bg-[#164E3D]"
              >
                {t('save_changes')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ================= ANNOUNCEMENT MODAL ================= */}
      {isAnnouncementModalOpen && editingAnnouncement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <form
            onSubmit={handleSaveAnnouncement}
            className="bg-[#FDFBF7] rounded-3xl max-w-lg w-full border border-[#EADFCB] p-6 sm:p-8 space-y-4 shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-[#EADFCB] pb-3">
              <h3 className="font-amiri font-bold text-xl text-[#0F382C]">
                {editingAnnouncement.id ? (lang === 'ar' ? 'تعديل الإعلان' : 'Edit Announcement') : (lang === 'ar' ? 'إضافة إعلان جديد' : 'Add Announcement')}
              </h3>
              <button
                type="button"
                onClick={() => setIsAnnouncementModalOpen(false)}
                className="w-8 h-8 rounded-full bg-[#F4EFE6] text-[#0F382C] font-bold"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="block text-xs font-readex mb-1">{lang === 'ar' ? 'عنوان الإعلان *' : 'Title *'}</label>
              <input
                type="text"
                required
                value={editingAnnouncement.title || ''}
                onChange={e => setEditingAnnouncement({ ...editingAnnouncement, title: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-[#E0D4C1] font-amiri font-bold text-lg bg-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-readex mb-1">{lang === 'ar' ? 'التصنيف / الوسم' : 'Badge'}</label>
                <input
                  type="text"
                  value={editingAnnouncement.badge || 'دورة جديدة'}
                  onChange={e => setEditingAnnouncement({ ...editingAnnouncement, badge: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#E0D4C1] text-xs font-readex bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-readex mb-1">{lang === 'ar' ? 'التاريخ' : 'Date'}</label>
                <input
                  type="text"
                  value={editingAnnouncement.date || ''}
                  onChange={e => setEditingAnnouncement({ ...editingAnnouncement, date: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#E0D4C1] text-xs font-readex bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-readex mb-1">{lang === 'ar' ? 'تفاصيل الإعلان' : 'Details'}</label>
              <textarea
                rows={4}
                value={editingAnnouncement.details || ''}
                onChange={e => setEditingAnnouncement({ ...editingAnnouncement, details: e.target.value })}
                className="w-full p-3 rounded-xl border border-[#E0D4C1] text-xs font-naskh leading-relaxed bg-white"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#EADFCB] font-readex text-xs">
              <button
                type="button"
                onClick={() => setIsAnnouncementModalOpen(false)}
                className="px-4 py-2 rounded-xl text-gray-600 hover:bg-gray-100"
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                disabled={isSavingSchedule}
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
