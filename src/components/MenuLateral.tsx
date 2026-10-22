"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Icone } from "./Icone";

type Item = { href: string; rotulo: string; icone: string; emBreve?: boolean };
const GRUPOS: { titulo: string; itens: Item[]; soGestor?: boolean }[] = [
  {
    titulo: "Principal",
    itens: [
      { href: "/", rotulo: "Dashboard", icone: "dash" },
      { href: "/dias", rotulo: "Dias de postagem", icone: "cal" },
      { href: "/metas", rotulo: "Metas de views", icone: "target" },
      { href: "/pagamentos", rotulo: "Pagamentos", icone: "wallet" },
      { href: "/redes", rotulo: "Minhas redes", icone: "zap" },
    ],
  },
  {
    titulo: "Otimizações",
    itens: [
      { href: "/ideias", rotulo: "Ideias de vídeos", icone: "bulb" },
      { href: "/roteiros", rotulo: "Roteiros", icone: "script" },
      { href: "/audio", rotulo: "Áudio", icone: "wave" },
      { href: "/avaliar", rotulo: "Avaliar vídeo", icone: "video" },
      { href: "/pomodoro", rotulo: "Pomodoro", icone: "timer" },
    ],
  },
  {
    titulo: "Equipe",
    itens: [
      { href: "/ranking", rotulo: "Ranking do mês", icone: "trophy" },
      { href: "/coletiva", rotulo: "Meta coletiva", icone: "users", emBreve: true },
    ],
  },
  { titulo: "Gestão", soGestor: true, itens: [{ href: "/gestor", rotulo: "Painel do gestor", icone: "gear" }] },
];

export function MenuLateral({ nome, papel }: { nome: string; papel: "criador" | "gestor" }) {
  const rota = usePathname();
  const [claro, setClaro] = useState(false);
  useEffect(() => setClaro(document.documentElement.getAttribute("data-mode") === "light"), []);
  function alternarTema() {
    const novo = !claro;
    setClaro(novo);
    if (novo) document.documentElement.setAttribute("data-mode", "light");
    else document.documentElement.removeAttribute("data-mode");
    try {
      localStorage.setItem("onialMode", novo ? "light" : "dark");
    } catch {}
  }
  const ativo = (href: string) => (href === "/" ? rota === "/" : rota.startsWith(href));

  return (
    <aside className="menu">
      <Link href="/" className="flex items-center gap-2.5 px-2">
        <Image src="/logo.png" alt="Logo Onial" width={44} height={44} className="rounded-lg" style={{ boxShadow: "0 0 18px rgba(232,176,20,.35)" }} priority />
        <span className="menu-marca flex flex-col items-start" style={{ gap: 3 }}>
          <span className="display" style={{ fontSize: 18, letterSpacing: 1, whiteSpace: "nowrap", lineHeight: 1 }}>ONIAL CREATORS</span>
          <span title="Site em desenvolvimento" style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, padding: "2px 7px", borderRadius: 4, background: "#E8B014", color: "#0A0A0A", lineHeight: 1.3 }}>BETA</span>
        </span>
      </Link>
      {GRUPOS.filter((g) => !g.soGestor || papel === "gestor").map((g) => (
        <nav key={g.titulo} className="menu-grupo" aria-label={g.titulo}>
          <div className="menu-titulo">{g.titulo.toUpperCase()}</div>
          {g.itens.map((i) => (
            <Link key={i.href} href={i.href} className={`menu-item ${ativo(i.href) ? "menu-ativo" : ""}`} aria-current={ativo(i.href) ? "page" : undefined}>
              <Icone nome={i.icone} />
              {i.rotulo}
              {i.emBreve && <span className="menu-selo">EM BREVE</span>}
            </Link>
          ))}
        </nav>
      ))}
      <button type="button" onClick={alternarTema} className="menu-tema" aria-label={claro ? "Mudar para modo escuro" : "Mudar para modo claro"}>
        <Icone nome={claro ? "moon" : "sun"} tamanho={18} />
        <span>{claro ? "Modo escuro" : "Modo claro"}</span>
      </button>
      <div className="menu-perfil">
        <span className="flex items-center justify-center rounded-full" style={{ width: 36, height: 36, background: "var(--tint)", color: "var(--accent-text)" }}>
          <Icone nome="user" />
        </span>
        <div className="min-w-0">
          <div className="truncate" style={{ color: "var(--fg)" }}>{nome}</div>
          <div style={{ color: "var(--muted)", fontSize: 12 }}>{papel === "gestor" ? "Gestor" : "Criador de conteúdo"}</div>
          <form action="/auth/sair" method="post">
            <button type="submit" style={{ color: "var(--accent-text)", fontSize: 12, marginTop: 4 }}>Sair</button>
          </form>
        </div>
      </div>
    </aside>
  );
}
