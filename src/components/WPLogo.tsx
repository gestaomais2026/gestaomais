import React from 'react';

export default function WPLogo({ className = '', color = '#4F4E3A', size = 48 }: {
  className?: string;
  color?: string;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* W letter */}
      <path
        d="M8 18 L24 72 L38 40 L52 72 L68 18"
        stroke={color}
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* P circle */}
      <circle cx="88" cy="38" r="20" stroke={color} strokeWidth="4.5" fill="none" />
      {/* P stem */}
      <line x1="68" y1="18" x2="68" y2="82" stroke={color} strokeWidth="4.5" strokeLinecap="round" />
      {/* Leaf left */}
      <path
        d="M14 68 C6 74 2 82 8 88 C14 80 20 74 14 68Z"
        fill={color}
        opacity="0.85"
      />
      {/* Leaf right */}
      <path
        d="M62 68 C70 74 74 82 68 88 C62 80 56 74 62 68Z"
        fill={color}
        opacity="0.85"
      />
      {/* Decorative curve bottom of W */}
      <path
        d="M8 88 Q38 96 68 88"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
        opacity="0.6"
      />
    </svg>
  );
}
