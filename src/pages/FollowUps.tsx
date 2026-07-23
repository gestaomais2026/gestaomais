import { useEffect, useState, useCallback } from 'react';
import { supabase, FollowUp, Patient } from '@/lib/supabase';
import { Plus, Trash2, X, CheckCircle2, Circle, Bell, MessageSquare, ListTodo, TrendingUp } from 'lucide-react';

const emptyForm = {
  patient_id: '',
  type: 'message' as FollowUp['type'],
  content: '',
  due_date: '',
};

export default function FollowUps() {
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('follow_ups')
      .select('*, patient:patients(*)')
      .order('created_at', { ascending: false });
    setFollowUps((data as FollowUp[]) || []);
    const { data: pData } = await supabase.from('patients').select('*').order('name');
    setPatients((pData as Patient[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = {
      patient_id: form.patient_id,
      type: form.type,
      content: form.content,
      due_date: form.due_date || null,
    };
    await supabase.from('follow_ups').insert(payload);
    setSaving(false);
    setModalOpen(false);
    setForm(emptyForm);
    load();
  }

  async function toggle(id: string, isCompleted: boolean) {
    await supabase
      .from('follow_ups')
      .update({
        is_completed: !isCompleted,
        completed_at: !isCompleted ? new Date().toISOString() : null,
      })
      .eq('id', id);
    load();
  }

  async function remove(id: string) {
    await supabase.from('follow_ups').delete().eq('id', id);
    load();
  }

  const filtered = followUps.filter((f) => {
    if (filter === 'pending') return !f.is_completed;
    if (filter === 'completed') return f.is_completed;
    return true;
  });

  const typeConfig: Record<string, { label: string; icon: typeof Bell; color: string; bg: string }> = {
    message: { label: 'Mensagem', icon: MessageSquare, color: 'text-blue-600', bg: 'bg-blue-50' },
    task: { label: 'Tarefa', icon: ListTodo, color: 'text-[#C4A77D]', bg: 'bg-[#F5F2E8]' },
    alert: { label: 'Alerta', icon: Bell, color: 'text-red-600', bg: 'bg-red-50' },
    progress: { label: 'Progresso', icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
  };

  const counts = {
    all: followUps.length,
    pending: followUps.filter((f) => !f.is_completed).length,
    completed: followUps.filter((f) => f.is_completed).length,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div className="flex gap-2">
          {(['all', 'pending', 'completed'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all
                ${filter === f
                  ? 'bg-[#4F4E3A] text-white shadow-md'
                  : 'bg-white text-[#8C8B6E] border border-[#E0D9C3] hover:bg-[#F5F2E8]'}`}
            >
              {f === 'all' ? 'Todos' : f === 'pending' ? 'Pendentes' : 'Concluídos'}
              <span className="ml-1.5 opacity-70">({counts[f]})</span>
            </button>
          ))}
        </div>
        <button onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#4F4E3A] text-white font-medium hover:bg-[#3D3C2A] transition-all shadow-md flex-shrink-0">
          <Plus size={20} /> Novo Registro
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin w-10 h-10 border-3 border-[#4F4E3A] border-t-transparent rounded-full" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E0D9C3] p-12 text-center">
          <Bell className="mx-auto mb-3 text-[#8C8B6E] opacity-40" size={40} />
          <p className="text-[#8C8B6E] text-lg">Nenhum registro de acompanhamento</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((f) => {
            const config = typeConfig[f.type];
            const Icon = config.icon;
            const overdue = f.due_date && !f.is_completed && new Date(f.due_date) < new Date();
            return (
              <div
                key={f.id}
                className={`bg-white rounded-2xl shadow-sm border p-4 flex items-start gap-4 group hover:shadow-md transition-all
                  ${f.is_completed ? 'border-[#E0D9C3] opacity-70' : 'border-[#E0D9C3]'}
                  ${overdue ? 'border-l-4 border-l-red-400' : ''}`}
              >
                <button
                  onClick={() => toggle(f.id, f.is_completed)}
                  className="mt-0.5 flex-shrink-0"
                >
                  {f.is_completed
                    ? <CheckCircle2 className="text-green-500" size={22} />
                    : <Circle className="text-[#8C8B6E] hover:text-[#4F4E3A]" size={22} />}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.color}`}>
                      <Icon size={12} /> {config.label}
                    </span>
                    <span className="text-sm text-[#8C8B6E]">{f.patient?.name}</span>
                    {overdue && (
                      <span className="text-xs text-red-600 font-medium">Atrasado</span>
                    )}
                  </div>
                  <p className={`text-[#4F4E3A] ${f.is_completed ? 'line-through' : ''}`}>
                    {f.content}
                  </p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-[#8C8B6E]">
                    <span>{new Date(f.created_at).toLocaleDateString('pt-BR')}</span>
                    {f.due_date && (
                      <span>Prazo: {new Date(f.due_date).toLocaleDateString('pt-BR')}</span>
                    )}
                    {f.completed_at && (
                      <span className="text-green-600">Concluído em {new Date(f.completed_at).toLocaleDateString('pt-BR')}</span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => remove(f.id)}
                  className="opacity-0 group-hover:opacity-100 p-2 rounded-lg text-red-500 hover:bg-red-50 transition-all flex-shrink-0"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b border-[#E0D9C3]">
              <h2 className="text-xl font-serif font-bold text-[#4F4E3A]">Novo Registro</h2>
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
              <div>
                <label className="block text-sm font-medium text-[#4F4E3A] mb-1.5">Tipo</label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as FollowUp['type'] })}
                  className={inputClass}>
                  <option value="message">Mensagem</option>
                  <option value="task">Tarefa</option>
                  <option value="alert">Alerta</option>
                  <option value="progress">Progresso</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#4F4E3A] mb-1.5">Conteúdo *</label>
                <textarea required rows={3} value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  placeholder="Descreva a mensagem, tarefa ou observação..." className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#4F4E3A] mb-1.5">Prazo (opcional)</label>
                <input type="date" value={form.due_date}
                  onChange={(e) => setForm({ ...form, due_date: e.target.value })} className={inputClass} />
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
