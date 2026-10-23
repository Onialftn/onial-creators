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

function Traduzir({ v, mapa, iaPronta }: { v: VideoRef; mapa: string; iaPronta: boolean }) {
  const [texto, setTexto] = useState("");
  const [res, setRes] = useState<RoteiroIA | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  async function traduzir() {
    setErro(""); setAviso(""); setCarregando(true);
    try {
      const r = await fetch("/api/ia/roteiro", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mapa, original: texto }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.erro || "A IA não respondeu. Tente de novo.");
      setRes(d.roteiro);
    } catch (e) { setErro(e instanceof Error ? e.message : "A IA não respondeu."); } finally { setCarregando(false); }
  }
  async function copiar() {
    try { await navigator.clipboard.writeText(res!.falas.join("\n\n")); setAviso("Roteiro copiado."); } catch { setAviso("Não consegui copiar. Selecione o texto e copie."); }
  }
  if (res)
    return (
      <>
        {res.mapa_trocado && <div className="pill-ok" style={{ alignSelf: "flex-start" }}><Icone nome="check" tamanho={12} />Mapa trocado{res.mapa_citado ? `: "${res.mapa_citado}"` : ""}</div>}
        <div className="flex flex-col gap-2.5">{res.falas.map((f, i) => <p key={i} style={{ margin: 0, color: "var(--strong)", lineHeight: 1.5 }}>{f}</p>)}</div>
        {aviso && <p role="status" style={{ margin: 0, color: "var(--ok)", fontSize: 14 }}>{aviso}</p>}
        <div className="flex flex-wrap gap-2">
          <button className="btn-gold" onClick={copiar}><Icone nome="script" tamanho={16} />Copiar roteiro em português</button>
          <button className="btn-line" onClick={() => setRes(null)}>Colar outro texto</button>
        </div>
      </>
    );
  return (
    <>
      <ol style={{ margin: 0, paddingLeft: 20, color: "var(--text2)", fontSize: 14, lineHeight: 1.7 }}>
        <li><a href={`https://www.youtube.com/watch?v=${v.id}`} target="_blank" rel="noreferrer" style={{ color: "var(--accent-text)", textDecoration: "underline" }}>Abra o vídeo no YouTube</a> (no computador).</li>
        <li>Embaixo do vídeo, clique em <b>…mais</b> e depois em <b>Mostrar transcrição</b>.</li>
        <li>Selecione o texto da transcrição, copie e cole aqui.</li>
      </ol>
      <textarea className="input" rows={7} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Cole a transcrição aqui (pode colar com os tempos, a IA ignora)" style={{ padding: 12, minHeight: 160, resize: "vertical", lineHeight: 1.5 }} />
      {erro && <p role="alert" style={{ margin: 0, color: "var(--warn)", fontSize: 14 }}>{erro}</p>}
      <button className="btn-gold" disabled={!iaPronta || carregando || texto.trim().length < 30} onClick={traduzir} style={{ minHeight: 48 }}>{carregando ? "Traduzindo… (uns 10 segundos)" : "Traduzir para português"}</button>
    </>
  );
}

export function IdeiasVideos({ mapa, tema, melhores, recentes, iaPronta }: { mapa: string; tema: string; melhores: VideoRef[]; recentes: VideoRef[]; iaPronta: boolean }) {
  const [assistir, setAssistir] = useState<VideoRef | null>(null);
  const [traduzir, setTraduzir] = useState<VideoRef | null>(null);
  const [mostrar, setMostrar] = useState(10);

  const Acoes = ({ v }: { v: VideoRef }) => (
    <div className="flex gap-2">
      <button className="btn-line flex-1" onClick={() => setAssistir(v)} style={{ minHeight: 38 }}><Icone nome="play" tamanho={14} />Assistir</button>
      <button className="btn-gold" onClick={() => setTraduzir(v)} aria-label="Copiar roteiro em português" title="Copiar roteiro em português" style={{ minHeight: 38, padding: "0 12px" }}><Icone nome="script" tamanho={16} /></button>
    </div>
  );

  return (
    <>
      <section className="card flex flex-col gap-4">
        <TituloCard icone="zap" direita="Últimos 7 dias · ordenado por views">Melhores vídeos novos · {tema}</TituloCard>
        {melhores.length === 0 ? <p style={{ margin: 0, color: "var(--muted)" }}>Nenhum Short novo nesses canais nos últimos 7 dias.</p> : (
          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(170px,1fr))" }}>
            {melhores.map((v, i) => (
              <div key={v.id} className="flex min-w-0 flex-col gap-2.5" style={{ padding: 10, borderRadius: 8, background: "var(--bg)", border: `1px solid ${i === 0 ? "#E8B014" : "var(--line)"}` }}>
                <button onClick={() => setAssistir(v)} className="relative overflow-hidden" style={{ aspectRatio: "9/16", borderRadius: 6, background: "#111" }} aria-label={`Assistir ${v.titulo}`}>
                  <CapaVideo src={v.capa} alt="" />
                  <span className="absolute inset-0" style={{ background: "linear-gradient(180deg,transparent 60%,rgba(0,0,0,.85))" }} />
                  <span className="pill absolute" style={{ left: 8, top: 8, background: i === 0 ? "#E8B014" : "rgba(10,10,10,.75)", color: i === 0 ? "#0A0A0A" : "#fff", fontSize: 11 }}>#{i + 1}</span>
                  <span className="num absolute" style={{ left: 8, bottom: 6, fontSize: 20, color: "#fff" }}>{n(v.views)}</span>
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
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))" }}>
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
          <button className="btn-gold" onClick={() => { setTraduzir(assistir); setAssistir(null); }}><Icone nome="script" tamanho={16} />Copiar roteiro em português</button>
        </Janela>
      )}
      {traduzir && <Janela titulo={`Roteiro em português · ${traduzir.titulo}`} fechar={() => setTraduzir(null)}><Traduzir v={traduzir} mapa={mapa} iaPronta={iaPronta} /></Janela>}
    </>
  );
}
