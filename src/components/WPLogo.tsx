import React from 'react';

export default function WPLogo({ className = '', size = 48 }: {
  className?: string;
  color?: string;
  size?: number;
}) {
  return (
    <img
      src="/assets/logo_Wanessa-removebg-preview.png"
      alt="Wanessa Pinheiro Logo"
      width={size}
      height={size}
      className={className}
      style={{ objectFit: 'contain' }}
    />
  );
}
