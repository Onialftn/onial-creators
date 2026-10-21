"use client";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabaseNavegador } from "@/lib/supabase/client";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [entrando, setEntrando] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !senha) return setErro("Preencha e-mail e senha.");
    setEntrando(true);
    setErro("");
    const { error } = await supabaseNavegador().auth.signInWithPassword({ email: email.trim(), password: senha });
    setEntrando(false);
    if (error) return setErro("E-mail ou senha incorretos. Confira e tente de novo.");
    router.replace("/");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "radial-gradient(ellipse at 50% 0, var(--halo) 0, var(--bg) 60%)" }}>
      <form onSubmit={entrar} className="card w-full flex flex-col gap-4" style={{ maxWidth: 380, borderRadius: 10, padding: "32px 28px", boxShadow: "0 0 60px rgba(232,176,20,.12)" }}>
        <div className="flex flex-col items-center gap-2.5 text-center">
          <Image src="/logo.png" alt="Logo Onial" width={84} height={84} className="rounded-2xl" style={{ boxShadow: "0 0 30px rgba(232,176,20,.35)" }} priority />
          <h1 className="display" style={{ fontSize: 28, letterSpacing: 1.5, margin: 0 }}>ONIAL CREATORS</h1>
          <p style={{ color: "var(--muted)", margin: 0 }}>Entre com o login da sua equipe</p>
        </div>
        <label className="flex flex-col gap-1.5">
          <span className="label">E-mail</span>
          <input className="input" id="email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@onial.com" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="label">Senha</span>
          <input className="input" id="senha" type="password" autoComplete="current-password" value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="Sua senha" />
        </label>
        {erro && <p role="alert" style={{ color: "var(--warn)", margin: 0, fontSize: 13 }}>{erro}</p>}
        <button className="btn-gold" type="submit" disabled={entrando} style={{ minHeight: 48, fontSize: 15 }}>{entrando ? "Entrando..." : "Entrar"}</button>
        <p style={{ color: "var(--muted)", fontSize: 12, textAlign: "center", margin: 0 }}>Esqueceu a senha? Fale com o gestor da equipe.</p>
      </form>
    </div>
  );
}
