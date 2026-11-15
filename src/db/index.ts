import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as schema from './schema.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const SEED_DB_PATH = path.resolve(__dirname, '../../server/data/db.json');

export type DbInstance = NodePgDatabase<typeof schema>;

let pool: Pool | null = null;
let db: DbInstance | null = null;
let pgAvailable = false;

export function hasPostgresConfig(): boolean {
  return Boolean(
    process.env.DATABASE_URL ||
      process.env.PGHOST ||
      process.env.SQL_HOST
  );
}

function buildPoolConfig() {
  const connectionString = process.env.DATABASE_URL;
  const requireSsl =
    process.env.PGSSLMODE === 'require' ||
    Boolean(connectionString && connectionString.includes('sslmode=require'));

  if (connectionString) {
    return {
      connectionString,
      connectionTimeoutMillis: 4500,
      idleTimeoutMillis: 30000,
      max: 10,
      ...(requireSsl ? { ssl: { rejectUnauthorized: false } } : {}),
    };
  }

  return {
    host: process.env.PGHOST || process.env.SQL_HOST || '127.0.0.1',
    port: Number(process.env.PGPORT || process.env.SQL_PORT || 5432),
    user: process.env.PGUSER || process.env.SQL_USER || 'ibn_baydoah',
    password: process.env.PGPASSWORD || process.env.SQL_PASSWORD || '',
    database: process.env.PGDATABASE || process.env.SQL_DATABASE || 'ibn_baydoah',
    connectionTimeoutMillis: 4500,
    idleTimeoutMillis: 30000,
    max: 10,
    ...(requireSsl ? { ssl: { rejectUnauthorized: false } } : {}),
  };
}

async function ensureSchemaDDL(pgPool: Pool): Promise<void> {
  await pgPool.query(`
    CREATE TABLE IF NOT EXISTS site_settings (
      key TEXT PRIMARY KEY,
      value JSONB NOT NULL,
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS books (
      id TEXT PRIMARY KEY,
      sort_order INTEGER NOT NULL DEFAULT 0,
      title TEXT NOT NULL,
      subtitle TEXT NOT NULL DEFAULT '',
      collaborative BOOLEAN NOT NULL DEFAULT FALSE,
      collaborators TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'مخطوط',
      category TEXT NOT NULL DEFAULT 'العقيدة والتوحيد',
      pages INTEGER NOT NULL DEFAULT 100,
      year TEXT NOT NULL DEFAULT '١٤٤٦ هـ',
      description TEXT NOT NULL DEFAULT '',
      download_url TEXT NOT NULL DEFAULT '#',
      has_pdf BOOLEAN NOT NULL DEFAULT FALSE,
      featured BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS audio_courses (
      id TEXT PRIMARY KEY,
      sort_order INTEGER NOT NULL DEFAULT 0,
      title TEXT NOT NULL,
      series TEXT NOT NULL DEFAULT 'سلسلة عامة',
      category TEXT NOT NULL DEFAULT 'العقيدة والتوحيد',
      level TEXT NOT NULL DEFAULT 'مبتدئ',
      level_id TEXT NOT NULL DEFAULT 'beginner',
      status TEXT NOT NULL DEFAULT 'درس مستمر',
      total_lessons INTEGER NOT NULL DEFAULT 0,
      expected_lessons INTEGER,
      duration TEXT NOT NULL DEFAULT '٤٥ دقيقة لكل درس',
      description TEXT NOT NULL DEFAULT '',
      audio_url TEXT NOT NULL DEFAULT '',
      drive_folder_id TEXT,
      drive_folder_url TEXT,
      r2_prefix TEXT,
      matn_title TEXT,
      matn_pdf_url TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS audio_lessons (
      id TEXT PRIMARY KEY,
      course_id TEXT NOT NULL REFERENCES audio_courses(id) ON DELETE CASCADE,
      sort_order INTEGER NOT NULL DEFAULT 0,
      title TEXT NOT NULL,
      duration TEXT NOT NULL DEFAULT '45:00',
      audio_url TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_audio_lessons_course_order
      ON audio_lessons(course_id, sort_order);

    CREATE TABLE IF NOT EXISTS poems (
      id TEXT PRIMARY KEY,
      sort_order INTEGER NOT NULL DEFAULT 0,
      title TEXT NOT NULL,
      meter TEXT NOT NULL DEFAULT 'بحر الرجز',
      total_verses INTEGER NOT NULL DEFAULT 0,
      year TEXT NOT NULL DEFAULT '١٤٤٦ هـ',
      category TEXT NOT NULL DEFAULT 'الأدب والأخلاق',
      summary TEXT NOT NULL DEFAULT '',
      verses JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS articles (
      id TEXT PRIMARY KEY,
      sort_order INTEGER NOT NULL DEFAULT 0,
      title TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'خواطر ابن بيضاء',
      category TEXT NOT NULL DEFAULT 'الأدب والبلاغة واللغة',
      date TEXT NOT NULL DEFAULT '',
      views INTEGER NOT NULL DEFAULT 1,
      tags JSONB NOT NULL DEFAULT '[]'::jsonb,
      summary TEXT NOT NULL DEFAULT '',
      content TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS student_questions (
      id TEXT PRIMARY KEY,
      sort_order INTEGER NOT NULL DEFAULT 0,
      student_name TEXT NOT NULL,
      question TEXT NOT NULL,
      answer TEXT,
      date TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL DEFAULT 'سؤال عام',
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS admin_sessions (
      token TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      expires_at BIGINT NOT NULL
    );
  `);
}

async function seedIfEmpty(pgPool: Pool, orm: DbInstance): Promise<void> {
  if (!fs.existsSync(SEED_DB_PATH)) {
    return;
  }

  let seed: any;
  try {
    seed = JSON.parse(fs.readFileSync(SEED_DB_PATH, 'utf-8'));
  } catch (err) {
    console.error('[PostgreSQL] Failed parsing seed db.json:', err);
    return;
  }

  const client = await pgPool.connect();
  try {
    await client.query('BEGIN');

    // Seed site_settings keys only if missing
    const settingsEntries: Array<[string, unknown]> = [
      ['profile', seed.profile || {}],
      ['categories', seed.categories || []],
      ['levels', seed.levels || []],
      ['schedule', seed.schedule || {}],
    ];
    if (seed.adminAuth) {
      settingsEntries.push(['adminAuth', seed.adminAuth]);
    }

    for (const [key, value] of settingsEntries) {
      await orm
        .insert(schema.siteSettings)
        .values({ key, value })
        .onConflictDoNothing({ target: schema.siteSettings.key });
    }

    const { rows: bookCountRows } = await client.query('SELECT COUNT(*)::int AS cnt FROM books');
    if (bookCountRows[0]?.cnt === 0 && Array.isArray(seed.books)) {
      for (let i = 0; i < seed.books.length; i++) {
        const b = seed.books[i];
        await orm
          .insert(schema.books)
          .values({
            id: b.id,
            sortOrder: i,
            title: b.title || '',
            subtitle: b.subtitle || '',
            collaborative: Boolean(b.collaborative),
            collaborators: b.collaborators || '',
            status: b.status || 'مخطوط',
            category: b.category || 'العقيدة والتوحيد',
            pages: Number(b.pages) || 0,
            year: b.year || '١٤٤٦ هـ',
            description: b.description || '',
            downloadUrl: b.downloadUrl || '#',
            hasPdf: Boolean(b.hasPdf),
            featured: Boolean(b.featured),
          })
          .onConflictDoNothing({ target: schema.books.id });
      }
    }

    // Seed all catalog audio courses idempotently (adds missing catalog courses without overwriting user edits)
    if (Array.isArray(seed.audios)) {
      for (let i = 0; i < seed.audios.length; i++) {
        const a = seed.audios[i];
        const lessons = Array.isArray(a.lessons) ? a.lessons : [];
        const insertedCourse = await orm
          .insert(schema.audioCourses)
          .values({
            id: a.id,
            sortOrder: i,
            title: a.title || '',
            series: a.series || 'سلسلة عامة',
            category: a.category || 'العقيدة والتوحيد',
            level: a.level || 'مبتدئ',
            levelId: a.levelId || 'beginner',
            status: a.status || 'درس مستمر',
            totalLessons: lessons.length,
            expectedLessons: a.expectedLessons ?? null,
            duration: a.duration || '٤٥ دقيقة لكل درس',
            description: a.description || '',
            audioUrl: lessons[0]?.audioUrl || a.audioUrl || '',
            driveFolderId: a.driveFolderId ?? null,
            driveFolderUrl: a.driveFolderUrl ?? null,
            r2Prefix: a.r2Prefix ?? null,
            matnTitle: a.matnTitle ?? null,
            matnPdfUrl: a.matnPdfUrl ?? null,
          })
          .onConflictDoNothing({ target: schema.audioCourses.id })
          .returning({ id: schema.audioCourses.id });

        // Only insert seed lessons if this course row was newly inserted
        if (insertedCourse.length > 0 && lessons.length > 0) {
          for (let j = 0; j < lessons.length; j++) {
            const l = lessons[j];
            await orm
              .insert(schema.audioLessons)
              .values({
                id: l.id,
                courseId: a.id,
                sortOrder: j,
                title: l.title || `الدرس ${j + 1}`,
                duration: l.duration || '45:00',
                audioUrl: l.audioUrl || '',
              })
              .onConflictDoNothing({ target: schema.audioLessons.id });
          }
        }
      }
    }

    const { rows: poemCountRows } = await client.query('SELECT COUNT(*)::int AS cnt FROM poems');
    if (poemCountRows[0]?.cnt === 0 && Array.isArray(seed.poems)) {
      for (let i = 0; i < seed.poems.length; i++) {
        const p = seed.poems[i];
        await orm
          .insert(schema.poems)
          .values({
            id: p.id,
            sortOrder: i,
            title: p.title || '',
            meter: p.meter || 'بحر الرجز',
            totalVerses: Number(p.totalVerses) || (Array.isArray(p.verses) ? p.verses.length : 0),
            year: p.year || '١٤٤٦ هـ',
            category: p.category || 'الأدب والأخلاق',
            summary: p.summary || '',
            verses: Array.isArray(p.verses) ? p.verses : [],
          })
          .onConflictDoNothing({ target: schema.poems.id });
      }
    }

    const { rows: artCountRows } = await client.query('SELECT COUNT(*)::int AS cnt FROM articles');
    if (artCountRows[0]?.cnt === 0 && Array.isArray(seed.articles)) {
      for (let i = 0; i < seed.articles.length; i++) {
        const art = seed.articles[i];
        await orm
          .insert(schema.articles)
          .values({
            id: art.id,
            sortOrder: i,
            title: art.title || '',
            type: art.type || 'خواطر ابن بيضاء',
            category: art.category || 'الأدب والبلاغة واللغة',
            date: art.date || '',
            views: Number(art.views) || 1,
            tags: Array.isArray(art.tags) ? art.tags : [],
            summary: art.summary || '',
            content: art.content || '',
          })
          .onConflictDoNothing({ target: schema.articles.id });
      }
    }

    const { rows: qCountRows } = await client.query('SELECT COUNT(*)::int AS cnt FROM student_questions');
    if (qCountRows[0]?.cnt === 0 && Array.isArray(seed.questions)) {
      for (let i = 0; i < seed.questions.length; i++) {
        const q = seed.questions[i];
        await orm
          .insert(schema.studentQuestions)
          .values({
            id: q.id,
            sortOrder: i,
            studentName: q.studentName || 'طالب علم',
            question: q.question || '',
            answer: q.answer ?? null,
            date: q.date || '',
            category: q.category || 'سؤال عام',
          })
          .onConflictDoNothing({ target: schema.studentQuestions.id });
      }
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function initDatabase(): Promise<{ engine: 'postgres' | 'json'; pgConfigured: boolean }> {
  const configured = hasPostgresConfig();
  if (!configured) {
    pgAvailable = false;
    console.log('[Storage] No DATABASE_URL/PGHOST configured — running with JSON store (server/data/db.json).');
    return { engine: 'json', pgConfigured: false };
  }

  try {
    pool = new Pool(buildPoolConfig());
    await pool.query('SELECT 1');
    await ensureSchemaDDL(pool);
    db = drizzle(pool, { schema });
    await seedIfEmpty(pool, db);
    pgAvailable = true;
    console.log('[Storage] Connected to PostgreSQL and verified schema + catalog seed.');
    return { engine: 'postgres', pgConfigured: true };
  } catch (err) {
    console.warn('[Storage] PostgreSQL connection unavailable, falling back to JSON store:', (err as Error).message);
    if (pool) {
      await pool.end().catch(() => {});
      pool = null;
    }
    db = null;
    pgAvailable = false;
    return { engine: 'json', pgConfigured: true };
  }
}

export function getPg(): { db: DbInstance; pool: Pool } | null {
  if (pgAvailable && db && pool) {
    return { db, pool };
  }
  return null;
}

export function isPostgresActive(): boolean {
  return pgAvailable && db !== null;
}
