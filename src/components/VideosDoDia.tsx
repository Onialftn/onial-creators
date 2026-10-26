"use client";
import { useState } from "react";
import { linkReferencia } from "@/lib/gravar";
import { Icone } from "./Icone";

export interface OpcaoVideo { dia: string; ordem: number; link: string; recado: string }

function Copiar({ texto }: { texto: string }) {
  const [ok, setOk] = useState(false);
  async function copiar() {
    try { await navigator.clipboard.writeText(texto); setOk(true); setTimeout(() => setOk(false), 2000); } catch { /* sem permissão */ }
  }
  return (
    <button type="button" onClick={copiar} className="flex items-center gap-1" style={{ minHeight: 30, padding: "0 10px", borderRadius: 15, fontSize: 12, fontWeight: 600, border: `1px solid ${ok ? "#3DDC97" : "var(--line2)"}`, background: ok ? "#3DDC97" : "transparent", color: ok ? "#0A0A0A" : "var(--fg)" }}>
      {ok ? <><Icone nome="check" tamanho={12} />Copiado</> : "Copiar link"}
    </button>
  );
}

/** As 3 opções de vídeo de um dia (capa, recado do gestor, abrir e copiar link). */
export function OpcoesDoDia({ opcoes }: { opcoes: OpcaoVideo[] }) {
  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))" }}>
      {opcoes.map((o) => {
        const ref = linkReferencia(o.link);
        if (!ref) return null;
        return (
          <div key={o.ordem} className="flex min-w-0 flex-col gap-2" style={{ padding: 10, borderRadius: 8, background: "var(--bg)", border: "1px solid var(--line)" }}>
            <a href={ref.url} target="_blank" rel="noreferrer" className="relative overflow-hidden" style={{ aspectRatio: "9/16", borderRadius: 6, background: "#111", display: "block" }} aria-label={`Abrir a opção ${o.ordem}`}>
              {ref.youtube ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`https://i.ytimg.com/vi/${ref.youtube}/oardefault.jpg`} onError={(e) => { (e.target as HTMLImageElement).src = `https://i.ytimg.com/vi/${ref.youtube}/hqdefault.jpg`; }} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <span className="absolute inset-0 flex items-center justify-center" style={{ color: "var(--accent-text)" }}><Icone nome="video" tamanho={32} /></span>
              )}
              <span className="pill absolute" style={{ left: 8, top: 8, background: "#E8B014", color: "#0A0A0A", fontSize: 11 }}>Opção {o.ordem}</span>
              <span className="absolute flex items-center justify-center" style={{ left: "50%", top: "50%", transform: "translate(-50%,-50%)", width: 44, height: 44, borderRadius: 22, background: "rgba(0,0,0,.55)", color: "#fff", fontSize: 18 }}>▶</span>
            </a>
            {o.recado && <span style={{ fontSize: 13, color: "var(--fg)", lineHeight: 1.4 }}>{o.recado}</span>}
            <span className="truncate" style={{ fontSize: 11, color: "var(--muted)" }}>{new URL(ref.url).hostname.replace(/^www\./, "")}</span>
            <Copiar texto={ref.url} />
          </div>
        );
      })}
    </div>
  );
}
