export type ScienceCategory =
  | 'العقيدة والتوحيد'
  | 'الفقه وأصوله'
  | 'الحديث وعلومه'
  | 'التفسير وعلوم القرآن'
  | 'النحو والصرف'
  | 'الأدب والبلاغة واللغة';

export type AudienceLevelId = 'beginner' | 'intermediate' | 'advanced';

export interface LevelInfo {
  id: AudienceLevelId;
  name: string;
  englishName: string;
  color: string;
}

export interface Profile {
  name: string;
  englishName: string;
  title: string;
  englishTitle: string;
  degree: string;
  englishDegree: string;
  dua_header: string;
  whatsapp: string;
  phoneDisplay: string;
  location: string;
  locationEnglish: string;
  teaching_schedule: string;
  teachingScheduleEnglish: string;
  bio: string;
  telegram?: string;
  youtube?: string;
  email?: string;
}

export interface Book {
  id: string;
  title: string;
  subtitle?: string;
  collaborative?: boolean;
  collaborators?: string;
  status: 'مطبوع' | 'مخطوط';
  category: ScienceCategory;
  pages: number;
  year: string;
  description: string;
  downloadUrl?: string;
  hasPdf: boolean;
  featured?: boolean;
}

export interface AudioLesson {
  id: string;
  title: string;
  duration: string;
  audioUrl: string;
}

export interface AudioCourse {
  id: string;
  title: string;
  series: string;
  category: ScienceCategory;
  level: string;
  levelId: AudienceLevelId;
  status: 'مكتمل' | 'درس مستمر';
  totalLessons: number;
  duration: string;
  description: string;
  audioUrl: string;
  lessons?: AudioLesson[];
}

export interface PoemVerse {
  number: number;
  sadr: string;
  ajuz: string;
}

export interface Poem {
  id: string;
  title: string;
  meter: string;
  totalVerses: number;
  year: string;
  category: string;
  summary: string;
  verses: PoemVerse[];
}

export interface Article {
  id: string;
  title: string;
  type: 'خواطر ابن بيضاء' | 'بحث أكاديمي' | 'مقال عقدي' | 'مقال لغوي';
  category: ScienceCategory;
  date: string;
  views: number;
  tags: string[];
  summary: string;
  content: string;
}

export interface ScheduleCircle {
  id: string;
  day: string;
  dayEnglish: string;
  time: string;
  timeEnglish: string;
  subject: string;
  category: ScienceCategory;
  location: string;
  locationEnglish: string;
  type: string;
}

export interface DistanceAcademy {
  name: string;
  description: string;
  features: string[];
  telegramLink: string;
  whatsappGroup: string;
}

export interface Announcement {
  id: string;
  title: string;
  date: string;
  badge: string;
  details: string;
}

export interface ScheduleData {
  weeklyCircles: ScheduleCircle[];
  distanceAcademy: DistanceAcademy;
  announcements: Announcement[];
}

export interface StudentQuestion {
  id: string;
  studentName: string;
  question: string;
  answer?: string | null;
  date: string;
  category: string;
}
