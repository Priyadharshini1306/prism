import React from 'react';

/**
 * PrismLogo — colorful multi-triangle prism logo matching the brand image.
 * The triangular prism shape is built from colored SVG polygon segments.
 * A play button sits in the hollow centre of the triangle.
 */
const PrismLogo = ({ size = 40, showText = false, textSize = 'text-2xl' }) => {
  return (
    <div className="flex items-center gap-2.5">
      {/* SVG Logo mark */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 90"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0 drop-shadow-lg"
      >
        {/* ── Outer Triangle segments (clockwise from top) ── */}

        {/* Top-left purple segment */}
        <polygon points="50,4 22,52 50,38" fill="#9333ea" />

        {/* Top-right magenta segment */}
        <polygon points="50,4 50,38 78,52" fill="#c026d3" />

        {/* Left outer teal segment */}
        <polygon points="22,52 8,76 36,76" fill="#0d9488" />

        {/* Left inner cyan segment */}
        <polygon points="22,52 36,76 50,62" fill="#06b6d4" />

        {/* Right inner green segment */}
        <polygon points="78,52 50,62 64,76" fill="#16a34a" />

        {/* Right outer lime segment */}
        <polygon points="78,52 64,76 92,76" fill="#65a30d" />

        {/* Bottom-left orange segment */}
        <polygon points="36,76 50,86 50,62" fill="#ea580c" />

        {/* Bottom-right yellow segment */}
        <polygon points="64,76 50,62 50,86" fill="#ca8a04" />

        {/* Bottom bar */}
        <polygon points="8,76 50,86 92,76" fill="#f97316" opacity="0.4" />

        {/* ── Play Button in the hollow centre ── */}
        {/* White triangle pointing right */}
        <polygon
          points="44,50 44,68 59,59"
          fill="white"
          opacity="0.95"
          filter="drop-shadow(0 0 4px rgba(255,255,255,0.6))"
        />
      </svg>

      {showText && (
        <span
          className={`font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 ${textSize}`}
        >
          PRISM
        </span>
      )}
    </div>
  );
};

export default PrismLogo;
