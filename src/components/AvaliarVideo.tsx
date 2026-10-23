"use client";
import { useEffect, useRef, useState } from "react";
import { CRITERIOS, TAMANHO_MAX, TAMANHO_PARTE, TIPOS_VIDEO, segundos, type Avaliacao } from "@/lib/avaliar-regras";
import { supabaseNavegador } from "@/lib/supabase/client";
import { Icone } from "./Icone";
import { Medidor } from "./Seo";

export interface Historico { id: string; arquivo: string; nota: number; resultado: Avaliacao; criado_em: string }

const corNota = (x: number) => (x >= 70 ? "var(--ok)" : x >= 45 ? "#E8B014" : "var(--warn)");
const caixa = { padding: "12px 14px", borderRadius: 8, background: "var(--bg)", border: "1px solid var(--line)" } as const;
const data = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
const mb = (b: number) => `${(b / 1024 / 1024).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} MB`;

type Etapa = "" | "enviando" | "assistindo";

/** Resultado: nota geral, critérios, pontos fortes e dicas (o tempo pula o vídeo até o ponto). */
function Resultado({ a, pular }: { a: Avaliacao; pular?: (s: number) => void }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-4">
        <Medidor nota={a.nota} tamanho={104} />
        <div className="flex-1" style={{ minWidth: 220 }}>
          <div className="label">NOTA DO VÍDEO</div>
          <p style={{ margin: "4px 0 0", color: "var(--strong)", fontSize: 16, lineHeight: 1.45 }}>{a.resumo}</p>
        </div>
      </div>
      <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))" }}>
        {CRITERIOS.map((c) => {
          const x = a.criterios[c.id];
          return (
            <div key={c.id} style={caixa}>
              <div className="flex items-baseline justify-between gap-2">
                <b style={{ color: "var(--strong)" }}>{c.nome}</b>
                <span className="num" style={{ fontSize: 20, color: corNota(x.nota * 10) }}>{x.nota}<span style={{ fontSize: 13, color: "var(--muted)" }}>/10</span></span>
              </div>
              <div className="bar" style={{ height: 5, margin: "6px 0 8px" }}><span style={{ width: `${x.nota * 10}%`, background: corNota(x.nota * 10) }} /></div>
              <div style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.45 }}>{x.comentario}</div>
            </div>
          );
        })}
      </div>
      {a.melhorias.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="label">O QUE MELHORAR (DO QUE MAIS DÁ VIEWS PARA O QUE MENOS)</span>
          {a.melhorias.map((m, i) => (
            <div key={i} className="flex items-start gap-3" style={caixa}>
              <span className="num flex-none" style={{ color: "var(--accent-text)", fontSize: 16, width: 18 }}>{i + 1}</span>
              <span className="flex-1" style={{ lineHeight: 1.45, color: "var(--fg)" }}>{m.dica}</span>
              {m.tempo && (pular ? <button type="button" className="pill-tint flex-none" onClick={() => pular(segundos(m.tempo))} title="Ver esse momento">▶ {m.tempo}</button> : <span className="pill-tint flex-none">{m.tempo}</span>)}
            </div>
          ))}
        </div>
      )}
      {a.pontos_fortes.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="label">O QUE ESTÁ BOM</span>
          {a.pontos_fortes.map((p) => <span key={p} className="flex gap-2" style={{ fontSize: 14 }}><span style={{ color: "var(--ok)" }}>✓</span>{p}</span>)}
        </div>
      )}
    </div>
  );
}

export function AvaliarVideo({ pronta, usados: usadosIni, limite, historico: histIni }: { pronta: boolean; usados: number; limite: number | null; historico: Historico[] }) {
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [previa, setPrevia] = useState("");
  const [etapa, setEtapa] = useState<Etapa>("");
  const [progresso, setProgresso] = useState(0);
  const [erro, setErro] = useState("");
  const [resultado, setResultado] = useState<Avaliacao | null>(null);
  const [usados, setUsados] = useState(usadosIni);
  const [historico, setHistorico] = useState(histIni);
  const [abertoId, setAbertoId] = useState("");
  const [arrastando, setArrastando] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  const acabou = limite !== null && usados >= limite;

  useEffect(() => () => { if (previa) URL.revokeObjectURL(previa); }, [previa]);
  // enquanto a IA assiste, a barra anda devagar sozinha (estimativa) até 95%
  useEffect(() => {
    if (etapa !== "assistindo") return;
    const t = setInterval(() => setProgresso((p) => Math.min(95, p + (95 - p) * 0.035)), 1000);
    return () => clearInterval(t);
  }, [etapa]);

  function escolher(f: File | undefined) {
    setErro(""); setResultado(null);
    if (!f) return;
    if (!TIPOS_VIDEO.includes(f.type)) return setErro("Esse arquivo não é um vídeo MP4, MOV ou WEBM.");
    if (f.size > TAMANHO_MAX) return setErro(`O vídeo tem ${mb(f.size)}. O máximo é 400 MB: exporte em 1080p.`);
    setArquivo(f);
    setPrevia(URL.createObjectURL(f));
  }

  async function avaliar() {
    if (!arquivo) return;
    setErro(""); setResultado(null); setEtapa("enviando"); setProgresso(0);
    try {
      const ini = await fetch("/api/avaliar/iniciar", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ tamanho: arquivo.size, tipo: arquivo.type }) });
      const j = await ini.json().catch(() => ({ erro: "Não consegui preparar o envio." }));
      if (!ini.ok) throw new Error(j.erro);
      const st = supabaseNavegador().storage.from("avaliacoes");
      const partes = j.partes as { caminho: string; token: string }[];
      for (let i = 0; i < partes.length; i++) {
        const pedaco = arquivo.slice(i * TAMANHO_PARTE, Math.min(arquivo.size, (i + 1) * TAMANHO_PARTE), "application/octet-stream");
        const { error } = await st.uploadToSignedUrl(partes[i].caminho, partes[i].token, pedaco, { contentType: "application/octet-stream" });
        if (error) throw new Error("O envio do vídeo falhou. Confira a internet e tente de novo.");
        setProgresso(Math.round(((i + 1) / partes.length) * 100));
      }
      setEtapa("assistindo"); setProgresso(3);
      const r = await fetch("/api/avaliar/analisar", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: j.id, tamanho: arquivo.size, tipo: arquivo.type, nome: arquivo.name }) });
      const d = await r.json().catch(() => ({ erro: "A IA demorou demais. Tente de novo." }));
      if (!r.ok) throw new Error(d.erro);
      setProgresso(100);
      setResultado(d.avaliacao);
      setUsados(d.usados);
      setHistorico((h) => [{ id: d.id ?? String(Date.now()), arquivo: arquivo.name, nota: d.avaliacao.nota, resultado: d.avaliacao, criado_em: d.criado_em ?? new Date().toISOString() }, ...h]);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Algo deu errado. Tente de novo.");
    } finally { setEtapa(""); }
  }

  function pular(s: number) {
    if (!video.current) return;
    video.current.currentTime = s;
    void video.current.play().catch(() => {});
    video.current.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  return (
    <>
      {!pronta && <div className="card" style={{ color: "var(--warn)" }}>A avaliação de vídeo ainda não está configurada. Fale com o gestor.</div>}

      <section className="card flex flex-col gap-4">
        <div className="flex flex-wrap items-start gap-4">
          <label
            onDragOver={(e) => { e.preventDefault(); setArrastando(true); }} onDragLeave={() => setArrastando(false)}
            onDrop={(e) => { e.preventDefault(); setArrastando(false); if (!etapa) escolher(e.dataTransfer.files[0]); }}
            className="flex flex-1 cursor-pointer flex-col items-center justify-center gap-2 text-center"
            style={{ minWidth: 240, minHeight: previa ? 120 : 200, padding: 20, borderRadius: 10, border: `2px dashed ${arrastando ? "#E8B014" : "var(--line)"}`, background: arrastando ? "var(--tint)" : "var(--bg)" }}>
            <input type="file" accept="video/mp4,video/quicktime,video/webm,video/x-m4v" className="sr-only" disabled={!!etapa} onChange={(e) => escolher(e.target.files?.[0])} />
            <span style={{ color: "var(--accent-text)" }}><Icone nome="video" tamanho={28} /></span>
            <b style={{ color: "var(--strong)" }}>{arquivo ? arquivo.name : "Escolha ou arraste o vídeo aqui"}</b>
            <span style={{ color: "var(--muted)", fontSize: 13 }}>{arquivo ? `${mb(arquivo.size)} · toque para trocar` : "MP4 ou MOV, até 400 MB. O vídeo é apagado logo depois da avaliação."}</span>
          </label>
          {previa && <video ref={video} src={previa} controls playsInline style={{ width: 200, maxHeight: 356, borderRadius: 10, background: "#000", flex: "none" }} />}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button className="btn-gold" type="button" disabled={!pronta || !arquivo || !!etapa || acabou} onClick={avaliar}>
            <Icone nome="zap" tamanho={16} />{etapa === "enviando" ? "Enviando o vídeo..." : etapa === "assistindo" ? "A IA está assistindo..." : resultado ? "Avaliar de novo" : "Avaliar vídeo"}
          </button>
          {limite !== null && <span style={{ color: "var(--muted)", fontSize: 13 }}>{usados} de {limite} avaliações no mês</span>}
        </div>
        {etapa && (
          <div className="flex flex-col gap-1.5">
            <div className="bar" style={{ height: 8 }}><span style={{ width: `${progresso}%`, background: "#E8B014", transition: "width .8s" }} /></div>
            <span style={{ color: "var(--muted)", fontSize: 13 }}>{etapa === "enviando" ? `Enviando: ${progresso}%` : "A IA está assistindo ao vídeo inteiro (imagem e som). Leva de 1 a 3 minutos: não feche esta tela."}</span>
          </div>
        )}
        {acabou && <p style={{ margin: 0, color: "var(--warn)", fontSize: 13 }}>Você já usou as {limite} avaliações deste mês.</p>}
        {erro && <p role="alert" style={{ margin: 0, color: "var(--warn)" }}>{erro}</p>}
      </section>

      {resultado && <section className="card"><Resultado a={resultado} pular={previa ? pular : undefined} /></section>}

      {historico.length > 0 && (
        <section className="card flex flex-col gap-2">
          <h2 className="num" style={{ margin: 0, fontSize: 19, color: "var(--strong)" }}>Avaliações anteriores</h2>
          {historico.map((h) => (
            <div key={h.id} className="flex flex-col gap-3" style={caixa}>
              <button type="button" className="flex items-center gap-3 text-left" onClick={() => setAbertoId(abertoId === h.id ? "" : h.id)} aria-expanded={abertoId === h.id}>
                <span className="num flex-none" style={{ fontSize: 22, color: corNota(h.nota), width: 40 }}>{h.nota}</span>
                <span className="min-w-0 flex-1"><span className="block truncate" style={{ color: "var(--strong)" }}>{h.arquivo || "Vídeo"}</span><span style={{ color: "var(--muted)", fontSize: 12 }}>{data(h.criado_em)}</span></span>
                <span style={{ color: "var(--muted)" }}>{abertoId === h.id ? "▲" : "▼"}</span>
              </button>
              {abertoId === h.id && <Resultado a={h.resultado} />}
            </div>
          ))}
        </section>
      )}
    </>
  );
}
