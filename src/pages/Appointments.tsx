import { useEffect, useState, useCallback } from 'react';
import { supabase, Appointment, Patient, Doctor } from '@/lib/supabase';
import {
  Plus, Edit2, Trash2, X, Calendar as CalIcon, Clock, Stethoscope,
  DollarSign, AlertCircle, CheckCircle2, CreditCard,
} from 'lucide-react';

// ---------- Tipos locais (ver supabase-types-additions.ts para somar ao lib/supabase.ts) ----------

type FollowUpType = 'unico' | '1_mes' | '2_meses' | '3_meses';
type PaymentMode = 'unico' | 'por_sessao';
type ChargeMethod = 'pix' | 'link de pagamento' | 'outro';

interface TreatmentPlan {
  id: string;
  patient_id: string;
  first_appointment_id: string | null;
  follow_up_type: FollowUpType;
  total_sessions: number;
  sessions_completed: number;
  payment_mode: PaymentMode;
  total_value: number | null;
  value_per_session: number | null;
  status: 'ativo' | 'finalizado' | 'cancelado';
  start_date: string;
}

type AppointmentType = 'first' | 'return';

type AppointmentRow = Appointment & {
  type: AppointmentType;
  treatment_plan_id?: string | null;
  session_number?: number | null;
  patient?: (Patient & { doctor?: Doctor | null }) | null;
};

type PatientRow = Patient & { doctor?: Doctor | null };

type ChargeContext =
  | { kind: 'first'; followUpType: FollowUpType; totalSessions: number; appointment: AppointmentRow }
  | { kind: 'return'; plan: TreatmentPlan; sessionNumber: number; appointment: AppointmentRow }
  | { kind: 'avulsa'; appointment: AppointmentRow };

// Suposição de negócio: "X meses" = 1ª consulta + X retornos mensais.
// Ajuste este mapa se a contagem de sessões por pacote for diferente.
const FOLLOW_UP_SESSIONS: Record<FollowUpType, number> = {
  unico: 1,
  '1_mes': 2,
  '2_meses': 3,
  '3_meses': 4,
};
const FOLLOW_UP_LABELS: Record<FollowUpType, string> = {
  unico: 'Único (sem retorno)',
  '1_mes': '1 mês',
  '2_meses': '2 meses',
  '3_meses': '3 meses',
};
const CHARGE_METHOD_LABELS: Record<ChargeMethod, string> = {
  pix: 'Pix',
  'link de pagamento': 'Link de pagamento',
  outro: 'Outra forma',
};

const emptyForm = {
  patient_id: '',
  doctor_id: '',
  scheduled_at: '',
  duration_minutes: 60,
  type: 'first' as AppointmentType,
  status: 'scheduled' as Appointment['status'],
  notes: '',
  follow_up_type: 'unico' as FollowUpType,
};

export default function Appointments() {
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AppointmentRow | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [activePlan, setActivePlan] = useState<TreatmentPlan | null>(null);
  const [checkingPlan, setCheckingPlan] = useState(false);

  const [chargeContext, setChargeContext] = useState<ChargeContext | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('appointments')
      .select('*, patient:patients(*, doctor:doctors(*))')
      .order('scheduled_at', { ascending: true });
    setAppointments((data as AppointmentRow[]) || []);
    const { data: pData } = await supabase.from('patients').select('*, doctor:doctors(*)').order('name');
    setPatients((pData as PatientRow[]) || []);
    const { data: dData } = await supabase.from('doctors').select('*').order('name');
    setDoctors((dData as Doctor[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Busca automaticamente o acompanhamento em aberto ao escolher paciente + tipo "Retorno"
  useEffect(() => {
    let active = true;
    async function check() {
      if (form.type !== 'return' || !form.patient_id || editing) {
        setActivePlan(null);
        return;
      }
      setCheckingPlan(true);
      const { data } = await supabase
        .from('treatment_plans')
        .select('*')
        .eq('patient_id', form.patient_id)
        .eq('status', 'ativo')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (active) {
        setActivePlan((data as TreatmentPlan) || null);
        setCheckingPlan(false);
      }
    }
    check();
    return () => { active = false; };
  }, [form.type, form.patient_id, editing]);

  function openNew() {
    setEditing(null);
    setActivePlan(null);
    setForm({ ...emptyForm, scheduled_at: new Date(Date.now() + 86400000).toISOString().slice(0, 16) });
    setModalOpen(true);
  }

  function openEdit(a: AppointmentRow) {
    setEditing(a);
    setActivePlan(null);
    setForm({
      patient_id: a.patient_id,
      doctor_id: a.patient?.doctor?.id || '',
      scheduled_at: new Date(a.scheduled_at).toISOString().slice(0, 16),
      duration_minutes: a.duration_minutes,
      type: a.type,
      status: a.status,
      notes: a.notes || '',
      follow_up_type: 'unico',
    });
    setModalOpen(true);
  }

  function onSelectPatient(id: string) {
    const p = patients.find((x) => x.id === id);
    setForm((f) => ({ ...f, patient_id: id, doctor_id: p?.doctor?.id || '' }));
  }

  async function syncPatientDoctor(patientId: string, doctorId: string) {
    const patient = patients.find((p) => p.id === patientId);
    const currentDoctorId = patient?.doctor?.id || '';
    if (doctorId !== currentDoctorId) {
      await supabase.from('patients').update({ doctor_id: doctorId || null }).eq('id', patientId);
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    // Editar agendamento existente: fluxo simples, não mexe em plano/cobrança
    if (editing) {
      await supabase.from('appointments').update({
        patient_id: form.patient_id,
        scheduled_at: new Date(form.scheduled_at).toISOString(),
        duration_minutes: Number(form.duration_minutes),
        type: form.type,
        status: form.status,
        notes: form.notes || null,
      }).eq('id', editing.id);
      await syncPatientDoctor(form.patient_id, form.doctor_id);
      setSaving(false);
      setModalOpen(false);
      load();
      return;
    }

    await syncPatientDoctor(form.patient_id, form.doctor_id);

    const basePayload = {
      patient_id: form.patient_id,
      scheduled_at: new Date(form.scheduled_at).toISOString(),
      duration_minutes: Number(form.duration_minutes),
      type: form.type,
      status: form.status,
      notes: form.notes || null,
    };

    const { data: newAppt, error } = await supabase.from('appointments').insert(basePayload).select().single();
    if (error || !newAppt) {
      setSaving(false);
      alert('Erro ao criar agendamento: ' + error?.message);
      return;
    }

    if (form.type === 'first') {
      const totalSessions = FOLLOW_UP_SESSIONS[form.follow_up_type];
      setSaving(false);
      setModalOpen(false);
      setChargeContext({
        kind: 'first',
        followUpType: form.follow_up_type,
        totalSessions,
        appointment: newAppt as AppointmentRow,
      });
      load();
      return;
    }

    // Retorno
    if (activePlan) {
      const sessionNumber = activePlan.sessions_completed + 1;
      await supabase.from('appointments').update({
        treatment_plan_id: activePlan.id,
        session_number: sessionNumber,
      }).eq('id', newAppt.id);

      if (activePlan.payment_mode === 'por_sessao') {
        setSaving(false);
        setModalOpen(false);
        setChargeContext({
          kind: 'return',
          plan: activePlan,
          sessionNumber,
          appointment: newAppt as AppointmentRow,
        });
        load();
        return;
      }

      // Pagamento único: já está quitado, só avança a contagem de sessões
      const finished = sessionNumber >= activePlan.total_sessions;
      await supabase.from('treatment_plans').update({
        sessions_completed: sessionNumber,
        status: finished ? 'finalizado' : 'ativo',
      }).eq('id', activePlan.id);
    }

    setSaving(false);
    setModalOpen(false);
    setActivePlan(null);
    load();
  }

  async function remove(id: string) {
    if (!confirm('Excluir este agendamento?')) return;
    await supabase.from('appointments').delete().eq('id', id);
    load();
  }

  function openManualCharge(a: AppointmentRow) {
    setChargeContext({ kind: 'avulsa', appointment: a });
  }

  async function submitCharge(payload: {
    amount: number;
    method: ChargeMethod;
    markPaidNow: boolean;
    paymentMode?: PaymentMode;
  }) {
    if (!chargeContext) return;

    if (chargeContext.kind === 'first') {
      const { followUpType, totalSessions, appointment } = chargeContext;
      const paymentMode = payload.paymentMode ?? 'unico';
      const totalValue = paymentMode === 'unico' ? payload.amount : payload.amount * totalSessions;
      const valuePerSession = paymentMode === 'por_sessao'
        ? payload.amount
        : (totalSessions > 0 ? payload.amount / totalSessions : payload.amount);

      const { data: plan } = await supabase.from('treatment_plans').insert({
        patient_id: appointment.patient_id,
        first_appointment_id: appointment.id,
        follow_up_type: followUpType,
        total_sessions: totalSessions,
        sessions_completed: 1,
        payment_mode: paymentMode,
        total_value: totalValue,
        value_per_session: valuePerSession,
        status: totalSessions > 1 ? 'ativo' : 'finalizado',
        start_date: String(appointment.scheduled_at).slice(0, 10),
      }).select().single();

      await supabase.from('appointments').update({
        treatment_plan_id: plan?.id,
        session_number: 1,
      }).eq('id', appointment.id);

      await supabase.from('payments').insert({
        patient_id: appointment.patient_id,
        appointment_id: appointment.id,
        service_date: String(appointment.scheduled_at).slice(0, 10),
        description: `Primeira consulta — Acompanhamento ${FOLLOW_UP_LABELS[followUpType]}${
          paymentMode === 'unico' ? ' (pacote único)' : ` (sessão 1/${totalSessions})`
        }`,
        amount: payload.amount,
        payment_method: payload.method,
        payment_status: payload.markPaidNow ? 'paid' : 'pending',
        paid_at: payload.markPaidNow ? new Date().toISOString() : null,
      });
    }

    if (chargeContext.kind === 'return') {
      const { plan, sessionNumber, appointment } = chargeContext;
      const finished = sessionNumber >= plan.total_sessions;

      await supabase.from('treatment_plans').update({
        sessions_completed: sessionNumber,
        status: finished ? 'finalizado' : 'ativo',
      }).eq('id', plan.id);

      await supabase.from('payments').insert({
        patient_id: appointment.patient_id,
        appointment_id: appointment.id,
        service_date: String(appointment.scheduled_at).slice(0, 10),
        description: `Retorno — Sessão ${sessionNumber}/${plan.total_sessions}`,
        amount: payload.amount,
        payment_method: payload.method,
        payment_status: payload.markPaidNow ? 'paid' : 'pending',
        paid_at: payload.markPaidNow ? new Date().toISOString() : null,
      });
    }

    if (chargeContext.kind === 'avulsa') {
      const { appointment } = chargeContext;
      await supabase.from('payments').insert({
        patient_id: appointment.patient_id,
        appointment_id: appointment.id,
        service_date: String(appointment.scheduled_at).slice(0, 10),
        description: 'Cobrança avulsa — retorno',
        amount: payload.amount,
        payment_method: payload.method,
        payment_status: payload.markPaidNow ? 'paid' : 'pending',
        paid_at: payload.markPaidNow ? new Date().toISOString() : null,
      });
    }

    setChargeContext(null);
    load();
  }

  const typeLabels: Record<string, string> = { first: 'Primeira consulta', return: 'Retorno' };
  const statusLabels: Record<string, string> = {
    scheduled: 'Agendado', confirmed: 'Confirmado', completed: 'Realizado', cancelled: 'Cancelado', no_show: 'Faltou',
  };
  const statusColors: Record<string, string> = {
    scheduled: 'bg-amber-100 text-amber-700', confirmed: 'bg-green-100 text-green-700',
    completed: 'bg-blue-100 text-blue-700', cancelled: 'bg-red-100 text-red-700', no_show: 'bg-gray-100 text-gray-600',
  };

  const grouped = appointments.reduce<Record<string, AppointmentRow[]>>((acc, apt) => {
    const date = new Date(apt.scheduled_at).toDateString();
    (acc[date] ||= []).push(apt);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button onClick={openNew}
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-[#4F4E3A] text-white font-medium hover:bg-[#3D3C2A] transition-all shadow-md">
          <Plus size={20} /> Novo Agendamento
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin w-10 h-10 border-3 border-[#4F4E3A] border-t-transparent rounded-full" />
        </div>
      ) : appointments.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E0D9C3] p-12 text-center">
          <CalIcon className="mx-auto mb-3 text-[#8C8B6E] opacity-40" size={40} />
          <p className="text-[#8C8B6E] text-lg">Nenhum agendamento</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([dateStr, apts]) => {
            const date = new Date(dateStr);
            const isToday = date.toDateString() === new Date().toDateString();
            return (
              <div key={dateStr}>
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center shadow-sm
                    ${isToday ? 'bg-[#4F4E3A] text-white' : 'bg-white text-[#4F4E3A] border border-[#E0D9C3]'}`}>
                    <span className="text-[10px] font-medium uppercase leading-none">
                      {date.toLocaleDateString('pt-BR', { month: 'short' })}
                    </span>
                    <span className="text-lg font-bold leading-none mt-0.5">{date.getDate()}</span>
                  </div>
                  <div>
                    <p className="font-serif font-bold text-[#4F4E3A]">
                      {date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </p>
                    {isToday && <p className="text-xs text-[#C4A77D] font-medium">Hoje</p>}
                  </div>
                </div>

                <div className="space-y-2 pl-2 border-l-2 border-[#E0D9C3] ml-6">
                  {apts.map((apt) => (
                    <div key={apt.id}
                      className="bg-white rounded-xl shadow-sm border border-[#E0D9C3] p-4 flex items-center gap-4 group hover:shadow-md transition-all">
                      <div className="flex items-center gap-1.5 text-[#8C8B6E] flex-shrink-0 w-20">
                        <Clock size={16} />
                        <span className="text-sm font-medium">
                          {new Date(apt.scheduled_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-[#4F4E3A] truncate">{apt.patient?.name || 'Paciente'}</p>
                        <p className="text-xs text-[#8C8B6E] flex items-center gap-1 flex-wrap">
                          <span>{typeLabels[apt.type] || apt.type} · {apt.duration_minutes}min</span>
                          {apt.session_number ? <span>· Sessão {apt.session_number}</span> : null}
                          {apt.patient?.doctor?.name && (
                            <span className="inline-flex items-center gap-1 text-[#6B8E5A]">
                              · <Stethoscope size={11} /> {apt.patient.doctor.name}
                            </span>
                          )}
                          {apt.notes && <span>· {apt.notes}</span>}
                        </p>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[apt.status]}`}>
                        {statusLabels[apt.status]}
                      </span>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openManualCharge(apt)} title="Gerar cobrança avulsa"
                          className="p-2 rounded-lg text-[#8C8B6E] hover:bg-[#F5F2E8] hover:text-[#4F4E3A] transition-colors">
                          <DollarSign size={16} />
                        </button>
                        <button onClick={() => openEdit(apt)}
                          className="p-2 rounded-lg text-[#8C8B6E] hover:bg-[#F5F2E8] hover:text-[#4F4E3A] transition-colors">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => remove(apt.id)}
                          className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Agendamento */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-[#E0D9C3] sticky top-0 bg-white z-10">
              <h2 className="text-xl font-serif font-bold text-[#4F4E3A]">
                {editing ? 'Editar Agendamento' : 'Novo Agendamento'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="text-[#8C8B6E] hover:text-[#4F4E3A]">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={save} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#4F4E3A] mb-1.5">Paciente *</label>
                <select required value={form.patient_id} onChange={(e) => onSelectPatient(e.target.value)}
                  className={inputClass}>
                  <option value="">Selecione...</option>
                  {patients.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#4F4E3A] mb-1.5">Médico (indicação)</label>
                <select value={form.doctor_id} onChange={(e) => setForm({ ...form, doctor_id: e.target.value })}
                  className={inputClass}>
                  <option value="">Nenhum / Sem indicação</option>
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}{d.specialty ? ` — ${d.specialty}` : ''}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#4F4E3A] mb-1.5">Data e hora *</label>
                  <input type="datetime-local" required value={form.scheduled_at}
                    onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#4F4E3A] mb-1.5">Duração (min)</label>
                  <input type="number" value={form.duration_minutes}
                    onChange={(e) => setForm({ ...form, duration_minutes: Number(e.target.value) })} className={inputClass} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#4F4E3A] mb-1.5">Tipo</label>
                  <select value={form.type} disabled={!!editing}
                    onChange={(e) => setForm({ ...form, type: e.target.value as AppointmentType })}
                    className={inputClass}>
                    <option value="first">Primeira consulta</option>
                    <option value="return">Retorno</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#4F4E3A] mb-1.5">Status</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Appointment['status'] })}
                    className={inputClass}>
                    <option value="scheduled">Agendado</option>
                    <option value="confirmed">Confirmado</option>
                    <option value="completed">Realizado</option>
                    <option value="cancelled">Cancelado</option>
                    <option value="no_show">Faltou</option>
                  </select>
                </div>
              </div>

              {form.type === 'first' && !editing && (
                <div>
                  <label className="block text-sm font-medium text-[#4F4E3A] mb-1.5">Tipo de acompanhamento</label>
                  <select value={form.follow_up_type}
                    onChange={(e) => setForm({ ...form, follow_up_type: e.target.value as FollowUpType })}
                    className={inputClass}>
                    {(Object.keys(FOLLOW_UP_LABELS) as FollowUpType[]).map((k) => (
                      <option key={k} value={k}>{FOLLOW_UP_LABELS[k]}</option>
                    ))}
                  </select>
                  <p className="text-xs text-[#8C8B6E] mt-1.5">
                    Ao salvar, abrirá um modal para informar o valor e a forma de cobrança desta primeira consulta.
                  </p>
                </div>
              )}

              {form.type === 'return' && !editing && (
                <div className={`rounded-xl px-4 py-3 text-sm border ${
                  activePlan ? 'bg-[#F5F2E8] border-[#E0D9C3] text-[#4F4E3A]' : 'bg-amber-50 border-amber-200 text-amber-800'
                }`}>
                  {checkingPlan ? (
                    <span className="text-[#8C8B6E]">Verificando acompanhamento em aberto...</span>
                  ) : activePlan ? (
                    <div className="flex items-start gap-2">
                      <CheckCircle2 size={16} className="text-[#6B8E5A] mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium">
                          Sessão {activePlan.sessions_completed + 1} de {activePlan.total_sessions} · {FOLLOW_UP_LABELS[activePlan.follow_up_type]}
                        </p>
                        <p className="text-xs text-[#8C8B6E] mt-0.5">
                          {activePlan.payment_mode === 'por_sessao'
                            ? 'Pagamento por sessão — será solicitada uma cobrança ao salvar.'
                            : 'Pagamento único já quitado no pacote — nenhuma cobrança adicional será gerada.'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2">
                      <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                      <p>Nenhum acompanhamento em aberto encontrado para este paciente. O retorno será registrado sem vínculo a um plano — gere uma cobrança avulsa depois, se necessário (ícone de $ na lista).</p>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-[#4F4E3A] mb-1.5">Observações</label>
                <textarea rows={3} value={form.notes}
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

      {/* Modal de Cobrança */}
      {chargeContext && (
        <ChargeModal
          context={chargeContext}
          onClose={() => setChargeContext(null)}
          onConfirm={submitCharge}
        />
      )}
    </div>
  );
}

const inputClass = "w-full px-4 py-2.5 rounded-xl border border-[#D5CFBE] bg-[#FDFCF7] focus:border-[#8C8B6E] focus:ring-2 focus:ring-[#8C8B6E]/20 outline-none transition-all text-[#4F4E3A] text-sm";

// ---------- Modal de Cobrança ----------

function ChargeModal({
  context, onClose, onConfirm,
}: {
  context: ChargeContext;
  onClose: () => void;
  onConfirm: (payload: { amount: number; method: ChargeMethod; markPaidNow: boolean; paymentMode?: PaymentMode }) => Promise<void> | void;
}) {
  const [amount, setAmount] = useState<string>('');
  const [method, setMethod] = useState<ChargeMethod>('pix');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('unico');
  const [markPaidNow, setMarkPaidNow] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const title = context.kind === 'first'
    ? 'Cobrança — Primeira Consulta'
    : context.kind === 'return'
    ? `Cobrança — Sessão ${context.sessionNumber}/${context.plan.total_sessions}`
    : 'Cobrança Avulsa';

  const helper = context.kind === 'first'
    ? (paymentMode === 'unico'
        ? `Valor total do pacote (${FOLLOW_UP_LABELS[context.followUpType]}, ${context.totalSessions} sessão${context.totalSessions > 1 ? 'ões' : ''}).`
        : `Valor cobrado por sessão. Total estimado do pacote: ${
            amount ? (Number(amount) * context.totalSessions).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '-'
          }.`)
    : undefined;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return;
    setSubmitting(true);
    await onConfirm({
      amount: Number(amount),
      method,
      markPaidNow,
      paymentMode: context.kind === 'first' ? paymentMode : undefined,
    });
    setSubmitting(false);
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-[#E0D9C3]">
          <div className="flex items-center gap-2">
            <CreditCard size={20} className="text-[#4F4E3A]" />
            <h2 className="text-lg font-serif font-bold text-[#4F4E3A]">{title}</h2>
          </div>
          <button onClick={onClose} className="text-[#8C8B6E] hover:text-[#4F4E3A]">
            <X size={22} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {context.kind === 'first' && (
            <div>
              <label className="block text-sm font-medium text-[#4F4E3A] mb-1.5">Modalidade de pagamento</label>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setPaymentMode('unico')}
                  className={`py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                    paymentMode === 'unico' ? 'bg-[#4F4E3A] text-white border-[#4F4E3A]' : 'bg-white text-[#4F4E3A] border-[#D5CFBE]'
                  }`}>
                  Pagamento único
                </button>
                <button type="button" onClick={() => setPaymentMode('por_sessao')}
                  className={`py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                    paymentMode === 'por_sessao' ? 'bg-[#4F4E3A] text-white border-[#4F4E3A]' : 'bg-white text-[#4F4E3A] border-[#D5CFBE]'
                  }`}>
                  Por sessão
                </button>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-[#4F4E3A] mb-1.5">
              Valor (R$) {context.kind === 'first' && paymentMode === 'por_sessao' ? '— por sessão' : ''} *
            </label>
            <input type="number" step="0.01" min="0" required autoFocus value={amount}
              onChange={(e) => setAmount(e.target.value)} placeholder="0,00" className={inputClass} />
            {helper && <p className="text-xs text-[#8C8B6E] mt-1.5">{helper}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-[#4F4E3A] mb-1.5">Forma de pagamento</label>
            <select value={method} onChange={(e) => setMethod(e.target.value as ChargeMethod)} className={inputClass}>
              {(Object.keys(CHARGE_METHOD_LABELS) as ChargeMethod[]).map((k) => (
                <option key={k} value={k}>{CHARGE_METHOD_LABELS[k]}</option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2 text-sm text-[#4F4E3A]">
            <input type="checkbox" checked={markPaidNow} onChange={(e) => setMarkPaidNow(e.target.checked)}
              className="rounded border-[#D5CFBE]" />
            Já recebido — marcar como pago agora
          </label>
          {!markPaidNow && (
            <p className="text-xs text-[#8C8B6E] -mt-2">
              A cobrança ficará pendente e aparecerá em Financeiro / Prestação de Contas até ser confirmada.
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-3 rounded-xl bg-[#F5F2E8] text-[#4F4E3A] font-medium hover:bg-[#EDE8D9] transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={submitting}
              className="flex-1 py-3 rounded-xl bg-[#4F4E3A] text-white font-medium hover:bg-[#3D3C2A] transition-colors disabled:opacity-60">
              {submitting ? 'Salvando...' : 'Confirmar Cobrança'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
