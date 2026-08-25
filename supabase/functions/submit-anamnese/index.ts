import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
  "Access-Control-Max-Age": "86400", // Cache de 24 horas para preflight
};

// 🔥 UUID do perfil da nutricionista (sistema) – fornecido por você
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

Deno.serve(async (req: Request) => {
  // 🚀 TRATAMENTO CORS - SEMPRE RETORNAR 200 PARA OPTIONS
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204, // 204 No Content é mais apropriado para OPTIONS
      headers: corsHeaders,
    });
  }

  // Verificar método
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Método não permitido" }),
      {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  try {
    const body = (await req.json()) as AnamnesePayload;

    // Validação mínima dos campos obrigatórios
    const required = ["nome", "nascimento", "whatsapp", "motivo"] as const;
    for (const key of required) {
      if (!body[key] || String(body[key]).trim() === "") {
        return new Response(
          JSON.stringify({ error: `Campo obrigatório ausente: ${key}` }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") as string;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string;

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: "Configuração do servidor ausente" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // 1. Verifica se já existe paciente com este telefone
    const { data: existingPatient, error: findError } = await admin
      .from("patients")
      .select("id")
      .eq("phone", body.whatsapp.trim())
      .maybeSingle();

    if (findError) {
      return new Response(
        JSON.stringify({ error: "Erro ao buscar paciente: " + findError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let patientId: string;

    if (existingPatient) {
      // Paciente já existe → reutiliza o ID
      patientId = existingPatient.id;

      // Atualiza dados do paciente
      const updateData: any = {
        name: body.nome.trim(),
        updated_at: new Date().toISOString(),
      };
      
      if (body.email) updateData.email = body.email.trim();
      if (body.profissao) updateData.profession = body.profissao.trim();
      if (body.nascimento) updateData.birth_date = body.nascimento;
      if (body.motivo) updateData.objective = body.motivo.trim();
      if (body.patologia) updateData.health_history = body.patologia.trim();
      if (body.alergia) updateData.allergies = body.alergia.trim();
      if (body.qualMedicamento) updateData.medications = body.qualMedicamento.trim();

      const { error: updateError } = await admin
        .from("patients")
        .update(updateData)
        .eq("id", patientId);

      if (updateError) {
        console.error("Erro ao atualizar paciente:", updateError);
      }
    } else {
      // 2. Cria um novo paciente com o user_id fixo da nutricionista
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
        })
        .select("id")
        .single();

      if (insertError || !newPatient) {
        return new Response(
          JSON.stringify({
            error: "Erro ao cadastrar paciente: " + (insertError?.message ?? "desconhecido"),
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      patientId = newPatient.id;
    }

    // 3. Verifica se o médico indicado existe
    let medicoValido = null;
    if (body.indicadoPor && body.indicadoPor.trim() !== "") {
      const { data: medico, error: medicoError } = await admin
        .from("doctors")
        .select("id")
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

    // 4. Insere a anamnese
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
      return new Response(
        JSON.stringify({
          error: "Paciente criado, mas erro ao salvar anamnese: " + anamneseErr.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        patientId,
        indicadoPor: medicoValido || null,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message || "Erro interno do servidor" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
