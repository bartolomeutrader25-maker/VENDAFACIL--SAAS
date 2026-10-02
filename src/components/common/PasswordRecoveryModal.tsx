import React, { useState } from 'react';
import {
  KeyRound,
  Mail,
  Lock,
  ArrowRight,
  CheckCircle2,
  X,
  AlertCircle,
  ShieldCheck,
  RefreshCw,
  Eye,
  EyeOff,
  Copy,
  Check
} from 'lucide-react';
import { api } from '../../lib/api.js';
import { useToast } from '../../context/ToastContext.js';
import { auth, firestore } from '../../firebaseConfig.js';
import { sendPasswordResetEmail } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

interface PasswordRecoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessReset?: (email: string) => void;
  initialEmail?: string;
}

export const PasswordRecoveryModal: React.FC<PasswordRecoveryModalProps> = ({
  isOpen,
  onClose,
  onSuccessReset,
  initialEmail = '',
}) => {
  const { success, error } = useToast();

  const [step, setStep] = useState<'request' | 'verify' | 'completed'>('request');
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [serverCodeHint, setServerCodeHint] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  if (!isOpen) return null;

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      error('Por favor introduza o seu endereço de e-mail.');
      return;
    }

    setIsLoading(true);
    try {
      // 1. Backend generation
      const res = await api.forgotPassword(email.trim());

      // 2. Also trigger Firebase Auth password reset email if configured
      try {
        await sendPasswordResetEmail(auth, email.trim());
      } catch (fbErr: any) {
        // Firebase Auth might not have this user if registered locally, which is fine
        console.info('Firebase Auth reset email notice:', fbErr?.message || fbErr);
      }

      // 3. Mirror in Firestore collection passwordResets
      if (res.code) {
        try {
          const resetDocId = `reset-${Date.now()}`;
          await setDoc(doc(firestore, 'passwordResets', resetDocId), {
            id: resetDocId,
            email: email.trim().toLowerCase(),
            code: res.code,
            status: 'pending',
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
          });
        } catch (fsErr) {
          console.warn('Firestore password reset sync notice:', fsErr);
        }
      }

      setServerCodeHint(res.code || null);
      if (res.code) {
        setCode(res.code); // auto-fill code for convenience
      }
      setStep('verify');
      success('Código de recuperação gerado com sucesso!');
    } catch (err: any) {
      error(err.message || 'Erro ao solicitar recuperação de senha');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!code.trim()) {
      error('Introduza o código de verificação de 6 dígitos.');
      return;
    }

    if (newPassword.length < 6) {
      error('A palavra-passe deve ter pelo menos 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      error('As palavras-passe não coincidem.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.resetPassword({
        email: email.trim(),
        code: code.trim(),
        newPassword,
      });

      // Update in Firestore
      try {
        const resetQueryDoc = `reset-used-${Date.now()}`;
        await setDoc(doc(firestore, 'passwordResets', resetQueryDoc), {
          email: email.trim().toLowerCase(),
          status: 'used',
          updatedAt: new Date().toISOString(),
        });
      } catch (fsErr) {
        console.warn('Firestore update sync:', fsErr);
      }

      setStep('completed');
      success(res.message || 'Palavra-passe alterada com sucesso!');
    } catch (err: any) {
      error(err.message || 'Erro ao redefinir a palavra-passe');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyCode = () => {
    if (!serverCodeHint) return;
    navigator.clipboard.writeText(serverCodeHint);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleFinish = () => {
    if (onSuccessReset) {
      onSuccessReset(email);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-md w-full shadow-2xl overflow-hidden text-slate-100 flex flex-col">
        {/* HEADER */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-white">
                Recuperação de Palavra-passe
              </h3>
              <p className="text-[11px] text-slate-400">
                Aceda novamente à sua conta do VendaFácil
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BODY */}
        <div className="p-5 space-y-4">
          {step === 'request' && (
            <form onSubmit={handleRequestCode} className="space-y-4">
              <p className="text-xs text-slate-300 leading-relaxed">
                Insira o endereço de e-mail associado à sua conta. Iremos gerar um código de validação seguro para que possa definir uma nova palavra-passe.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  E-mail da Conta
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="exemplo@empresa.ao"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                  <span>{isLoading ? 'A verificar conta...' : 'Gerar Código de Recuperação'}</span>
                </button>
              </div>
            </form>
          )}

          {step === 'verify' && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              {/* Security code banner */}
              {serverCodeHint && (
                <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
                      Código de Recuperação Gerado:
                    </span>
                    <span className="text-lg font-mono font-black text-white tracking-widest">
                      {serverCodeHint}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="p-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                    title="Copiar código"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCode ? 'Copiado!' : 'Copiar'}</span>
                  </button>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Código de Verificação (6 Dígitos)
                </label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-center font-mono text-base font-bold text-white tracking-widest focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nova Palavra-passe
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-9 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Confirmar Nova Palavra-passe
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita a palavra-passe"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep('request')}
                  className="py-2.5 px-3 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-bold transition cursor-pointer"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{isLoading ? 'A gravar nova senha...' : 'Guardar Nova Palavra-passe'}</span>
                </button>
              </div>
            </form>
          )}

          {step === 'completed' && (
            <div className="py-4 text-center space-y-4">
              <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <h4 className="font-extrabold text-base text-white">
                  Palavra-passe Redefinida!
                </h4>
                <p className="text-xs text-slate-300 mt-1 max-w-xs mx-auto">
                  A sua senha foi atualizada com sucesso na base de dados. Já pode iniciar sessão no VendaFácil com as novas credenciais.
                </p>
              </div>

              <button
                type="button"
                onClick={handleFinish}
                className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
              >
                Ir para o Início de Sessão
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
