"use client";
import { useEffect, useRef, useState } from "react";
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

/** Barra estimada: enche rápido no começo e vai desacelerando até ~92%; quando termina, completa. */
function Progresso({ ativo, terminou }: { ativo: boolean; terminou: boolean }) {
  const [p, setP] = useState(0);
  useEffect(() => {
    if (!ativo) return;
    const inicio = Date.now();
    setP(0);
    const t = setInterval(() => setP(92 * (1 - Math.exp(-(Date.now() - inicio) / 9000))), 200);
    return () => clearInterval(t);
  }, [ativo]);
  const largura = terminou ? 100 : ativo ? p : 0;
  return <span aria-hidden="true" className="absolute inset-y-0 left-0" style={{ width: `${largura}%`, background: "rgba(255,255,255,.35)", transition: "width .3s ease", borderRadius: "inherit" }} />;
}

/** botão verde de "copiado" (texto escuro, como o dourado) */
const VERDE = { background: "#3DDC97", color: "#0A0A0A", boxShadow: "0 0 22px rgba(61,220,151,.35)" } as const;

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
  const [foiCopiado, setFoiCopiado] = useState(false);
  async function copiar() {
    const ok = await copiarTexto(res!.falas.join("\n\n"));
    setAviso(ok ? "" : "Não consegui copiar. Selecione o texto e copie.");
    if (ok) { setFoiCopiado(true); setTimeout(() => setFoiCopiado(false), 2500); }
  }
  if (res)
    return (
      <>
        {aviso && <div role="status" className="pill-ok" style={{ alignSelf: "flex-start", fontSize: 14, padding: "6px 12px" }}><Icone nome="check" tamanho={14} />{aviso}</div>}
        {res.mapa_trocado && <div className="pill-tint" style={{ alignSelf: "flex-start" }}>Mapa trocado{res.mapa_citado ? `: "${res.mapa_citado}"` : ""}</div>}
        <div className="flex flex-col gap-2.5">{res.falas.map((f, i) => <p key={i} style={{ margin: 0, color: "var(--strong)", lineHeight: 1.5 }}>{f}</p>)}</div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-gold" onClick={copiar} style={foiCopiado ? VERDE : undefined}>{foiCopiado ? <><Icone nome="check" tamanho={16} />Copiado!</> : "Copiar roteiro"}</button>
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
  const [assistir, setAssistirV] = useState<VideoRef | null>(null);
  // lista da seção de onde o vídeo foi aberto: as setas ▲ ▼ andam por ela
  const [fila, setFila] = useState<VideoRef[]>([]);
  const setAssistir = (v: VideoRef | null, lista?: VideoRef[]) => { setAssistirV(v); if (lista) setFila(lista); };
  const pos = assistir ? fila.findIndex((x) => x.id === assistir.id) : -1;
  const pular = (d: number) => { const n = fila[pos + d]; if (n) setAssistirV(n); };
  const toque = useRef<number | null>(null);
  useEffect(() => {
    if (!assistir) return;
    const f = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") { e.preventDefault(); pular(1); }
      if (e.key === "ArrowUp") { e.preventDefault(); pular(-1); }
    };
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  });
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
    if (gerando) return;
    if (!automatico || !iaPronta) { setInicio(undefined); setAssistir(null); return setTraduzir(v); }
    // automático: o Gemini transcreve pelo link e o Claude traduz; depois copia
    setGerando(v.id);
    try {
      const r = await fetch("/api/ia/roteiro", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mapa, video: v.id }) });
      const d = await r.json().catch(() => ({ erro: r.status === 504 ? "Demorou demais para gerar. Tente de novo ou cole a transcrição abaixo." : "Não consegui gerar agora. Cole a transcrição abaixo." }));
      if (!r.ok) { setInicio({ erro: d.erro }); setAssistir(null); return setTraduzir(v); }
      setTraduzidos((x) => ({ ...x, [v.id]: { falas: d.roteiro.falas, mapa_citado: d.roteiro.mapa_citado } }));
      if (await copiarTexto(d.roteiro.falas.join("\n\n"))) return marcarCopiado(v.id);
      setInicio({ res: d.roteiro }); setAssistir(null); setTraduzir(v); // o navegador não deixou copiar sozinho: mostra o texto com o botão Copiar
    } catch { setInicio({ erro: "Não consegui gerar agora. Cole a transcrição abaixo." }); setAssistir(null); setTraduzir(v); }
    finally { setGerando(null); }
  }

  const Acoes = ({ v, lista }: { v: VideoRef; lista: VideoRef[] }) => (
    <div className="flex gap-2">
      <button className="btn-line flex-1" onClick={() => setAssistir(v, lista)} style={{ minHeight: 38 }}><Icone nome="play" tamanho={14} />Assistir</button>
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
                <button onClick={() => setAssistir(v, melhores)} className="relative overflow-hidden" style={{ aspectRatio: "9/16", borderRadius: 6, background: "#111" }} aria-label={`Assistir ${v.titulo}`}>
                  <CapaVideo src={v.capa} alt="" />
                  <span className="absolute inset-0" style={{ background: "linear-gradient(180deg,transparent 60%,rgba(0,0,0,.85))" }} />
                  <span className="pill absolute" style={{ left: 8, top: 8, background: i === 0 ? "#E8B014" : "rgba(10,10,10,.75)", color: i === 0 ? "#0A0A0A" : "#fff", fontSize: 11 }}>#{i + 1}</span>
                  <span className="absolute flex flex-col items-start" style={{ left: 8, bottom: 6, color: "#fff", lineHeight: 1.1 }}><span className="num" style={{ fontSize: 20 }}>{n(v.views)}</span>{v.porDia ? <span style={{ fontSize: 11, color: "#FFCC33", fontWeight: 600 }}>+{n(v.porDia)}/dia</span> : null}</span>
                </button>
                <div className="min-w-0"><div style={{ color: "var(--strong)", fontWeight: 600, fontSize: 14, lineHeight: 1.3, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{v.titulo}</div><div style={{ color: "var(--muted)", fontSize: 12, marginTop: 2 }}>{v.canal} · {ha(v.publicado)}</div></div>
                <Acoes v={v} lista={melhores} />
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
              <button onClick={() => setAssistir(v, recentes)} className="relative overflow-hidden" style={{ aspectRatio: "9/16", borderRadius: 6, background: "#111" }} aria-label={`Assistir ${v.titulo}`}>
                <CapaVideo src={v.capa} alt="" />
                <span className="absolute inset-0" style={{ background: "linear-gradient(180deg,transparent 65%,rgba(0,0,0,.85))" }} />
                <span className="num absolute" style={{ left: 8, bottom: 6, fontSize: 17, color: "#fff" }}>{n(v.views)}</span>
              </button>
              <div style={{ color: "var(--strong)", fontSize: 13, fontWeight: 600, lineHeight: 1.3, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{v.titulo}</div>
              <div style={{ color: "var(--muted)", fontSize: 12 }}>{v.canal} · {ha(v.publicado)}</div>
              <Acoes v={v} lista={recentes} />
            </div>
          ))}
        </div>
        {mostrar < recentes.length && <button className="btn-line" onClick={() => setMostrar(mostrar + 10)} style={{ alignSelf: "center" }}>Carregar mais 10</button>}
      </section>

      {assistir && (
        <Janela titulo={assistir.titulo} fechar={() => setAssistir(null)}>
          <div className="flex items-center justify-center gap-3"
            onTouchStart={(e) => (toque.current = e.touches[0].clientY)}
            onTouchEnd={(e) => { if (toque.current === null) return; const d = toque.current - e.changedTouches[0].clientY; toque.current = null; if (Math.abs(d) > 60) pular(d > 0 ? 1 : -1); }}>
            <div style={{ flex: "1 1 auto", maxWidth: 340, aspectRatio: "9/16", borderRadius: 10, overflow: "hidden", background: "#000" }}>
              <iframe key={assistir.id} src={`https://www.youtube-nocookie.com/embed/${assistir.id}?autoplay=1&rel=0`} title={assistir.titulo} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen style={{ width: "100%", height: "100%", border: 0 }} />
            </div>
            {fila.length > 1 && (
              <div className="flex flex-none flex-col items-center gap-3">
                <button onClick={() => pular(-1)} disabled={pos <= 0} aria-label="Vídeo anterior" className="flex items-center justify-center rounded-full" style={{ width: 48, height: 48, background: "var(--chip)", border: "1px solid var(--line2)", color: "var(--fg)", opacity: pos <= 0 ? 0.35 : 1 }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 15l6-6 6 6" /></svg>
                </button>
                <span style={{ color: "var(--muted)", fontSize: 12, fontVariantNumeric: "tabular-nums" }}>{pos + 1}/{fila.length}</span>
                <button onClick={() => pular(1)} disabled={pos >= fila.length - 1} aria-label="Próximo vídeo" className="flex items-center justify-center rounded-full" style={{ width: 48, height: 48, background: "var(--chip)", border: "1px solid var(--line2)", color: "var(--fg)", opacity: pos >= fila.length - 1 ? 0.35 : 1 }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
                </button>
              </div>
            )}
          </div>
          <button className="btn-gold relative overflow-hidden" disabled={gerando === assistir.id} onClick={() => roteiro(assistir)} style={{ minHeight: 48, opacity: 1, ...(copiado === assistir.id ? VERDE : {}) }}>
            <Progresso ativo={gerando === assistir.id} terminou={copiado === assistir.id} />
            <span className="relative flex items-center gap-2">{copiado === assistir.id ? <><Icone nome="check" tamanho={16} />Roteiro copiado! É só colar</> : gerando === assistir.id ? "Gerando o roteiro em português…" : <><Icone nome="script" tamanho={16} />Copiar roteiro em português</>}</span>
          </button>
        </Janela>
      )}
      {traduzir && <Janela titulo={`Roteiro em português · ${traduzir.titulo}`} fechar={() => setTraduzir(null)}><Traduzir v={traduzir} mapa={mapa} iaPronta={iaPronta} inicio={inicio} pronta={(t) => setTraduzidos((x) => ({ ...x, [traduzir.id]: t }))} /></Janela>}
    </>
  );
}
