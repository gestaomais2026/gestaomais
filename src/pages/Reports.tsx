import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase, Patient, Appointment, Consultation, Doctor } from '@/lib/supabase';
import { Users, Stethoscope, ClipboardList, FileText, Download, Filter } from 'lucide-react';

type DoctorStat = {
  doctor: Doctor | null;
  patients: number;
  appointments: number;
  completedAppointments: number;
  consultations: number;
  patientsList: Patient[];
};

export default function Reports() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoctor, setSelectedDoctor] = useState<string>('all');

  const load = useCallback(async () => {
    setLoading(true);
    const [pRes, aRes, cRes, dRes] = await Promise.all([
      supabase.from('patients').select('*, doctor:doctors(*)').order('name'),
      supabase.from('appointments').select('*, patient:patients(*, doctor:doctors(*))'),
      supabase.from('consultations').select('*, patient:patients(*, doctor:doctors(*))'),
      supabase.from('doctors').select('*').order('name'),
    ]);
    setPatients((pRes.data as Patient[]) || []);
    setAppointments((aRes.data as Appointment[]) || []);
    setConsultations((cRes.data as Consultation[]) || []);
    setDoctors((dRes.data as Doctor[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const doctorStats = useMemo<DoctorStat[]>(() => {
    const map = new Map<string, DoctorStat>();

    const getStat = (doctor: Doctor | null): DoctorStat => {
      const key = doctor?.id ?? 'none';
      if (!map.has(key)) {
        map.set(key, {
          doctor,
          patients: 0,
          appointments: 0,
          completedAppointments: 0,
          consultations: 0,
          patientsList: [],
        });
      }
      return map.get(key)!;
    };

    patients.forEach((p) => {
      const stat = getStat(p.doctor ?? null);
      stat.patients += 1;
      stat.patientsList.push(p);
    });

    appointments.forEach((a) => {
      const doc = (a.patient as Patient)?.doctor ?? null;
      const stat = getStat(doc);
      stat.appointments += 1;
      if (a.status === 'completed') stat.completedAppointments += 1;
    });

    consultations.forEach((c) => {
      const doc = (c.patient as Patient)?.doctor ?? null;
      const stat = getStat(doc);
      stat.consultations += 1;
    });

    return Array.from(map.values()).sort((a, b) => {
      if (!a.doctor) return 1;
      if (!b.doctor) return -1;
      return a.doctor.name.localeCompare(b.doctor.name);
    });
  }, [patients, appointments, consultations]);

  const filteredStats = useMemo(() => {
    if (selectedDoctor === 'all') return doctorStats;
    return doctorStats.filter((s) => (s.doctor?.id ?? 'none') === selectedDoctor);
  }, [doctorStats, selectedDoctor]);

  const totals = useMemo(() => {
    return filteredStats.reduce(
      (acc, s) => ({
        patients: acc.patients + s.patients,
        appointments: acc.appointments + s.appointments,
        completedAppointments: acc.completedAppointments + s.completedAppointments,
        consultations: acc.consultations + s.consultations,
      }),
      { patients: 0, appointments: 0, completedAppointments: 0, consultations: 0 }
    );
  }, [filteredStats]);

  function exportCSV() {
    const rows = [
      ['Médico', 'Especialidade', 'Pacientes', 'Agendamentos', 'Realizados', 'Consultas'],
      ...filteredStats.map((s) => [
        s.doctor?.name ?? 'Sem médico referente',
        s.doctor?.specialty ?? '-',
        String(s.patients),
        String(s.appointments),
        String(s.completedAppointments),
        String(s.consultations),
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prestacao-contas-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-10 h-10 border-3 border-[#4F4E3A] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div className="flex items-center gap-2">
          <Filter size={18} className="text-[#8C8B6E]" />
          <select
            value={selectedDoctor}
            onChange={(e) => setSelectedDoctor(e.target.value)}
            className="px-4 py-3 rounded-xl border border-[#D5CFBE] bg-white focus:border-[#8C8B6E] outline-none text-[#4F4E3A] text-sm max-w-xs"
          >
            <option value="all">Todos os médicos</option>
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
            <option value="none">Sem médico referente</option>
          </select>
        </div>
        <button
          onClick={exportCSV}
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-[#4F4E3A] text-white font-medium hover:bg-[#3D3C2A] transition-all shadow-md flex-shrink-0"
        >
          <Download size={20} /> Exportar CSV
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard label="Pacientes" value={totals.patients} icon={Users} color="from-[#8C8B6E] to-[#4F4E3A]" />
        <SummaryCard label="Médicos" value={filteredStats.filter((s) => s.doctor).length} icon={Stethoscope} color="from-[#6B8E5A] to-[#4F6B3E]" />
        <SummaryCard label="Agendamentos" value={totals.appointments} icon={FileText} color="from-[#C4A77D] to-[#A8865F]" />
        <SummaryCard label="Consultas" value={totals.consultations} icon={ClipboardList} color="from-[#7A6A8B] to-[#5A4A6B]" />
      </div>

      {/* Detail table */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#E0D9C3] overflow-hidden">
        <div className="p-6 border-b border-[#E0D9C3]">
          <h3 className="text-lg font-serif font-bold text-[#4F4E3A]">Prestação de Contas por Médico Referente</h3>
          <p className="text-sm text-[#8C8B6E] mt-1">
            Relação de pacientes indicados, agendamentos e atendimentos realizados por médico.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#F5F2E8] text-[#4F4E3A] text-left">
                <th className="px-6 py-3 font-semibold">Médico</th>
                <th className="px-6 py-3 font-semibold">Especialidade</th>
                <th className="px-6 py-3 font-semibold text-center">Pacientes</th>
                <th className="px-6 py-3 font-semibold text-center">Agendamentos</th>
                <th className="px-6 py-3 font-semibold text-center">Realizados</th>
                <th className="px-6 py-3 font-semibold text-center">Consultas</th>
              </tr>
            </thead>
            <tbody>
              {filteredStats.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-[#8C8B6E]">
                    Nenhum dado para exibir com o filtro selecionado.
                  </td>
                </tr>
              ) : (
                filteredStats.map((s) => (
                  <tr key={s.doctor?.id ?? 'none'} className="border-t border-[#E0D9C3] hover:bg-[#F5F2E8]/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Stethoscope className="text-[#8C8B6E] flex-shrink-0" size={16} />
                        <span className="font-medium text-[#4F4E3A]">
                          {s.doctor?.name ?? 'Sem médico referente'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-[#8C8B6E]">{s.doctor?.specialty ?? '-'}</td>
                    <td className="px-6 py-4 text-center font-bold text-[#4F4E3A]">{s.patients}</td>
                    <td className="px-6 py-4 text-center text-[#4F4E3A]">{s.appointments}</td>
                    <td className="px-6 py-4 text-center text-green-700 font-medium">{s.completedAppointments}</td>
                    <td className="px-6 py-4 text-center text-[#4F4E3A]">{s.consultations}</td>
                  </tr>
                ))
              )}
            </tbody>
            {filteredStats.length > 0 && (
              <tfoot>
                <tr className="bg-[#F5F2E8] border-t-2 border-[#E0D9C3] font-bold text-[#4F4E3A]">
                  <td className="px-6 py-4" colSpan={2}>Total</td>
                  <td className="px-6 py-4 text-center">{totals.patients}</td>
                  <td className="px-6 py-4 text-center">{totals.appointments}</td>
                  <td className="px-6 py-4 text-center">{totals.completedAppointments}</td>
                  <td className="px-6 py-4 text-center">{totals.consultations}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Patient breakdown per doctor */}
      {filteredStats.length > 0 && (
        <div className="space-y-4">
          {filteredStats.map((s) => (
            <div key={s.doctor?.id ?? 'none'} className="bg-white rounded-2xl shadow-sm border border-[#E0D9C3] p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#6B8E5A] to-[#4F6B3E] flex items-center justify-center text-white">
                  <Stethoscope size={20} />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-[#4F4E3A]">{s.doctor?.name ?? 'Sem médico referente'}</h3>
                  <p className="text-xs text-[#8C8B6E]">
                    {s.patients} paciente(s) · {s.appointments} agendamento(s) · {s.consultations} consulta(s)
                  </p>
                </div>
              </div>

              {s.patientsList.length === 0 ? (
                <p className="text-sm text-[#B8B099] py-2">Nenhum paciente vinculado.</p>
              ) : (
                <div className="space-y-2">
                  {s.patientsList.map((p) => {
                    const pAppts = appointments.filter((a) => a.patient_id === p.id);
                    const pConsults = consultations.filter((c) => c.patient_id === p.id);
                    const pCompleted = pAppts.filter((a) => a.status === 'completed').length;
                    return (
                      <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-[#F5F2E8]">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#C4A77D] to-[#8C8B6E] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {p.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-[#4F4E3A] truncate">{p.name}</p>
                            <p className="text-xs text-[#8C8B6E]">{p.objective || 'Sem objetivo definido'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-xs flex-shrink-0">
                          <span className="text-[#4F4E3A]" title="Agendamentos">
                            <b>{pAppts.length}</b> agend.
                          </span>
                          <span className="text-green-700" title="Realizados">
                            <b>{pCompleted}</b> realiz.
                          </span>
                          <span className="text-[#4F4E3A]" title="Consultas">
                            <b>{pConsults.length}</b> consult.
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, icon: Icon, color }: {
  label: string; value: number; icon: React.ElementType; color: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#E0D9C3]">
      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-4`}>
        <Icon className="text-white" size={24} />
      </div>
      <p className="text-3xl font-bold text-[#4F4E3A]">{value}</p>
      <p className="text-sm text-[#8C8B6E] mt-1">{label}</p>
    </div>
  );
}
