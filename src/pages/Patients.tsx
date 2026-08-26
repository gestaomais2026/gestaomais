import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase, Patient, Doctor } from '@/lib/supabase';
import AnamneseViewer from '@/components/AnamneseViewer';
import {
  Search, CreditCard as Edit2, Trash2, Phone, Mail, X, UserPlus,
  Stethoscope, ClipboardList, ChevronDown, ChevronLeft, ChevronRight,
} from 'lucide-react';

const PAGE_SIZE = 20;

const emptyForm: Partial<Patient> = {
  name: '', email: '', phone: '', birth_date: '', gender: 'female',
  weight_kg: null, height_cm: null, objective: '', health_history: '',
  allergies: '', medications: '', status: 'active', doctor_id: null,
};

export default function Patients() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [doctors, setDoctors] = useState<Doctor[]>([]);

  const [searchInput, setSearchInput] = useState('');   // valor do input (imediato)
  const [search, setSearch] = useState('');              // valor usado na query (com debounce)
  const [page, setPage] = useState(0);                   // página atual (0-based)

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Patient | null>(null);
  const [form, setForm] = useState<Partial<Patient>>(emptyForm);
  const [saving, setSaving] = useState(false);

  // Debounce: só atualiza `search` (e dispara query) 350ms após parar de digitar
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(0); // toda nova busca volta pra primeira página
      setSearch(searchInput);
    }, 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchInput]);

  const load = useCallback(async () => {
    setLoading(true);
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let q = supabase
      .from('patients')
      .select('*, doctor:doctors(*)', { count: 'exact' })
      .order('name', { ascending: true })
      .range(from, to);

    if (search) q = q.ilike('name', `%${search}%`);

    const { data, count } = await q;
    setPatients((data as Patient[]) || []);
    setTotalCount(count || 0);
    setLoading(false);
  }, [search, page]);

  useEffect(() => { load(); }, [load]);

  // Doutores só precisam ser carregados uma vez (usados no formulário)
  useEffect(() => {
    supabase.from('doctors').select('*').order('name').then(({ data }) => {
      setDoctors((data as Doctor[]) || []);
    });
  }, []);

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
      doctor_id: form.doctor_id || null,
      profession: form.profession || null,
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
    if (expandedId === id) setExpandedId(null);
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

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const rangeStart = totalCount === 0 ? 0 : page * PAGE_SIZE + 1;
  const rangeEnd = Math.min(totalCount, (page + 1) * PAGE_SIZE);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8C8B6E]" size={20} />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
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

      {/* Contador de resultados */}
      {!loading && totalCount > 0 && (
        <p className="text-xs text-[#8C8B6E]">
          Mostrando {rangeStart}–{rangeEnd} de {totalCount} pacientes
        </p>
      )}

      {/* Lista */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin w-10 h-10 border-3 border-[#4F4E3A] border-t-transparent rounded-full" />
        </div>
      ) : patients.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E0D9C3] p-12 text-center">
          <p className="text-[#8C8B6E] text-lg">Nenhum paciente encontrado</p>
          <p className="text-[#B8B099] text-sm mt-1">
            {search ? 'Tente outro termo de busca' : 'Clique em "Novo Paciente" para começar'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#E0D9C3] overflow-hidden">
          {/* Cabeçalho (só em telas maiores) */}
          <div className="hidden md:grid grid-cols-[1fr_70px_110px_140px_90px_90px] gap-3 px-4 py-2 bg-[#F5F2E8] text-[11px] font-medium text-[#8C8B6E] uppercase tracking-wide">
            <span>Paciente</span>
            <span>Idade</span>
            <span>Status</span>
            <span>Médico</span>
            <span>IMC</span>
            <span className="text-right">Ações</span>
          </div>

          <div className="divide-y divide-[#E0D9C3]">
            {patients.map((p) => {
              const age = calcAge(p.birth_date);
              const bmi = calcBMI(p.weight_kg, p.height_cm);
              const isExpanded = expandedId === p.id;
              return (
                <div key={p.id}>
                  {/* Linha compacta — clicável */}
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : p.id)}
                    className="w-full grid grid-cols-[1fr_auto] md:grid-cols-[1fr_70px_110px_140px_90px_90px] gap-3 items-center px-4 py-3 text-left hover:bg-[#F5F2E8]/60 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <ChevronDown
                        size={16}
                        className={`flex-shrink-0 text-[#8C8B6E] transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      />
                      <div className="w-8 h-8 flex-shrink-0 rounded-full bg-gradient-to-br from-[#C4A77D] to-[#8C8B6E] flex items-center justify-center text-white font-bold text-xs">
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-serif font-bold text-[#4F4E3A] text-sm truncate">{p.name}</p>
                        <p className="text-[11px] text-[#8C8B6E] md:hidden">
                          {age !== null ? `${age} anos` : ''}
                          {p.doctor ? ` · ${p.doctor.name}` : ''}
                        </p>
                      </div>
                    </div>

                    <span className="hidden md:block text-sm text-[#4F4E3A]">{age !== null ? `${age} anos` : '-'}</span>

                    <span className="hidden md:block">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium
                        ${p.status === 'active' ? 'bg-green-100 text-green-700' :
                          p.status === 'paused' ? 'bg-amber-100 text-amber-700' :
                          'bg-gray-100 text-gray-600'}`}>
                        {p.status === 'active' ? 'Ativo' : p.status === 'paused' ? 'Pausado' : 'Inativo'}
                      </span>
                    </span>

                    <span className="hidden md:block text-sm text-[#4F4E3A] truncate">{p.doctor?.name || '-'}</span>
                    <span className="hidden md:block text-sm text-[#4F4E3A]">{bmi || '-'}</span>

                    <span className="hidden md:flex justify-end">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium md:hidden
                        ${p.status === 'active' ? 'bg-green-100 text-green-700' : ''}`} />
                    </span>
                  </button>

                  {/* Detalhes expandidos */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-1 bg-[#FAF8F1] border-t border-[#E0D9C3]">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                        <div className="bg-white rounded-lg px-3 py-2 border border-[#E0D9C3]">
                          <p className="text-[11px] text-[#8C8B6E]">Peso</p>
                          <p className="text-sm font-bold text-[#4F4E3A]">{p.weight_kg ? `${p.weight_kg}kg` : '-'}</p>
                        </div>
                        <div className="bg-white rounded-lg px-3 py-2 border border-[#E0D9C3]">
                          <p className="text-[11px] text-[#8C8B6E]">Altura</p>
                          <p className="text-sm font-bold text-[#4F4E3A]">{p.height_cm ? `${p.height_cm}cm` : '-'}</p>
                        </div>
                        <div className="bg-white rounded-lg px-3 py-2 border border-[#E0D9C3]">
                          <p className="text-[11px] text-[#8C8B6E]">IMC</p>
                          <p className="text-sm font-bold text-[#4F4E3A]">{bmi || '-'}</p>
                        </div>
                      </div>

                      {p.objective && (
                        <p className="text-sm text-[#4F4E3A] bg-white border border-[#E0D9C3] rounded-lg px-3 py-2 mb-3">
                          🎯 {p.objective}
                        </p>
                      )}

                      {(p.phone || p.email) && (
                        <div className="flex flex-wrap gap-4 text-sm text-[#8C8B6E] mb-3">
                          {p.phone && <span className="flex items-center gap-1.5"><Phone size={14} /> {p.phone}</span>}
                          {p.email && <span className="flex items-center gap-1.5"><Mail size={14} /> {p.email}</span>}
                        </div>
                      )}

                      {(p.allergies || p.medications) && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3 text-sm">
                          {p.allergies && (
                            <div>
                              <p className="text-[11px] text-[#8C8B6E] uppercase">Alergias</p>
                              <p className="text-[#4F4E3A]">{p.allergies}</p>
                            </div>
                          )}
                          {p.medications && (
                            <div>
                              <p className="text-[11px] text-[#8C8B6E] uppercase">Medicamentos</p>
                              <p className="text-[#4F4E3A]">{p.medications}</p>
                            </div>
                          )}
                        </div>
                      )}

                      {p.health_history && (
                        <div className="mb-3 text-sm">
                          <p className="text-[11px] text-[#8C8B6E] uppercase">Histórico de saúde</p>
                          <p className="text-[#4F4E3A]">{p.health_history}</p>
                        </div>
                      )}

                      <div className="mb-3">
                        <AnamneseViewer patientId={p.id} patientName={p.name} trigger="badge" />
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); openEdit(p); }}
                          className="flex items-center justify-center gap-1.5 py-2 px-4 rounded-lg bg-[#4F4E3A] text-white text-sm font-medium hover:bg-[#3D3C2A] transition-colors"
                        >
                          <Edit2 size={14} /> Editar
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); remove(p.id); }}
                          className="flex items-center justify-center gap-1.5 py-2 px-4 rounded-lg bg-red-50 text-red-600 text-sm font-medium hover:bg-red-100 transition-colors"
                        >
                          <Trash2 size={14} /> Excluir
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Paginação */}
      {!loading && totalCount > PAGE_SIZE && (
        <div className="flex items-center justify-between px-1">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium text-[#4F4E3A] bg-white border border-[#E0D9C3] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#F5F2E8]"
          >
            <ChevronLeft size={16} /> Anterior
          </button>
          <span className="text-xs text-[#8C8B6E]">
            Página {page + 1} de {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium text-[#4F4E3A] bg-white border border-[#E0D9C3] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#F5F2E8]"
          >
            Próxima <ChevronRight size={16} />
          </button>
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

              <Field label="Profissão">
                <input value={form.profession || ''} onChange={(e) => setForm({ ...form, profession: e.target.value })}
                  className={inputClass} />
              </Field>

              <Field label="Médico referente (indicação)">
                <select value={form.doctor_id || ''} onChange={(e) => setForm({ ...form, doctor_id: e.target.value || null })}
                  className={inputClass}>
                  <option value="">Nenhum / Sem indicação</option>
                  {doctors.map((d) => <option key={d.id} value={d.id}>{d.name}{d.specialty ? ` — ${d.specialty}` : ''}</option>)}
                </select>
              </Field>

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
