import { useEffect, useState } from 'react';
import { supabase, Patient, Appointment, Consultation } from '@/lib/supabase';
import { Users, Calendar, ClipboardList, TrendingUp, Clock, Activity } from 'lucide-react';
import type { Page } from '@/components/Layout';

export default function Dashboard({ onNavigate }: { onNavigate: (page: Page) => void }) {
  const [stats, setStats] = useState({
    totalPatients: 0,
    activePatients: 0,
    upcomingAppointments: 0,
    completedConsultations: 0,
  });
  const [recentAppointments, setRecentAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();

      const [patients, activeP, appts, consults, recent] = await Promise.all([
        supabase.from('patients').select('*', { count: 'exact', head: true }),
        supabase.from('patients').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('appointments').select('*', { count: 'exact', head: true }).gte('scheduled_at', startOfDay).in('status', ['scheduled', 'confirmed']),
        supabase.from('consultations').select('*', { count: 'exact', head: true }),
        supabase.from('appointments').select('*, patient:patients(*)').order('scheduled_at', { ascending: true }).gte('scheduled_at', startOfDay).limit(5),
      ]);

      setStats({
        totalPatients: patients.count || 0,
        activePatients: activeP.count || 0,
        upcomingAppointments: appts.count || 0,
        completedConsultations: consults.count || 0,
      });
      setRecentAppointments((recent.data as Appointment[]) || []);
      setLoading(false);
    })();
  }, []);

  const cards = [
    { label: 'Pacientes Ativos', value: stats.activePatients, total: stats.totalPatients, icon: Users, color: 'from-[#8C8B6E] to-[#4F4E3A]', page: 'patients' as Page },
    { label: 'Agendamentos Próximos', value: stats.upcomingAppointments, icon: Calendar, color: 'from-[#C4A77D] to-[#A8865F]', page: 'appointments' as Page },
    { label: 'Consultas Realizadas', value: stats.completedConsultations, icon: ClipboardList, color: 'from-[#6B8E5A] to-[#4F6B3E]', page: 'consultations' as Page },
    { label: 'Total de Pacientes', value: stats.totalPatients, icon: TrendingUp, color: 'from-[#7A6A8B] to-[#5A4A6B]', page: 'patients' as Page },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-10 h-10 border-3 border-[#4F4E3A] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div className="bg-gradient-to-r from-[#4F4E3A] to-[#6B6A50] rounded-2xl p-6 lg:p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 right-1/4 w-40 h-40 bg-[#C4A77D]/10 rounded-full translate-y-1/2" />
        <div className="relative">
          <h2 className="text-2xl font-serif font-bold mb-2">Bem-vinda de volta</h2>
          <p className="text-[#D5CFBE] max-w-lg">
            Aqui está um resumo do seu consultório. Acompanhe seus pacientes, agendamentos e evoluções nutricionais em um só lugar.
          </p>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.label}
              onClick={() => onNavigate(card.page)}
              className="bg-white rounded-2xl p-6 shadow-sm border border-[#E0D9C3] hover:shadow-md transition-all text-left group"
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <Icon className="text-white" size={24} />
              </div>
              <p className="text-3xl font-bold text-[#4F4E3A]">{card.value}</p>
              <p className="text-sm text-[#8C8B6E] mt-1">{card.label}</p>
              {card.total !== undefined && (
                <p className="text-xs text-[#B8B099] mt-2">de {card.total} cadastrados</p>
              )}
            </button>
          );
        })}
      </div>

      {/* Upcoming appointments */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#E0D9C3] p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-serif font-bold text-[#4F4E3A] flex items-center gap-2">
            <Clock size={20} className="text-[#8C8B6E]" />
            Próximos Agendamentos
          </h3>
          <button
            onClick={() => onNavigate('appointments')}
            className="text-sm text-[#8C8B6E] hover:text-[#4F4E3A] font-medium transition-colors"
          >
            Ver todos →
          </button>
        </div>

        {recentAppointments.length === 0 ? (
          <div className="text-center py-12 text-[#8C8B6E]">
            <Calendar size={40} className="mx-auto mb-3 opacity-40" />
            <p>Nenhum agendamento próximo</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentAppointments.map((apt) => {
              const date = new Date(apt.scheduled_at);
              return (
                <div
                  key={apt.id}
                  className="flex items-center gap-4 p-4 rounded-xl bg-[#F5F2E8] hover:bg-[#EDE8D9] transition-colors"
                >
                  <div className="w-14 h-14 rounded-xl bg-white flex flex-col items-center justify-center shadow-sm flex-shrink-0">
                    <span className="text-xs text-[#8C8B6E] font-medium uppercase">
                      {date.toLocaleDateString('pt-BR', { month: 'short' })}
                    </span>
                    <span className="text-lg font-bold text-[#4F4E3A] leading-none">
                      {date.getDate()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[#4F4E3A] truncate">
                      {apt.patient?.name || 'Paciente'}
                    </p>
                    <p className="text-sm text-[#8C8B6E]">
                      {date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      {' · '}
                      {apt.type === 'first' ? 'Primeira consulta' :
                       apt.type === 'return' ? 'Retorno' :
                       apt.type === 'emergency' ? 'Emergência' : 'Online'}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize
                    ${apt.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                      apt.status === 'scheduled' ? 'bg-amber-100 text-amber-700' :
                      apt.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-600'}`}>
                    {apt.status === 'scheduled' ? 'Agendado' :
                     apt.status === 'confirmed' ? 'Confirmado' :
                     apt.status === 'completed' ? 'Realizado' :
                     apt.status === 'cancelled' ? 'Cancelado' : 'Faltou'}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
