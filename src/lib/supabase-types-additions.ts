// Adicione estes tipos ao seu lib/supabase.ts existente.

export type FollowUpType = 'unico' | '1_mes' | '2_meses' | '3_meses';
export type PaymentMode = 'unico' | 'por_sessao';

export interface TreatmentPlan {
  id: string;
  user_id: string;
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
  created_at: string;
  updated_at: string;
}

// Ajuste sua interface Appointment existente:
// 1. O campo `type` passa a aceitar apenas 'first' | 'return'
// 2. Adicione os dois campos novos:
//
// export interface Appointment {
//   ...
//   type: 'first' | 'return';
//   treatment_plan_id?: string | null;
//   session_number?: number | null;
//   ...
// }
