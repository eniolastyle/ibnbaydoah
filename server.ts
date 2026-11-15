import 'dotenv/config';
import express from 'express';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import { dataStore, type AdminAuthData } from './src/db/store.ts';
import {
  generateRcloneMigrationScript,
  getR2Config,
  importRcloneManifest,
  importTelegramExport,
  importUniversalBulk,
  syncFromR2Bucket,
} from './server/bulk.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '25mb' }));

// In-memory rate limiting against brute-force attacks
const loginAttempts = new Map<string, { count: number; lockedUntil: number }>();

function checkRateLimit(ip: string): { allowed: boolean; remainingSeconds?: number } {
  const now = Date.now();
  const attempt = loginAttempts.get(ip);
  if (attempt && attempt.lockedUntil > now) {
    return { allowed: false, remainingSeconds: Math.ceil((attempt.lockedUntil - now) / 1000) };
  }
  return { allowed: true };
}

function recordFailedAttempt(ip: string) {
  const now = Date.now();
  const attempt = loginAttempts.get(ip) || { count: 0, lockedUntil: 0 };
  attempt.count += 1;
  if (attempt.count >= 5) {
    attempt.lockedUntil = now + 5 * 60 * 1000;
  }
  loginAttempts.set(ip, attempt);
}

function resetAttempts(ip: string) {
  loginAttempts.delete(ip);
}

function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
}

async function ensureAdminInitialized(): Promise<AdminAuthData> {
  const existing = await dataStore.getAdminAuth();
  if (existing && existing.hash && existing.salt) {
    return existing;
  }
  const salt = crypto.randomBytes(16).toString('hex');
  const envPass = process.env.ADMIN_PASSWORD?.trim();
  const initialPass = envPass || 'baydoah1446';
  const created: AdminAuthData = {
    username: process.env.ADMIN_USERNAME?.trim() || 'admin',
    salt,
    hash: hashPassword(initialPass, salt),
    isConfigured: Boolean(envPass),
    updatedAt: new Date().toISOString(),
  };
  await dataStore.saveAdminAuth(created);
  return created;
}

async function requireAdmin(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader ? authHeader.replace('Bearer ', '').trim() : '';
    const session = await dataStore.getSession(token);

    if (!session) {
      return res.status(401).json({
        success: false,
        message: 'انتهت جلسة الدخول أو غير مصرح بالوصول / Unauthorized or session expired',
      });
    }
    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    return res.status(500).json({ success: false, message: 'Internal authentication error' });
  }
}

// ==================== AUTHENTICATION ENDPOINTS ====================

app.get('/api/auth/status', async (_req, res) => {
  try {
    const adminAuth = await ensureAdminInitialized();
    res.json({
      success: true,
      isConfigured: Boolean(adminAuth.isConfigured),
      username: adminAuth.username || 'admin',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed checking auth status' });
  }
});

app.post('/api/auth/setup-password', async (req, res) => {
  try {
    const existing = await ensureAdminInitialized();
    const { newPassword, confirmPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'يجب أن لا تقل كلمة المرور عن 6 أحرف / Password must be at least 6 characters',
      });
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'كلمتا المرور غير متطابقتين / Passwords do not match',
      });
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const updated: AdminAuthData = {
      username: existing.username || 'admin',
      salt,
      hash: hashPassword(newPassword, salt),
      isConfigured: true,
      updatedAt: new Date().toISOString(),
    };
    await dataStore.saveAdminAuth(updated);

    const token = crypto.randomBytes(32).toString('hex');
    await dataStore.createSession(token, updated.username, Date.now() + 24 * 3600 * 1000);

    res.json({
      success: true,
      token,
      message: 'تم تعيين كلمة المرور الجديدة بنجاح',
      user: { username: updated.username, role: 'admin' },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Setup password error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const adminAuth = await ensureAdminInitialized();
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    const rateLimit = checkRateLimit(clientIp);

    if (!rateLimit.allowed) {
      return res.status(429).json({
        success: false,
        message: `تم حظر المحاولات مؤقتاً بسبب تكرار الأخطاء. يرجى الانتظار ${rateLimit.remainingSeconds} ثانية / Too many failed attempts. Try again in ${rateLimit.remainingSeconds}s.`,
      });
    }

    const { username, password } = req.body;
    const inputHash = hashPassword(password || '', adminAuth.salt);
    if (username === adminAuth.username && inputHash === adminAuth.hash) {
      resetAttempts(clientIp);
      const token = crypto.randomBytes(32).toString('hex');
      await dataStore.createSession(token, username, Date.now() + 24 * 3600 * 1000);

      return res.json({
        success: true,
        token,
        isConfigured: adminAuth.isConfigured,
        user: {
          username: adminAuth.username,
          role: 'admin',
          name: 'مدير منصة الشيخ أبي سعيد ابن بيضاء',
        },
      });
    }

    recordFailedAttempt(clientIp);
    return res.status(401).json({
      success: false,
      message: 'اسم المستخدم أو كلمة المرور غير صحيحة / Invalid username or password',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Login error' });
  }
});

app.get('/api/auth/verify', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader ? authHeader.replace('Bearer ', '').trim() : '';
    const session = await dataStore.getSession(token);

    if (session) {
      return res.json({
        success: true,
        valid: true,
        user: { username: session.username, role: 'admin' },
      });
    }
    return res.status(401).json({ success: false, valid: false });
  } catch (err) {
    console.error(err);
    return res.status(401).json({ success: false, valid: false });
  }
});

app.post('/api/auth/change-password', requireAdmin, async (req, res) => {
  try {
    const adminAuth = await ensureAdminInitialized();
    const { currentPassword, newPassword } = req.body;

    const currentHash = hashPassword(currentPassword || '', adminAuth.salt);
    if (currentHash !== adminAuth.hash) {
      return res.status(400).json({
        success: false,
        message: 'كلمة المرور الحالية غير صحيحة / Current password is incorrect',
      });
    }

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'يجب أن لا تقل كلمة المرور الجديدة عن 6 أحرف / New password must be at least 6 characters',
      });
    }

    const newSalt = crypto.randomBytes(16).toString('hex');
    await dataStore.saveAdminAuth({
      ...adminAuth,
      salt: newSalt,
      hash: hashPassword(newPassword, newSalt),
      isConfigured: true,
      updatedAt: new Date().toISOString(),
    });

    return res.json({
      success: true,
      message: 'تم تحديث كلمة المرور بنجاح / Password updated successfully',
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Failed updating password' });
  }
});

app.post('/api/auth/logout', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader ? authHeader.replace('Bearer ', '').trim() : '';
    if (token) {
      await dataStore.deleteSession(token);
    }
    res.json({ success: true, message: 'تم تسجيل الخروج' });
  } catch (err) {
    console.error(err);
    res.json({ success: true, message: 'تم تسجيل الخروج' });
  }
});

// ==================== PROFILE & CATEGORIES ====================

app.get('/api/profile', async (_req, res) => {
  try {
    const [profile, categories, levels] = await Promise.all([
      dataStore.getProfile(),
      dataStore.getCategories(),
      dataStore.getLevels(),
    ]);
    res.json({ success: true, data: profile, categories, levels });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed loading profile' });
  }
});

app.put('/api/profile', requireAdmin, async (req, res) => {
  try {
    const updated = await dataStore.updateProfile(req.body);
    res.json({ success: true, data: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed updating profile' });
  }
});

app.put('/api/categories', requireAdmin, async (req, res) => {
  try {
    if (Array.isArray(req.body.categories)) {
      const cleaned = req.body.categories.map((c: unknown) => String(c).trim()).filter(Boolean);
      const updated = await dataStore.updateCategories(cleaned);
      return res.json({ success: true, categories: updated });
    }
    return res.status(400).json({ success: false, message: 'Invalid categories array' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Failed updating categories' });
  }
});

// ==================== BOOKS ====================

app.get('/api/books', async (_req, res) => {
  try {
    const list = await dataStore.getBooks();
    res.json({ success: true, data: list });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed loading books' });
  }
});

app.post('/api/books', requireAdmin, async (req, res) => {
  try {
    const newBook = await dataStore.createBook({
      id: 'book-' + Date.now(),
      title: req.body.title || 'كتاب جديد',
      subtitle: req.body.subtitle || '',
      collaborative: Boolean(req.body.collaborative),
      collaborators: req.body.collaborators || '',
      status: req.body.status || 'مخطوط',
      category: req.body.category || 'العقيدة والتوحيد',
      pages: Number(req.body.pages) || 100,
      year: req.body.year || '١٤٤٦ هـ',
      description: req.body.description || '',
      downloadUrl: req.body.downloadUrl || '#',
      hasPdf: Boolean(req.body.hasPdf),
      featured: Boolean(req.body.featured),
    });
    res.json({ success: true, data: newBook });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed creating book' });
  }
});

app.put('/api/books/:id', requireAdmin, async (req, res) => {
  try {
    const updated = await dataStore.updateBook(String(req.params.id), req.body);
    if (updated) {
      res.json({ success: true, data: updated });
    } else {
      res.status(404).json({ success: false, message: 'الكتاب غير موجود' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed updating book' });
  }
});

app.delete('/api/books/:id', requireAdmin, async (req, res) => {
  try {
    await dataStore.deleteBook(String(req.params.id));
    res.json({ success: true, message: 'تم حذف الكتاب بنجاح' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed deleting book' });
  }
});

// ==================== AUDIOS ====================

app.get('/api/audios', async (_req, res) => {
  try {
    const list = await dataStore.getAudios();
    res.json({ success: true, data: list });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed loading audio courses' });
  }
});

app.post('/api/audios', requireAdmin, async (req, res) => {
  try {
    const incomingLessons = Array.isArray(req.body.lessons)
      ? req.body.lessons
          .filter((l: any) => l && (l.title || l.audioUrl))
          .map((l: any, idx: number) => ({
            id: l.id || `l-${Date.now()}-${idx}`,
            title: l.title || `الدرس ${idx + 1}`,
            duration: l.duration || '45:00',
            audioUrl: l.audioUrl || req.body.audioUrl || '',
          }))
      : [];

    const newAudio = await dataStore.createAudio({
      id: 'audio-' + Date.now(),
      title: req.body.title || 'شرح جديد',
      series: req.body.series || 'سلسلة عامة',
      category: req.body.category || 'العقيدة والتوحيد',
      level: req.body.level || 'مبتدئ',
      levelId: req.body.levelId || 'beginner',
      status: req.body.status || 'درس مستمر',
      totalLessons: incomingLessons.length,
      expectedLessons: req.body.expectedLessons ? Number(req.body.expectedLessons) : undefined,
      duration: req.body.duration || '٤٥ دقيقة لكل درس',
      description: req.body.description || '',
      audioUrl: incomingLessons[0]?.audioUrl || req.body.audioUrl || '',
      driveFolderId: req.body.driveFolderId || undefined,
      driveFolderUrl: req.body.driveFolderUrl || undefined,
      r2Prefix: req.body.r2Prefix || undefined,
      matnTitle: req.body.matnTitle || undefined,
      matnPdfUrl: req.body.matnPdfUrl || undefined,
      lessons: incomingLessons,
    });
    res.json({ success: true, data: newAudio });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed creating audio course' });
  }
});

app.put('/api/audios/:id', requireAdmin, async (req, res) => {
  try {
    const updated = await dataStore.updateAudio(String(req.params.id), req.body);
    if (updated) {
      res.json({ success: true, data: updated });
    } else {
      res.status(404).json({ success: false, message: 'الشرح الصوتي غير موجود' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed updating audio course' });
  }
});

app.delete('/api/audios/:id', requireAdmin, async (req, res) => {
  try {
    await dataStore.deleteAudio(String(req.params.id));
    res.json({ success: true, message: 'تم حذف الشرح بنجاح' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed deleting audio course' });
  }
});

// ==================== POETRY ====================

app.get('/api/poetry', async (_req, res) => {
  try {
    const list = await dataStore.getPoems();
    res.json({ success: true, data: list });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed loading poems' });
  }
});

app.post('/api/poetry', requireAdmin, async (req, res) => {
  try {
    const verses = Array.isArray(req.body.verses) ? req.body.verses : [];
    const newPoem = await dataStore.createPoem({
      id: 'poem-' + Date.now(),
      title: req.body.title || 'قصيدة جديدة',
      meter: req.body.meter || 'بحر الرجز',
      totalVerses: verses.length || Number(req.body.totalVerses) || 0,
      year: req.body.year || '١٤٤٦ هـ',
      category: req.body.category || 'الأدب والأخلاق',
      summary: req.body.summary || '',
      verses,
    });
    res.json({ success: true, data: newPoem });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed creating poem' });
  }
});

app.put('/api/poetry/:id', requireAdmin, async (req, res) => {
  try {
    const updated = await dataStore.updatePoem(String(req.params.id), req.body);
    if (updated) {
      res.json({ success: true, data: updated });
    } else {
      res.status(404).json({ success: false, message: 'القصيدة غير موجودة' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed updating poem' });
  }
});

app.delete('/api/poetry/:id', requireAdmin, async (req, res) => {
  try {
    await dataStore.deletePoem(String(req.params.id));
    res.json({ success: true, message: 'تم حذف القصيدة بنجاح' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed deleting poem' });
  }
});

// ==================== ARTICLES & KHAWATIR ====================

app.get('/api/articles', async (_req, res) => {
  try {
    const list = await dataStore.getArticles();
    res.json({ success: true, data: list });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed loading articles' });
  }
});

app.post('/api/articles', requireAdmin, async (req, res) => {
  try {
    const newArticle = await dataStore.createArticle({
      id: 'art-' + Date.now(),
      title: req.body.title || 'خاطرة جديدة',
      type: req.body.type || 'خواطر ابن بيضاء',
      category: req.body.category || 'الأدب والبلاغة واللغة',
      date: req.body.date || 'اليوم',
      views: 1,
      tags: Array.isArray(req.body.tags) ? req.body.tags : ['خواطر ابن بيضاء'],
      summary: req.body.summary || '',
      content: req.body.content || '',
    });
    res.json({ success: true, data: newArticle });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed creating article' });
  }
});

app.put('/api/articles/:id', requireAdmin, async (req, res) => {
  try {
    const updated = await dataStore.updateArticle(String(req.params.id), req.body);
    if (updated) {
      res.json({ success: true, data: updated });
    } else {
      res.status(404).json({ success: false, message: 'المقال غير موجود' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed updating article' });
  }
});

app.delete('/api/articles/:id', requireAdmin, async (req, res) => {
  try {
    await dataStore.deleteArticle(String(req.params.id));
    res.json({ success: true, message: 'تم حذف المقال بنجاح' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed deleting article' });
  }
});

// ==================== SCHEDULE ====================

app.get('/api/schedule', async (_req, res) => {
  try {
    const sched = await dataStore.getSchedule();
    res.json({ success: true, data: sched });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed loading schedule' });
  }
});

app.put('/api/schedule', requireAdmin, async (req, res) => {
  try {
    const updated = await dataStore.updateSchedule(req.body);
    res.json({ success: true, data: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed updating schedule' });
  }
});

// ==================== STUDENT QUESTIONS ====================

app.get('/api/questions', async (_req, res) => {
  try {
    const list = await dataStore.getQuestions();
    res.json({ success: true, data: list });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed loading questions' });
  }
});

app.post('/api/questions', async (req, res) => {
  try {
    const newQuestion = await dataStore.createQuestion({
      id: 'q-' + Date.now(),
      studentName: req.body.studentName || 'طالب علم',
      question: req.body.question || '',
      answer: req.body.answer || null,
      date: new Date().toLocaleDateString('ar-SA'),
      category: req.body.category || 'سؤال عام',
    });
    res.json({ success: true, data: newQuestion });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed submitting question' });
  }
});

app.put('/api/questions/:id', requireAdmin, async (req, res) => {
  try {
    const updated = await dataStore.updateQuestion(String(req.params.id), req.body);
    if (updated) {
      res.json({ success: true, data: updated });
    } else {
      res.status(404).json({ success: false, message: 'السؤال غير موجود' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed updating question' });
  }
});

app.delete('/api/questions/:id', requireAdmin, async (req, res) => {
  try {
    await dataStore.deleteQuestion(String(req.params.id));
    res.json({ success: true, message: 'تم حذف السؤال بنجاح' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed deleting question' });
  }
});

// ==================== BULK IMPORT, CLOUDFLARE R2 SYNC & TELEGRAM ====================

app.get('/api/bulk/status', requireAdmin, async (_req, res) => {
  try {
    const engineInfo = dataStore.getEngineInfo();
    const r2Cfg = getR2Config();
    const audios = await dataStore.getAudios();
    const mappedDriveCount = audios.filter((a) => a.driveFolderId && a.r2Prefix).length;
    const syncedCoursesCount = audios.filter((a) => (a.lessons?.length || 0) > 0).length;

    res.json({
      success: true,
      storage: engineInfo,
      r2: {
        configured: r2Cfg.configured,
        bucket: r2Cfg.bucket || null,
        publicUrl: r2Cfg.publicUrl || null,
      },
      catalog: {
        totalCourses: audios.length,
        mappedDriveCount,
        syncedCoursesCount,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed loading bulk status' });
  }
});

app.get('/api/bulk/rclone-script', requireAdmin, async (_req, res) => {
  try {
    const courses = await dataStore.getAudios();
    const script = generateRcloneMigrationScript(courses);
    res.setHeader('Content-Type', 'text/x-shellscript; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="migrate-drive-to-r2.sh"');
    res.send(script);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed generating rclone script' });
  }
});

app.post('/api/bulk/r2-sync', requireAdmin, async (req, res) => {
  try {
    const result = await syncFromR2Bucket({
      courseId: req.body?.courseId,
      dryRun: Boolean(req.body?.dryRun),
      autoCreateUnmatched: Boolean(req.body?.autoCreateUnmatched),
    });
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: (err as Error).message || 'R2 sync failed',
    });
  }
});

app.post('/api/bulk/r2-manifest', requireAdmin, async (req, res) => {
  try {
    const { entries, publicBaseUrl, dryRun, autoCreateUnmatched } = req.body;
    const parsedEntries = typeof entries === 'string' ? JSON.parse(entries) : entries;
    if (!Array.isArray(parsedEntries)) {
      return res.status(400).json({
        success: false,
        message: 'يجب أن يكون ملف r2-manifest.json مصفوفة JSON ناتجة عن rclone lsjson',
      });
    }
    const result = await importRcloneManifest({
      entries: parsedEntries,
      publicBaseUrl: String(publicBaseUrl || getR2Config().publicUrl || ''),
      dryRun: Boolean(dryRun),
      autoCreateUnmatched: Boolean(autoCreateUnmatched),
    });
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: (err as Error).message || 'Manifest import failed',
    });
  }
});

app.post('/api/bulk/telegram', requireAdmin, async (req, res) => {
  try {
    const { payload, type, category, dryRun, skipExisting } = req.body;
    const parsedPayload = typeof payload === 'string' ? JSON.parse(payload) : payload;
    const result = await importTelegramExport({
      payload: parsedPayload,
      type,
      category,
      dryRun: Boolean(dryRun),
      skipExisting: skipExisting !== false,
    });
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: (err as Error).message || 'Telegram import failed',
    });
  }
});

app.post('/api/bulk/import', requireAdmin, async (req, res) => {
  try {
    const { entity, format, data, dryRun } = req.body;
    if (!['books', 'audios', 'poems', 'articles'].includes(entity)) {
      return res.status(400).json({ success: false, message: 'Invalid target entity' });
    }
    if (!['json', 'csv'].includes(format)) {
      return res.status(400).json({ success: false, message: 'Invalid format (json or csv)' });
    }
    const result = await importUniversalBulk({
      entity,
      format,
      data,
      dryRun: Boolean(dryRun),
    });
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: (err as Error).message || 'Bulk import failed',
    });
  }
});

app.get('/api/bulk/export', requireAdmin, async (_req, res) => {
  try {
    const snapshot = await dataStore.exportAll();
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="ibn-baydoah-backup-${new Date().toISOString().slice(0, 10)}.json"`
    );
    res.send(JSON.stringify(snapshot, null, 2));
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Export failed' });
  }
});

// ==================== RESET, STATS & HEALTH ====================

app.post('/api/reset', requireAdmin, async (_req, res) => {
  const info = await dataStore.resetFromSeedFile();
  res.json({ success: true, storage: info, message: 'تم التحقق من سلامة البيانات' });
});

app.get('/api/stats', async (_req, res) => {
  try {
    const stats = await dataStore.getStats();
    res.json({ success: true, data: stats });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed loading stats' });
  }
});

app.get('/api/health', (_req, res) => {
  const engine = dataStore.getEngineInfo();
  const r2 = getR2Config();
  res.json({
    status: 'ok',
    storageEngine: engine.engine,
    r2Configured: r2.configured,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Start server with Vite middleware in dev or static dist in production
async function startServer() {
  await dataStore.init();

  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(
      `[Ibn Baydoah Server] Running on http://0.0.0.0:${PORT} in ${isProduction ? 'production' : 'development'} mode (${dataStore.getEngineInfo().engine})`
    );
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
