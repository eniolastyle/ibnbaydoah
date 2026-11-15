import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { asc, eq, gt, sql } from 'drizzle-orm';
import {
  getPg,
  hasPostgresConfig,
  initDatabase,
  isPostgresActive,
  SEED_DB_PATH,
} from './index.ts';
import * as schema from './schema.ts';
import type {
  Article,
  AudioCourse,
  AudioLesson,
  Book,
  LevelInfo,
  Poem,
  Profile,
  ScheduleData,
  StudentQuestion,
} from '../types/index.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SESSIONS_PATH = path.resolve(__dirname, '../../server/data/sessions.json');

export interface AdminAuthData {
  username: string;
  salt: string;
  hash: string;
  isConfigured: boolean;
  updatedAt: string;
}

interface JsonDbShape {
  profile: Profile;
  categories: string[];
  levels: LevelInfo[];
  books: Book[];
  audios: AudioCourse[];
  poems: Poem[];
  articles: Article[];
  schedule: ScheduleData;
  questions: StudentQuestion[];
  adminAuth?: AdminAuthData;
}

class DataStore {
  private jsonCache: JsonDbShape | null = null;
  private jsonSessions = new Map<string, { username: string; expiresAt: number }>();

  async init() {
    this.loadJsonFallback();
    this.loadJsonSessions();
    return initDatabase();
  }

  private loadJsonFallback(): JsonDbShape {
    try {
      if (fs.existsSync(SEED_DB_PATH)) {
        const parsed = JSON.parse(fs.readFileSync(SEED_DB_PATH, 'utf-8'));
        this.jsonCache = {
          profile: parsed.profile || ({} as Profile),
          categories: Array.isArray(parsed.categories) ? parsed.categories : [],
          levels: Array.isArray(parsed.levels) ? parsed.levels : [],
          books: Array.isArray(parsed.books) ? parsed.books : [],
          audios: Array.isArray(parsed.audios)
            ? parsed.audios.map((a: AudioCourse) => {
                const lessons = Array.isArray(a.lessons) ? a.lessons : [];
                return {
                  ...a,
                  lessons,
                  totalLessons: lessons.length,
                  audioUrl: lessons[0]?.audioUrl || a.audioUrl || '',
                };
              })
            : [],
          poems: Array.isArray(parsed.poems) ? parsed.poems : [],
          articles: Array.isArray(parsed.articles) ? parsed.articles : [],
          schedule: parsed.schedule || {
            weeklyCircles: [],
            distanceAcademy: {
              name: '',
              description: '',
              features: [],
              telegramLink: '',
              whatsappGroup: '',
            },
            announcements: [],
          },
          questions: Array.isArray(parsed.questions) ? parsed.questions : [],
          adminAuth: parsed.adminAuth,
        };
      } else {
        this.jsonCache = {
          profile: {} as Profile,
          categories: [],
          levels: [],
          books: [],
          audios: [],
          poems: [],
          articles: [],
          schedule: {
            weeklyCircles: [],
            distanceAcademy: {
              name: '',
              description: '',
              features: [],
              telegramLink: '',
              whatsappGroup: '',
            },
            announcements: [],
          },
          questions: [],
        };
      }
    } catch (err) {
      console.error('[JSON Store] Failed loading db.json:', err);
      if (!this.jsonCache) {
        this.jsonCache = {
          profile: {} as Profile,
          categories: [],
          levels: [],
          books: [],
          audios: [],
          poems: [],
          articles: [],
          schedule: {
            weeklyCircles: [],
            distanceAcademy: {
              name: '',
              description: '',
              features: [],
              telegramLink: '',
              whatsappGroup: '',
            },
            announcements: [],
          },
          questions: [],
        };
      }
    }
    return this.jsonCache;
  }

  private saveJsonFallback() {
    if (!this.jsonCache) return;
    try {
      const dir = path.dirname(SEED_DB_PATH);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(SEED_DB_PATH, JSON.stringify(this.jsonCache, null, 2), 'utf-8');
    } catch (err) {
      console.error('[JSON Store] Error saving db.json:', err);
    }
  }

  private loadJsonSessions() {
    try {
      if (fs.existsSync(SESSIONS_PATH)) {
        const parsed = JSON.parse(fs.readFileSync(SESSIONS_PATH, 'utf-8')) as Record<
          string,
          { username: string; expiresAt: number }
        >;
        const now = Date.now();
        for (const [token, session] of Object.entries(parsed)) {
          if (session && session.expiresAt > now) {
            this.jsonSessions.set(token, session);
          }
        }
      }
    } catch (err) {
      console.error('[JSON Store] Error loading sessions:', err);
    }
  }

  private saveJsonSessions() {
    try {
      const dir = path.dirname(SESSIONS_PATH);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const now = Date.now();
      const out: Record<string, { username: string; expiresAt: number }> = {};
      for (const [token, sess] of this.jsonSessions.entries()) {
        if (sess.expiresAt > now) {
          out[token] = sess;
        } else {
          this.jsonSessions.delete(token);
        }
      }
      fs.writeFileSync(SESSIONS_PATH, JSON.stringify(out, null, 2), 'utf-8');
    } catch (err) {
      console.error('[JSON Store] Error saving sessions:', err);
    }
  }

  getEngineInfo() {
    return {
      engine: isPostgresActive() ? ('postgres' as const) : ('json' as const),
      pgConfigured: hasPostgresConfig(),
    };
  }

  private async getSetting<T>(key: string, fallback: T): Promise<T> {
    const pg = getPg();
    if (!pg) {
      const cache = this.jsonCache || this.loadJsonFallback();
      return ((cache as unknown as Record<string, unknown>)[key] as T) ?? fallback;
    }
    const rows = await pg.db
      .select()
      .from(schema.siteSettings)
      .where(eq(schema.siteSettings.key, key))
      .limit(1);
    if (rows.length === 0) return fallback;
    return rows[0].value as T;
  }

  private async setSetting(key: string, value: unknown): Promise<void> {
    const pg = getPg();
    if (!pg) {
      const cache = this.jsonCache || this.loadJsonFallback();
      (cache as unknown as Record<string, unknown>)[key] = value;
      this.saveJsonFallback();
      return;
    }
    await pg.db
      .insert(schema.siteSettings)
      .values({ key, value, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: schema.siteSettings.key,
        set: { value, updatedAt: new Date() },
      });
  }

  private async getMinSortOrder(tableName: string): Promise<number> {
    const pg = getPg();
    if (!pg) return 0;
    const { rows } = await pg.pool.query(
      `SELECT COALESCE(MIN(sort_order), 0)::int - 1 AS next_order FROM ${tableName}`
    );
    return rows[0]?.next_order ?? -1;
  }

  // ==================== AUTH & SESSIONS ====================
  async getAdminAuth(): Promise<AdminAuthData | undefined> {
    const auth = await this.getSetting<AdminAuthData | undefined>('adminAuth', undefined);
    return auth;
  }

  async saveAdminAuth(auth: AdminAuthData): Promise<void> {
    await this.setSetting('adminAuth', auth);
  }

  async getSession(token: string): Promise<{ username: string; expiresAt: number } | null> {
    if (!token) return null;
    const pg = getPg();
    if (!pg) {
      const sess = this.jsonSessions.get(token);
      if (!sess) return null;
      if (sess.expiresAt <= Date.now()) {
        this.jsonSessions.delete(token);
        this.saveJsonSessions();
        return null;
      }
      return sess;
    }
    const rows = await pg.db
      .select()
      .from(schema.adminSessions)
      .where(eq(schema.adminSessions.token, token))
      .limit(1);
    if (rows.length === 0) return null;
    const sess = rows[0];
    if (sess.expiresAt <= Date.now()) {
      await pg.db.delete(schema.adminSessions).where(eq(schema.adminSessions.token, token));
      return null;
    }
    return { username: sess.username, expiresAt: sess.expiresAt };
  }

  async createSession(token: string, username: string, expiresAt: number): Promise<void> {
    const pg = getPg();
    if (!pg) {
      this.jsonSessions.set(token, { username, expiresAt });
      this.saveJsonSessions();
      return;
    }
    // Prune expired sessions opportunistically
    await pg.db
      .delete(schema.adminSessions)
      .where(sql`${schema.adminSessions.expiresAt} <= ${Date.now()}`);
    await pg.db
      .insert(schema.adminSessions)
      .values({ token, username, expiresAt })
      .onConflictDoUpdate({
        target: schema.adminSessions.token,
        set: { username, expiresAt },
      });
  }

  async deleteSession(token: string): Promise<void> {
    if (!token) return;
    const pg = getPg();
    if (!pg) {
      this.jsonSessions.delete(token);
      this.saveJsonSessions();
      return;
    }
    await pg.db.delete(schema.adminSessions).where(eq(schema.adminSessions.token, token));
  }

  // ==================== PROFILE, CATEGORIES, SCHEDULE ====================
  async getProfile(): Promise<Profile> {
    const cache = this.jsonCache || this.loadJsonFallback();
    return this.getSetting<Profile>('profile', cache.profile);
  }

  async updateProfile(patch: Partial<Profile>): Promise<Profile> {
    const current = await this.getProfile();
    const updated = { ...current, ...patch };
    await this.setSetting('profile', updated);
    return updated;
  }

  async getCategories(): Promise<string[]> {
    const cache = this.jsonCache || this.loadJsonFallback();
    return this.getSetting<string[]>('categories', cache.categories);
  }

  async updateCategories(categories: string[]): Promise<string[]> {
    await this.setSetting('categories', categories);
    return categories;
  }

  async getLevels(): Promise<LevelInfo[]> {
    const cache = this.jsonCache || this.loadJsonFallback();
    return this.getSetting<LevelInfo[]>('levels', cache.levels);
  }

  async getSchedule(): Promise<ScheduleData> {
    const cache = this.jsonCache || this.loadJsonFallback();
    return this.getSetting<ScheduleData>('schedule', cache.schedule);
  }

  async updateSchedule(patch: Partial<ScheduleData>): Promise<ScheduleData> {
    const current = await this.getSchedule();
    const updated = { ...current, ...patch };
    await this.setSetting('schedule', updated);
    return updated;
  }

  // ==================== BOOKS ====================
  async getBooks(): Promise<Book[]> {
    const pg = getPg();
    if (!pg) {
      return (this.jsonCache || this.loadJsonFallback()).books;
    }
    const rows = await pg.db.select().from(schema.books).orderBy(asc(schema.books.sortOrder));
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      subtitle: r.subtitle || undefined,
      collaborative: r.collaborative,
      collaborators: r.collaborators || undefined,
      status: (r.status as Book['status']) || 'مخطوط',
      category: (r.category as Book['category']) || 'العقيدة والتوحيد',
      pages: r.pages,
      year: r.year,
      description: r.description,
      downloadUrl: r.downloadUrl,
      hasPdf: r.hasPdf,
      featured: r.featured,
    }));
  }

  async createBook(book: Book): Promise<Book> {
    const pg = getPg();
    if (!pg) {
      const cache = this.jsonCache || this.loadJsonFallback();
      cache.books.unshift(book);
      this.saveJsonFallback();
      return book;
    }
    const sortOrder = await this.getMinSortOrder('books');
    await pg.db.insert(schema.books).values({
      id: book.id,
      sortOrder,
      title: book.title,
      subtitle: book.subtitle || '',
      collaborative: Boolean(book.collaborative),
      collaborators: book.collaborators || '',
      status: book.status,
      category: book.category,
      pages: Number(book.pages) || 0,
      year: book.year,
      description: book.description,
      downloadUrl: book.downloadUrl || '#',
      hasPdf: Boolean(book.hasPdf),
      featured: Boolean(book.featured),
    });
    return book;
  }

  async updateBook(id: string, patch: Partial<Book>): Promise<Book | null> {
    const pg = getPg();
    if (!pg) {
      const cache = this.jsonCache || this.loadJsonFallback();
      const idx = cache.books.findIndex((b) => b.id === id);
      if (idx === -1) return null;
      cache.books[idx] = { ...cache.books[idx], ...patch, id };
      this.saveJsonFallback();
      return cache.books[idx];
    }
    const existing = await pg.db.select().from(schema.books).where(eq(schema.books.id, id)).limit(1);
    if (existing.length === 0) return null;
    const cur = existing[0];
    const next: Book = {
      id,
      title: patch.title ?? cur.title,
      subtitle: patch.subtitle ?? (cur.subtitle || undefined),
      collaborative: patch.collaborative ?? cur.collaborative,
      collaborators: patch.collaborators ?? (cur.collaborators || undefined),
      status: patch.status ?? (cur.status as Book['status']),
      category: patch.category ?? (cur.category as Book['category']),
      pages: patch.pages !== undefined ? Number(patch.pages) : cur.pages,
      year: patch.year ?? cur.year,
      description: patch.description ?? cur.description,
      downloadUrl: patch.downloadUrl ?? cur.downloadUrl,
      hasPdf: patch.hasPdf ?? cur.hasPdf,
      featured: patch.featured ?? cur.featured,
    };
    await pg.db
      .update(schema.books)
      .set({
        title: next.title,
        subtitle: next.subtitle || '',
        collaborative: Boolean(next.collaborative),
        collaborators: next.collaborators || '',
        status: next.status,
        category: next.category,
        pages: next.pages,
        year: next.year,
        description: next.description,
        downloadUrl: next.downloadUrl || '#',
        hasPdf: Boolean(next.hasPdf),
        featured: Boolean(next.featured),
      })
      .where(eq(schema.books.id, id));
    return next;
  }

  async deleteBook(id: string): Promise<void> {
    const pg = getPg();
    if (!pg) {
      const cache = this.jsonCache || this.loadJsonFallback();
      cache.books = cache.books.filter((b) => b.id !== id);
      this.saveJsonFallback();
      return;
    }
    await pg.db.delete(schema.books).where(eq(schema.books.id, id));
  }

  async upsertBooksBatch(items: Book[]): Promise<{ created: number; updated: number }> {
    let created = 0;
    let updated = 0;
    const existingList = await this.getBooks();
    const byId = new Map(existingList.map((b) => [b.id, b]));
    const byTitle = new Map(existingList.map((b) => [b.title.trim(), b]));

    for (const item of items) {
      const match = byId.get(item.id) || byTitle.get(item.title.trim());
      if (match) {
        await this.updateBook(match.id, { ...item, id: match.id });
        updated++;
      } else {
        await this.createBook(item);
        created++;
      }
    }
    return { created, updated };
  }

  // ==================== AUDIO COURSES & LESSONS ====================
  async getAudios(): Promise<AudioCourse[]> {
    const pg = getPg();
    if (!pg) {
      const cache = this.jsonCache || this.loadJsonFallback();
      return cache.audios.map((a) => {
        const lessons = Array.isArray(a.lessons) ? a.lessons : [];
        return {
          ...a,
          lessons,
          totalLessons: lessons.length,
          audioUrl: lessons[0]?.audioUrl || a.audioUrl || '',
        };
      });
    }

    const courses = await pg.db
      .select()
      .from(schema.audioCourses)
      .orderBy(asc(schema.audioCourses.sortOrder));
    const lessons = await pg.db
      .select()
      .from(schema.audioLessons)
      .orderBy(asc(schema.audioLessons.sortOrder));

    const lessonsByCourse = new Map<string, AudioLesson[]>();
    for (const l of lessons) {
      const arr = lessonsByCourse.get(l.courseId) || [];
      arr.push({
        id: l.id,
        title: l.title,
        duration: l.duration,
        audioUrl: l.audioUrl,
      });
      lessonsByCourse.set(l.courseId, arr);
    }

    return courses.map((c) => {
      const courseLessons = lessonsByCourse.get(c.id) || [];
      return {
        id: c.id,
        title: c.title,
        series: c.series,
        category: (c.category as AudioCourse['category']) || 'العقيدة والتوحيد',
        level: c.level,
        levelId: (c.levelId as AudioCourse['levelId']) || 'beginner',
        status: (c.status as AudioCourse['status']) || 'درس مستمر',
        totalLessons: courseLessons.length,
        expectedLessons: c.expectedLessons ?? undefined,
        duration: c.duration,
        description: c.description,
        audioUrl: courseLessons[0]?.audioUrl || c.audioUrl || '',
        driveFolderId: c.driveFolderId ?? undefined,
        driveFolderUrl: c.driveFolderUrl ?? undefined,
        r2Prefix: c.r2Prefix ?? undefined,
        matnTitle: c.matnTitle ?? undefined,
        matnPdfUrl: c.matnPdfUrl ?? undefined,
        lessons: courseLessons,
      };
    });
  }

  async createAudio(course: AudioCourse): Promise<AudioCourse> {
    const lessons = Array.isArray(course.lessons) ? course.lessons : [];
    const normalized: AudioCourse = {
      ...course,
      lessons,
      totalLessons: lessons.length,
      audioUrl: lessons[0]?.audioUrl || course.audioUrl || '',
    };

    const pg = getPg();
    if (!pg) {
      const cache = this.jsonCache || this.loadJsonFallback();
      cache.audios.unshift(normalized);
      this.saveJsonFallback();
      return normalized;
    }

    const sortOrder = await this.getMinSortOrder('audio_courses');
    await pg.db.insert(schema.audioCourses).values({
      id: normalized.id,
      sortOrder,
      title: normalized.title,
      series: normalized.series,
      category: normalized.category,
      level: normalized.level,
      levelId: normalized.levelId,
      status: normalized.status,
      totalLessons: lessons.length,
      expectedLessons: normalized.expectedLessons ?? null,
      duration: normalized.duration,
      description: normalized.description,
      audioUrl: normalized.audioUrl,
      driveFolderId: normalized.driveFolderId ?? null,
      driveFolderUrl: normalized.driveFolderUrl ?? null,
      r2Prefix: normalized.r2Prefix ?? null,
      matnTitle: normalized.matnTitle ?? null,
      matnPdfUrl: normalized.matnPdfUrl ?? null,
    });

    for (let idx = 0; idx < lessons.length; idx++) {
      const l = lessons[idx];
      await pg.db.insert(schema.audioLessons).values({
        id: l.id,
        courseId: normalized.id,
        sortOrder: idx,
        title: l.title,
        duration: l.duration || '45:00',
        audioUrl: l.audioUrl,
      });
    }

    return normalized;
  }

  async updateAudio(id: string, patch: Partial<AudioCourse>): Promise<AudioCourse | null> {
    const pg = getPg();
    if (!pg) {
      const cache = this.jsonCache || this.loadJsonFallback();
      const idx = cache.audios.findIndex((a) => a.id === id);
      if (idx === -1) return null;
      const existing = cache.audios[idx];
      const lessons = Array.isArray(patch.lessons) ? patch.lessons : existing.lessons || [];
      const primaryUrl = lessons[0]?.audioUrl || patch.audioUrl || existing.audioUrl || '';
      cache.audios[idx] = {
        ...existing,
        ...patch,
        id,
        lessons,
        totalLessons: lessons.length,
        audioUrl: primaryUrl,
      };
      this.saveJsonFallback();
      return cache.audios[idx];
    }

    const existingRows = await pg.db
      .select()
      .from(schema.audioCourses)
      .where(eq(schema.audioCourses.id, id))
      .limit(1);
    if (existingRows.length === 0) return null;

    const cur = existingRows[0];
    const currentLessons = await pg.db
      .select()
      .from(schema.audioLessons)
      .where(eq(schema.audioLessons.courseId, id))
      .orderBy(asc(schema.audioLessons.sortOrder));

    const lessons: AudioLesson[] = Array.isArray(patch.lessons)
      ? patch.lessons
      : currentLessons.map((l) => ({
          id: l.id,
          title: l.title,
          duration: l.duration,
          audioUrl: l.audioUrl,
        }));

    const primaryUrl = lessons[0]?.audioUrl || patch.audioUrl || cur.audioUrl || '';

    const updated: AudioCourse = {
      id,
      title: patch.title ?? cur.title,
      series: patch.series ?? cur.series,
      category: patch.category ?? (cur.category as AudioCourse['category']),
      level: patch.level ?? cur.level,
      levelId: patch.levelId ?? (cur.levelId as AudioCourse['levelId']),
      status: patch.status ?? (cur.status as AudioCourse['status']),
      totalLessons: lessons.length,
      expectedLessons:
        patch.expectedLessons !== undefined
          ? patch.expectedLessons
          : cur.expectedLessons ?? undefined,
      duration: patch.duration ?? cur.duration,
      description: patch.description ?? cur.description,
      audioUrl: primaryUrl,
      driveFolderId:
        patch.driveFolderId !== undefined ? patch.driveFolderId : cur.driveFolderId ?? undefined,
      driveFolderUrl:
        patch.driveFolderUrl !== undefined ? patch.driveFolderUrl : cur.driveFolderUrl ?? undefined,
      r2Prefix: patch.r2Prefix !== undefined ? patch.r2Prefix : cur.r2Prefix ?? undefined,
      matnTitle: patch.matnTitle !== undefined ? patch.matnTitle : cur.matnTitle ?? undefined,
      matnPdfUrl: patch.matnPdfUrl !== undefined ? patch.matnPdfUrl : cur.matnPdfUrl ?? undefined,
      lessons,
    };

    await pg.db
      .update(schema.audioCourses)
      .set({
        title: updated.title,
        series: updated.series,
        category: updated.category,
        level: updated.level,
        levelId: updated.levelId,
        status: updated.status,
        totalLessons: lessons.length,
        expectedLessons: updated.expectedLessons ?? null,
        duration: updated.duration,
        description: updated.description,
        audioUrl: primaryUrl,
        driveFolderId: updated.driveFolderId ?? null,
        driveFolderUrl: updated.driveFolderUrl ?? null,
        r2Prefix: updated.r2Prefix ?? null,
        matnTitle: updated.matnTitle ?? null,
        matnPdfUrl: updated.matnPdfUrl ?? null,
      })
      .where(eq(schema.audioCourses.id, id));

    if (Array.isArray(patch.lessons)) {
      await pg.db.delete(schema.audioLessons).where(eq(schema.audioLessons.courseId, id));
      for (let idx = 0; idx < lessons.length; idx++) {
        const l = lessons[idx];
        await pg.db.insert(schema.audioLessons).values({
          id: l.id || `l-${id}-${idx + 1}`,
          courseId: id,
          sortOrder: idx,
          title: l.title,
          duration: l.duration || '45:00',
          audioUrl: l.audioUrl,
        });
      }
    }

    return updated;
  }

  async deleteAudio(id: string): Promise<void> {
    const pg = getPg();
    if (!pg) {
      const cache = this.jsonCache || this.loadJsonFallback();
      cache.audios = cache.audios.filter((a) => a.id !== id);
      this.saveJsonFallback();
      return;
    }
    await pg.db.delete(schema.audioCourses).where(eq(schema.audioCourses.id, id));
  }

  async upsertAudiosBatch(items: AudioCourse[]): Promise<{ created: number; updated: number }> {
    let created = 0;
    let updated = 0;
    const existing = await this.getAudios();
    const byId = new Map(existing.map((a) => [a.id, a]));
    const byPrefix = new Map(
      existing.filter((a) => a.r2Prefix).map((a) => [a.r2Prefix!.toLowerCase(), a])
    );
    const byTitle = new Map(existing.map((a) => [a.title.trim(), a]));

    for (const item of items) {
      const match =
        byId.get(item.id) ||
        (item.r2Prefix ? byPrefix.get(item.r2Prefix.toLowerCase()) : undefined) ||
        byTitle.get(item.title.trim());
      if (match) {
        await this.updateAudio(match.id, { ...item, id: match.id });
        updated++;
      } else {
        await this.createAudio(item);
        created++;
      }
    }
    return { created, updated };
  }

  // ==================== POEMS ====================
  async getPoems(): Promise<Poem[]> {
    const pg = getPg();
    if (!pg) {
      return (this.jsonCache || this.loadJsonFallback()).poems;
    }
    const rows = await pg.db.select().from(schema.poems).orderBy(asc(schema.poems.sortOrder));
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      meter: r.meter,
      totalVerses: r.totalVerses,
      year: r.year,
      category: r.category,
      summary: r.summary,
      verses: Array.isArray(r.verses) ? r.verses : [],
    }));
  }

  async createPoem(poem: Poem): Promise<Poem> {
    const pg = getPg();
    if (!pg) {
      const cache = this.jsonCache || this.loadJsonFallback();
      cache.poems.unshift(poem);
      this.saveJsonFallback();
      return poem;
    }
    const sortOrder = await this.getMinSortOrder('poems');
    await pg.db.insert(schema.poems).values({
      id: poem.id,
      sortOrder,
      title: poem.title,
      meter: poem.meter,
      totalVerses: poem.totalVerses,
      year: poem.year,
      category: poem.category,
      summary: poem.summary,
      verses: poem.verses || [],
    });
    return poem;
  }

  async updatePoem(id: string, patch: Partial<Poem>): Promise<Poem | null> {
    const pg = getPg();
    if (!pg) {
      const cache = this.jsonCache || this.loadJsonFallback();
      const idx = cache.poems.findIndex((p) => p.id === id);
      if (idx === -1) return null;
      const verses = Array.isArray(patch.verses) ? patch.verses : cache.poems[idx].verses || [];
      cache.poems[idx] = {
        ...cache.poems[idx],
        ...patch,
        id,
        verses,
        totalVerses:
          verses.length || Number(patch.totalVerses) || cache.poems[idx].totalVerses || 0,
      };
      this.saveJsonFallback();
      return cache.poems[idx];
    }

    const existing = await pg.db.select().from(schema.poems).where(eq(schema.poems.id, id)).limit(1);
    if (existing.length === 0) return null;
    const cur = existing[0];
    const verses = Array.isArray(patch.verses) ? patch.verses : cur.verses || [];
    const next: Poem = {
      id,
      title: patch.title ?? cur.title,
      meter: patch.meter ?? cur.meter,
      totalVerses: verses.length || Number(patch.totalVerses) || cur.totalVerses || 0,
      year: patch.year ?? cur.year,
      category: patch.category ?? cur.category,
      summary: patch.summary ?? cur.summary,
      verses,
    };
    await pg.db
      .update(schema.poems)
      .set({
        title: next.title,
        meter: next.meter,
        totalVerses: next.totalVerses,
        year: next.year,
        category: next.category,
        summary: next.summary,
        verses: next.verses,
      })
      .where(eq(schema.poems.id, id));
    return next;
  }

  async deletePoem(id: string): Promise<void> {
    const pg = getPg();
    if (!pg) {
      const cache = this.jsonCache || this.loadJsonFallback();
      cache.poems = cache.poems.filter((p) => p.id !== id);
      this.saveJsonFallback();
      return;
    }
    await pg.db.delete(schema.poems).where(eq(schema.poems.id, id));
  }

  async upsertPoemsBatch(items: Poem[]): Promise<{ created: number; updated: number }> {
    let created = 0;
    let updated = 0;
    const existing = await this.getPoems();
    const byId = new Map(existing.map((p) => [p.id, p]));
    const byTitle = new Map(existing.map((p) => [p.title.trim(), p]));

    for (const item of items) {
      const match = byId.get(item.id) || byTitle.get(item.title.trim());
      if (match) {
        await this.updatePoem(match.id, { ...item, id: match.id });
        updated++;
      } else {
        await this.createPoem(item);
        created++;
      }
    }
    return { created, updated };
  }

  // ==================== ARTICLES ====================
  async getArticles(): Promise<Article[]> {
    const pg = getPg();
    if (!pg) {
      return (this.jsonCache || this.loadJsonFallback()).articles;
    }
    const rows = await pg.db.select().from(schema.articles).orderBy(asc(schema.articles.sortOrder));
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      type: (r.type as Article['type']) || 'خواطر ابن بيضاء',
      category: (r.category as Article['category']) || 'الأدب والبلاغة واللغة',
      date: r.date,
      views: r.views,
      tags: Array.isArray(r.tags) ? r.tags : [],
      summary: r.summary,
      content: r.content,
    }));
  }

  async createArticle(article: Article): Promise<Article> {
    const pg = getPg();
    if (!pg) {
      const cache = this.jsonCache || this.loadJsonFallback();
      cache.articles.unshift(article);
      this.saveJsonFallback();
      return article;
    }
    const sortOrder = await this.getMinSortOrder('articles');
    await pg.db.insert(schema.articles).values({
      id: article.id,
      sortOrder,
      title: article.title,
      type: article.type,
      category: article.category,
      date: article.date,
      views: Number(article.views) || 1,
      tags: Array.isArray(article.tags) ? article.tags : [],
      summary: article.summary,
      content: article.content,
    });
    return article;
  }

  async updateArticle(id: string, patch: Partial<Article>): Promise<Article | null> {
    const pg = getPg();
    if (!pg) {
      const cache = this.jsonCache || this.loadJsonFallback();
      const idx = cache.articles.findIndex((a) => a.id === id);
      if (idx === -1) return null;
      cache.articles[idx] = { ...cache.articles[idx], ...patch, id };
      this.saveJsonFallback();
      return cache.articles[idx];
    }

    const existing = await pg.db
      .select()
      .from(schema.articles)
      .where(eq(schema.articles.id, id))
      .limit(1);
    if (existing.length === 0) return null;
    const cur = existing[0];
    const next: Article = {
      id,
      title: patch.title ?? cur.title,
      type: patch.type ?? (cur.type as Article['type']),
      category: patch.category ?? (cur.category as Article['category']),
      date: patch.date ?? cur.date,
      views: patch.views !== undefined ? Number(patch.views) : cur.views,
      tags: Array.isArray(patch.tags) ? patch.tags : cur.tags || [],
      summary: patch.summary ?? cur.summary,
      content: patch.content ?? cur.content,
    };
    await pg.db
      .update(schema.articles)
      .set({
        title: next.title,
        type: next.type,
        category: next.category,
        date: next.date,
        views: next.views,
        tags: next.tags,
        summary: next.summary,
        content: next.content,
      })
      .where(eq(schema.articles.id, id));
    return next;
  }

  async deleteArticle(id: string): Promise<void> {
    const pg = getPg();
    if (!pg) {
      const cache = this.jsonCache || this.loadJsonFallback();
      cache.articles = cache.articles.filter((a) => a.id !== id);
      this.saveJsonFallback();
      return;
    }
    await pg.db.delete(schema.articles).where(eq(schema.articles.id, id));
  }

  async upsertArticlesBatch(
    items: Article[],
    options: { skipExisting?: boolean } = {}
  ): Promise<{ created: number; updated: number; skipped: number }> {
    let created = 0;
    let updated = 0;
    let skipped = 0;
    const existing = await this.getArticles();
    const byId = new Map(existing.map((a) => [a.id, a]));
    const byTitle = new Map(existing.map((a) => [a.title.trim(), a]));
    const byContentSig = new Map(
      existing.map((a) => [a.content.trim().slice(0, 90), a])
    );

    for (const item of items) {
      const contentSig = item.content.trim().slice(0, 90);
      const match =
        byId.get(item.id) ||
        byTitle.get(item.title.trim()) ||
        (contentSig.length > 20 ? byContentSig.get(contentSig) : undefined);
      if (match) {
        if (options.skipExisting) {
          skipped++;
        } else {
          await this.updateArticle(match.id, { ...item, id: match.id });
          updated++;
        }
      } else {
        await this.createArticle(item);
        byId.set(item.id, item);
        byTitle.set(item.title.trim(), item);
        if (contentSig.length > 20) byContentSig.set(contentSig, item);
        created++;
      }
    }
    return { created, updated, skipped };
  }

  // ==================== QUESTIONS ====================
  async getQuestions(): Promise<StudentQuestion[]> {
    const pg = getPg();
    if (!pg) {
      return (this.jsonCache || this.loadJsonFallback()).questions;
    }
    const rows = await pg.db
      .select()
      .from(schema.studentQuestions)
      .orderBy(asc(schema.studentQuestions.sortOrder));
    return rows.map((r) => ({
      id: r.id,
      studentName: r.studentName,
      question: r.question,
      answer: r.answer,
      date: r.date,
      category: r.category,
    }));
  }

  async createQuestion(q: StudentQuestion): Promise<StudentQuestion> {
    const pg = getPg();
    if (!pg) {
      const cache = this.jsonCache || this.loadJsonFallback();
      cache.questions.unshift(q);
      this.saveJsonFallback();
      return q;
    }
    const sortOrder = await this.getMinSortOrder('student_questions');
    await pg.db.insert(schema.studentQuestions).values({
      id: q.id,
      sortOrder,
      studentName: q.studentName,
      question: q.question,
      answer: q.answer ?? null,
      date: q.date,
      category: q.category,
    });
    return q;
  }

  async updateQuestion(
    id: string,
    patch: Partial<StudentQuestion>
  ): Promise<StudentQuestion | null> {
    const pg = getPg();
    if (!pg) {
      const cache = this.jsonCache || this.loadJsonFallback();
      const idx = cache.questions.findIndex((q) => q.id === id);
      if (idx === -1) return null;
      cache.questions[idx] = { ...cache.questions[idx], ...patch, id };
      this.saveJsonFallback();
      return cache.questions[idx];
    }

    const existing = await pg.db
      .select()
      .from(schema.studentQuestions)
      .where(eq(schema.studentQuestions.id, id))
      .limit(1);
    if (existing.length === 0) return null;
    const cur = existing[0];
    const next: StudentQuestion = {
      id,
      studentName: patch.studentName ?? cur.studentName,
      question: patch.question ?? cur.question,
      answer: patch.answer !== undefined ? patch.answer : cur.answer,
      date: patch.date ?? cur.date,
      category: patch.category ?? cur.category,
    };
    await pg.db
      .update(schema.studentQuestions)
      .set({
        studentName: next.studentName,
        question: next.question,
        answer: next.answer ?? null,
        date: next.date,
        category: next.category,
      })
      .where(eq(schema.studentQuestions.id, id));
    return next;
  }

  async deleteQuestion(id: string): Promise<void> {
    const pg = getPg();
    if (!pg) {
      const cache = this.jsonCache || this.loadJsonFallback();
      cache.questions = cache.questions.filter((q) => q.id !== id);
      this.saveJsonFallback();
      return;
    }
    await pg.db.delete(schema.studentQuestions).where(eq(schema.studentQuestions.id, id));
  }

  // ==================== STATS & BACKUP EXPORT ====================
  async getStats() {
    const [bookList, audioList, poemList, articleList, questionList] = await Promise.all([
      this.getBooks(),
      this.getAudios(),
      this.getPoems(),
      this.getArticles(),
      this.getQuestions(),
    ]);
    return {
      booksCount: bookList.length,
      audiosCount: audioList.length,
      poemsCount: poemList.length,
      articlesCount: articleList.length,
      questionsCount: questionList.length,
      totalKhawatir: Math.max(500, articleList.length),
      totalPoemsVerses: poemList.reduce((acc, p) => acc + (p.totalVerses || 0), 0),
    };
  }

  async exportAll() {
    const [profile, categories, levels, books, audios, poems, articles, schedule, questions] =
      await Promise.all([
        this.getProfile(),
        this.getCategories(),
        this.getLevels(),
        this.getBooks(),
        this.getAudios(),
        this.getPoems(),
        this.getArticles(),
        this.getSchedule(),
        this.getQuestions(),
      ]);
    return {
      exportedAt: new Date().toISOString(),
      storageEngine: this.getEngineInfo().engine,
      profile,
      categories,
      levels,
      books,
      audios,
      poems,
      articles,
      schedule,
      questions,
    };
  }

  async resetFromSeedFile() {
    if (!isPostgresActive()) {
      this.loadJsonFallback();
    }
    // Keep current data intact cleanly in PG without wiping admin edits
    return this.getEngineInfo();
  }
}

export const dataStore = new DataStore();
// Silence unused gt import warning if unused directly
void gt;
