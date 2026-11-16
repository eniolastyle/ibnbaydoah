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
  RefreshCw,
  Copy,
  RotateCcw,
  Link2,
  ShoppingBag,
  MessageCircle,
  Upload,
  Loader2,
  Shield
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
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

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

  // Active Tab + Search + Filters + Pagination + Multi-Select + Action Feedback
  const [activeTab, setActiveTab] = useState<AdminTab>('books');
  const [tabSearch, setTabSearch] = useState('');
  const [tabPage, setTabPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPricing, setFilterPricing] = useState<'all' | 'free' | 'paid'>('all');
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [filterCoverage, setFilterCoverage] = useState<'all' | 'recorded' | 'empty'>('all');
  const [filterArticleType, setFilterArticleType] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'default' | 'title' | 'metric'>('default');
  const [questionFilter, setQuestionFilter] = useState<'all' | 'pending' | 'answered'>('all');

  // Multi-select & Bulk Action state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkCategory, setBulkCategory] = useState<string>('');
  const [bulkStatus, setBulkStatus] = useState<string>('');
  const [bulkLevelId, setBulkLevelId] = useState<string>('');
  const [bulkArticleType, setBulkArticleType] = useState<string>('');
  const [isApplyingBulk, setIsApplyingBulk] = useState(false);

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
  const [showBulkLessonPaster, setShowBulkLessonPaster] = useState(false);
  const [bulkLessonLines, setBulkLessonLines] = useState('');

  // Direct R2 upload & security session states
  const [r2Configured, setR2Configured] = useState<boolean | null>(null);
  const [uploadState, setUploadState] = useState<{
    target: string;
    progress: number;
    label: string;
  } | null>(null);
  const [activeSessions, setActiveSessions] = useState<
    Array<{ idPrefix: string; username: string; expiresAt: number; isCurrent: boolean }>
  >([]);
  const [securityPosture, setSecurityPosture] = useState<{
    trustProxy?: boolean;
    rateLimitMaxAttempts?: number;
    rateLimitLockMinutes?: number;
    questionLimitPer15Min?: number;
    isConfigured?: boolean;
    updatedAt?: string;
    storageEngine?: string;
  } | null>(null);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);

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

  // Reset search, filters, selection & pagination when switching tabs
  useEffect(() => {
    setTabPage(1);
    setTabSearch('');
    setFilterCategory('all');
    setFilterStatus('all');
    setFilterPricing('all');
    setFilterLevel('all');
    setFilterCoverage('all');
    setFilterArticleType('all');
    setSortBy('default');
    setSelectedIds(new Set());
    setBulkCategory('');
    setBulkStatus('');
    setBulkLevelId('');
    setBulkArticleType('');
  }, [activeTab]);

  useEffect(() => {
    setTabPage(1);
  }, [tabSearch, questionFilter, filterCategory, filterStatus, filterPricing, filterLevel, filterCoverage, filterArticleType, sortBy, pageSize]);

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

  const fetchSecurityAndR2Meta = useCallback(async () => {
    const token = localStorage.getItem('ibn_baydoah_admin_token');
    if (!token) return;
    try {
      setIsLoadingSessions(true);
      const [sessRes, bulkRes] = await Promise.all([
        fetch('/api/auth/sessions', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).catch(() => null),
        fetch('/api/bulk/status', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).catch(() => null),
      ]);
      if (sessRes?.success && sessRes.data) {
        setActiveSessions(sessRes.data.sessions || []);
        setSecurityPosture(sessRes.data.security || null);
      }
      if (bulkRes?.success && bulkRes.r2) {
        setR2Configured(Boolean(bulkRes.r2.configured));
      }
    } finally {
      setIsLoadingSessions(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchSecurityAndR2Meta();
    }
  }, [isAuthenticated, activeTab, fetchSecurityAndR2Meta]);

  const handleRevokeOtherSessions = async () => {
    try {
      const res = await authFetch('/api/auth/revoke-other-sessions', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        showBanner('success', data.message || (lang === 'ar' ? 'تم إنهاء الجلسات الأخرى' : 'Other sessions signed out'));
        fetchSecurityAndR2Meta();
      } else {
        showBanner('error', data.message || 'Failed revoking sessions');
      }
    } catch {
      showBanner('error', lang === 'ar' ? 'تعذر إنهاء الجلسات' : 'Error revoking sessions');
    }
  };

  // Direct R2 upload via XHR for real progress percentage
  const uploadFileToR2 = (
    file: File,
    opts: { kind: 'book' | 'matn' | 'audio'; prefix?: string; target: string; label?: string }
  ): Promise<{ key: string; url: string; filename: string; size: number }> => {
    return new Promise((resolve, reject) => {
      const token = localStorage.getItem('ibn_baydoah_admin_token') || '';
      const params = new URLSearchParams({
        kind: opts.kind,
        filename: file.name,
        ...(opts.prefix ? { prefix: opts.prefix } : {}),
      });
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `/api/r2/upload?${params.toString()}`);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');

      xhr.upload.onprogress = (ev) => {
        const pct = ev.lengthComputable ? Math.round((ev.loaded / ev.total) * 100) : 0;
        setUploadState({
          target: opts.target,
          progress: pct,
          label: opts.label || file.name,
        });
      };

      xhr.onload = () => {
        setUploadState(null);
        try {
          const json = JSON.parse(xhr.responseText || '{}');
          if (xhr.status >= 200 && xhr.status < 300 && json.success && json.data) {
            resolve(json.data);
          } else {
            reject(new Error(json.message || `Upload failed (${xhr.status})`));
          }
        } catch {
          reject(new Error(`Upload failed (${xhr.status})`));
        }
      };

      xhr.onerror = () => {
        setUploadState(null);
        reject(new Error(lang === 'ar' ? 'تعذر الاتصال بالخادم أثناء الرفع' : 'Network error during upload'));
      };

      setUploadState({ target: opts.target, progress: 0, label: opts.label || file.name });
      xhr.send(file);
    });
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
        setIsConfigured(Boolean(data.isConfigured));
        setPassword('');
        onDataRefresh();
      } else {
        if (data.requiresSetup) {
          setIsConfigured(false);
        }
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
    if (setupPassword.length < 8) {
      setAuthError(lang === 'ar' ? 'يجب أن لا تقل كلمة المرور عن 8 أحرف' : 'Password must be at least 8 characters');
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
        onDataRefresh();
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
    if (newPassword.length < 8) {
      setChangePassError(lang === 'ar' ? 'يجب ألا تقل كلمة المرور عن 8 خانات' : 'Password must be at least 8 characters');
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
        setChangePassSuccess(lang === 'ar' ? 'تم تحديث كلمة المرور وإنهاء الجلسات الأخرى بنجاح!' : 'Password updated & other sessions revoked!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
        fetchSecurityAndR2Meta();
        setTimeout(() => setChangePassSuccess(''), 5000);
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
      isPaid: false,
      price: '',
      featured: false,
      collaborative: false,
      collaborators: ''
    });
    setIsBookModalOpen(true);
  };

  const handleSaveBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBook || !editingBook.title) return;

    const isPaid = Boolean(editingBook.isPaid);
    const payload = {
      ...editingBook,
      isPaid,
      price: isPaid ? (editingBook.price?.trim() || '') : '',
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

  const toggleBookQuickFlag = async (b: Book, patch: Partial<Book>) => {
    try {
      const res = await authFetch(`/api/books/${b.id}`, {
        method: 'PUT',
        body: JSON.stringify(patch)
      });
      if (res.ok) {
        onDataRefresh();
        showBanner('success', lang === 'ar' ? 'تم تحديث حالة المصنف' : 'Treatise updated');
      }
    } catch {
      showBanner('error', lang === 'ar' ? 'تعذر التحديث السريع' : 'Quick update failed');
    }
  };

  // ================= MULTI-SELECT & BULK ACTION HANDLERS =================
  const toggleSelectItem = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectPage = (pageItems: Array<{ id: string }>) => {
    const pageIds = pageItems.map(i => i.id);
    const allPageSelected = pageIds.length > 0 && pageIds.every(id => selectedIds.has(id));
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allPageSelected) {
        pageIds.forEach(id => next.delete(id));
      } else {
        pageIds.forEach(id => next.add(id));
      }
      return next;
    });
  };

  const selectAllFiltered = (items: Array<{ id: string }>) => {
    setSelectedIds(new Set(items.map(i => i.id)));
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const executeBatchUpdate = async (
    entity: 'books' | 'audios' | 'poems' | 'articles',
    patch: Record<string, unknown>,
    successMsg: string
  ) => {
    if (selectedIds.size === 0) return;
    setIsApplyingBulk(true);
    try {
      const res = await authFetch('/api/admin/batch', {
        method: 'POST',
        body: JSON.stringify({
          entity,
          action: 'update',
          ids: Array.from(selectedIds),
          patch
        })
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setSelectedIds(new Set());
        onDataRefresh();
        showBanner('success', `${successMsg} (${json.data.affected})`);
      } else {
        showBanner('error', json.message || 'Batch update failed');
      }
    } catch {
      showBanner('error', lang === 'ar' ? 'تعذر تنفيذ التحديث الجماعي' : 'Batch update error');
    } finally {
      setIsApplyingBulk(false);
    }
  };

  const requestBatchDelete = (entity: 'books' | 'audios' | 'poems' | 'articles' | 'questions') => {
    const count = selectedIds.size;
    if (count === 0) return;
    const ids = Array.from(selectedIds);
    setPendingDelete({
      label: lang === 'ar'
        ? `حذف عدد (${count}) من العناصر المحددة نهائياً`
        : `permanently delete ${count} selected items`,
      onConfirm: async () => {
        const res = await authFetch('/api/admin/batch', {
          method: 'POST',
          body: JSON.stringify({ entity, action: 'delete', ids })
        });
        if (res.ok) {
          setSelectedIds(new Set());
          onDataRefresh();
          showBanner(
            'success',
            lang === 'ar' ? `تم حذف ${count} عنصراً بنجاح` : `Deleted ${count} items`
          );
        } else {
          showBanner('error', lang === 'ar' ? 'تعذر الحذف الجماعي' : 'Bulk delete failed');
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
    setShowBulkLessonPaster(false);
    setBulkLessonLines('');
    setIsAudioModalOpen(true);
  };

  const openEditAudio = (course: AudioCourse) => {
    const existingLessons: AudioLesson[] = (course.lessons || []).map(l => ({ ...l }));

    setEditingAudio({
      ...course,
      lessons: existingLessons,
      totalLessons: existingLessons.length
    });
    setShowBulkLessonPaster(false);
    setBulkLessonLines('');
    setIsAudioModalOpen(true);
  };

  const toggleAudioQuickStatus = async (course: AudioCourse) => {
    const nextStatus: AudioCourse['status'] = course.status === 'مكتمل' ? 'درس مستمر' : 'مكتمل';
    try {
      const res = await authFetch(`/api/audios/${course.id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: nextStatus })
      });
      if (res.ok) {
        onDataRefresh();
        showBanner('success', lang === 'ar' ? 'تم تحديث حالة الشرح' : 'Course status updated');
      }
    } catch {
      showBanner('error', lang === 'ar' ? 'تعذر التحديث' : 'Status update failed');
    }
  };

  const handleBulkAddLessonsFromText = () => {
    if (!editingAudio || !bulkLessonLines.trim()) return;
    const currentLessons = [...(editingAudio.lessons || [])];
    const lines = bulkLessonLines
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean);

    const added: AudioLesson[] = lines.map((line, idx) => {
      const nextNum = currentLessons.length + idx + 1;
      if (line.includes('|')) {
        const parts = line.split('|').map(p => p.trim());
        if (parts.length >= 3) {
          return {
            id: `l-${Date.now()}-${nextNum}`,
            title: parts[0] || (lang === 'ar' ? `الدرس رقم ${nextNum}` : `Lesson ${nextNum}`),
            audioUrl: parts[1],
            duration: parts[2] || '45:00'
          };
        }
        return {
          id: `l-${Date.now()}-${nextNum}`,
          title: parts[0] || (lang === 'ar' ? `الدرس رقم ${nextNum}` : `Lesson ${nextNum}`),
          audioUrl: parts[1] || DEFAULT_SAMPLE_AUDIO_URL,
          duration: '45:00'
        };
      }
      return {
        id: `l-${Date.now()}-${nextNum}`,
        title: lang === 'ar' ? `الدرس رقم ${nextNum}` : `Lesson ${nextNum}`,
        duration: '45:00',
        audioUrl: line
      };
    });

    const updated = [...currentLessons, ...added];
    setEditingAudio({
      ...editingAudio,
      lessons: updated,
      totalLessons: updated.length,
      audioUrl: updated[0]?.audioUrl || editingAudio.audioUrl
    });
    setBulkLessonLines('');
    setShowBulkLessonPaster(false);
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
      totalVerses: 2,
      featured: false
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

  const togglePoemQuickFlag = async (p: Poem, patch: Partial<Poem>) => {
    try {
      const res = await authFetch(`/api/poetry/${p.id}`, {
        method: 'PUT',
        body: JSON.stringify(patch)
      });
      if (res.ok) {
        onDataRefresh();
        showBanner(
          'success',
          patch.featured
            ? (lang === 'ar' ? 'تم إبراز المنظومة (تظهر أول ٣ منظومات مميزة في الواجهة الرئيسية)' : 'Poem featured (top 3 featured poems appear in Hero)')
            : (lang === 'ar' ? 'تم تحديث حالة المنظومة' : 'Poem updated')
        );
      }
    } catch {
      showBanner('error', lang === 'ar' ? 'تعذر التحديث السريع' : 'Quick update failed');
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
                {lang === 'ar' ? 'كلمة المرور الجديدة (8 أحرف كحد أدنى)' : 'New Master Password (min 8 characters)'}
              </label>
              <input
                type="password"
                required
                minLength={8}
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
                minLength={8}
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

  // ================= FILTERED, SORTED & PAGINATED DATA =================
  const qLower = tabSearch.trim().toLowerCase();
  const effectivePageSize = pageSize <= 0 ? 999999 : pageSize;

  const resetCurrentTabFilters = () => {
    setTabSearch('');
    setFilterCategory('all');
    setFilterStatus('all');
    setFilterPricing('all');
    setFilterLevel('all');
    setFilterCoverage('all');
    setFilterArticleType('all');
    setSortBy('default');
  };

  const hasActiveFilters =
    Boolean(tabSearch.trim()) ||
    filterCategory !== 'all' ||
    filterStatus !== 'all' ||
    filterPricing !== 'all' ||
    filterLevel !== 'all' ||
    filterCoverage !== 'all' ||
    filterArticleType !== 'all' ||
    sortBy !== 'default';

  const filteredBooks = books
    .filter(b => {
      const matchesQ =
        !qLower ||
        b.title.toLowerCase().includes(qLower) ||
        (b.subtitle && b.subtitle.toLowerCase().includes(qLower)) ||
        b.category.toLowerCase().includes(qLower);
      const matchesCat = filterCategory === 'all' || b.category === filterCategory;
      const matchesStatus = filterStatus === 'all' || b.status === filterStatus;
      const matchesPricing =
        filterPricing === 'all' ||
        (filterPricing === 'paid' ? Boolean(b.isPaid) : !b.isPaid);
      return matchesQ && matchesCat && matchesStatus && matchesPricing;
    })
    .sort((a, b) => {
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      if (sortBy === 'metric') return (b.pages || 0) - (a.pages || 0);
      return 0;
    });
  const paginatedBooks = filteredBooks.slice((tabPage - 1) * effectivePageSize, tabPage * effectivePageSize);

  const filteredAudios = audios
    .filter(a => {
      const matchesQ =
        !qLower ||
        a.title.toLowerCase().includes(qLower) ||
        a.series.toLowerCase().includes(qLower) ||
        a.category.toLowerCase().includes(qLower) ||
        (a.r2Prefix && a.r2Prefix.toLowerCase().includes(qLower));
      const matchesCat = filterCategory === 'all' || a.category === filterCategory;
      const matchesLevel = filterLevel === 'all' || a.levelId === filterLevel;
      const matchesStatus = filterStatus === 'all' || a.status === filterStatus;
      const lessonCount = a.lessons?.length || 0;
      const matchesCoverage =
        filterCoverage === 'all'
          ? true
          : filterCoverage === 'recorded'
          ? lessonCount > 0
          : lessonCount === 0;
      return matchesQ && matchesCat && matchesLevel && matchesStatus && matchesCoverage;
    })
    .sort((a, b) => {
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      if (sortBy === 'metric') return (b.lessons?.length || 0) - (a.lessons?.length || 0);
      return 0;
    });
  const paginatedAudios = filteredAudios.slice((tabPage - 1) * effectivePageSize, tabPage * effectivePageSize);

  const featuredPoemsCount = poems.filter(p => Boolean(p.featured)).length;

  const filteredPoems = poems
    .filter(p => {
      const matchesQ =
        !qLower ||
        p.title.toLowerCase().includes(qLower) ||
        p.meter.toLowerCase().includes(qLower) ||
        p.category.toLowerCase().includes(qLower);
      const matchesCat = filterCategory === 'all' || p.category === filterCategory;
      const matchesFeature =
        filterStatus === 'all'
          ? true
          : filterStatus === 'featured'
          ? Boolean(p.featured)
          : !p.featured;
      return matchesQ && matchesCat && matchesFeature;
    })
    .sort((a, b) => {
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      if (sortBy === 'metric') return (b.totalVerses || 0) - (a.totalVerses || 0);
      return 0;
    });
  const paginatedPoems = filteredPoems.slice((tabPage - 1) * effectivePageSize, tabPage * effectivePageSize);

  const filteredArticles = articles
    .filter(art => {
      const matchesQ =
        !qLower ||
        art.title.toLowerCase().includes(qLower) ||
        art.type.toLowerCase().includes(qLower) ||
        art.category.toLowerCase().includes(qLower);
      const matchesCat = filterCategory === 'all' || art.category === filterCategory;
      const matchesType = filterArticleType === 'all' || art.type === filterArticleType;
      return matchesQ && matchesCat && matchesType;
    })
    .sort((a, b) => {
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      if (sortBy === 'metric') return (b.views || 0) - (a.views || 0);
      return 0;
    });
  const paginatedArticles = filteredArticles.slice((tabPage - 1) * effectivePageSize, tabPage * effectivePageSize);

  const filteredQuestions = questions.filter(q => {
    const matchesStatus =
      questionFilter === 'all'
        ? true
        : questionFilter === 'pending'
        ? !q.answer
        : Boolean(q.answer);
    const matchesCat = filterCategory === 'all' || q.category === filterCategory;
    const matchesSearch =
      !qLower ||
      q.studentName.toLowerCase().includes(qLower) ||
      q.question.toLowerCase().includes(qLower) ||
      (q.answer && q.answer.toLowerCase().includes(qLower));
    return matchesStatus && matchesCat && matchesSearch;
  });
  const paginatedQuestions = filteredQuestions.slice((tabPage - 1) * effectivePageSize, tabPage * effectivePageSize);

  const pendingQuestionsCount = questions.filter(q => !q.answer).length;
  const totalLessonsAcrossAudios = audios.reduce((sum, a) => sum + (a.lessons?.length || 0), 0);
  const emptyAudioCoursesCount = audios.filter(a => (a.lessons?.length || 0) === 0).length;

  const renderPageSizeControl = () => (
    <label className="inline-flex items-center gap-1.5 px-2.5 py-2 rounded-xl border border-[#E0D4C1] bg-white text-xs font-readex text-[#0F382C] shrink-0">
      <span className="text-[11px] text-[#8C6D3B]">{lang === 'ar' ? 'عرض:' : 'Show:'}</span>
      <select
        value={pageSize}
        onChange={e => setPageSize(Number(e.target.value))}
        className="bg-transparent font-latin font-bold text-xs text-[#0F382C] focus:outline-none cursor-pointer"
      >
        {PAGE_SIZE_OPTIONS.map(opt => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
        <option value={999999}>{lang === 'ar' ? 'الكل' : 'All'}</option>
      </select>
    </label>
  );

  const renderSelectAllBanner = (pageItems: Array<{ id: string }>, allFilteredItems: Array<{ id: string }>) => {
    const pageIds = pageItems.map(i => i.id);
    const allPageSelected = pageIds.length > 0 && pageIds.every(id => selectedIds.has(id));
    if (selectedIds.size === 0) return null;

    return (
      <div className="p-3.5 rounded-2xl bg-[#0F382C] text-[#FDFBF7] border border-[#C5A880]/40 shadow-sm space-y-3 font-readex text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-[#C5A880] text-[#0F382C] font-bold">
              {lang === 'ar' ? `تم تحديد ${selectedIds.size} عنصر` : `${selectedIds.size} selected`}
            </span>

            {allPageSelected && allFilteredItems.length > pageItems.length && selectedIds.size < allFilteredItems.length && (
              <button
                type="button"
                onClick={() => selectAllFiltered(allFilteredItems)}
                className="underline text-[#DFC7A5] hover:text-white font-semibold"
              >
                {lang === 'ar'
                  ? `تحديد جميع النتائج (${allFilteredItems.length}) عبر كل الصفحات`
                  : `Select all ${allFilteredItems.length} matching items across all pages`}
              </button>
            )}

            <button
              type="button"
              onClick={clearSelection}
              className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[#DFC7A5] transition"
            >
              {lang === 'ar' ? 'إلغاء التحديد' : 'Clear'}
            </button>
          </div>

          <button
            type="button"
            disabled={isApplyingBulk}
            onClick={() => {
              const entity = (activeTab === 'poetry' ? 'poems' : activeTab) as
                | 'books'
                | 'audios'
                | 'poems'
                | 'articles'
                | 'questions';
              requestBatchDelete(entity);
            }}
            className="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold flex items-center gap-1.5 disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{lang === 'ar' ? `حذف المحدد (${selectedIds.size})` : `Delete Selected (${selectedIds.size})`}</span>
          </button>
        </div>

        {/* Entity-specific quick batch edits */}
        {activeTab === 'books' && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/15">
            <select
              value={bulkStatus}
              onChange={e => setBulkStatus(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-white text-[#0F382C] text-xs font-semibold"
            >
              <option value="">{lang === 'ar' ? '-- تغيير الحالة --' : '-- Set Status --'}</option>
              <option value="مطبوع">{translateStatus('مطبوع')}</option>
              <option value="مخطوط">{translateStatus('مخطوط')}</option>
            </select>
            {bulkStatus && (
              <button
                type="button"
                disabled={isApplyingBulk}
                onClick={() => {
                  executeBatchUpdate('books', { status: bulkStatus }, lang === 'ar' ? 'تم تحديث الحالة' : 'Status updated');
                  setBulkStatus('');
                }}
                className="px-3 py-1.5 rounded-lg bg-[#C5A880] text-[#0F382C] font-bold"
              >
                {lang === 'ar' ? 'تطبيق' : 'Apply'}
              </button>
            )}

            <select
              value={bulkCategory}
              onChange={e => setBulkCategory(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-white text-[#0F382C] text-xs font-semibold"
            >
              <option value="">{lang === 'ar' ? '-- تغيير الفن --' : '-- Set Discipline --'}</option>
              {categories.map(c => (
                <option key={c} value={c}>{translateCategory(c)}</option>
              ))}
            </select>
            {bulkCategory && (
              <button
                type="button"
                disabled={isApplyingBulk}
                onClick={() => {
                  executeBatchUpdate('books', { category: bulkCategory }, lang === 'ar' ? 'تم تحديث الفن العلمي' : 'Discipline updated');
                  setBulkCategory('');
                }}
                className="px-3 py-1.5 rounded-lg bg-[#C5A880] text-[#0F382C] font-bold"
              >
                {lang === 'ar' ? 'تطبيق' : 'Apply'}
              </button>
            )}

            <button
              type="button"
              disabled={isApplyingBulk}
              onClick={() => executeBatchUpdate('books', { featured: true }, lang === 'ar' ? 'تم تمييز الكتب المحددة' : 'Marked as featured')}
              className="px-2.5 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-amber-200 font-semibold flex items-center gap-1"
            >
              <Star className="w-3 h-3" />
              <span>{lang === 'ar' ? 'إبراز' : 'Feature'}</span>
            </button>
            <button
              type="button"
              disabled={isApplyingBulk}
              onClick={() => executeBatchUpdate('books', { featured: false }, lang === 'ar' ? 'تم إلغاء الإبراز' : 'Unfeatured')}
              className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 font-semibold"
            >
              {lang === 'ar' ? 'إلغاء الإبراز' : 'Unfeature'}
            </button>

            <button
              type="button"
              disabled={isApplyingBulk}
              onClick={() => executeBatchUpdate('books', { isPaid: true }, lang === 'ar' ? 'تم تعيين الكتب المحددة كمدفوعة (طلب عبر واتساب)' : 'Marked as Paid (Order via WhatsApp)')}
              className="px-2.5 py-1.5 rounded-lg bg-[#C5A880] hover:bg-[#DFC7A5] text-[#0F382C] font-bold flex items-center gap-1"
            >
              <ShoppingBag className="w-3 h-3" />
              <span>{lang === 'ar' ? 'تعيين كمدفوع' : 'Mark Paid'}</span>
            </button>
            <button
              type="button"
              disabled={isApplyingBulk}
              onClick={() => executeBatchUpdate('books', { isPaid: false, price: '' }, lang === 'ar' ? 'تم تعيين الكتب المحددة كمجانية' : 'Marked as Free')}
              className="px-2.5 py-1.5 rounded-lg bg-emerald-600/80 hover:bg-emerald-600 text-white font-semibold"
            >
              {lang === 'ar' ? 'تعيين كمجاني' : 'Mark Free'}
            </button>
          </div>
        )}

        {activeTab === 'audios' && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/15">
            <select
              value={bulkStatus}
              onChange={e => setBulkStatus(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-white text-[#0F382C] text-xs font-semibold"
            >
              <option value="">{lang === 'ar' ? '-- تغيير الحالة --' : '-- Set Status --'}</option>
              <option value="درس مستمر">{lang === 'ar' ? 'درس مستمر' : 'Ongoing'}</option>
              <option value="مكتمل">{lang === 'ar' ? 'مكتمل' : 'Completed'}</option>
            </select>
            {bulkStatus && (
              <button
                type="button"
                disabled={isApplyingBulk}
                onClick={() => {
                  executeBatchUpdate('audios', { status: bulkStatus }, lang === 'ar' ? 'تم تحديث حالة السلاسل' : 'Course status updated');
                  setBulkStatus('');
                }}
                className="px-3 py-1.5 rounded-lg bg-[#C5A880] text-[#0F382C] font-bold"
              >
                {lang === 'ar' ? 'تطبيق' : 'Apply'}
              </button>
            )}

            <select
              value={bulkLevelId}
              onChange={e => setBulkLevelId(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-white text-[#0F382C] text-xs font-semibold"
            >
              <option value="">{lang === 'ar' ? '-- تغيير المستوى --' : '-- Set Level --'}</option>
              <option value="beginner">{t('beginner')}</option>
              <option value="intermediate">{t('intermediate')}</option>
              <option value="advanced">{t('advanced')}</option>
            </select>
            {bulkLevelId && (
              <button
                type="button"
                disabled={isApplyingBulk}
                onClick={() => {
                  const lvl = bulkLevelId === 'beginner' ? 'مبتدئ' : bulkLevelId === 'intermediate' ? 'متوسط' : 'متقدم / مفصل';
                  executeBatchUpdate('audios', { levelId: bulkLevelId, level: lvl }, lang === 'ar' ? 'تم تحديث المستوى' : 'Level updated');
                  setBulkLevelId('');
                }}
                className="px-3 py-1.5 rounded-lg bg-[#C5A880] text-[#0F382C] font-bold"
              >
                {lang === 'ar' ? 'تطبيق' : 'Apply'}
              </button>
            )}

            <select
              value={bulkCategory}
              onChange={e => setBulkCategory(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-white text-[#0F382C] text-xs font-semibold"
            >
              <option value="">{lang === 'ar' ? '-- تغيير الفن --' : '-- Set Discipline --'}</option>
              {categories.map(c => (
                <option key={c} value={c}>{translateCategory(c)}</option>
              ))}
            </select>
            {bulkCategory && (
              <button
                type="button"
                disabled={isApplyingBulk}
                onClick={() => {
                  executeBatchUpdate('audios', { category: bulkCategory }, lang === 'ar' ? 'تم تحديث الفن العلمي' : 'Discipline updated');
                  setBulkCategory('');
                }}
                className="px-3 py-1.5 rounded-lg bg-[#C5A880] text-[#0F382C] font-bold"
              >
                {lang === 'ar' ? 'تطبيق' : 'Apply'}
              </button>
            )}
          </div>
        )}

        {activeTab === 'poetry' && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/15">
            <select
              value={bulkCategory}
              onChange={e => setBulkCategory(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-white text-[#0F382C] text-xs font-semibold"
            >
              <option value="">{lang === 'ar' ? '-- تغيير الفن / التصنيف --' : '-- Set Category --'}</option>
              {categories.map(c => (
                <option key={c} value={c}>{translateCategory(c)}</option>
              ))}
            </select>
            {bulkCategory && (
              <button
                type="button"
                disabled={isApplyingBulk}
                onClick={() => {
                  executeBatchUpdate('poems', { category: bulkCategory }, lang === 'ar' ? 'تم تحديث تصنيف المنظومات' : 'Category updated');
                  setBulkCategory('');
                }}
                className="px-3 py-1.5 rounded-lg bg-[#C5A880] text-[#0F382C] font-bold"
              >
                {lang === 'ar' ? 'تطبيق' : 'Apply'}
              </button>
            )}

            <button
              type="button"
              disabled={isApplyingBulk}
              onClick={() => executeBatchUpdate('poems', { featured: true }, lang === 'ar' ? 'تم إبراز المنظومات المحددة في الواجهة' : 'Poems featured for Home Hero')}
              className="px-2.5 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-amber-200 font-semibold flex items-center gap-1"
            >
              <Star className="w-3 h-3" />
              <span>{lang === 'ar' ? 'إبراز في الواجهة' : 'Feature'}</span>
            </button>
            <button
              type="button"
              disabled={isApplyingBulk}
              onClick={() => executeBatchUpdate('poems', { featured: false }, lang === 'ar' ? 'تم إلغاء الإبراز من الواجهة' : 'Unfeatured from Home Hero')}
              className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 font-semibold"
            >
              {lang === 'ar' ? 'إلغاء الإبراز' : 'Unfeature'}
            </button>
          </div>
        )}

        {activeTab === 'articles' && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/15">
            <select
              value={bulkArticleType}
              onChange={e => setBulkArticleType(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-white text-[#0F382C] text-xs font-semibold"
            >
              <option value="">{lang === 'ar' ? '-- تغيير النوع --' : '-- Set Type --'}</option>
              <option value="خواطر ابن بيضاء">{translateArticleType('خواطر ابن بيضاء')}</option>
              <option value="بحث أكاديمي">{translateArticleType('بحث أكاديمي')}</option>
              <option value="مقال عقدي">{translateArticleType('مقال عقدي')}</option>
              <option value="مقال لغوي">{lang === 'ar' ? 'مقال لغوي' : 'Linguistic Article'}</option>
            </select>
            {bulkArticleType && (
              <button
                type="button"
                disabled={isApplyingBulk}
                onClick={() => {
                  executeBatchUpdate('articles', { type: bulkArticleType }, lang === 'ar' ? 'تم تحديث النوع' : 'Type updated');
                  setBulkArticleType('');
                }}
                className="px-3 py-1.5 rounded-lg bg-[#C5A880] text-[#0F382C] font-bold"
              >
                {lang === 'ar' ? 'تطبيق' : 'Apply'}
              </button>
            )}

            <select
              value={bulkCategory}
              onChange={e => setBulkCategory(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-white text-[#0F382C] text-xs font-semibold"
            >
              <option value="">{lang === 'ar' ? '-- تغيير الفن --' : '-- Set Discipline --'}</option>
              {categories.map(c => (
                <option key={c} value={c}>{translateCategory(c)}</option>
              ))}
            </select>
            {bulkCategory && (
              <button
                type="button"
                disabled={isApplyingBulk}
                onClick={() => {
                  executeBatchUpdate('articles', { category: bulkCategory }, lang === 'ar' ? 'تم تحديث الفن' : 'Discipline updated');
                  setBulkCategory('');
                }}
                className="px-3 py-1.5 rounded-lg bg-[#C5A880] text-[#0F382C] font-bold"
              >
                {lang === 'ar' ? 'تطبيق' : 'Apply'}
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderSelectHeaderCheckbox = (pageItems: Array<{ id: string }>) => {
    const pageIds = pageItems.map(i => i.id);
    const selectedCountOnPage = pageIds.filter(id => selectedIds.has(id)).length;
    const allSelected = pageIds.length > 0 && selectedCountOnPage === pageIds.length;
    const someSelected = selectedCountOnPage > 0 && !allSelected;
    return (
      <input
        type="checkbox"
        aria-label={lang === 'ar' ? 'تحديد الكل في هذه الصفحة' : 'Select all on page'}
        checked={allSelected}
        ref={el => {
          if (el) el.indeterminate = someSelected;
        }}
        onChange={() => toggleSelectPage(pageItems)}
        className="w-4 h-4 rounded border-[#C5A880] text-[#0F382C] cursor-pointer accent-[#0F382C]"
      />
    );
  };

  return (
    <div className="space-y-7 max-w-6xl mx-auto">
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
              ? 'إدارة متقدمة بالفرز والتحديد المتعدد على المكتبة، الشروح ودروسها، المنظومات، الخواطر، الحلقات، والملف الشخصي'
              : 'Full CMS with multi-select bulk actions, per-page controls, and filtering across Library, Audio Playlists, Diwan, Reflections & Schedule'}
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
          className={`p-3.5 rounded-2xl bg-white border text-start transition shadow-2xs ${activeTab === 'books' ? 'border-[#0F382C] ring-1 ring-[#0F382C]/20' : 'border-[#EADFCB] hover:border-[#0F382C]/40'}`}
        >
          <span className="text-[11px] text-[#8C6D3B] font-semibold block">{lang === 'ar' ? 'المؤلفات' : 'Books'}</span>
          <span className="font-amiri font-bold text-2xl text-[#0F382C]">{books.length}</span>
        </button>

        <button
          onClick={() => setActiveTab('audios')}
          className={`p-3.5 rounded-2xl bg-white border text-start transition shadow-2xs ${activeTab === 'audios' ? 'border-[#0F382C] ring-1 ring-[#0F382C]/20' : 'border-[#EADFCB] hover:border-[#0F382C]/40'}`}
        >
          <span className="text-[11px] text-[#8C6D3B] font-semibold block">
            {lang === 'ar' ? 'السلاسل / الدروس' : 'Courses / Lessons'}
          </span>
          <span className="font-amiri font-bold text-2xl text-[#0F382C]">
            {audios.length} <span className="text-sm font-readex text-[#A58455]">({totalLessonsAcrossAudios})</span>
          </span>
          {emptyAudioCoursesCount > 0 && (
            <span className="block text-[10px] text-amber-700 font-medium mt-0.5">
              {emptyAudioCoursesCount} {lang === 'ar' ? 'بانتظار الرفع' : 'pending upload'}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('poetry')}
          className={`p-3.5 rounded-2xl bg-white border text-start transition shadow-2xs ${activeTab === 'poetry' ? 'border-[#0F382C] ring-1 ring-[#0F382C]/20' : 'border-[#EADFCB] hover:border-[#0F382C]/40'}`}
        >
          <span className="text-[11px] text-[#8C6D3B] font-semibold block">{lang === 'ar' ? 'المنظومات' : 'Poems'}</span>
          <span className="font-amiri font-bold text-2xl text-[#0F382C]">{poems.length}</span>
        </button>

        <button
          onClick={() => setActiveTab('articles')}
          className={`p-3.5 rounded-2xl bg-white border text-start transition shadow-2xs ${activeTab === 'articles' ? 'border-[#0F382C] ring-1 ring-[#0F382C]/20' : 'border-[#EADFCB] hover:border-[#0F382C]/40'}`}
        >
          <span className="text-[11px] text-[#8C6D3B] font-semibold block">{lang === 'ar' ? 'الخواطر والمقالات' : 'Articles'}</span>
          <span className="font-amiri font-bold text-2xl text-[#0F382C]">{articles.length}</span>
        </button>

        <button
          onClick={() => setActiveTab('schedule')}
          className={`p-3.5 rounded-2xl bg-white border text-start transition shadow-2xs ${activeTab === 'schedule' ? 'border-[#0F382C] ring-1 ring-[#0F382C]/20' : 'border-[#EADFCB] hover:border-[#0F382C]/40'}`}
        >
          <span className="text-[11px] text-[#8C6D3B] font-semibold block">{lang === 'ar' ? 'الحلقات والإعلانات' : 'Circles & News'}</span>
          <span className="font-amiri font-bold text-2xl text-[#0F382C]">
            {scheduleData.weeklyCircles.length} <span className="text-sm font-readex text-[#A58455]">+ {scheduleData.announcements.length}</span>
          </span>
        </button>

        <button
          onClick={() => setActiveTab('questions')}
          className={`p-3.5 rounded-2xl bg-white border text-start transition shadow-2xs ${activeTab === 'questions' ? 'border-[#0F382C] ring-1 ring-[#0F382C]/20' : 'border-[#EADFCB] hover:border-[#0F382C]/40'}`}
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
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <h3 className="font-amiri font-bold text-xl text-[#0F382C]">
              {lang === 'ar' ? 'إدارة المؤلفات والكتب' : 'Manage Books & Treatises'}
            </h3>
            <div className="flex flex-wrap items-center gap-2 font-readex text-xs">
              <div className="relative flex-1 min-w-[180px] sm:w-52">
                <input
                  type="text"
                  value={tabSearch}
                  onChange={e => setTabSearch(e.target.value)}
                  placeholder={lang === 'ar' ? 'بحث في الكتب...' : 'Search books...'}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#E0D4C1] bg-white text-xs"
                />
                <Search className="w-3.5 h-3.5 text-[#A58455] absolute left-3 top-1/2 -translate-y-1/2" />
              </div>

              <select
                value={filterCategory}
                onChange={e => setFilterCategory(e.target.value)}
                className="px-3 py-2 rounded-xl border border-[#E0D4C1] bg-white text-xs text-[#0F382C]"
              >
                <option value="all">{lang === 'ar' ? 'كل الفنون' : 'All Disciplines'}</option>
                {categories.map(c => (
                  <option key={c} value={c}>{translateCategory(c)}</option>
                ))}
              </select>

              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="px-3 py-2 rounded-xl border border-[#E0D4C1] bg-white text-xs text-[#0F382C]"
              >
                <option value="all">{lang === 'ar' ? 'كل الحالات' : 'All Statuses'}</option>
                <option value="مطبوع">{translateStatus('مطبوع')}</option>
                <option value="مخطوط">{translateStatus('مخطوط')}</option>
              </select>

              <select
                value={filterPricing}
                onChange={e => setFilterPricing(e.target.value as 'all' | 'free' | 'paid')}
                className="px-3 py-2 rounded-xl border border-[#E0D4C1] bg-white text-xs text-[#0F382C]"
              >
                <option value="all">{t('all_pricing')}</option>
                <option value="free">{t('free_book')}</option>
                <option value="paid">{t('paid_book')}</option>
              </select>

              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                className="px-3 py-2 rounded-xl border border-[#E0D4C1] bg-white text-xs text-[#0F382C]"
              >
                <option value="default">{lang === 'ar' ? 'الترتيب الافتراضي' : 'Default Order'}</option>
                <option value="title">{lang === 'ar' ? 'حسب العنوان' : 'Title A-Z'}</option>
                <option value="metric">{lang === 'ar' ? 'الأكثر صفحات' : 'Pages High-Low'}</option>
              </select>

              {renderPageSizeControl()}

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetCurrentTabFilters}
                  className="px-2.5 py-2 rounded-xl bg-[#F4EFE6] text-[#8C6D3B] hover:text-[#0F382C] flex items-center gap-1"
                  title={lang === 'ar' ? 'إعادة ضبط الفلاتر' : 'Reset filters'}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}

              <button
                onClick={openNewBook}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0F382C] text-white text-xs font-bold hover:bg-[#164E3D] shadow-xs"
              >
                <Plus className="w-4 h-4 text-[#DFC7A5]" />
                <span>{lang === 'ar' ? 'إضافة مؤلف' : 'Add Treatise'}</span>
              </button>
            </div>
          </div>

          {renderSelectAllBanner(paginatedBooks, filteredBooks)}

          <div className="bg-white rounded-2xl border border-[#EADFCB] overflow-x-auto shadow-xs">
            <table className="w-full text-right text-xs font-readex rtl:text-right ltr:text-left">
              <thead className="bg-[#F6F1E7] border-b border-[#EADFCB] text-[#0F382C]">
                <tr>
                  <th className="p-3.5 w-10 text-center">
                    {renderSelectHeaderCheckbox(paginatedBooks)}
                  </th>
                  <th className="p-3.5 font-bold">{lang === 'ar' ? 'عنوان المصنف' : 'Treatise Title'}</th>
                  <th className="p-3.5 font-bold">{lang === 'ar' ? 'الفن العلمي' : 'Discipline'}</th>
                  <th className="p-3.5 font-bold">{lang === 'ar' ? 'الحالة' : 'Status'}</th>
                  <th className="p-3.5 font-bold">{lang === 'ar' ? 'خيارات' : 'Flags'}</th>
                  <th className="p-3.5 font-bold">{lang === 'ar' ? 'الصفحات' : 'Pages'}</th>
                  <th className="p-3.5 text-center font-bold">{lang === 'ar' ? 'الإجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EADFCB]/60">
                {paginatedBooks.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-[#8C6D3B]">
                      {lang === 'ar' ? 'لا توجد مؤلفات مطابقة للبحث' : 'No matching treatises found'}
                    </td>
                  </tr>
                ) : (
                  paginatedBooks.map(b => {
                    const isChecked = selectedIds.has(b.id);
                    return (
                      <tr key={b.id} className={`transition ${isChecked ? 'bg-[#FAF5EB]' : 'hover:bg-[#FDFBF7]'}`}>
                        <td className="p-3.5 text-center">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSelectItem(b.id)}
                            className="w-4 h-4 rounded border-[#C5A880] accent-[#0F382C] cursor-pointer"
                          />
                        </td>
                        <td className="p-3.5">
                          <div className="font-amiri font-bold text-base text-[#0F382C]">{b.title}</div>
                          {b.subtitle && <div className="text-[11px] text-[#8C6D3B]">{b.subtitle}</div>}
                        </td>
                        <td className="p-3.5">{translateCategory(b.category)}</td>
                        <td className="p-3.5">
                          <button
                            type="button"
                            onClick={() =>
                              toggleBookQuickFlag(b, { status: b.status === 'مطبوع' ? 'مخطوط' : 'مطبوع' })
                            }
                            title={lang === 'ar' ? 'انقر للتبديل السريع بين مطبوع ومخطوط' : 'Click to toggle status'}
                            className={`px-2.5 py-0.5 rounded font-bold transition hover:opacity-80 ${
                              b.status === 'مطبوع'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {translateStatus(b.status)}
                          </button>
                        </td>
                        <td className="p-3.5">
                          <div className="flex flex-wrap items-center gap-1">
                            <button
                              type="button"
                              onClick={() => toggleBookQuickFlag(b, { isPaid: !b.isPaid })}
                              title={lang === 'ar' ? 'انقر للتبديل بين مجاني ومدفوع (طلب عبر واتساب)' : 'Click to toggle Free / Paid'}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border transition ${
                                b.isPaid
                                  ? 'bg-[#FAF3E3] text-[#8C5B15] border-[#C5A880] hover:bg-[#F3E6C8]'
                                  : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                              }`}
                            >
                              {b.isPaid ? (
                                <>
                                  <ShoppingBag className="w-2.5 h-2.5" />
                                  <span>{b.price ? `${t('paid_book')} • ${b.price}` : t('paid_book')}</span>
                                </>
                              ) : (
                                <span>{t('free_book')}</span>
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleBookQuickFlag(b, { featured: !b.featured })}
                              title={lang === 'ar' ? 'تبديل الإبراز في الرئيسية' : 'Toggle Featured'}
                              className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-bold transition ${
                                b.featured
                                  ? 'bg-amber-100 text-amber-900'
                                  : 'bg-gray-100 text-gray-500 hover:bg-amber-50 hover:text-amber-700'
                              }`}
                            >
                              <Star className={`w-2.5 h-2.5 ${b.featured ? 'fill-amber-600' : ''}`} />
                              {lang === 'ar' ? (b.featured ? 'مميز' : 'عادي') : (b.featured ? 'Featured' : 'Normal')}
                            </button>
                            {!b.isPaid && b.hasPdf && (
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
                        <td className="p-3.5 font-latin">{b.pages}</td>
                        <td className="p-3.5 text-center">
                          <div className="flex items-center justify-center gap-1">
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
                              onClick={() => {
                                const { id: _ignore, ...copy } = b;
                                setEditingBook({
                                  ...copy,
                                  title: `${b.title} (${lang === 'ar' ? 'نسخة' : 'Copy'})`
                                });
                                setIsBookModalOpen(true);
                              }}
                              className="p-1.5 rounded text-[#8C6D3B] hover:bg-[#F4EFE6]"
                              title={lang === 'ar' ? 'نسخ كجديد' : 'Duplicate'}
                            >
                              <Copy className="w-3.5 h-3.5" />
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
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <Pagination
            currentPage={tabPage}
            totalItems={filteredBooks.length}
            pageSize={pageSize}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            onPageSizeChange={setPageSize}
            onPageChange={setTabPage}
          />
        </div>
      )}

      {/* ================= 2. AUDIOS MANAGEMENT TAB ================= */}
      {activeTab === 'audios' && (
        <div className="space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <h3 className="font-amiri font-bold text-xl text-[#0F382C]">
              {lang === 'ar' ? 'إدارة الشروح الصوتية وقوائم الدروس' : 'Manage Audio Series & Lesson Playlists'}
            </h3>
            <div className="flex flex-wrap items-center gap-2 font-readex text-xs">
              <div className="relative flex-1 min-w-[180px] sm:w-48">
                <input
                  type="text"
                  value={tabSearch}
                  onChange={e => setTabSearch(e.target.value)}
                  placeholder={lang === 'ar' ? 'بحث في الشروح أو R2...' : 'Search series or R2...'}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#E0D4C1] bg-white text-xs"
                />
                <Search className="w-3.5 h-3.5 text-[#A58455] absolute left-3 top-1/2 -translate-y-1/2" />
              </div>

              <select
                value={filterCategory}
                onChange={e => setFilterCategory(e.target.value)}
                className="px-2.5 py-2 rounded-xl border border-[#E0D4C1] bg-white text-xs text-[#0F382C]"
              >
                <option value="all">{lang === 'ar' ? 'كل الفنون' : 'All Disciplines'}</option>
                {categories.map(c => (
                  <option key={c} value={c}>{translateCategory(c)}</option>
                ))}
              </select>

              <select
                value={filterLevel}
                onChange={e => setFilterLevel(e.target.value)}
                className="px-2.5 py-2 rounded-xl border border-[#E0D4C1] bg-white text-xs text-[#0F382C]"
              >
                <option value="all">{lang === 'ar' ? 'كل المستويات' : 'All Levels'}</option>
                <option value="beginner">{t('beginner')}</option>
                <option value="intermediate">{t('intermediate')}</option>
                <option value="advanced">{t('advanced')}</option>
              </select>

              <select
                value={filterCoverage}
                onChange={e => setFilterCoverage(e.target.value as any)}
                className="px-2.5 py-2 rounded-xl border border-[#E0D4C1] bg-white text-xs text-[#0F382C]"
              >
                <option value="all">{lang === 'ar' ? 'كل الدروس' : 'All Coverage'}</option>
                <option value="recorded">{lang === 'ar' ? 'بها تسجيلات (>0)' : 'Has Recordings (>0)'}</option>
                <option value="empty">{lang === 'ar' ? 'فارغة (0 دروس)' : 'Empty (0 lessons)'}</option>
              </select>

              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                className="px-2.5 py-2 rounded-xl border border-[#E0D4C1] bg-white text-xs text-[#0F382C]"
              >
                <option value="default">{lang === 'ar' ? 'الترتيب الافتراضي' : 'Default Order'}</option>
                <option value="title">{lang === 'ar' ? 'حسب العنوان' : 'Title A-Z'}</option>
                <option value="metric">{lang === 'ar' ? 'الأكثر دروساً' : 'Lessons Count ↓'}</option>
              </select>

              {renderPageSizeControl()}

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetCurrentTabFilters}
                  className="px-2.5 py-2 rounded-xl bg-[#F4EFE6] text-[#8C6D3B] hover:text-[#0F382C]"
                  title={lang === 'ar' ? 'إعادة ضبط الفلاتر' : 'Reset filters'}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}

              <button
                onClick={openNewAudio}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0F382C] text-white text-xs font-bold hover:bg-[#164E3D] shadow-xs"
              >
                <Plus className="w-4 h-4 text-[#DFC7A5]" />
                <span>{lang === 'ar' ? 'إضافة شرح' : 'Add Audio'}</span>
              </button>
            </div>
          </div>

          {renderSelectAllBanner(paginatedAudios, filteredAudios)}

          <div className="bg-white rounded-2xl border border-[#EADFCB] overflow-x-auto shadow-xs">
            <table className="w-full text-right text-xs font-readex rtl:text-right ltr:text-left">
              <thead className="bg-[#F6F1E7] border-b border-[#EADFCB] text-[#0F382C]">
                <tr>
                  <th className="p-3.5 w-10 text-center">
                    {renderSelectHeaderCheckbox(paginatedAudios)}
                  </th>
                  <th className="p-3.5 font-bold">{lang === 'ar' ? 'عنوان الشرح' : 'Course Title'}</th>
                  <th className="p-3.5 font-bold">{lang === 'ar' ? 'المستوى' : 'Level'}</th>
                  <th className="p-3.5 font-bold">{lang === 'ar' ? 'الفن' : 'Discipline'}</th>
                  <th className="p-3.5 font-bold">{lang === 'ar' ? 'الدروس المسجلة' : 'Recorded'}</th>
                  <th className="p-3.5 font-bold">{lang === 'ar' ? 'الحالة' : 'Status'}</th>
                  <th className="p-3.5 text-center font-bold">{lang === 'ar' ? 'الإجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EADFCB]/60">
                {paginatedAudios.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-[#8C6D3B]">
                      {lang === 'ar' ? 'لا توجد شروح صوتية مطابقة' : 'No matching audio courses found'}
                    </td>
                  </tr>
                ) : (
                  paginatedAudios.map(a => {
                    const lessonsCount = a.lessons?.length || 0;
                    const isChecked = selectedIds.has(a.id);
                    return (
                      <tr key={a.id} className={`transition ${isChecked ? 'bg-[#FAF5EB]' : 'hover:bg-[#FDFBF7]'}`}>
                        <td className="p-3.5 text-center">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSelectItem(a.id)}
                            className="w-4 h-4 rounded border-[#C5A880] accent-[#0F382C] cursor-pointer"
                          />
                        </td>
                        <td className="p-3.5">
                          <div className="font-amiri font-bold text-base text-[#0F382C]">{a.title}</div>
                          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-[#8C6D3B]">
                            <span>{a.series}</span>
                            {a.r2Prefix && (
                              <span dir="ltr" className="px-1.5 py-0.2 rounded bg-[#FAF6EE] border border-[#EADFCB] font-latin text-[10px] text-[#0F382C]">
                                /{a.r2Prefix}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3.5">
                          <span className="px-2 py-0.5 rounded bg-[#F4EFE6] font-bold">
                            {translateLevel(a.level)}
                          </span>
                        </td>
                        <td className="p-3.5">{translateCategory(a.category)}</td>
                        <td className="p-3.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border font-bold ${
                                lessonsCount > 0
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : 'bg-[#FAF6EE] text-[#8C6D3B] border-[#EADFCB]'
                              }`}
                            >
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
                        <td className="p-3.5">
                          <button
                            type="button"
                            onClick={() => toggleAudioQuickStatus(a)}
                            title={lang === 'ar' ? 'انقر للتبديل بين مكتمل ودرس مستمر' : 'Click to toggle status'}
                            className={`px-2 py-0.5 rounded font-bold transition hover:opacity-80 ${
                              a.status === 'مكتمل'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {a.status}
                          </button>
                        </td>
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
                  })
                )}
              </tbody>
            </table>
          </div>

          <Pagination
            currentPage={tabPage}
            totalItems={filteredAudios.length}
            pageSize={pageSize}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            onPageSizeChange={setPageSize}
            onPageChange={setTabPage}
          />
        </div>
      )}

      {/* ================= 3. POETRY MANAGEMENT TAB ================= */}
      {activeTab === 'poetry' && (
        <div className="space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <h3 className="font-amiri font-bold text-xl text-[#0F382C]">
                {lang === 'ar' ? 'إدارة المنظومات والديوان الشعري' : 'Manage Poetry & Diwan'}
              </h3>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-readex font-bold border ${
                  featuredPoemsCount > 0
                    ? 'bg-amber-50 text-amber-900 border-amber-200'
                    : 'bg-[#F4EFE6] text-[#7A6440] border-[#E0D3BE]'
                }`}
                title={
                  lang === 'ar'
                    ? 'تُعرض أول ٣ منظومات مميزة في بطاقة الدرة الشعرية بالواجهة الرئيسية'
                    : 'The top 3 featured poems are displayed in the Home Hero spotlight card'
                }
              >
                <Star className={`w-3 h-3 ${featuredPoemsCount > 0 ? 'fill-amber-500 text-amber-600' : ''}`} />
                <span>
                  {lang === 'ar'
                    ? `مميز في الواجهة: ${Math.min(featuredPoemsCount, 3)} / ٣${featuredPoemsCount > 3 ? ` (إجمالي المحدد: ${featuredPoemsCount})` : ''}`
                    : `Hero Featured: ${Math.min(featuredPoemsCount, 3)} / 3${featuredPoemsCount > 3 ? ` (${featuredPoemsCount} marked)` : ''}`}
                </span>
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 font-readex text-xs">
              <div className="relative flex-1 min-w-[180px] sm:w-52">
                <input
                  type="text"
                  value={tabSearch}
                  onChange={e => setTabSearch(e.target.value)}
                  placeholder={lang === 'ar' ? 'بحث في المنظومات...' : 'Search poems...'}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#E0D4C1] bg-white text-xs"
                />
                <Search className="w-3.5 h-3.5 text-[#A58455] absolute left-3 top-1/2 -translate-y-1/2" />
              </div>

              <select
                value={filterCategory}
                onChange={e => setFilterCategory(e.target.value)}
                className="px-3 py-2 rounded-xl border border-[#E0D4C1] bg-white text-xs text-[#0F382C]"
              >
                <option value="all">{lang === 'ar' ? 'كل التصنيفات' : 'All Categories'}</option>
                {categories.map(c => (
                  <option key={c} value={c}>{translateCategory(c)}</option>
                ))}
              </select>

              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="px-3 py-2 rounded-xl border border-[#E0D4C1] bg-white text-xs text-[#0F382C]"
              >
                <option value="all">{lang === 'ar' ? 'الكل (مميز وعادي)' : 'All (Featured & Normal)'}</option>
                <option value="featured">{lang === 'ar' ? 'المميزة في الواجهة فقط' : 'Hero Featured Only'}</option>
                <option value="normal">{lang === 'ar' ? 'غير المميزة فقط' : 'Normal Only'}</option>
              </select>

              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                className="px-3 py-2 rounded-xl border border-[#E0D4C1] bg-white text-xs text-[#0F382C]"
              >
                <option value="default">{lang === 'ar' ? 'الترتيب الافتراضي' : 'Default Order'}</option>
                <option value="title">{lang === 'ar' ? 'حسب العنوان' : 'Title A-Z'}</option>
                <option value="metric">{lang === 'ar' ? 'الأكثر أبياتاً' : 'Verses High-Low'}</option>
              </select>

              {renderPageSizeControl()}

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetCurrentTabFilters}
                  className="px-2.5 py-2 rounded-xl bg-[#F4EFE6] text-[#8C6D3B] hover:text-[#0F382C]"
                  title={lang === 'ar' ? 'إعادة ضبط الفلاتر' : 'Reset filters'}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}

              <button
                onClick={openNewPoem}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0F382C] text-white text-xs font-bold hover:bg-[#164E3D] shadow-xs"
              >
                <Plus className="w-4 h-4 text-[#DFC7A5]" />
                <span>{lang === 'ar' ? 'إضافة منظومة' : 'Add Poem'}</span>
              </button>
            </div>
          </div>

          {renderSelectAllBanner(paginatedPoems, filteredPoems)}

          <div className="bg-white rounded-2xl border border-[#EADFCB] overflow-x-auto shadow-xs">
            <table className="w-full text-right text-xs font-readex rtl:text-right ltr:text-left">
              <thead className="bg-[#F6F1E7] border-b border-[#EADFCB] text-[#0F382C]">
                <tr>
                  <th className="p-3.5 w-10 text-center">
                    {renderSelectHeaderCheckbox(paginatedPoems)}
                  </th>
                  <th className="p-3.5 font-bold">{lang === 'ar' ? 'عنوان المنظومة' : 'Poem Title'}</th>
                  <th className="p-3.5 font-bold">{lang === 'ar' ? 'البحر الشعري' : 'Meter'}</th>
                  <th className="p-3.5 font-bold">{lang === 'ar' ? 'التصنيف' : 'Category'}</th>
                  <th className="p-3.5 font-bold">{lang === 'ar' ? 'الأبيات' : 'Verses'}</th>
                  <th className="p-3.5 font-bold">{t('year')}</th>
                  <th className="p-3.5 font-bold">{lang === 'ar' ? 'الواجهة الرئيسية' : 'Home Hero'}</th>
                  <th className="p-3.5 text-center font-bold">{lang === 'ar' ? 'الإجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EADFCB]/60">
                {paginatedPoems.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-[#8C6D3B]">
                      {lang === 'ar' ? 'لا توجد منظومات مطابقة' : 'No matching poems found'}
                    </td>
                  </tr>
                ) : (
                  paginatedPoems.map(p => {
                    const isChecked = selectedIds.has(p.id);
                    return (
                      <tr key={p.id} className={`transition ${isChecked ? 'bg-[#FAF5EB]' : 'hover:bg-[#FDFBF7]'}`}>
                        <td className="p-3.5 text-center">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSelectItem(p.id)}
                            className="w-4 h-4 rounded border-[#C5A880] accent-[#0F382C] cursor-pointer"
                          />
                        </td>
                        <td className="p-3.5">
                          <div className="font-amiri font-bold text-base text-[#0F382C]">{p.title}</div>
                          {p.summary && (
                            <div className="text-[11px] text-[#5A635E] line-clamp-1 max-w-md">{p.summary}</div>
                          )}
                        </td>
                        <td className="p-3.5">
                          <span className="px-2 py-0.5 rounded bg-[#F4EFE6] text-[#A58455] font-semibold">
                            {translateMeter(p.meter)}
                          </span>
                        </td>
                        <td className="p-3.5">{translateCategory(p.category)}</td>
                        <td className="p-3.5 font-bold text-[#0F382C]">
                          {p.totalVerses} {t('verses_count')}
                        </td>
                        <td className="p-3.5 text-[#8C6D3B]">{p.year}</td>
                        <td className="p-3.5">
                          <button
                            type="button"
                            onClick={() => togglePoemQuickFlag(p, { featured: !p.featured })}
                            title={
                              lang === 'ar'
                                ? 'تبديل الإبراز ضمن أبرز ٣ منظومات في الواجهة الرئيسية'
                                : 'Toggle featuring this poem in the Home Hero (top 3)'
                            }
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-bold transition ${
                              p.featured
                                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                : 'bg-gray-100 text-gray-500 hover:bg-amber-50 hover:text-amber-700'
                            }`}
                          >
                            <Star className={`w-3 h-3 ${p.featured ? 'fill-amber-600 text-amber-700' : ''}`} />
                            <span>
                              {lang === 'ar'
                                ? (p.featured ? 'مميز في الواجهة' : 'عادي')
                                : (p.featured ? 'Featured' : 'Normal')}
                            </span>
                          </button>
                        </td>
                        <td className="p-3.5 text-center">
                          <div className="flex items-center justify-center gap-1">
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
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <Pagination
            currentPage={tabPage}
            totalItems={filteredPoems.length}
            pageSize={pageSize}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            onPageSizeChange={setPageSize}
            onPageChange={setTabPage}
          />
        </div>
      )}

      {/* ================= 4. ARTICLES MANAGEMENT TAB ================= */}
      {activeTab === 'articles' && (
        <div className="space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <h3 className="font-amiri font-bold text-xl text-[#0F382C]">
              {lang === 'ar' ? 'إدارة الخواطر والمقالات' : 'Manage Reflections & Articles'}
            </h3>
            <div className="flex flex-wrap items-center gap-2 font-readex text-xs">
              <div className="relative flex-1 min-w-[180px] sm:w-52">
                <input
                  type="text"
                  value={tabSearch}
                  onChange={e => setTabSearch(e.target.value)}
                  placeholder={lang === 'ar' ? 'بحث في الخواطر...' : 'Search articles...'}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#E0D4C1] bg-white text-xs"
                />
                <Search className="w-3.5 h-3.5 text-[#A58455] absolute left-3 top-1/2 -translate-y-1/2" />
              </div>

              <select
                value={filterArticleType}
                onChange={e => setFilterArticleType(e.target.value)}
                className="px-3 py-2 rounded-xl border border-[#E0D4C1] bg-white text-xs text-[#0F382C]"
              >
                <option value="all">{lang === 'ar' ? 'كل الأنواع' : 'All Types'}</option>
                <option value="خواطر ابن بيضاء">{translateArticleType('خواطر ابن بيضاء')}</option>
                <option value="بحث أكاديمي">{translateArticleType('بحث أكاديمي')}</option>
                <option value="مقال عقدي">{translateArticleType('مقال عقدي')}</option>
                <option value="مقال لغوي">{lang === 'ar' ? 'مقال لغوي' : 'Linguistic Article'}</option>
              </select>

              <select
                value={filterCategory}
                onChange={e => setFilterCategory(e.target.value)}
                className="px-3 py-2 rounded-xl border border-[#E0D4C1] bg-white text-xs text-[#0F382C]"
              >
                <option value="all">{lang === 'ar' ? 'كل الفنون' : 'All Disciplines'}</option>
                {categories.map(c => (
                  <option key={c} value={c}>{translateCategory(c)}</option>
                ))}
              </select>

              {renderPageSizeControl()}

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetCurrentTabFilters}
                  className="px-2.5 py-2 rounded-xl bg-[#F4EFE6] text-[#8C6D3B] hover:text-[#0F382C]"
                  title={lang === 'ar' ? 'إعادة ضبط الفلاتر' : 'Reset filters'}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}

              <button
                onClick={openNewArticle}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0F382C] text-white text-xs font-bold hover:bg-[#164E3D] shadow-xs"
              >
                <Plus className="w-4 h-4 text-[#DFC7A5]" />
                <span>{lang === 'ar' ? 'نشر خاطرة / مقال' : 'New Article'}</span>
              </button>
            </div>
          </div>

          {renderSelectAllBanner(paginatedArticles, filteredArticles)}

          <div className="bg-white rounded-2xl border border-[#EADFCB] overflow-x-auto shadow-xs">
            <table className="w-full text-right text-xs font-readex rtl:text-right ltr:text-left">
              <thead className="bg-[#F6F1E7] border-b border-[#EADFCB] text-[#0F382C]">
                <tr>
                  <th className="p-3.5 w-10 text-center">
                    {renderSelectHeaderCheckbox(paginatedArticles)}
                  </th>
                  <th className="p-3.5 font-bold">{lang === 'ar' ? 'العنوان والملخص' : 'Title & Excerpt'}</th>
                  <th className="p-3.5 font-bold">{lang === 'ar' ? 'النوع' : 'Type'}</th>
                  <th className="p-3.5 font-bold">{lang === 'ar' ? 'الفن العلمي' : 'Discipline'}</th>
                  <th className="p-3.5 font-bold">{lang === 'ar' ? 'التاريخ' : 'Date'}</th>
                  <th className="p-3.5 text-center font-bold">{lang === 'ar' ? 'الإجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EADFCB]/60">
                {paginatedArticles.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-[#8C6D3B]">
                      {lang === 'ar' ? 'لا توجد خواطر أو مقالات مطابقة' : 'No matching articles found'}
                    </td>
                  </tr>
                ) : (
                  paginatedArticles.map(art => {
                    const isChecked = selectedIds.has(art.id);
                    return (
                      <tr key={art.id} className={`transition ${isChecked ? 'bg-[#FAF5EB]' : 'hover:bg-[#FDFBF7]'}`}>
                        <td className="p-3.5 text-center">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSelectItem(art.id)}
                            className="w-4 h-4 rounded border-[#C5A880] accent-[#0F382C] cursor-pointer"
                          />
                        </td>
                        <td className="p-3.5">
                          <div className="font-amiri font-bold text-base text-[#0F382C]">{art.title}</div>
                          {art.summary && (
                            <div className="font-naskh text-[11px] text-[#4B554E] line-clamp-1 max-w-md">{art.summary}</div>
                          )}
                        </td>
                        <td className="p-3.5">
                          <span className="text-[11px] px-2.5 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200 font-bold">
                            {translateArticleType(art.type)}
                          </span>
                        </td>
                        <td className="p-3.5">{translateCategory(art.category)}</td>
                        <td className="p-3.5 text-[#A58455]">{art.date}</td>
                        <td className="p-3.5 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => openEditArticle(art)}
                              className="p-1.5 rounded-lg hover:bg-[#F4EFE6] text-[#0F382C]"
                              title={t('edit')}
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                const { id: _ignore, ...copy } = art;
                                setEditingArticle({
                                  ...copy,
                                  title: `${art.title} (${lang === 'ar' ? 'نسخة' : 'Copy'})`
                                });
                                setArticleTagsInput((art.tags || []).join(', '));
                                setIsArticleModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg hover:bg-[#F4EFE6] text-[#8C6D3B]"
                              title={lang === 'ar' ? 'نسخ كجديد' : 'Duplicate'}
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => requestDeleteArticle(art)}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-red-600"
                              title={t('delete')}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <Pagination
            currentPage={tabPage}
            totalItems={filteredArticles.length}
            pageSize={pageSize}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            onPageSizeChange={setPageSize}
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
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <h3 className="font-amiri font-bold text-xl text-[#0F382C]">
              {lang === 'ar' ? 'مراجعة وإجابة أسئلة واستفتاءات الطلاب' : 'Review, Answer & Moderate Inquiries'}
            </h3>
            <div className="flex flex-wrap items-center gap-2 font-readex text-xs">
              <div className="inline-flex rounded-xl border border-[#E0D4C1] bg-white p-1 text-xs">
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
              <div className="relative w-full sm:w-48">
                <input
                  type="text"
                  value={tabSearch}
                  onChange={e => setTabSearch(e.target.value)}
                  placeholder={lang === 'ar' ? 'بحث في الأسئلة...' : 'Search inquiries...'}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#E0D4C1] bg-white text-xs"
                />
                <Search className="w-3.5 h-3.5 text-[#A58455] absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
              {renderPageSizeControl()}
            </div>
          </div>

          {paginatedQuestions.length > 0 && (
            <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-[#F6F1E7] border border-[#EADFCB] text-xs font-readex text-[#0F382C]">
              <label className="inline-flex items-center gap-2 cursor-pointer font-bold">
                {renderSelectHeaderCheckbox(paginatedQuestions)}
                <span>{lang === 'ar' ? 'تحديد كل الأسئلة في هذه الصفحة' : 'Select all inquiries on this page'}</span>
              </label>
              <span className="text-[#8C6D3B]">
                {filteredQuestions.length} {lang === 'ar' ? 'سؤالاً' : 'inquiries'}
              </span>
            </div>
          )}

          {renderSelectAllBanner(paginatedQuestions, filteredQuestions)}

          <div className="space-y-4">
            {paginatedQuestions.map(q => {
              const isChecked = selectedIds.has(q.id);
              return (
                <div
                  key={q.id}
                  className={`p-5 rounded-2xl border shadow-xs space-y-3 transition ${isChecked ? 'bg-[#FAF5EB] border-[#C5A880]' : 'bg-white border-[#EADFCB]'}`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-readex">
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleSelectItem(q.id)}
                        className="w-4 h-4 rounded border-[#C5A880] accent-[#0F382C] cursor-pointer"
                      />
                      <span className="font-bold text-[#0F382C]">
                        {t('inquirer')}: {q.studentName} ({translateCategory(q.category)})
                      </span>
                    </div>
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
              );
            })}
          </div>

          <Pagination
            currentPage={tabPage}
            totalItems={filteredQuestions.length}
            pageSize={pageSize}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            onPageSizeChange={setPageSize}
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
                <label className="block text-xs font-readex font-semibold mb-1">
                  {lang === 'ar' ? 'رقم واتساب (أرقام دولية — يستقبل طلبات الكتب المدفوعة)' : 'WhatsApp Number (digits — receives Paid Book orders)'}
                </label>
                <input
                  type="text"
                  value={profileForm.whatsapp}
                  onChange={e => setProfileForm({ ...profileForm, whatsapp: e.target.value })}
                  placeholder="2348100966260"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E0D4C1] text-xs font-latin"
                />
                <span className="block text-[10px] text-[#8C6D3B] font-readex mt-1">
                  {lang === 'ar'
                    ? 'جميع طلبات الكتب المدفوعة والاستفتاءات تتوجه مباشرة إلى هذا الرقم عبر wa.me.'
                    : 'All paid book orders and student inquiries route directly to this number via wa.me.'}
                </span>
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

      {/* ================= 8. SECURITY, SESSIONS & PASSWORD TAB ================= */}
      {activeTab === 'security' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <form onSubmit={handleChangePassword} className="lg:col-span-6 bg-white rounded-3xl border border-[#EADFCB] p-6 sm:p-8 shadow-xs space-y-5">
            <div className="flex items-center gap-2 mb-2">
              <KeyRound className="w-5 h-5 text-[#0F382C]" />
              <h3 className="font-amiri font-bold text-xl text-[#0F382C]">
                {lang === 'ar' ? 'حماية الحساب وتغيير كلمة المرور' : 'Security & Change Master Password'}
              </h3>
            </div>

            <p className="text-xs text-[#5A635E] font-readex leading-relaxed">
              {lang === 'ar'
                ? 'يتم تشفير كلمات المرور على الخادم بواسطة خوارزمية PBKDF2-SHA512 المشددة مع Salt فريد، ويُنهي تحديث كلمة المرور أي جلسات أخرى نشطة تلقائياً.'
                : 'Passwords are cryptographically secured server-side using PBKDF2-SHA512 with unique salts. Updating your password automatically revokes all other active sessions.'}
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
                {lang === 'ar' ? 'كلمة المرور الجديدة (8 خانات على الأقل)' : 'New Password (min 8 characters)'}
              </label>
              <input
                type="password"
                required
                minLength={8}
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
                minLength={8}
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

          <div className="lg:col-span-6 space-y-5 font-readex">
            {/* Security Posture */}
            <div className="bg-white rounded-3xl border border-[#EADFCB] p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-[#0F382C]" />
                  <h3 className="font-amiri font-bold text-xl text-[#0F382C]">
                    {lang === 'ar' ? 'حالة الحماية والبنية الأمنية' : 'Production Security Posture'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={fetchSecurityAndR2Meta}
                  className="p-2 rounded-xl bg-[#FAF6EE] hover:bg-[#F2ECE1] text-[#0F382C] border border-[#E0D4C1]"
                  title={lang === 'ar' ? 'تحديث' : 'Refresh'}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingSessions ? 'animate-spin' : ''}`} />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-2xl bg-[#FAF6EE] border border-[#E8DCC9]">
                  <span className="text-[11px] text-[#8C6D3B] block">{lang === 'ar' ? 'تحديد معدل الطلبات خلف البروكسي' : 'Proxy Rate Limiting'}</span>
                  <span className="font-bold text-[#0F382C]">
                    {securityPosture?.trustProxy ? (lang === 'ar' ? 'مُفعّل (X-Forwarded-For)' : 'Active (Trust Proxy)') : '—'}
                  </span>
                </div>
                <div className="p-3 rounded-2xl bg-[#FAF6EE] border border-[#E8DCC9]">
                  <span className="text-[11px] text-[#8C6D3B] block">{lang === 'ar' ? 'حماية دخول الإدارة' : 'Login Lockout Policy'}</span>
                  <span className="font-bold text-[#0F382C]">
                    {securityPosture ? `${securityPosture.rateLimitMaxAttempts} ${lang === 'ar' ? 'محاولات /' : 'tries /'} ${securityPosture.rateLimitLockMinutes}m` : '5 tries / 5m'}
                  </span>
                </div>
                <div className="p-3 rounded-2xl bg-[#FAF6EE] border border-[#E8DCC9]">
                  <span className="text-[11px] text-[#8C6D3B] block">{lang === 'ar' ? 'فلترة أسئلة الطلاب (السبام)' : 'Q&A Moderation & Spam Guard'}</span>
                  <span className="font-bold text-emerald-700">
                    {lang === 'ar' ? `مُفعّل (${securityPosture?.questionLimitPer15Min ?? 5} أسئلة / 15د)` : `Active (${securityPosture?.questionLimitPer15Min ?? 5} / 15m)`}
                  </span>
                </div>
                <div className="p-3 rounded-2xl bg-[#FAF6EE] border border-[#E8DCC9]">
                  <span className="text-[11px] text-[#8C6D3B] block">{lang === 'ar' ? 'تخزين Cloudflare R2' : 'Cloudflare R2 Upload'}</span>
                  <span className={`font-bold ${r2Configured ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {r2Configured
                      ? (lang === 'ar' ? 'مهيأ ومتاح للرفع المباشر' : 'Configured for Direct Upload')
                      : (lang === 'ar' ? 'غير مهيأ في البيئة' : 'Env Vars Not Configured')}
                  </span>
                </div>
              </div>
            </div>

            {/* Active Admin Sessions */}
            <div className="bg-white rounded-3xl border border-[#EADFCB] p-6 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h4 className="font-amiri font-bold text-lg text-[#0F382C]">
                    {lang === 'ar' ? `الجلسات النشطة (${activeSessions.length})` : `Active Admin Sessions (${activeSessions.length})`}
                  </h4>
                  <p className="text-[11px] text-[#8C6D3B]">
                    {lang === 'ar' ? 'الأجهزة المسجل دخولها حالياً إلى لوحة التحكم' : 'Devices currently authenticated to the admin dashboard'}
                  </p>
                </div>

                {activeSessions.length > 1 && (
                  <button
                    type="button"
                    onClick={handleRevokeOtherSessions}
                    className="px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold transition"
                  >
                    {lang === 'ar' ? 'إنهاء الجلسات الأخرى' : 'Sign Out Others'}
                  </button>
                )}
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto">
                {activeSessions.length === 0 ? (
                  <p className="text-xs text-[#8C6D3B]">{lang === 'ar' ? 'لا توجد بيانات جلسات' : 'No session records'}</p>
                ) : (
                  activeSessions.map((sess, i) => (
                    <div
                      key={`${sess.idPrefix}-${i}`}
                      className={`p-3 rounded-xl border flex items-center justify-between gap-2 text-xs ${
                        sess.isCurrent ? 'bg-emerald-50/70 border-emerald-200' : 'bg-[#FDFBF7] border-[#E8DCC9]'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span dir="ltr" className="font-latin font-bold text-[#0F382C]">{sess.idPrefix}</span>
                          {sess.isCurrent && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-700 text-white text-[10px] font-bold">
                              {lang === 'ar' ? 'الجلسة الحالية' : 'Current'}
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-[#8C6D3B]">
                          {lang === 'ar' ? 'تنتهي:' : 'Expires:'} {new Date(sess.expiresAt).toLocaleString()}
                        </span>
                      </div>
                      <span className="text-[11px] font-bold text-[#0F382C]">{sess.username}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
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

            {/* Book Pricing / Distribution Mode (Free vs Paid) */}
            <div className="p-4 rounded-2xl bg-white border border-[#E0D4C1] space-y-3 font-readex text-xs">
              <div className="font-bold text-[#0F382C]">
                {lang === 'ar' ? 'نوع الإتاحة والتسعير' : 'Pricing & Distribution Mode'}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setEditingBook({ ...editingBook, isPaid: false })}
                  className={`px-3 py-2.5 rounded-xl border font-bold transition flex items-center justify-center gap-1.5 ${
                    !editingBook.isPaid
                      ? 'bg-[#0F382C] text-white border-[#0F382C] shadow-xs'
                      : 'bg-[#FAF6EE] text-[#0F382C] border-[#E0D4C1] hover:bg-[#F2ECE1]'
                  }`}
                >
                  <span>{lang === 'ar' ? 'مجاني (تحميل / استفسار)' : 'Free (PDF / Inquiry)'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setEditingBook({ ...editingBook, isPaid: true })}
                  className={`px-3 py-2.5 rounded-xl border font-bold transition flex items-center justify-center gap-1.5 ${
                    editingBook.isPaid
                      ? 'bg-[#C5A880] text-[#0F382C] border-[#C5A880] shadow-xs'
                      : 'bg-[#FAF6EE] text-[#0F382C] border-[#E0D4C1] hover:bg-[#F2ECE1]'
                  }`}
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>{lang === 'ar' ? 'مدفوع (طلب عبر واتساب)' : 'Paid (Order via WhatsApp)'}</span>
                </button>
              </div>

              {editingBook.isPaid ? (
                <div className="space-y-2.5 pt-1">
                  <div>
                    <label className="block text-[11px] text-[#8C6D3B] mb-1">
                      {lang === 'ar' ? 'السعر (اختياري - مثال: 5,000 NGN أو ٢٥ ريال)' : 'Price (Optional - e.g. 5,000 NGN or $15)'}
                    </label>
                    <input
                      type="text"
                      value={editingBook.price || ''}
                      onChange={e => setEditingBook({ ...editingBook, price: e.target.value })}
                      placeholder={lang === 'ar' ? 'مثال: 5,000 NGN' : 'e.g. 5,000 NGN'}
                      className="w-full px-3 py-2 rounded-xl border border-[#E0D4C1] text-xs font-readex bg-[#FDFBF7]"
                    />
                  </div>

                  <div className="p-3 rounded-xl bg-[#FAF3E3] border border-[#C5A880]/60 text-[11px] text-[#5C3D0E] flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <MessageCircle className="w-4 h-4 text-emerald-700 shrink-0" />
                      <span>
                        {lang === 'ar'
                          ? `سيظهر زر «طلب الكتاب» بدلاً من تحميل PDF، وتُرسل الطلبات مباشرة إلى رقم واتساب: ${profileForm.whatsapp || profile.whatsapp || 'غير محدد'}`
                          : `"Order Book" will replace PDF download; orders route straight to WhatsApp: ${profileForm.whatsapp || profile.whatsapp || 'Not set'}`}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsBookModalOpen(false);
                        setActiveTab('profile');
                      }}
                      className="underline font-bold text-[#0F382C] shrink-0"
                    >
                      {lang === 'ar' ? 'تعديل الرقم' : 'Edit Number'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(editingBook.hasPdf)}
                      onChange={e => setEditingBook({ ...editingBook, hasPdf: e.target.checked })}
                      className="rounded border-[#C5A880] text-[#0F382C]"
                    />
                    <span className="font-semibold text-[#0F382C]">{lang === 'ar' ? 'متاح للتحميل PDF' : 'Available as PDF'}</span>
                  </label>

                  {editingBook.hasPdf && (
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <label className="block text-[11px] text-[#8C6D3B]">
                          {lang === 'ar' ? 'رابط ملف الـ PDF أو رفعه إلى R2' : 'PDF Download URL or Upload to R2'}
                        </label>
                        <label
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer transition ${
                            uploadState?.target === 'book-pdf'
                              ? 'bg-[#0F382C] text-white opacity-80 pointer-events-none'
                              : 'bg-[#F4EFE6] hover:bg-[#E8DCC9] text-[#0F382C] border border-[#C5A880]/50'
                          }`}
                        >
                          {uploadState?.target === 'book-pdf' ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Upload className="w-3.5 h-3.5 text-[#8C6D3B]" />
                          )}
                          <span>
                            {uploadState?.target === 'book-pdf'
                              ? `${lang === 'ar' ? 'جاري الرفع...' : 'Uploading...'} ${uploadState.progress}%`
                              : (lang === 'ar' ? 'رفع PDF إلى R2' : 'Upload PDF to R2')}
                          </span>
                          <input
                            type="file"
                            accept=".pdf,application/pdf"
                            className="hidden"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              e.target.value = '';
                              if (!file) return;
                              try {
                                const uploaded = await uploadFileToR2(file, {
                                  kind: 'book',
                                  target: 'book-pdf',
                                });
                                setEditingBook(prev =>
                                  prev ? { ...prev, hasPdf: true, downloadUrl: uploaded.url } : prev
                                );
                                showBanner(
                                  'success',
                                  lang === 'ar' ? `تم رفع «${file.name}» إلى R2 بنجاح` : `Uploaded "${file.name}" to R2`
                                );
                              } catch (err) {
                                showBanner('error', (err as Error).message || 'PDF upload failed');
                              }
                            }}
                          />
                        </label>
                      </div>
                      <input
                        type="text"
                        dir="ltr"
                        value={editingBook.downloadUrl || ''}
                        onChange={e => setEditingBook({ ...editingBook, downloadUrl: e.target.value })}
                        placeholder="https://... or #"
                        className="w-full px-3 py-2 rounded-xl border border-[#E0D4C1] text-xs font-latin"
                      />
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-wrap gap-4 pt-2 border-t border-[#EADFCB]">
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
                <div className="flex items-center justify-between gap-1 mb-1">
                  <label className="block text-[11px] font-readex">{lang === 'ar' ? 'رابط متن الشرح (PDF)' : 'Matn PDF URL'}</label>
                  <label className="inline-flex items-center gap-1 text-[10px] font-readex font-bold text-[#0F382C] hover:underline cursor-pointer">
                    <Upload className="w-3 h-3 text-[#8C6D3B]" />
                    <span>
                      {uploadState?.target === 'audio-matn'
                        ? `${uploadState.progress}%`
                        : (lang === 'ar' ? 'رفع R2' : 'Upload')}
                    </span>
                    <input
                      type="file"
                      accept=".pdf,application/pdf"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        e.target.value = '';
                        if (!file) return;
                        try {
                          const uploaded = await uploadFileToR2(file, {
                            kind: 'matn',
                            prefix: editingAudio?.r2Prefix || editingAudio?.id || editingAudio?.title || 'general',
                            target: 'audio-matn',
                          });
                          setEditingAudio(prev => (prev ? { ...prev, matnPdfUrl: uploaded.url } : prev));
                          showBanner(
                            'success',
                            lang === 'ar' ? `تم رفع ملف المتن إلى R2` : `Matn PDF uploaded to R2`
                          );
                        } catch (err) {
                          showBanner('error', (err as Error).message || 'Matn upload failed');
                        }
                      }}
                    />
                  </label>
                </div>
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
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 font-readex">
                  <ListMusic className="w-4 h-4 text-[#0F382C]" />
                  <span className="text-xs sm:text-sm font-bold text-[#0F382C]">
                    {lang === 'ar' ? 'قائمة الدروس المسجلة' : 'Course Lessons Playlist'}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                    {(editingAudio.lessons || []).length} {lang === 'ar' ? 'دروس' : 'lessons'}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <label
                    className={`px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-300 text-[#0F382C] text-xs font-readex font-bold flex items-center gap-1.5 hover:bg-amber-100 cursor-pointer transition ${
                      uploadState?.target === 'audio-multi' ? 'opacity-70 pointer-events-none' : ''
                    }`}
                  >
                    {uploadState?.target === 'audio-multi' ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0F382C]" />
                    ) : (
                      <Upload className="w-3.5 h-3.5 text-[#8C6D3B]" />
                    )}
                    <span>
                      {uploadState?.target === 'audio-multi'
                        ? `${uploadState.label} (${uploadState.progress}%)`
                        : (lang === 'ar' ? 'رفع صوتيات إلى R2' : 'Upload Audios to R2')}
                    </span>
                    <input
                      type="file"
                      multiple
                      accept="audio/*,.mp3,.m4a,.aac,.ogg,.opus,.wav,.flac"
                      className="hidden"
                      onChange={async (e) => {
                        const files: File[] = e.target.files ? Array.from(e.target.files) : [];
                        e.target.value = '';
                        if (files.length === 0) return;
                        const sortedFiles = [...files].sort((a, b) =>
                          a.name.localeCompare(b.name, undefined, { numeric: true })
                        );
                        const addedLessons: AudioLesson[] = [];
                        for (let i = 0; i < sortedFiles.length; i++) {
                          const file = sortedFiles[i];
                          try {
                            const uploaded = await uploadFileToR2(file, {
                              kind: 'audio',
                              prefix: editingAudio?.r2Prefix || editingAudio?.id || editingAudio?.title || 'general',
                              target: 'audio-multi',
                              label: `${i + 1}/${sortedFiles.length}`,
                            });
                            const cleanTitle = file.name.replace(/\.[^.]+$/, '').replace(/[_]+/g, ' ').trim();
                            addedLessons.push({
                              id: `l-${Date.now()}-${i + 1}`,
                              title: cleanTitle || (lang === 'ar' ? `الدرس ${i + 1}` : `Lesson ${i + 1}`),
                              duration: '45:00',
                              audioUrl: uploaded.url,
                            });
                          } catch (err) {
                            showBanner('error', (err as Error).message || `Failed uploading ${file.name}`);
                            break;
                          }
                        }
                        if (addedLessons.length > 0) {
                          setEditingAudio(prev => {
                            if (!prev) return prev;
                            const nextLessons = [...(prev.lessons || []), ...addedLessons];
                            return {
                              ...prev,
                              lessons: nextLessons,
                              totalLessons: nextLessons.length,
                              audioUrl: nextLessons[0]?.audioUrl || prev.audioUrl || '',
                            };
                          });
                          showBanner(
                            'success',
                            lang === 'ar'
                              ? `تم رفع ${addedLessons.length} ملف صوتي إلى R2 وإضافتها للقائمة`
                              : `Uploaded ${addedLessons.length} audio file(s) to R2`
                          );
                        }
                      }}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowBulkLessonPaster(v => !v)}
                    className="px-3 py-1.5 rounded-xl bg-[#F4EFE6] text-[#0F382C] text-xs font-readex font-bold flex items-center gap-1 hover:bg-[#E8DCC9]"
                  >
                    <Link2 className="w-3.5 h-3.5 text-[#8C6D3B]" />
                    <span>{lang === 'ar' ? 'لصق روابط متعددة' : 'Bulk Paste URLs'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleAddLessonRow}
                    className="px-3 py-1.5 rounded-xl bg-[#0F382C] text-white text-xs font-readex font-bold flex items-center gap-1 hover:bg-[#164E3D]"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#DFC7A5]" />
                    <span>{lang === 'ar' ? 'إضافة درس' : 'Add Lesson'}</span>
                  </button>
                </div>
              </div>

              {showBulkLessonPaster && (
                <div className="p-3.5 rounded-xl bg-[#FAF6EE] border border-[#C5A880]/50 space-y-2">
                  <p className="text-[11px] font-readex text-[#0F382C]">
                    {lang === 'ar'
                      ? 'الصق رابط MP3 في كل سطر، أو بصيغة: عنوان الدرس | رابط الملف | المدة'
                      : 'Paste one MP3 URL per line, or format as: Lesson Title | MP3 URL | Duration'}
                  </p>
                  <textarea
                    rows={4}
                    dir="ltr"
                    value={bulkLessonLines}
                    onChange={e => setBulkLessonLines(e.target.value)}
                    placeholder={`https://media.example.com/courses/series/01.mp3\nالدرس الثاني | https://media.example.com/courses/series/02.mp3 | 42:00`}
                    className="w-full p-2.5 rounded-lg border border-[#E0D4C1] text-xs font-latin bg-white"
                  />
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowBulkLessonPaster(false)}
                      className="px-3 py-1.5 rounded-lg text-xs font-readex text-[#5A635E]"
                    >
                      {t('cancel')}
                    </button>
                    <button
                      type="button"
                      onClick={handleBulkAddLessonsFromText}
                      className="px-3.5 py-1.5 rounded-lg bg-[#0F382C] text-white text-xs font-readex font-bold"
                    >
                      {lang === 'ar' ? 'إدراج الدروس في القائمة' : 'Insert Lessons'}
                    </button>
                  </div>
                </div>
              )}

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
                        <label
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#F4EFE6] hover:bg-[#E8DCC9] text-[#0F382C] font-bold text-[10px] cursor-pointer"
                          title={lang === 'ar' ? 'رفع ملف صوتي لهذا الدرس عبر R2' : 'Upload audio to R2 for this lesson'}
                        >
                          {uploadState?.target === `lesson-${idx}` ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Upload className="w-3 h-3 text-[#8C6D3B]" />
                          )}
                          <span>
                            {uploadState?.target === `lesson-${idx}`
                              ? `${uploadState.progress}%`
                              : (lang === 'ar' ? 'رفع R2' : 'R2 Upload')}
                          </span>
                          <input
                            type="file"
                            accept="audio/*,.mp3,.m4a,.aac,.ogg,.opus,.wav,.flac"
                            className="hidden"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              e.target.value = '';
                              if (!file) return;
                              try {
                                const uploaded = await uploadFileToR2(file, {
                                  kind: 'audio',
                                  prefix: editingAudio?.r2Prefix || editingAudio?.id || editingAudio?.title || 'general',
                                  target: `lesson-${idx}`,
                                });
                                handleUpdateLessonField(idx, 'audioUrl', uploaded.url);
                                showBanner(
                                  'success',
                                  lang === 'ar' ? `تم رفع ملف الدرس #${idx + 1} إلى R2` : `Uploaded lesson #${idx + 1} audio to R2`
                                );
                              } catch (err) {
                                showBanner('error', (err as Error).message || 'Audio upload failed');
                              }
                            }}
                          />
                        </label>
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

            <div className="p-3.5 rounded-2xl bg-[#FAF6EE] border border-[#EADFCB] flex items-center justify-between gap-3">
              <label className="flex items-center gap-2.5 text-xs font-readex cursor-pointer text-[#0F382C] font-semibold">
                <input
                  type="checkbox"
                  checked={Boolean(editingPoem.featured)}
                  onChange={e => setEditingPoem({ ...editingPoem, featured: e.target.checked })}
                  className="w-4 h-4 rounded accent-[#0F382C]"
                />
                <span>
                  {lang === 'ar'
                    ? 'إبراز هذه المنظومة في الواجهة الرئيسية (تُعرض أبرز ٣ منظومات مختارة)'
                    : 'Feature this poem in the Home Hero spotlight (top 3 featured poems shown)'}
                </span>
              </label>
              <Star className={`w-4 h-4 shrink-0 ${editingPoem.featured ? 'fill-amber-500 text-amber-600' : 'text-[#C5A880]'}`} />
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
