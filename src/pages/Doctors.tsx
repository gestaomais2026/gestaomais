import { useEffect, useState, useCallback } from 'react';
import { supabase, Doctor } from '@/lib/supabase';
import { Plus, Edit2, Trash2, Phone, Mail, X, Stethoscope, Search } from 'lucide-react';

const emptyForm: Partial<Doctor> = {
  name: '', specialty: '', crm: '', email: '', phone: '', notes: '', status: 'active',
};

export default function Doctors() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Doctor | null>(null);
  const [form, setForm] = useState<Partial<Doctor>>(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase.from('doctors').select('*').order('name', { ascending: true });
    if (search) q = q.ilike('name', `%${search}%`);
    const { data } = await q;
    setDoctors((data as Doctor[]) || []);
    setLoading(false);
  }, [search]);

  useEffect(() => { load(); }, [load]);

  function openNew() {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(d: Doctor) {
    setEditing(d);
    setForm({ ...d });
    setModalOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = {
      name: form.name,
      specialty: form.specialty || null,
      crm: form.crm || null,
      email: form.email || null,
      phone: form.phone || null,
      notes: form.notes || null,
      status: form.status || 'active',
    };
    if (editing) {
      await supabase.from('doctors').update(payload).eq('id', editing.id);
    } else {
      await supabase.from('doctors').insert(payload);
    }
    setSaving(false);
    setModalOpen(false);
    load();
  }

  async function remove(id: string) {
    if (!confirm('Deseja realmente excluir este médico referente?')) return;
    await supabase.from('doctors').delete().eq('id', id);
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8C8B6E]" size={20} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar médico por nome..."
            className="w-full pl-12 pr-4 py-3 rounded-xl border border-[#D5CFBE] bg-white focus:border-[#8C8B6E] focus:ring-2 focus:ring-[#8C8B6E]/20 outline-none transition-all text-[#4F4E3A] placeholder:text-[#B8B099]"
          />
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-[#4F4E3A] text-white font-medium hover:bg-[#3D3C2A] transition-all shadow-md flex-shrink-0"
        >
          <Plus size={20} /> Novo Médico
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin w-10 h-10 border-3 border-[#4F4E3A] border-t-transparent rounded-full" />
        </div>
      ) : doctors.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E0D9C3] p-12 text-center">
          <Stethoscope className="mx-auto mb-3 text-[#8C8B6E] opacity-40" size={40} />
          <p className="text-[#8C8B6E] text-lg">Nenhum médico referente cadastrado</p>
          <p className="text-[#B8B099] text-sm mt-1">Cadastre médicos para vincular pacientes indicados</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {doctors.map((d) => (
            <div
              key={d.id}
              className="bg-white rounded-2xl shadow-sm border border-[#E0D9C3] p-5 hover:shadow-md transition-all group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#6B8E5A] to-[#4F6B3E] flex items-center justify-center text-white">
                    <Stethoscope size={22} />
                  </div>
                  <div>
                    <h3 className="font-serif font-bold text-[#4F4E3A] leading-tight">{d.name}</h3>
                    {d.specialty && <p className="text-xs text-[#8C8B6E]">{d.specialty}</p>}
                  </div>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium
                  ${d.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                  {d.status === 'active' ? 'Ativo' : 'Inativo'}
                </span>
              </div>

              {d.crm && (
                <p className="text-sm text-[#4F4E3A] bg-[#F5F2E8] rounded-lg px-3 py-2 mb-3">
                  CRM: {d.crm}
                </p>
              )}

              <div className="space-y-1.5 text-sm text-[#8C8B6E] mb-4">
                {d.phone && (
                  <div className="flex items-center gap-2">
                    <Phone size={14} /> {d.phone}
                  </div>
                )}
                {d.email && (
                  <div className="flex items-center gap-2 truncate">
                    <Mail size={14} /> <span className="truncate">{d.email}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-3 border-t border-[#E0D9C3]">
                <button
                  onClick={() => openEdit(d)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-[#F5F2E8] text-[#4F4E3A] text-sm font-medium hover:bg-[#EDE8D9] transition-colors"
                >
                  <Edit2 size={16} /> Editar
                </button>
                <button
                  onClick={() => remove(d.id)}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-red-50 text-red-600 text-sm font-medium hover:bg-red-100 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-[#E0D9C3] sticky top-0 bg-white z-10">
              <h2 className="text-xl font-serif font-bold text-[#4F4E3A]">
                {editing ? 'Editar Médico' : 'Novo Médico Referente'}
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
                <Field label="Especialidade">
                  <input value={form.specialty || ''} onChange={(e) => setForm({ ...form, specialty: e.target.value })}
                    placeholder="Ex: Cardiologista" className={inputClass} />
                </Field>
                <Field label="CRM">
                  <input value={form.crm || ''} onChange={(e) => setForm({ ...form, crm: e.target.value })}
                    placeholder="Ex: 12345-SP" className={inputClass} />
                </Field>
                <Field label="Status">
                  <select value={form.status || 'active'} onChange={(e) => setForm({ ...form, status: e.target.value as Doctor['status'] })}
                    className={inputClass}>
                    <option value="active">Ativo</option>
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
              </div>

              <Field label="Observações">
                <textarea rows={3} value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className={inputClass} />
              </Field>

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
