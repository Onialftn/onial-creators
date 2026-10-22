"use client";
import { useState, useTransition } from "react";
import { apagarRoteiro, salvarRoteiro } from "@/app/(app)/roteiros/acoes";
import { DURACOES, MAPAS } from "@/lib/ia/mapas";
import type { RoteiroIA } from "@/lib/ia/roteiro";
import { TituloCard } from "./Blocos";
import { Icone } from "./Icone";

export interface RoteiroSalvo { id: string; titulo: string; mapa: string; tema: string; duracao: number; original: string; resultado: RoteiroIA; criado_em: string }

const COR_TIPO: Record<string, string> = { GANCHO: "#E8B014", CONTEXTO: "#4DA3FF", VALOR: "#3DDC97", VIRADA: "#C77DFF", DESAFIO: "#FF8A3D", CHAMADA: "#FF5C7A" };

const CHECKLIST = [
  "Gancho forte nos 3 primeiros segundos",
  "Código do mapa aparece na tela",
  "Uma prova real (números, resultado)",
  "Pede comentário com uma pergunta ou desafio",
  "Duração ideal para Shorts: até 45 s",
];

function quando(iso: string) {
  const dias = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  return dias <= 0 ? "hoje" : dias === 1 ? "ontem" : `${dias} dias`;
}
const nomeMapa = (id: string) => MAPAS.find((m) => m.id === id)?.nome ?? id;

/** Texto pronto para colar (com tempos e textos de tela). */
function comoTexto(r: RoteiroIA) {
  return [r.titulo.toUpperCase(), "", ...r.cenas.map((c) => `[${c.inicio}] ${c.tipo}\n${c.fala}${c.na_tela ? `\n(Na tela: ${c.na_tela})` : ""}`)].join("\n\n");
}

export function Roteiros({ salvos, usados: usadosIni, limite, pronta }: { salvos: RoteiroSalvo[]; usados: number; limite: number | null; pronta: boolean }) {
  const [mapa, setMapa] = useState<string>(MAPAS[0].id);
  const [tema, setTema] = useState<string>(MAPAS[0].temas[0]);
  const [duracao, setDuracao] = useState<number>(45);
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
        body: JSON.stringify({ mapa, tema, duracao, original, anterior: outraVersao && res ? comoTexto(res) : undefined }),
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
      const r = await salvarRoteiro({ mapa, tema, duracao, original, resultado: res });
      if ("erro" in r) setErro(r.erro ?? ""); else { setSalvoId(r.id); setAviso("Roteiro salvo."); }
    });
  }
  function abrir(s: RoteiroSalvo) {
    setMapa(s.mapa); setTema(s.tema); setDuracao(s.duracao); setOriginal(s.original); setRes(s.resultado); setSalvoId(s.id); setErro(""); setAviso("");
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
          <div className="flex flex-col gap-1.5">
            <span className="label">Duração</span>
            <div className="flex gap-2" role="group" aria-label="Duração">
              {DURACOES.map((d) => (
                <button key={d} type="button" aria-pressed={duracao === d} onClick={() => setDuracao(d)} className={duracao === d ? "btn-gold" : "btn-line"} style={{ minHeight: 40, padding: "0 18px" }}>{d} s</button>
              ))}
            </div>
          </div>
          <label className="flex flex-col gap-1.5">
            <span className="label">Roteiro do vídeo gringo (inspiração)</span>
            <textarea className="input" rows={8} value={original} onChange={(e) => setOriginal(e.target.value)} placeholder="Cole aqui o que é falado no vídeo. No YouTube: ⋯ → Mostrar transcrição, e copie o texto." style={{ padding: 12, minHeight: 180, resize: "vertical", lineHeight: 1.5 }} />
          </label>
          {erro && <p role="alert" style={{ margin: 0, color: "var(--warn)", fontSize: 14 }}>{erro}</p>}
          <button className="btn-gold" disabled={!pronta || carregando || acabou || original.trim().length < 30} onClick={() => adaptar(false)} style={{ minHeight: 48 }}>
            {carregando ? "Adaptando… (uns 15 segundos)" : acabou ? "Limite do mês atingido" : "Adaptar roteiro"}
          </button>
        </div>

        {/* resultado */}
        <div className="card flex flex-col gap-4" aria-live="polite">
          <TituloCard icone="zap" direita={res ? `${duracao} s · ${res.cenas.length} cenas` : undefined}>Adaptado para o Brasil</TituloCard>
          {!res ? (
            <p style={{ margin: 0, color: "var(--muted)" }}>{carregando ? "A IA está escrevendo o roteiro…" : "O roteiro adaptado aparece aqui, separado em cenas, com o tempo de cada uma."}</p>
          ) : (
            <>
              {res.titulo && <div className="display" style={{ fontSize: 22, color: "var(--strong)" }}>{res.titulo}</div>}
              <div className="grid grid-cols-2 gap-3">
                {[["Retenção estimada", `${res.retencao_original}%`, `${res.retencao_nova}%`], ["Força do gancho", res.gancho_original.toLocaleString("pt-BR"), res.gancho_novo.toLocaleString("pt-BR")]].map(([l, a, b]) => (
                  <div key={l} className="tile">
                    <div style={{ fontSize: 12, color: "var(--muted)" }}>{l}</div>
                    <div className="flex items-baseline gap-2"><span style={{ color: "var(--muted)", textDecoration: "line-through" }}>{a}</span><span className="num" style={{ fontSize: 24, color: "var(--ok)" }}>{b}</span></div>
                  </div>
                ))}
              </div>
              <div className="flex flex-col gap-3">
                {res.cenas.map((c, i) => (
                  <div key={i} className="flex flex-col gap-1.5" style={{ paddingBottom: 12, borderBottom: i < res.cenas.length - 1 ? "1px solid var(--line)" : undefined }}>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="num" style={{ color: "var(--muted)", minWidth: 34 }}>{c.inicio}</span>
                      <span className="pill" style={{ background: "transparent", border: `1px solid ${COR_TIPO[c.tipo] ?? "var(--line2)"}`, color: COR_TIPO[c.tipo] ?? "var(--fg)", fontSize: 11 }}>{c.tipo}</span>
                      {c.melhoria && <span className="pill-ok" style={{ fontSize: 11 }}>{c.melhoria}</span>}
                    </div>
                    <div style={{ color: "var(--strong)", fontSize: 16, lineHeight: 1.45 }}>{c.fala}</div>
                    {c.na_tela && <div style={{ color: "var(--accent-text)", fontSize: 13 }}>Na tela: {c.na_tela}</div>}
                  </div>
                ))}
              </div>
              {res.dicas.length > 0 && (
                <div className="tile flex flex-col gap-1.5">
                  <div className="label">Dicas de gravação</div>
                  {res.dicas.map((d, i) => <div key={i} style={{ fontSize: 14 }}>• {d}</div>)}
                </div>
              )}
              {aviso && <p role="status" style={{ margin: 0, color: "var(--ok)", fontSize: 14 }}>{aviso}</p>}
              <div className="flex flex-wrap gap-2">
                <button className="btn-gold" onClick={copiar} style={{ minHeight: 44 }}><Icone nome="script" tamanho={16} />Copiar roteiro</button>
                <button className="btn-line" onClick={salvar} disabled={!!salvoId} style={{ minHeight: 44 }}>{salvoId ? "Salvo" : "Salvar"}</button>
                <button className="btn-line" onClick={() => adaptar(true)} disabled={!pronta || carregando || acabou || original.trim().length < 30} style={{ minHeight: 44 }}><Icone nome="reset" tamanho={16} />{carregando ? "Gerando…" : "Gerar outra versão"}</button>
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
