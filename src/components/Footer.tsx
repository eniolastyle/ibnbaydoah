import React from 'react';
import { IslamicSeal } from './IslamicSeal';
import { Profile } from '../types';
import { useLanguage } from '../context/LanguageContext';
import {
  MapPin,
  Clock,
  MessageCircle,
  Send,
  Youtube,
  Mail,
  Shield,
  BookOpen,
  Headphones,
  Feather
} from 'lucide-react';

interface FooterProps {
  profile: Profile;
  onNavigate: (tab: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ profile, onNavigate }) => {
  const { lang, t } = useLanguage();

  const displayedName =
    lang === 'ar' ? profile.name : (profile.englishName || "Abu Sa'eed Mas'uud bn Mahmood Ibn Baydoah");
  const displayedTitle =
    lang === 'ar' ? profile.title : (profile.englishTitle || "Student of Knowledge & Researcher in Shari'ah and Arabic Linguistic Sciences");
  const displayedDegree =
    lang === 'ar' ? profile.degree : (profile.englishDegree || "B.A. in Arabic Language & Islamic Studies (First Class Honours) - Bayero University Kano");
  const displayedLocation =
    lang === 'ar' ? profile.location : (profile.locationEnglish || "Markaz Al-Imām Sībawayh, Oloje Road, Ilorin, Kwara State, Nigeria");
  const displayedSchedule =
    lang === 'ar' ? profile.teaching_schedule : (profile.teachingScheduleEnglish || "Friday, Saturday, & Sunday (After 'Asr to before Maghrib)");

  return (
    <footer className="bg-[#0F382C] text-[#FDFBF7] border-t border-[#C5A880]/30 relative overflow-hidden">
      {/* Arabesque geometric background */}
      <div className="absolute inset-0 bg-arabesque-dark opacity-40 pointer-events-none" />

      {/* Decorative Gold Top Edge */}
      <div className="h-1 bg-gradient-to-r from-[#C5A880]/20 via-[#DFC7A5] to-[#C5A880]/20" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-24 lg:pb-16 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Column 1: Scholar Branding & Seal */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-4">
              <IslamicSeal size="lg" variant="emerald" />
              <div>
                <h3 className="font-amiri font-bold text-2xl text-[#DFC7A5]">
                  {displayedName}
                </h3>
                <p className="text-xs text-[#DFC7A5]/80 font-readex">
                  {displayedTitle}
                </p>
                <p className="text-[11px] text-[#A58455] font-readex mt-0.5">
                  {displayedDegree}
                </p>
              </div>
            </div>

            <p className="font-naskh text-xs sm:text-sm text-white/80 leading-relaxed max-w-lg">
              {t('motto')}
              <br />
              {t('footer_desc')}
            </p>

            {/* Religious constraint notice */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-black/20 border border-[#C5A880]/30 text-[11px] font-readex text-[#DFC7A5]/90">
              <Shield className="w-3.5 h-3.5 text-[#DFC7A5]" />
              <span>{t('no_human_imagery_notice')}</span>
            </div>
          </div>

          {/* Column 2: Quick Links */}
          <div className="space-y-3 font-readex text-xs">
            <h4 className="font-amiri font-bold text-lg text-[#DFC7A5] border-b border-[#C5A880]/30 pb-2">
              {t('footer_sections')}
            </h4>
            <ul className="space-y-2">
              <li>
                <button
                  onClick={() => onNavigate('library')}
                  className="hover:text-[#DFC7A5] transition flex items-center gap-1.5"
                >
                  <BookOpen className="w-3.5 h-3.5 text-[#A58455]" />
                  <span>{t('library')}</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('audios')}
                  className="hover:text-[#DFC7A5] transition flex items-center gap-1.5"
                >
                  <Headphones className="w-3.5 h-3.5 text-[#A58455]" />
                  <span>{t('audios')}</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('poetry')}
                  className="hover:text-[#DFC7A5] transition flex items-center gap-1.5"
                >
                  <Feather className="w-3.5 h-3.5 text-[#A58455]" />
                  <span>{t('poetry')}</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('articles')}
                  className="hover:text-[#DFC7A5] transition flex items-center gap-1.5"
                >
                  <span>{t('articles')}</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('schedule')}
                  className="hover:text-[#DFC7A5] transition flex items-center gap-1.5"
                >
                  <span>{t('schedule')}</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('admin')}
                  className="text-[#DFC7A5]/80 hover:text-white transition"
                >
                  <span>{t('admin')}</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Column 3: In-Person Center & Official Channels */}
          <div className="space-y-3 font-readex text-xs">
            <h4 className="font-amiri font-bold text-lg text-[#DFC7A5] border-b border-[#C5A880]/30 pb-2">
              {t('footer_contact')}
            </h4>

            <div className="space-y-2.5 text-white/80">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-[#DFC7A5] shrink-0 mt-0.5" />
                <span>{displayedLocation}</span>
              </div>
              <div className="flex items-start gap-2">
                <Clock className="w-4 h-4 text-[#DFC7A5] shrink-0 mt-0.5" />
                <span>{displayedSchedule}</span>
              </div>
            </div>

            <div className="pt-2 flex flex-wrap gap-2">
              <a
                href={`https://wa.me/${profile.whatsapp.replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noreferrer"
                className="p-2 rounded-xl bg-white/10 hover:bg-[#25D366]/30 text-white border border-[#C5A880]/30 transition"
                title="WhatsApp"
              >
                <MessageCircle className="w-4 h-4 text-emerald-400" />
              </a>

              {profile.telegram && (
                <a
                  href={profile.telegram}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 rounded-xl bg-white/10 hover:bg-[#0088cc]/30 text-white border border-[#C5A880]/30 transition"
                  title="Telegram"
                >
                  <Send className="w-4 h-4 text-sky-400" />
                </a>
              )}

              {profile.youtube && (
                <a
                  href={profile.youtube}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 rounded-xl bg-white/10 hover:bg-red-900/30 text-white border border-[#C5A880]/30 transition"
                  title="YouTube"
                >
                  <Youtube className="w-4 h-4 text-red-400" />
                </a>
              )}

              {profile.email && (
                <a
                  href={`mailto:${profile.email}`}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-[#C5A880]/30 transition"
                  title="Email"
                >
                  <Mail className="w-4 h-4 text-[#DFC7A5]" />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Copyright & Islamic Seal Ribbon */}
        <div className="pt-8 border-t border-[#C5A880]/30 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-readex text-white/60">
          <div>
            {t('footer_rights')} {new Date().getFullYear()}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-[#DFC7A5]">
            <span>{t('footer_service')}</span>
            <span>•</span>
            <span>Ilorin, Nigeria</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
