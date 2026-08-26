import { useState } from 'react';
import { supabase, Anamnese, Doctor } from '@/lib/supabase';
import { X, FileText, Loader2, ClipboardList, Stethoscope } from 'lucide-react';

export default function AnamneseViewer({ patientId, patientName, trigger }: {
  patientId: string;
  patientName: string;
  trigger: 'button' | 'badge';
}) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<Anamnese | null>(null);
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setOpen(true);
    setLoading(true);
    const { data: rows } = await supabase
      .from('anamnese')
      .select('*, medico_indicador:doctors(*)')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    const anamnese = rows as (Anamnese & { medico_indicador?: Doctor }) | null;
    setData(anamnese);
    setDoctor(anamnese?.medico_indicador ?? null);
    setLoading(false);
  }

  if (trigger === 'badge') {
    return (
      <>
        <button type="button" onClick={load}
          className="inline-flex items-center gap-1.5 text-xs bg-[#6B8E5A]/10 text-[#4F6B3E] px-2.5 py-1 rounded-lg hover:bg-[#6B8E5A]/20 transition-colors">
          <ClipboardList size={12} /> Ver anamnese
        </button>
        {open && renderModal()}
      </>
    );
  }

  return (
    <>
      <button type="button" onClick={load}
        className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-[#F5F2E8] text-[#4F4E3A] text-sm font-medium hover:bg-[#EDE8D9] transition-colors">
        <FileText size={16} /> Anamnese
      </button>
      {open && renderModal()}
    </>
  );

  function renderModal() {
    return (
      <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between p-6 border-b border-[#E0D9C3] sticky top-0 bg-white z-10">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-[#6B8E5A]/10 flex items-center justify-center flex-shrink-0">
                <FileText size={20} className="text-[#4F6B3E]" />
              </div>
              <div className="min-w-0">
                <h2 className="font-serif font-bold text-[#4F4E3A] truncate">Anamnese — {patientName}</h2>
                <p className="text-xs text-[#8C8B6E]">Formulário preenchido pelo paciente</p>
              </div>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="text-[#8C8B6E] hover:text-[#4F4E3A] flex-shrink-0">
              <X size={22} />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="animate-spin text-[#8C8B6E]" size={28} />
              </div>
            ) : !data ? (
              <div className="text-center py-12">
                <ClipboardList className="mx-auto mb-3 text-[#8C8B6E] opacity-40" size={40} />
                <p className="text-[#8C8B6E]">Nenhuma anamnese registrada para este paciente.</p>
              </div>
            ) : (
              <>
                {doctor && (
                  <div className="flex items-center gap-2 text-sm text-[#4F4E3A] bg-gradient-to-r from-[#6B8E5A]/10 to-[#4F6B3E]/10 rounded-lg px-3 py-2">
                    <Stethoscope size={14} className="text-[#6B8E5A]" />
                    <span className="font-medium">Indicado por: {doctor.name}</span>
                    {doctor.specialty && <span className="text-[#8C8B6E] text-xs">· {doctor.specialty}</span>}
                    {doctor.crm && <span className="text-[#8C8B6E] text-xs">· CRM: {doctor.crm}</span>}
                  </div>
                )}

                <Group title="Motivo e Histórico">
                  <Item label="Motivo da consulta" value={data.motivo_consulta} />
                  <Item label="Acompanhamento anterior com nutricionista" value={data.acompanhamento_anterior} />
                  <Item label="Patologias" value={data.patologia} />
                  <Item label="Histórico familiar" value={data.historia_familiar} />
                  <Item label="Cirurgia" value={data.cirurgia} />
                  <Item label="Qual cirurgia" value={data.qual_cirurgia} />
                  <Item label="Medicamento contínuo" value={data.medicamento_continuo} />
                  <Item label="Qual medicamento" value={data.qual_medicamento} />
                </Group>

                <Group title="Queixas e Sintomas">
                  <Item label="Queixas" value={data.queixas} />
                  <Item label="Outras queixas" value={data.outras_queixas} />
                  <Item label="Alergias" value={data.alergia} />
                </Group>

                <Group title="Estilo de Vida">
                  <Item label="Atividade física" value={data.atividade_fisica} />
                  <Item label="Suplementos" value={data.suplemento} />
                  <Item label="Consumo de água" value={data.consumo_agua} />
                  <Item label="Restrição alimentar" value={data.restricao_alimentar} />
                  <Item label="Intolerâncias" value={data.intolerancia} />
                  <Item label="Bebida alcoólica" value={data.alcool} />
                  <Item label="Moradia / compras" value={data.moradia} />
                  <Item label="Hábito de cozinhar" value={data.habitos_cozinhar} />
                  <Item label="Alimentos que não gosta" value={data.alimentos_nao_gosta} />
                </Group>

                <Group title="Sono, Intestino e Urina">
                  <Item label="Qualidade do sono" value={data.qualidade_sono} />
                  <Item label="Horas de sono" value={data.horas_sono != null ? `${data.horas_sono}h` : null} />
                  <Item label="Funcionamento intestinal" value={data.funcionamento_intestino} />
                  <Item label="Tipo de fezes" value={data.tipo_fezes} />
                  <Item label="Dificuldade para evacuar" value={data.dificuldade_evacuar} />
                  <Item label="Coloração da urina" value={data.cor_urina} />
                </Group>

                <Group title="Avaliação Alimentar e Motivação">
                  <Item label="Avaliação da alimentação" value={data.avaliacao_alimentar} />
                  <Item label="Dificuldades" value={data.dificuldades_alimentacao} />
                  <Item label="Motivação (0–10)" value={data.motivacao != null ? String(data.motivacao) : null} />
                  <Item label="Exames recentes" value={data.exames_recentes} />
                  <Item label="Encaminhamento de exames" value={data.encaminhar_exames} />
                </Group>

                <p className="text-xs text-[#8C8B6E] text-center pt-2 border-t border-[#E0D9C3]">
                  Preenchido em {new Date(data.created_at).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </>
            )}
          </div>

          <div className="p-6 pt-0">
            <button type="button" onClick={() => setOpen(false)}
              className="w-full py-3 rounded-xl bg-[#F5F2E8] text-[#4F4E3A] font-medium hover:bg-[#EDE8D9] transition-colors">
              Fechar
            </button>
          </div>
        </div>
      </div>
    );
  }
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-serif font-bold text-[#4F4E3A] bg-[#F5F2E8] rounded-lg px-3 py-1.5 mb-3">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Item({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex flex-col">
      <span className="text-xs text-[#8C8B6E] font-medium">{label}</span>
      <span className="text-sm text-[#4F4E3A] whitespace-pre-wrap">{value}</span>
    </div>
  );
}
