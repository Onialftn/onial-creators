"use client";
import { useEffect, useState } from "react";
import type { VideoRef } from "@/lib/ideias";
import type { RoteiroIA } from "@/lib/ia/roteiro";
import { CapaVideo } from "./CapaVideo";
import { TituloCard } from "./Blocos";
import { Icone } from "./Icone";

const n = (v: number) => (v >= 1e6 ? `${(v / 1e6).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mi` : v >= 1e3 ? `${Math.round(v / 1e3)} mil` : String(v));
function ha(iso: string) {
  const h = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 3_600_000));
  return h < 24 ? `${h} h` : `${Math.round(h / 24)} ${Math.round(h / 24) === 1 ? "dia" : "dias"}`;
}

function Janela({ titulo, fechar, children }: { titulo: string; fechar: () => void; children: React.ReactNode }) {
  useEffect(() => { const f = (e: KeyboardEvent) => e.key === "Escape" && fechar(); window.addEventListener("keydown", f); return () => window.removeEventListener("keydown", f); }, [fechar]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,.7)" }} onClick={(e) => e.target === e.currentTarget && fechar()}>
      <div role="dialog" aria-modal="true" aria-label={titulo} className="relative flex w-full flex-col gap-4 overflow-y-auto" style={{ maxWidth: 640, maxHeight: "92vh", padding: 22, borderRadius: 14, background: "var(--panel)", border: "1px solid var(--line)" }}>
        <div className="flex items-start gap-3 pr-10"><div style={{ color: "var(--strong)", fontWeight: 600, lineHeight: 1.35 }}>{titulo}</div></div>
        <button aria-label="Fechar" onClick={fechar} className="absolute flex items-center justify-center" style={{ right: 12, top: 12, width: 40, height: 40, color: "var(--muted)" }}><Icone nome="x" tamanho={18} /></button>
        {children}
      </div>
    </div>
  );
}

type Pronta = { falas: string[]; mapa_citado: string };
async function copiarTexto(t: string) {
  try { await navigator.clipboard.writeText(t); return true; } catch { return false; }
}

function Traduzir({ v, mapa, iaPronta, pronta, inicio }: { v: VideoRef; mapa: string; iaPronta: boolean; pronta: (t: Pronta) => void; inicio?: { res?: RoteiroIA; erro?: string } }) {
  const [texto, setTexto] = useState("");
  const [res, setRes] = useState<RoteiroIA | null>(inicio?.res ?? null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState(inicio?.erro ?? "");
  const [aviso, setAviso] = useState("");
  async function traduzir(t = texto) {
    if (t.trim().length < 30 || carregando) return;
    setErro(""); setAviso(""); setCarregando(true);
    try {
      const r = await fetch("/api/ia/roteiro", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mapa, original: t, video: v.id }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.erro || "A IA não respondeu. Tente de novo.");
      setRes(d.roteiro);
      pronta({ falas: d.roteiro.falas, mapa_citado: d.roteiro.mapa_citado });
      // já copia sozinho (alguns celulares não deixam: aí aparece o botão)
      setAviso((await copiarTexto(d.roteiro.falas.join("\n\n"))) ? "Roteiro traduzido e copiado. É só colar." : "");
    } catch (e) { setErro(e instanceof Error ? e.message : "A IA não respondeu."); } finally { setCarregando(false); }
  }
  async function copiar() {
    setAviso((await copiarTexto(res!.falas.join("\n\n"))) ? "Roteiro copiado." : "Não consegui copiar. Selecione o texto e copie.");
  }
  if (res)
    return (
      <>
        {aviso && <div role="status" className="pill-ok" style={{ alignSelf: "flex-start", fontSize: 14, padding: "6px 12px" }}><Icone nome="check" tamanho={14} />{aviso}</div>}
        {res.mapa_trocado && <div className="pill-tint" style={{ alignSelf: "flex-start" }}>Mapa trocado{res.mapa_citado ? `: "${res.mapa_citado}"` : ""}</div>}
        <div className="flex flex-col gap-2.5">{res.falas.map((f, i) => <p key={i} style={{ margin: 0, color: "var(--strong)", lineHeight: 1.5 }}>{f}</p>)}</div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-gold" onClick={copiar}>Copiar roteiro</button>
          <button className="btn-line" onClick={() => { setRes(null); setTexto(""); }}>Colar outro texto</button>
        </div>
      </>
    );
  return (
    <>
      <ol style={{ margin: 0, paddingLeft: 20, color: "var(--text2)", fontSize: 14, lineHeight: 1.7 }}>
        <li><a href={`https://www.youtube.com/watch?v=${v.id}`} target="_blank" rel="noreferrer" style={{ color: "var(--accent-text)", textDecoration: "underline" }}>Abra o vídeo no YouTube</a> (no computador).</li>
        <li>Embaixo do vídeo, clique em <b>…mais</b> e depois em <b>Mostrar transcrição</b>.</li>
        <li>Selecione o texto da transcrição, copie e cole aqui. O site traduz e copia sozinho.</li>
      </ol>
      <textarea className="input" rows={7} value={texto} autoFocus disabled={carregando}
        onChange={(e) => setTexto(e.target.value)}
        onPaste={(e) => { const t = e.clipboardData.getData("text"); if (t.trim().length >= 30) { e.preventDefault(); setTexto(t); traduzir(t); } }}
        placeholder="Cole a transcrição aqui (Ctrl + V)" style={{ padding: 12, minHeight: 160, resize: "vertical", lineHeight: 1.5 }} />
      {erro && <p role="alert" style={{ margin: 0, color: "var(--warn)", fontSize: 14 }}>{erro}</p>}
      <button className="btn-gold" disabled={!iaPronta || carregando || texto.trim().length < 30} onClick={() => traduzir()} style={{ minHeight: 48 }}>{carregando ? "Traduzindo e copiando… (uns 10 segundos)" : "Traduzir para português"}</button>
    </>
  );
}

export function IdeiasVideos({ mapa, tema, melhores, recentes, iaPronta, automatico, traduzidos: iniciais }: { mapa: string; tema: string; melhores: VideoRef[]; recentes: VideoRef[]; iaPronta: boolean; automatico: boolean; traduzidos: Record<string, Pronta> }) {
  const [assistir, setAssistir] = useState<VideoRef | null>(null);
  const [traduzir, setTraduzir] = useState<VideoRef | null>(null);
  const [mostrar, setMostrar] = useState(10);
  const [traduzidos, setTraduzidos] = useState(iniciais);
  const [copiado, setCopiado] = useState<string | null>(null);
  const [gerando, setGerando] = useState<string | null>(null);
  const [inicio, setInicio] = useState<{ res?: RoteiroIA; erro?: string } | undefined>();
  const marcarCopiado = (id: string) => { setCopiado(id); setTimeout(() => setCopiado((c) => (c === id ? null : c)), 2500); };

  /** Roteiro: se já foi traduzido por alguém da equipe, copia na hora; senão abre a janela para colar a transcrição. */
  async function roteiro(v: VideoRef) {
    const t = traduzidos[v.id];
    if (t && (await copiarTexto(t.falas.join("\n\n")))) return marcarCopiado(v.id);
    if (!automatico || !iaPronta || gerando) { setInicio(undefined); return setTraduzir(v); }
    // automático: o Gemini transcreve pelo link e o Claude traduz; depois copia
    setGerando(v.id);
    try {
      const r = await fetch("/api/ia/roteiro", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mapa, video: v.id }) });
      const d = await r.json();
      if (!r.ok) { setInicio({ erro: d.erro }); return setTraduzir(v); }
      setTraduzidos((x) => ({ ...x, [v.id]: { falas: d.roteiro.falas, mapa_citado: d.roteiro.mapa_citado } }));
      if (await copiarTexto(d.roteiro.falas.join("\n\n"))) return marcarCopiado(v.id);
      setInicio({ res: d.roteiro }); setTraduzir(v); // o navegador não deixou copiar sozinho: mostra o texto com o botão Copiar
    } catch { setInicio({ erro: "Não consegui gerar agora. Cole a transcrição abaixo." }); setTraduzir(v); }
    finally { setGerando(null); }
  }

  const Acoes = ({ v }: { v: VideoRef }) => (
    <div className="flex gap-2">
      <button className="btn-line flex-1" onClick={() => setAssistir(v)} style={{ minHeight: 38 }}><Icone nome="play" tamanho={14} />Assistir</button>
      <button className="btn-gold" onClick={() => roteiro(v)} title={traduzidos[v.id] ? "Copiar o roteiro em português" : "Traduzir o roteiro para português"} style={{ minHeight: 38, padding: "0 12px", fontSize: 13 }}>{copiado === v.id ? "Copiado!" : gerando === v.id ? "Gerando…" : "Roteiro"}</button>
    </div>
  );

  return (
    <>
      <section className="card flex flex-col gap-4">
        <TituloCard icone="zap" direita="Últimos 7 dias · os que mais crescem (views por dia)">Melhores vídeos novos · {tema}</TituloCard>
        {melhores.length === 0 ? <p style={{ margin: 0, color: "var(--muted)" }}>Nenhum Short novo nesses canais nos últimos 7 dias.</p> : (
          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))" }}>
            {melhores.map((v, i) => (
              <div key={v.id} className="flex min-w-0 flex-col gap-2.5" style={{ padding: 10, borderRadius: 8, background: "var(--bg)", border: `1px solid ${i === 0 ? "#E8B014" : "var(--line)"}` }}>
                <button onClick={() => setAssistir(v)} className="relative overflow-hidden" style={{ aspectRatio: "9/16", borderRadius: 6, background: "#111" }} aria-label={`Assistir ${v.titulo}`}>
                  <CapaVideo src={v.capa} alt="" />
                  <span className="absolute inset-0" style={{ background: "linear-gradient(180deg,transparent 60%,rgba(0,0,0,.85))" }} />
                  <span className="pill absolute" style={{ left: 8, top: 8, background: i === 0 ? "#E8B014" : "rgba(10,10,10,.75)", color: i === 0 ? "#0A0A0A" : "#fff", fontSize: 11 }}>#{i + 1}</span>
                  <span className="absolute flex flex-col items-start" style={{ left: 8, bottom: 6, color: "#fff", lineHeight: 1.1 }}><span className="num" style={{ fontSize: 20 }}>{n(v.views)}</span>{v.porDia ? <span style={{ fontSize: 11, color: "#FFCC33", fontWeight: 600 }}>+{n(v.porDia)}/dia</span> : null}</span>
                </button>
                <div className="min-w-0"><div style={{ color: "var(--strong)", fontWeight: 600, fontSize: 14, lineHeight: 1.3, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{v.titulo}</div><div style={{ color: "var(--muted)", fontSize: 12, marginTop: 2 }}>{v.canal} · {ha(v.publicado)}</div></div>
                <Acoes v={v} />
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card flex flex-col gap-4">
        <TituloCard icone="cal" direita={`${Math.min(mostrar, recentes.length)} de ${recentes.length} vídeos`}>Recentes de todos os canais</TituloCard>
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))" }}>
          {recentes.slice(0, mostrar).map((v) => (
            <div key={v.id} className="flex min-w-0 flex-col gap-2">
              <button onClick={() => setAssistir(v)} className="relative overflow-hidden" style={{ aspectRatio: "9/16", borderRadius: 6, background: "#111" }} aria-label={`Assistir ${v.titulo}`}>
                <CapaVideo src={v.capa} alt="" />
                <span className="absolute inset-0" style={{ background: "linear-gradient(180deg,transparent 65%,rgba(0,0,0,.85))" }} />
                <span className="num absolute" style={{ left: 8, bottom: 6, fontSize: 17, color: "#fff" }}>{n(v.views)}</span>
              </button>
              <div style={{ color: "var(--strong)", fontSize: 13, fontWeight: 600, lineHeight: 1.3, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{v.titulo}</div>
              <div style={{ color: "var(--muted)", fontSize: 12 }}>{v.canal} · {ha(v.publicado)}</div>
              <Acoes v={v} />
            </div>
          ))}
        </div>
        {mostrar < recentes.length && <button className="btn-line" onClick={() => setMostrar(mostrar + 10)} style={{ alignSelf: "center" }}>Carregar mais 10</button>}
      </section>

      {assistir && (
        <Janela titulo={assistir.titulo} fechar={() => setAssistir(null)}>
          <div style={{ width: "100%", maxWidth: 340, margin: "0 auto", aspectRatio: "9/16", borderRadius: 10, overflow: "hidden", background: "#000" }}>
            <iframe src={`https://www.youtube-nocookie.com/embed/${assistir.id}?autoplay=1&rel=0`} title={assistir.titulo} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen style={{ width: "100%", height: "100%", border: 0 }} />
          </div>
          <button className="btn-gold" onClick={() => { const v = assistir; setAssistir(null); roteiro(v); }}>{traduzidos[assistir.id] ? "Copiar roteiro em português" : "Roteiro em português"}</button>
        </Janela>
      )}
      {traduzir && <Janela titulo={`Roteiro em português · ${traduzir.titulo}`} fechar={() => setTraduzir(null)}><Traduzir v={traduzir} mapa={mapa} iaPronta={iaPronta} inicio={inicio} pronta={(t) => setTraduzidos((x) => ({ ...x, [traduzir.id]: t }))} /></Janela>}
    </>
  );
}
