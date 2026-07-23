import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import AuthShell from '@/components/AuthShell';
import { Loader2, Lock, Eye, EyeOff, CheckCircle2 } from 'lucide-react';

export default function ResetPassword() {
  const { updatePassword } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres.');
      return;
    }
    if (password !== confirm) {
      setError('As senhas não coincidem.');
      return;
    }
    setLoading(true);
    const { error } = await updatePassword(password);
    setLoading(false);
    if (error) {
      setError(error);
    } else {
      setSuccess(true);
    }
  }

  if (success) {
    return (
      <AuthShell>
        <div className="text-center space-y-5">
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center">
              <CheckCircle2 className="text-green-500" size={48} />
            </div>
          </div>
          <div>
            <h2 className="text-xl font-serif font-bold text-[#4F4E3A] mb-2">Senha redefinida!</h2>
            <p className="text-sm text-[#8C8B6E] leading-relaxed">
              Sua senha foi atualizada com sucesso. Você já pode entrar no sistema com sua nova senha.
            </p>
          </div>
          <button
            onClick={() => { window.location.href = window.location.origin; }}
            className={primaryBtnClass}
          >
            Ir para o login
          </button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <form onSubmit={handleSubmit} className="space-y-5">
        <h2 className="text-lg font-serif font-bold text-[#4F4E3A] text-center mb-1">Defina sua nova senha</h2>
        <p className="text-sm text-[#8C8B6E] text-center -mt-2">
          Crie uma nova senha para acessar sua conta.
        </p>

        <div>
          <label className="block text-sm font-medium text-[#4F4E3A] mb-2">Nova senha</label>
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

        <div>
          <label className="block text-sm font-medium text-[#4F4E3A] mb-2">Confirmar senha</label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8C8B6E]" size={18} />
            <input
              type={showPassword ? 'text' : 'password'}
              required
              minLength={6}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className={`${inputClass} pr-12`}
              placeholder="Repita a senha"
            />
          </div>
        </div>

        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <button type="submit" disabled={loading} className={primaryBtnClass}>
          {loading ? (<><Loader2 className="animate-spin" size={20} /> Salvando...</>) : 'Redefinir senha'}
        </button>
      </form>
    </AuthShell>
  );
}

const inputClass = "w-full pl-12 pr-4 py-3.5 rounded-xl border border-[#D5CFBE] bg-white/70 focus:bg-white focus:border-[#8C8B6E] focus:ring-2 focus:ring-[#8C8B6E]/20 outline-none transition-all text-[#4F4E3A] placeholder:text-[#B8B099]";

const primaryBtnClass = "w-full py-3.5 rounded-xl bg-gradient-to-r from-[#4F4E3A] to-[#6B6A50] text-white font-medium hover:from-[#3D3C2A] hover:to-[#5A5950] transition-all shadow-lg hover:shadow-xl disabled:opacity-60 flex items-center justify-center gap-2";
