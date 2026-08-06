import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface AnamnesePayload {
  // Dados pessoais
  nome: string;
  nascimento: string;
  profissao?: string;
  whatsapp: string;
  email?: string;
  // Motivo e histórico
  motivo: string;
  nutri?: "Sim" | "Não";
  patologia?: string;
  familia?: string;
  cirurgia?: "Sim" | "Não";
  qualCirurgia?: string;
  medicamento?: "Sim" | "Não";
  qualMedicamento?: string;
  // Queixas
  queixas?: string[];
  outrasQueixas?: string;
  alergia?: string;
  // Estilo de vida
  atividadeFisica?: string;
  suplemento?: string;
  agua?: string;
  restricao?: string;
  intolerancia?: string;
  alcool?: string;
  moradia?: string;
  cozinhar?: "Sim" | "Não" | "Às vezes";
  naoGosta?: string;
  // Sono, intestino, urina
  qualidadeSono?: string;
  horasSono?: number;
  intestino?: string;
  fezes?: string;
  dificuldadeEvac?: "Sim" | "Não";
  corUrina?: string;
  // Avaliação e motivação
  alimentacao?: string;
  dificuldades?: string;
  motivacao?: number;
  exames?: "Sim" | "Não";
  encaminharExames?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Método não permitido" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = (await req.json()) as AnamnesePayload;

    // Validação mínima dos campos obrigatórios
    const required = ["nome", "nascimento", "whatsapp", "motivo"] as const;
    for (const key of required) {
      if (!body[key] || String(body[key]).trim() === "") {
        return new Response(
          JSON.stringify({ error: `Campo obrigatório ausente: ${key}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") as string;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string;

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: "Configuração do servidor ausente" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // Encontra a nutricionista (primeiro admin/nutritionist) para vincular o paciente.
    const { data: profile, error: profileErr } = await admin
      .from("profiles")
      .select("id, role")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (profileErr || !profile) {
      return new Response(
        JSON.stringify({ error: "Nenhuma nutricionista cadastrada para receber a anamnese" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Cria o paciente com os dados pessoais
    const { data: patient, error: patientErr } = await admin
      .from("patients")
      .insert({
        user_id: profile.id,
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

    if (patientErr || !patient) {
      return new Response(
        JSON.stringify({ error: "Erro ao cadastrar paciente: " + (patientErr?.message ?? "desconhecido") }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Cria o registro de anamnese com os dados clínicos e de estilo de vida
    const anamneseRow = {
      patient_id: patient.id,
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
    };

    const { error: anamneseErr } = await admin
      .from("anamnese")
      .insert(anamneseRow);

    if (anamneseErr) {
      return new Response(
        JSON.stringify({ error: "Paciente criado, mas erro ao salvar anamnese: " + anamneseErr.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, patientId: patient.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message || "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
