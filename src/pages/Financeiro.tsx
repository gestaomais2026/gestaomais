import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase, Payment, Patient, Doctor } from '@/lib/supabase';
import { FileDown, Calendar, Stethoscope, DollarSign, Users } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// npm install jspdf jspdf-autotable

type PaymentRow = Payment & {
  patient: (Patient & { doctor: Doctor | null }) | null;
};

const DOCTOR_PARTICULAR = 'Particular';

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
  outro: 'Outro',
};

export default function PrestacaoContas() {
  const [dateFrom, setDateFrom] = useState(firstDayOfMonth());
  const [dateTo, setDateTo] = useState(lastDayOfMonth());
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [doctorFilter, setDoctorFilter] = useState<string>('all');

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

  // Agrupa por médico de indicação (patients.doctor). Pacientes sem indicação caem em "Particular".
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
  const totalMedicosIndicacao = grouped.filter((g) => g.name !== DOCTOR_PARTICULAR).length;

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const fmtDate = (d: string) => new Date(d).toLocaleDateString('pt-BR');
  const periodLabel = () => `${fmtDate(dateFrom)} a ${fmtDate(dateTo)}`;

  function exportPDF() {
    const doc = new jsPDF();
    const marginX = 14;
    let y = 40;

    // Cabeçalho
    doc.setFillColor(79, 78, 58); // #4F4E3A
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

    // Resumo (médico x valor recebido) — mesmo modelo da planilha "Final"
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

    // @ts-expect-error lastAutoTable is injected by jspdf-autotable
    y = doc.lastAutoTable.finalY + 12;

    // Detalhamento por médico (paciente / consulta / valor)
    for (const g of visibleGroups) {
      if (y > 250) {
        doc.addPage();
        y = 20;
      }
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

      // @ts-expect-error lastAutoTable is injected by jspdf-autotable
      y = doc.lastAutoTable.finalY + 10;
    }

    const filename =
      doctorFilter === 'all'
        ? `prestacao-contas-${dateFrom}-a-${dateTo}.pdf`
        : `prestacao-contas-${doctorFilter.replace(/\s+/g, '-')}-${dateFrom}-a-${dateTo}.pdf`;
    doc.save(filename);
  }

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
        <SummaryCard icon={Stethoscope} label="Médicos c/ indicação" value={String(totalMedicosIndicacao)} color="from-[#C4A77D] to-[#A8865F]" />
        <SummaryCard icon={Calendar} label="Lançamentos" value={String(totalLancamentos)} color="from-[#8C8B6E] to-[#6B6A50]" />
      </div>

      {/* Tabela agrupada por médico */}
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
          {visibleGroups.map((g) => (
            <div key={g.name} className="bg-white rounded-2xl shadow-sm border border-[#E0D9C3] overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 bg-[#F5F2E8] border-b border-[#E0D9C3]">
                <div className="flex items-center gap-2">
                  <Stethoscope size={16} className="text-[#6B8E5A]" />
                  <h3 className="font-serif font-bold text-[#4F4E3A]">{g.name}</h3>
                  <span className="text-xs text-[#8C8B6E]">
                    ({g.items.length} lançamento{g.items.length !== 1 ? 's' : ''})
                  </span>
                </div>
                <span className="font-bold text-[#4F4E3A]">{fmt(g.total)}</span>
              </div>
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
          ))}
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
