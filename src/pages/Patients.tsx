import { useEffect, useState, useCallback } from 'react';
import { supabase, Patient } from '@/lib/supabase';
import { Search, Plus, Edit2, Trash2, Phone, Mail, X, UserPlus } from 'lucide-react';

const emptyForm: Partial<Patient> = {
  name: '', email: '', phone: '', birth_date: '', gender: 'female',
  weight_kg: null, height_cm: null, objective: '', health_history: '',
  allergies: '', medications: '', status: 'active',
};

export default function Patients() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Patient | null>(null);
  const [form, setForm] = useState<Partial<Patient>>(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase.from('patients').select('*').order('name', { ascending: true });
    if (search) q = q.ilike('name', `%${search}%`);
    const { data } = await q;
    setPatients((data as Patient[]) || []);
    setLoading(false);
  }, [search]);

  useEffect(() => { load(); }, [load]);

  function openNew() {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(p: Patient) {
    setEditing(p);
    setForm({ ...p });
    setModalOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = {
      name: form.name,
      email: form.email || null,
      phone: form.phone || null,
      birth_date: form.birth_date || null,
      gender: form.gender || null,
      weight_kg: form.weight_kg ? Number(form.weight_kg) : null,
      height_cm: form.height_cm ? Number(form.height_cm) : null,
      objective: form.objective || null,
      health_history: form.health_history || null,
      allergies: form.allergies || null,
      medications: form.medications || null,
      status: form.status || 'active',
    };

    if (editing) {
      await supabase.from('patients').update(payload).eq('id', editing.id);
    } else {
      await supabase.from('patients').insert(payload);
    }
    setSaving(false);
    setModalOpen(false);
    load();
  }

  async function remove(id: string) {
    if (!confirm('Deseja realmente excluir este paciente?')) return;
    await supabase.from('patients').delete().eq('id', id);
    load();
  }

  function calcAge(birth?: string | null) {
    if (!birth) return null;
    const diff = Date.now() - new Date(birth).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
  }

  function calcBMI(w?: number | null, h?: number | null) {
    if (!w || !h) return null;
    return (w / Math.pow(h / 100, 2)).toFixed(1);
  }

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8C8B6E]" size={20} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar paciente por nome..."
            className="w-full pl-12 pr-4 py-3 rounded-xl border border-[#D5CFBE] bg-white focus:border-[#8C8B6E] focus:ring-2 focus:ring-[#8C8B6E]/20 outline-none transition-all text-[#4F4E3A] placeholder:text-[#B8B099]"
          />
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-[#4F4E3A] text-white font-medium hover:bg-[#3D3C2A] transition-all shadow-md flex-shrink-0"
        >
          <UserPlus size={20} />
          Novo Paciente
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin w-10 h-10 border-3 border-[#4F4E3A] border-t-transparent rounded-full" />
        </div>
      ) : patients.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E0D9C3] p-12 text-center">
          <p className="text-[#8C8B6E] text-lg">Nenhum paciente cadastrado</p>
          <p className="text-[#B8B099] text-sm mt-1">Clique em "Novo Paciente" para começar</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {patients.map((p) => {
            const age = calcAge(p.birth_date);
            const bmi = calcBMI(p.weight_kg, p.height_cm);
            return (
              <div
                key={p.id}
                className="bg-white rounded-2xl shadow-sm border border-[#E0D9C3] p-5 hover:shadow-md transition-all group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#C4A77D] to-[#8C8B6E] flex items-center justify-center text-white font-bold text-lg">
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-serif font-bold text-[#4F4E3A] leading-tight">{p.name}</h3>
                      {age !== null && <p className="text-xs text-[#8C8B6E]">{age} anos</p>}
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium
                    ${p.status === 'active' ? 'bg-green-100 text-green-700' :
                      p.status === 'paused' ? 'bg-amber-100 text-amber-700' :
                      'bg-gray-100 text-gray-600'}`}>
                    {p.status === 'active' ? 'Ativo' : p.status === 'paused' ? 'Pausado' : 'Inativo'}
                  </span>
                </div>

                {p.objective && (
                  <p className="text-sm text-[#4F4E3A] bg-[#F5F2E8] rounded-lg px-3 py-2 mb-3 line-clamp-2">
                    🎯 {p.objective}
                  </p>
                )}

                <div className="grid grid-cols-3 gap-2 text-center mb-3">
                  <div className="bg-[#F5F2E8] rounded-lg py-2">
                    <p className="text-xs text-[#8C8B6E]">Peso</p>
                    <p className="text-sm font-bold text-[#4F4E3A]">{p.weight_kg ? `${p.weight_kg}kg` : '-'}</p>
                  </div>
                  <div className="bg-[#F5F2E8] rounded-lg py-2">
                    <p className="text-xs text-[#8C8B6E]">Altura</p>
                    <p className="text-sm font-bold text-[#4F4E3A]">{p.height_cm ? `${p.height_cm}cm` : '-'}</p>
                  </div>
                  <div className="bg-[#F5F2E8] rounded-lg py-2">
                    <p className="text-xs text-[#8C8B6E]">IMC</p>
                    <p className="text-sm font-bold text-[#4F4E3A]">{bmi || '-'}</p>
                  </div>
                </div>

                <div className="space-y-1.5 text-sm text-[#8C8B6E] mb-4">
                  {p.phone && (
                    <div className="flex items-center gap-2">
                      <Phone size={14} /> {p.phone}
                    </div>
                  )}
                  {p.email && (
                    <div className="flex items-center gap-2 truncate">
                      <Mail size={14} /> <span className="truncate">{p.email}</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-3 border-t border-[#E0D9C3]">
                  <button
                    onClick={() => openEdit(p)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-[#F5F2E8] text-[#4F4E3A] text-sm font-medium hover:bg-[#EDE8D9] transition-colors"
                  >
                    <Edit2 size={16} /> Editar
                  </button>
                  <button
                    onClick={() => remove(p.id)}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-red-50 text-red-600 text-sm font-medium hover:bg-red-100 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-[#E0D9C3] sticky top-0 bg-white z-10">
              <h2 className="text-xl font-serif font-bold text-[#4F4E3A]">
                {editing ? 'Editar Paciente' : 'Novo Paciente'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="text-[#8C8B6E] hover:text-[#4F4E3A]">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={save} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Nome completo *">
                  <input required value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className={inputClass} />
                </Field>
                <Field label="Status">
                  <select value={form.status || 'active'} onChange={(e) => setForm({ ...form, status: e.target.value as Patient['status'] })}
                    className={inputClass}>
                    <option value="active">Ativo</option>
                    <option value="paused">Pausado</option>
                    <option value="inactive">Inativo</option>
                  </select>
                </Field>
                <Field label="E-mail">
                  <input type="email" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className={inputClass} />
                </Field>
                <Field label="Telefone">
                  <input value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className={inputClass} />
                </Field>
                <Field label="Data de nascimento">
                  <input type="date" value={form.birth_date || ''} onChange={(e) => setForm({ ...form, birth_date: e.target.value })}
                    className={inputClass} />
                </Field>
                <Field label="Gênero">
                  <select value={form.gender || 'female'} onChange={(e) => setForm({ ...form, gender: e.target.value as Patient['gender'] })}
                    className={inputClass}>
                    <option value="female">Feminino</option>
                    <option value="male">Masculino</option>
                    <option value="other">Outro</option>
                  </select>
                </Field>
                <Field label="Peso (kg)">
                  <input type="number" step="0.01" value={form.weight_kg ?? ''} onChange={(e) => setForm({ ...form, weight_kg: e.target.value ? Number(e.target.value) : null })}
                    className={inputClass} />
                </Field>
                <Field label="Altura (cm)">
                  <input type="number" step="0.1" value={form.height_cm ?? ''} onChange={(e) => setForm({ ...form, height_cm: e.target.value ? Number(e.target.value) : null })}
                    className={inputClass} />
                </Field>
              </div>

              <Field label="Objetivo">
                <input value={form.objective || ''} onChange={(e) => setForm({ ...form, objective: e.target.value })}
                  placeholder="Ex: Perder peso, ganhar massa magra..." className={inputClass} />
              </Field>
              <Field label="Histórico de saúde">
                <textarea rows={2} value={form.health_history || ''} onChange={(e) => setForm({ ...form, health_history: e.target.value })}
                  className={inputClass} />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Alergias">
                  <input value={form.allergies || ''} onChange={(e) => setForm({ ...form, allergies: e.target.value })}
                    className={inputClass} />
                </Field>
                <Field label="Medicamentos">
                  <input value={form.medications || ''} onChange={(e) => setForm({ ...form, medications: e.target.value })}
                    className={inputClass} />
                </Field>
              </div>

              <div className="flex gap-3 pt-4">
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

const inputClass = "w-full px-4 py-2.5 rounded-xl border border-[#D5CFBE] bg-[#FDFCF7] focus:border-[#8C8B6E] focus:ring-2 focus:ring-[#8C8B6E]/20 outline-none transition-all text-[#4F4E3A] placeholder:text-[#B8B099] text-sm";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-[#4F4E3A] mb-1.5">{label}</label>
      {children}
    </div>
  );
}
