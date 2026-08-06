import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Profile = {
  id: string;
  full_name: string;
  role: 'admin' | 'nutritionist' | 'assistant';
  avatar_url: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
};

export type Doctor = {
  id: string;
  user_id: string;
  name: string;
  specialty: string | null;
  crm: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
};

export type Patient = {
  id: string;
  user_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  birth_date: string | null;
  gender: 'female' | 'male' | 'other' | null;
  weight_kg: number | null;
  height_cm: number | null;
  objective: string | null;
  health_history: string | null;
  allergies: string | null;
  medications: string | null;
  status: 'active' | 'inactive' | 'paused';
  doctor_id: string | null;
  profession: string | null;
  from_anamnese: boolean;
  created_at: string;
  updated_at: string;
  doctor?: Doctor;
  anamnese?: Anamnese | null;
};

export type Anamnese = {
  id: string;
  patient_id: string;
  motivo_consulta: string | null;
  acompanhamento_anterior: string | null;
  patologia: string | null;
  historia_familiar: string | null;
  cirurgia: string | null;
  qual_cirurgia: string | null;
  medicamento_continuo: string | null;
  qual_medicamento: string | null;
  queixas: string | null;
  outras_queixas: string | null;
  alergia: string | null;
  atividade_fisica: string | null;
  suplemento: string | null;
  consumo_agua: string | null;
  restricao_alimentar: string | null;
  intolerancia: string | null;
  alcool: string | null;
  moradia: string | null;
  habitos_cozinhar: string | null;
  alimentos_nao_gosta: string | null;
  qualidade_sono: string | null;
  horas_sono: number | null;
  funcionamento_intestino: string | null;
  tipo_fezes: string | null;
  dificuldade_evacuar: string | null;
  cor_urina: string | null;
  avaliacao_alimentar: string | null;
  dificuldades_alimentacao: string | null;
  motivacao: number | null;
  exames_recentes: string | null;
  encaminhar_exames: string | null;
  created_at: string;
  updated_at: string;
};

export type Appointment = {
  id: string;
  user_id: string;
  patient_id: string;
  scheduled_at: string;
  duration_minutes: number;
  type: 'first' | 'return' | 'emergency' | 'online';
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  notes: string | null;
  created_at: string;
  updated_at: string;
  patient?: Patient;
};

export type Consultation = {
  id: string;
  user_id: string;
  patient_id: string;
  appointment_id: string | null;
  consultation_date: string;
  weight_kg: number | null;
  body_fat_pct: number | null;
  muscle_mass_kg: number | null;
  waist_cm: number | null;
  hip_cm: number | null;
  blood_pressure: string | null;
  glucose: number | null;
  notes: string | null;
  recommendations: string | null;
  next_consultation_date: string | null;
  created_at: string;
  updated_at: string;
  patient?: Patient;
};

export type NutritionalPlan = {
  id: string;
  user_id: string;
  patient_id: string;
  title: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  calories_target: number | null;
  protein_g: number | null;
  carb_g: number | null;
  fat_g: number | null;
  content: string | null;
  status: 'draft' | 'active' | 'completed' | 'archived';
  created_at: string;
  updated_at: string;
  patient?: Patient;
};

export type FollowUp = {
  id: string;
  user_id: string;
  patient_id: string;
  type: 'message' | 'task' | 'alert' | 'progress';
  content: string;
  is_completed: boolean;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  patient?: Patient;
};

export type Payment = {
  id: string;
  user_id: string;
  patient_id: string;
  appointment_id: string | null;
  consultation_id: string | null;
  service_date: string;
  description: string | null;
  amount: number;
  payment_method: 'pix' | 'dinheiro' | 'cartão débito' | 'cartão crédito' | 'convênio' | 'outro' | null;
  payment_status: 'pending' | 'paid' | 'cancelled' | 'overdue';
  insurance_plan: string | null;
  notes: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
  patient?: Patient;
};
