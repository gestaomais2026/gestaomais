import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase, PayableEntry, ExpenseCategory } from '@/lib/supabase';
import { Plus, CreditCard as Edit2, Trash2, X, Search, ChevronLeft, ChevronRight, Wallet, TrendingUp, TrendingDown, Scale, PlusCircle } from 'lucide-react';

type EntryRow = PayableEntry & { category: ExpenseCategory | null };

const STATUS_CFG: Record<PayableEntry['status'], { label: string; color: string; bg: string }> = {
  aberto: { label: 'Aberto', color: 'text-amber-700', bg: 'bg-amber-100' },
  pago: { label: 'Pago', color: 'text-green-700', bg: 'bg-green-100' },
  vencido: { label: 'Vencido', color: 'text-red-700', bg: 'bg-red-100' },
};

const CLASS_CFG: Record<PayableEntry['classification'], { label: string; color: string; bg: string }> = {
  fixo: { label: 'Fixo', color: 'text-blue-700', bg: 'bg-blue-100' },
  variavel: { label: 'Variável', color: 'text-purple-700', bg: 'bg-purple-100' },
};

function monthYearFromDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function currentMonthYear() {
  return monthYearFromDate(new Date());
}
function monthLabel(my: string) {
  const [y, m] = my.split('-');
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}
function shiftMonth(my: string, delta: number) {
  const [y, m] = my.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return monthYearFromDate(d);
}

const emptyForm: Partial<PayableEntry> & { newCategory?: string } = {
  description: '',
  amount: 0,
  due_date: new Date().toISOString().slice(0, 10),
  paid_at: null,
  status: 'aberto',
  classification: 'variavel',
  category_id: null,
  bank_info: '',
  month_year: currentMonthYear(),
};

export default function ContasAPagar() {
  const monthYear = currentMonthYear();
  const [viewMonth, setViewMonth] = useState(monthYear);
  const [entries, setEntries] = useState<EntryRow[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [openingBalance, setOpeningBalance] = useState<number>(0);
  const [balanceId, setBalanceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingBalance, setSavingBalance] = useState(false);

  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterClass, setFilterClass] = useState('all');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<EntryRow | null>(null);
  const [form, setForm] = useState<typeof emptyForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [showNewCat, setShowNewCat] = useState(false);

  const loadCategories = useCallback(async () => {
    const { data } = await supabase
      .from('expense_categories')
      .select('*')
      .order('name', { ascending: true });
    setCategories((data as ExpenseCategory[]) || []);
  }, []);

  const loadBalance = useCallback(async () => {
    const { data } = await supabase
      .from('payable_monthly_balances')
      .select('*')
      .eq('month_year', viewMonth)
      .maybeSingle();
    if (data) {
      setBalanceId((data as any).id);
      setOpeningBalance(Number((data as any).opening_balance));
    } else {
      setBalanceId(null);
      setOpeningBalance(0);
    }
  }, [viewMonth]);

  const loadEntries = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from('payable_entries')
      .select('*, category:expense_categories(*)')
      .eq('month_year', viewMonth)
      .order('due_date', { ascending: true });
    if (search) q = q.ilike('description', `%${search}%`);
    if (dateFrom) q = q.gte('due_date', dateFrom);
    if (dateTo) q = q.lte('due_date', dateTo);
    if (filterCategory !== 'all') q = q.eq('category_id', filterCategory);
    if (filterStatus !== 'all') q = q.eq('status', filterStatus);
    if (filterClass !== 'all') q = q.eq('classification', filterClass);
    const { data } = await q;
    setEntries((data as EntryRow[]) || []);
    setLoading(false);
  }, [viewMonth, search, dateFrom, dateTo, filterCategory, filterStatus, filterClass]);

  useEffect(() => { loadCategories(); }, [loadCategories]);
  useEffect(() => { loadBalance(); }, [loadBalance]);
  useEffect(() => { loadEntries(); }, [loadEntries]);

  const totals = useMemo(() => {
    const paid = entries
      .filter((e) => e.status === 'pago')
      .reduce((s, e) => s + Number(e.amount), 0);
    const entradas = 0;
    const finalBalance = openingBalance + entradas - paid;
    return { paid, entradas, finalBalance };
  }, [entries, openingBalance]);

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const fmtDate = (d: string | null) => (d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '-');

  async function saveOpeningBalance() {
    setSavingBalance(true);
    const payload = {
      month_year: viewMonth,
      opening_balance: openingBalance,
    };
    if (balanceId) {
      await supabase.from('payable_monthly_balances').update(payload).eq('id', balanceId);
    } else {
      const { data } = await supabase
        .from('payable_monthly_balances')
        .insert(payload)
        .select()
        .single();
      if (data) setBalanceId((data as any).id);
    }
    setSavingBalance(false);
  }

  async function createCategory(name: string): Promise<string | null> {
    const trimmed = name.trim();
    if (!trimmed) return null;
    const existing = categories.find((c) => c.name.toLowerCase() === trimmed.toLowerCase());
    if (existing) return existing.id;
    const { data, error } = await supabase
      .from('expense_categories')
      .insert({ name: trimmed })
      .select()
      .single();
    if (error) {
      alert('Erro ao cadastrar categoria: ' + error.message);
      return null;
    }
    const newCat = data as ExpenseCategory;
    setCategories((prev) => [...prev, newCat].sort((a, b) => a.name.localeCompare(b.name)));
    return newCat.id;
  }

  function openNew() {
    setEditing(null);
    setForm({ ...emptyForm, month_year: viewMonth, due_date: new Date().toISOString().slice(0, 10) });
    setShowNewCat(false);
    setModalOpen(true);
  }

  function openEdit(e: EntryRow) {
    setEditing(e);
    setForm({
      description: e.description,
      amount: Number(e.amount),
      due_date: e.due_date,
      paid_at: e.paid_at,
      status: e.status,
      classification: e.classification,
      category_id: e.category_id,
      bank_info: e.bank_info || '',
      month_year: e.month_year,
    });
    setShowNewCat(false);
    setModalOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    let categoryId = form.category_id;
    if (showNewCat && form.newCategory?.trim()) {
      const newId = await createCategory(form.newCategory);
      if (newId) categoryId = newId;
    }

    const payload = {
      description: form.description,
      amount: Number(form.amount),
      due_date: form.due_date,
      paid_at: form.status === 'pago' ? form.paid_at || form.due_date : null,
      status: form.status,
      classification: form.classification,
      category_id: categoryId || null,
      bank_info: form.bank_info || null,
      month_year: form.month_year,
    };

    if (editing) {
      await supabase.from('payable_entries').update(payload).eq('id', editing.id);
    } else {
      await supabase.from('payable_entries').insert(payload);
    }
    setSaving(false);
    setModalOpen(false);
    loadEntries();
  }

  async function remove(id: string) {
    if (!confirm('Deseja realmente excluir este lançamento?')) return;
    await supabase.from('payable_entries').delete().eq('id', id);
    loadEntries();
  }

  async function quickStatus(e: EntryRow, status: PayableEntry['status']) {
    const patch: Partial<PayableEntry> = { status };
    if (status === 'pago' && !e.paid_at) {
      patch.paid_at = new Date().toISOString().slice(0, 10);
    } else if (status !== 'pago') {
      patch.paid_at = null;
    }
    await supabase.from('payable_entries').update(patch).eq('id', e.id);
    loadEntries();
  }

  return (
    <div className="space-y-6">
      {/* Navegação do mês */}
      <div className="flex items-center justify-center gap-4">
        <button onClick={() => setViewMonth(shiftMonth(viewMonth, -1))}
          className="p-2 rounded-lg text-[#4F4E3A] hover:bg-[#F5F2E8] transition-colors" title="Mês anterior">
          <ChevronLeft size={22} />
        </button>
        <h2 className="text-lg font-serif font-bold text-[#4F4E3A] capitalize min-w-56 text-center">
          {monthLabel(viewMonth)}
        </h2>
        <button onClick={() => setViewMonth(shiftMonth(viewMonth, 1))}
          className="p-2 rounded-lg text-[#4F4E3A] hover:bg-[#F5F2E8] transition-colors" title="Próximo mês">
          <ChevronRight size={22} />
        </button>
      </div>

      {/* Cartões de resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard icon={Wallet} label="Saldo inicial" value={fmt(openingBalance)}
          color="from-[#8C8B6E] to-[#6B6A50]"
          editable
          editingValue={openingBalance}
          onEdit={setOpeningBalance}
          onSave={saveOpeningBalance}
          saving={savingBalance} />
        <SummaryCard icon={TrendingUp} label="Entradas" value={fmt(totals.entradas)}
          color="from-[#6B8E5A] to-[#4F6B3E]" />
        <SummaryCard icon={TrendingDown} label="Despesas pagas" value={fmt(totals.paid)}
          color="from-[#B05050] to-[#8B3030]" />
        <SummaryCard icon={Scale} label="Saldo final" value={fmt(totals.finalBalance)}
          color={totals.finalBalance >= 0 ? 'from-[#6B8E5A] to-[#4F6B3E]' : 'from-[#B05050] to-[#8B3030]'} />
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#E0D9C3] p-5">
        <div className="flex flex-col gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8C8B6E]" size={20} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por descrição..."
              className="w-full pl-12 pr-4 py-2.5 rounded-xl border border-[#D5CFBE] bg-[#FDFCF7] focus:border-[#8C8B6E] focus:ring-2 focus:ring-[#8C8B6E]/20 outline-none transition-all text-[#4F4E3A] placeholder:text-[#B8B099] text-sm"
            />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#8C8B6E] mb-1">Período início</label>
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#8C8B6E] mb-1">Período fim</label>
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#8C8B6E] mb-1">Categoria</label>
              <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className={inputClass}>
                <option value="all">Todas</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#8C8B6E] mb-1">Status</label>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className={inputClass}>
                <option value="all">Todos</option>
                <option value="aberto">Aberto</option>
                <option value="pago">Pago</option>
                <option value="vencido">Vencido</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#8C8B6E] mb-1">Classificação</label>
              <select value={filterClass} onChange={(e) => setFilterClass(e.target.value)} className={inputClass}>
                <option value="all">Todas</option>
                <option value="fixo">Fixo</option>
                <option value="variavel">Variável</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end">
            <button
              onClick={() => { setSearch(''); setDateFrom(''); setDateTo(''); setFilterCategory('all'); setFilterStatus('all'); setFilterClass('all'); }}
              className="px-4 py-2 rounded-lg border border-[#D5CFBE] bg-white text-[#4F4E3A] text-sm font-medium hover:bg-[#F5F2E8] transition-colors"
            >
              Limpar filtros
            </button>
          </div>
        </div>
      </div>

      {/* Lista de lançamentos */}
      <div className="flex items-center justify-between">
        <h3 className="font-serif font-bold text-[#4F4E3A] text-lg">Lançamentos do mês</h3>
        <button
          onClick={openNew}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#4F4E3A] text-white font-medium hover:bg-[#3D3C2A] transition-all shadow-md flex-shrink-0"
        >
          <Plus size={20} /> Novo Lançamento
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin w-10 h-10 border-3 border-[#4F4E3A] border-t-transparent rounded-full" />
        </div>
      ) : entries.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E0D9C3] p-12 text-center">
          <Wallet className="mx-auto mb-3 text-[#8C8B6E] opacity-40" size={40} />
          <p className="text-[#8C8B6E] text-lg">Nenhum lançamento neste mês</p>
          <p className="text-[#B8B099] text-sm mt-1">Cadastre suas contas a pagar para acompanhar o fluxo de caixa</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-[#E0D9C3] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[#8C8B6E] bg-[#F5F2E8]">
                  <th className="px-4 py-3 font-medium">Descrição</th>
                  <th className="px-4 py-3 font-medium text-right">Valor</th>
                  <th className="px-4 py-3 font-medium">Vencimento</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Classificação</th>
                  <th className="px-4 py-3 font-medium">Categoria</th>
                  <th className="px-4 py-3 font-medium">Dados bancários</th>
                  <th className="px-4 py-3 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => {
                  const stCfg = STATUS_CFG[e.status];
                  const clCfg = CLASS_CFG[e.classification];
                  return (
                    <tr key={e.id} className="border-t border-[#E0D9C3] hover:bg-[#FDFCF7] transition-colors">
                      <td className="px-4 py-3 text-[#4F4E3A] font-medium">{e.description}</td>
                      <td className="px-4 py-3 text-right font-medium text-[#4F4E3A] whitespace-nowrap">{fmt(Number(e.amount))}</td>
                      <td className="px-4 py-3 text-[#4F4E3A] whitespace-nowrap">{fmtDate(e.due_date)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${stCfg.bg} ${stCfg.color}`}>{stCfg.label}</span>
                          {e.status !== 'pago' && (
                            <button
                              onClick={() => quickStatus(e, 'pago')}
                              title="Marcar como pago"
                              className="p-1 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            </button>
                          )}
                          {e.status === 'pago' && (
                            <button
                              onClick={() => quickStatus(e, 'aberto')}
                              title="Reabrir"
                              className="p-1 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg>
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${clCfg.bg} ${clCfg.color}`}>{clCfg.label}</span>
                      </td>
                      <td className="px-4 py-3 text-[#8C8B6E]">{e.category?.name || '-'}</td>
                      <td className="px-4 py-3 text-[#8C8B6E] max-w-40 truncate" title={e.bank_info || ''}>{e.bank_info || '-'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openEdit(e)} title="Editar"
                            className="p-1.5 rounded-lg bg-[#F5F2E8] text-[#4F4E3A] hover:bg-[#EDE8D9] transition-colors">
                            <Edit2 size={16} />
                          </button>
                          <button onClick={() => remove(e.id)} title="Excluir"
                            className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de lançamento */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-[#E0D9C3] sticky top-0 bg-white z-10">
              <h2 className="text-xl font-serif font-bold text-[#4F4E3A]">
                {editing ? 'Editar Lançamento' : 'Novo Lançamento'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="text-[#8C8B6E] hover:text-[#4F4E3A]">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={save} className="p-6 space-y-4">
              <Field label="Descrição *">
                <input required value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Ex: Aluguel do consultório" className={inputClass} />
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Valor *">
                  <input required type="number" step="0.01" min="0" value={form.amount || 0}
                    onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} className={inputClass} />
                </Field>
                <Field label="Vencimento *">
                  <input required type="date" value={form.due_date || ''}
                    onChange={(e) => setForm({ ...form, due_date: e.target.value })} className={inputClass} />
                </Field>
                <Field label="Status">
                  <select value={form.status || 'aberto'} onChange={(e) => setForm({ ...form, status: e.target.value as PayableEntry['status'] })}
                    className={inputClass}>
                    <option value="aberto">Aberto</option>
                    <option value="pago">Pago</option>
                    <option value="vencido">Vencido</option>
                  </select>
                </Field>
                <Field label="Classificação">
                  <select value={form.classification || 'variavel'} onChange={(e) => setForm({ ...form, classification: e.target.value as PayableEntry['classification'] })}
                    className={inputClass}>
                    <option value="fixo">Fixo</option>
                    <option value="variavel">Variável</option>
                  </select>
                </Field>
                {form.status === 'pago' && (
                  <Field label="Data de pagamento">
                    <input type="date" value={form.paid_at || ''} onChange={(e) => setForm({ ...form, paid_at: e.target.value })} className={inputClass} />
                  </Field>
                )}
                <Field label="Mês de referência">
                  <input type="month" value={form.month_year || ''} onChange={(e) => setForm({ ...form, month_year: e.target.value })} className={inputClass} />
                </Field>
              </div>

              {/* Categoria com criação inline */}
              <div>
                <label className="block text-sm font-medium text-[#4F4E3A] mb-1.5">Categoria</label>
                {!showNewCat ? (
                  <div className="flex gap-2">
                    <select value={form.category_id || ''} onChange={(e) => setForm({ ...form, category_id: e.target.value || null })}
                      className={inputClass}>
                      <option value="">Sem categoria</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    <button type="button" onClick={() => setShowNewCat(true)}
                      className="flex items-center gap-1 px-3 py-2.5 rounded-xl border border-[#D5CFBE] bg-[#F5F2E8] text-[#4F4E3A] text-sm font-medium hover:bg-[#EDE8D9] transition-colors whitespace-nowrap flex-shrink-0">
                      <PlusCircle size={16} /> Nova
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      autoFocus
                      value={form.newCategory || ''}
                      onChange={(e) => setForm({ ...form, newCategory: e.target.value })}
                      placeholder="Nome da nova categoria"
                      className={inputClass}
                    />
                    <button type="button" onClick={() => { setShowNewCat(false); setForm({ ...form, newCategory: '' }); }}
                      className="px-3 py-2.5 rounded-xl border border-[#D5CFBE] bg-white text-[#8C8B6E] text-sm hover:bg-[#F5F2E8] transition-colors flex-shrink-0">
                      <X size={16} />
                    </button>
                  </div>
                )}
              </div>

              <Field label="Dados bancários">
                <input value={form.bank_info || ''} onChange={(e) => setForm({ ...form, bank_info: e.target.value })}
                  placeholder="Ex: Banco X, Ag 1234, Conta 56789-0" className={inputClass} />
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

const inputClass =
  "w-full px-4 py-2.5 rounded-xl border border-[#D5CFBE] bg-[#FDFCF7] focus:border-[#8C8B6E] focus:ring-2 focus:ring-[#8C8B6E]/20 outline-none transition-all text-[#4F4E3A] text-sm";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-[#4F4E3A] mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function SummaryCard({
  icon: Icon, label, value, color, editable, editingValue, onEdit, onSave, saving,
}: {
  icon: React.ElementType; label: string; value: string; color: string;
  editable?: boolean; editingValue?: number; onEdit?: (v: number) => void; onSave?: () => void; saving?: boolean;
}) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#E0D9C3]">
      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-3`}>
        <Icon className="text-white" size={20} />
      </div>
      {editable ? (
        <div className="flex items-center gap-2">
          <input
            type="number"
            step="0.01"
            value={editingValue ?? 0}
            onChange={(e) => onEdit?.(Number(e.target.value))}
            className="w-full text-xl font-bold text-[#4F4E3A] leading-tight bg-transparent border-b border-[#D5CFBE] focus:border-[#8C8B6E] outline-none"
          />
          <button
            onClick={onSave}
            disabled={saving}
            className="text-xs px-2 py-1 rounded-lg bg-[#4F4E3A] text-white hover:bg-[#3D3C2A] transition-colors disabled:opacity-50 flex-shrink-0"
          >
            {saving ? '...' : 'OK'}
          </button>
        </div>
      ) : (
        <p className="text-xl font-bold text-[#4F4E3A] leading-tight">{value}</p>
      )}
      <p className="text-sm text-[#8C8B6E] mt-0.5">{label}</p>
    </div>
  );
}
