import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { supabase, Payment, Patient, Doctor } from '@/lib/supabase';
import {
  FileDown, Calendar, Stethoscope, DollarSign, Users, Upload, ExternalLink,
  AlertCircle, CheckCircle2, Send, FileCheck2, RotateCcw,
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// npm install jspdf jspdf-autotable

type PaymentRow = Payment & {
  patient: (Patient & { doctor: Doctor | null }) | null;
};

type InvoiceStatus = 'pendente' | 'emitida' | 'enviada' | 'paga';

interface DoctorInvoice {
  id: string;
  doctor_id: string;
  period_start: string;
  period_end: string;
  amount: number | null;
  file_path: string | null;
  file_name: string | null;
  status: InvoiceStatus;
  issued_at: string | null;
  paid_at: string | null;
}

const DOCTOR_PARTICULAR = 'Particular';
const INVOICE_BUCKET = 'notas-fiscais';

const STATUS_CONFIG: Record<InvoiceStatus, { label: string; color: string; bg: string }> = {
  pendente: { label: 'Pendente', color: 'text-amber-700', bg: 'bg-amber-100' },
  emitida: { label: 'Emitida', color: 'text-blue-700', bg: 'bg-blue-100' },
  enviada: { label: 'Enviada ao médico', color: 'text-purple-700', bg: 'bg-purple-100' },
  paga: { label: 'Paga', color: 'text-green-700', bg: 'bg-green-100' },
};

function firstDayOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}
function lastDayOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
}

const methodLabels: Record<string, string> = {
  pix: 'Pix',
  dinheiro: 'Dinheiro',
  'cartão débito': 'Cartão Débito',
  'cartão crédito': 'Cartão Crédito',
  convênio: 'Convênio',
  'link de pagamento': 'Link de pagamento',
  outro: 'Outro',
};

export default function PrestacaoContas() {
  const [dateFrom, setDateFrom] = useState(firstDayOfMonth());
  const [dateTo, setDateTo] = useState(lastDayOfMonth());
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [doctorFilter, setDoctorFilter] = useState<string>('all');
  const [userId, setUserId] = useState<string | null>(null);

  const [invoicesByDoctor, setInvoicesByDoctor] = useState<Record<string, DoctorInvoice>>({});
  const [uploadingDoctorId, setUploadingDoctorId] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('payments')
      .select('*, patient:patients(*, doctor:doctors(*))')
      .eq('payment_status', 'paid')
      .gte('paid_at', `${dateFrom}T00:00:00`)
      .lte('paid_at', `${dateTo}T23:59:59`)
      .order('paid_at', { ascending: true });
    setPayments((data as PaymentRow[]) || []);
    setLoading(false);
  }, [dateFrom, dateTo]);

  useEffect(() => { load(); }, [load]);

  // Agrupa por médico de indicação. Pacientes sem indicação caem em "Particular".
  const grouped = useMemo(() => {
    const map = new Map<string, { doctor: Doctor | null; items: PaymentRow[]; total: number }>();
    for (const p of payments) {
      const doc = p.patient?.doctor ?? null;
      const key = doc?.name ?? DOCTOR_PARTICULAR;
      if (!map.has(key)) map.set(key, { doctor: doc, items: [], total: 0 });
      const entry = map.get(key)!;
      entry.items.push(p);
      entry.total += Number(p.amount);
    }
    return Array.from(map.entries())
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.total - a.total);
  }, [payments]);

  const doctorNames = useMemo(() => grouped.map((g) => g.name), [grouped]);
  const visibleGroups = doctorFilter === 'all' ? grouped : grouped.filter((g) => g.name === doctorFilter);
  const grandTotal = visibleGroups.reduce((s, g) => s + g.total, 0);
  const totalLancamentos = visibleGroups.reduce((s, g) => s + g.items.length, 0);
  const totalPacientes = new Set(visibleGroups.flatMap((g) => g.items.map((i) => i.patient_id))).size;
  const doctorGroupsWithReferral = grouped.filter((g) => g.doctor);

  // Carrega as notas fiscais já lançadas para os médicos visíveis neste período exato
  const loadInvoices = useCallback(async () => {
    const doctorIds = grouped.map((g) => g.doctor?.id).filter((id): id is string => !!id);
    if (doctorIds.length === 0) { setInvoicesByDoctor({}); return; }
    const { data } = await supabase
      .from('doctor_invoices')
      .select('*')
      .eq('period_start', dateFrom)
      .eq('period_end', dateTo)
      .in('doctor_id', doctorIds);
    const map: Record<string, DoctorInvoice> = {};
    for (const inv of (data as DoctorInvoice[]) || []) map[inv.doctor_id] = inv;
    setInvoicesByDoctor(map);
  }, [grouped, dateFrom, dateTo]);

  useEffect(() => { loadInvoices(); }, [loadInvoices]);

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const fmtDate = (d: string) => new Date(d).toLocaleDateString('pt-BR');
  const periodLabel = () => `${fmtDate(dateFrom)} a ${fmtDate(dateTo)}`;

  async function handleUploadInvoice(doctorId: string, total: number, file: File) {
    if (!userId) return;
    setUploadingDoctorId(doctorId);
    try {
      const path = `${userId}/${doctorId}/${dateFrom}_${dateTo}/${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from(INVOICE_BUCKET)
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const existing = invoicesByDoctor[doctorId];
      const { data, error } = await supabase
        .from('doctor_invoices')
        .upsert({
          id: existing?.id,
          doctor_id: doctorId,
          period_start: dateFrom,
          period_end: dateTo,
          amount: total,
          file_path: path,
          file_name: file.name,
          status: 'emitida',
          issued_at: new Date().toISOString(),
        }, { onConflict: 'doctor_id,period_start,period_end' })
        .select()
        .single();
      if (error) throw error;

      setInvoicesByDoctor((prev) => ({ ...prev, [doctorId]: data as DoctorInvoice }));
    } catch (err) {
      alert('Erro ao enviar a nota fiscal: ' + (err as Error).message);
    } finally {
      setUploadingDoctorId(null);
    }
  }

  async function updateInvoiceStatus(invoice: DoctorInvoice, status: InvoiceStatus) {
    const patch: Partial<DoctorInvoice> = { status };
    if (status === 'paga') patch.paid_at = new Date().toISOString();
    const { data } = await supabase
      .from('doctor_invoices')
      .update(patch)
      .eq('id', invoice.id)
      .select()
      .single();
    if (data) setInvoicesByDoctor((prev) => ({ ...prev, [invoice.doctor_id]: data as DoctorInvoice }));
  }

  async function openInvoiceFile(path: string) {
    const { data, error } = await supabase.storage
      .from(INVOICE_BUCKET)
      .createSignedUrl(path, 60 * 5);
    if (error || !data) {
      alert('Não foi possível abrir o arquivo: ' + error?.message);
      return;
    }
    window.open(data.signedUrl, '_blank');
  }

  function exportPDF() {
    const doc = new jsPDF();
    const marginX = 14;
    let y = 40;

    doc.setFillColor(79, 78, 58);
    doc.rect(0, 0, 210, 32, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Prestação de Contas', marginX, 15);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Período: ${periodLabel()}`, marginX, 22);
    doc.text(
      doctorFilter === 'all' ? 'Todos os médicos / indicações' : `Médico / indicação: ${doctorFilter}`,
      marginX,
      27
    );

    autoTable(doc, {
      startY: y,
      head: [['Médico / Indicação', 'Valor Recebido']],
      body: visibleGroups.map((g) => [g.name, fmt(g.total)]),
      foot: [['Total', fmt(grandTotal)]],
      theme: 'grid',
      headStyles: { fillColor: [79, 78, 58], textColor: 255 },
      footStyles: { fillColor: [245, 242, 232], textColor: [79, 78, 58], fontStyle: 'bold' },
      styles: { fontSize: 10 },
      margin: { left: marginX, right: marginX },
    });

    // @ts-expect-error lastAutoTable é injetado pelo jspdf-autotable
    y = doc.lastAutoTable.finalY + 12;

    for (const g of visibleGroups) {
      if (y > 250) { doc.addPage(); y = 20; }
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(79, 78, 58);
      doc.text(g.name, marginX, y);
      y += 4;

      autoTable(doc, {
        startY: y,
        head: [['Data', 'Paciente', 'Descrição', 'Forma Pgto.', 'Valor']],
        body: g.items.map((p) => [
          fmtDate(p.service_date),
          p.patient?.name ?? '-',
          p.description ?? '-',
          methodLabels[p.payment_method ?? ''] ?? '-',
          fmt(Number(p.amount)),
        ]),
        foot: [['', '', '', 'Subtotal', fmt(g.total)]],
        theme: 'striped',
        headStyles: { fillColor: [107, 142, 90], textColor: 255 },
        footStyles: { fillColor: [245, 242, 232], textColor: [79, 78, 58], fontStyle: 'bold' },
        styles: { fontSize: 9 },
        margin: { left: marginX, right: marginX },
      });

      // @ts-expect-error lastAutoTable é injetado pelo jspdf-autotable
      y = doc.lastAutoTable.finalY + 10;
    }

    const filename =
      doctorFilter === 'all'
        ? `prestacao-contas-${dateFrom}-a-${dateTo}.pdf`
        : `prestacao-contas-${doctorFilter.replace(/\s+/g, '-')}-${dateFrom}-a-${dateTo}.pdf`;
    doc.save(filename);
  }

  const pendingInvoicesCount = doctorGroupsWithReferral.filter((g) => {
    const inv = invoicesByDoctor[g.doctor!.id];
    return !inv || inv.status === 'pendente';
  }).length;

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#E0D9C3] p-5">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-end flex-wrap">
          <div>
            <label className="block text-sm font-medium text-[#4F4E3A] mb-1.5">De</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#4F4E3A] mb-1.5">Até</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#4F4E3A] mb-1.5">Médico / Indicação</label>
            <select value={doctorFilter} onChange={(e) => setDoctorFilter(e.target.value)} className={inputClass}>
              <option value="all">Todos</option>
              {doctorNames.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2 ml-auto">
            <button
              onClick={() => { setDateFrom(firstDayOfMonth()); setDateTo(lastDayOfMonth()); }}
              className="px-4 py-2.5 rounded-xl border border-[#D5CFBE] bg-white text-[#4F4E3A] text-sm font-medium hover:bg-[#F5F2E8] transition-colors"
            >
              Mês atual
            </button>
            <button
              onClick={exportPDF}
              disabled={loading || visibleGroups.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#4F4E3A] text-white font-medium hover:bg-[#3D3C2A] transition-all shadow-md disabled:opacity-50"
            >
              <FileDown size={18} /> Emitir PDF
            </button>
          </div>
        </div>
      </div>

      {/* Cards resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard icon={DollarSign} label="Total do período" value={fmt(grandTotal)} color="from-[#4F4E3A] to-[#6B6A50]" />
        <SummaryCard icon={Users} label="Pacientes atendidos" value={String(totalPacientes)} color="from-[#6B8E5A] to-[#4F6B3E]" />
        <SummaryCard icon={Calendar} label="Lançamentos" value={String(totalLancamentos)} color="from-[#8C8B6E] to-[#6B6A50]" />
        <SummaryCard
          icon={FileCheck2}
          label="NFs pendentes no período"
          value={String(pendingInvoicesCount)}
          color={pendingInvoicesCount > 0 ? 'from-[#B05050] to-[#8B3030]' : 'from-[#6B8E5A] to-[#4F6B3E]'}
        />
      </div>

      {/* Tabela agrupada por médico + controle de NF */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin w-10 h-10 border-3 border-[#4F4E3A] border-t-transparent rounded-full" />
        </div>
      ) : visibleGroups.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E0D9C3] p-12 text-center">
          <DollarSign className="mx-auto mb-3 text-[#8C8B6E] opacity-40" size={40} />
          <p className="text-[#8C8B6E] text-lg">Nenhum recebimento no período selecionado</p>
        </div>
      ) : (
        <div className="space-y-5">
          {visibleGroups.map((g) => {
            const invoice = g.doctor ? invoicesByDoctor[g.doctor.id] : undefined;
            const statusCfg = invoice ? STATUS_CONFIG[invoice.status] : STATUS_CONFIG.pendente;
            const isUploading = g.doctor ? uploadingDoctorId === g.doctor.id : false;

            return (
              <div key={g.name} className="bg-white rounded-2xl shadow-sm border border-[#E0D9C3] overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 bg-[#F5F2E8] border-b border-[#E0D9C3]">
                  <div className="flex items-center gap-2">
                    <Stethoscope size={16} className="text-[#6B8E5A]" />
                    <h3 className="font-serif font-bold text-[#4F4E3A]">{g.name}</h3>
                    <span className="text-xs text-[#8C8B6E]">
                      ({g.items.length} lançamento{g.items.length !== 1 ? 's' : ''})
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-[#4F4E3A]">{fmt(g.total)}</span>

                    {g.doctor && (
                      <>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusCfg.bg} ${statusCfg.color}`}>
                          {statusCfg.label}
                        </span>

                        {invoice?.file_path ? (
                          <button
                            onClick={() => openInvoiceFile(invoice.file_path!)}
                            className="flex items-center gap-1.5 text-xs text-[#4F4E3A] bg-white border border-[#D5CFBE] px-3 py-1.5 rounded-lg hover:bg-[#F5F2E8] transition-colors"
                            title={invoice.file_name || ''}
                          >
                            <ExternalLink size={13} />
                            <span className="max-w-32 truncate">{invoice.file_name}</span>
                          </button>
                        ) : null}

                        <input
                          ref={(el) => { fileInputRefs.current[g.doctor!.id] = el; }}
                          type="file"
                          accept=".pdf,.xml,.png,.jpg,.jpeg"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file && g.doctor) handleUploadInvoice(g.doctor.id, g.total, file);
                            e.target.value = '';
                          }}
                        />
                        <button
                          onClick={() => fileInputRefs.current[g.doctor!.id]?.click()}
                          disabled={isUploading}
                          className="flex items-center gap-1.5 text-xs bg-[#4F4E3A] text-white px-3 py-1.5 rounded-lg hover:bg-[#3D3C2A] transition-colors disabled:opacity-50"
                        >
                          <Upload size={13} />
                          {isUploading ? 'Enviando...' : invoice?.file_path ? 'Substituir NF' : 'Enviar NF'}
                        </button>

                        {invoice && (
                          <div className="flex items-center gap-1">
                            {invoice.status === 'emitida' && (
                              <button
                                onClick={() => updateInvoiceStatus(invoice, 'enviada')}
                                title="Marcar como enviada ao médico"
                                className="p-1.5 rounded-lg bg-purple-50 text-purple-600 hover:bg-purple-100 transition-colors"
                              >
                                <Send size={14} />
                              </button>
                            )}
                            {(invoice.status === 'emitida' || invoice.status === 'enviada') && (
                              <button
                                onClick={() => updateInvoiceStatus(invoice, 'paga')}
                                title="Marcar como paga"
                                className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors"
                              >
                                <CheckCircle2 size={14} />
                              </button>
                            )}
                            {invoice.status !== 'pendente' && (
                              <button
                                onClick={() => updateInvoiceStatus(invoice, 'pendente')}
                                title="Reverter para pendente"
                                className="p-1.5 rounded-lg bg-gray-50 text-gray-500 hover:bg-gray-100 transition-colors"
                              >
                                <RotateCcw size={14} />
                              </button>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {!g.doctor && (
                  <div className="px-5 py-2 text-xs text-[#8C8B6E] bg-[#FDFCF7] flex items-center gap-1.5">
                    <AlertCircle size={12} /> Pacientes particulares — sem médico de indicação, não gera NF de repasse.
                  </div>
                )}

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-[#8C8B6E]">
                        <th className="px-4 py-2 font-medium">Data</th>
                        <th className="px-4 py-2 font-medium">Paciente</th>
                        <th className="px-4 py-2 font-medium">Descrição</th>
                        <th className="px-4 py-2 font-medium">Forma Pgto.</th>
                        <th className="px-4 py-2 font-medium text-right">Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {g.items.map((p) => (
                        <tr key={p.id} className="border-t border-[#E0D9C3]">
                          <td className="px-4 py-2 text-[#4F4E3A] whitespace-nowrap">{fmtDate(p.service_date)}</td>
                          <td className="px-4 py-2 text-[#4F4E3A]">{p.patient?.name}</td>
                          <td className="px-4 py-2 text-[#8C8B6E]">{p.description || '-'}</td>
                          <td className="px-4 py-2 text-[#8C8B6E]">{methodLabels[p.payment_method ?? ''] || '-'}</td>
                          <td className="px-4 py-2 text-right font-medium text-[#4F4E3A]">{fmt(Number(p.amount))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const inputClass =
  "w-full px-4 py-2.5 rounded-xl border border-[#D5CFBE] bg-[#FDFCF7] focus:border-[#8C8B6E] focus:ring-2 focus:ring-[#8C8B6E]/20 outline-none transition-all text-[#4F4E3A] text-sm";

function SummaryCard({
  icon: Icon, label, value, color,
}: { icon: React.ElementType; label: string; value: string; color: string }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#E0D9C3]">
      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-3`}>
        <Icon className="text-white" size={20} />
      </div>
      <p className="text-xl font-bold text-[#4F4E3A] leading-tight">{value}</p>
      <p className="text-sm text-[#8C8B6E] mt-0.5">{label}</p>
    </div>
  );
}

