import React from 'react';

interface OmniStockLogoProps {
  /**
   * 'full': Complete lockup with icon, "OmniStock" text and tagline
   * 'horizontal': Icon + "OmniStock" text on one row (ideal for headers/navbars)
   * 'icon': Icon mark only (ideal for avatars, buttons, compact badges)
   * 'image': Renders the generated raster logo asset
   */
  variant?: 'full' | 'horizontal' | 'icon' | 'image';
  /**
   * Size presets or custom height classes
   */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showTagline?: boolean;
  tagline?: string;
  className?: string;
  onClick?: () => void;
}

export const OmniStockLogo: React.FC<OmniStockLogoProps> = ({
  variant = 'horizontal',
  size = 'md',
  showTagline = true,
  tagline = 'Never Runout. Never Overstock',
  className = '',
  onClick,
}) => {
  // Size mapping for Icon
  const iconSizePx = {
    sm: 28,
    md: 38,
    lg: 56,
    xl: 76,
  }[size];

  // Font sizes for typography
  const textClasses = {
    sm: 'text-base',
    md: 'text-xl',
    lg: 'text-2xl sm:text-3xl',
    xl: 'text-3xl sm:text-4xl',
  }[size];

  const taglineClasses = {
    sm: 'text-[9px]',
    md: 'text-[10px]',
    lg: 'text-xs',
    xl: 'text-xs sm:text-sm',
  }[size];

  // The official OmniStock Icon Mark (Curved green arrow + 3D box with growth chart + checkmark badge)
  const renderIconMark = (customSize?: number) => {
    const s = customSize || iconSizePx;
    return (
      <svg
        width={s}
        height={s}
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 select-none drop-shadow-xs"
        aria-label="OmniStock Logo Mark"
      >
        {/* 1. Curved Circular Green Arrow */}
        <g id="circular-arrow">
          {/* Path curving clockwise from bottom-left to top-right */}
          <path
            d="M 62 142 A 66 66 0 1 1 148 64"
            fill="none"
            stroke="#16a34a"
            strokeWidth="13"
            strokeLinecap="round"
          />
          {/* Arrowhead at top-right pointing along curve tangent */}
          <polygon
            points="144,48 166,66 138,76"
            fill="#16a34a"
          />
        </g>

        {/* 2. 3D Isometric Shipping Box */}
        <g id="isometric-carton" transform="translate(4, 8)">
          {/* Top Face (Rhombus with seam) */}
          <path
            d="M 96 46 L 132 66 L 96 86 L 60 66 Z"
            fill="#122a46"
          />
          {/* Box Top Seam Tape */}
          <path
            d="M 78 56 L 114 76"
            stroke="#0b1c30"
            strokeWidth="2"
            strokeLinecap="round"
          />

          {/* Left Face (Navy with green growth chart bars) */}
          <path
            d="M 60 66 L 96 86 L 96 134 L 60 114 Z"
            fill="#0b2239"
          />

          {/* Chart Bars on Left Face */}
          {/* Bar 1 (Lowest) */}
          <polygon
            points="68,103 74,106 74,116 68,113"
            fill="#22c55e"
          />
          {/* Bar 2 (Medium) */}
          <polygon
            points="77,96 83,99 83,119 77,116"
            fill="#16a34a"
          />
          {/* Bar 3 (Highest) */}
          <polygon
            points="86,88 92,91 92,122 86,119"
            fill="#15803d"
          />

          {/* Right Face (Slightly darker navy shadow) */}
          <path
            d="M 96 86 L 132 66 L 132 114 L 96 134 Z"
            fill="#07192b"
          />
          {/* Right Face Fold Line Detail */}
          <path
            d="M 96 90 L 128 72"
            stroke="#0b2239"
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity="0.6"
          />
        </g>

        {/* 3. Green Circle Checkmark Badge (Bottom Right) */}
        <g id="check-badge" transform="translate(138, 126)">
          <circle cx="0" cy="0" r="23" fill="white" />
          <circle cx="0" cy="0" r="20" fill="#16a34a" />
          {/* Checkmark icon */}
          <path
            d="M -7 -1 L -2 5 L 8 -6"
            fill="none"
            stroke="white"
            strokeWidth="4.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      </svg>
    );
  };

  // 1. Icon Only
  if (variant === 'icon') {
    return (
      <div
        className={`inline-flex items-center justify-center ${onClick ? 'cursor-pointer hover:scale-105 transition-transform' : ''} ${className}`}
        onClick={onClick}
      >
        {renderIconMark()}
      </div>
    );
  }

  // 2. Full Lockup (Stacked Icon + "OmniStock" + Tagline)
  if (variant === 'full') {
    return (
      <div
        className={`flex flex-col items-center text-center ${onClick ? 'cursor-pointer' : ''} ${className}`}
        onClick={onClick}
      >
        {renderIconMark(size === 'xl' ? 84 : size === 'lg' ? 68 : 52)}

        <div className="mt-2.5 flex items-center justify-center tracking-tight leading-none">
          <span className={`font-black ${textClasses} text-[#0b2545]`}>
            Omni
          </span>
          <span className={`font-black ${textClasses} text-[#16a34a]`}>
            Stock
          </span>
        </div>

        {showTagline && (
          <p
            className={`mt-1 font-semibold text-slate-600 ${taglineClasses} tracking-tight select-none`}
          >
            {tagline}
          </p>
        )}
      </div>
    );
  }

  // 3. Horizontal Lockup (Icon + Typography side-by-side)
  return (
    <div
      className={`inline-flex items-center gap-2.5 ${onClick ? 'cursor-pointer group' : ''} ${className}`}
      onClick={onClick}
    >
      <div className={onClick ? 'group-hover:scale-105 transition-transform' : ''}>
        {renderIconMark()}
      </div>

      <div className="flex flex-col items-start leading-none select-none">
        <div className="flex items-center tracking-tight">
          <span className={`font-extrabold ${textClasses} text-[#0b2545]`}>
            Omni
          </span>
          <span className={`font-extrabold ${textClasses} text-[#16a34a]`}>
            Stock
          </span>
        </div>
        {showTagline && (
          <span
            className={`text-[9.5px] font-medium text-slate-500 tracking-tight mt-0.5 hidden sm:inline-block`}
          >
            {tagline}
          </span>
        )}
      </div>
    </div>
  );
};
