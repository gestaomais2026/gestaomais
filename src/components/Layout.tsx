import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import WPLogo from '@/components/WPLogo';
import {
  LayoutDashboard, Users, Calendar, ClipboardList, Activity,
  Stethoscope, DollarSign, LogOut, Menu, X
} from 'lucide-react';

export type Page = 'dashboard' | 'patients' | 'appointments' | 'consultations' | 'plans' | 'followups' | 'doctors' | 'financeiro';

type NavItem = { id: Page; label: string; icon: React.ElementType };

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'patients', label: 'Pacientes', icon: Users },
  { id: 'appointments', label: 'Agenda', icon: Calendar },
  { id: 'consultations', label: 'Consultas', icon: ClipboardList },
  { id: 'plans', label: 'Planos Alimentares', icon: Activity },
  { id: 'followups', label: 'Acompanhamento', icon: Activity },
  { id: 'doctors', label: 'Médicos Referentes', icon: Stethoscope },
  { id: 'financeiro', label: 'Contas a Receber', icon: DollarSign },
];

export default function Layout({ currentPage, onNavigate, children }: {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  children: React.ReactNode;
}) {
  const { profile, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const fullName = profile?.full_name || 'Nutricionista';

  return (
    <div className="min-h-screen bg-[#F5F2E8] flex">
      {/* Sidebar */}
      <aside className={`
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-50
        w-64 bg-[#4F4E3A] flex flex-col transition-transform duration-300 ease-in-out
      `}>
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#F5F2E8] flex items-center justify-center shadow-md overflow-hidden">
              <WPLogo size={32} />
            </div>
            <div>
              <h2 className="text-white font-serif font-bold text-sm leading-tight">Wanessa Pinheiro</h2>
              <p className="text-[#C4A77D] text-xs uppercase tracking-wide">Gestão Mais</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => { onNavigate(item.id); setMobileOpen(false); }}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all
                  ${active
                    ? 'bg-[#F5F2E8] text-[#4F4E3A] shadow-lg'
                    : 'text-[#D5CFBE] hover:bg-white/10 hover:text-white'}
                `}
              >
                <Icon size={20} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 mb-3 px-2">
            <div className="w-10 h-10 rounded-full bg-[#C4A77D] flex items-center justify-center text-[#4F4E3A] font-bold text-sm">
              {fullName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{fullName}</p>
              <p className="text-[#C4A77D] text-xs capitalize">{profile?.role || 'Nutricionista'}</p>
            </div>
          </div>
          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-[#D5CFBE] hover:bg-red-500/20 hover:text-red-300 transition-all"
          >
            <LogOut size={20} />
            Sair
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="bg-white border-b border-[#E0D9C3] px-4 lg:px-8 py-4 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden text-[#4F4E3A] p-2 -ml-2"
            >
              {mobileOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            <h1 className="text-lg font-serif font-bold text-[#4F4E3A]">
              {navItems.find(n => n.id === currentPage)?.label}
            </h1>
          </div>
          <div className="text-sm text-[#8C8B6E] hidden sm:block">
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
