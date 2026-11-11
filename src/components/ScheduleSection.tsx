import React, { useState } from 'react';
import { ScheduleData, StudentQuestion } from '../types';
import { useLanguage } from '../context/LanguageContext';
import {
  Calendar,
  Clock,
  MapPin,
  Send,
  MessageCircle,
  Radio,
  Globe,
  Bell,
  CheckCircle,
  HelpCircle,
  Search
} from 'lucide-react';

interface ScheduleSectionProps {
  scheduleData: ScheduleData;
  questions: StudentQuestion[];
  whatsappNumber: string;
  onQuestionSubmitted: (q: StudentQuestion) => void;
}

export const ScheduleSection: React.FC<ScheduleSectionProps> = ({
  scheduleData,
  questions,
  whatsappNumber,
  onQuestionSubmitted
}) => {
  const { lang, t, translateCategory, translateDay, translateTime } = useLanguage();

  // Question Form State
  const [studentName, setStudentName] = useState('');
  const [questionText, setQuestionText] = useState('');
  const [questionCategory, setQuestionCategory] = useState('العقيدة والتوحيد');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [questionSearch, setQuestionSearch] = useState('');

  const handleSubmitQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionText.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentName: studentName.trim() || (lang === 'ar' ? 'طالب علم' : 'Student of Knowledge'),
          question: questionText.trim(),
          category: questionCategory
        })
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          onQuestionSubmitted(json.data);
        }
        setSubmitSuccess(true);
        setQuestionText('');
        setTimeout(() => setSubmitSuccess(false), 5000);
      }
    } catch (err) {
      console.error('Failed to submit question:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredQuestions = questions.filter(q => {
    if (!questionSearch.trim()) return true;
    const query = questionSearch.toLowerCase();
    return (
      q.question.toLowerCase().includes(query) ||
      (q.answer && q.answer.toLowerCase().includes(query)) ||
      q.studentName.toLowerCase().includes(query)
    );
  });

  const sendQuestionViaWhatsApp = () => {
    const text = encodeURIComponent(
      lang === 'ar'
        ? `السلام عليكم ورحمة الله وبركاته يا شيخنا الفاضل أبا سعيد ابن بيضاء.\n\nالاسم: ${studentName || 'طالب علم'}\nالفن: ${questionCategory}\nالسؤال: ${questionText}\n\nنفع الله بعلمكم وجزاكم خيراً.`
        : `As-Salāmu ‘alaykum wa Raḥmatullāhi wa Barakātuh, Ustādh Abu Sa'eed Ibn Baydoah.\n\nName: ${studentName || 'Student of Knowledge'}\nDiscipline: ${translateCategory(questionCategory)}\nInquiry: ${questionText}\n\nMay Allah reward and preserve you.`
    );
    window.open(`https://wa.me/${whatsappNumber.replace(/[^0-9]/g, '')}?text=${text}`, '_blank');
  };

  const englishAcademyFeatures = [
    "High-fidelity live stream broadcasts of in-person circles from Markaz Sībawayh in Ilorin",
    "Comprehensive study notes, summaries, and transcripts distributed in PDF format",
    "Weekly interactive revision and Q&A sessions addressing students' theological & grammatical inquiries",
    "Periodic structured assessments with completion certifications for studied classical texts"
  ];

  return (
    <div className="space-y-12 sm:space-y-20">
      {/* Schedule Banner */}
      <div className="bg-[#0F382C] text-[#FDFBF7] rounded-3xl p-8 sm:p-12 relative overflow-hidden shadow-xl">
        <div className="absolute inset-0 bg-arabesque-dark opacity-30 pointer-events-none" />
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#C5A880]/20 border border-[#C5A880]/40 text-[#DFC7A5] text-xs font-readex">
            <MapPin className="w-3.5 h-3.5" />
            <span className="font-semibold">{t('schedule_header_badge')}</span>
          </div>
          <h2 className="font-amiri font-bold text-3xl sm:text-4xl text-[#FDFBF7]">
            {t('schedule_header_title')}
          </h2>
          <p className="font-naskh text-[#DFC7A5]/90 text-sm sm:text-base leading-[2.1]">
            {t('schedule_header_desc')}
          </p>
        </div>
      </div>

      {/* 1. In-Person Weekly Circles */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="font-amiri font-bold text-2xl sm:text-3xl text-[#0F382C] flex items-center gap-2.5">
            <Calendar className="w-6 h-6 text-[#A58455]" />
            <span>{t('weekly_circles')}</span>
          </h3>
          <span className="text-xs font-readex text-[#8C6D3B] bg-[#F4EFE6] px-3.5 py-1 rounded-full border border-[#E8DCC9] font-bold">
            {t('in_person_and_stream')}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-10">
          {scheduleData.weeklyCircles.map((circle, index) => {
            const dayLabel = lang === 'ar' ? `يوم ${circle.day}` : circle.dayEnglish || translateDay(circle.day);
            const timeLabel = lang === 'ar' ? circle.time : (circle.timeEnglish || translateTime(circle.time));
            const locationLabel = lang === 'ar' ? circle.location : (circle.locationEnglish || "Markaz Al-Imām Sībawayh, Oloje Road, Ilorin");
            const typeLabel = lang === 'ar' ? circle.type : "In-Person & Live Stream";

            return (
              <div
                key={circle.id || index}
                className="bg-white rounded-3xl border border-[#E8DCC9] shadow-[0_2px_12px_-2px_rgba(15,56,44,0.04)] hover:shadow-lg hover:border-[#0F382C]/30 p-7 sm:p-8 transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  {/* Day Badge */}
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-amiri font-bold text-2xl text-[#0F382C] bg-[#FAF6EE] px-4 py-1.5 rounded-xl border border-[#E8DCC9]">
                      {dayLabel}
                    </span>
                    <span className="text-[11px] font-readex px-2.5 py-0.5 rounded bg-[#0F382C]/10 text-[#0F382C] font-semibold">
                      {translateCategory(circle.category)}
                    </span>
                  </div>

                  {/* Subject & Book */}
                  <h4 className="font-amiri font-bold text-xl text-[#0F382C] mb-3 leading-snug">
                    {circle.subject}
                  </h4>

                  {/* Time & Location */}
                  <div className="space-y-2 text-xs font-readex text-[#1E1E1E]/80 mb-4">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-[#A58455] shrink-0" />
                      <span>{timeLabel}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-[#A58455] shrink-0" />
                      <span>{locationLabel}</span>
                    </div>
                  </div>
                </div>

                {/* Tag indicator */}
                <div className="pt-3 border-t border-[#C5A880]/20 flex items-center justify-between text-xs font-readex text-[#0F382C]">
                  <span className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                    <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-600" />
                    <span>{typeLabel}</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Virtual Distance Learning Academy */}
      <div className="bg-gradient-to-br from-[#164E3D] to-[#0F382C] text-[#FDFBF7] rounded-3xl p-6 sm:p-10 shadow-xl relative overflow-hidden">
        <div className="absolute inset-0 bg-arabesque-dark opacity-30 pointer-events-none" />
        <div className="relative z-10 max-w-4xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#C5A880]/20 border border-[#C5A880]/40 text-[#DFC7A5] text-xs font-readex mb-3">
            <Globe className="w-3.5 h-3.5" />
            <span>{t('virtual_academy_badge')}</span>
          </div>

          <h3 className="font-amiri font-bold text-2xl sm:text-3xl text-[#FDFBF7] mb-3">
            {lang === 'ar' ? scheduleData.distanceAcademy.name : "Virtual Scholarly Academy of Ustādh Abu Sa'eed Ibn Baydoah"}
          </h3>

          <p className="font-naskh text-[#DFC7A5]/90 text-sm sm:text-base leading-relaxed mb-6">
            {lang === 'ar'
              ? scheduleData.distanceAcademy.description
              : "A comprehensive virtual distance-learning structure connecting students of knowledge across Nigeria and the globe via Telegram channels, high-definition live audio broadcasts, weekly discussion circles, and classical text certifications."}
          </p>

          {/* Features Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8 font-readex text-xs sm:text-sm">
            {(lang === 'ar' ? scheduleData.distanceAcademy.features : englishAcademyFeatures).map((feat, i) => (
              <div
                key={i}
                className="flex items-start gap-2.5 p-3 rounded-xl bg-white/10 border border-[#C5A880]/30"
              >
                <CheckCircle className="w-4 h-4 text-[#DFC7A5] shrink-0 mt-0.5" />
                <span>{feat}</span>
              </div>
            ))}
          </div>

          {/* Links */}
          <div className="flex flex-wrap items-center gap-4">
            <a
              href={scheduleData.distanceAcademy.telegramLink}
              target="_blank"
              rel="noreferrer"
              className="px-5 py-2.5 rounded-xl bg-[#C5A880] text-[#0F382C] font-readex text-xs font-bold flex items-center gap-2 shadow hover:bg-[#DFC7A5] transition"
            >
              <Send className="w-4 h-4" />
              <span>{t('telegram_channel_btn')}</span>
            </a>

            <a
              href={`https://wa.me/${whatsappNumber.replace(/[^0-9]/g, '')}`}
              target="_blank"
              rel="noreferrer"
              className="px-5 py-2.5 rounded-xl bg-white/10 border border-[#C5A880]/40 text-white font-readex text-xs font-medium flex items-center gap-2 hover:bg-white/20 transition"
            >
              <MessageCircle className="w-4 h-4 text-[#DFC7A5]" />
              <span>{t('whatsapp_group_btn')}</span>
            </a>
          </div>
        </div>
      </div>

      {/* 3. Announcements Board */}
      {scheduleData.announcements && scheduleData.announcements.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-amiri font-bold text-2xl text-[#0F382C] flex items-center gap-2">
            <Bell className="w-6 h-6 text-[#A58455]" />
            <span>{t('announcements')}</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {scheduleData.announcements.map(ann => {
              const badgeLabel =
                ann.badge === 'دورة جديدة'
                  ? t('new_course_badge')
                  : ann.badge === 'إعلان صوتي'
                  ? t('audio_announcement_badge')
                  : ann.badge;

              return (
                <div
                  key={ann.id}
                  className="bg-white rounded-2xl border border-[#C5A880]/30 p-5 shadow-sm space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-readex font-bold">
                      {badgeLabel}
                    </span>
                    <span className="text-xs text-[#A58455] font-readex">{ann.date}</span>
                  </div>
                  <h4 className="font-amiri font-bold text-xl text-[#0F382C]">
                    {ann.title}
                  </h4>
                  <p className="font-naskh text-sm text-[#1E1E1E]/80 leading-relaxed">
                    {ann.details}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. Student Question Box */}
      <div className="bg-white rounded-3xl border border-[#E8DCC9] p-8 sm:p-12 shadow-sm space-y-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#0F382C]/10 text-[#0F382C] border border-[#E8DCC9] text-xs font-readex mb-3 font-semibold">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>{t('question_box_badge')}</span>
          </div>
          <h3 className="font-amiri font-bold text-3xl sm:text-4xl text-[#0F382C]">
            {t('question_box_title')}
          </h3>
          <p className="font-naskh text-[#343C37] text-sm sm:text-base leading-[2] mt-2">
            {t('question_box_desc')}
          </p>
        </div>

        {/* Question Submission Form */}
        <form onSubmit={handleSubmitQuestion} className="space-y-6 max-w-3xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-readex font-bold text-[#1E1E1E] mb-2">
                {t('your_name')}
              </label>
              <input
                type="text"
                value={studentName}
                onChange={e => setStudentName(e.target.value)}
                placeholder={t('student_name_placeholder')}
                className="w-full px-4 py-3 rounded-xl border border-[#E0D4C1] bg-[#FDFBF7] text-xs sm:text-sm font-readex focus:outline-none focus:ring-2 focus:ring-[#0F382C]/30 focus:border-[#0F382C]"
              />
            </div>

            <div>
              <label className="block text-xs font-readex font-bold text-[#1E1E1E] mb-2">
                {t('select_science')}
              </label>
              <select
                value={questionCategory}
                onChange={e => setQuestionCategory(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-[#E0D4C1] bg-[#FDFBF7] text-xs sm:text-sm font-readex focus:outline-none focus:ring-2 focus:ring-[#0F382C]/30 focus:border-[#0F382C]"
              >
                <option value="العقيدة والتوحيد">{translateCategory("العقيدة والتوحيد")}</option>
                <option value="الفقه وأصوله">{translateCategory("الفقه وأصوله")}</option>
                <option value="الحديث وعلومه">{translateCategory("الحديث وعلومه")}</option>
                <option value="النحو والصرف">{translateCategory("النحو والصرف")}</option>
                <option value="الأدب والبلاغة واللغة">{translateCategory("الأدب والبلاغة واللغة")}</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-readex font-bold text-[#1E1E1E] mb-2">
              {t('your_question')} *
            </label>
            <textarea
              rows={4}
              value={questionText}
              onChange={e => setQuestionText(e.target.value)}
              placeholder={t('question_text_placeholder')}
              required
              className="w-full p-4 rounded-xl border border-[#E0D4C1] bg-[#FDFBF7] text-xs sm:text-sm font-readex focus:outline-none focus:ring-2 focus:ring-[#0F382C]/30 focus:border-[#0F382C] leading-relaxed"
            />
          </div>

          {submitSuccess && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-readex flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span>{t('sent_successfully')} {t('sent_success_note')}</span>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-3 rounded-xl bg-[#0F382C] text-white hover:bg-[#164E3D] font-readex text-xs font-bold flex items-center gap-2 shadow disabled:opacity-50"
            >
              <Send className="w-4 h-4 text-[#DFC7A5]" />
              <span>{isSubmitting ? t('submitting') : t('submit_question')}</span>
            </button>

            <button
              type="button"
              onClick={sendQuestionViaWhatsApp}
              className="px-5 py-3 rounded-xl bg-[#25D366]/15 text-[#0F382C] hover:bg-[#25D366]/25 border border-[#25D366]/40 font-readex text-xs font-bold flex items-center gap-2"
            >
              <MessageCircle className="w-4 h-4 text-emerald-600" />
              <span>{t('send_direct_whatsapp')}</span>
            </button>
          </div>
        </form>

        {/* Answered Questions Library */}
        <div className="pt-8 border-t border-[#C5A880]/30 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h4 className="font-amiri font-bold text-2xl text-[#0F382C]">
              {t('faq_title')}
            </h4>
            <div className="relative w-full sm:max-w-xs">
              <input
                type="text"
                value={questionSearch}
                onChange={e => setQuestionSearch(e.target.value)}
                placeholder={t('search_questions_placeholder')}
                className="w-full pl-8 pr-8 py-2 text-xs rounded-xl border border-[#C5A880]/40 font-readex"
              />
              <Search className="w-3.5 h-3.5 text-[#A58455] absolute top-2.5 right-2.5 rtl:right-2.5 ltr:left-2.5 ltr:right-auto" />
            </div>
          </div>

          <div className="space-y-4">
            {filteredQuestions.map(item => (
              <div
                key={item.id}
                className="p-5 rounded-2xl bg-[#FDFBF7] border border-[#C5A880]/30 space-y-3"
              >
                <div className="flex items-center justify-between text-xs font-readex">
                  <span className="font-bold text-[#0F382C] flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#A58455]" />
                    <span>{t('inquirer')}: {item.studentName}</span>
                  </span>
                  <span className="text-[#A58455]">
                    {translateCategory(item.category)} • {item.date}
                  </span>
                </div>

                <div className="font-naskh text-sm font-semibold text-[#1E1E1E]">
                  «{item.question}»
                </div>

                {item.answer ? (
                  <div className="p-4 rounded-xl bg-white border border-[#C5A880]/30 font-naskh text-sm leading-relaxed text-[#0F382C]">
                    <span className="font-bold block mb-1 text-xs text-[#A58455] font-readex">
                      {t('shaykh_answer')}
                    </span>
                    {item.answer}
                  </div>
                ) : (
                  <div className="text-xs text-[#A58455] font-readex italic">
                    {t('under_review')}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
