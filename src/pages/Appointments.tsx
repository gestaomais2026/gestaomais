import { useEffect, useState, useCallback } from 'react';
import { supabase, Appointment, Patient } from '@/lib/supabase';
import { Plus, Edit2, Trash2, X, Calendar as CalIcon, Clock } from 'lucide-react';

const emptyForm = {
  patient_id: '',
  scheduled_at: '',
  duration_minutes: 60,
  type: 'return' as Appointment['type'],
  status: 'scheduled' as Appointment['status'],
  notes: '',
};

export default function Appointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Appointment | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('appointments')
      .select('*, patient:patients(*)')
      .order('scheduled_at', { ascending: true });
    setAppointments((data as Appointment[]) || []);
    const { data: pData } = await supabase.from('patients').select('*').order('name');
    setPatients((pData as Patient[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function openNew() {
    setEditing(null);
    setForm({ ...emptyForm, scheduled_at: new Date(Date.now() + 86400000).toISOString().slice(0, 16) });
    setModalOpen(true);
  }

  function openEdit(a: Appointment) {
    setEditing(a);
    setForm({
      patient_id: a.patient_id,
      scheduled_at: new Date(a.scheduled_at).toISOString().slice(0, 16),
      duration_minutes: a.duration_minutes,
      type: a.type,
      status: a.status,
      notes: a.notes || '',
    });
    setModalOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = {
      patient_id: form.patient_id,
      scheduled_at: new Date(form.scheduled_at).toISOString(),
      duration_minutes: Number(form.duration_minutes),
      type: form.type,
      status: form.status,
      notes: form.notes || null,
    };
    if (editing) {
      await supabase.from('appointments').update(payload).eq('id', editing.id);
    } else {
      await supabase.from('appointments').insert(payload);
    }
    setSaving(false);
    setModalOpen(false);
    load();
  }

  async function remove(id: string) {
    if (!confirm('Excluir este agendamento?')) return;
    await supabase.from('appointments').delete().eq('id', id);
    load();
  }

  const typeLabels: Record<string, string> = {
    first: 'Primeira consulta', return: 'Retorno', emergency: 'Emergência', online: 'Online',
  };
  const statusLabels: Record<string, string> = {
    scheduled: 'Agendado', confirmed: 'Confirmado', completed: 'Realizado', cancelled: 'Cancelado', no_show: 'Faltou',
  };
  const statusColors: Record<string, string> = {
    scheduled: 'bg-amber-100 text-amber-700', confirmed: 'bg-green-100 text-green-700',
    completed: 'bg-blue-100 text-blue-700', cancelled: 'bg-red-100 text-red-700', no_show: 'bg-gray-100 text-gray-600',
  };

  // Group by date
  const grouped = appointments.reduce<Record<string, Appointment[]>>((acc, apt) => {
    const date = new Date(apt.scheduled_at).toDateString();
    (acc[date] ||= []).push(apt);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button onClick={openNew}
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-[#4F4E3A] text-white font-medium hover:bg-[#3D3C2A] transition-all shadow-md">
          <Plus size={20} /> Novo Agendamento
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin w-10 h-10 border-3 border-[#4F4E3A] border-t-transparent rounded-full" />
        </div>
      ) : appointments.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E0D9C3] p-12 text-center">
          <CalIcon className="mx-auto mb-3 text-[#8C8B6E] opacity-40" size={40} />
          <p className="text-[#8C8B6E] text-lg">Nenhum agendamento</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([dateStr, apts]) => {
            const date = new Date(dateStr);
            const isToday = date.toDateString() === new Date().toDateString();
            return (
              <div key={dateStr}>
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center shadow-sm
                    ${isToday ? 'bg-[#4F4E3A] text-white' : 'bg-white text-[#4F4E3A] border border-[#E0D9C3]'}`}>
                    <span className="text-[10px] font-medium uppercase leading-none">
                      {date.toLocaleDateString('pt-BR', { month: 'short' })}
                    </span>
                    <span className="text-lg font-bold leading-none mt-0.5">{date.getDate()}</span>
                  </div>
                  <div>
                    <p className="font-serif font-bold text-[#4F4E3A]">
                      {date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </p>
                    {isToday && <p className="text-xs text-[#C4A77D] font-medium">Hoje</p>}
                  </div>
                </div>

                <div className="space-y-2 pl-2 border-l-2 border-[#E0D9C3] ml-6">
                  {apts.map((apt) => (
                    <div key={apt.id}
                      className="bg-white rounded-xl shadow-sm border border-[#E0D9C3] p-4 flex items-center gap-4 group hover:shadow-md transition-all">
                      <div className="flex items-center gap-1.5 text-[#8C8B6E] flex-shrink-0 w-20">
                        <Clock size={16} />
                        <span className="text-sm font-medium">
                          {new Date(apt.scheduled_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-[#4F4E3A] truncate">{apt.patient?.name || 'Paciente'}</p>
                        <p className="text-xs text-[#8C8B6E]">
                          {typeLabels[apt.type]} · {apt.duration_minutes}min
                          {apt.notes && ` · ${apt.notes}`}
                        </p>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[apt.status]}`}>
                        {statusLabels[apt.status]}
                      </span>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEdit(apt)}
                          className="p-2 rounded-lg text-[#8C8B6E] hover:bg-[#F5F2E8] hover:text-[#4F4E3A] transition-colors">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => remove(apt.id)}
                          className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b border-[#E0D9C3]">
              <h2 className="text-xl font-serif font-bold text-[#4F4E3A]">
                {editing ? 'Editar Agendamento' : 'Novo Agendamento'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="text-[#8C8B6E] hover:text-[#4F4E3A]">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={save} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#4F4E3A] mb-1.5">Paciente *</label>
                <select required value={form.patient_id} onChange={(e) => setForm({ ...form, patient_id: e.target.value })}
                  className={inputClass}>
                  <option value="">Selecione...</option>
                  {patients.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#4F4E3A] mb-1.5">Data e hora *</label>
                  <input type="datetime-local" required value={form.scheduled_at}
                    onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#4F4E3A] mb-1.5">Duração (min)</label>
                  <input type="number" value={form.duration_minutes}
                    onChange={(e) => setForm({ ...form, duration_minutes: Number(e.target.value) })} className={inputClass} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#4F4E3A] mb-1.5">Tipo</label>
                  <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as Appointment['type'] })}
                    className={inputClass}>
                    <option value="first">Primeira consulta</option>
                    <option value="return">Retorno</option>
                    <option value="emergency">Emergência</option>
                    <option value="online">Online</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#4F4E3A] mb-1.5">Status</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Appointment['status'] })}
                    className={inputClass}>
                    <option value="scheduled">Agendado</option>
                    <option value="confirmed">Confirmado</option>
                    <option value="completed">Realizado</option>
                    <option value="cancelled">Cancelado</option>
                    <option value="no_show">Faltou</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#4F4E3A] mb-1.5">Observações</label>
                <textarea rows={3} value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })} className={inputClass} />
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
