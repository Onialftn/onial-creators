"use client";
import { useState, useTransition } from "react";
import { apagarRoteiro, salvarRoteiro } from "@/app/(app)/roteiros/acoes";
import { MAPAS } from "@/lib/ia/mapas";
import type { RoteiroIA } from "@/lib/ia/roteiro";
import { TituloCard } from "./Blocos";
import { Icone } from "./Icone";

export interface RoteiroSalvo { id: string; titulo: string; mapa: string; tema: string; original: string; resultado: RoteiroIA; criado_em: string }

const CHECKLIST = [
  "Confira se o nome do mapa ficou certo",
  "Leia em voz alta: se alguma frase soar estranha, ajuste",
  "Coloque o código do mapa na tela do vídeo",
];

function quando(iso: string) {
  const dias = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  return dias <= 0 ? "hoje" : dias === 1 ? "ontem" : `${dias} dias`;
}
const nomeMapa = (id: string) => MAPAS.find((m) => m.id === id)?.nome ?? id;

/** Texto pronto para colar. */
function comoTexto(r: RoteiroIA) {
  return r.falas.join("\n\n");
}

export function Roteiros({ salvos, usados: usadosIni, limite, pronta }: { salvos: RoteiroSalvo[]; usados: number; limite: number | null; pronta: boolean }) {
  const [mapa, setMapa] = useState<string>(MAPAS[0].id);
  const [tema, setTema] = useState<string>(MAPAS[0].temas[0]);
  const [original, setOriginal] = useState("");
  const [res, setRes] = useState<RoteiroIA | null>(null);
  const [salvoId, setSalvoId] = useState<string | null>(null);
  const [usados, setUsados] = useState(usadosIni);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const [, iniciar] = useTransition();

  const temas = MAPAS.find((m) => m.id === mapa)!.temas;
  const acabou = limite !== null && usados >= limite;

  async function adaptar(outraVersao = false) {
    setErro(""); setAviso(""); setCarregando(true);
    try {
      const r = await fetch("/api/ia/roteiro", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mapa, original, anterior: outraVersao && res ? comoTexto(res) : undefined }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.erro || "A IA não respondeu. Tente de novo.");
      setRes(d.roteiro); setSalvoId(null); setUsados(d.usados);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "A IA não respondeu. Tente de novo.");
    } finally {
      setCarregando(false);
    }
  }
  async function copiar() {
    if (!res) return;
    try { await navigator.clipboard.writeText(comoTexto(res)); setAviso("Roteiro copiado."); } catch { setAviso("Não consegui copiar. Selecione o texto e copie."); }
  }
  function salvar() {
    if (!res) return;
    iniciar(async () => {
      const r = await salvarRoteiro({ mapa, tema, original, resultado: res });
      if ("erro" in r) setErro(r.erro ?? ""); else { setSalvoId(r.id); setAviso("Roteiro salvo."); }
    });
  }
  function abrir(s: RoteiroSalvo) {
    setMapa(s.mapa); setTema(s.tema); setOriginal(s.original); setRes(s.resultado); setSalvoId(s.id); setErro(""); setAviso("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <>
      {!pronta && <div role="status" className="pill-warn" style={{ padding: "10px 14px", fontSize: 14 }}>A IA ainda está sendo configurada pelo gestor. Enquanto isso, o botão Adaptar não funciona.</div>}
      <section className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", alignItems: "start" }}>
        {/* entrada */}
        <div className="card flex flex-col gap-4">
          <TituloCard icone="script" direita={limite !== null ? `${usados} de ${limite} no mês` : undefined}>Seu roteiro</TituloCard>
          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))" }}>
            <label className="flex flex-col gap-1.5">
              <span className="label">Mapa</span>
              <select className="input" value={mapa} onChange={(e) => { const m = MAPAS.find((x) => x.id === e.target.value)!; setMapa(m.id); setTema(m.temas[0]); }}>
                {MAPAS.map((m) => <option key={m.id} value={m.id}>{m.emoji} {m.nome}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="label">Tema</span>
              <select className="input" value={tema} onChange={(e) => setTema(e.target.value)}>
                {temas.map((t) => <option key={t}>{t}</option>)}
              </select>
            </label>
          </div>
          <label className="flex flex-col gap-1.5">
            <span className="label">Roteiro do vídeo gringo (inspiração)</span>
            <textarea className="input" rows={8} value={original} onChange={(e) => setOriginal(e.target.value)} placeholder="Cole aqui o que é falado no vídeo. No YouTube: ⋯ → Mostrar transcrição, e copie o texto." style={{ padding: 12, minHeight: 180, resize: "vertical", lineHeight: 1.5 }} />
          </label>
          {erro && <p role="alert" style={{ margin: 0, color: "var(--warn)", fontSize: 14 }}>{erro}</p>}
          <button className="btn-gold" disabled={!pronta || carregando || acabou || original.trim().length < 30} onClick={() => adaptar(false)} style={{ minHeight: 48 }}>
            {carregando ? "Traduzindo… (uns 10 segundos)" : acabou ? "Limite do mês atingido" : "Traduzir roteiro"}
          </button>
        </div>

        {/* resultado */}
        <div className="card flex flex-col gap-4" aria-live="polite">
          <TituloCard icone="zap">Tradução em português</TituloCard>
          {!res ? (
            <p style={{ margin: 0, color: "var(--muted)" }}>{carregando ? "A IA está traduzindo o roteiro…" : "A tradução aparece aqui, frase por frase, na mesma ordem do original."}</p>
          ) : (
            <>
              {res.titulo && <div className="display" style={{ fontSize: 22, color: "var(--strong)" }}>{res.titulo}</div>}
              {res.mapa_trocado
                ? <div className="pill-ok" style={{ alignSelf: "flex-start" }}><Icone nome="check" tamanho={12} />Mapa trocado{res.mapa_citado ? `: "${res.mapa_citado}"` : ""} → {MAPAS.find((m) => m.id === mapa)?.falado}</div>
                : <div className="pill-tint" style={{ alignSelf: "flex-start" }}>O roteiro não citava nenhum mapa</div>}
              <div className="flex flex-col gap-3">
                {res.falas.map((f, i) => (
                  <p key={i} style={{ margin: 0, color: "var(--strong)", fontSize: 16, lineHeight: 1.5 }}>{f}</p>
                ))}
              </div>
              {aviso && <p role="status" style={{ margin: 0, color: "var(--ok)", fontSize: 14 }}>{aviso}</p>}
              <div className="flex flex-wrap gap-2">
                <button className="btn-gold" onClick={copiar} style={{ minHeight: 44 }}><Icone nome="script" tamanho={16} />Copiar roteiro</button>
                <button className="btn-line" onClick={salvar} disabled={!!salvoId} style={{ minHeight: 44 }}>{salvoId ? "Salvo" : "Salvar"}</button>
                <button className="btn-line" onClick={() => adaptar(true)} disabled={!pronta || carregando || acabou || original.trim().length < 30} style={{ minHeight: 44 }}><Icone nome="reset" tamanho={16} />{carregando ? "Traduzindo…" : "Traduzir de novo"}</button>
              </div>
            </>
          )}
        </div>
      </section>

      <section className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", alignItems: "start" }}>
        <div className="card flex flex-col gap-3">
          <TituloCard icone="check">Checklist do roteiro</TituloCard>
          {CHECKLIST.map((c) => (
            <div key={c} className="flex items-center gap-2.5" style={{ color: "var(--text2)" }}><span style={{ color: "var(--ok)", display: "flex" }}><Icone nome="check" tamanho={16} /></span>{c}</div>
          ))}
        </div>
        <div className="card flex flex-col gap-2">
          <TituloCard icone="script">Roteiros salvos</TituloCard>
          {salvos.length === 0 && <p style={{ margin: 0, color: "var(--muted)" }}>Os roteiros que você salvar aparecem aqui.</p>}
          {salvos.map((s) => (
            <div key={s.id} className="flex items-center gap-2" style={{ minHeight: 48, padding: "8px 12px", borderRadius: 6, background: "var(--bg)", border: `1px solid ${salvoId === s.id ? "#E8B014" : "var(--line)"}` }}>
              <button onClick={() => abrir(s)} className="flex min-w-0 flex-1 flex-col items-start text-left">
                <span className="truncate" style={{ color: "var(--strong)", fontWeight: 600, maxWidth: "100%" }}>{s.titulo}</span>
                <span style={{ color: "var(--muted)", fontSize: 12 }}>{nomeMapa(s.mapa).replace("Onial ", "")} · {s.tema} · {quando(s.criado_em)}</span>
              </button>
              <button aria-label={`Apagar ${s.titulo}`} onClick={() => iniciar(() => apagarRoteiro(s.id))} style={{ width: 36, height: 36, color: "var(--muted)" }} className="flex items-center justify-center"><Icone nome="x" tamanho={16} /></button>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
