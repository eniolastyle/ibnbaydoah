import 'dotenv/config';
import express from 'express';
import http from 'http';
import crypto from 'crypto';
import fs from 'fs';
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
  uploadFileToR2,
} from './server/bulk.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const nginxConflict = Boolean(process.env.NGINX_PORT && process.env.PORT === process.env.NGINX_PORT);
const PORT = nginxConflict
  ? Number(process.env.DEFAULT_APP_PORT) || 3000
  : Number(process.env.PORT) || 3000;

// Trust first reverse proxy (Coolify / Traefik / Nginx) so req.ip reflects real visitor IP
app.set('trust proxy', 1);

app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

app.use(express.json({ limit: '25mb' }));

// In-memory rate limiting against brute-force login & Q&A spam
const loginAttempts = new Map<string, { count: number; lockedUntil: number }>();
const questionSubmissions = new Map<string, number[]>();
const articleViewDedupe = new Map<string, number>();
const QUESTION_WINDOW_MS = 15 * 60 * 1000;
const QUESTION_MAX_PER_WINDOW = 5;
const ARTICLE_VIEW_WINDOW_MS = 5 * 60 * 1000;

function getClientIp(req: express.Request): string {
  return req.ip || req.socket.remoteAddress || 'unknown';
}

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
  if (attempt.lockedUntil > 0 && attempt.lockedUntil <= now) {
    attempt.count = 0;
    attempt.lockedUntil = 0;
  }
  attempt.count += 1;
  if (attempt.count >= 5) {
    attempt.lockedUntil = now + 5 * 60 * 1000;
  }
  loginAttempts.set(ip, attempt);
}

function resetAttempts(ip: string) {
  loginAttempts.delete(ip);
}

function checkQuestionRateLimit(ip: string): { allowed: boolean; remainingMinutes?: number } {
  const now = Date.now();
  const recent = (questionSubmissions.get(ip) || []).filter((ts) => now - ts < QUESTION_WINDOW_MS);
  if (recent.length >= QUESTION_MAX_PER_WINDOW) {
    const oldest = recent[0];
    const remainingMs = Math.max(1000, QUESTION_WINDOW_MS - (now - oldest));
    return { allowed: false, remainingMinutes: Math.ceil(remainingMs / 60000) };
  }
  recent.push(now);
  questionSubmissions.set(ip, recent);
  return { allowed: true };
}

function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
}

async function ensureAdminInitialized(): Promise<AdminAuthData> {
  const existing = await dataStore.getAdminAuth();
  if (existing && (existing.hash || !existing.isConfigured)) {
    return existing;
  }
  const username = process.env.ADMIN_USERNAME?.trim() || existing?.username || 'admin';
  const envPass = process.env.ADMIN_PASSWORD?.trim();
  const isProduction = process.env.NODE_ENV === 'production';

  if (envPass) {
    const salt = crypto.randomBytes(16).toString('hex');
    const created: AdminAuthData = {
      username,
      salt,
      hash: hashPassword(envPass, salt),
      isConfigured: true,
      updatedAt: new Date().toISOString(),
    };
    await dataStore.saveAdminAuth(created);
    return created;
  }

  // In production without ADMIN_PASSWORD, require explicit one-time setup via /api/auth/setup-password (never allow a known default)
  if (isProduction) {
    const unconfigured: AdminAuthData = {
      username,
      salt: '',
      hash: '',
      isConfigured: false,
      updatedAt: new Date().toISOString(),
    };
    await dataStore.saveAdminAuth(unconfigured);
    return unconfigured;
  }

  // Local development convenience only
  const salt = crypto.randomBytes(16).toString('hex');
  const created: AdminAuthData = {
    username,
    salt,
    hash: hashPassword('baydoah1446', salt),
    isConfigured: false,
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
    if (existing.isConfigured && existing.hash) {
      return res.status(403).json({
        success: false,
        message: 'تم إعداد كلمة مرور الإدارة مسبقاً، يرجى تسجيل الدخول / Admin password is already configured',
      });
    }

    const { newPassword, confirmPassword } = req.body;
    if (!newPassword || String(newPassword).length < 8) {
      return res.status(400).json({
        success: false,
        message: 'يجب أن لا تقل كلمة المرور عن 8 أحرف / Password must be at least 8 characters',
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
    const clientIp = getClientIp(req);
    const rateLimit = checkRateLimit(clientIp);

    if (!rateLimit.allowed) {
      return res.status(429).json({
        success: false,
        message: `تم حظر المحاولات مؤقتاً بسبب تكرار الأخطاء. يرجى الانتظار ${rateLimit.remainingSeconds} ثانية / Too many failed attempts. Try again in ${rateLimit.remainingSeconds}s.`,
      });
    }

    if (!adminAuth.hash || !adminAuth.salt) {
      return res.status(403).json({
        success: false,
        requiresSetup: true,
        message: 'يرجى إكمال إعداد كلمة مرور الإدارة أولاً / Please complete initial admin password setup first.',
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

app.get('/api/auth/sessions', requireAdmin, async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader ? authHeader.replace('Bearer ', '').trim() : '';
    const [sessions, adminAuth] = await Promise.all([
      dataStore.listActiveSessions(token),
      ensureAdminInitialized(),
    ]);
    res.json({
      success: true,
      data: {
        sessions,
        security: {
          trustProxy: true,
          rateLimitMaxAttempts: 5,
          rateLimitLockMinutes: 5,
          questionLimitPer15Min: QUESTION_MAX_PER_WINDOW,
          isConfigured: Boolean(adminAuth.isConfigured),
          updatedAt: adminAuth.updatedAt,
          storageEngine: dataStore.getEngineInfo().engine,
        },
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed loading security sessions' });
  }
});

app.post('/api/auth/revoke-other-sessions', requireAdmin, async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader ? authHeader.replace('Bearer ', '').trim() : '';
    const revoked = await dataStore.revokeOtherSessions(token);
    res.json({
      success: true,
      data: { revoked },
      message:
        revoked > 0
          ? `تم إنهاء ${revoked} جلسة أخرى بنجاح`
          : 'لا توجد جلسات أخرى نشطة',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed revoking sessions' });
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

    if (!newPassword || String(newPassword).length < 8) {
      return res.status(400).json({
        success: false,
        message: 'يجب أن لا تقل كلمة المرور الجديدة عن 8 أحرف / New password must be at least 8 characters',
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

    const authHeader = req.headers.authorization;
    const currentToken = authHeader ? authHeader.replace('Bearer ', '').trim() : '';
    if (currentToken) {
      await dataStore.revokeOtherSessions(currentToken);
    }

    return res.json({
      success: true,
      message: 'تم تحديث كلمة المرور وإنهاء جميع الجلسات الأخرى بنجاح / Password updated & other sessions revoked',
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
      isPaid: Boolean(req.body.isPaid),
      price: req.body.price ? String(req.body.price).trim() : '',
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
      featured: Boolean(req.body.featured),
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

app.post('/api/articles/:id/view', async (req, res) => {
  try {
    const id = String(req.params.id || '').trim();
    if (!id) {
      return res.status(400).json({ success: false, message: 'Missing article ID' });
    }

    const clientIp = getClientIp(req);
    const dedupeKey = `${clientIp}:${id}`;
    const now = Date.now();
    const lastViewedAt = articleViewDedupe.get(dedupeKey) || 0;

    if (now - lastViewedAt < ARTICLE_VIEW_WINDOW_MS) {
      const existingList = await dataStore.getArticles();
      const existing = existingList.find((a) => a.id === id);
      if (!existing) {
        return res.status(404).json({ success: false, message: 'المقال غير موجود' });
      }
      return res.json({
        success: true,
        incremented: false,
        data: { id: existing.id, views: existing.views },
      });
    }

    const updated = await dataStore.incrementArticleViews(id);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'المقال غير موجود' });
    }

    if (articleViewDedupe.size > 5000) {
      for (const [k, ts] of articleViewDedupe.entries()) {
        if (now - ts >= ARTICLE_VIEW_WINDOW_MS) {
          articleViewDedupe.delete(k);
        }
      }
    }
    articleViewDedupe.set(dedupeKey, now);

    return res.json({
      success: true,
      incremented: true,
      data: { id: updated.id, views: updated.views },
    });
  } catch (err) {
    console.error('Failed incrementing article views:', err);
    return res.status(500).json({ success: false, message: 'Failed recording article view' });
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

// ==================== STUDENT QUESTIONS (WITH MODERATION & SPAM GUARD) ====================

app.get('/api/questions', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader ? authHeader.replace('Bearer ', '').trim() : '';
    const adminSession = token ? await dataStore.getSession(token) : null;
    const list = await dataStore.getQuestions();

    // Public visitors only see answered & moderated questions; Admin sees all (pending + answered)
    const visibleList = adminSession
      ? list
      : list.filter((q) => Boolean(q.answer && q.answer.trim().length > 0));

    res.json({ success: true, data: visibleList });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed loading questions' });
  }
});

app.post('/api/questions', async (req, res) => {
  try {
    // 1. Silent honeypot trap for automated bots
    const trap = String(req.body?.website || req.body?.honeypot || '').trim();
    if (trap.length > 0) {
      return res.json({ success: true, pendingModeration: true });
    }

    // 2. Per-IP submission rate limit (proxy-aware)
    const clientIp = getClientIp(req);
    const rateCheck = checkQuestionRateLimit(clientIp);
    if (!rateCheck.allowed) {
      return res.status(429).json({
        success: false,
        message: `تم إرسال عدة أسئلة من نفس العنوان مؤخراً. يرجى الانتظار ${rateCheck.remainingMinutes} دقيقة قبل إرسال سؤال جديد / Too many submissions. Please try again in ${rateCheck.remainingMinutes} min.`,
      });
    }

    // 3. Content validation & spam link guard
    const rawQuestion = String(req.body?.question || '').trim();
    const rawStudentName = String(req.body?.studentName || '').trim().slice(0, 80);
    const rawCategory = String(req.body?.category || 'سؤال عام').trim().slice(0, 80);

    if (rawQuestion.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'يرجى كتابة نص السؤال بوضوح (8 أحرف على الأقل) / Question must be at least 8 characters.',
      });
    }
    if (rawQuestion.length > 2500) {
      return res.status(400).json({
        success: false,
        message: 'نص السؤال طويل جداً (الحد الأقصى 2500 حرف) / Question cannot exceed 2500 characters.',
      });
    }
    const urlMatches = rawQuestion.match(/https?:\/\//gi) || [];
    if (urlMatches.length > 2) {
      return res.status(400).json({
        success: false,
        message: 'لا يُسمح بإدراج روابط متعددة في نص السؤال / Multiple URLs are not allowed in questions.',
      });
    }

    const newQuestion = await dataStore.createQuestion({
      id: 'q-' + Date.now(),
      studentName: rawStudentName || 'طالب علم',
      question: rawQuestion,
      answer: null,
      date: new Date().toLocaleDateString('ar-SA'),
      category: rawCategory || 'سؤال عام',
    });
    res.json({ success: true, data: newQuestion, pendingModeration: true });
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

// ==================== DIRECT R2 UPLOAD FOR ADMIN MODALS ====================

app.post(
  '/api/r2/upload',
  requireAdmin,
  express.raw({ type: '*/*', limit: '210mb' }),
  async (req, res) => {
    req.setTimeout(10 * 60 * 1000);
    try {
      const kindRaw = String(req.query.kind || 'audio');
      const kind =
        kindRaw === 'book' || kindRaw === 'matn' || kindRaw === 'audio'
          ? kindRaw
          : 'audio';
      const rawFilename = String(
        req.query.filename || req.headers['x-file-name'] || `upload-${Date.now()}.bin`
      );
      let decodedFilename = rawFilename;
      try {
        decodedFilename = decodeURIComponent(rawFilename);
      } catch {
        // Use rawFilename as-is if not URI-encoded
      }
      const prefix = String(req.query.prefix || 'general');
      const bodyBuffer = Buffer.isBuffer(req.body) ? req.body : Buffer.from([]);
      const uploaded = await uploadFileToR2({
        buffer: bodyBuffer,
        originalFilename: decodedFilename,
        contentType: String(req.headers['content-type'] || 'application/octet-stream'),
        kind,
        prefix,
      });

      res.json({ success: true, data: uploaded });
    } catch (err) {
      res.status(400).json({
        success: false,
        message: (err as Error).message || 'R2 upload failed',
      });
    }
  }
);

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

app.post('/api/admin/batch', requireAdmin, async (req, res) => {
  try {
    const { entity: rawEntity, action, ids, patch } = req.body || {};
    const entity = rawEntity === 'poetry' ? 'poems' : rawEntity;
    if (!['books', 'audios', 'poems', 'articles', 'questions'].includes(entity)) {
      return res.status(400).json({ success: false, message: 'Invalid entity type' });
    }
    if (!['delete', 'update'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Invalid batch action' });
    }
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'No item IDs selected' });
    }

    const result = await dataStore.batchAction({ entity, action, ids, patch });
    res.json({ success: true, data: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: (err as Error).message || 'Batch action failed',
    });
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
  const prodMissingPg = process.env.NODE_ENV === 'production' && engine.engine !== 'postgres';
  res.status(prodMissingPg ? 503 : 200).json({
    status: prodMissingPg ? 'error' : 'ok',
    storageEngine: engine.engine,
    r2Configured: r2.configured,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

const PUBLIC_APP_URL = (process.env.APP_URL || 'https://ibnbaydoh.com.ng').replace(/\/+$/, '');

function escapeHtmlAttr(value: string): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeXml(value: string): string {
  return escapeHtmlAttr(value).replace(/'/g, '&apos;');
}

async function resolveRouteMeta(reqPath: string) {
  const cleanPath = (reqPath || '/').split('?')[0].replace(/\/+$/, '') || '/';
  const segments = cleanPath.split('/').filter(Boolean).map(s => {
    try {
      return decodeURIComponent(s);
    } catch {
      return s;
    }
  });

  const baseTitle = 'منصة أبي سعيد ابن بيضاء العلمية | Ibn Baydoah Platform';
  const defaultDesc =
    'المنصة العلمية الرسمية لطالب العلم والباحث في العلوم الشرعية واللغوية أبي سعيد مسعود بن محمود ابن بيضاء. تضم مؤلفاته وشروحاته الصوتية ومنظوماته وخواطره.';

  const sectionMeta: Record<string, { title: string; description: string }> = {
    library: {
      title: `المكتبة والمؤلفات العلمية | ${baseTitle}`,
      description: 'خزانة مؤلفات وتحقيقات الشيخ أبي سعيد ابن بيضاء في العقيدة والفقه والحديث واللغة.',
    },
    audios: {
      title: `الشروح الصوتية والمجالس العلمية | ${baseTitle}`,
      description: 'السلاسل الصوتية وشروح المتون العلمية المسجلة في مركز الإمام سيبويه والأكاديمية الافتراضية.',
    },
    poetry: {
      title: `الديوان والمنظومات التعليمية | ${baseTitle}`,
      description: 'منظومات الشيخ أبي سعيد ابن بيضاء في تعظيم العلم والفقه والحديث والرقائق.',
    },
    articles: {
      title: `خواطر ابن بيضاء والمقالات المحررة | ${baseTitle}`,
      description: 'سلسلة خواطر ابن بيضاء والبحوث الأكاديمية والمقالات العقدية واللغوية.',
    },
    schedule: {
      title: `الحلقات والجدول الأسبوعي | ${baseTitle}`,
      description: 'مواعيد الحلقات الحضورية بمركز الإمام سيبويه بإلورن والأكاديمية العلمية الافتراضية.',
    },
    contact: {
      title: `صندوق الأسئلة والاستفتاءات | ${baseTitle}`,
      description: 'اطرح سؤالك العلمي أو الشرعي على الشيخ أبي سعيد ابن بيضاء.',
    },
  };

  let title = baseTitle;
  let description = defaultDesc;
  const tab = segments[0]?.toLowerCase();
  const itemId = segments[1];

  if (tab && sectionMeta[tab]) {
    title = sectionMeta[tab].title;
    description = sectionMeta[tab].description;
  }

  try {
    if (tab === 'library' && itemId) {
      const books = await dataStore.getBooks();
      const book = books.find(b => b.id === itemId);
      if (book) {
        title = `${book.title} | المكتبة العلمية | ${baseTitle}`;
        description = book.description || sectionMeta.library.description;
      }
    } else if (tab === 'audios' && itemId) {
      const audios = await dataStore.getAudios();
      const course = audios.find(a => a.id === itemId);
      if (course) {
        title = `${course.title} | الشروح الصوتية | ${baseTitle}`;
        description = course.description || sectionMeta.audios.description;
      }
    } else if (tab === 'poetry' && itemId) {
      const poems = await dataStore.getPoems();
      const poem = poems.find(p => p.id === itemId);
      if (poem) {
        title = `${poem.title} | الديوان الشعري | ${baseTitle}`;
        description = poem.summary || sectionMeta.poetry.description;
      }
    } else if (tab === 'articles' && itemId) {
      const articles = await dataStore.getArticles();
      const art = articles.find(a => a.id === itemId);
      if (art) {
        title = `${art.title} | خواطر ومقالات | ${baseTitle}`;
        description = art.summary || art.content.slice(0, 160) || sectionMeta.articles.description;
      }
    }
  } catch {
    // Fallback cleanly to section metadata
  }

  return {
    title,
    description: description.slice(0, 200),
    url: `${PUBLIC_APP_URL}${cleanPath === '/' ? '/' : cleanPath}`,
  };
}

app.get('/robots.txt', (_req, res) => {
  res.type('text/plain').send(
    `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\n\nSitemap: ${PUBLIC_APP_URL}/sitemap.xml\n`
  );
});

app.get('/sitemap.xml', async (_req, res) => {
  try {
    const [books, audios, poems, articles] = await Promise.all([
      dataStore.getBooks(),
      dataStore.getAudios(),
      dataStore.getPoems(),
      dataStore.getArticles(),
    ]);
    const staticPaths = ['/', '/library', '/audios', '/poetry', '/articles', '/schedule', '/contact'];
    const dynamicPaths = [
      ...books.map(b => `/library/${encodeURIComponent(b.id)}`),
      ...audios.map(a => `/audios/${encodeURIComponent(a.id)}`),
      ...poems.map(p => `/poetry/${encodeURIComponent(p.id)}`),
      ...articles.map(a => `/articles/${encodeURIComponent(a.id)}`),
    ];
    const urls = [...staticPaths, ...dynamicPaths]
      .map(
        p =>
          `  <url>\n    <loc>${escapeXml(`${PUBLIC_APP_URL}${p}`)}</loc>\n  </url>`
      )
      .join('\n');
    res.type('application/xml').send(
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`
    );
  } catch {
    res.status(500).type('text/plain').send('Failed generating sitemap');
  }
});

// Ensure unknown /api/* requests always return JSON 404 instead of SPA HTML
app.all('/api/*', (_req, res) => {
  res.status(404).json({ success: false, message: 'API route not found' });
});

// Start server with Vite middleware in dev or static dist in production
async function startServer() {
  await dataStore.init();

  const isProduction = process.env.NODE_ENV === 'production';
  const httpServer = http.createServer(app);

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        ws: { server: httpServer },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    const indexHtmlPath = path.resolve(distPath, 'index.html');
    const cachedTemplate = fs.existsSync(indexHtmlPath)
      ? fs.readFileSync(indexHtmlPath, 'utf-8')
      : '';

    app.use(express.static(distPath, { index: false }));
    app.get('*', async (req, res) => {
      if (!cachedTemplate) {
        return res.sendFile(indexHtmlPath);
      }
      const meta = await resolveRouteMeta(req.path);
      const safeTitle = escapeHtmlAttr(meta.title);
      const safeDesc = escapeHtmlAttr(meta.description);
      const safeUrl = escapeHtmlAttr(meta.url);

      const html = cachedTemplate
        .replace(/<title>[\s\S]*?<\/title>/, `<title>${safeTitle}</title>`)
        .replace(
          /<meta name="description" content="[^"]*"\s*\/?>/,
          `<meta name="description" content="${safeDesc}" />`
        )
        .replace(
          /<link rel="canonical" href="[^"]*"\s*\/?>/,
          `<link rel="canonical" href="${safeUrl}" />`
        )
        .replace(
          /<meta property="og:title" content="[^"]*"\s*\/?>/,
          `<meta property="og:title" content="${safeTitle}" />`
        )
        .replace(
          /<meta property="og:description" content="[^"]*"\s*\/?>/,
          `<meta property="og:description" content="${safeDesc}" />`
        )
        .replace(
          /<meta property="og:url" content="[^"]*"\s*\/?>/,
          `<meta property="og:url" content="${safeUrl}" />`
        )
        .replace(
          /<meta name="twitter:title" content="[^"]*"\s*\/?>/,
          `<meta name="twitter:title" content="${safeTitle}" />`
        )
        .replace(
          /<meta name="twitter:description" content="[^"]*"\s*\/?>/,
          `<meta name="twitter:description" content="${safeDesc}" />`
        );

      res.type('html').send(html);
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(
      `[Ibn Baydoah Server] Running on http://0.0.0.0:${PORT} in ${isProduction ? 'production' : 'development'} mode (${dataStore.getEngineInfo().engine})`
    );
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
