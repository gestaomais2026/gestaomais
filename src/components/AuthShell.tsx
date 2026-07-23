import React from 'react';
import WPLogo from '@/components/WPLogo';

type Props = {
  children: React.ReactNode;
};

export default function AuthShell({ children }: Props) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#F5F2E8] via-[#EDE8D9] to-[#E0D9C3] p-4 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-[#8C8B6E]/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#C4A77D]/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
      <div className="absolute top-1/2 left-1/4 w-64 h-64 bg-[#4F4E3A]/5 rounded-full blur-3xl" />

      <div className="relative w-full max-w-md">
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/60 p-8 sm:p-10">
          {/* Logo + brand */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[#F5F2E8] to-[#E0D9C3] flex items-center justify-center shadow-lg mb-4 overflow-hidden">
              <WPLogo size={64} />
            </div>
            <h1 className="text-2xl font-serif font-bold text-[#4F4E3A] tracking-tight">
              Wanessa Pinheiro
            </h1>
            <p className="text-sm text-[#8C8B6E] font-medium tracking-wide uppercase mt-1">
              Gestão Mais
            </p>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}
