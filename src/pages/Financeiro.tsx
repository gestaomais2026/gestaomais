import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase, Payment, Patient } from '@/lib/supabase';
import {
  Plus, Edit2, Trash2, X, DollarSign, Download, Search,
  CheckCircle2, Clock, XCircle, AlertCircle, TrendingUp
} from 'lucide-react';

const emptyForm = {
  patient_id: '',
  service_date: new Date().toISOString().slice(0, 10),
  description: '',
  amount: '' as string | number,
  payment_method: 'pix' as Payment['payment_method'],
  payment_status: 'pending' as Payment['payment_status'],
  insurance_plan: '',
  notes: '',
};

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  pending:   { label: 'Pendente',   color: 'text-amber-700',  bg: 'bg-amber-100',  icon: Clock },
  paid:      { label: 'Pago',       color: 'text-green-700',  bg: 'bg-green-100',  icon: CheckCircle2 },
  overdue:   { label: 'Em atraso',  color: 'text-red-700',    bg: 'bg-red-100',    icon: AlertCircle },
  cancelled: { label: 'Cancelado',  color: 'text-gray-600',   bg: 'bg-gray-100',   icon: XCircle },
};

const methodLabels: Record<string, string> = {
  pix: 'Pix',
  dinheiro: 'Dinheiro',
  'cartão débito': 'Cartão Débito',
  'cartão crédito': 'Cartão Crédito',
  convênio: 'Convênio',
  outro: 'Outro',
};

export default function Financeiro() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Payment | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [monthFilter, setMonthFilter] = useState<string>('');

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('payments')
      .select('*, patient:patients(*)')
      .order('service_date', { ascending: false });
    setPayments((data as Payment[]) || []);
    const { data: pData } = await supabase.from('patients').select('*').order('name');
    setPatients((pData as Patient[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    return payments.filter((p) => {
      const matchSearch = !search || p.patient?.name?.toLowerCase().includes(search.toLowerCase()) ||
        (p.description ?? '').toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'all' || p.payment_status === statusFilter;
      const matchMonth = !monthFilter || p.service_date.startsWith(monthFilter);
      return matchSearch && matchStatus && matchMonth;
    });
  }, [payments, search, statusFilter, monthFilter]);

  const totals = useMemo(() => {
    const total = filtered.reduce((s, p) => s + Number(p.amount), 0);
    const received = filtered.filter((p) => p.payment_status === 'paid').reduce((s, p) => s + Number(p.amount), 0);
    const pending = filtered.filter((p) => p.payment_status === 'pending').reduce((s, p) => s + Number(p.amount), 0);
    const overdue = filtered.filter((p) => p.payment_status === 'overdue').reduce((s, p) => s + Number(p.amount), 0);
    return { total, received, pending, overdue };
  }, [filtered]);

  function openNew() {
    setEditing(null);
    setForm({ ...emptyForm, service_date: new Date().toISOString().slice(0, 10) });
    setModalOpen(true);
  }

  function openEdit(pay: Payment) {
    setEditing(pay);
    setForm({
      patient_id: pay.patient_id,
      service_date: pay.service_date,
      description: pay.description ?? '',
      amount: pay.amount,
      payment_method: pay.payment_method,
      payment_status: pay.payment_status,
      insurance_plan: pay.insurance_plan ?? '',
      notes: pay.notes ?? '',
    });
    setModalOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = {
      patient_id: form.patient_id,
      service_date: form.service_date,
      description: form.description || null,
      amount: Number(form.amount),
      payment_method: form.payment_method || null,
      payment_status: form.payment_status,
      insurance_plan: form.insurance_plan || null,
      notes: form.notes || null,
      paid_at: form.payment_status === 'paid' ? (editing?.paid_at ?? new Date().toISOString()) : null,
    };
    if (editing) {
      await supabase.from('payments').update(payload).eq('id', editing.id);
    } else {
      await supabase.from('payments').insert(payload);
    }
    setSaving(false);
    setModalOpen(false);
    load();
  }

  async function remove(id: string) {
    if (!confirm('Excluir este lançamento?')) return;
    await supabase.from('payments').delete().eq('id', id);
    load();
  }

  async function markPaid(pay: Payment) {
    await supabase.from('payments').update({
      payment_status: 'paid',
      paid_at: new Date().toISOString(),
    }).eq('id', pay.id);
    load();
  }

  function exportCSV() {
    const rows = [
      ['Data', 'Paciente', 'Descrição', 'Valor (R$)', 'Forma de Pagamento', 'Convênio/Plano', 'Status', 'Observações'],
      ...filtered.map((p) => [
        new Date(p.service_date).toLocaleDateString('pt-BR'),
        p.patient?.name ?? '',
        p.description ?? '',
        String(p.amount),
        methodLabels[p.payment_method ?? ''] ?? '',
        p.insurance_plan ?? '',
        statusConfig[p.payment_status]?.label ?? '',
        p.notes ?? '',
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contas-a-receber-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  // Available months from data
  const months = useMemo(() => {
    const set = new Set(payments.map((p) => p.service_date.slice(0, 7)));
    return Array.from(set).sort().reverse();
  }, [payments]);

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard label="Total" value={totals.total} color="from-[#4F4E3A] to-[#6B6A50]" />
        <SummaryCard label="Recebido" value={totals.received} color="from-[#6B8E5A] to-[#4F6B3E]" />
        <SummaryCard label="A receber" value={totals.pending} color="from-[#C4A77D] to-[#A8865F]" />
        <SummaryCard label="Em atraso" value={totals.overdue} color="from-[#B05050] to-[#8B3030]" />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between flex-wrap">
        <div className="flex gap-2 flex-wrap flex-1">
          <div className="relative flex-1 min-w-48 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8C8B6E]" size={18} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar paciente..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#D5CFBE] bg-white text-sm focus:border-[#8C8B6E] outline-none text-[#4F4E3A]"
            />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className={selectClass}>
            <option value="all">Todos os status</option>
            <option value="pending">Pendente</option>
            <option value="paid">Pago</option>
            <option value="overdue">Em atraso</option>
            <option value="cancelled">Cancelado</option>
          </select>
          <select value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)}
            className={selectClass}>
            <option value="">Todos os meses</option>
            {months.map((m) => (
              <option key={m} value={m}>
                {new Date(m + '-01').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#D5CFBE] bg-white text-[#4F4E3A] text-sm font-medium hover:bg-[#F5F2E8] transition-colors">
            <Download size={18} /> CSV
          </button>
          <button onClick={openNew}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#4F4E3A] text-white font-medium hover:bg-[#3D3C2A] transition-all shadow-md">
            <Plus size={20} /> Novo Lançamento
          </button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin w-10 h-10 border-3 border-[#4F4E3A] border-t-transparent rounded-full" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E0D9C3] p-12 text-center">
          <DollarSign className="mx-auto mb-3 text-[#8C8B6E] opacity-40" size={40} />
          <p className="text-[#8C8B6E] text-lg">Nenhum lançamento encontrado</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-[#E0D9C3] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#F5F2E8] text-[#4F4E3A] text-left">
                  <th className="px-4 py-3 font-semibold">Data</th>
                  <th className="px-4 py-3 font-semibold">Paciente</th>
                  <th className="px-4 py-3 font-semibold">Descrição</th>
                  <th className="px-4 py-3 font-semibold">Convênio/Plano</th>
                  <th className="px-4 py-3 font-semibold">Forma Pgto.</th>
                  <th className="px-4 py-3 font-semibold text-right">Valor</th>
                  <th className="px-4 py-3 font-semibold text-center">Status</th>
                  <th className="px-4 py-3 font-semibold text-center">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((pay) => {
                  const cfg = statusConfig[pay.payment_status];
                  const StatusIcon = cfg.icon;
                  return (
                    <tr key={pay.id} className="border-t border-[#E0D9C3] hover:bg-[#F5F2E8]/50 transition-colors group">
                      <td className="px-4 py-3 text-[#4F4E3A] whitespace-nowrap">
                        {new Date(pay.service_date).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#C4A77D] to-[#8C8B6E] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {pay.patient?.name?.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium text-[#4F4E3A] truncate max-w-32">{pay.patient?.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[#8C8B6E] max-w-40">
                        <span className="truncate block">{pay.description || '-'}</span>
                      </td>
                      <td className="px-4 py-3 text-[#8C8B6E]">
                        {pay.insurance_plan || '-'}
                      </td>
                      <td className="px-4 py-3 text-[#8C8B6E]">
                        {methodLabels[pay.payment_method ?? ''] || '-'}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-[#4F4E3A] whitespace-nowrap">
                        {fmt(Number(pay.amount))}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.bg} ${cfg.color}`}>
                          <StatusIcon size={12} />
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {pay.payment_status === 'pending' && (
                            <button
                              onClick={() => markPaid(pay)}
                              title="Marcar como pago"
                              className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors"
                            >
                              <CheckCircle2 size={15} />
                            </button>
                          )}
                          <button onClick={() => openEdit(pay)}
                            className="p-1.5 rounded-lg text-[#8C8B6E] hover:bg-[#F5F2E8] hover:text-[#4F4E3A] transition-colors">
                            <Edit2 size={15} />
                          </button>
                          <button onClick={() => remove(pay.id)}
                            className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-[#F5F2E8] border-t-2 border-[#E0D9C3] font-bold text-[#4F4E3A]">
                  <td colSpan={5} className="px-4 py-3">Total ({filtered.length} lançamentos)</td>
                  <td className="px-4 py-3 text-right">{fmt(totals.total)}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Form Modal */}
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
                  <label className="block text-sm font-medium text-[#4F4E3A] mb-1.5">Data do atendimento *</label>
                  <input type="date" required value={form.service_date}
                    onChange={(e) => setForm({ ...form, service_date: e.target.value })} className={inputClass} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#4F4E3A] mb-1.5">Descrição</label>
                <input value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Ex: Consulta de Retorno" className={inputClass} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#4F4E3A] mb-1.5">Valor (R$) *</label>
                  <input type="number" step="0.01" min="0" required
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    placeholder="0,00" className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#4F4E3A] mb-1.5">Convênio / Plano</label>
                  <input value={form.insurance_plan}
                    onChange={(e) => setForm({ ...form, insurance_plan: e.target.value })}
                    placeholder="Nome do plano" className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#4F4E3A] mb-1.5">Forma de pagamento</label>
                  <select value={form.payment_method ?? 'pix'}
                    onChange={(e) => setForm({ ...form, payment_method: e.target.value as Payment['payment_method'] })}
                    className={inputClass}>
                    <option value="pix">Pix</option>
                    <option value="dinheiro">Dinheiro</option>
                    <option value="cartão débito">Cartão Débito</option>
                    <option value="cartão crédito">Cartão Crédito</option>
                    <option value="convênio">Convênio</option>
                    <option value="outro">Outro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#4F4E3A] mb-1.5">Status</label>
                  <select value={form.payment_status}
                    onChange={(e) => setForm({ ...form, payment_status: e.target.value as Payment['payment_status'] })}
                    className={inputClass}>
                    <option value="pending">Pendente</option>
                    <option value="paid">Pago</option>
                    <option value="overdue">Em atraso</option>
                    <option value="cancelled">Cancelado</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#4F4E3A] mb-1.5">Observações</label>
                <textarea rows={2} value={form.notes}
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
const selectClass = "px-4 py-2.5 rounded-xl border border-[#D5CFBE] bg-white focus:border-[#8C8B6E] outline-none text-[#4F4E3A] text-sm";

function SummaryCard({ label, value, color }: { label: string; value: number; color: string }) {
  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#E0D9C3]">
      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-3`}>
        <TrendingUp className="text-white" size={20} />
      </div>
      <p className="text-xl font-bold text-[#4F4E3A] leading-tight">{fmt(value)}</p>
      <p className="text-sm text-[#8C8B6E] mt-0.5">{label}</p>
    </div>
  );
}
