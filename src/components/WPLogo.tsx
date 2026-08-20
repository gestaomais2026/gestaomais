export default function WPLogo({ className = '', size = 48 }: {
  className?: string;
  size?: number;
}) {
  return (
    <img
      src="/logo_Wanessa-removebg-preview.png"
      alt="Wanessa Pinho Logo"
      width={size}
      height={size}
      className={className}
      style={{ objectFit: 'contain' }}
    />
  );
}
