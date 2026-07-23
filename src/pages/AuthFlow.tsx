import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import AuthShell from '@/components/AuthShell';
import { Loader2, Lock, Mail, User, Eye, EyeOff, ArrowLeft, CheckCircle2, MailCheck } from 'lucide-react';

type Mode = 'login' | 'signup' | 'forgot' | 'signup-success' | 'forgot-success';

export default function AuthFlow() {
  const { signIn, signUp, resetPassword } = useAuth();

  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function resetFields() {
    setEmail('');
    setPassword('');
    setFullName('');
    setError(null);
  }

  function switchMode(next: Mode) {
    resetFields();
    setMode(next);
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await signIn(email, password);
    if (error) setError(error);
    setLoading(false);
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await signUp(email, password, fullName);
    if (error) {
      setError(error);
      setLoading(false);
    } else {
      setLoading(false);
      resetFields();
      setMode('signup-success');
    }
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await resetPassword(email);
    if (error) {
      setError(error);
      setLoading(false);
    } else {
      setLoading(false);
      resetFields();
      setMode('forgot-success');
    }
  }

  return (
    <AuthShell>
      {mode === 'login' && (
        <form onSubmit={handleLogin} className="space-y-5">
          <h2 className="text-lg font-serif font-bold text-[#4F4E3A] text-center mb-1">Entrar na sua conta</h2>

          <div>
            <label className="block text-sm font-medium text-[#4F4E3A] mb-2">E-mail</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8C8B6E]" size={18} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
                placeholder="seu@email.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#4F4E3A] mb-2">Senha</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8C8B6E]" size={18} />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`${inputClass} pr-12`}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8C8B6E] hover:text-[#4F4E3A] transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && <ErrorBox message={error} />}

          <button type="submit" disabled={loading} className={primaryBtnClass}>
            {loading ? (<><Loader2 className="animate-spin" size={20} /> Entrando...</>) : 'Entrar'}
          </button>

          <div className="flex flex-col gap-3 pt-2 text-center">
            <button type="button" onClick={() => switchMode('forgot')}
              className="text-sm text-[#8C8B6E] hover:text-[#4F4E3A] font-medium transition-colors">
              Esqueceu sua senha?
            </button>
            <p className="text-sm text-[#8C8B6E]">
              Não tem conta?{' '}
              <button type="button" onClick={() => switchMode('signup')}
                className="text-[#4F4E3A] font-semibold hover:underline">
                Cadastre-se
              </button>
            </p>
          </div>
        </form>
      )}

      {mode === 'signup' && (
        <form onSubmit={handleSignup} className="space-y-5">
          <div className="flex items-center gap-2 mb-1">
            <button type="button" onClick={() => switchMode('login')}
              className="text-[#8C8B6E] hover:text-[#4F4E3A] transition-colors">
              <ArrowLeft size={20} />
            </button>
            <h2 className="text-lg font-serif font-bold text-[#4F4E3A]">Criar conta</h2>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#4F4E3A] mb-2">Nome completo</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8C8B6E]" size={18} />
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className={inputClass}
                placeholder="Seu nome"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#4F4E3A] mb-2">E-mail</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8C8B6E]" size={18} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
                placeholder="seu@email.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#4F4E3A] mb-2">Senha</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8C8B6E]" size={18} />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`${inputClass} pr-12`}
                placeholder="Mínimo 6 caracteres"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8C8B6E] hover:text-[#4F4E3A] transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && <ErrorBox message={error} />}

          <button type="submit" disabled={loading} className={primaryBtnClass}>
            {loading ? (<><Loader2 className="animate-spin" size={20} /> Criando...</>) : 'Cadastrar'}
          </button>

          <p className="text-center text-sm text-[#8C8B6E] pt-2">
            Já tem conta?{' '}
            <button type="button" onClick={() => switchMode('login')}
              className="text-[#4F4E3A] font-semibold hover:underline">
              Entrar
            </button>
          </p>
        </form>
      )}

      {mode === 'forgot' && (
        <form onSubmit={handleForgot} className="space-y-5">
          <div className="flex items-center gap-2 mb-1">
            <button type="button" onClick={() => switchMode('login')}
              className="text-[#8C8B6E] hover:text-[#4F4E3A] transition-colors">
              <ArrowLeft size={20} />
            </button>
            <h2 className="text-lg font-serif font-bold text-[#4F4E3A]">Recuperar senha</h2>
          </div>

          <p className="text-sm text-[#8C8B6E] -mt-2">
            Informe seu e-mail e enviaremos um link para você redefinir sua senha.
          </p>

          <div>
            <label className="block text-sm font-medium text-[#4F4E3A] mb-2">E-mail</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8C8B6E]" size={18} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
                placeholder="seu@email.com"
              />
            </div>
          </div>

          {error && <ErrorBox message={error} />}

          <button type="submit" disabled={loading} className={primaryBtnClass}>
            {loading ? (<><Loader2 className="animate-spin" size={20} /> Enviando...</>) : 'Enviar link de recuperação'}
          </button>

          <p className="text-center text-sm text-[#8C8B6E] pt-2">
            Lembrou a senha?{' '}
            <button type="button" onClick={() => switchMode('login')}
              className="text-[#4F4E3A] font-semibold hover:underline">
              Voltar ao login
            </button>
          </p>
        </form>
      )}

      {mode === 'signup-success' && (
        <div className="text-center space-y-5">
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center">
              <CheckCircle2 className="text-green-500" size={48} />
            </div>
          </div>
          <div>
            <h2 className="text-xl font-serif font-bold text-[#4F4E3A] mb-2">Cadastro confirmado!</h2>
            <p className="text-sm text-[#8C8B6E] leading-relaxed">
              Sua conta foi criada com sucesso. Você já pode entrar no sistema com seus dados de acesso.
            </p>
          </div>
          <button onClick={() => switchMode('login')} className={primaryBtnClass}>
            Ir para o login
          </button>
        </div>
      )}

      {mode === 'forgot-success' && (
        <div className="text-center space-y-5">
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center">
              <MailCheck className="text-green-500" size={48} />
            </div>
          </div>
          <div>
            <h2 className="text-xl font-serif font-bold text-[#4F4E3A] mb-2">E-mail enviado!</h2>
            <p className="text-sm text-[#8C8B6E] leading-relaxed">
              Enviamos um link de recuperação para o seu e-mail. Verifique sua caixa de entrada
              (e a pasta de spam) para redefinir sua senha.
            </p>
          </div>
          <button onClick={() => switchMode('login')} className={primaryBtnClass}>
            Voltar ao login
          </button>
        </div>
      )}
    </AuthShell>
  );
}

const inputClass = "w-full pl-12 pr-4 py-3.5 rounded-xl border border-[#D5CFBE] bg-white/70 focus:bg-white focus:border-[#8C8B6E] focus:ring-2 focus:ring-[#8C8B6E]/20 outline-none transition-all text-[#4F4E3A] placeholder:text-[#B8B099]";

const primaryBtnClass = "w-full py-3.5 rounded-xl bg-gradient-to-r from-[#4F4E3A] to-[#6B6A50] text-white font-medium hover:from-[#3D3C2A] hover:to-[#5A5950] transition-all shadow-lg hover:shadow-xl disabled:opacity-60 flex items-center justify-center gap-2";

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
      {message}
    </div>
  );
}
