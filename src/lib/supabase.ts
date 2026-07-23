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
  created_at: string;
  updated_at: string;
  doctor?: Doctor;
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
