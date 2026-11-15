import {
  pgTable,
  text,
  integer,
  boolean,
  jsonb,
  timestamp,
  bigint,
} from 'drizzle-orm/pg-core';
import type { PoemVerse } from '../types';

export const siteSettings = pgTable('site_settings', {
  key: text('key').primaryKey(),
  value: jsonb('value').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const books = pgTable('books', {
  id: text('id').primaryKey(),
  sortOrder: integer('sort_order').default(0).notNull(),
  title: text('title').notNull(),
  subtitle: text('subtitle').default('').notNull(),
  collaborative: boolean('collaborative').default(false).notNull(),
  collaborators: text('collaborators').default('').notNull(),
  status: text('status').default('مخطوط').notNull(),
  category: text('category').default('العقيدة والتوحيد').notNull(),
  pages: integer('pages').default(100).notNull(),
  year: text('year').default('١٤٤٦ هـ').notNull(),
  description: text('description').default('').notNull(),
  downloadUrl: text('download_url').default('#').notNull(),
  hasPdf: boolean('has_pdf').default(false).notNull(),
  featured: boolean('featured').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const audioCourses = pgTable('audio_courses', {
  id: text('id').primaryKey(),
  sortOrder: integer('sort_order').default(0).notNull(),
  title: text('title').notNull(),
  series: text('series').default('سلسلة عامة').notNull(),
  category: text('category').default('العقيدة والتوحيد').notNull(),
  level: text('level').default('مبتدئ').notNull(),
  levelId: text('level_id').default('beginner').notNull(),
  status: text('status').default('درس مستمر').notNull(),
  totalLessons: integer('total_lessons').default(0).notNull(),
  expectedLessons: integer('expected_lessons'),
  duration: text('duration').default('٤٥ دقيقة لكل درس').notNull(),
  description: text('description').default('').notNull(),
  audioUrl: text('audio_url').default('').notNull(),
  driveFolderId: text('drive_folder_id'),
  driveFolderUrl: text('drive_folder_url'),
  r2Prefix: text('r2_prefix'),
  matnTitle: text('matn_title'),
  matnPdfUrl: text('matn_pdf_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const audioLessons = pgTable('audio_lessons', {
  id: text('id').primaryKey(),
  courseId: text('course_id')
    .notNull()
    .references(() => audioCourses.id, { onDelete: 'cascade' }),
  sortOrder: integer('sort_order').default(0).notNull(),
  title: text('title').notNull(),
  duration: text('duration').default('45:00').notNull(),
  audioUrl: text('audio_url').notNull(),
});

export const poems = pgTable('poems', {
  id: text('id').primaryKey(),
  sortOrder: integer('sort_order').default(0).notNull(),
  title: text('title').notNull(),
  meter: text('meter').default('بحر الرجز').notNull(),
  totalVerses: integer('total_verses').default(0).notNull(),
  year: text('year').default('١٤٤٦ هـ').notNull(),
  category: text('category').default('الأدب والأخلاق').notNull(),
  summary: text('summary').default('').notNull(),
  verses: jsonb('verses').$type<PoemVerse[]>().default([]).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const articles = pgTable('articles', {
  id: text('id').primaryKey(),
  sortOrder: integer('sort_order').default(0).notNull(),
  title: text('title').notNull(),
  type: text('type').default('خواطر ابن بيضاء').notNull(),
  category: text('category').default('الأدب والبلاغة واللغة').notNull(),
  date: text('date').default('').notNull(),
  views: integer('views').default(1).notNull(),
  tags: jsonb('tags').$type<string[]>().default([]).notNull(),
  summary: text('summary').default('').notNull(),
  content: text('content').default('').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const studentQuestions = pgTable('student_questions', {
  id: text('id').primaryKey(),
  sortOrder: integer('sort_order').default(0).notNull(),
  studentName: text('student_name').notNull(),
  question: text('question').notNull(),
  answer: text('answer'),
  date: text('date').default('').notNull(),
  category: text('category').default('سؤال عام').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const adminSessions = pgTable('admin_sessions', {
  token: text('token').primaryKey(),
  username: text('username').notNull(),
  expiresAt: bigint('expires_at', { mode: 'number' }).notNull(),
});
