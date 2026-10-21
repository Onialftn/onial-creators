"use client";
import { useEffect, useRef, useState } from "react";
import { analisar, mono, paraWav, renderizar, type Nivel, type Regiao } from "@/lib/audio";
import { Icone } from "./Icone";

const fmt = (s: number) => `${Math.floor(Math.round(s) / 60)}:${String(Math.round(s) % 60).padStart(2, "0")}`;

export function AudioLimpeza() {
  const [nome, setNome] = useState("");
  const [erro, setErro] = useState("");
  const [orig, setOrig] = useState<AudioBuffer | null>(null);
  const [edit, setEdit] = useState<{ ob: AudioBuffer; ganhoDb: number; regs: Regiao[] } | null>(null);
  const [opc, setOpc] = useState({ sil: true, resp: true, norm: true });
  const [nivel, setNivel] = useState<Nivel>("media");
  const [tocando, setTocando] = useState<"orig" | "edit" | null>(null);
  const ctx = useRef<AudioContext | null>(null);
  const fonte = useRef<AudioBufferSourceNode | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const arquivo = useRef<HTMLInputElement>(null);

  async function carregar(f?: File) {
    if (!f) return;
    setErro(""); setNome(`Lendo ${f.name}...`);
    try {
      ctx.current = ctx.current || new AudioContext();
      const b = await ctx.current.decodeAudioData(await f.arrayBuffer());
      setOrig(b); setNome(`${f.name} · ${fmt(b.duration)}`);
    } catch {
      setOrig(null); setNome(""); setErro("Não consegui ler esse arquivo. Tente MP3, WAV ou M4A.");
    }
  }

  useEffect(() => {
    if (!orig || !ctx.current) return;
    let regs = analisar(orig, nivel);
    if (!opc.sil) regs = regs.filter((r) => r.t !== "sil");
    if (!opc.resp) regs = regs.filter((r) => r.t !== "breath");
    const { ob, ganhoDb } = renderizar(ctx.current, orig, regs, opc.norm);
    setEdit({ ob, ganhoDb, regs });
  }, [orig, nivel, opc]);

  useEffect(() => {
    const cv = canvas.current;
    if (!cv) return;
    const dpr = window.devicePixelRatio || 1, w = cv.clientWidth || 600, h = cv.clientHeight || 150;
    cv.width = w * dpr; cv.height = h * dpr;
    const g = cv.getContext("2d")!;
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
    if (!orig || !edit) return;
    const m = mono(orig), step = Math.max(1, Math.floor(m.length / w)), dur = orig.duration;
    let mx = 1e-9; const env: number[] = [];
    for (let x = 0; x < w; x++) { let p = 0; for (let i = x * step; i < Math.min(m.length, (x + 1) * step); i++) p = Math.max(p, Math.abs(m[i])); env.push(p); mx = Math.max(mx, p); }
    for (const r of edit.regs) { g.fillStyle = r.t === "sil" ? "rgba(229,72,77,.22)" : "rgba(77,163,255,.28)"; g.fillRect((r.s / dur) * w, 0, Math.max(1, ((r.e - r.s) / dur) * w), h); }
    for (let x = 0; x < w; x++) {
      const t = (x / w) * dur, reg = edit.regs.find((r) => t >= r.s && t < r.e), v = (env[x] / mx) * (h / 2) * 0.92;
      g.fillStyle = reg ? (reg.t === "sil" ? "#E5484D" : "#4DA3FF") : "#E8B014"; g.globalAlpha = reg ? 0.7 : 1; g.fillRect(x, h / 2 - v, 1, Math.max(1, v * 2));
    }
    g.globalAlpha = 1;
  }, [orig, edit]);

  function parar() { try { fonte.current?.stop(); } catch {} fonte.current = null; setTocando(null); }
  function tocar(qual: "orig" | "edit") {
    const era = tocando === qual; parar(); if (era || !ctx.current) return;
    const b = qual === "orig" ? orig : edit?.ob; if (!b) return;
    const s = ctx.current.createBufferSource(); s.buffer = b; s.connect(ctx.current.destination); s.start(); s.onended = () => setTocando((t) => (t === qual ? null : t));
    fonte.current = s; setTocando(qual);
  }
  function baixar() {
    if (!edit) return;
    const url = URL.createObjectURL(paraWav(edit.ob)), a = document.createElement("a");
    a.href = url; a.download = `${(nome.split(" · ")[0] || "audio").replace(/\.[^.]+$/, "")}-limpo.wav`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  const cortado = edit ? edit.regs.reduce((a, r) => a + (r.e - r.s), 0) : 0;
  const Opcao = ({ k, t, s }: { k: keyof typeof opc; t: string; s: string }) => (
    <label className="flex cursor-pointer items-center justify-between gap-3" style={{ minHeight: 48 }}>
      <span>{t}<small style={{ display: "block", color: "var(--muted)", fontSize: 12 }}>{s}</small></span>
      <input type="checkbox" checked={opc[k]} onChange={(e) => setOpc({ ...opc, [k]: e.target.checked })} style={{ width: 20, height: 20, accentColor: "#E8B014" }} />
    </label>
  );

  return (
    <section className="flex flex-wrap items-start gap-4">
      <div className="flex min-w-0 flex-col gap-4" style={{ flex: "1 1 320px" }}>
        <div className="card flex flex-col items-center gap-3 text-center" style={{ border: "2px dashed var(--line2)", padding: "28px 20px" }}
          onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); carregar(e.dataTransfer.files[0]); }}>
          <div className="flex items-center justify-center rounded-full" style={{ width: 60, height: 60, background: "var(--tint)", color: "var(--accent-text)" }}><Icone nome="upload" tamanho={28} /></div>
          <div style={{ fontSize: 16, fontWeight: 600, color: "var(--strong)" }}>Arraste o áudio aqui</div>
          <div style={{ color: "var(--muted)", fontSize: 13 }}>MP3, WAV, M4A ou o próprio vídeo MP4</div>
          <button className="btn-gold" onClick={() => arquivo.current?.click()}><Icone nome="upload" tamanho={16} />Escolher arquivo</button>
          <input ref={arquivo} type="file" accept="audio/*,video/*" hidden onChange={(e) => carregar(e.target.files?.[0])} />
          {nome && <div style={{ color: "var(--muted)", fontSize: 13 }}>{nome}</div>}
          {erro && <div role="alert" style={{ color: "var(--warn)", fontSize: 13 }}>{erro}</div>}
        </div>
        <div className="card flex flex-col gap-1">
          <h2 className="h2 m-0">O que cortar</h2>
          <Opcao k="sil" t="Cortar silêncios" s="Pausas longas entre as frases" />
          <Opcao k="resp" t="Remover respirações" s="Puxadas de ar entre as falas" />
          <Opcao k="norm" t="Ajustar volume" s="Deixa a voz no mesmo nível do começo ao fim" />
          <div className="label" style={{ marginTop: 10 }}>Intensidade do corte</div>
          <div className="flex flex-wrap gap-2" style={{ marginTop: 6 }}>
            {(["leve", "media", "forte"] as Nivel[]).map((n) => (
              <button key={n} aria-pressed={nivel === n} onClick={() => setNivel(n)} className="btn" style={nivel === n ? { background: "#E8B014", color: "#0A0A0A", fontWeight: 600 } : { background: "var(--bg)", border: "1px solid var(--line2)", color: "var(--text2)" }}>
                {n === "leve" ? "Leve" : n === "media" ? "Média" : "Forte"}
              </button>
            ))}
          </div>
          <p style={{ margin: "10px 0 0", color: "var(--muted)", fontSize: 12 }}>Cortar frases erradas e reduzir ruído de fundo chegam numa próxima fase, com IA.</p>
        </div>
      </div>

      <div className="card flex min-w-0 flex-col gap-4" style={{ flex: "1.4 1 420px" }}>
        <h2 className="h2 m-0">Resultado</h2>
        <div className="grid gap-2.5" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))" }}>
          {[["Duração original", orig ? fmt(orig.duration) : "—", "var(--strong)"], ["Duração final", edit ? fmt(edit.ob.duration) : "—", "var(--ok)"], ["Tempo cortado", edit ? (cortado < 60 ? `${Math.round(cortado)} s` : fmt(cortado)) : "—", "var(--accent-text)"], ["Cortes", edit ? String(edit.regs.length) : "—", "var(--strong)"]].map(([l, v, c]) => (
            <div key={l} className="tile"><div style={{ fontSize: 12, color: "var(--muted)" }}>{l}</div><div className="num" style={{ fontSize: 26, color: c, marginTop: 2 }}>{v}</div></div>
          ))}
        </div>
        <div className="flex flex-wrap gap-4" style={{ fontSize: 12, color: "var(--muted)" }}>
          <span>Dourado: fala mantida</span><span style={{ color: "#E5484D" }}>Vermelho: silêncio cortado</span><span style={{ color: "#4DA3FF" }}>Azul: respiração cortada</span>
        </div>
        <div style={{ borderRadius: 6, background: "var(--bg)", border: "1px solid var(--line)", overflow: "hidden" }}>
          <canvas ref={canvas} style={{ display: "block", width: "100%", height: 150 }} aria-label="Onda do áudio com os cortes marcados" />
        </div>
        {!orig && <p style={{ margin: 0, color: "var(--muted)", fontSize: 13 }}>Envie um áudio para ver a onda e os cortes.</p>}
        {edit && <p style={{ margin: 0, color: "var(--text2)", fontSize: 13 }}>{edit.regs.filter((r) => r.t === "sil").length} silêncios · {edit.regs.filter((r) => r.t === "breath").length} respirações · {opc.norm ? `volume ${edit.ganhoDb >= 0 ? "+" : ""}${edit.ganhoDb.toFixed(1).replace(".", ",")} dB` : "volume original"}</p>}
        <div className="flex flex-wrap gap-2.5">
          <button className="btn-line" disabled={!orig} onClick={() => tocar("orig")}><Icone nome="play" tamanho={16} />{tocando === "orig" ? "Parar" : "Ouvir original"}</button>
          <button className="btn-gold" disabled={!edit} onClick={() => tocar("edit")}><Icone nome="play" tamanho={16} />{tocando === "edit" ? "Parar" : "Ouvir editado"}</button>
          <button className="btn-line" disabled={!edit} onClick={baixar}><Icone nome="down" tamanho={16} />Baixar áudio limpo</button>
        </div>
      </div>
    </section>
  );
}
