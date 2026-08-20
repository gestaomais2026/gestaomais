export default function WPLogo({ className = '', size = 48 }: {
  className?: string;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Wanessa Pinho"
    >
      <rect width="64" height="64" rx="14" fill="#4F4E3A" />
      <text
        x="32"
        y="42"
        textAnchor="middle"
        fontFamily="Georgia, serif"
        fontSize="28"
        fontWeight="700"
        fill="#F5F2E8"
      >
        WP
      </text>
      <circle cx="50" cy="14" r="4" fill="#C4A77D" />
    </svg>
  );
}
