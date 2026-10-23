"use client";
import { useState } from "react";
import { MAPAS } from "@/lib/ia/mapas";
import type { SeoIA } from "@/lib/ia/seo";
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

function Hashtags({ lista }: { lista: string[] }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {lista.map((h) => <span key={h} className="pill-tint">{h}</span>)}
      <span style={{ marginLeft: "auto" }}><Copiar texto={lista.join(" ")} rotulo="Copiar hashtags" /></span>
    </div>
  );
}

export function Seo({ pronta, usados: usadosIni, limite }: { pronta: boolean; usados: number; limite: number | null }) {
  const [mapa, setMapa] = useState<string>(MAPAS[0].id);
  const [tema, setTema] = useState<string>(MAPAS[0].temas[0]);
  const [assunto, setAssunto] = useState("");
  const [res, setRes] = useState<SeoIA | null>(null);
  const [usados, setUsados] = useState(usadosIni);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const temas = MAPAS.find((m) => m.id === mapa)!.temas;
  const acabou = limite !== null && usados >= limite;

  async function gerar() {
    setErro(""); setCarregando(true);
    try {
      const r = await fetch("/api/ia/seo", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mapa, tema, assunto }) });
      const d = await r.json().catch(() => ({ erro: "A IA não respondeu. Tente de novo." }));
      if (!r.ok) throw new Error(d.erro);
      setRes(d.seo); setUsados(d.usados);
    } catch (e) { setErro(e instanceof Error ? e.message : "A IA não respondeu."); } finally { setCarregando(false); }
  }

  return (
    <>
      {!pronta && <div role="status" className="pill-warn" style={{ padding: "10px 14px", fontSize: 14 }}>A IA ainda está sendo configurada pelo gestor.</div>}
      <section className="card flex flex-col gap-4">
        <TituloCard icone="script" direita={limite !== null ? `${usados} de ${limite} no mês` : undefined}>Seu vídeo</TituloCard>
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
