import { useEffect, useState, useCallback } from 'react';
import { supabase, Consultation, Patient, Appointment } from '@/lib/supabase';
import { Plus, Edit2, Trash2, X, ClipboardList, Activity, Clock } from 'lucide-react';

const emptyForm = {
  patient_id: '',
  consultation_date: new Date().toISOString().slice(0, 10),
  weight_kg: '' as string | number,
  body_fat_pct: '' as string | number,
  muscle_mass_kg: '' as string | number,
  waist_cm: '' as string | number,
  hip_cm: '' as string | number,
  blood_pressure: '',
  glucose: '' as string | number,
  notes: '',
  recommendations: '',
  next_consultation_date: '',
};

export default function Consultations() {
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Consultation | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<string>('all');

  const load = useCallback(async () => {
    setLoading(true);
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();

    const [consResult, patResult, apptResult] = await Promise.all([
      supabase
        .from('consultations')
        .select('*, patient:patients(*)')
        .order('consultation_date', { ascending: false }),
      supabase.from('patients').select('*').order('name'),
      supabase
        .from('appointments')
        .select('*, patient:patients(*)')
        .gte('scheduled_at', startOfDay)
        .lt('scheduled_at', endOfDay)
        .in('status', ['scheduled', 'confirmed'])
        .order('scheduled_at', { ascending: true }),
    ]);

    setConsultations((consResult.data as Consultation[]) || []);
    setPatients((patResult.data as Patient[]) || []);
    setTodayAppointments((apptResult.data as Appointment[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = selectedPatient === 'all'
    ? consultations
    : consultations.filter((c) => c.patient_id === selectedPatient);

  function openNew() {
    setEditing(null);
    setForm({ ...emptyForm, consultation_date: new Date().toISOString().slice(0, 10) });
    setModalOpen(true);
  }

  function openFromAppointment(apt: Appointment) {
    setEditing(null);
    setForm({
      ...emptyForm,
      patient_id: apt.patient_id,
      consultation_date: new Date().toISOString().slice(0, 10),
    });
    setModalOpen(true);
  }

  function openEdit(c: Consultation) {
    setEditing(c);
    setForm({
      patient_id: c.patient_id,
      consultation_date: c.consultation_date,
      weight_kg: c.weight_kg ?? '',
      body_fat_pct: c.body_fat_pct ?? '',
      muscle_mass_kg: c.muscle_mass_kg ?? '',
      waist_cm: c.waist_cm ?? '',
      hip_cm: c.hip_cm ?? '',
      blood_pressure: c.blood_pressure ?? '',
      glucose: c.glucose ?? '',
      notes: c.notes ?? '',
      recommendations: c.recommendations ?? '',
      next_consultation_date: c.next_consultation_date ?? '',
    });
    setModalOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const n = (v: string | number) => v === '' ? null : Number(v);
    const payload = {
      patient_id: form.patient_id,
      consultation_date: form.consultation_date,
      weight_kg: n(form.weight_kg),
      body_fat_pct: n(form.body_fat_pct),
      muscle_mass_kg: n(form.muscle_mass_kg),
      waist_cm: n(form.waist_cm),
      hip_cm: n(form.hip_cm),
      blood_pressure: form.blood_pressure || null,
      glucose: n(form.glucose),
      notes: form.notes || null,
      recommendations: form.recommendations || null,
      next_consultation_date: form.next_consultation_date || null,
    };
    if (editing) {
      await supabase.from('consultations').update(payload).eq('id', editing.id);
    } else {
      await supabase.from('consultations').insert(payload);
    }
    setSaving(false);
    setModalOpen(false);
    load();
  }

  async function remove(id: string) {
    if (!confirm('Excluir esta consulta?')) return;
    await supabase.from('consultations').delete().eq('id', id);
    load();
  }

  const typeLabels: Record<string, string> = {
    first: 'Primeira consulta', return: 'Retorno', emergency: 'Emergência', online: 'Online',
  };

  return (
    <div className="space-y-6">
      {/* Today's appointments */}
      {todayAppointments.length > 0 && (
        <div className="bg-gradient-to-r from-[#4F4E3A] to-[#6B6A50] rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Clock size={18} className="text-[#C4A77D]" />
            <h3 className="text-white font-serif font-bold">Agendamentos de Hoje</h3>
            <span className="ml-auto text-xs text-[#C4A77D] bg-white/10 px-2 py-0.5 rounded-full">
              Clique para abrir consulta
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {todayAppointments.map((apt) => (
              <button
                key={apt.id}
                onClick={() => openFromAppointment(apt)}
                className="bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl p-4 text-left transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#C4A77D] flex items-center justify-center text-[#4F4E3A] font-bold text-sm flex-shrink-0">
                    {apt.patient?.name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-white font-medium truncate">{apt.patient?.name}</p>
                    <p className="text-[#C4A77D] text-xs">
                      {new Date(apt.scheduled_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      {' · '}{typeLabels[apt.type] || apt.type}
                    </p>
                  </div>
                  <Plus size={16} className="text-white/50 group-hover:text-white ml-auto flex-shrink-0 transition-colors" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <select value={selectedPatient} onChange={(e) => setSelectedPatient(e.target.value)}
          className="px-4 py-3 rounded-xl border border-[#D5CFBE] bg-white focus:border-[#8C8B6E] outline-none text-[#4F4E3A] text-sm max-w-xs">
          <option value="all">Todos os pacientes</option>
          {patients.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <button onClick={openNew}
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-[#4F4E3A] text-white font-medium hover:bg-[#3D3C2A] transition-all shadow-md flex-shrink-0">
          <Plus size={20} /> Nova Consulta
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin w-10 h-10 border-3 border-[#4F4E3A] border-t-transparent rounded-full" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E0D9C3] p-12 text-center">
          <ClipboardList className="mx-auto mb-3 text-[#8C8B6E] opacity-40" size={40} />
          <p className="text-[#8C8B6E] text-lg">Nenhuma consulta registrada</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((c) => (
            <div key={c.id} className="bg-white rounded-2xl shadow-sm border border-[#E0D9C3] p-5 group hover:shadow-md transition-all">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#C4A77D] to-[#8C8B6E] flex items-center justify-center text-white font-bold">
                    {c.patient?.name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-serif font-bold text-[#4F4E3A]">{c.patient?.name}</h3>
                    <p className="text-xs text-[#8C8B6E]">
                      {new Date(c.consultation_date).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(c)}
                    className="p-2 rounded-lg text-[#8C8B6E] hover:bg-[#F5F2E8] hover:text-[#4F4E3A] transition-colors">
                    <Edit2 size={16} />
                  </button>
                  <button onClick={() => remove(c.id)}
                    className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                <Metric label="Peso" value={c.weight_kg} unit="kg" />
                <Metric label="% Gordura" value={c.body_fat_pct} unit="%" />
                <Metric label="Massa Muscular" value={c.muscle_mass_kg} unit="kg" />
                <Metric label="Cintura" value={c.waist_cm} unit="cm" />
                <Metric label="Quadril" value={c.hip_cm} unit="cm" />
                <Metric label="P.A." value={c.blood_pressure} />
                <Metric label="Glicose" value={c.glucose} unit="mg/dL" />
              </div>

              {(c.notes || c.recommendations) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 pt-4 border-t border-[#E0D9C3]">
                  {c.notes && (
                    <div>
                      <p className="text-xs font-medium text-[#8C8B6E] uppercase mb-1">Anotações</p>
                      <p className="text-sm text-[#4F4E3A]">{c.notes}</p>
                    </div>
                  )}
                  {c.recommendations && (
                    <div>
                      <p className="text-xs font-medium text-[#8C8B6E] uppercase mb-1">Recomendações</p>
                      <p className="text-sm text-[#4F4E3A]">{c.recommendations}</p>
                    </div>
                  )}
                </div>
              )}

              {c.next_consultation_date && (
                <div className="mt-4 flex items-center gap-2 text-sm text-[#C4A77D] bg-[#F5F2E8] rounded-lg px-3 py-2">
                  <Activity size={16} />
                  Próxima consulta: {new Date(c.next_consultation_date).toLocaleDateString('pt-BR')}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-[#E0D9C3] sticky top-0 bg-white z-10">
              <h2 className="text-xl font-serif font-bold text-[#4F4E3A]">
                {editing ? 'Editar Consulta' : 'Nova Consulta'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="text-[#8C8B6E] hover:text-[#4F4E3A]">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={save} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#4F4E3A] mb-1.5">Paciente *</label>
                  <select required value={form.patient_id} onChange={(e) => setForm({ ...form, patient_id: e.target.value })}
                    className={inputClass}>
                    <option value="">Selecione...</option>
                    {patients.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#4F4E3A] mb-1.5">Data da consulta *</label>
                  <input type="date" required value={form.consultation_date}
                    onChange={(e) => setForm({ ...form, consultation_date: e.target.value })} className={inputClass} />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <NumField label="Peso (kg)" value={form.weight_kg} onChange={(v) => setForm({ ...form, weight_kg: v })} step="0.01" />
                <NumField label="% Gordura" value={form.body_fat_pct} onChange={(v) => setForm({ ...form, body_fat_pct: v })} step="0.1" />
                <NumField label="Massa Muscular (kg)" value={form.muscle_mass_kg} onChange={(v) => setForm({ ...form, muscle_mass_kg: v })} step="0.01" />
                <NumField label="Cintura (cm)" value={form.waist_cm} onChange={(v) => setForm({ ...form, waist_cm: v })} step="0.1" />
                <NumField label="Quadril (cm)" value={form.hip_cm} onChange={(v) => setForm({ ...form, hip_cm: v })} step="0.1" />
                <NumField label="Glicose (mg/dL)" value={form.glucose} onChange={(v) => setForm({ ...form, glucose: v })} step="0.1" />
                <div>
                  <label className="block text-sm font-medium text-[#4F4E3A] mb-1.5">Pressão arterial</label>
                  <input value={form.blood_pressure} onChange={(e) => setForm({ ...form, blood_pressure: e.target.value })}
                    placeholder="Ex: 120/80" className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#4F4E3A] mb-1.5">Próxima consulta</label>
                  <input type="date" value={form.next_consultation_date}
                    onChange={(e) => setForm({ ...form, next_consultation_date: e.target.value })} className={inputClass} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#4F4E3A] mb-1.5">Anotações</label>
                <textarea rows={3} value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#4F4E3A] mb-1.5">Recomendações</label>
                <textarea rows={3} value={form.recommendations}
                  onChange={(e) => setForm({ ...form, recommendations: e.target.value })} className={inputClass} />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModalOpen(false)}
                  className="flex-1 py-3 rounded-xl bg-[#F5F2E8] text-[#4F4E3A] font-medium hover:bg-[#EDE8D9] transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-3 rounded-xl bg-[#4F4E3A] text-white font-medium hover:bg-[#3D3C2A] transition-colors disabled:opacity-60">
                  {saving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const inputClass = "w-full px-4 py-2.5 rounded-xl border border-[#D5CFBE] bg-[#FDFCF7] focus:border-[#8C8B6E] focus:ring-2 focus:ring-[#8C8B6E]/20 outline-none transition-all text-[#4F4E3A] text-sm";

function Metric({ label, value, unit }: { label: string; value: string | number | null; unit?: string }) {
  return (
    <div className="bg-[#F5F2E8] rounded-lg px-3 py-2 text-center">
      <p className="text-xs text-[#8C8B6E] mb-0.5 leading-tight">{label}</p>
      <p className="text-sm font-bold text-[#4F4E3A]">
        {value !== null && value !== '' && value !== undefined ? `${value}${unit ? ' ' + unit : ''}` : '-'}
      </p>
    </div>
  );
}

function NumField({ label, value, onChange, step }: {
  label: string; value: string | number; onChange: (v: string) => void; step?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-[#4F4E3A] mb-1.5">{label}</label>
      <input type="number" step={step} value={value}
        onChange={(e) => onChange(e.target.value)} className={inputClass} />
    </div>
  );
}
