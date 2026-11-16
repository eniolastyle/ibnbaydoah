import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';
import type { Article, ScienceCategory } from '../types';
import {
  Cloud,
  Download,
  RefreshCw,
  FileJson,
  FileSpreadsheet,
  Upload,
  CheckCircle2,
  AlertCircle,
  Database,
  Send,
  FolderSync,
  Eye,
  Sparkles,
} from 'lucide-react';

interface AdminBulkImportProps {
  categories: string[];
  authFetch: (url: string, options?: RequestInit) => Promise<Response>;
  onDataRefresh: () => void;
  showBanner: (type: 'success' | 'error', text: string) => void;
}

interface BulkStatus {
  storage: { engine: 'postgres' | 'json'; pgConfigured: boolean };
  r2: { configured: boolean; bucket: string | null; publicUrl: string | null };
  catalog: { totalCourses: number; mappedDriveCount: number; syncedCoursesCount: number };
}

type BulkSubTab = 'r2' | 'telegram' | 'universal';

const CSV_TEMPLATES: Record<'books' | 'audios' | 'poems' | 'articles', string> = {
  books: `title,subtitle,category,status,pages,year,description,downloadUrl,hasPdf,featured
"رسالة في أصول الإيمان","تحرير ميسر للمبتدئين","العقيدة والتوحيد","مخطوط",84,"١٤٤٦ هـ","شرح موجز لأركان الإيمان الستة","#",false,false`,
  audios: `courseId,r2Prefix,lessonTitle,duration,audioUrl
"audio-1","nawaqid-al-islam","الدرس الخامس: الناقض الخامس والسادس","47:30","https://media.yourdomain.com/courses/nawaqid-al-islam/05.mp3"`,
  poems: `title,meter,category,year,summary,versesText
"نونية في آداب الطلب","بحر الكامل","الأدب والأخلاق","١٤٤٦ هـ","نظم في الحث على الجد والمذاكرة","يَا طَالِبَ الْعِلْمِ الشَّرِيفِ تَأَدَّبِ ۞ وَاسْلُكْ سَبِيلَ السَّابِقِينَ الأَنْجَبِ\\nوَاخْلِصْ لِرَبِّكَ نِيَّةً مَحْمُودَةً ۞ تَظْفَرْ بِخَيْرٍ فِي الْمَعَادِ مُقَرَّبِ"`,
  articles: `title,type,category,date,tags,summary,content
"خاطرة رقم (٥١٣): الثبات على الجادة","خواطر ابن بيضاء","العقيدة والتوحيد","١٤٤٦/٠٥/٠١","خواطر ابن بيضاء|المنهج","الاستقامة على منهج السلف أعظم كرامة","كتبه أبو سعيد ابن بيضاء: إن أعظم ما يُعان به العبد في زمان الفتن لزوم غرز العلماء الراسخين."`,
};

const JSON_TEMPLATES: Record<'books' | 'audios' | 'poems' | 'articles', string> = {
  books: JSON.stringify(
    [
      {
        title: 'رسالة في أصول الإيمان',
        subtitle: 'تحرير ميسر للمبتدئين',
        category: 'العقيدة والتوحيد',
        status: 'مخطوط',
        pages: 84,
        year: '١٤٤٦ هـ',
        description: 'شرح موجز لأركان الإيمان الستة.',
        downloadUrl: '#',
        hasPdf: false,
        featured: false,
      },
    ],
    null,
    2
  ),
  audios: JSON.stringify(
    [
      {
        title: 'شرح نواقض الإسلام للشيخ محمد بن عبدالوهاب',
        r2Prefix: 'nawaqid-al-islam',
        category: 'العقيدة والتوحيد',
        levelId: 'beginner',
        status: 'مكتمل',
        lessons: [
          {
            title: 'الدرس الأول',
            duration: '45:00',
            audioUrl: 'https://media.yourdomain.com/courses/nawaqid-al-islam/01.mp3',
          },
        ],
      },
    ],
    null,
    2
  ),
  poems: JSON.stringify(
    [
      {
        title: 'نونية في آداب الطلب',
        meter: 'بحر الكامل',
        category: 'الأدب والأخلاق',
        year: '١٤٤٦ هـ',
        summary: 'نظم في آداب طالب العلم',
        versesText:
          'يَا طَالِبَ الْعِلْمِ الشَّرِيفِ تَأَدَّبِ ۞ وَاسْلُكْ سَبِيلَ السَّابِقِينَ الأَنْجَبِ',
      },
    ],
    null,
    2
  ),
  articles: JSON.stringify(
    [
      {
        title: 'خاطرة رقم (٥١٣): الثبات على الجادة',
        type: 'خواطر ابن بيضاء',
        category: 'العقيدة والتوحيد',
        date: '١٤٤٦/٠٥/٠١',
        tags: ['خواطر ابن بيضاء', 'المنهج'],
        content: 'كتبه أبو سعيد ابن بيضاء: إن أعظم ما يُعان به العبد لزوم العلم والعمل.',
      },
    ],
    null,
    2
  ),
};

export const AdminBulkImport: React.FC<AdminBulkImportProps> = ({
  categories,
  authFetch,
  onDataRefresh,
  showBanner,
}) => {
  const { lang, translateCategory } = useLanguage();
  const [subTab, setSubTab] = useState<BulkSubTab>('r2');
  const [status, setStatus] = useState<BulkStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);

  // R2 & Manifest state
  const [isSyncingR2, setIsSyncingR2] = useState(false);
  const [autoCreateUnmatched, setAutoCreateUnmatched] = useState(false);
  const [manifestPublicUrl, setManifestPublicUrl] = useState('');
  const [manifestText, setManifestText] = useState('');
  const [r2Result, setR2Result] = useState<any>(null);

  // Telegram state
  const [tgPayloadText, setTgPayloadText] = useState('');
  const [tgType, setTgType] = useState<Article['type']>('خواطر ابن بيضاء');
  const [tgCategory, setTgCategory] = useState<ScienceCategory>('الأدب والبلاغة واللغة');
  const [tgSkipExisting, setTgSkipExisting] = useState(true);
  const [isImportingTg, setIsImportingTg] = useState(false);
  const [tgResult, setTgResult] = useState<any>(null);

  // Universal CSV/JSON state
  const [uniEntity, setUniEntity] = useState<'books' | 'audios' | 'poems' | 'articles'>('books');
  const [uniFormat, setUniFormat] = useState<'json' | 'csv'>('csv');
  const [uniDataText, setUniDataText] = useState('');
  const [isImportingUni, setIsImportingUni] = useState(false);
  const [uniResult, setUniResult] = useState<any>(null);

  const loadStatus = useCallback(async () => {
    setLoadingStatus(true);
    try {
      const res = await authFetch('/api/bulk/status');
      if (res.ok) {
        const json = await res.json();
        setStatus(json);
        if (json?.r2?.publicUrl && !manifestPublicUrl) {
          setManifestPublicUrl(json.r2.publicUrl);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingStatus(false);
    }
  }, [authFetch, manifestPublicUrl]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const handleDownloadProtectedFile = async (url: string, filename: string) => {
    try {
      const res = await authFetch(url);
      if (!res.ok) {
        showBanner('error', lang === 'ar' ? 'تعذر تنزيل الملف' : 'Failed downloading file');
        return;
      }
      const blob = await res.blob();
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objUrl);
      showBanner('success', lang === 'ar' ? `تم تنزيل ${filename}` : `Downloaded ${filename}`);
    } catch (err) {
      console.error(err);
      showBanner('error', lang === 'ar' ? 'حدث خطأ أثناء التنزيل' : 'Download error');
    }
  };

  const handleScanR2Bucket = async (dryRun: boolean) => {
    setIsSyncingR2(true);
    setR2Result(null);
    try {
      const res = await authFetch('/api/bulk/r2-sync', {
        method: 'POST',
        body: JSON.stringify({ dryRun, autoCreateUnmatched }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setR2Result(json.data);
        if (!dryRun) {
          onDataRefresh();
          loadStatus();
          showBanner(
            'success',
            lang === 'ar'
              ? `تمت مزامنة ${json.data.syncedCoursesCount} دورة (${json.data.totalLessonsSynced} درساً) من R2`
              : `Synced ${json.data.syncedCoursesCount} courses (${json.data.totalLessonsSynced} lessons) from R2`
          );
        }
      } else {
        showBanner('error', json.message || 'R2 sync failed');
      }
    } catch {
      showBanner('error', lang === 'ar' ? 'تعذر الاتصال بخادم R2' : 'Error connecting to R2');
    } finally {
      setIsSyncingR2(false);
    }
  };

  const handleImportManifest = async (dryRun: boolean) => {
    if (!manifestText.trim()) {
      showBanner('error', lang === 'ar' ? 'يرجى رفع أو لصق ملف r2-manifest.json أولاً' : 'Please upload or paste r2-manifest.json first');
      return;
    }
    setIsSyncingR2(true);
    setR2Result(null);
    try {
      const res = await authFetch('/api/bulk/r2-manifest', {
        method: 'POST',
        body: JSON.stringify({
          entries: manifestText,
          publicBaseUrl: manifestPublicUrl,
          dryRun,
          autoCreateUnmatched,
        }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setR2Result(json.data);
        if (!dryRun) {
          onDataRefresh();
          loadStatus();
          showBanner(
            'success',
            lang === 'ar'
              ? `تم تحديث ${json.data.syncedCoursesCount} دورة (${json.data.totalLessonsSynced} درساً) من ملف Manifest`
              : `Synced ${json.data.syncedCoursesCount} courses (${json.data.totalLessonsSynced} lessons) from manifest`
          );
        }
      } else {
        showBanner('error', json.message || 'Manifest import failed');
      }
    } catch {
      showBanner('error', lang === 'ar' ? 'تعذر قراءة ملف JSON' : 'Invalid manifest JSON');
    } finally {
      setIsSyncingR2(false);
    }
  };

  const handleTelegramImport = async (dryRun: boolean) => {
    if (!tgPayloadText.trim()) {
      showBanner('error', lang === 'ar' ? 'يرجى اختيار ملف result.json أولاً' : 'Please load Telegram result.json first');
      return;
    }
    setIsImportingTg(true);
    setTgResult(null);
    try {
      const res = await authFetch('/api/bulk/telegram', {
        method: 'POST',
        body: JSON.stringify({
          payload: tgPayloadText,
          type: tgType,
          category: tgCategory,
          dryRun,
          skipExisting: tgSkipExisting,
        }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setTgResult(json.data);
        if (!dryRun) {
          onDataRefresh();
          showBanner(
            'success',
            lang === 'ar'
              ? `تم استيراد ${json.data.created} خاطرة جديدة بنجاح!`
              : `Imported ${json.data.created} new entries from Telegram!`
          );
        }
      } else {
        showBanner('error', json.message || 'Telegram import failed');
      }
    } catch {
      showBanner('error', lang === 'ar' ? 'ملف تيليجرام غير صالح' : 'Invalid Telegram JSON payload');
    } finally {
      setIsImportingTg(false);
    }
  };

  const handleUniversalImport = async (dryRun: boolean) => {
    if (!uniDataText.trim()) {
      showBanner('error', lang === 'ar' ? 'يرجى إدخال أو رفع بيانات الاستيراد' : 'Please paste or upload import data');
      return;
    }
    setIsImportingUni(true);
    setUniResult(null);
    try {
      const res = await authFetch('/api/bulk/import', {
        method: 'POST',
        body: JSON.stringify({
          entity: uniEntity,
          format: uniFormat,
          data: uniDataText,
          dryRun,
        }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setUniResult(json.data);
        if (!dryRun) {
          onDataRefresh();
          loadStatus();
          showBanner(
            'success',
            lang === 'ar'
              ? `اكتمل الاستيراد: أضيف ${json.data.created || 0} وتم تحديث ${json.data.updated || 0}`
              : `Import completed: ${json.data.created || 0} created, ${json.data.updated || 0} updated`
          );
        }
      } else {
        showBanner('error', json.message || 'Bulk import failed');
      }
    } catch {
      showBanner('error', lang === 'ar' ? 'خطأ أثناء تحليل البيانات' : 'Error parsing bulk payload');
    } finally {
      setIsImportingUni(false);
    }
  };

  const handleFileRead = (file: File | undefined, setter: (text: string) => void) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setter(String(reader.result || ''));
    };
    reader.readAsText(file, 'utf-8');
  };

  return (
    <div className="space-y-6">
      {/* Infrastructure & Sync Status Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-readex">
        <div className="p-4 rounded-2xl bg-white border border-[#EADFCB] shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] text-[#8C6D3B] font-semibold block">
              {lang === 'ar' ? 'محرك قاعدة البيانات' : 'Metadata Database'}
            </span>
            <span className="font-amiri font-bold text-xl text-[#0F382C]">
              {status?.storage.engine === 'postgres'
                ? 'PostgreSQL + Drizzle ORM'
                : lang === 'ar'
                ? 'وضع التطوير المحلي (PostgreSQL إلزامي في الإنتاج)'
                : 'Dev JSON Mode (PostgreSQL Required in Prod)'}
            </span>
          </div>
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              status?.storage.engine === 'postgres'
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-amber-100 text-amber-800'
            }`}
          >
            <Database className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-[#EADFCB] shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] text-[#8C6D3B] font-semibold block">
              {lang === 'ar' ? 'التخزين السحابي Cloudflare R2' : 'Cloudflare R2 Object Storage'}
            </span>
            <span className="font-amiri font-bold text-xl text-[#0F382C]">
              {status?.r2.configured
                ? `${lang === 'ar' ? 'متصل:' : 'Connected:'} ${status.r2.bucket}`
                : lang === 'ar'
                ? 'وضع Manifest (أو أضف مفاتيح R2)'
                : 'Manifest Mode (or set R2 env vars)'}
            </span>
          </div>
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              status?.r2.configured
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-[#F4EFE6] text-[#8C6D3B]'
            }`}
          >
            <Cloud className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-[#EADFCB] shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] text-[#8C6D3B] font-semibold block">
              {lang === 'ar' ? 'السلاسل المربوطة بـ Drive / R2' : 'Drive-Mapped / Synced Courses'}
            </span>
            <span className="font-amiri font-bold text-xl text-[#0F382C]">
              {status ? `${status.catalog.syncedCoursesCount} / ${status.catalog.totalCourses}` : '...'}
              <span className="text-xs font-readex text-[#8C6D3B] font-normal mx-1.5">
                ({status?.catalog.mappedDriveCount || 0} {lang === 'ar' ? 'مجلد Drive' : 'Drive folders'})
              </span>
            </span>
          </div>
          <button
            onClick={loadStatus}
            disabled={loadingStatus}
            className="w-10 h-10 rounded-xl bg-[#F4EFE6] hover:bg-[#E8DCC9] text-[#0F382C] flex items-center justify-center transition"
            title={lang === 'ar' ? 'تحديث الحالة' : 'Refresh status'}
          >
            <RefreshCw className={`w-4 h-4 ${loadingStatus ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Sub-navigation Pills */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-[#EADFCB]">
        <div className="flex flex-wrap gap-2 font-readex text-xs font-bold">
          <button
            onClick={() => setSubTab('r2')}
            className={`px-4 py-2.5 rounded-xl flex items-center gap-2 transition ${
              subTab === 'r2'
                ? 'bg-[#0F382C] text-white'
                : 'bg-[#FDFBF7] text-[#0F382C] hover:bg-[#F4EFE6]'
            }`}
          >
            <FolderSync className="w-4 h-4 text-[#DFC7A5]" />
            <span>{lang === 'ar' ? 'مزامنة Cloudflare R2 و rclone' : 'Cloudflare R2 & rclone Sync'}</span>
          </button>

          <button
            onClick={() => setSubTab('telegram')}
            className={`px-4 py-2.5 rounded-xl flex items-center gap-2 transition ${
              subTab === 'telegram'
                ? 'bg-[#0F382C] text-white'
                : 'bg-[#FDFBF7] text-[#0F382C] hover:bg-[#F4EFE6]'
            }`}
          >
            <Send className="w-4 h-4 text-[#DFC7A5]" />
            <span>{lang === 'ar' ? 'استيراد الخواطر من تيليجرام (JSON)' : 'Telegram Khawātir Importer'}</span>
          </button>

          <button
            onClick={() => setSubTab('universal')}
            className={`px-4 py-2.5 rounded-xl flex items-center gap-2 transition ${
              subTab === 'universal'
                ? 'bg-[#0F382C] text-white'
                : 'bg-[#FDFBF7] text-[#0F382C] hover:bg-[#F4EFE6]'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 text-[#DFC7A5]" />
            <span>{lang === 'ar' ? 'استيراد شامل (CSV / JSON) ونسخ احتياطي' : 'Bulk CSV/JSON & Full Backup'}</span>
          </button>
        </div>

        <button
          onClick={() =>
            handleDownloadProtectedFile(
              '/api/bulk/export',
              `ibn-baydoah-backup-${new Date().toISOString().slice(0, 10)}.json`
            )
          }
          className="px-4 py-2 rounded-xl bg-[#F4EFE6] hover:bg-[#E8DCC9] text-[#0F382C] text-xs font-readex font-bold flex items-center gap-1.5 border border-[#C5A880]/40"
        >
          <Download className="w-3.5 h-3.5 text-[#8C6D3B]" />
          <span>{lang === 'ar' ? 'تصدير نسخة احتياطية كاملة (JSON)' : 'Export Full JSON Backup'}</span>
        </button>
      </div>

      {/* ================= SUB-TAB 1: CLOUDFLARE R2 & RCLONE ================= */}
      {subTab === 'r2' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Step 1 Script + Direct R2 Scan (5 cols) */}
          <div className="lg:col-span-5 space-y-5">
            <div className="bg-white rounded-3xl border border-[#EADFCB] p-6 space-y-4 shadow-xs">
              <div className="flex items-center gap-2 border-b border-[#EADFCB] pb-3">
                <span className="w-6 h-6 rounded-full bg-[#0F382C] text-[#DFC7A5] text-xs font-bold flex items-center justify-center">
                  1
                </span>
                <h4 className="font-amiri font-bold text-xl text-[#0F382C]">
                  {lang === 'ar'
                    ? 'ترحيل مجلدات Google Drive إلى Cloudflare R2'
                    : 'Migrate 44 Google Drive Folders to R2'}
                </h4>
              </div>

              <p className="text-xs font-readex text-[#3A403C] leading-relaxed">
                {lang === 'ar'
                  ? 'حمّل السكربت الجاهز migrate-drive-to-r2.sh المبرمج بجميع معرفات المجلدات الـ 44 في فهرسكم. يقوم بنسخ الصوتيات وملفات PDF مباشرة من Google Drive إلى Cloudflare R2 بدون المرور بخادم الموقع، وينشئ ملف r2-manifest.json تلقائياً.'
                  : 'Download migrate-drive-to-r2.sh pre-mapped with all 44 Google Drive folder IDs from your catalog. It copies MP3s and PDFs directly from Google Drive to Cloudflare R2 and outputs r2-manifest.json.'}
              </p>

              <button
                onClick={() =>
                  handleDownloadProtectedFile('/api/bulk/rclone-script', 'migrate-drive-to-r2.sh')
                }
                className="w-full py-3 rounded-xl bg-[#C5A880] hover:bg-[#DFC7A5] text-[#0F382C] font-readex text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition"
              >
                <Download className="w-4 h-4" />
                <span>
                  {lang === 'ar'
                    ? 'تنزيل سكربت rclone المخصص (44 مجلداً)'
                    : 'Download migrate-drive-to-r2.sh (44 Folders)'}
                </span>
              </button>
            </div>

            <div className="bg-white rounded-3xl border border-[#EADFCB] p-6 space-y-4 shadow-xs">
              <div className="flex items-center gap-2 border-b border-[#EADFCB] pb-3">
                <span className="w-6 h-6 rounded-full bg-[#0F382C] text-[#DFC7A5] text-xs font-bold flex items-center justify-center">
                  2A
                </span>
                <h4 className="font-amiri font-bold text-xl text-[#0F382C]">
                  {lang === 'ar' ? 'المزامنة المباشرة من حاوية R2' : 'Direct R2 Bucket Scan'}
                </h4>
              </div>

              <p className="text-xs font-readex text-[#3A403C] leading-relaxed">
                {status?.r2.configured
                  ? lang === 'ar'
                    ? `حاوية R2 متصلة وجاهزة (${status.r2.bucket}). اضغط للفحص والمطابقة التلقائية لجميع الصوتيات وملفات المتون PDF.`
                    : `R2 bucket (${status.r2.bucket}) is connected. Scan to automatically match and populate all lessons & Matn PDFs.`
                  : lang === 'ar'
                  ? 'لم يتم ضبط متغيرات R2_ENDPOINT / R2_ACCESS_KEY_ID في الخادم بعد. يمكنك إما إضافتها في Coolify أو استخدام الخيار (2B) لرفع r2-manifest.json فوراً.'
                  : 'R2 API env vars are not set on this server yet. Add them in Coolify for one-click sync, or use Option 2B with r2-manifest.json.'}
              </p>

              <label className="flex items-center gap-2 text-xs font-readex text-[#0F382C] cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoCreateUnmatched}
                  onChange={e => setAutoCreateUnmatched(e.target.checked)}
                  className="rounded border-[#C5A880]"
                />
                <span>
                  {lang === 'ar'
                    ? 'إنشاء سلاسل جديدة تلقائياً لأي مجلد غير مطابق في الفهرس'
                    : 'Auto-create courses for unmatched R2 subfolders'}
                </span>
              </label>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleScanR2Bucket(true)}
                  disabled={isSyncingR2 || !status?.r2.configured}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-[#F4EFE6] text-[#0F382C] text-xs font-readex font-bold flex items-center justify-center gap-1.5 disabled:opacity-40"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>{lang === 'ar' ? 'معاينة أولاً' : 'Dry Run'}</span>
                </button>
                <button
                  onClick={() => handleScanR2Bucket(false)}
                  disabled={isSyncingR2 || !status?.r2.configured}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-[#0F382C] text-white text-xs font-readex font-bold flex items-center justify-center gap-1.5 disabled:opacity-40 hover:bg-[#164E3D]"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncingR2 ? 'animate-spin' : ''}`} />
                  <span>{lang === 'ar' ? 'فحص ومزامنة R2' : 'Sync R2 Now'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right: Step 2B rclone Manifest Upload (7 cols) */}
          <div className="lg:col-span-7 bg-white rounded-3xl border border-[#EADFCB] p-6 space-y-4 shadow-xs">
            <div className="flex items-center gap-2 border-b border-[#EADFCB] pb-3">
              <span className="w-6 h-6 rounded-full bg-[#0F382C] text-[#DFC7A5] text-xs font-bold flex items-center justify-center">
                2B
              </span>
              <h4 className="font-amiri font-bold text-xl text-[#0F382C]">
                {lang === 'ar'
                  ? 'أو استيراد ملف الفهرس r2-manifest.json (بدون مفاتيح API)'
                  : 'Or Import rclone lsjson Manifest (No R2 API Keys Needed)'}
              </h4>
            </div>

            <div className="p-3 rounded-xl bg-[#FAF6EE] border border-[#E8DCC9] text-[11px] font-latin text-[#0F382C] overflow-x-auto" dir="ltr">
              rclone lsjson -R --files-only r2:ibn-baydoah-media/courses &gt; r2-manifest.json
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-readex font-semibold mb-1">
                  {lang === 'ar' ? 'رابط النطاق العام لـ R2 CDN *' : 'Public R2 CDN Base URL *'}
                </label>
                <input
                  type="url"
                  dir="ltr"
                  value={manifestPublicUrl}
                  onChange={e => setManifestPublicUrl(e.target.value)}
                  placeholder="https://media.ibnbaydoah.com"
                  className="w-full px-3.5 py-2 rounded-xl border border-[#E0D4C1] text-xs font-latin bg-[#FDFBF7]"
                />
              </div>
              <div>
                <label className="block text-xs font-readex font-semibold mb-1">
                  {lang === 'ar' ? 'اختر ملف r2-manifest.json' : 'Upload r2-manifest.json'}
                </label>
                <label className="w-full px-3.5 py-2 rounded-xl border border-dashed border-[#C5A880] bg-[#FDFBF7] hover:bg-[#F4EFE6] text-xs font-readex text-[#0F382C] flex items-center justify-center gap-2 cursor-pointer">
                  <Upload className="w-3.5 h-3.5 text-[#8C6D3B]" />
                  <span>{lang === 'ar' ? 'اختيار ملف JSON' : 'Choose JSON file'}</span>
                  <input
                    type="file"
                    accept=".json,application/json"
                    className="hidden"
                    onChange={e => handleFileRead(e.target.files?.[0], setManifestText)}
                  />
                </label>
              </div>
            </div>

            <textarea
              rows={6}
              dir="ltr"
              value={manifestText}
              onChange={e => setManifestText(e.target.value)}
              placeholder='[{"Path":"nawaqid-al-islam/01.mp3","Size":123456,"IsDir":false}, ...]'
              className="w-full p-3 rounded-xl border border-[#E0D4C1] text-xs font-latin bg-[#FDFBF7]"
            />

            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                onClick={() => handleImportManifest(true)}
                disabled={isSyncingR2}
                className="px-4 py-2.5 rounded-xl bg-[#F4EFE6] text-[#0F382C] text-xs font-readex font-bold flex items-center gap-1.5"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>{lang === 'ar' ? 'معاينة المطابقة' : 'Preview Match'}</span>
              </button>
              <button
                onClick={() => handleImportManifest(false)}
                disabled={isSyncingR2}
                className="px-5 py-2.5 rounded-xl bg-[#0F382C] text-white text-xs font-readex font-bold flex items-center gap-1.5 hover:bg-[#164E3D]"
              >
                <FolderSync className="w-3.5 h-3.5 text-[#DFC7A5]" />
                <span>{lang === 'ar' ? 'استيراد وربط الدروس' : 'Import & Link Lessons'}</span>
              </button>
            </div>

            {r2Result && (
              <div className="p-4 rounded-2xl bg-[#FAF6EE] border border-[#C5A880]/50 space-y-2 text-xs font-readex">
                <div className="flex items-center gap-2 font-bold text-[#0F382C]">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                  <span>
                    {r2Result.dryRun
                      ? lang === 'ar'
                        ? 'نتائج المعاينة (لم يتم الحفظ بعد):'
                        : 'Dry-Run Preview (Not saved yet):'
                      : lang === 'ar'
                      ? 'تمت المزامنة بنجاح:'
                      : 'Sync Complete:'}{' '}
                    {r2Result.syncedCoursesCount} {lang === 'ar' ? 'سلاسل' : 'courses'} •{' '}
                    {r2Result.totalLessonsSynced} {lang === 'ar' ? 'درساً' : 'lessons'}
                  </span>
                </div>
                {Array.isArray(r2Result.matchedDetails) && r2Result.matchedDetails.length > 0 && (
                  <div className="max-h-40 overflow-y-auto space-y-1 pt-1">
                    {r2Result.matchedDetails.map((m: any) => (
                      <div
                        key={m.courseId}
                        className="flex items-center justify-between p-2 rounded-lg bg-white border border-[#E8DCC9]"
                      >
                        <span className="font-semibold text-[#0F382C]">{m.title}</span>
                        <span className="text-[#8C6D3B]">
                          {m.lessonCount} {lang === 'ar' ? 'دروس' : 'lessons'}
                          {m.hasMatnPdf ? ' + PDF' : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {Array.isArray(r2Result.unmatchedPrefixes) && r2Result.unmatchedPrefixes.length > 0 && (
                  <p className="text-[11px] text-amber-800 flex items-center gap-1 pt-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      {lang === 'ar' ? 'مجلدات غير مطابقة:' : 'Unmatched folders:'}{' '}
                      {r2Result.unmatchedPrefixes.map((u: any) => u.r2Prefix).join(', ')}
                    </span>
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= SUB-TAB 2: TELEGRAM RESULT.JSON IMPORTER ================= */}
      {subTab === 'telegram' && (
        <div className="bg-white rounded-3xl border border-[#EADFCB] p-6 sm:p-8 space-y-5 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#EADFCB] pb-4">
            <div>
              <h4 className="font-amiri font-bold text-2xl text-[#0F382C] flex items-center gap-2">
                <Send className="w-5 h-5 text-[#A58455]" />
                <span>
                  {lang === 'ar'
                    ? 'استيراد خواطر ابن بيضاء (+٥٠٠ خاطرة) من تيليجرام'
                    : 'Import 500+ Khawātir from Telegram Desktop Export'}
                </span>
              </h4>
              <p className="text-xs font-readex text-[#5A635E] mt-1">
                {lang === 'ar'
                  ? 'افتح قناة الخواطر في Telegram Desktop ← قائمة (⋮) ← Export Chat History ← اختر صيغة JSON (بدون وسائط للسرعة) ← ارفع ملف result.json هنا.'
                  : 'Open the Khawātir channel in Telegram Desktop -> Menu (⋮) -> Export Chat History -> Format: JSON -> Upload result.json here.'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-readex font-semibold mb-1">
                {lang === 'ar' ? 'التصنيف الأدبي' : 'Article Type'}
              </label>
              <select
                value={tgType}
                onChange={e => setTgType(e.target.value as Article['type'])}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E0D4C1] text-xs font-readex bg-[#FDFBF7]"
              >
                <option value="خواطر ابن بيضاء">خواطر ابن بيضاء</option>
                <option value="مقال عقدي">مقال عقدي</option>
                <option value="مقال لغوي">مقال لغوي</option>
                <option value="بحث أكاديمي">بحث أكاديمي</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-readex font-semibold mb-1">
                {lang === 'ar' ? 'الفن العلمي الافتراضي' : 'Default Discipline'}
              </label>
              <select
                value={tgCategory}
                onChange={e => setTgCategory(e.target.value as ScienceCategory)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E0D4C1] text-xs font-readex bg-[#FDFBF7]"
              >
                {categories.map(c => (
                  <option key={c} value={c}>
                    {translateCategory(c)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-readex font-semibold mb-1">
                {lang === 'ar' ? 'رفع ملف result.json' : 'Upload result.json'}
              </label>
              <label className="w-full px-3.5 py-2.5 rounded-xl border border-dashed border-[#C5A880] bg-[#FDFBF7] hover:bg-[#F4EFE6] text-xs font-readex text-[#0F382C] flex items-center justify-center gap-2 cursor-pointer">
                <FileJson className="w-4 h-4 text-[#8C6D3B]" />
                <span>{lang === 'ar' ? 'اختر ملف تيليجرام JSON' : 'Choose result.json'}</span>
                <input
                  type="file"
                  accept=".json,application/json"
                  className="hidden"
                  onChange={e => handleFileRead(e.target.files?.[0], setTgPayloadText)}
                />
              </label>
            </div>
          </div>

          <textarea
            rows={6}
            dir="ltr"
            value={tgPayloadText}
            onChange={e => setTgPayloadText(e.target.value)}
            placeholder='{"name": "خواطر ابن بيضاء", "messages": [ ... ]}'
            className="w-full p-3.5 rounded-xl border border-[#E0D4C1] text-xs font-latin bg-[#FDFBF7]"
          />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-xs font-readex text-[#0F382C] cursor-pointer">
              <input
                type="checkbox"
                checked={tgSkipExisting}
                onChange={e => setTgSkipExisting(e.target.checked)}
                className="rounded border-[#C5A880]"
              />
              <span>
                {lang === 'ar'
                  ? 'تخطي الخواطر المكررة الموجودة مسبقاً في قاعدة البيانات'
                  : 'Skip duplicate reflections already present in database'}
              </span>
            </label>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleTelegramImport(true)}
                disabled={isImportingTg}
                className="px-4 py-2.5 rounded-xl bg-[#F4EFE6] text-[#0F382C] text-xs font-readex font-bold flex items-center gap-1.5"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>{lang === 'ar' ? 'معاينة وتحليل' : 'Dry Run Preview'}</span>
              </button>
              <button
                onClick={() => handleTelegramImport(false)}
                disabled={isImportingTg}
                className="px-5 py-2.5 rounded-xl bg-[#0F382C] text-white text-xs font-readex font-bold flex items-center gap-1.5 hover:bg-[#164E3D]"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#DFC7A5]" />
                <span>{lang === 'ar' ? 'استيراد الخواطر الآن' : 'Import Reflections'}</span>
              </button>
            </div>
          </div>

          {tgResult && (
            <div className="p-4 rounded-2xl bg-[#FAF6EE] border border-[#C5A880]/50 space-y-2 text-xs font-readex">
              <div className="font-bold text-[#0F382C]">
                {tgResult.dryRun
                  ? lang === 'ar'
                    ? `نتيجة الفحص: ${tgResult.totalMessagesScanned} رسالة ← ${tgResult.validArticlesCount} خاطرة صالحة (${tgResult.newCount} جديدة، ${tgResult.duplicateCount} مكررة)`
                    : `Scan Result: ${tgResult.totalMessagesScanned} messages -> ${tgResult.validArticlesCount} valid (${tgResult.newCount} new, ${tgResult.duplicateCount} duplicates)`
                  : lang === 'ar'
                  ? `تم الاستيراد بنجاح: أضيف ${tgResult.created} • تم تحديث ${tgResult.updated} • تم تخطي ${tgResult.skipped}`
                  : `Import Complete: ${tgResult.created} created • ${tgResult.updated} updated • ${tgResult.skipped} skipped`}
              </div>
              {Array.isArray(tgResult.preview) && tgResult.preview.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  {tgResult.preview.map((item: any, idx: number) => (
                    <div key={idx} className="p-2.5 rounded-xl bg-white border border-[#E8DCC9]">
                      <div className="font-amiri font-bold text-base text-[#0F382C]">{item.title}</div>
                      <div className="text-[11px] text-[#5A635E] line-clamp-1">{item.summary}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ================= SUB-TAB 3: UNIVERSAL CSV / JSON IMPORTER ================= */}
      {subTab === 'universal' && (
        <div className="bg-white rounded-3xl border border-[#EADFCB] p-6 sm:p-8 space-y-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#EADFCB] pb-4">
            <div>
              <h4 className="font-amiri font-bold text-2xl text-[#0F382C]">
                {lang === 'ar'
                  ? 'المستورد الشامل للبيانات (CSV / JSON)'
                  : 'Universal CSV & JSON Bulk Importer'}
              </h4>
              <p className="text-xs font-readex text-[#5A635E]">
                {lang === 'ar'
                  ? 'استيراد أو تحديث عشرات الكتب أو المنظومات (بصيغة ۞) أو الدروس دفعة واحدة.'
                  : 'Batch-import or update Books, Audio Courses/Lessons, Didactic Poems (۞ format), or Articles.'}
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setUniDataText(
                  uniFormat === 'csv' ? CSV_TEMPLATES[uniEntity] : JSON_TEMPLATES[uniEntity]
                )
              }
              className="px-3.5 py-2 rounded-xl bg-[#F4EFE6] hover:bg-[#E8DCC9] text-[#0F382C] text-xs font-readex font-bold shrink-0"
            >
              {lang === 'ar' ? 'تعبئة نموذج إرشادي' : 'Load Sample Template'}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-readex font-semibold mb-1">
                {lang === 'ar' ? 'القسم المستهدف' : 'Target Collection'}
              </label>
              <select
                value={uniEntity}
                onChange={e => setUniEntity(e.target.value as any)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E0D4C1] text-xs font-readex bg-[#FDFBF7]"
              >
                <option value="books">{lang === 'ar' ? 'المؤلفات والكتب (Books)' : 'Books & Treatises'}</option>
                <option value="audios">{lang === 'ar' ? 'الشروح والدروس (Audios)' : 'Audio Courses / Lessons'}</option>
                <option value="poems">{lang === 'ar' ? 'المنظومات الشعرية (Poems)' : 'Poems & Diwan'}</option>
                <option value="articles">{lang === 'ar' ? 'الخواطر والمقالات (Articles)' : 'Articles & Reflections'}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-readex font-semibold mb-1">
                {lang === 'ar' ? 'صيغة الملف' : 'Data Format'}
              </label>
              <select
                value={uniFormat}
                onChange={e => setUniFormat(e.target.value as 'json' | 'csv')}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E0D4C1] text-xs font-readex bg-[#FDFBF7]"
              >
                <option value="csv">CSV (Excel / Google Sheets UTF-8)</option>
                <option value="json">JSON Array</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-readex font-semibold mb-1">
                {lang === 'ar' ? 'رفع ملف البيانات' : 'Upload CSV/JSON File'}
              </label>
              <label className="w-full px-3.5 py-2.5 rounded-xl border border-dashed border-[#C5A880] bg-[#FDFBF7] hover:bg-[#F4EFE6] text-xs font-readex text-[#0F382C] flex items-center justify-center gap-2 cursor-pointer">
                <Upload className="w-4 h-4 text-[#8C6D3B]" />
                <span>{lang === 'ar' ? 'اختيار ملف' : 'Choose file'}</span>
                <input
                  type="file"
                  accept=".csv,.json,text/csv,application/json"
                  className="hidden"
                  onChange={e => handleFileRead(e.target.files?.[0], setUniDataText)}
                />
              </label>
            </div>
          </div>

          <textarea
            rows={8}
            dir="ltr"
            value={uniDataText}
            onChange={e => setUniDataText(e.target.value)}
            placeholder={
              uniFormat === 'csv'
                ? 'Paste CSV rows with header line here, or click "Load Sample Template"...'
                : 'Paste JSON array here, or click "Load Sample Template"...'
            }
            className="w-full p-3.5 rounded-xl border border-[#E0D4C1] text-xs font-latin bg-[#FDFBF7]"
          />

          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              onClick={() => handleUniversalImport(true)}
              disabled={isImportingUni}
              className="px-4 py-2.5 rounded-xl bg-[#F4EFE6] text-[#0F382C] text-xs font-readex font-bold flex items-center gap-1.5"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>{lang === 'ar' ? 'معاينة أولاً' : 'Dry Run'}</span>
            </button>
            <button
              onClick={() => handleUniversalImport(false)}
              disabled={isImportingUni}
              className="px-5 py-2.5 rounded-xl bg-[#0F382C] text-white text-xs font-readex font-bold flex items-center gap-1.5 hover:bg-[#164E3D]"
            >
              <Upload className="w-3.5 h-3.5 text-[#DFC7A5]" />
              <span>{lang === 'ar' ? 'بدء الاستيراد' : 'Commit Import'}</span>
            </button>
          </div>

          {uniResult && (
            <div className="p-4 rounded-2xl bg-[#FAF6EE] border border-[#C5A880]/50 text-xs font-readex space-y-1">
              <div className="font-bold text-[#0F382C]">
                {uniResult.dryRun
                  ? lang === 'ar'
                    ? `تم التعرف على ${uniResult.count} سجل جاهز للاستيراد.`
                    : `Validated ${uniResult.count} records ready for import.`
                  : lang === 'ar'
                  ? `اكتمل الاستيراد: الإجمالي ${uniResult.count} • أضيف ${uniResult.created || 0} • تم تحديث ${uniResult.updated || 0}`
                  : `Import Complete: ${uniResult.count} total • ${uniResult.created || 0} created • ${uniResult.updated || 0} updated`}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
