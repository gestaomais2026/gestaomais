import { useEffect, useState, useCallback } from 'react';
import { supabase, NutritionalPlan, Patient } from '@/lib/supabase';
import { Plus, Edit2, Trash2, X, Activity, Calendar, Flame } from 'lucide-react';

const emptyForm = {
  patient_id: '',
  title: '',
  description: '',
  start_date: '',
  end_date: '',
  calories_target: '' as string | number,
  protein_g: '' as string | number,
  carb_g: '' as string | number,
  fat_g: '' as string | number,
  content: '',
  status: 'draft' as NutritionalPlan['status'],
};

export default function Plans() {
  const [plans, setPlans] = useState<NutritionalPlan[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<NutritionalPlan | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [detailPlan, setDetailPlan] = useState<NutritionalPlan | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('nutritional_plans')
      .select('*, patient:patients(*)')
      .order('created_at', { ascending: false });
    setPlans((data as NutritionalPlan[]) || []);
    const { data: pData } = await supabase.from('patients').select('*').order('name');
    setPatients((pData as Patient[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function openNew() {
    setEditing(null);
    setForm({ ...emptyForm, start_date: new Date().toISOString().slice(0, 10) });
    setModalOpen(true);
  }

  function openEdit(p: NutritionalPlan) {
    setEditing(p);
    setForm({
      patient_id: p.patient_id,
      title: p.title,
      description: p.description ?? '',
      start_date: p.start_date ?? '',
      end_date: p.end_date ?? '',
      calories_target: p.calories_target ?? '',
      protein_g: p.protein_g ?? '',
      carb_g: p.carb_g ?? '',
      fat_g: p.fat_g ?? '',
      content: p.content ?? '',
      status: p.status,
    });
    setModalOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const n = (v: string | number) => v === '' ? null : Number(v);
    const payload = {
      patient_id: form.patient_id,
      title: form.title,
      description: form.description || null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      calories_target: n(form.calories_target),
      protein_g: n(form.protein_g),
      carb_g: n(form.carb_g),
      fat_g: n(form.fat_g),
      content: form.content || null,
      status: form.status,
    };
    if (editing) {
      await supabase.from('nutritional_plans').update(payload).eq('id', editing.id);
    } else {
      await supabase.from('nutritional_plans').insert(payload);
    }
    setSaving(false);
    setModalOpen(false);
    load();
  }

  async function remove(id: string) {
    if (!confirm('Excluir este plano alimentar?')) return;
    await supabase.from('nutritional_plans').delete().eq('id', id);
    load();
  }

  const statusLabels: Record<string, string> = {
    draft: 'Rascunho', active: 'Ativo', completed: 'Concluído', archived: 'Arquivado',
  };
  const statusColors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700', active: 'bg-green-100 text-green-700',
    completed: 'bg-blue-100 text-blue-700', archived: 'bg-amber-100 text-amber-700',
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button onClick={openNew}
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-[#4F4E3A] text-white font-medium hover:bg-[#3D3C2A] transition-all shadow-md">
          <Plus size={20} /> Novo Plano
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin w-10 h-10 border-3 border-[#4F4E3A] border-t-transparent rounded-full" />
        </div>
      ) : plans.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E0D9C3] p-12 text-center">
          <Activity className="mx-auto mb-3 text-[#8C8B6E] opacity-40" size={40} />
          <p className="text-[#8C8B6E] text-lg">Nenhum plano alimentar criado</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {plans.map((plan) => (
            <div key={plan.id} className="bg-white rounded-2xl shadow-sm border border-[#E0D9C3] p-5 group hover:shadow-md transition-all">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-serif font-bold text-[#4F4E3A] truncate">{plan.title}</h3>
                  <p className="text-sm text-[#8C8B6E]">{plan.patient?.name}</p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[plan.status]} flex-shrink-0 ml-2`}>
                  {statusLabels[plan.status]}
                </span>
              </div>

              {plan.description && (
                <p className="text-sm text-[#4F4E3A] mb-3 line-clamp-2">{plan.description}</p>
              )}

              {plan.calories_target && (
                <div className="flex items-center gap-2 bg-gradient-to-r from-[#F5F2E8] to-[#EDE8D9] rounded-xl px-4 py-3 mb-3">
                  <Flame className="text-[#C4A77D]" size={20} />
                  <span className="text-2xl font-bold text-[#4F4E3A]">{plan.calories_target}</span>
                  <span className="text-sm text-[#8C8B6E]">kcal/dia</span>
                </div>
              )}

              <div className="grid grid-cols-3 gap-2 mb-3">
                <Macro label="Proteína" value={plan.protein_g} unit="g" color="text-[#C4A77D]" />
                <Macro label="Carbo" value={plan.carb_g} unit="g" color="text-[#6B8E5A]" />
                <Macro label="Gordura" value={plan.fat_g} unit="g" color="text-[#A8865F]" />
              </div>

              {(plan.start_date || plan.end_date) && (
                <div className="flex items-center gap-2 text-xs text-[#8C8B6E] mb-3">
                  <Calendar size={14} />
                  {plan.start_date && new Date(plan.start_date).toLocaleDateString('pt-BR')}
                  {plan.start_date && plan.end_date && ' → '}
                  {plan.end_date && new Date(plan.end_date).toLocaleDateString('pt-BR')}
                </div>
              )}

              <div className="flex gap-2 pt-3 border-t border-[#E0D9C3]">
                <button onClick={() => setDetailPlan(plan)}
                  className="flex-1 py-2 rounded-lg bg-[#4F4E3A] text-white text-sm font-medium hover:bg-[#3D3C2A] transition-colors">
                  Ver detalhes
                </button>
                <button onClick={() => openEdit(plan)}
                  className="flex items-center justify-center py-2 px-3 rounded-lg bg-[#F5F2E8] text-[#4F4E3A] hover:bg-[#EDE8D9] transition-colors">
                  <Edit2 size={16} />
                </button>
                <button onClick={() => remove(plan.id)}
                  className="flex items-center justify-center py-2 px-3 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-[#E0D9C3] sticky top-0 bg-white z-10">
              <h2 className="text-xl font-serif font-bold text-[#4F4E3A]">
                {editing ? 'Editar Plano' : 'Novo Plano Alimentar'}
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
                  <label className="block text-sm font-medium text-[#4F4E3A] mb-1.5">Status</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as NutritionalPlan['status'] })}
                    className={inputClass}>
                    <option value="draft">Rascunho</option>
                    <option value="active">Ativo</option>
                    <option value="completed">Concluído</option>
                    <option value="archived">Arquivado</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#4F4E3A] mb-1.5">Título *</label>
                <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Ex: Plano para emagrecimento - Fase 1" className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#4F4E3A] mb-1.5">Descrição</label>
                <textarea rows={2} value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputClass} />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[#4F4E3A] mb-1.5">Calorias (kcal)</label>
                  <input type="number" value={form.calories_target}
                    onChange={(e) => setForm({ ...form, calories_target: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#4F4E3A] mb-1.5">Proteína (g)</label>
                  <input type="number" value={form.protein_g}
                    onChange={(e) => setForm({ ...form, protein_g: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#4F4E3A] mb-1.5">Carbo (g)</label>
                  <input type="number" value={form.carb_g}
                    onChange={(e) => setForm({ ...form, carb_g: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#4F4E3A] mb-1.5">Gordura (g)</label>
                  <input type="number" value={form.fat_g}
                    onChange={(e) => setForm({ ...form, fat_g: e.target.value })} className={inputClass} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#4F4E3A] mb-1.5">Início</label>
                  <input type="date" value={form.start_date}
                    onChange={(e) => setForm({ ...form, start_date: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#4F4E3A] mb-1.5">Fim</label>
                  <input type="date" value={form.end_date}
                    onChange={(e) => setForm({ ...form, end_date: e.target.value })} className={inputClass} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#4F4E3A] mb-1.5">Conteúdo do plano</label>
                <textarea rows={6} value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  placeholder="Descreva o plano alimentar detalhadamente: refeições, horários, porções, orientações..." className={inputClass} />
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

      {/* Detail Modal */}
      {detailPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-[#E0D9C3] sticky top-0 bg-white z-10">
              <h2 className="text-xl font-serif font-bold text-[#4F4E3A]">{detailPlan.title}</h2>
              <button onClick={() => setDetailPlan(null)} className="text-[#8C8B6E] hover:text-[#4F4E3A]">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="text-sm text-[#8C8B6E]">Paciente</p>
                <p className="text-lg font-medium text-[#4F4E3A]">{detailPlan.patient?.name}</p>
              </div>
              {detailPlan.description && (
                <p className="text-[#4F4E3A] bg-[#F5F2E8] rounded-xl p-4">{detailPlan.description}</p>
              )}
              {detailPlan.calories_target && (
                <div className="flex items-center gap-3 bg-gradient-to-r from-[#F5F2E8] to-[#EDE8D9] rounded-xl px-5 py-4">
                  <Flame className="text-[#C4A77D]" size={28} />
                  <span className="text-3xl font-bold text-[#4F4E3A]">{detailPlan.calories_target}</span>
                  <span className="text-[#8C8B6E]">kcal/dia</span>
                </div>
              )}
              <div className="grid grid-cols-3 gap-3">
                <Macro label="Proteína" value={detailPlan.protein_g} unit="g" color="text-[#C4A77D]" />
                <Macro label="Carbo" value={detailPlan.carb_g} unit="g" color="text-[#6B8E5A]" />
                <Macro label="Gordura" value={detailPlan.fat_g} unit="g" color="text-[#A8865F]" />
              </div>
              {detailPlan.content && (
                <div>
                  <p className="text-sm font-medium text-[#8C8B6E] uppercase mb-2">Plano detalhado</p>
                  <div className="whitespace-pre-wrap text-[#4F4E3A] bg-[#F5F2E8] rounded-xl p-4 text-sm leading-relaxed">
                    {detailPlan.content}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const inputClass = "w-full px-4 py-2.5 rounded-xl border border-[#D5CFBE] bg-[#FDFCF7] focus:border-[#8C8B6E] focus:ring-2 focus:ring-[#8C8B6E]/20 outline-none transition-all text-[#4F4E3A] text-sm";

function Macro({ label, value, unit, color }: {
  label: string; value: number | null; unit: string; color: string;
}) {
  return (
    <div className="bg-[#F5F2E8] rounded-lg py-2 text-center">
      <p className="text-xs text-[#8C8B6E]">{label}</p>
      <p className={`text-lg font-bold ${color}`}>{value ? `${value}${unit}` : '-'}</p>
    </div>
  );
}
