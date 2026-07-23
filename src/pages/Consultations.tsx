import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase, Patient, Doctor } from '@/lib/supabase';
import {
  Plus, Edit2, Trash2, X, ClipboardList, Stethoscope, Clock, FileDown, Pill,
} from 'lucide-react';
import jsPDF from 'jspdf';

// npm install jspdf (jspdf-autotable não é necessário aqui)

// ---------- Tipos locais (ver migration_consultations_prontuario.sql) ----------

interface ConsultationRow {
  id: string;
  patient_id: string;
  appointment_id: string | null;
  consultation_date: string;
  clinical_conditions: string | null;
  medication: string | null;
  notes: string | null;           // Observações (Nutricionista)
  psych_notes: string | null;     // Observações (Psicóloga)
  recommendations: string | null;
  next_consultation_date: string | null;
  patient?: (Patient & { doctor?: Doctor | null }) | null;
  appointment?: { id: string; type?: 'first' | 'return'; session_number?: number | null } | null;
}

interface AppointmentLite {
  id: string;
  patient_id: string;
  scheduled_at: string;
  type: 'first' | 'return';
  session_number?: number | null;
  patient?: Patient | null;
}

interface TreatmentPlanLite {
  id: string;
  patient_id: string;
  follow_up_type: 'unico' | '1_mes' | '2_meses' | '3_meses';
  total_sessions: number;
  sessions_completed: number;
  status: 'ativo' | 'finalizado' | 'cancelado';
}

const FOLLOW_UP_LABELS: Record<string, string> = {
  unico: 'Único', '1_mes': '1 mês', '2_meses': '2 meses', '3_meses': '3 meses',
};

const emptyForm = {
  patient_id: '',
  appointment_id: null as string | null,
  consultation_date: new Date().toISOString().slice(0, 10),
  clinical_conditions: '',
  medication: '',
  notes: '',
  psych_notes: '',
  recommendations: '',
  next_consultation_date: '',
};

export default function Consultations() {
  const [consultations, setConsultations] = useState<ConsultationRow[]>([]);
  const [patients, setPatients] = useState<(Patient & { doctor?: Doctor | null })[]>([]);
  const [todayAppointments, setTodayAppointments] = useState<AppointmentLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ConsultationRow | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [selectedPatient, setSelectedPatient] = useState<string>('all');
  const [doctorFilter, setDoctorFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [activePlan, setActivePlan] = useState<TreatmentPlanLite | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();

    const [consResult, patResult, apptResult] = await Promise.all([
      supabase
        .from('consultations')
        .select('*, patient:patients(*, doctor:doctors(*)), appointment:appointments(id, type, session_number)')
        .order('consultation_date', { ascending: false }),
      supabase.from('patients').select('*, doctor:doctors(*)').order('name'),
      supabase
        .from('appointments')
        .select('*, patient:patients(*)')
        .gte('scheduled_at', startOfDay)
        .lt('scheduled_at', endOfDay)
        .in('status', ['scheduled', 'confirmed'])
        .order('scheduled_at', { ascending: true }),
    ]);

    setConsultations((consResult.data as ConsultationRow[]) || []);
    setPatients((patResult.data as (Patient & { doctor?: Doctor | null })[]) || []);
    setTodayAppointments((apptResult.data as AppointmentLite[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Plano de acompanhamento do paciente selecionado (contexto do prontuário)
  useEffect(() => {
    let active = true;
    async function fetchPlan() {
      if (selectedPatient === 'all') { setActivePlan(null); return; }
      const { data } = await supabase
        .from('treatment_plans')
        .select('*')
        .eq('patient_id', selectedPatient)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (active) setActivePlan((data as TreatmentPlanLite) || null);
    }
    fetchPlan();
    return () => { active = false; };
  }, [selectedPatient]);

  const doctorNames = useMemo(() => {
    const set = new Set(patients.map((p) => p.doctor?.name ?? 'Particular'));
    return Array.from(set).sort();
  }, [patients]);

  const filtered = useMemo(() => {
    return consultations.filter((c) => {
      const matchPatient = selectedPatient === 'all' || c.patient_id === selectedPatient;
      const doctorName = c.patient?.doctor?.name ?? 'Particular';
      const matchDoctor = doctorFilter === 'all' || doctorName === doctorFilter;
      const matchFrom = !dateFrom || c.consultation_date >= dateFrom;
      const matchTo = !dateTo || c.consultation_date <= dateTo;
      return matchPatient && matchDoctor && matchFrom && matchTo;
    });
  }, [consultations, selectedPatient, doctorFilter, dateFrom, dateTo]);

  async function prefillFromLastConsultation(patientId: string) {
    const { data } = await supabase
      .from('consultations')
      .select('clinical_conditions, medication')
      .eq('patient_id', patientId)
      .order('consultation_date', { ascending: false })
      .limit(1)
      .maybeSingle();
    return data as { clinical_conditions: string | null; medication: string | null } | null;
  }

  function openNew() {
    setEditing(null);
    setForm({ ...emptyForm, consultation_date: new Date().toISOString().slice(0, 10) });
    setModalOpen(true);
  }

  async function openFromAppointment(apt: AppointmentLite) {
    setEditing(null);
    const prev = await prefillFromLastConsultation(apt.patient_id);
    setForm({
      ...emptyForm,
      patient_id: apt.patient_id,
      appointment_id: apt.id,
      consultation_date: new Date().toISOString().slice(0, 10),
      clinical_conditions: prev?.clinical_conditions || '',
      medication: prev?.medication || '',
    });
    setModalOpen(true);
  }

  async function onSelectPatientInForm(patientId: string) {
    const prev = await prefillFromLastConsultation(patientId);
    setForm((f) => ({
      ...f,
      patient_id: patientId,
      clinical_conditions: prev?.clinical_conditions || f.clinical_conditions,
      medication: prev?.medication || f.medication,
    }));
  }

  function openEdit(c: ConsultationRow) {
    setEditing(c);
    setForm({
      patient_id: c.patient_id,
      appointment_id: c.appointment_id,
      consultation_date: c.consultation_date,
      clinical_conditions: c.clinical_conditions ?? '',
      medication: c.medication ?? '',
      notes: c.notes ?? '',
      psych_notes: c.psych_notes ?? '',
      recommendations: c.recommendations ?? '',
      next_consultation_date: c.next_consultation_date ?? '',
    });
    setModalOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = {
      patient_id: form.patient_id,
      appointment_id: form.appointment_id || null,
      consultation_date: form.consultation_date,
      clinical_conditions: form.clinical_conditions || null,
      medication: form.medication || null,
      notes: form.notes || null,
      psych_notes: form.psych_notes || null,
      recommendations: form.recommendations || null,
      next_consultation_date: form.next_consultation_date || null,
    };
    if (editing) {
      await supabase.from('consultations').update(payload).eq('id', editing.id);
    } else {
      await supabase.from('consultations').insert(payload);
    }
    setSaving(false);
    setModalOpen(false);
    load();
  }

  async function remove(id: string) {
    if (!confirm('Excluir esta consulta?')) return;
    await supabase.from('consultations').delete().eq('id', id);
    load();
  }

  function fmtDate(d: string) {
    return new Date(d).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  function exportPDF() {
    const doc = new jsPDF();
    const marginX = 14;
    const pageHeight = 283;
    let y = 40;

    doc.setFillColor(79, 78, 58);
    doc.rect(0, 0, 210, 30, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Prontuário — Histórico de Consultas', marginX, 15);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const periodText = dateFrom || dateTo
      ? `Período: ${dateFrom ? fmtDate(dateFrom) : 'início'} a ${dateTo ? fmtDate(dateTo) : 'hoje'}`
      : 'Período: todos os registros';
    doc.text(periodText, marginX, 22);
    doc.text(
      doctorFilter === 'all' ? 'Todos os médicos / indicações' : `Médico / indicação: ${doctorFilter}`,
      marginX,
      27
    );

    function ensureSpace(lines: number) {
      if (y + lines * 5 > pageHeight) {
        doc.addPage();
        y = 20;
      }
    }

    function printField(label: string, value: string | null | undefined) {
      if (!value) return;
      ensureSpace(2);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(107, 142, 90);
      doc.text(label, marginX + 4, y);
      y += 4;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(60, 60, 60);
      const split = doc.splitTextToSize(value, 180);
      ensureSpace(split.length);
      doc.text(split, marginX + 4, y);
      y += split.length * 4.2 + 2;
    }

    // Agrupa por médico > paciente
    const byDoctor = new Map<string, Map<string, ConsultationRow[]>>();
    for (const c of filtered) {
      const doctorName = c.patient?.doctor?.name ?? 'Particular';
      const patientName = c.patient?.name ?? 'Paciente';
      if (!byDoctor.has(doctorName)) byDoctor.set(doctorName, new Map());
      const byPatient = byDoctor.get(doctorName)!;
      if (!byPatient.has(patientName)) byPatient.set(patientName, []);
      byPatient.get(patientName)!.push(c);
    }

    const doctorNamesSorted = Array.from(byDoctor.keys()).sort();

    for (const doctorName of doctorNamesSorted) {
      ensureSpace(10);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(79, 78, 58);
      doc.text(doctorName, marginX, y);
      y += 7;

      const byPatient = byDoctor.get(doctorName)!;
      const patientNamesSorted = Array.from(byPatient.keys()).sort();

      for (const patientName of patientNamesSorted) {
        ensureSpace(6);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(79, 78, 58);
        doc.text(patientName, marginX + 2, y);
        y += 5;

        const records = byPatient.get(patientName)!.slice().sort(
          (a, b) => a.consultation_date.localeCompare(b.consultation_date)
        );

        for (const c of records) {
          ensureSpace(6);
          const sessionLabel = c.appointment?.session_number ? ` · Sessão ${c.appointment.session_number}` : '';
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9.5);
          doc.setTextColor(140, 139, 110);
          doc.text(`${fmtDate(c.consultation_date)}${sessionLabel}`, marginX + 4, y);
          y += 5;

          printField('Condições clínicas', c.clinical_conditions);
          printField('Medicamento em uso', c.medication);
          printField('Observações (Nutricionista)', c.notes);
          printField('Observações (Psicóloga)', c.psych_notes);
          printField('Recomendações', c.recommendations);
          y += 3;
        }
        y += 3;
      }
      y += 4;
    }

    if (filtered.length === 0) {
      doc.setTextColor(140, 139, 110);
      doc.text('Nenhum registro encontrado para os filtros selecionados.', marginX, y);
    }

    const filename = `prontuario-${dateFrom || 'inicio'}-a-${dateTo || 'hoje'}.pdf`;
    doc.save(filename);
  }

  return (
    <div className="space-y-6">
      {/* Agendamentos de hoje */}
      {todayAppointments.length > 0 && (
        <div className="bg-gradient-to-r from-[#4F4E3A] to-[#6B6A50] rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Clock size={18} className="text-[#C4A77D]" />
            <h3 className="text-white font-serif font-bold">Agendamentos de Hoje</h3>
            <span className="ml-auto text-xs text-[#C4A77D] bg-white/10 px-2 py-0.5 rounded-full">
              Clique para abrir consulta
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {todayAppointments.map((apt) => (
              <button
                key={apt.id}
                onClick={() => openFromAppointment(apt)}
                className="bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl p-4 text-left transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#C4A77D] flex items-center justify-center text-[#4F4E3A] font-bold text-sm flex-shrink-0">
                    {apt.patient?.name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-white font-medium truncate">{apt.patient?.name}</p>
                    <p className="text-[#C4A77D] text-xs">
                      {new Date(apt.scheduled_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      {' · '}{apt.type === 'first' ? 'Primeira consulta' : 'Retorno'}
                      {apt.session_number ? ` · Sessão ${apt.session_number}` : ''}
                    </p>
                  </div>
                  <Plus size={16} className="text-white/50 group-hover:text-white ml-auto flex-shrink-0 transition-colors" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filtros / Relatório */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#E0D9C3] p-5">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-end flex-wrap">
          <div>
            <label className="block text-sm font-medium text-[#4F4E3A] mb-1.5">Paciente</label>
            <select value={selectedPatient} onChange={(e) => setSelectedPatient(e.target.value)} className={inputClass}>
              <option value="all">Todos os pacientes</option>
              {patients.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#4F4E3A] mb-1.5">Médico / Indicação</label>
            <select value={doctorFilter} onChange={(e) => setDoctorFilter(e.target.value)} className={inputClass}>
              <option value="all">Todos</option>
              {doctorNames.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#4F4E3A] mb-1.5">De</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#4F4E3A] mb-1.5">Até</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className={inputClass} />
          </div>
          <div className="flex gap-2 ml-auto">
            <button onClick={exportPDF} disabled={filtered.length === 0}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#D5CFBE] bg-white text-[#4F4E3A] text-sm font-medium hover:bg-[#F5F2E8] transition-colors disabled:opacity-50">
              <FileDown size={18} /> Emitir PDF
            </button>
            <button onClick={openNew}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#4F4E3A] text-white font-medium hover:bg-[#3D3C2A] transition-all shadow-md">
              <Plus size={20} /> Nova Consulta
            </button>
          </div>
        </div>
      </div>

      {/* Contexto do acompanhamento do paciente selecionado */}
      {selectedPatient !== 'all' && activePlan && (
        <div className="bg-[#F5F2E8] border border-[#E0D9C3] rounded-xl px-4 py-3 text-sm text-[#4F4E3A] flex items-center gap-2">
          <Pill size={16} className="text-[#6B8E5A]" />
          Acompanhamento {FOLLOW_UP_LABELS[activePlan.follow_up_type]} · Sessão {activePlan.sessions_completed} de {activePlan.total_sessions}
          {activePlan.status === 'finalizado' && ' · Finalizado'}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin w-10 h-10 border-3 border-[#4F4E3A] border-t-transparent rounded-full" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E0D9C3] p-12 text-center">
          <ClipboardList className="mx-auto mb-3 text-[#8C8B6E] opacity-40" size={40} />
          <p className="text-[#8C8B6E] text-lg">Nenhuma consulta registrada</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((c) => (
            <div key={c.id} className="bg-white rounded-2xl shadow-sm border border-[#E0D9C3] p-5 group hover:shadow-md transition-all">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#C4A77D] to-[#8C8B6E] flex items-center justify-center text-white font-bold">
                    {c.patient?.name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-serif font-bold text-[#4F4E3A]">{c.patient?.name}</h3>
                    <p className="text-xs text-[#8C8B6E] flex items-center gap-1 flex-wrap">
                      <span>{fmtDate(c.consultation_date)}</span>
                      {c.appointment?.session_number && <span>· Sessão {c.appointment.session_number}</span>}
                      {c.patient?.doctor?.name && (
                        <span className="inline-flex items-center gap-1 text-[#6B8E5A]">
                          · <Stethoscope size={11} /> {c.patient.doctor.name}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(c)}
                    className="p-2 rounded-lg text-[#8C8B6E] hover:bg-[#F5F2E8] hover:text-[#4F4E3A] transition-colors">
                    <Edit2 size={16} />
                  </button>
                  <button onClick={() => remove(c.id)}
                    className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {(c.medication || c.clinical_conditions) && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {c.medication && (
                    <span className="inline-flex items-center gap-1.5 text-xs bg-[#F5F2E8] text-[#4F4E3A] px-3 py-1.5 rounded-lg">
                      <Pill size={12} /> {c.medication}
                    </span>
                  )}
                  {c.clinical_conditions && (
                    <span className="text-xs bg-[#F5F2E8] text-[#4F4E3A] px-3 py-1.5 rounded-lg">
                      {c.clinical_conditions}
                    </span>
                  )}
                </div>
              )}

              {(c.notes || c.psych_notes || c.recommendations) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-[#E0D9C3]">
                  {c.notes && (
                    <div>
                      <p className="text-xs font-medium text-[#8C8B6E] uppercase mb-1">Obs. Nutricionista</p>
                      <p className="text-sm text-[#4F4E3A]">{c.notes}</p>
                    </div>
                  )}
                  {c.psych_notes && (
                    <div>
                      <p className="text-xs font-medium text-[#8C8B6E] uppercase mb-1">Obs. Psicóloga</p>
                      <p className="text-sm text-[#4F4E3A]">{c.psych_notes}</p>
                    </div>
                  )}
                  {c.recommendations && (
                    <div className="sm:col-span-2">
                      <p className="text-xs font-medium text-[#8C8B6E] uppercase mb-1">Recomendações</p>
                      <p className="text-sm text-[#4F4E3A]">{c.recommendations}</p>
                    </div>
                  )}
                </div>
              )}

              {c.next_consultation_date && (
                <div className="mt-3 flex items-center gap-2 text-sm text-[#C4A77D] bg-[#F5F2E8] rounded-lg px-3 py-2">
                  <Clock size={16} />
                  Próxima consulta: {new Date(c.next_consultation_date).toLocaleDateString('pt-BR')}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-[#E0D9C3] sticky top-0 bg-white z-10">
              <h2 className="text-xl font-serif font-bold text-[#4F4E3A]">
                {editing ? 'Editar Consulta' : 'Nova Consulta'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="text-[#8C8B6E] hover:text-[#4F4E3A]">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={save} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#4F4E3A] mb-1.5">Paciente *</label>
                  <select required value={form.patient_id} disabled={!!editing}
                    onChange={(e) => onSelectPatientInForm(e.target.value)}
                    className={inputClass}>
                    <option value="">Selecione...</option>
                    {patients.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#4F4E3A] mb-1.5">Data da consulta *</label>
                  <input type="date" required value={form.consultation_date}
                    onChange={(e) => setForm({ ...form, consultation_date: e.target.value })} className={inputClass} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#4F4E3A] mb-1.5">Medicamento em uso</label>
                  <input value={form.medication} onChange={(e) => setForm({ ...form, medication: e.target.value })}
                    placeholder="Ex: Mounjaro, Ozempic..." className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#4F4E3A] mb-1.5">Próxima consulta</label>
                  <input type="date" value={form.next_consultation_date}
                    onChange={(e) => setForm({ ...form, next_consultation_date: e.target.value })} className={inputClass} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#4F4E3A] mb-1.5">Condições clínicas</label>
                <textarea rows={2} value={form.clinical_conditions}
                  onChange={(e) => setForm({ ...form, clinical_conditions: e.target.value })} className={inputClass} />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#4F4E3A] mb-1.5">Observações (Nutricionista)</label>
                <textarea rows={3} value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#4F4E3A] mb-1.5">Observações (Psicóloga)</label>
                <textarea rows={3} value={form.psych_notes}
                  onChange={(e) => setForm({ ...form, psych_notes: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#4F4E3A] mb-1.5">Recomendações</label>
                <textarea rows={2} value={form.recommendations}
                  onChange={(e) => setForm({ ...form, recommendations: e.target.value })} className={inputClass} />
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
