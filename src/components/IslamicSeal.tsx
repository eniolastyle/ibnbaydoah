import React from 'react';

interface IslamicSealProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'emerald' | 'gold' | 'light';
  showSubtitle?: boolean;
}

export const IslamicSeal: React.FC<IslamicSealProps> = ({
  size = 'md',
  variant = 'emerald',
  showSubtitle = false,
}) => {
  const sizeMap = {
    sm: 'w-10 h-10',
    md: 'w-16 h-16',
    lg: 'w-24 h-24',
    xl: 'w-36 h-36',
  };

  const isLight = variant === 'light';
  const starBg = isLight ? '#C5A880' : variant === 'gold' ? '#DFC7A5' : '#0F382C';
  const strokeColor = isLight ? '#FFFFFF' : '#C5A880';
  const innerCircleBg = isLight ? '#0F382C' : '#164E3D';
  const textColor = '#DFC7A5';

  return (
    <div className="flex flex-col items-center justify-center select-none">
      <div className={`relative ${sizeMap[size]} transition-transform duration-300 hover:scale-105`}>
        <svg
          viewBox="0 0 160 160"
          className="w-full h-full drop-shadow-md"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Outer Islamic 8-Pointed Star (Rub el Hizb) */}
          <g transform="translate(80, 80)">
            <rect
              x="-68"
              y="-68"
              width="136"
              height="136"
              fill={starBg}
              stroke={strokeColor}
              strokeWidth="2.5"
              rx="4"
            />
            <rect
              x="-68"
              y="-68"
              width="136"
              height="136"
              fill={starBg}
              stroke={strokeColor}
              strokeWidth="2.5"
              rx="4"
              transform="rotate(45)"
            />
          </g>

          {/* Ornamental Inner Gold Border */}
          <circle
            cx="80"
            cy="80"
            r="60"
            fill="none"
            stroke={strokeColor}
            strokeWidth="1.5"
            strokeDasharray="4 2"
          />

          {/* Middle Disc */}
          <circle
            cx="80"
            cy="80"
            r="54"
            fill={innerCircleBg}
            stroke={strokeColor}
            strokeWidth="2"
          />

          {/* Concentric Delicate Ring */}
          <circle
            cx="80"
            cy="80"
            r="48"
            fill="none"
            stroke={strokeColor}
            strokeWidth="0.75"
            opacity="0.8"
          />

          {/* Islamic Floral Corner Accents */}
          <circle cx="80" cy="30" r="2" fill={strokeColor} />
          <circle cx="80" cy="130" r="2" fill={strokeColor} />
          <circle cx="30" cy="80" r="2" fill={strokeColor} />
          <circle cx="130" cy="80" r="2" fill={strokeColor} />

          {/* Pure Arabesque Calligraphic Monogram Emblem */}
          <g fill={textColor} textAnchor="middle" className="font-amiri select-none">
            {/* Top honorific */}
            <text x="80" y="58" fontSize="12" fontWeight="bold" letterSpacing="0.5">
              أَبُو سَعِيدٍ
            </text>

            {/* Central Master Line */}
            <text x="80" y="86" fontSize="19" fontWeight="bold">
              ابْنُ بَيْضَاءَ
            </text>

            {/* Sub-line */}
            <text x="80" y="108" fontSize="10" opacity="0.9" letterSpacing="1">
              مَسْعُودُ بْنُ مَحْمُودٍ
            </text>
          </g>

          {/* Bottom ornamental crescent symbol */}
          <path
            d="M 72 120 Q 80 124 88 120 Q 80 122 72 120 Z"
            fill={strokeColor}
          />
        </svg>
      </div>

      {showSubtitle && (
        <div className="mt-2 text-center">
          <span className="font-amiri text-sm font-bold text-[#0F382C] block">
            أبو سعيد ابن بيضاء
          </span>
          <span className="text-[10px] text-[#A58455] tracking-wider font-readex uppercase">
            Markaz Sībawayh • Ilorin
          </span>
        </div>
      )}
    </div>
  );
};
