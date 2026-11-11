import React, { useState } from 'react';
import { AudioCourse, AudienceLevelId } from '../types';
import { useAudio } from '../context/AudioContext';
import { useLanguage } from '../context/LanguageContext';
import {
  Headphones,
  Play,
  Pause,
  Filter,
  Search,
  CheckCircle,
  Radio,
  Clock,
  ListMusic,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface AudioLecturesHubProps {
  audios: AudioCourse[];
  categories: string[];
}

export const AudioLecturesHub: React.FC<AudioLecturesHubProps> = ({
  audios,
  categories,
}) => {
  const { lang, t, translateCategory, translateLevel, translateAudioStatus } = useLanguage();
  const { playTrack, currentTrack, isPlaying } = useAudio();

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCourseId, setExpandedCourseId] = useState<string | null>(null);

  const filteredAudios = audios.filter(course => {
    const matchesCategory =
      selectedCategory === 'all' || course.category === selectedCategory;
    const matchesLevel =
      selectedLevel === 'all' || course.levelId === selectedLevel || course.level === selectedLevel;
    const matchesStatus =
      statusFilter === 'all' || course.status === statusFilter;
    const matchesSearch =
      !searchQuery.trim() ||
      course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.series.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.description.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesCategory && matchesLevel && matchesStatus && matchesSearch;
  });

  const getLevelBadgeClass = (levelId: AudienceLevelId | string) => {
    switch (levelId) {
      case 'beginner':
      case 'مبتدئ':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'intermediate':
      case 'متوسط':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'advanced':
      case 'متقدم / مفصل':
      case 'متقدم':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      default:
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    }
  };

  const toggleCourseExpand = (id: string) => {
    setExpandedCourseId(prev => (prev === id ? null : id));
  };

  return (
    <div className="space-y-10 sm:space-y-16">
      {/* Hub Hero Banner */}
      <div className="bg-[#0F382C] text-[#FDFBF7] rounded-3xl p-8 sm:p-12 relative overflow-hidden shadow-xl">
        <div className="absolute inset-0 bg-arabesque-dark opacity-30 pointer-events-none" />
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#C5A880]/20 border border-[#C5A880]/40 text-[#DFC7A5] text-xs font-readex">
            <Headphones className="w-3.5 h-3.5" />
            <span className="font-semibold">{t('audios_header_badge')}</span>
          </div>
          <h2 className="font-amiri font-bold text-3xl sm:text-4xl text-[#FDFBF7]">
            {t('audios_header_title')}
          </h2>
          <p className="font-naskh text-[#DFC7A5]/90 text-sm sm:text-base leading-[2.1]">
            {t('audios_header_desc')}
          </p>
        </div>
      </div>

      {/* Filter and Search Box */}
      <div className="bg-white rounded-3xl border border-[#E8DCC9] p-6 sm:p-8 shadow-xs space-y-6">
        {/* Search */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={t('search_placeholder')}
            className="w-full pl-11 pr-4 py-3.5 text-xs sm:text-sm rounded-xl border border-[#E0D4C1] bg-[#FDFBF7] focus:outline-none focus:ring-2 focus:ring-[#0F382C]/30 focus:border-[#0F382C] text-[#1E1E1E] font-readex"
          />
          <Search className="w-4 h-4 text-[#A58455] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Level Filters (Crucial Audience Badges) */}
        <div className="flex flex-wrap items-center gap-2.5 pt-1">
          <span className="text-xs text-[#8C6D3B] font-readex font-bold flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5" />
            <span>{t('level_filter')}</span>
          </span>
          <button
            onClick={() => setSelectedLevel('all')}
            className={`px-3.5 py-2 rounded-xl text-xs font-readex font-medium transition ${
              selectedLevel === 'all'
                ? 'bg-[#0F382C] text-white shadow-xs font-bold'
                : 'bg-[#F4EFE6] text-[#0F382C] hover:bg-[#C5A880]/20'
            }`}
          >
            {t('all_levels')}
          </button>
          <button
            onClick={() => setSelectedLevel('beginner')}
            className={`px-3 py-1 rounded-lg text-xs font-readex font-medium border transition ${
              selectedLevel === 'beginner'
                ? 'bg-emerald-800 text-white border-emerald-800 font-bold'
                : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
            }`}
          >
            {t('beginner')}
          </button>
          <button
            onClick={() => setSelectedLevel('intermediate')}
            className={`px-3 py-1 rounded-lg text-xs font-readex font-medium border transition ${
              selectedLevel === 'intermediate'
                ? 'bg-amber-800 text-white border-amber-800 font-bold'
                : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
            }`}
          >
            {t('intermediate')}
          </button>
          <button
            onClick={() => setSelectedLevel('advanced')}
            className={`px-3 py-1 rounded-lg text-xs font-readex font-medium border transition ${
              selectedLevel === 'advanced'
                ? 'bg-purple-800 text-white border-purple-800 font-bold'
                : 'bg-purple-50 text-purple-800 border-purple-200 hover:bg-purple-100'
            }`}
          >
            {t('advanced')}
          </button>
        </div>

        {/* Categories Bar */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#C5A880]/20 text-xs font-readex">
          <span className="text-[#A58455] font-medium">{t('science_filter')}</span>
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-2.5 py-1 rounded-lg text-xs transition ${
              selectedCategory === 'all'
                ? 'bg-[#0F382C] text-white font-bold'
                : 'bg-[#FDFBF7] text-[#1E1E1E] hover:bg-[#F4EFE6]'
            }`}
          >
            {t('all_categories')}
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 rounded-lg text-xs transition ${
                selectedCategory === cat
                  ? 'bg-[#0F382C] text-white font-bold'
                  : 'bg-[#FDFBF7] text-[#1E1E1E] hover:bg-[#F4EFE6]'
              }`}
            >
              {translateCategory(cat)}
            </button>
          ))}
        </div>
      </div>

      {/* Courses List */}
      <div className="space-y-4">
        {filteredAudios.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-[#C5A880]/30">
            <Headphones className="w-12 h-12 text-[#C5A880] mx-auto mb-3 opacity-60" />
            <h3 className="font-amiri font-bold text-xl text-[#0F382C] mb-1">
              {t('no_audios_found')}
            </h3>
            <p className="text-xs text-[#A58455] font-readex">
              {t('no_audios_found_desc')}
            </p>
          </div>
        ) : (
          filteredAudios.map(course => {
            const isThisCoursePlaying =
              currentTrack?.series === course.series || currentTrack?.id === course.id;
            const isExpanded = expandedCourseId === course.id;

            return (
              <div
                key={course.id}
                className="bg-white rounded-3xl border border-[#E8DCC9] shadow-[0_2px_12px_-2px_rgba(15,56,44,0.04)] hover:shadow-lg hover:border-[#0F382C]/40 transition-all duration-300 overflow-hidden"
              >
                {/* Course Header */}
                <div className="p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  {/* Info Column */}
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2.5 mb-3">
                      {/* Level Badge */}
                      <span
                        className={`text-xs px-3 py-1 rounded-full border font-readex font-semibold ${getLevelBadgeClass(
                          course.levelId || course.level
                        )}`}
                      >
                        {translateLevel(course.level)}
                      </span>

                      {/* Category Badge */}
                      <span className="text-xs px-2.5 py-1 rounded-lg bg-[#F4EFE6] text-[#0F382C] border border-[#E0D4C1] font-readex font-medium">
                        {translateCategory(course.category)}
                      </span>

                      {/* Status Badge */}
                      <span
                        className={`text-xs px-2.5 py-1 rounded-lg font-readex flex items-center gap-1.5 font-semibold ${
                          course.status === 'مكتمل'
                            ? 'text-emerald-700 bg-emerald-50'
                            : 'text-amber-700 bg-amber-50'
                        }`}
                      >
                        {course.status === 'مكتمل' ? (
                          <CheckCircle className="w-3.5 h-3.5" />
                        ) : (
                          <Radio className="w-3.5 h-3.5 animate-pulse" />
                        )}
                        <span>{translateAudioStatus(course.status)}</span>
                      </span>
                    </div>

                    <h3 className="font-amiri font-bold text-2xl sm:text-3xl text-[#0F382C] mb-1.5">
                      {course.title}
                    </h3>
                    <p className="text-xs sm:text-sm font-readex text-[#8C6D3B] font-semibold mb-3">
                      {course.series}
                    </p>
                    <p className="font-naskh text-sm sm:text-base text-[#2D332F] leading-[2.1] max-w-3xl">
                      {course.description}
                    </p>

                    <div className="flex items-center gap-4 text-xs font-readex text-[#1E1E1E]/60 mt-3">
                      <div className="flex items-center gap-1">
                        <ListMusic className="w-3.5 h-3.5 text-[#A58455]" />
                        <span>{course.totalLessons} {t('recorded_lessons')}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-[#A58455]" />
                        <span>{course.duration}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Column */}
                  <div className="flex items-center gap-3 shrink-0 self-start md:self-center">
                    {/* Play Primary Track Button */}
                    <button
                      onClick={() =>
                        playTrack({
                          id: course.id,
                          title: course.title,
                          series: course.series,
                          category: course.category,
                          level: course.level,
                          levelId: course.levelId,
                          audioUrl: course.audioUrl,
                          duration: course.duration,
                        })
                      }
                      className="px-4 py-2.5 rounded-xl bg-[#0F382C] hover:bg-[#164E3D] text-[#FDFBF7] font-readex text-xs font-bold flex items-center gap-2 shadow-md transition"
                    >
                      {isThisCoursePlaying && isPlaying ? (
                        <>
                          <Pause className="w-4 h-4 fill-current text-[#DFC7A5]" />
                          <span>{t('pause_audio')}</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 fill-current text-[#DFC7A5]" />
                          <span>{t('play_audio')}</span>
                        </>
                      )}
                    </button>

                    {/* Expand Playlist Button */}
                    {course.lessons && course.lessons.length > 0 && (
                      <button
                        onClick={() => toggleCourseExpand(course.id)}
                        className="p-2.5 rounded-xl border border-[#C5A880]/40 text-[#0F382C] hover:bg-[#F4EFE6] transition text-xs font-readex flex items-center gap-1 font-semibold"
                        title={lang === 'ar' ? 'عرض قائمة الأشرطة والدروس' : 'View recorded lesson playlist'}
                      >
                        <ListMusic className="w-4 h-4 text-[#A58455]" />
                        <span>{isExpanded ? t('hide_lessons') : t('view_lessons')}</span>
                        {isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Expandable Lessons Playlist */}
                {isExpanded && course.lessons && course.lessons.length > 0 && (
                  <div className="bg-[#FDFBF7] border-t border-[#C5A880]/30 p-4 sm:p-6 space-y-2">
                    <h4 className="text-xs font-readex font-bold text-[#A58455] mb-3 flex items-center gap-1">
                      <ListMusic className="w-3.5 h-3.5" />
                      <span>{t('lessons_playlist')}</span>
                    </h4>

                    {course.lessons.map((lesson, idx) => {
                      const isThisLessonPlaying =
                        currentTrack?.id === lesson.id && isPlaying;

                      return (
                        <div
                          key={lesson.id}
                          className="flex items-center justify-between p-3 rounded-xl bg-white border border-[#C5A880]/20 hover:border-[#0F382C]/40 transition text-xs font-readex"
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-6 h-6 rounded-full bg-[#F4EFE6] text-[#0F382C] font-bold flex items-center justify-center text-[11px]">
                              {idx + 1}
                            </span>
                            <span className="font-medium text-[#1E1E1E]">
                              {lesson.title}
                            </span>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="text-[#A58455] font-latin tabular-nums">
                              {lesson.duration}
                            </span>
                            <button
                              onClick={() =>
                                playTrack({
                                  id: lesson.id,
                                  title: lesson.title,
                                  series: course.title,
                                  category: course.category,
                                  level: course.level,
                                  levelId: course.levelId,
                                  audioUrl: lesson.audioUrl,
                                  duration: lesson.duration,
                                })
                              }
                              className="p-1.5 rounded-full bg-[#0F382C] text-white hover:bg-[#164E3D] transition shadow-sm"
                              title={t('play_this_lesson')}
                            >
                              {isThisLessonPlaying ? (
                                <Pause className="w-3.5 h-3.5 fill-current" />
                              ) : (
                                <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
