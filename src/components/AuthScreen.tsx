import React, { useState } from "react";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  auth,
  GoogleAuthProvider,
  signInWithPopup
} from "../firebase";
import { ShieldAlert, KeyRound, Mail, Sparkles, UserPlus, LogIn, Chrome } from "lucide-react";

interface AuthScreenProps {
  onAuthSuccess: () => void;
}

export default function AuthScreen({ onAuthSuccess }: AuthScreenProps) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setError("");
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      onAuthSuccess();
    } catch (err: any) {
      console.error(err);
      setError(
        err.message?.includes("popup-closed-by-user")
          ? "Sign-in popup was closed before completion. Please try again."
          : err.message || "Failed to sign in with Google."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isRegister) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      onAuthSuccess();
    } catch (err: any) {
      console.error(err);
      if (err.code === "auth/operation-not-allowed") {
        setError(
          "Email & Password provider is disabled. Please use 'Sign in with Google' (recommended) or enable Email/Password login in your Firebase console."
        );
      } else {
        setError(err.message || "Authentication failed. Please check credentials.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F4F1EE] px-4 py-12 font-sans relative">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-stone-300 blur-3xl"></div>
      </div>

      <div className="w-full max-w-md bg-white border border-[#1A1A1A]/10 p-8 relative z-10 rounded-none shadow-[0_12px_40px_rgba(26,26,26,0.04)]">
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-8">
          <span className="text-[10px] uppercase tracking-[0.2em] font-bold opacity-60 mb-2">
            Ledger Register
          </span>
          <h1 className="text-4xl font-serif italic font-light tracking-tight text-[#1A1A1A]">
            Foresight<span className="text-indigo-600">.</span>
          </h1>
          <p className="text-xs text-[#1A1A1A]/60 mt-2 text-center max-w-[280px] leading-relaxed">
            AI-powered commitment intelligence and predictive risk forecasting.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 border border-rose-900/10 bg-rose-50/50 text-rose-950 text-xs flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-rose-800" />
            <span className="font-mono leading-relaxed">{error}</span>
          </div>
        )}

        {/* Primary Recommended Auth Option (Google Sign-In) */}
        <div className="space-y-4 mb-6">
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full bg-[#1A1A1A] hover:bg-black text-[#F4F1EE] font-bold text-[10px] uppercase tracking-widest py-3.5 transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50 rounded-none shadow-sm"
          >
            <Chrome className="w-4 h-4" />
            Sign In with Google
          </button>
          <p className="text-[10px] text-[#1A1A1A]/50 text-center font-medium font-mono">
            ★ Recommended & configured by default
          </p>
        </div>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#1A1A1A]/10"></div>
          </div>
          <div className="relative flex justify-center text-[8px] uppercase tracking-wider">
            <span className="bg-white px-3.5 text-[#1A1A1A]/40 font-bold font-mono">Or use email credential</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {isRegister && (
            <div>
              <label className="block text-[9px] uppercase font-bold tracking-wider text-[#1A1A1A]/50 mb-1 font-mono">
                Full Name
              </label>
              <input
                type="text"
                required
                placeholder="Alex Mercer"
                className="w-full bg-transparent border-b border-[#1A1A1A]/20 focus:border-[#1A1A1A] text-[#1A1A1A] placeholder:text-[#1A1A1A]/20 focus:outline-none transition-all text-sm py-1.5 rounded-none"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          )}

          <div>
            <label className="block text-[9px] uppercase font-bold tracking-wider text-[#1A1A1A]/50 mb-1 font-mono">
              Email Address
            </label>
            <div className="relative flex items-center">
              <Mail className="absolute left-0 w-3.5 h-3.5 text-[#1A1A1A]/30" />
              <input
                type="email"
                required
                placeholder="your@email.com"
                className="w-full pl-6 bg-transparent border-b border-[#1A1A1A]/20 focus:border-[#1A1A1A] text-[#1A1A1A] placeholder:text-[#1A1A1A]/20 focus:outline-none transition-all text-sm py-1.5 rounded-none"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-[9px] uppercase font-bold tracking-wider text-[#1A1A1A]/50 mb-1 font-mono">
              Password
            </label>
            <div className="relative flex items-center">
              <KeyRound className="absolute left-0 w-3.5 h-3.5 text-[#1A1A1A]/30" />
              <input
                type="password"
                required
                placeholder="••••••••"
                className="w-full pl-6 bg-transparent border-b border-[#1A1A1A]/20 focus:border-[#1A1A1A] text-[#1A1A1A] placeholder:text-[#1A1A1A]/20 focus:outline-none transition-all text-sm py-1.5 rounded-none"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 border border-[#1A1A1A]/20 hover:bg-[#1A1A1A]/5 text-[#1A1A1A] font-bold text-[10px] uppercase tracking-widest py-3 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 rounded-none"
          >
            {loading ? (
              <span className="inline-block w-3.5 h-3.5 border border-[#1A1A1A] border-t-transparent animate-spin"></span>
            ) : isRegister ? (
              <>
                <UserPlus className="w-3.5 h-3.5" /> Initialize Account
              </>
            ) : (
              <>
                <LogIn className="w-3.5 h-3.5" /> Access Dashboard
              </>
            )}
          </button>
        </form>

        <div className="text-center mt-6">
          <button
            onClick={() => setIsRegister(!isRegister)}
            className="text-[11px] text-[#1A1A1A]/70 hover:text-indigo-700 font-mono tracking-tight cursor-pointer underline underline-offset-2"
          >
            {isRegister ? "Have an account? Access Dashboard" : "New user? Initialize custom ledger"}
          </button>
        </div>
      </div>
    </div>
  );
}
