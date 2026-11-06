"use client";
import { useEffect, useState } from "react";
import { Icone } from "./Icone";

/**
 * Configurações deste aparelho (aba Configurações): cor do site, modo claro/escuro, tamanho do texto e animações.
 * Ficam no localStorage e são aplicadas antes da página aparecer pelo script do layout (src/app/layout.tsx).
 */
export const TEMAS = [
  { id: "original", nome: "Original", cor: "#E8B014" },
  { id: "vermelho", nome: "Vermelho", cor: "#EF4444" },
  { id: "verde", nome: "Verde", cor: "#22C55E" },
  { id: "azul", nome: "Azul", cor: "#3B82F6" },
  { id: "roxo", nome: "Roxo", cor: "#A855F7" },
] as const;

type Prefs = { tema: string; modo: "dark" | "light" | "auto"; texto: "normal" | "grande"; anim: "normal" | "poucas" };
const PADRAO: Prefs = { tema: "original", modo: "dark", texto: "normal", anim: "normal" };

function ler(): Prefs {
  try {
    const m = localStorage.getItem("onialMode");
    return {
      tema: localStorage.getItem("onialTema") ?? "original",
      modo: m === "light" || m === "auto" ? m : "dark",
      texto: localStorage.getItem("onialTexto") === "grande" ? "grande" : "normal",
      anim: localStorage.getItem("onialAnim") === "poucas" ? "poucas" : "normal",
    };
  } catch { return PADRAO; }
}

/** Aplica na página e guarda no aparelho. */
function aplicar(p: Prefs) {
  const d = document.documentElement;
  const claro = p.modo === "light" || (p.modo === "auto" && window.matchMedia("(prefers-color-scheme: light)").matches);
  if (claro) d.setAttribute("data-mode", "light"); else d.removeAttribute("data-mode");
  if (p.tema === "original") d.removeAttribute("data-tema"); else d.setAttribute("data-tema", p.tema);
  if (p.texto === "grande") d.setAttribute("data-texto", "grande"); else d.removeAttribute("data-texto");
  if (p.anim === "poucas") d.setAttribute("data-animacoes", "poucas"); else d.removeAttribute("data-animacoes");
  try {
    localStorage.setItem("onialMode", p.modo);
    localStorage.setItem("onialTema", p.tema);
    localStorage.setItem("onialTexto", p.texto);
    localStorage.setItem("onialAnim", p.anim);
  } catch {}
  // o botão de modo claro/escuro do menu acompanha
  window.dispatchEvent(new Event("preferencias"));
}

function Opcoes<T extends string>({ valor, opcoes, mudar, rotulo }: { valor: T; opcoes: { id: T; nome: string; icone?: string }[]; mudar: (v: T) => void; rotulo: string }) {
  return (
    <div role="radiogroup" aria-label={rotulo} className="flex flex-wrap gap-2">
      {opcoes.map((o) => (
        <button key={o.id} type="button" role="radio" aria-checked={valor === o.id} onClick={() => mudar(o.id)} className={valor === o.id ? "btn-gold" : "btn-line"} style={{ minHeight: 44 }}>
          {o.icone && <Icone nome={o.icone} tamanho={16} />}{o.nome}
        </button>
      ))}
    </div>
  );
}

function Linha({ titulo, texto, children }: { titulo: string; texto: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4" style={{ padding: "18px 0", borderTop: "1px solid var(--line)" }}>
      <div className="flex min-w-0 flex-col gap-1" style={{ flex: "1 1 260px" }}>
        <span style={{ color: "var(--strong)", fontWeight: 600, fontSize: 15 }}>{titulo}</span>
        <span style={{ color: "var(--muted)", fontSize: 13 }}>{texto}</span>
      </div>
      {children}
    </div>
  );
}

export function Configuracoes() {
  const [p, setP] = useState<Prefs | null>(null);
  useEffect(() => setP(ler()), []);
  const mudar = (novo: Partial<Prefs>) => setP((atual) => {
    const prox = { ...(atual ?? PADRAO), ...novo };
    aplicar(prox);
    return prox;
  });
  if (!p) return null;

  return (
    <>
      <section className="card flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="h2 m-0" style={{ fontSize: 20 }}>Cor do site</h2>
          <span style={{ color: "var(--muted)", fontSize: 13 }}>Troca o dourado dos botões, destaques e gráficos pela cor que você escolher.</span>
        </div>
        <div role="radiogroup" aria-label="Cor do site" className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))" }}>
          {TEMAS.map((t) => {
            const on = p.tema === t.id;
            return (
              <button key={t.id} type="button" role="radio" aria-checked={on} onClick={() => mudar({ tema: t.id })} className="flex flex-col items-start gap-3"
                style={{ padding: 14, borderRadius: 12, textAlign: "left", background: on ? "var(--tint)" : "var(--chip)", border: `2px solid ${on ? t.cor : "var(--line)"}`, boxShadow: on ? `0 0 20px ${t.cor}55` : undefined }}>
                <span className="flex w-full items-center justify-between">
                  <span style={{ width: 34, height: 34, borderRadius: 17, background: t.cor, boxShadow: `0 0 14px ${t.cor}88` }} aria-hidden="true" />
                  {on && <span style={{ color: t.cor, display: "flex" }}><Icone nome="check" tamanho={18} /></span>}
                </span>
                <span style={{ color: "var(--strong)", fontWeight: 700, fontSize: 15 }}>{t.nome}</span>
                <span className="flex w-full gap-1.5" aria-hidden="true">
                  <span style={{ flex: 2, height: 8, borderRadius: 4, background: t.cor }} />
                  <span style={{ flex: 1, height: 8, borderRadius: 4, background: `${t.cor}55` }} />
                  <span style={{ flex: 1, height: 8, borderRadius: 4, background: "var(--track)" }} />
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="card flex flex-col" style={{ paddingBottom: 6 }}>
        <h2 className="h2 m-0" style={{ fontSize: 20, marginBottom: 6 }}>Aparência</h2>
        <Linha titulo="Modo" texto="Escuro, claro ou o mesmo do seu celular/computador.">
          <Opcoes rotulo="Modo" valor={p.modo} mudar={(modo) => mudar({ modo })} opcoes={[{ id: "dark", nome: "Escuro", icone: "moon" }, { id: "light", nome: "Claro", icone: "sun" }, { id: "auto", nome: "Igual ao aparelho" }]} />
        </Linha>
        <Linha titulo="Tamanho do texto" texto="Deixa letras, números e botões um pouco maiores.">
          <Opcoes rotulo="Tamanho do texto" valor={p.texto} mudar={(texto) => mudar({ texto })} opcoes={[{ id: "normal", nome: "Normal" }, { id: "grande", nome: "Grande" }]} />
        </Linha>
        <Linha titulo="Animações" texto="Menos animações deixa o site mais leve em celular mais fraco.">
          <Opcoes rotulo="Animações" valor={p.anim} mudar={(anim) => mudar({ anim })} opcoes={[{ id: "normal", nome: "Normal" }, { id: "poucas", nome: "Poucas" }]} />
        </Linha>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <span style={{ color: "var(--muted)", fontSize: 13 }}>Essas configurações ficam salvas neste aparelho. No celular e no computador você escolhe separado.</span>
        <button type="button" className="btn-line" onClick={() => mudar(PADRAO)}><Icone nome="reset" tamanho={16} />Voltar ao padrão</button>
      </div>
    </>
  );
}
