import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, Accept, Origin",
};

const NUTRITIONIST_USER_ID = "ab69ebc1-a3a9-4ba7-806d-f4f064256986";

interface AnamnesePayload {
  nome: string;
  nascimento: string;
  profissao?: string;
  whatsapp: string;
  email?: string;
  motivo: string;
  nutri?: "Sim" | "Não";
  patologia?: string;
  familia?: string;
  cirurgia?: "Sim" | "Não";
  qualCirurgia?: string;
  medicamento?: "Sim" | "Não";
  qualMedicamento?: string;
  queixas?: string[];
  outrasQueixas?: string;
  alergia?: string;
  atividadeFisica?: string;
  suplemento?: string;
  agua?: string;
  restricao?: string;
  intolerancia?: string;
  alcool?: string;
  moradia?: string;
  cozinhar?: "Sim" | "Não" | "Às vezes";
  naoGosta?: string;
  qualidadeSono?: string;
  horasSono?: number;
  intestino?: string;
  fezes?: string;
  dificuldadeEvac?: "Sim" | "Não";
  corUrina?: string;
  alimentacao?: string;
  dificuldades?: string;
  motivacao?: number;
  exames?: "Sim" | "Não";
  encaminharExames?: string;
  indicadoPor?: string | null;
}

function createResponse(data: any, status: number = 200) {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    }
  );
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return createResponse({ error: "Método não permitido" }, 405);
  }

  try {
    const body = await req.json() as AnamnesePayload;

    const required = ["nome", "nascimento", "whatsapp", "motivo"] as const;
    for (const key of required) {
      if (!body[key] || String(body[key]).trim() === "") {
        return createResponse({ error: `Campo obrigatório ausente: ${key}` }, 400);
      }
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") as string;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string;

    if (!supabaseUrl || !serviceRoleKey) {
      return createResponse({ error: "Configuração do servidor ausente" }, 500);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // 1. Validar médico indicado
    let medicoValido: string | null = null;
    if (body.indicadoPor && body.indicadoPor.trim() !== "") {
      const { data: medico, error: medicoError } = await admin
        .from("doctors")
        .select("id, name")
        .eq("id", body.indicadoPor)
        .eq("status", "active")
        .maybeSingle();

      if (medicoError) {
        console.error("Erro ao verificar médico:", medicoError);
      }

      if (medico) {
        medicoValido = medico.id;
      } else {
        console.warn(`Médico com ID ${body.indicadoPor} não encontrado ou inativo`);
      }
    }

    // 2. Buscar paciente existente pelo telefone
    const { data: existingPatient, error: findError } = await admin
      .from("patients")
      .select("id, name, email, phone")
      .eq("phone", body.whatsapp.trim())
      .maybeSingle();

    if (findError) {
      return createResponse({ error: "Erro ao buscar paciente: " + findError.message }, 500);
    }

    let patientId: string;

    if (existingPatient) {
      patientId = existingPatient.id;

      const updateData: Record<string, any> = {
        name: body.nome.trim(),
        updated_at: new Date().toISOString(),
      };

      if (body.email) updateData.email = body.email.trim();
      if (body.profissao) updateData.profession = body.profissao.trim();
      if (body.nascimento) updateData.birth_date = body.nascimento;
      if (body.motivo) updateData.objective = body.motivo.trim();
      if (medicoValido) updateData.doctor_id = medicoValido;

      const { error: updateError } = await admin
        .from("patients")
        .update(updateData)
        .eq("id", patientId);

      if (updateError) {
        console.error("Erro ao atualizar paciente:", updateError);
      }
    } else {
      const { data: newPatient, error: insertError } = await admin
        .from("patients")
        .insert({
          user_id: NUTRITIONIST_USER_ID,
          name: body.nome.trim(),
          email: body.email?.trim() || null,
          phone: body.whatsapp.trim(),
          birth_date: body.nascimento,
          gender: null,
          objective: body.motivo.trim(),
          health_history: body.patologia?.trim() || null,
          allergies: body.alergia?.trim() || null,
          medications: body.qualMedicamento?.trim() || null,
          status: "active",
          from_anamnese: true,
          profession: body.profissao?.trim() || null,
          doctor_id: medicoValido,
        })
        .select("id")
        .single();

      if (insertError || !newPatient) {
        return createResponse(
          { error: "Erro ao cadastrar paciente: " + (insertError?.message ?? "desconhecido") },
          500
        );
      }
      patientId = newPatient.id;
    }

    // 3. Criar anamnese
    const anamneseRow = {
      patient_id: patientId,
      motivo_consulta: body.motivo?.trim() || null,
      acompanhamento_anterior: body.nutri || null,
      patologia: body.patologia?.trim() || null,
      historia_familiar: body.familia?.trim() || null,
      cirurgia: body.cirurgia || null,
      qual_cirurgia: body.qualCirurgia?.trim() || null,
      medicamento_continuo: body.medicamento || null,
      qual_medicamento: body.qualMedicamento?.trim() || null,
      queixas: body.queixas && body.queixas.length > 0 ? body.queixas.join(", ") : null,
      outras_queixas: body.outrasQueixas?.trim() || null,
      alergia: body.alergia?.trim() || null,
      atividade_fisica: body.atividadeFisica?.trim() || null,
      suplemento: body.suplemento?.trim() || null,
      consumo_agua: body.agua || null,
      restricao_alimentar: body.restricao?.trim() || null,
      intolerancia: body.intolerancia?.trim() || null,
      alcool: body.alcool?.trim() || null,
      moradia: body.moradia?.trim() || null,
      habitos_cozinhar: body.cozinhar || null,
      alimentos_nao_gosta: body.naoGosta?.trim() || null,
      qualidade_sono: body.qualidadeSono || null,
      horas_sono: body.horasSono ?? null,
      funcionamento_intestino: body.intestino?.trim() || null,
      tipo_fezes: body.fezes || null,
      dificuldade_evacuar: body.dificuldadeEvac || null,
      cor_urina: body.corUrina || null,
      avaliacao_alimentar: body.alimentacao || null,
      dificuldades_alimentacao: body.dificuldades?.trim() || null,
      motivacao: body.motivacao ?? null,
      exames_recentes: body.exames || null,
      encaminhar_exames: body.encaminharExames?.trim() || null,
      indicado_por: medicoValido,
    };

    const { error: anamneseErr } = await admin
      .from("anamnese")
      .insert(anamneseRow);

    if (anamneseErr) {
      return createResponse({ error: "Erro ao salvar anamnese: " + anamneseErr.message }, 500);
    }

    return createResponse({
      success: true,
      message: "Anamnese enviada com sucesso!",
      patientId,
      indicadoPor: medicoValido,
    });

  } catch (error) {
    console.error("Erro no processamento:", error);
    return createResponse({ error: (error as Error).message || "Erro interno do servidor" }, 500);
  }
});