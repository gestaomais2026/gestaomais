import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import WPLogo from '@/components/WPLogo';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

type SimNao = 'Sim' | 'Não' | '';

const QUEIXAS_OPTS = [
  'Queda de cabelo', 'Cabelos ralos e/ou sem vida', 'Unhas frágeis ou quebradiças',
  'Manchas brancas nas unhas', 'Insônia', 'Sonolência excessiva', 'Retenção hídrica',
  'Dores nas articulações', 'Cãibras', 'Cansaço físico ou mental', 'Dores de cabeça', 'Outros',
];

const inputClass =
  'w-full px-4 py-2.5 rounded-xl border border-[#D5CFBE] bg-[#FDFCF7] focus:border-[#8C8B6E] focus:ring-2 focus:ring-[#8C8B6E]/20 outline-none transition-all text-[#4F4E3A] placeholder:text-[#B8B099] text-sm';

export default function AnamnesePage() {
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dados pessoais
  const [nome, setNome] = useState('');
  const [nascimento, setNascimento] = useState('');
  const [profissao, setProfissao] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');

  // Motivo e histórico
  const [motivo, setMotivo] = useState('');
  const [nutri, setNutri] = useState<SimNao>('');
  const [patologia, setPatologia] = useState('');
  const [familia, setFamilia] = useState('');
  const [cirurgia, setCirurgia] = useState<SimNao>('');
  const [qualCirurgia, setQualCirurgia] = useState('');
  const [medicamento, setMedicamento] = useState<SimNao>('');
  const [qualMedicamento, setQualMedicamento] = useState('');

  // Queixas
  const [queixas, setQueixas] = useState<string[]>([]);
  const [outrasQueixas, setOutrasQueixas] = useState('');
  const [alergia, setAlergia] = useState('');

  // Estilo de vida
  const [atividadeFisica, setAtividadeFisica] = useState('');
  const [suplemento, setSuplemento] = useState('');
  const [agua, setAgua] = useState('');
  const [restricao, setRestricao] = useState('');
  const [intolerancia, setIntolerancia] = useState('');
  const [alcool, setAlcool] = useState('');
  const [moradia, setMoradia] = useState('');
  const [cozinhar, setCozinhar] = useState('');
  const [naoGosta, setNaoGosta] = useState('');

  // Sono, intestino, urina
  const [qualidadeSono, setQualidadeSono] = useState('');
  const [horasSono, setHorasSono] = useState('');
  const [intestino, setIntestino] = useState('');
  const [fezes, setFezes] = useState('');
  const [dificuldadeEvac, setDificuldadeEvac] = useState<SimNao>('');
  const [corUrina, setCorUrina] = useState('');

  // Avaliação e motivação
  const [alimentacao, setAlimentacao] = useState('');
  const [dificuldades, setDificuldades] = useState('');
  const [motivacao, setMotivacao] = useState(8);
  const [exames, setExames] = useState<SimNao>('');
  const [encaminharExames, setEncaminharExames] = useState('');

  function toggleQueixa(opt: string) {
    setQueixas((prev) => (prev.includes(opt) ? prev.filter((q) => q !== opt) : [...prev, opt]));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const fnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/submit-anamnese`;
    try {
      const res = await fetch(fnUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome, nascimento, profissao, whatsapp, email,
          motivo, nutri, patologia, familia, cirurgia, qualCirurgia,
          medicamento, qualMedicamento,
          queixas, outrasQueixas, alergia,
          atividadeFisica, suplemento, agua, restricao, intolerancia,
          alcool, moradia, cozinhar, naoGosta,
          qualidadeSono, horasSono: horasSono ? Number(horasSono) : undefined,
          intestino, fezes, dificuldadeEvac, corUrina,
          alimentacao, dificuldades, motivacao, exames, encaminharExames,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || 'Erro ao enviar o formulário. Tente novamente.');
      } else {
        setSuccess(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch {
      setError('Erro de conexão. Verifique sua internet e tente novamente.');
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#F5F2E8] via-[#EDE8D9] to-[#E0D9C3] flex items-center justify-center p-4">
        <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/60 p-8 sm:p-12 max-w-lg w-full text-center">
          <div className="flex justify-center mb-4">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[#F5F2E8] to-[#E0D9C3] flex items-center justify-center shadow-lg mb-4 overflow-hidden">
              <WPLogo size={64} />
            </div>
          </div>
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center">
              <CheckCircle2 className="text-green-500" size={40} />
            </div>
          </div>
          <h1 className="text-2xl font-serif font-bold text-[#4F4E3A] mb-3">Anamnese enviada com sucesso!</h1>
          <p className="text-sm text-[#8C8B6E] leading-relaxed">
            Recebemos suas informações. A nutricionista entrará em contato em breve para agendar sua consulta.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F5F2E8] via-[#EDE8D9] to-[#E0D9C3] py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header com logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 rounded-2xl bg-white flex items-center justify-center shadow-lg mb-3 overflow-hidden">
            <WPLogo size={52} />
          </div>
          <h1 className="text-2xl font-serif font-bold text-[#4F4E3A]">Anamnese Nutricional</h1>
          <p className="text-sm text-[#8C8B6E] mt-1">Preencha o formulário abaixo para iniciar seu acompanhamento</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl border border-[#E0D9C3] p-6 sm:p-8 space-y-8">
          {/* Dados Pessoais */}
          <Section title="Dados Pessoais">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Nome Completo *" required>
                <input type="text" required value={nome} onChange={(e) => setNome(e.target.value)} className={inputClass} />
              </Field>
              <Field label="Data de Nascimento *" required>
                <input type="date" required value={nascimento} onChange={(e) => setNascimento(e.target.value)} className={inputClass} />
              </Field>
              <Field label="Profissão">
                <input type="text" value={profissao} onChange={(e) => setProfissao(e.target.value)} className={inputClass} />
              </Field>
              <Field label="Contato (WhatsApp) *" required>
                <input type="tel" required value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} className={inputClass} placeholder="(00) 00000-0000" />
              </Field>
            </div>
            <Field label="E-mail">
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} placeholder="seu@email.com" />
            </Field>
          </Section>

          {/* Motivo e Histórico */}
          <Section title="Motivo e Histórico">
            <Field label="Motivo da consulta *" required>
              <input type="text" required value={motivo} onChange={(e) => setMotivo(e.target.value)} className={inputClass} placeholder="Ex: emagrecimento, ganho de massa, reeducação..." />
            </Field>
            <RadioField label="Já teve acompanhamento com nutricionista?" value={nutri} onChange={setNutri} />
            <Field label="Possui alguma patologia (doença)?">
              <input type="text" value={patologia} onChange={(e) => setPatologia(e.target.value)} className={inputClass} placeholder="Ex: gastrite, hipertensão, hipotireoidismo..." />
            </Field>
            <Field label="Alguém na família apresenta ou já apresentou alguma doença?">
              <textarea rows={2} value={familia} onChange={(e) => setFamilia(e.target.value)} className={inputClass} placeholder="Descreva quais doenças e quem" />
            </Field>
            <RadioField label="Já realizou alguma cirurgia?" value={cirurgia} onChange={setCirurgia} />
            <Field label="Se sim, qual?">
              <input type="text" value={qualCirurgia} onChange={(e) => setQualCirurgia(e.target.value)} className={inputClass} placeholder="Descreva a(s) cirurgia(s)" />
            </Field>
            <RadioField label="Faz uso de algum medicamento contínuo?" value={medicamento} onChange={setMedicamento} />
            <Field label="Se sim, qual?">
              <input type="text" value={qualMedicamento} onChange={(e) => setQualMedicamento(e.target.value)} className={inputClass} placeholder="Nome do(s) medicamento(s)" />
            </Field>
          </Section>

          {/* Queixas e Sintomas */}
          <Section title="Queixas e Sintomas">
            <Field label="Apresenta outras queixas em relação à sua saúde? (marque todas que se aplicam)">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-[#FDFCF7] border border-[#E0D9C3] rounded-xl p-3">
                {QUEIXAS_OPTS.map((opt) => (
                  <label key={opt} className="flex items-center gap-2 text-sm text-[#4F4E3A] cursor-pointer">
                    <input type="checkbox" checked={queixas.includes(opt)} onChange={() => toggleQueixa(opt)} className="rounded border-[#D5CFBE] text-[#4F4E3A] focus:ring-[#8C8B6E]" />
                    {opt}
                  </label>
                ))}
              </div>
              <input type="text" value={outrasQueixas} onChange={(e) => setOutrasQueixas(e.target.value)} className={`${inputClass} mt-2`} placeholder="Especifique outras queixas" />
            </Field>
            <Field label="Possui alguma alergia alimentar ou medicamentosa? Se sim, qual">
              <input type="text" value={alergia} onChange={(e) => setAlergia(e.target.value)} className={inputClass} placeholder="Ex: camarão, dipirona, lactose..." />
            </Field>
          </Section>

          {/* Estilo de Vida */}
          <Section title="Estilo de Vida">
            <Field label="Pratica alguma atividade física? Se sim, qual tipo, frequência e intensidade?">
              <textarea rows={2} value={atividadeFisica} onChange={(e) => setAtividadeFisica(e.target.value)} className={inputClass} placeholder="Ex: Musculação 4x/semana, corrida 3x..." />
            </Field>
            <Field label="Faz uso de algum suplemento? Se sim, qual?">
              <input type="text" value={suplemento} onChange={(e) => setSuplemento(e.target.value)} className={inputClass} placeholder="Ex: Whey, creatina, vitaminas..." />
            </Field>
            <SelectField label="Como você classifica o seu consumo de água diário?" value={agua} onChange={setAgua}
              options={[
                'Menor que 1 litro (3 a 5 copos de 200ml)',
                'Entre 1 e 2 litros (5 a 10 copos de 200ml)',
                'Entre 2 e 3 litros (10 a 15 copos de 200ml)',
                'Maior que 3 litros (Mais de 15 copos de 200ml)',
              ]} />
            <Field label="Possui alguma restrição alimentar? Se sim, qual?">
              <input type="text" value={restricao} onChange={(e) => setRestricao(e.target.value)} className={inputClass} placeholder="Ex: não como carne vermelha, não como frutos do mar..." />
            </Field>
            <Field label="Possui alergias ou intolerâncias alimentares?">
              <input type="text" value={intolerancia} onChange={(e) => setIntolerancia(e.target.value)} className={inputClass} placeholder="Ex: intolerância à lactose, glúten..." />
            </Field>
            <Field label="Ingere bebida alcoólica? Se sim, qual frequência/tipo?">
              <input type="text" value={alcool} onChange={(e) => setAlcool(e.target.value)} className={inputClass} placeholder="Ex: vinho aos finais de semana, cerveja 2x/semana..." />
            </Field>
            <Field label="Mora com quantas pessoas? Quem realiza as compras?">
              <input type="text" value={moradia} onChange={(e) => setMoradia(e.target.value)} className={inputClass} placeholder="Ex: 2 pessoas, eu faço as compras" />
            </Field>
            <SelectField label="Tem hábito de cozinhar?" value={cozinhar} onChange={setCozinhar} options={['Sim', 'Não', 'Às vezes']} />
            <Field label="Tem algum alimento que você não goste?">
              <input type="text" value={naoGosta} onChange={(e) => setNaoGosta(e.target.value)} className={inputClass} placeholder="Ex: beterraba, jiló, peixe..." />
            </Field>
          </Section>

          {/* Sono, Intestino e Urina */}
          <Section title="Sono, Intestino e Urina">
            <SelectField label="Como está a qualidade do seu sono?" value={qualidadeSono} onChange={setQualidadeSono}
              options={['Ótima', 'Boa', 'Regular', 'Ruim', 'Péssima']} />
            <Field label="Dorme em média quantas horas por noite?">
              <input type="number" min={0} max={24} step={0.5} value={horasSono} onChange={(e) => setHorasSono(e.target.value)} className={inputClass} placeholder="Ex: 7" />
            </Field>
            <Field label="Como está o funcionamento do seu intestino?">
              <input type="text" value={intestino} onChange={(e) => setIntestino(e.target.value)} className={inputClass} placeholder="Ex: 1x por dia, dias alternados, mais de 1x..." />
            </Field>
            <SelectField label="Indique qual opção se assemelha mais a suas fezes" value={fezes} onChange={setFezes}
              options={[
                'Tipo 1 (pedaços duros e separados)',
                'Tipo 2 (em forma de salsicha, mas grumosa)',
                'Tipo 3 (em forma de salsicha, com rachaduras na superfície)',
                'Tipo 4 (em forma de salsicha ou cobra, lisa e macia)',
                'Tipo 5 (pedaços moles com bordas definidas)',
                'Tipo 6 (pedaços pastosos e irregulares)',
                'Tipo 7 (líquida, sem pedaços sólidos)',
              ]} />
            <RadioField label="Sente dificuldade para evacuar?" value={dificuldadeEvac} onChange={setDificuldadeEvac} />
            <SelectField label="Indique a opção que mais se assemelha a coloração da sua urina" value={corUrina} onChange={setCorUrina}
              options={[
                '1-2 (amarelo claro / transparente)',
                '3-4 (amarelo médio)',
                '5-6 (amarelo escuro / âmbar)',
              ]} />
          </Section>

          {/* Avaliação Alimentar e Motivação */}
          <Section title="Avaliação Alimentar e Motivação">
            <SelectField label="Como você considera sua alimentação atualmente?" value={alimentacao} onChange={setAlimentacao}
              options={[
                'Saudável: opta por carnes magras, alimentos in natura, come alimentos industrializados e consome bebida alcoólica eventualmente',
                'Moderadamente saudável: consome frutas e verduras regularmente, mas exagera nos fins de semana',
                'Pouco saudável: consome alimentos ultraprocessados, bebidas açucaradas, álcool',
              ]} />
            <Field label="Quais são as suas maiores dificuldades em relação à alimentação que te impede de alcançar seu objetivo?">
              <textarea rows={3} value={dificuldades} onChange={(e) => setDificuldades(e.target.value)} className={inputClass} placeholder="Descreva suas principais dificuldades..." />
            </Field>
            <Field label="De 0 a 10, quanto você se sente motivado(a) e/ou comprometido(a) com o acompanhamento nutricional?">
              <div className="flex items-center gap-4">
                <input type="range" min={0} max={10} step={1} value={motivacao}
                  onChange={(e) => setMotivacao(Number(e.target.value))}
                  className="flex-1 accent-[#4F4E3A]" />
                <span className="text-xl font-bold text-[#4F4E3A] min-w-[2rem] text-center">{motivacao}</span>
              </div>
            </Field>
            <RadioField label="Possui exames de sangue recentes? Se sim, poderia encaminhar?" value={exames} onChange={setExames} />
            <Field label="Se sim, como pretende encaminhar?">
              <input type="text" value={encaminharExames} onChange={(e) => setEncaminharExames(e.target.value)} className={inputClass} placeholder="email, anexo..." />
            </Field>
          </Section>

          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex items-start gap-2">
              <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <button type="submit" disabled={submitting}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-[#4F4E3A] to-[#6B6A50] text-white font-medium text-lg hover:from-[#3D3C2A] hover:to-[#5A5950] transition-all shadow-lg disabled:opacity-60 flex items-center justify-center gap-2">
            {submitting ? (<><Loader2 className="animate-spin" size={22} /> Enviando...</>) : 'Enviar Anamnese'}
          </button>
        </form>

        <p className="text-center text-xs text-[#8C8B6E] mt-6">
          Wanessa Pinho · Gestão Mais
        </p>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-serif font-bold text-[#4F4E3A] bg-[#F5F2E8] rounded-lg px-4 py-2">{title}</h2>
      {children}
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-[#4F4E3A] mb-1.5">
        {label}{required && <span className="text-red-500"> </span>}
      </label>
      {children}
    </div>
  );
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <Field label={label}>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={inputClass}>
        <option value="">Selecione...</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </Field>
  );
}

function RadioField({ label, value, onChange }: { label: string; value: SimNao; onChange: (v: SimNao) => void }) {
  return (
    <Field label={label}>
      <div className="flex gap-4">
        {(['Sim', 'Não'] as const).map((opt) => (
          <label key={opt} className="flex items-center gap-2 text-sm text-[#4F4E3A] cursor-pointer">
            <input type="radio" checked={value === opt} onChange={() => onChange(opt)} className="text-[#4F4E3A] focus:ring-[#8C8B6E]" />
            {opt}
          </label>
        ))}
      </div>
    </Field>
  );
}
