"use client";
import { useState } from "react";
import { MAPAS } from "@/lib/ia/mapas";
import type { SeoIA } from "@/lib/ia/seo";
import type { Pesquisa } from "@/lib/seo-pesquisa";
import { notaTitulo } from "@/lib/seo-nota";
import { TituloCard } from "./Blocos";
import { Icone, LogoPlataforma } from "./Icone";

const VERDE = { background: "#3DDC97", color: "#0A0A0A", borderColor: "#3DDC97" } as const;

/** Botão que copia e fica verde por 2 segundos. */
function Copiar({ texto, rotulo = "Copiar", grande = false }: { texto: string; rotulo?: string; grande?: boolean }) {
  const [ok, setOk] = useState(false);
  async function copiar() {
    try { await navigator.clipboard.writeText(texto); setOk(true); setTimeout(() => setOk(false), 2000); } catch { /* sem permissão */ }
  }
  return (
    <button type="button" onClick={copiar} className={grande ? "btn-gold" : "btn-line"} style={{ minHeight: grande ? 40 : 32, padding: grande ? "0 14px" : "0 10px", fontSize: 13, flex: "none", ...(ok ? VERDE : {}) }}>
      {ok ? <><Icone nome="check" tamanho={14} />Copiado!</> : rotulo}
    </button>
  );
}

function Linha({ texto, extra }: { texto: string; extra?: string }) {
  return (
    <div className="flex items-start gap-3" style={{ padding: "10px 12px", borderRadius: 6, background: "var(--bg)", border: "1px solid var(--line)" }}>
      <span className="flex-1" style={{ color: "var(--strong)", lineHeight: 1.45, whiteSpace: "pre-wrap" }}>{texto}{extra && <span style={{ color: "var(--muted)", fontSize: 12 }}> · {extra}</span>}</span>
      <Copiar texto={texto} />
    </div>
  );
}

function Hashtags({ lista, sem = false }: { lista: string[]; sem?: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {lista.map((h) => <span key={h} className="pill-tint">{h}</span>)}
      <span style={{ marginLeft: "auto" }}><Copiar texto={lista.join(sem ? ", " : " ")} rotulo={sem ? "Copiar tags" : "Copiar hashtags"} /></span>
    </div>
  );
}

const n = (v: number) => (v >= 1e6 ? `${(v / 1e6).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mi` : v >= 1e3 ? `${Math.round(v / 1e3)} mil` : String(v));
const corNota = (x: number) => (x >= 70 ? "var(--ok)" : x >= 45 ? "#E8B014" : "var(--warn)");

/** Anel de nota 0 a 100. */
function Medidor({ nota, rotulo }: { nota: number; rotulo: string }) {
  const C = 2 * Math.PI * 34;
  return (
    <div className="relative flex-none" style={{ width: 88, height: 88 }} role="img" aria-label={`${rotulo}: ${nota} de 100`}>
      <svg width="88" height="88" viewBox="0 0 88 88" aria-hidden="true">
        <circle cx="44" cy="44" r="34" fill="none" stroke="var(--track)" strokeWidth="9" />
        <circle cx="44" cy="44" r="34" fill="none" stroke={corNota(nota)} strokeWidth="9" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - nota / 100)} transform="rotate(-90 44 44)" style={{ transition: "stroke-dashoffset .4s" }} />
      </svg>
      <span className="num absolute inset-0 flex items-center justify-center" style={{ fontSize: 26, color: "var(--strong)" }}>{nota}</span>
    </div>
  );
}

function Faixa({ rotulo, valor, bom }: { rotulo: string; valor: string; bom: boolean }) {
  return <div className="tile"><div style={{ fontSize: 12, color: "var(--muted)" }}>{rotulo}</div><div className="num" style={{ fontSize: 20, color: bom ? "var(--ok)" : "var(--warn)", marginTop: 2, textTransform: "capitalize" }}>{valor}</div></div>;
}

export function Seo({ pronta, usados: usadosIni, limite }: { pronta: boolean; usados: number; limite: number | null }) {
  const [mapa, setMapa] = useState<string>(MAPAS[0].id);
  const [tema, setTema] = useState<string>(MAPAS[0].temas[0]);
  const [assunto, setAssunto] = useState("");
  const [res, setRes] = useState<SeoIA | null>(null);
  const [usados, setUsados] = useState(usadosIni);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [termo, setTermo] = useState("");
  const [pesq, setPesq] = useState<Pesquisa | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [erroBusca, setErroBusca] = useState("");
  const [titulo, setTitulo] = useState("");
  const temas = MAPAS.find((m) => m.id === mapa)!.temas;
  const acabou = limite !== null && usados >= limite;

  async function pesquisar() {
    if (termo.trim().length < 3) return;
    setErroBusca(""); setBuscando(true);
    try {
      const r = await fetch(`/api/seo/pesquisar?q=${encodeURIComponent(termo.trim())}`);
      const d = await r.json().catch(() => ({ erro: "Não consegui pesquisar agora." }));
      if (!r.ok) throw new Error(d.erro);
      setPesq(d);
    } catch (e) { setErroBusca(e instanceof Error ? e.message : "Não consegui pesquisar agora."); } finally { setBuscando(false); }
  }
  const emAlta = pesq ? [...pesq.tags.map((t) => t.item), ...pesq.palavras.map((p) => p.item)] : [];
  const notaT = notaTitulo(titulo, pesq?.termo ?? termo, pesq?.palavras.map((p) => p.item) ?? []);

  async function gerar() {
    setErro(""); setCarregando(true);
    try {
      const r = await fetch("/api/ia/seo", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mapa, tema, assunto, palavraChave: pesq?.termo, emAlta }) });
      const d = await r.json().catch(() => ({ erro: "A IA não respondeu. Tente de novo." }));
      if (!r.ok) throw new Error(d.erro);
      setRes(d.seo); setUsados(d.usados);
    } catch (e) { setErro(e instanceof Error ? e.message : "A IA não respondeu."); } finally { setCarregando(false); }
  }

  return (
    <>
      {/* 1. pesquisa de palavra-chave */}
      <section className="card flex flex-col gap-4">
        <TituloCard icone="eye" direita="Shorts do YouTube no Brasil, últimos 30 dias">1. Pesquisa de palavra-chave</TituloCard>
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); pesquisar(); }}>
          <input className="input" value={termo} onChange={(e) => setTermo(e.target.value)} placeholder="Ex.: farm de xp fortnite" aria-label="Palavra-chave" />
          <button className="btn-gold" type="submit" disabled={buscando || termo.trim().length < 3} style={{ flex: "none" }}>{buscando ? "Pesquisando…" : "Pesquisar"}</button>
        </form>
        {erroBusca && <p role="alert" style={{ margin: 0, color: "var(--warn)", fontSize: 14 }}>{erroBusca}</p>}
        {pesq && (
          <>
            <div className="flex flex-wrap items-center gap-4">
              <Medidor nota={pesq.nota} rotulo="Nota da palavra-chave" />
              <div className="grid min-w-0 flex-1 gap-2" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))" }}>
                <Faixa rotulo="Procura" valor={pesq.procura} bom={pesq.procura !== "baixa"} />
                <Faixa rotulo="Concorrência" valor={pesq.concorrencia} bom={pesq.concorrencia !== "alta"} />
                <div className="tile"><div style={{ fontSize: 12, color: "var(--muted)" }}>Views por dia (típico)</div><div className="num" style={{ fontSize: 20, color: "var(--strong)", marginTop: 2 }}>{n(pesq.medianaPorDia)}</div></div>
                <div className="tile"><div style={{ fontSize: 12, color: "var(--muted)" }}>Vídeos sobre isso</div><div className="num" style={{ fontSize: 20, color: "var(--strong)", marginTop: 2 }}>{pesq.totalResultados >= 1_000_000 ? "1 mi+" : n(pesq.totalResultados)}</div></div>
              </div>
            </div>
            <p style={{ margin: 0, color: "var(--muted)", fontSize: 12 }}>Nota alta = muita gente assistindo e pouca concorrência. A procura vem das views dos Shorts que aparecem na busca (o YouTube não libera o volume de busca exato).</p>
            {pesq.tags.length > 0 && (<><div className="label">Tags que os vídeos que mais bombam usam</div><Hashtags lista={pesq.tags.map((t) => t.item)} sem /></>)}
            {pesq.palavras.length > 0 && (<><div className="label">Palavras que mais aparecem nos títulos</div><div className="flex flex-wrap gap-2">{pesq.palavras.map((p) => <span key={p.item} className="pill-tint">{p.item} <span style={{ opacity: 0.6 }}>×{p.qtd}</span></span>)}</div></>)}
            <div className="label">Shorts que mais crescem com essa busca</div>
            <div className="overflow-x-auto">
              <table className="table" style={{ minWidth: 560 }}>
                <thead><tr><th scope="col">#</th><th scope="col">VÍDEO</th><th scope="col">VIEWS</th><th scope="col">POR DIA</th></tr></thead>
                <tbody>
                  {pesq.videos.map((v, i) => (
                    <tr key={v.id}>
                      <td className="num" style={{ color: i < 3 ? "var(--accent-text)" : "var(--muted)" }}>{i + 1}</td>
                      <td><a href={`https://www.youtube.com/shorts/${v.id}`} target="_blank" rel="noreferrer" style={{ color: "var(--strong)", fontWeight: 600 }}>{v.titulo}</a><div style={{ color: "var(--muted)", fontSize: 12 }}>{v.canal}</div></td>
                      <td className="num">{n(v.views)}</td>
                      <td className="num" style={{ color: "var(--accent-text)" }}>+{n(v.porDia)}</td>
                    </tr>
                  ))}
                  {pesq.videos.length === 0 && <tr><td colSpan={4} style={{ color: "var(--muted)" }}>Nenhum Short recente com essa busca.</td></tr>}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      {/* 2. nota do título */}
      <section className="card flex flex-col gap-4">
        <TituloCard icone="target">2. Nota do título</TituloCard>
        <input className="input" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Digite o título do seu vídeo" aria-label="Título do vídeo" />
        {titulo.trim() && (
          <div className="flex flex-wrap items-start gap-4">
            <Medidor nota={notaT.nota} rotulo="Nota do título" />
            <div className="flex min-w-0 flex-1 flex-col gap-1.5" style={{ flexBasis: 260 }}>
              {notaT.itens.map((i) => (
                <div key={i.texto} className="flex items-start gap-2" style={{ fontSize: 14, color: i.ok ? "var(--text2)" : "var(--fg)" }}>
                  <span style={{ color: i.ok ? "var(--ok)" : "var(--warn)", display: "flex", paddingTop: 2 }}><Icone nome={i.ok ? "check" : "x"} tamanho={14} /></span>{i.texto}
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {!pronta && <div role="status" className="pill-warn" style={{ padding: "10px 14px", fontSize: 14 }}>A IA ainda está sendo configurada pelo gestor.</div>}
      <section className="card flex flex-col gap-4">
        <TituloCard icone="script" direita={limite !== null ? `${usados} de ${limite} no mês` : undefined}>3. Gerar títulos, descrições e hashtags</TituloCard>
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))" }}>
          <label className="flex flex-col gap-1.5"><span className="label">Mapa</span>
            <select className="input" value={mapa} onChange={(e) => { const m = MAPAS.find((x) => x.id === e.target.value)!; setMapa(m.id); setTema(m.temas[0]); }}>
              {MAPAS.map((m) => <option key={m.id} value={m.id}>{m.emoji} {m.nome}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1.5"><span className="label">Tema</span>
            <select className="input" value={tema} onChange={(e) => setTema(e.target.value)}>{temas.map((t) => <option key={t}>{t}</option>)}</select>
          </label>
        </div>
        <label className="flex flex-col gap-1.5"><span className="label">Do que é o vídeo</span>
          <textarea className="input" rows={4} value={assunto} onChange={(e) => setAssunto(e.target.value)} placeholder="Ex.: mostro a minigun de XP e farmo 15 mil de XP em 2 minutos. Ou cole aqui o roteiro em português." style={{ padding: 12, minHeight: 110, resize: "vertical", lineHeight: 1.5 }} />
        </label>
        {pesq && <p style={{ margin: 0, color: "var(--muted)", fontSize: 13 }}>A IA vai usar a palavra-chave &quot;{pesq.termo}&quot; e as tags em alta da pesquisa.</p>}
        {erro && <p role="alert" style={{ margin: 0, color: "var(--warn)", fontSize: 14 }}>{erro}</p>}
        <button className="btn-gold" onClick={gerar} disabled={!pronta || carregando || acabou || assunto.trim().length < 15} style={{ minHeight: 48 }}>
          {carregando ? "Gerando títulos e hashtags… (uns 10 segundos)" : acabou ? "Limite do mês atingido" : res ? "Gerar de novo" : "Gerar títulos, descrições e hashtags"}
        </button>
      </section>

      {res && (
        <section className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", alignItems: "start" }}>
          <div className="card flex flex-col gap-3">
            <div className="flex items-center gap-2.5"><LogoPlataforma p="youtube" tamanho={28} /><h2 className="h2 m-0" style={{ fontSize: 18 }}>YouTube Shorts</h2></div>
            <div className="label">Títulos (escolha um)</div>
            {res.youtube.titulos.map((t) => <Linha key={t} texto={t} extra={`${t.length} letras`} />)}
            <div className="label" style={{ marginTop: 6 }}>Descrição</div>
            <Linha texto={`${res.youtube.descricao}\n\n${res.youtube.hashtags.join(" ")}`} />
            <div className="label" style={{ marginTop: 6 }}>Hashtags (aparecem em cima do título)</div>
            <Hashtags lista={res.youtube.hashtags} />
            <div className="label" style={{ marginTop: 6 }}>Tags (YouTube Studio → Mais opções → Tags)</div>
            <Linha texto={res.youtube.tags.join(", ")} />
          </div>
          {(["tiktok", "instagram"] as const).map((rede) => (
            <div key={rede} className="card flex flex-col gap-3">
              <div className="flex items-center gap-2.5"><LogoPlataforma p={rede} tamanho={28} /><h2 className="h2 m-0" style={{ fontSize: 18 }}>{rede === "tiktok" ? "TikTok" : "Instagram Reels"}</h2></div>
              <div className="label">Legendas (escolha uma)</div>
              {res[rede].legendas.map((l) => <Linha key={l} texto={`${l}\n\n${res[rede].hashtags.join(" ")}`} />)}
              <div className="label" style={{ marginTop: 6 }}>Hashtags</div>
              <Hashtags lista={res[rede].hashtags} />
            </div>
          ))}
        </section>
      )}
    </>
  );
}
