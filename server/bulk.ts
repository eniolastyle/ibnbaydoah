import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { dataStore } from '../src/db/store.ts';
import type {
  Article,
  AudioCourse,
  AudioLesson,
  Book,
  Poem,
  PoemVerse,
  ScienceCategory,
} from '../src/types/index.ts';

const AUDIO_EXTENSIONS = new Set(['.mp3', '.m4a', '.aac', '.ogg', '.opus', '.wav', '.flac']);
const PDF_EXTENSIONS = new Set(['.pdf']);
const COMBINED_DRIVE_ROOT_ID = '1HCDWJKIcbfLnecitYRRUQuYJ633Dci7a';

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

function getExt(filepath: string): string {
  const idx = filepath.lastIndexOf('.');
  return idx === -1 ? '' : filepath.slice(idx).toLowerCase();
}

function getBaseName(filepath: string): string {
  const clean = filepath.split('/').pop() || filepath;
  const idx = clean.lastIndexOf('.');
  return idx === -1 ? clean : clean.slice(0, idx);
}

function formatLessonTitle(filepath: string, index: number): string {
  const base = getBaseName(filepath)
    .replace(/[_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!base) return `الدرس ${index + 1}`;
  return base;
}

function encodeR2Key(key: string): string {
  return key
    .replace(/^\/+/, '')
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

function buildPublicUrl(baseUrl: string, key: string): string {
  const trimmedBase = baseUrl.trim().replace(/\/+$/, '');
  return `${trimmedBase}/${encodeR2Key(key)}`;
}

export function getR2Config() {
  const accountId = process.env.R2_ACCOUNT_ID?.trim() || '';
  const endpoint =
    process.env.R2_ENDPOINT?.trim() ||
    (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : '');
  const bucket = process.env.R2_BUCKET?.trim() || '';
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim() || '';
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim() || '';
  const publicUrl = process.env.R2_PUBLIC_URL?.trim() || '';

  const configured = Boolean(endpoint && bucket && accessKeyId && secretAccessKey && publicUrl);
  return {
    configured,
    endpoint,
    bucket,
    accessKeyId,
    secretAccessKey,
    publicUrl,
  };
}

interface GroupedMedia {
  audioFiles: Array<{ path: string; fullKey: string; filename: string }>;
  pdfFiles: Array<{ path: string; fullKey: string; filename: string }>;
}

function groupFilesByPrefix(
  objects: Array<{ key: string }>
): Map<string, GroupedMedia> {
  const groups = new Map<string, GroupedMedia>();

  for (const obj of objects) {
    const rawKey = obj.key.replace(/^\/+/, '');
    const normalized = rawKey.startsWith('courses/') ? rawKey.slice('courses/'.length) : rawKey;
    const parts = normalized.split('/').filter(Boolean);
    if (parts.length < 2) continue;

    const prefix = parts[0];
    const filename = parts[parts.length - 1];
    const ext = getExt(filename);

    if (!groups.has(prefix)) {
      groups.set(prefix, { audioFiles: [], pdfFiles: [] });
    }
    const group = groups.get(prefix)!;
    if (AUDIO_EXTENSIONS.has(ext)) {
      group.audioFiles.push({ path: normalized, fullKey: rawKey, filename });
    } else if (PDF_EXTENSIONS.has(ext)) {
      group.pdfFiles.push({ path: normalized, fullKey: rawKey, filename });
    }
  }

  for (const group of groups.values()) {
    group.audioFiles.sort((a, b) => collator.compare(a.path, b.path));
    group.pdfFiles.sort((a, b) => collator.compare(a.path, b.path));
  }

  return groups;
}

async function applyGroupedMediaToCourses(
  groups: Map<string, GroupedMedia>,
  publicBaseUrl: string,
  options: { courseId?: string; dryRun?: boolean; autoCreateUnmatched?: boolean }
) {
  const existingCourses = await dataStore.getAudios();
  const targetCourses = options.courseId
    ? existingCourses.filter((c) => c.id === options.courseId)
    : existingCourses;

  const byPrefix = new Map<string, AudioCourse>();
  for (const c of targetCourses) {
    if (c.r2Prefix) {
      byPrefix.set(c.r2Prefix.toLowerCase(), c);
    }
  }

  const matchedDetails: Array<{
    courseId: string;
    title: string;
    r2Prefix: string;
    lessonCount: number;
    hasMatnPdf: boolean;
    created?: boolean;
  }> = [];
  const unmatchedPrefixes: Array<{ r2Prefix: string; audioCount: number; pdfCount: number }> = [];

  for (const [prefix, media] of groups.entries()) {
    if (media.audioFiles.length === 0 && media.pdfFiles.length === 0) continue;

    const existing = byPrefix.get(prefix.toLowerCase());
    if (existing) {
      const lessons: AudioLesson[] = media.audioFiles.map((file, idx) => ({
        id: `r2-${existing.id}-${idx + 1}`,
        title: formatLessonTitle(file.filename, idx),
        duration: existing.lessons?.[idx]?.duration || '45:00',
        audioUrl: buildPublicUrl(publicBaseUrl, file.fullKey),
      }));

      const matnPdfUrl =
        media.pdfFiles.length > 0
          ? buildPublicUrl(publicBaseUrl, media.pdfFiles[0].fullKey)
          : existing.matnPdfUrl;

      if (!options.dryRun) {
        await dataStore.updateAudio(existing.id, {
          lessons: lessons.length > 0 ? lessons : existing.lessons || [],
          matnPdfUrl,
        });
      }

      matchedDetails.push({
        courseId: existing.id,
        title: existing.title,
        r2Prefix: prefix,
        lessonCount: lessons.length > 0 ? lessons.length : existing.lessons?.length || 0,
        hasMatnPdf: Boolean(matnPdfUrl),
      });
    } else if (!options.courseId && options.autoCreateUnmatched && media.audioFiles.length > 0) {
      const cleanTitle = prefix.replace(/[-_]+/g, ' ').trim();
      const newId = `r2-${prefix.toLowerCase().replace(/[^a-z0-9-_]/g, '-')}`;
      const lessons: AudioLesson[] = media.audioFiles.map((file, idx) => ({
        id: `r2-${newId}-${idx + 1}`,
        title: formatLessonTitle(file.filename, idx),
        duration: '45:00',
        audioUrl: buildPublicUrl(publicBaseUrl, file.fullKey),
      }));
      const matnPdfUrl =
        media.pdfFiles.length > 0
          ? buildPublicUrl(publicBaseUrl, media.pdfFiles[0].fullKey)
          : undefined;

      if (!options.dryRun) {
        await dataStore.createAudio({
          id: newId,
          title: cleanTitle,
          series: 'سلاسل مستوردة من R2',
          category: 'العقيدة والتوحيد',
          level: 'متوسط',
          levelId: 'intermediate',
          status: 'مكتمل',
          totalLessons: lessons.length,
          duration: `${lessons.length} دروس`,
          description: `سلسلة صوتية مستوردة من المجلد السحابي ${prefix}`,
          audioUrl: lessons[0].audioUrl,
          r2Prefix: prefix,
          matnPdfUrl,
          lessons,
        });
      }

      matchedDetails.push({
        courseId: newId,
        title: cleanTitle,
        r2Prefix: prefix,
        lessonCount: lessons.length,
        hasMatnPdf: Boolean(matnPdfUrl),
        created: true,
      });
    } else if (!options.courseId) {
      unmatchedPrefixes.push({
        r2Prefix: prefix,
        audioCount: media.audioFiles.length,
        pdfCount: media.pdfFiles.length,
      });
    }
  }

  return {
    dryRun: Boolean(options.dryRun),
    syncedCoursesCount: matchedDetails.length,
    totalLessonsSynced: matchedDetails.reduce((acc, item) => acc + item.lessonCount, 0),
    matchedDetails,
    unmatchedPrefixes,
  };
}

export async function syncFromR2Bucket(options: {
  courseId?: string;
  dryRun?: boolean;
  autoCreateUnmatched?: boolean;
}) {
  const cfg = getR2Config();
  if (!cfg.configured) {
    throw new Error(
      'إعدادات Cloudflare R2 غير مكتملة في متغيرات البيئة (R2_ENDPOINT, R2_BUCKET, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_PUBLIC_URL) / Cloudflare R2 env vars are not configured.'
    );
  }

  let prefixFilter = 'courses/';
  if (options.courseId) {
    const all = await dataStore.getAudios();
    const target = all.find((c) => c.id === options.courseId);
    if (!target) throw new Error('الدورة المطلوبة غير موجودة / Course not found');
    if (!target.r2Prefix) {
      throw new Error('لم يتم تعيين بادئة R2 (r2Prefix) لهذا الشرح / Course has no r2Prefix set');
    }
    prefixFilter = `courses/${target.r2Prefix.replace(/^\/+|\/+$/g, '')}/`;
  }

  const client = new S3Client({
    region: 'auto',
    endpoint: cfg.endpoint,
    credentials: {
      accessKeyId: cfg.accessKeyId,
      secretAccessKey: cfg.secretAccessKey,
    },
  });

  const keys: Array<{ key: string }> = [];
  let continuationToken: string | undefined;

  do {
    const command = new ListObjectsV2Command({
      Bucket: cfg.bucket,
      Prefix: prefixFilter,
      ContinuationToken: continuationToken,
      MaxKeys: 1000,
    });
    const response = await client.send(command);
    for (const obj of response.Contents || []) {
      if (obj.Key && !obj.Key.endsWith('/')) {
        keys.push({ key: obj.Key });
      }
    }
    continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
  } while (continuationToken);

  const groups = groupFilesByPrefix(keys);
  return applyGroupedMediaToCourses(groups, cfg.publicUrl, options);
}

export async function importRcloneManifest(params: {
  entries: Array<{ Path?: string; path?: string; IsDir?: boolean }>;
  publicBaseUrl: string;
  dryRun?: boolean;
  autoCreateUnmatched?: boolean;
}) {
  const { entries, publicBaseUrl, dryRun, autoCreateUnmatched } = params;
  if (!publicBaseUrl || !/^https?:\/\//i.test(publicBaseUrl.trim())) {
    throw new Error('يرجى إدخال رابط CDN العام الصحيح (مثال: https://media.example.com)');
  }

  const keys = entries
    .filter((e) => !e.IsDir)
    .map((e) => {
      const rawPath = (e.Path || e.path || '').replace(/^\/+/, '');
      const fullKey = rawPath.startsWith('courses/') ? rawPath : `courses/${rawPath}`;
      return { key: fullKey };
    })
    .filter((o) => Boolean(o.key));

  const groups = groupFilesByPrefix(keys);
  return applyGroupedMediaToCourses(groups, publicBaseUrl, { dryRun, autoCreateUnmatched });
}

// ==================== TELEGRAM DESKTOP EXPORT IMPORTER ====================

function flattenTelegramText(textField: unknown): string {
  if (typeof textField === 'string') return textField;
  if (!Array.isArray(textField)) return '';
  return textField
    .map((part) => {
      if (typeof part === 'string') return part;
      if (part && typeof part === 'object' && 'text' in part) {
        return String((part as { text?: unknown }).text || '');
      }
      return '';
    })
    .join('');
}

function extractTelegramHashtags(textField: unknown, plainText: string): string[] {
  const tags = new Set<string>();
  if (Array.isArray(textField)) {
    for (const part of textField) {
      if (
        part &&
        typeof part === 'object' &&
        (part as { type?: string }).type === 'hashtag' &&
        'text' in part
      ) {
        const clean = String((part as { text?: unknown }).text || '')
          .replace(/^#/, '')
          .trim();
        if (clean) tags.add(clean);
      }
    }
  }
  const regex = /#([\u0600-\u06FF\w_]+)/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(plainText)) !== null) {
    if (match[1]) tags.add(match[1].replace(/_/g, ' '));
  }
  if (tags.size === 0) tags.add('خواطر ابن بيضاء');
  return Array.from(tags).slice(0, 6);
}

export async function importTelegramExport(params: {
  payload: any;
  type?: Article['type'];
  category?: ScienceCategory;
  dryRun?: boolean;
  skipExisting?: boolean;
}) {
  const messages = Array.isArray(params.payload?.messages)
    ? params.payload.messages
    : Array.isArray(params.payload)
    ? params.payload
    : null;

  if (!messages) {
    throw new Error(
      'صيغة ملف تيليجرام غير صحيحة: يجب أن يحتوي على مصفوفة messages (ملف result.json من Telegram Desktop).'
    );
  }

  const parsedArticles: Article[] = [];
  const skippedShort: number[] = [];

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (!msg || (msg.type && msg.type !== 'message')) continue;

    const rawText = flattenTelegramText(msg.text || msg.text_entities).trim();
    if (rawText.length < 25) {
      skippedShort.push(i);
      continue;
    }

    const lines = rawText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    const firstLine = lines[0] || '';
    const dateStr = msg.date ? String(msg.date).slice(0, 10) : new Date().toISOString().slice(0, 10);

    const title =
      firstLine.length >= 6 && firstLine.length <= 110
        ? firstLine
        : firstLine.slice(0, 85) + (firstLine.length > 85 ? '...' : '') ||
          `خاطرة من تيليجرام (${dateStr})`;

    const cleanBody = lines.length > 1 && title === firstLine ? lines.slice(1).join('\n\n') : rawText;
    const summarySource = cleanBody.replace(/\s+/g, ' ').trim();
    const summary =
      summarySource.length > 180 ? `${summarySource.slice(0, 177)}...` : summarySource;
    const tags = extractTelegramHashtags(msg.text || msg.text_entities, rawText);

    parsedArticles.push({
      id: msg.id ? `tg-${msg.id}` : `tg-${Date.now()}-${i}`,
      title,
      type: params.type || 'خواطر ابن بيضاء',
      category: params.category || 'الأدب والبلاغة واللغة',
      date: dateStr,
      views: 1,
      tags,
      summary,
      content: rawText,
    });
  }

  if (params.dryRun) {
    const existing = await dataStore.getArticles();
    const existingTitles = new Set(existing.map((a) => a.title.trim()));
    const existingSigs = new Set(existing.map((a) => a.content.trim().slice(0, 90)));
    let duplicates = 0;
    for (const item of parsedArticles) {
      const sig = item.content.trim().slice(0, 90);
      if (existingTitles.has(item.title.trim()) || (sig.length > 20 && existingSigs.has(sig))) {
        duplicates++;
      }
    }
    return {
      dryRun: true,
      totalMessagesScanned: messages.length,
      validArticlesCount: parsedArticles.length,
      duplicateCount: duplicates,
      newCount: parsedArticles.length - duplicates,
      preview: parsedArticles.slice(0, 5).map((a) => ({
        title: a.title,
        date: a.date,
        tags: a.tags,
        summary: a.summary,
      })),
    };
  }

  const result = await dataStore.upsertArticlesBatch(parsedArticles, {
    skipExisting: params.skipExisting !== false,
  });

  return {
    dryRun: false,
    totalMessagesScanned: messages.length,
    validArticlesCount: parsedArticles.length,
    ...result,
  };
}

// ==================== CSV PARSER & UNIVERSAL BULK IMPORTER ====================

export function parseCsv(csvText: string): Array<Record<string, string>> {
  const clean = csvText.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    const next = clean[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        row.push(field.trim());
        field = '';
      } else if (ch === '\r' && next === '\n') {
        row.push(field.trim());
        rows.push(row);
        row = [];
        field = '';
        i++;
      } else if (ch === '\n' || ch === '\r') {
        row.push(field.trim());
        rows.push(row);
        row = [];
        field = '';
      } else {
        field += ch;
      }
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field.trim());
    rows.push(row);
  }

  const nonEmptyRows = rows.filter((r) => r.some((cell) => cell.length > 0));
  if (nonEmptyRows.length < 2) return [];

  const headers = nonEmptyRows[0].map((h) => h.trim());
  const records: Array<Record<string, string>> = [];

  for (let r = 1; r < nonEmptyRows.length; r++) {
    const vals = nonEmptyRows[r];
    const rec: Record<string, string> = {};
    for (let c = 0; c < headers.length; c++) {
      rec[headers[c]] = vals[c] ?? '';
    }
    records.push(rec);
  }
  return records;
}

function parseBool(v: unknown, defaultVal = false): boolean {
  if (typeof v === 'boolean') return v;
  const s = String(v ?? '').trim().toLowerCase();
  if (!s) return defaultVal;
  return s === 'true' || s === '1' || s === 'yes' || s === 'نعم';
}

function parsePoemVersesText(raw: string): PoemVerse[] {
  return raw
    .split(/\n|\\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, idx) => {
      if (line.includes('۞')) {
        const [sadr, ajuz = ''] = line.split('۞');
        return { number: idx + 1, sadr: sadr.trim(), ajuz: ajuz.trim() };
      }
      if (line.includes('...')) {
        const [sadr, ajuz = ''] = line.split('...');
        return { number: idx + 1, sadr: sadr.trim(), ajuz: ajuz.trim() };
      }
      return { number: idx + 1, sadr: line, ajuz: '' };
    });
}

export async function importUniversalBulk(params: {
  entity: 'books' | 'audios' | 'poems' | 'articles';
  format: 'json' | 'csv';
  data: string | unknown[];
  dryRun?: boolean;
}) {
  const { entity, format, data, dryRun } = params;
  let records: Array<Record<string, any>> = [];

  if (format === 'csv') {
    if (typeof data !== 'string') throw new Error('يجب أن تكون بيانات CSV نصية');
    records = parseCsv(data);
  } else {
    const parsed = typeof data === 'string' ? JSON.parse(data) : data;
    if (Array.isArray(parsed)) {
      records = parsed;
    } else if (parsed && typeof parsed === 'object' && Array.isArray((parsed as any)[entity])) {
      records = (parsed as any)[entity];
    } else {
      throw new Error('يجب أن تكون بيانات JSON مصفوفة [...] أو كائناً يحتوي على مفتاح القسم');
    }
  }

  if (records.length === 0) {
    throw new Error('لم يتم العثور على أي سجلات صالحة للاستيراد');
  }

  if (entity === 'books') {
    const mapped: Book[] = records
      .filter((r) => r.title)
      .map((r, i) => ({
        id: r.id ? String(r.id) : `book-bulk-${Date.now()}-${i}`,
        title: String(r.title).trim(),
        subtitle: r.subtitle ? String(r.subtitle).trim() : '',
        collaborative: parseBool(r.collaborative),
        collaborators: r.collaborators ? String(r.collaborators).trim() : '',
        status: r.status === 'مطبوع' ? 'مطبوع' : 'مخطوط',
        category: (r.category || 'العقيدة والتوحيد') as ScienceCategory,
        pages: Number(r.pages) || 100,
        year: r.year ? String(r.year) : '١٤٤٦ هـ',
        description: r.description ? String(r.description) : '',
        downloadUrl: r.downloadUrl ? String(r.downloadUrl) : '#',
        hasPdf: parseBool(r.hasPdf, Boolean(r.downloadUrl && r.downloadUrl !== '#')),
        isPaid: parseBool(r.isPaid),
        price: r.price ? String(r.price).trim() : '',
        featured: parseBool(r.featured),
      }));

    if (dryRun) {
      return { dryRun: true, entity, count: mapped.length, sample: mapped.slice(0, 3) };
    }
    const res = await dataStore.upsertBooksBatch(mapped);
    return { dryRun: false, entity, count: mapped.length, ...res };
  }

  if (entity === 'poems') {
    const mapped: Poem[] = records
      .filter((r) => r.title)
      .map((r, i) => {
        const verses: PoemVerse[] = Array.isArray(r.verses)
          ? r.verses
          : typeof r.versesText === 'string'
          ? parsePoemVersesText(r.versesText)
          : typeof r.verses === 'string'
          ? parsePoemVersesText(r.verses)
          : [];
        return {
          id: r.id ? String(r.id) : `poem-bulk-${Date.now()}-${i}`,
          title: String(r.title).trim(),
          meter: r.meter ? String(r.meter) : 'بحر الرجز',
          totalVerses: verses.length || Number(r.totalVerses) || 0,
          year: r.year ? String(r.year) : '١٤٤٦ هـ',
          category: r.category ? String(r.category) : 'الأدب والأخلاق',
          summary: r.summary ? String(r.summary) : '',
          verses,
        };
      });

    if (dryRun) {
      return { dryRun: true, entity, count: mapped.length, sample: mapped.slice(0, 3) };
    }
    const res = await dataStore.upsertPoemsBatch(mapped);
    return { dryRun: false, entity, count: mapped.length, ...res };
  }

  if (entity === 'articles') {
    const mapped: Article[] = records
      .filter((r) => r.title || r.content)
      .map((r, i) => {
        const tags = Array.isArray(r.tags)
          ? r.tags.map(String)
          : typeof r.tags === 'string' && r.tags.trim()
          ? r.tags.split(/[|,،]/).map((s: string) => s.trim()).filter(Boolean)
          : ['خواطر ابن بيضاء'];
        const content = String(r.content || '');
        const summary =
          r.summary || (content.length > 180 ? `${content.slice(0, 177)}...` : content);
        return {
          id: r.id ? String(r.id) : `art-bulk-${Date.now()}-${i}`,
          title: String(r.title || `خاطرة ${i + 1}`).trim(),
          type: (r.type || 'خواطر ابن بيضاء') as Article['type'],
          category: (r.category || 'الأدب والبلاغة واللغة') as ScienceCategory,
          date: r.date ? String(r.date) : new Date().toISOString().slice(0, 10),
          views: Number(r.views) || 1,
          tags,
          summary,
          content,
        };
      });

    if (dryRun) {
      return { dryRun: true, entity, count: mapped.length, sample: mapped.slice(0, 3) };
    }
    const res = await dataStore.upsertArticlesBatch(mapped, { skipExisting: false });
    return { dryRun: false, entity, count: mapped.length, ...res };
  }

  // entity === 'audios': supports nested course objects OR flat lesson rows grouped by courseId/r2Prefix/courseTitle
  const isFlatLessonRows = records.some((r) => r.lessonTitle || r.lessonUrl || r.courseTitle);
  let coursesToUpsert: AudioCourse[] = [];

  if (isFlatLessonRows) {
    const existingCourses = await dataStore.getAudios();
    const grouped = new Map<string, AudioCourse>();

    for (let i = 0; i < records.length; i++) {
      const r = records[i];
      const courseKey = String(r.courseId || r.r2Prefix || r.courseTitle || r.title || '').trim();
      if (!courseKey) continue;

      if (!grouped.has(courseKey)) {
        const existingMatch = existingCourses.find(
          (c) =>
            c.id === r.courseId ||
            (r.r2Prefix && c.r2Prefix === r.r2Prefix) ||
            c.title === (r.courseTitle || r.title)
        );
        grouped.set(
          courseKey,
          existingMatch
            ? { ...existingMatch, lessons: [] }
            : {
                id: r.courseId ? String(r.courseId) : `audio-bulk-${Date.now()}-${i}`,
                title: String(r.courseTitle || r.title || courseKey),
                series: String(r.series || 'سلاسل مستوردة'),
                category: (r.category || 'العقيدة والتوحيد') as ScienceCategory,
                level: String(r.level || 'مبتدئ'),
                levelId: (r.levelId || 'beginner') as AudioCourse['levelId'],
                status: (r.status === 'درس مستمر' ? 'درس مستمر' : 'مكتمل'),
                totalLessons: 0,
                expectedLessons: r.expectedLessons ? Number(r.expectedLessons) : undefined,
                duration: String(r.courseDuration || r.duration || '٤٥ دقيقة لكل درس'),
                description: String(r.description || ''),
                audioUrl: '',
                r2Prefix: r.r2Prefix ? String(r.r2Prefix) : undefined,
                driveFolderId: r.driveFolderId ? String(r.driveFolderId) : undefined,
                matnTitle: r.matnTitle ? String(r.matnTitle) : undefined,
                matnPdfUrl: r.matnPdfUrl ? String(r.matnPdfUrl) : undefined,
                lessons: [],
              }
        );
      }

      const course = grouped.get(courseKey)!;
      const url = String(r.lessonUrl || r.audioUrl || '').trim();
      if (url) {
        const idx = (course.lessons || []).length;
        course.lessons = course.lessons || [];
        course.lessons.push({
          id: `l-${course.id}-${idx + 1}`,
          title: String(r.lessonTitle || `الدرس ${idx + 1}`),
          duration: String(r.duration || '45:00'),
          audioUrl: url,
        });
        course.totalLessons = course.lessons.length;
        course.audioUrl = course.lessons[0].audioUrl;
      }
    }
    coursesToUpsert = Array.from(grouped.values());
  } else {
    coursesToUpsert = records
      .filter((r) => r.title)
      .map((r, i) => {
        const lessons: AudioLesson[] = Array.isArray(r.lessons)
          ? r.lessons.map((l: any, idx: number) => ({
              id: l.id || `l-bulk-${Date.now()}-${i}-${idx}`,
              title: l.title || `الدرس ${idx + 1}`,
              duration: l.duration || '45:00',
              audioUrl: l.audioUrl || r.audioUrl || '',
            }))
          : [];
        return {
          id: r.id ? String(r.id) : `audio-bulk-${Date.now()}-${i}`,
          title: String(r.title).trim(),
          series: String(r.series || 'سلسلة عامة'),
          category: (r.category || 'العقيدة والتوحيد') as ScienceCategory,
          level: String(r.level || 'مبتدئ'),
          levelId: (r.levelId || 'beginner') as AudioCourse['levelId'],
          status: r.status === 'درس مستمر' ? 'درس مستمر' : 'مكتمل',
          totalLessons: lessons.length,
          expectedLessons: r.expectedLessons ? Number(r.expectedLessons) : undefined,
          duration: String(r.duration || '٤٥ دقيقة لكل درس'),
          description: String(r.description || ''),
          audioUrl: lessons[0]?.audioUrl || String(r.audioUrl || ''),
          driveFolderId: r.driveFolderId ? String(r.driveFolderId) : undefined,
          driveFolderUrl: r.driveFolderUrl ? String(r.driveFolderUrl) : undefined,
          r2Prefix: r.r2Prefix ? String(r.r2Prefix) : undefined,
          matnTitle: r.matnTitle ? String(r.matnTitle) : undefined,
          matnPdfUrl: r.matnPdfUrl ? String(r.matnPdfUrl) : undefined,
          lessons,
        };
      });
  }

  if (dryRun) {
    return {
      dryRun: true,
      entity,
      count: coursesToUpsert.length,
      sample: coursesToUpsert.slice(0, 3).map((c) => ({
        title: c.title,
        lessons: c.lessons?.length || 0,
        r2Prefix: c.r2Prefix,
      })),
    };
  }

  const res = await dataStore.upsertAudiosBatch(coursesToUpsert);
  return { dryRun: false, entity, count: coursesToUpsert.length, ...res };
}

// ==================== RCLONE MIGRATION SCRIPT GENERATOR ====================

export function generateRcloneMigrationScript(courses: AudioCourse[]): string {
  const driveCourses = courses.filter((c) => c.driveFolderId && c.r2Prefix);
  const cfg = getR2Config();
  const defaultBucket = cfg.bucket || 'ibn-baydoah-media';

  const lines: string[] = [
    '#!/usr/bin/env bash',
    '# ============================================================================',
    '# Ibn Baydoah Platform — Google Drive -> Cloudflare R2 Migration Script',
    '# Transfers all 44 Google Drive course folders to clean R2 CDN prefixes',
    '# and exports r2-manifest.json for one-click import in the Admin Dashboard.',
    '#',
    '# Prerequisites:',
    '#   1. Install rclone: https://rclone.org/install/',
    '#   2. Configure Google Drive remote:  rclone config  (name it: gdrive)',
    '#   3. Configure Cloudflare R2 remote: rclone config  (name it: r2, S3 -> Cloudflare)',
    '#   4. Run: chmod +x migrate-drive-to-r2.sh && ./migrate-drive-to-r2.sh',
    '# ============================================================================',
    '',
    'set -euo pipefail',
    '',
    'GDRIVE_REMOTE="${GDRIVE_REMOTE:-gdrive}"',
    `R2_REMOTE="\${R2_REMOTE:-r2}"`,
    `R2_BUCKET="\${R2_BUCKET:-${defaultBucket}}"`,
    'TRANSFERS="${TRANSFERS:-6}"',
    'CHECKERS="${CHECKERS:-8}"',
    'SHARED_FLAG="${SHARED_FLAG:-}" # Set SHARED_FLAG="--drive-shared-with-me" if folders are shared with you',
    '',
    'echo "=================================================================="',
    'echo " Ibn Baydoah Media Sync: ${GDRIVE_REMOTE} -> ${R2_REMOTE}:${R2_BUCKET}/courses"',
    `echo " Total Mapped Course Folders: ${driveCourses.length}"`,
    'echo "=================================================================="',
    '',
    'sync_folder() {',
    '  local prefix="$1"',
    '  local folder_id="$2"',
    '  local title="$3"',
    '  echo ""',
    '  echo ">>> [$prefix] $title"',
    '  rclone copy "${GDRIVE_REMOTE}:" "${R2_REMOTE}:${R2_BUCKET}/courses/${prefix}" \\',
    '    --drive-root-folder-id="${folder_id}" \\',
    '    --transfers="${TRANSFERS}" \\',
    '    --checkers="${CHECKERS}" \\',
    '    --ignore-existing \\',
    '    --progress \\',
    '    ${SHARED_FLAG}',
    '}',
    '',
    '# Optional: Uncomment the block below if you prefer syncing the combined root folder directly:',
    `# rclone copy "\${GDRIVE_REMOTE}:" "\${R2_REMOTE}:\${R2_BUCKET}/raw-root" --drive-root-folder-id="${COMBINED_DRIVE_ROOT_ID}" --progress`,
    '',
  ];

  for (const c of driveCourses) {
    const safeTitle = c.title.replace(/"/g, "'");
    lines.push(`sync_folder "${c.r2Prefix}" "${c.driveFolderId}" "${safeTitle}"`);
  }

  lines.push(
    '',
    'echo ""',
    'echo "=================================================================="',
    'echo " Generating r2-manifest.json for Admin Dashboard Import..."',
    'echo "=================================================================="',
    'rclone lsjson -R --files-only "${R2_REMOTE}:${R2_BUCKET}/courses" > r2-manifest.json',
    'echo "Done! Generated $(pwd)/r2-manifest.json."',
    'echo "You can now either:"',
    'echo "  1. Click [Scan & Sync R2 Bucket] in Admin -> Bulk Import & R2 Sync (if R2 keys are in .env), OR"',
    'echo "  2. Upload r2-manifest.json into Admin -> Bulk Import & R2 Sync."'
  );

  return lines.join('\n') + '\n';
}
