"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || "No se pudo iniciar sesión. Por favor verifique sus datos.");
      }

      const callbackUrl = typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("callbackUrl") || "/"
        : "/";
      window.location.href = callbackUrl;
    } catch (err: unknown) {
      const rawMsg = err instanceof Error ? err.message : "";
      if (rawMsg.includes("Failed to fetch") || rawMsg.includes("NetworkError") || rawMsg.includes("fetch failed")) {
        setError("Error de red: No se pudo comunicar con el servidor. Compruebe su conexión a internet.");
      } else {
        setError(rawMsg || "No fue posible iniciar sesión. Por favor intente más tarde.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-900 p-4">
      <div className="w-full max-w-md bg-white border border-slate-200/80 rounded-2xl p-8 shadow-xl shadow-slate-200/60">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center">
            <img
              src="/logo.webp"
              alt="Wayne Trademark"
              className="h-16 w-auto max-w-[260px] object-contain"
            />
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200/90 text-red-800 text-sm flex items-start gap-3 shadow-xs animate-in fade-in duration-200">
            <div className="p-1 rounded-lg bg-red-100 text-red-600 shrink-0 mt-0.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" strokeWidth="2" />
                <line x1="12" y1="8" x2="12" y2="12" strokeWidth="2" />
                <line x1="12" y1="16" x2="12.01" y2="16" strokeWidth="2" />
              </svg>
            </div>
            <div className="flex-1 text-left">
              <p className="font-semibold text-red-900 text-xs uppercase tracking-wider mb-0.5">
                Aviso de autenticación
              </p>
              <p className="text-red-700 text-xs leading-relaxed">
                {error}
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Correo electrónico
            </label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#f6821f] focus:ring-2 focus:ring-[#f6821f]/20 transition-all text-sm font-medium"
              placeholder="ejemplo@correo.com"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Contraseña
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 pr-11 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#f6821f] focus:ring-2 focus:ring-[#f6821f]/20 transition-all text-sm font-medium"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
                title={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
                tabIndex={-1}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none p-1 rounded-lg transition-colors cursor-pointer"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3.5 px-4 rounded-xl bg-[#f6821f] hover:bg-[#e07216] text-white font-semibold text-sm transition-all shadow-lg shadow-[#f6821f]/25 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span>Authenticating...</span>
              </>
            ) : (
              <span>Sign In to Wayne Admin</span>
            )}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-400">
            Authorized administrative access only. Activity is monitored and logged.
          </p>
        </div>
      </div>
    </div>
  );
}
