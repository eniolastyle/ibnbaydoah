import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const DB_PATH = path.resolve(__dirname, 'server/data/db.json');

app.use(express.json());

// In-memory data store with disk persistence
let dbData: any = null;

function loadDb() {
  try {
    if (fs.existsSync(DB_PATH)) {
      const raw = fs.readFileSync(DB_PATH, 'utf-8');
      dbData = JSON.parse(raw);
    } else {
      console.error('db.json not found at', DB_PATH);
      dbData = { profile: {}, categories: [], books: [], audios: [], poems: [], articles: [], schedule: {}, questions: [] };
    }
  } catch (err) {
    console.error('Error loading db.json:', err);
    dbData = { profile: {}, categories: [], books: [], audios: [], poems: [], articles: [], schedule: {}, questions: [] };
  }
}

function saveDb() {
  try {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DB_PATH, JSON.stringify(dbData, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving db.json:', err);
  }
}

// Initial load
loadDb();

import crypto from 'crypto';

// Authentication & Session Management with PBKDF2 and Rate-Limiting
interface AdminAuthData {
  username: string;
  salt: string;
  hash: string;
  isConfigured: boolean;
  updatedAt: string;
}

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
    // Lock for 5 minutes after 5 failed attempts
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

// Active session registry with 24-hour expiration
const activeSessions = new Map<string, { username: string; expiresAt: number }>();

function ensureAdminInitialized() {
  if (!dbData.adminAuth) {
    const salt = crypto.randomBytes(16).toString('hex');
    // Default initial setup seed (or env var if provided)
    const initialPass = process.env.ADMIN_PASSWORD || 'baydoah1446';
    dbData.adminAuth = {
      username: process.env.ADMIN_USERNAME || 'admin',
      salt,
      hash: hashPassword(initialPass, salt),
      isConfigured: false, // will prompt user to set their own secret password
      updatedAt: new Date().toISOString()
    } as AdminAuthData;
    saveDb();
  }
}

// Authentication endpoints
app.get('/api/auth/status', (_req, res) => {
  ensureAdminInitialized();
  res.json({
    success: true,
    isConfigured: Boolean(dbData.adminAuth?.isConfigured),
    username: dbData.adminAuth?.username || 'admin'
  });
});

app.post('/api/auth/setup-password', (req, res) => {
  ensureAdminInitialized();
  const { newPassword, confirmPassword } = req.body;
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ success: false, message: 'يجب أن لا تقل كلمة المرور عن 6 أحرف / Password must be at least 6 characters' });
  }
  if (newPassword !== confirmPassword) {
    return res.status(400).json({ success: false, message: 'كلمتا المرور غير متطابقتين / Passwords do not match' });
  }

  const salt = crypto.randomBytes(16).toString('hex');
  dbData.adminAuth = {
    username: dbData.adminAuth.username || 'admin',
    salt,
    hash: hashPassword(newPassword, salt),
    isConfigured: true,
    updatedAt: new Date().toISOString()
  };
  saveDb();

  const token = crypto.randomBytes(32).toString('hex');
  activeSessions.set(token, { username: dbData.adminAuth.username, expiresAt: Date.now() + 24 * 3600 * 1000 });

  res.json({
    success: true,
    token,
    message: 'تم تعيين كلمة المرور الجديدة بنجاح',
    user: { username: dbData.adminAuth.username, role: 'admin' }
  });
});

app.post('/api/auth/login', (req, res) => {
  ensureAdminInitialized();
  const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
  const rateLimit = checkRateLimit(clientIp);

  if (!rateLimit.allowed) {
    return res.status(429).json({
      success: false,
      message: `تم حظر المحاولات مؤقتاً بسبب تكرار الأخطاء. يرجى الانتظار ${rateLimit.remainingSeconds} ثانية / Too many failed attempts. Try again in ${rateLimit.remainingSeconds}s.`
    });
  }

  const { username, password } = req.body;
  const adminAuth = dbData.adminAuth as AdminAuthData;

  const inputHash = hashPassword(password || '', adminAuth.salt);
  if (username === adminAuth.username && inputHash === adminAuth.hash) {
    resetAttempts(clientIp);
    const token = crypto.randomBytes(32).toString('hex');
    activeSessions.set(token, { username, expiresAt: Date.now() + 24 * 3600 * 1000 });

    return res.json({
      success: true,
      token,
      isConfigured: adminAuth.isConfigured,
      user: {
        username: adminAuth.username,
        role: 'admin',
        name: 'مدير منصة الشيخ أبي سعيد ابن بيضاء'
      }
    });
  }

  recordFailedAttempt(clientIp);
  return res.status(401).json({ success: false, message: 'اسم المستخدم أو كلمة المرور غير صحيحة / Invalid username or password' });
});

app.get('/api/auth/verify', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader ? authHeader.replace('Bearer ', '') : '';
  const session = activeSessions.get(token);

  if (session && session.expiresAt > Date.now()) {
    return res.json({ success: true, valid: true, user: { username: session.username, role: 'admin' } });
  }

  if (session) {
    activeSessions.delete(token);
  }
  return res.status(401).json({ success: false, valid: false });
});

app.post('/api/auth/change-password', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader ? authHeader.replace('Bearer ', '') : '';
  const session = activeSessions.get(token);

  if (!session || session.expiresAt < Date.now()) {
    return res.status(401).json({ success: false, message: 'جلسة الدخول منتهية أو غير صالحة' });
  }

  const { currentPassword, newPassword } = req.body;
  const adminAuth = dbData.adminAuth as AdminAuthData;

  const currentHash = hashPassword(currentPassword || '', adminAuth.salt);
  if (currentHash !== adminAuth.hash) {
    return res.status(400).json({ success: false, message: 'كلمة المرور الحالية غير صحيحة / Current password is incorrect' });
  }

  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ success: false, message: 'يجب أن لا تقل كلمة المرور الجديدة عن 6 أحرف / New password must be at least 6 characters' });
  }

  const newSalt = crypto.randomBytes(16).toString('hex');
  dbData.adminAuth.salt = newSalt;
  dbData.adminAuth.hash = hashPassword(newPassword, newSalt);
  dbData.adminAuth.isConfigured = true;
  dbData.adminAuth.updatedAt = new Date().toISOString();
  saveDb();

  return res.json({ success: true, message: 'تم تحديث كلمة المرور بنجاح / Password updated successfully' });
});

app.post('/api/auth/logout', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader ? authHeader.replace('Bearer ', '') : '';
  if (token) {
    activeSessions.delete(token);
  }
  res.json({ success: true, message: 'تم تسجيل الخروج' });
});

// Profile endpoints
app.get('/api/profile', (req, res) => {
  res.json({ success: true, data: dbData.profile, categories: dbData.categories, levels: dbData.levels });
});

app.put('/api/profile', (req, res) => {
  dbData.profile = { ...dbData.profile, ...req.body };
  saveDb();
  res.json({ success: true, data: dbData.profile });
});

// Books endpoints
app.get('/api/books', (req, res) => {
  res.json({ success: true, data: dbData.books || [] });
});

app.post('/api/books', (req, res) => {
  const newBook = {
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
    featured: Boolean(req.body.featured)
  };
  dbData.books.unshift(newBook);
  saveDb();
  res.json({ success: true, data: newBook });
});

app.put('/api/books/:id', (req, res) => {
  const { id } = req.params;
  const index = dbData.books.findIndex((b: any) => b.id === id);
  if (index !== -1) {
    dbData.books[index] = { ...dbData.books[index], ...req.body, id };
    saveDb();
    res.json({ success: true, data: dbData.books[index] });
  } else {
    res.status(404).json({ success: false, message: 'الكتاب غير موجود' });
  }
});

app.delete('/api/books/:id', (req, res) => {
  const { id } = req.params;
  dbData.books = dbData.books.filter((b: any) => b.id !== id);
  saveDb();
  res.json({ success: true, message: 'تم حذف الكتاب بنجاح' });
});

// Audios endpoints
app.get('/api/audios', (req, res) => {
  res.json({ success: true, data: dbData.audios || [] });
});

app.post('/api/audios', (req, res) => {
  const newAudio = {
    id: 'audio-' + Date.now(),
    title: req.body.title || 'شرح جديد',
    series: req.body.series || 'سلسلة عامة',
    category: req.body.category || 'العقيدة والتوحيد',
    level: req.body.level || 'مبتدئ',
    levelId: req.body.levelId || 'beginner',
    status: req.body.status || 'درس مستمر',
    totalLessons: Number(req.body.totalLessons) || 1,
    duration: req.body.duration || '٤٥ دقيقة',
    description: req.body.description || '',
    audioUrl: req.body.audioUrl || 'https://ia800301.us.archive.org/15/items/Quran-Mishari-Rashid-al-Afasy/001.mp3',
    lessons: req.body.lessons || [
      { id: 'l-' + Date.now(), title: 'الدرس الأول', duration: '45:00', audioUrl: req.body.audioUrl || 'https://ia800301.us.archive.org/15/items/Quran-Mishari-Rashid-al-Afasy/001.mp3' }
    ]
  };
  dbData.audios.unshift(newAudio);
  saveDb();
  res.json({ success: true, data: newAudio });
});

app.put('/api/audios/:id', (req, res) => {
  const { id } = req.params;
  const index = dbData.audios.findIndex((a: any) => a.id === id);
  if (index !== -1) {
    dbData.audios[index] = { ...dbData.audios[index], ...req.body, id };
    saveDb();
    res.json({ success: true, data: dbData.audios[index] });
  } else {
    res.status(404).json({ success: false, message: 'الشرح الصوتي غير موجود' });
  }
});

app.delete('/api/audios/:id', (req, res) => {
  const { id } = req.params;
  dbData.audios = dbData.audios.filter((a: any) => a.id !== id);
  saveDb();
  res.json({ success: true, message: 'تم حذف الشرح بنجاح' });
});

// Poetry endpoints
app.get('/api/poetry', (req, res) => {
  res.json({ success: true, data: dbData.poems || [] });
});

app.post('/api/poetry', (req, res) => {
  const newPoem = {
    id: 'poem-' + Date.now(),
    title: req.body.title || 'قصيدة جديدة',
    meter: req.body.meter || 'بحر الرجز',
    totalVerses: Number(req.body.totalVerses) || (req.body.verses ? req.body.verses.length : 1),
    year: req.body.year || '١٤٤٦ هـ',
    category: req.body.category || 'الأدب والأخلاق',
    summary: req.body.summary || '',
    verses: req.body.verses || []
  };
  dbData.poems.unshift(newPoem);
  saveDb();
  res.json({ success: true, data: newPoem });
});

app.put('/api/poetry/:id', (req, res) => {
  const { id } = req.params;
  const index = dbData.poems.findIndex((p: any) => p.id === id);
  if (index !== -1) {
    dbData.poems[index] = { ...dbData.poems[index], ...req.body, id };
    saveDb();
    res.json({ success: true, data: dbData.poems[index] });
  } else {
    res.status(404).json({ success: false, message: 'القصيدة غير موجودة' });
  }
});

app.delete('/api/poetry/:id', (req, res) => {
  const { id } = req.params;
  dbData.poems = dbData.poems.filter((p: any) => p.id !== id);
  saveDb();
  res.json({ success: true, message: 'تم حذف القصيدة بنجاح' });
});

// Articles & Khawātir endpoints
app.get('/api/articles', (req, res) => {
  res.json({ success: true, data: dbData.articles || [] });
});

app.post('/api/articles', (req, res) => {
  const newArticle = {
    id: 'art-' + Date.now(),
    title: req.body.title || 'خاطرة جديدة',
    type: req.body.type || 'خواطر ابن بيضاء',
    category: req.body.category || 'الأدب والبلاغة واللغة',
    date: req.body.date || 'اليوم',
    views: 1,
    tags: req.body.tags || ['خواطر ابن بيضاء'],
    summary: req.body.summary || '',
    content: req.body.content || ''
  };
  dbData.articles.unshift(newArticle);
  saveDb();
  res.json({ success: true, data: newArticle });
});

app.put('/api/articles/:id', (req, res) => {
  const { id } = req.params;
  const index = dbData.articles.findIndex((a: any) => a.id === id);
  if (index !== -1) {
    dbData.articles[index] = { ...dbData.articles[index], ...req.body, id };
    saveDb();
    res.json({ success: true, data: dbData.articles[index] });
  } else {
    res.status(404).json({ success: false, message: 'المقال غير موجود' });
  }
});

app.delete('/api/articles/:id', (req, res) => {
  const { id } = req.params;
  dbData.articles = dbData.articles.filter((a: any) => a.id !== id);
  saveDb();
  res.json({ success: true, message: 'تم حذف المقال بنجاح' });
});

// Schedule endpoints
app.get('/api/schedule', (req, res) => {
  res.json({ success: true, data: dbData.schedule || {} });
});

app.put('/api/schedule', (req, res) => {
  dbData.schedule = { ...dbData.schedule, ...req.body };
  saveDb();
  res.json({ success: true, data: dbData.schedule });
});

// Student Questions Box endpoints
app.get('/api/questions', (req, res) => {
  res.json({ success: true, data: dbData.questions || [] });
});

app.post('/api/questions', (req, res) => {
  const newQuestion = {
    id: 'q-' + Date.now(),
    studentName: req.body.studentName || 'طالب علم',
    question: req.body.question || '',
    answer: req.body.answer || null,
    date: new Date().toLocaleDateString('ar-SA'),
    category: req.body.category || 'سؤال عام'
  };
  dbData.questions.unshift(newQuestion);
  saveDb();
  res.json({ success: true, data: newQuestion });
});

app.put('/api/questions/:id', (req, res) => {
  const { id } = req.params;
  const index = dbData.questions.findIndex((q: any) => q.id === id);
  if (index !== -1) {
    dbData.questions[index] = { ...dbData.questions[index], ...req.body, id };
    saveDb();
    res.json({ success: true, data: dbData.questions[index] });
  } else {
    res.status(404).json({ success: false, message: 'السؤال غير موجود' });
  }
});

// Reset endpoint
app.post('/api/reset', (req, res) => {
  loadDb();
  res.json({ success: true, message: 'تم إعادة تعيين البيانات' });
});

// Summary overview stats endpoint
app.get('/api/stats', (req, res) => {
  res.json({
    success: true,
    data: {
      booksCount: dbData.books ? dbData.books.length : 0,
      audiosCount: dbData.audios ? dbData.audios.length : 0,
      poemsCount: dbData.poems ? dbData.poems.length : 0,
      articlesCount: dbData.articles ? dbData.articles.length : 0,
      questionsCount: dbData.questions ? dbData.questions.length : 0,
      totalKhawatir: 500,
      totalPoemsVerses: dbData.poems ? dbData.poems.reduce((acc: number, p: any) => acc + (p.totalVerses || 0), 0) : 0
    }
  });
});

// Health check endpoint for Coolify and container orchestrators
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Start server with Vite middleware in dev or static dist in production
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
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
    console.log(`[Ibn Baydoah Server] Running on http://0.0.0.0:${PORT} in ${isProduction ? 'production' : 'development'} mode`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
