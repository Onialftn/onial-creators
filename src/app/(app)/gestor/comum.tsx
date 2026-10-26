import Link from "next/link";
import { Icone } from "@/components/Icone";

/** Abas do Painel do gestor. */
export function AbasGestor({ ativa }: { ativa: "geral" | "criador" | "extras" | "config" }) {
  const abas = [
    { id: "geral", href: "/gestor", rotulo: "Visão geral", icone: "dash" },
    { id: "extras", href: "/gestor/extras", rotulo: "Vídeos extras", icone: "wallet" },
    { id: "config", href: "/gestor/config", rotulo: "Configurações", icone: "gear" },
  ] as const;
  return (
    <nav className="flex flex-wrap gap-2" aria-label="Seções do painel">
      {abas.map((a) => (
        <Link key={a.id} href={a.href} aria-current={ativa === a.id ? "page" : undefined} className={ativa === a.id ? "btn-gold" : "btn-line"} style={{ minHeight: 40 }}>
          <Icone nome={a.icone} tamanho={16} />{a.rotulo}
        </Link>
      ))}
    </nav>
  );
}

/** Mensagem de sucesso/erro que volta das ações (?ok= / ?erro=). */
export function Retorno({ ok, erro }: { ok?: string; erro?: string }) {
  return (
    <>
      {ok && <div role="status" className="pill-ok" style={{ padding: "10px 14px", fontSize: 14 }}><Icone nome="check" tamanho={16} />{ok}</div>}
      {erro && <div role="alert" className="pill-warn" style={{ padding: "10px 14px", fontSize: 14 }}>{erro}</div>}
    </>
  );
}

/** Número grande de resumo. */
export function Numero({ rotulo, valor, sub, cor }: { rotulo: string; valor: string; sub?: string; cor?: string }) {
  return (
    <div className="card" style={{ padding: 20 }}>
      <div style={{ color: "var(--muted)", fontSize: 13 }}>{rotulo}</div>
      <div className="num" style={{ fontSize: 30, marginTop: 6, color: cor ?? "var(--strong)", lineHeight: 1.1 }}>{valor}</div>
      {sub && <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 6 }}>{sub}</div>}
    </div>
  );
}
