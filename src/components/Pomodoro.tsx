"use client";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Icone } from "./Icone";

/* ---------- estado do timer: fica fora do React para continuar rodando ao trocar de aba ---------- */
type Modo = "foco" | "pausa";
/** modo = o que está na tela; ativo = o que está contando (pode ser o outro). Cada modo guarda o seu tempo. */
interface Estado { modo: Modo; restante: Record<Modo, number>; ativo: Modo | null; duracao: Record<Modo, number> }
const ESCALA = 3600; // anel inteiro = 60 min
let estado: Estado = { modo: "foco", restante: { foco: 3600, pausa: 1200 }, ativo: null, duracao: { foco: 3600, pausa: 1200 } };
const ouvintes = new Set<() => void>();
let relogio: ReturnType<typeof setInterval> | null = null;
const emitir = () => ouvintes.forEach((f) => f());
const set = (p: Partial<Estado>) => { estado = { ...estado, ...p }; emitir(); };
const outro = (m: Modo): Modo => (m === "foco" ? "pausa" : "foco");

interface Config { auto: boolean; som: boolean }
function lerConfig(): Config { try { return { auto: false, som: true, ...JSON.parse(localStorage.getItem("onialPomoSet") || "{}") }; } catch { return { auto: false, som: true }; } }
function salvarConfig(c: Config) { try { localStorage.setItem("onialPomoSet", JSON.stringify(c)); } catch {} }

const hojeK = () => new Date().toLocaleDateString("en-CA");
function somarFoco() {
  try {
    const d = JSON.parse(localStorage.getItem("onialFocus") || "{}");
    d[hojeK()] = (d[hojeK()] || 0) + 1;
    localStorage.setItem("onialFocus", JSON.stringify(d));
  } catch {}
}
let audio: AudioContext | null = null;
function tocar() {
  try {
    audio = audio || new AudioContext();
    const t = audio.currentTime;
    [880, 1175, 1568].forEach((f, i) => {
      const o = audio!.createOscillator(), g = audio!.createGain();
      o.frequency.value = f; g.gain.setValueAtTime(0, t + i * 0.18); g.gain.linearRampToValueAtTime(0.25, t + i * 0.18 + 0.02); g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.18 + 0.6);
      o.connect(g).connect(audio!.destination); o.start(t + i * 0.18); o.stop(t + i * 0.18 + 0.65);
    });
  } catch {}
}
function tick() {
  const m = estado.ativo;
  if (!m) return;
  if (m === "foco") somarFoco();
  if (estado.restante[m] <= 1) {
    // terminou: zera este, mostra o próximo
    pararRelogio();
    const cfg = lerConfig();
    if (cfg.som) tocar();
    const prox = outro(m);
    set({ ativo: null, modo: prox, restante: { ...estado.restante, [m]: estado.duracao[m], [prox]: estado.duracao[prox] } });
    if (cfg.auto) iniciar();
    return;
  }
  set({ restante: { ...estado.restante, [m]: estado.restante[m] - 1 } });
}
function pararRelogio() { if (relogio) clearInterval(relogio); relogio = null; }
/** Play no modo da tela. Se o outro estava contando (ou pausado no meio), ele volta ao início. */
function iniciar() {
  const m = estado.modo, o = outro(m);
  const restante = estado.restante[o] !== estado.duracao[o] || estado.ativo === o ? { ...estado.restante, [o]: estado.duracao[o] } : estado.restante;
  set({ ativo: m, restante });
  if (!relogio) relogio = setInterval(tick, 1000);
}
/** Pausa o modo que está contando (o tempo dele fica guardado). */
function parar() { pararRelogio(); set({ ativo: null }); }
/** Só para se o modo da tela for o que está contando. */
function pararSeNaTela() { if (estado.ativo === estado.modo) parar(); }
/** Botões Foco/Pausa: só trocam a tela, não mexem no tempo. */
function verModo(m: Modo) { set({ modo: m }); }
function reiniciarTela() { pararSeNaTela(); set({ restante: { ...estado.restante, [estado.modo]: estado.duracao[estado.modo] } }); }
function pular() { reiniciarTela(); set({ modo: outro(estado.modo) }); }
function ajustarMinutos(min: number) {
  const m = Math.max(1, Math.min(60, Math.round(min)));
  set({ duracao: { ...estado.duracao, [estado.modo]: m * 60 }, restante: { ...estado.restante, [estado.modo]: m * 60 } });
}
const useEstadoTimer = () => useSyncExternalStore((f) => { ouvintes.add(f); return () => ouvintes.delete(f); }, () => estado, () => estado);

/* ---------- componente ---------- */
const AZUL = "#4DA3FF", OURO = "#E8B014";
const IB = { width: 44, height: 44, borderRadius: 10, background: "var(--chip)", border: "1px solid var(--line)", color: "var(--muted)", display: "flex", alignItems: "center", justifyContent: "center" } as const;

/* ---------- janela flutuante (fica por cima das outras janelas do computador) ---------- */
const fmtT = (t: number) => `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
type DocPiP = { requestWindow: (o: { width: number; height: number }) => Promise<Window> };
const docPiP = () => (typeof window !== "undefined" ? (window as unknown as { documentPictureInPicture?: DocPiP }).documentPictureInPicture : undefined);

/** O pomodoro pequeno que aparece dentro da janela flutuante (mesmo timer da página). */
function MiniPomodoro() {
  const e = useEstadoTimer();
  const cor = e.modo === "foco" ? OURO : AZUL;
  const rodando = e.ativo === e.modo;
  const r = 70, C = 2 * Math.PI * r, frac = Math.min(1, e.restante[e.modo] / ESCALA);
  const botao = { width: 40, height: 40, borderRadius: 10, border: "1px solid #3a3420", background: "#1a1a1a", color: "#E8E2D0", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" } as const;
  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, background: "#0E0E0E", color: "#F5F1E6", fontFamily: "Inter, system-ui, sans-serif", userSelect: "none" }}>
      <div style={{ display: "flex", padding: 3, borderRadius: 10, background: "#1a1a1a", border: "1px solid #2a2a2a" }}>
        {(["foco", "pausa"] as Modo[]).map((m) => (
          <button key={m} onClick={() => verModo(m)} style={{ border: 0, cursor: "pointer", minHeight: 30, padding: "0 16px", borderRadius: 8, fontSize: 13, background: e.modo === m ? (m === "foco" ? OURO : AZUL) : "transparent", color: e.modo === m ? "#0A0A0A" : "#9a9384", fontWeight: e.modo === m ? 700 : 400 }}>{m === "foco" ? "Foco" : "Pausa"}</button>
        ))}
      </div>
      <div style={{ position: "relative", width: 160, height: 160 }}>
        <svg width="160" height="160" viewBox="0 0 160 160" aria-hidden="true">
          <circle cx="80" cy="80" r={r} fill="none" stroke="#2a2618" strokeWidth="8" />
          <circle cx="80" cy="80" r={r} fill="none" stroke={cor} strokeWidth="8" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - frac)} transform="rotate(-90 80 80)" />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <div style={{ fontSize: 40, fontWeight: 300, fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>{fmtT(e.restante[e.modo])}</div>
          <div style={{ marginTop: 6, fontSize: 10, letterSpacing: 2, color: "#9a9384" }}>{e.modo === "foco" ? "FOCO" : "PAUSA"}</div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button style={botao} aria-label="Reiniciar" onClick={reiniciarTela}>↺</button>
        <button aria-label={rodando ? "Pausar" : "Iniciar"} onClick={() => (rodando ? parar() : iniciar())} style={{ width: 52, height: 52, borderRadius: 26, border: 0, cursor: "pointer", background: cor, color: "#0A0A0A", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {rodando ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M9 5v14M15 5v14" /></svg> : <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5l12 7-12 7z" /></svg>}
        </button>
        <button style={botao} aria-label="Pular" onClick={pular}>⏭</button>
      </div>
    </div>
  );
}

/** Plano B (navegadores sem janela flutuante de página): desenha o tempo num vídeo e usa o "picture-in-picture" de vídeo. */
async function abrirPiPVideo(): Promise<() => void> {
  const canvas = document.createElement("canvas");
  canvas.width = 320; canvas.height = 180;
  const ctx = canvas.getContext("2d")!;
  const desenhar = () => {
    const e = estado;
    ctx.fillStyle = "#0E0E0E"; ctx.fillRect(0, 0, 320, 180);
    ctx.fillStyle = e.modo === "foco" ? OURO : AZUL; ctx.font = "600 18px Inter, sans-serif"; ctx.textAlign = "center";
    ctx.fillText(`${e.modo === "foco" ? "FOCO" : "PAUSA"}${e.ativo === e.modo ? "" : " · pausado"}`, 160, 44);
    ctx.fillStyle = "#F5F1E6"; ctx.font = "300 72px Inter, sans-serif"; ctx.fillText(fmtT(e.restante[e.modo]), 160, 125);
    const frac = Math.min(1, e.restante[e.modo] / ESCALA);
    ctx.fillStyle = "#2a2618"; ctx.fillRect(40, 150, 240, 6); ctx.fillStyle = e.modo === "foco" ? OURO : AZUL; ctx.fillRect(40, 150, 240 * frac, 6);
  };
  desenhar();
  const video = document.createElement("video");
  video.muted = true; video.playsInline = true;
  video.srcObject = canvas.captureStream(4);
  await video.play();
  const desinscrever = (() => { ouvintes.add(desenhar); return () => ouvintes.delete(desenhar); })();
  const t = setInterval(desenhar, 1000);
  try {
    navigator.mediaSession.setActionHandler("play", () => iniciar());
    navigator.mediaSession.setActionHandler("pause", () => parar());
  } catch {}
  await video.requestPictureInPicture();
  const fechar = () => { clearInterval(t); desinscrever(); video.pause(); };
  video.addEventListener("leavepictureinpicture", fechar, { once: true });
  return () => { if (document.pictureInPictureElement) void document.exitPictureInPicture(); fechar(); };
}

export function Pomodoro() {
  const e = useEstadoTimer();
  const [cfg, setCfg] = useState<Config>({ auto: false, som: true });
  const [painel, setPainel] = useState(false);
  const [stats, setStats] = useState(false);
  const svg = useRef<SVGSVGElement>(null);
  const [pip, setPip] = useState<Window | null>(null);
  const fecharVideo = useRef<(() => void) | null>(null);
  const [erroPip, setErroPip] = useState("");
  async function janelaFlutuante() {
    setErroPip("");
    if (pip) { pip.close(); return; }
    const api = docPiP();
    try {
      if (api) {
        const w = await api.requestWindow({ width: 260, height: 300 });
        w.document.title = "Pomodoro · Onial";
        w.document.body.style.margin = "0";
        w.addEventListener("pagehide", () => setPip(null));
        setPip(w);
        return;
      }
      if (document.pictureInPictureEnabled) { fecharVideo.current = await abrirPiPVideo(); return; }
      setErroPip("Seu navegador não abre janela flutuante. Use o Google Chrome ou o Edge no computador.");
    } catch { setErroPip("Não consegui abrir a janela flutuante. Tente de novo."); }
  }
  useEffect(() => () => { pip?.close(); fecharVideo.current?.(); }, [pip]);
  const arraste = useRef<{ acc: number; ang: number } | null>(null);
  useEffect(() => setCfg(lerConfig()), []);

  const cor = e.modo === "foco" ? OURO : AZUL;
  const restante = e.restante[e.modo];
  const rodando = e.ativo === e.modo;
  const fundo = e.ativo && e.ativo !== e.modo ? e.ativo : null; // o outro modo contando em segundo plano
  const r = 96, C = 2 * Math.PI * r, frac = Math.min(1, restante / ESCALA);
  const th = frac * 2 * Math.PI, kx = 110 + r * Math.sin(th), ky = 110 - r * Math.cos(th);
  const fmt = (t: number) => `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
  const mudarCfg = (c: Config) => { setCfg(c); salvarConfig(c); };

  function angulo(ev: React.PointerEvent) {
    const b = svg.current!.getBoundingClientRect();
    const a = (Math.atan2(ev.clientX - (b.left + b.width / 2), -(ev.clientY - (b.top + b.height / 2))) * 180) / Math.PI;
    return a < 0 ? a + 360 : a;
  }
  function inicioArraste(ev: React.PointerEvent) {
    ev.preventDefault(); pararSeNaTela();
    arraste.current = { acc: (estado.restante[estado.modo] / 60) * 6, ang: angulo(ev) };
    (ev.target as Element).setPointerCapture(ev.pointerId);
  }
  function moverArraste(ev: React.PointerEvent) {
    if (!arraste.current) return;
    const a = angulo(ev); let d = a - arraste.current.ang;
    if (d > 180) d -= 360; if (d < -180) d += 360;
    arraste.current = { acc: Math.max(6, Math.min(360, arraste.current.acc + d)), ang: a };
    ajustarMinutos(arraste.current.acc / 6);
  }

  return (
    <div className="relative flex w-full flex-col items-center gap-5 overflow-hidden" style={{ maxWidth: 560, background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 16, padding: "20px 20px 24px" }}>
      <div className="pointer-events-none absolute rounded-full" style={{ left: "50%", top: "44%", width: 300, height: 300, transform: "translate(-50%,-50%)", background: `radial-gradient(circle,${e.modo === "foco" ? "rgba(232,176,20,.12)" : "rgba(77,163,255,.14)"},transparent 65%)` }} />
      <div className="absolute flex flex-col gap-2.5" style={{ left: 16, top: 16 }}>
        <button style={IB} aria-label="Configurações do pomodoro" aria-expanded={painel} onClick={() => setPainel(!painel)}><Icone nome="gear" tamanho={18} /></button>
        <button style={IB} aria-label="Estatísticas de foco" onClick={() => setStats(true)}><Icone nome="stats" tamanho={18} /></button>
      </div>
      <div className="absolute flex flex-col gap-2.5" style={{ right: 16, top: 16 }}>
        <button style={{ ...IB, color: cfg.som ? "var(--accent-text)" : "var(--muted)", opacity: cfg.som ? 1 : 0.6 }} aria-pressed={cfg.som} aria-label={cfg.som ? "Som ao concluir: ligado" : "Som ao concluir: desligado"} onClick={() => { mudarCfg({ ...cfg, som: !cfg.som }); if (!cfg.som) tocar(); }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{cfg.som ? <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10 21h4" /> : <path d="M8.7 3.7A6 6 0 0 1 18 8c0 3.2.6 5.4 1.3 6.8M6.3 6.3A6 6 0 0 0 6 8c0 7-3 9-3 9h14M10 21h4M3 3l18 18" />}</svg>
        </button>
        <button style={{ ...IB, color: pip ? "var(--accent-text)" : "var(--fg)" }} aria-pressed={!!pip} aria-label={pip ? "Fechar janela flutuante" : "Abrir em janela flutuante"} title={pip ? "Fechar janela flutuante" : "Abrir em janela flutuante (fica por cima das outras janelas)"} onClick={janelaFlutuante}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="2" /><rect x="12" y="11" width="8" height="7" rx="1" fill="currentColor" /></svg>
        </button>
      </div>
      {pip && createPortal(<MiniPomodoro />, pip.document.body)}
      {erroPip && <p className="relative" style={{ margin: 0, marginTop: 56, color: "var(--warn)", fontSize: 13, textAlign: "center" }}>{erroPip}</p>}
      {painel && (
        <div className="absolute z-10 flex flex-col gap-1" style={{ left: 16, top: 70, width: "min(300px, calc(100% - 32px))", padding: 16, borderRadius: 12, background: "var(--chip)", border: "1px solid var(--line2)", boxShadow: "0 12px 40px rgba(0,0,0,.5)" }}>
          <div className="display uppercase" style={{ fontSize: 18 }}>Configurações</div>
          {([["auto", "Iniciar timer automaticamente", "Começa o próximo ciclo sozinho"], ["som", "Fazer som ao concluir", "Toca um alerta no fim de cada ciclo"]] as const).map(([k, t, s]) => (
            <label key={k} className="flex cursor-pointer items-center justify-between gap-3" style={{ minHeight: 48 }}>
              <span>{t}<small style={{ display: "block", color: "var(--muted)", fontSize: 12 }}>{s}</small></span>
              <input type="checkbox" checked={cfg[k]} onChange={(ev) => { mudarCfg({ ...cfg, [k]: ev.target.checked }); if (k === "som" && ev.target.checked) tocar(); }} style={{ width: 20, height: 20, accentColor: OURO }} />
            </label>
          ))}
          <div style={{ marginTop: 6, paddingTop: 10, borderTop: "1px solid var(--line)", color: "var(--muted)", fontSize: 12 }}>Arraste a bolinha branca no sentido horário para aumentar o tempo e no anti-horário para diminuir.</div>
        </div>
      )}

      <div className="relative flex rounded-xl" style={{ padding: 4, background: "var(--chip)", border: "1px solid var(--line)" }}>
        {(["foco", "pausa"] as Modo[]).map((m) => (
          <button key={m} onClick={() => verModo(m)} style={{ minHeight: 40, padding: "0 26px", borderRadius: 9, background: e.modo === m ? (m === "foco" ? OURO : AZUL) : "transparent", color: e.modo === m ? "#0A0A0A" : "var(--muted)", fontWeight: e.modo === m ? 600 : 400 }}>{m === "foco" ? "Foco" : "Pausa"}{e.ativo === m && e.modo !== m && <span aria-label="contando" style={{ display: "inline-block", width: 7, height: 7, borderRadius: 4, marginLeft: 7, verticalAlign: "middle", background: m === "foco" ? OURO : AZUL }} />}</button>
        ))}
      </div>
      {fundo && (
        <button onClick={() => verModo(fundo)} className="relative" style={{ marginTop: -8, fontSize: 13, color: "var(--muted)" }}>
          {fundo === "foco" ? "Foco" : "Pausa"} rodando · <span style={{ color: fundo === "foco" ? "var(--accent-text)" : AZUL, fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>{fmt(e.restante[fundo])}</span> · dar play aqui zera o {fundo === "foco" ? "foco" : "pausa"}
        </button>
      )}

      <div className="relative" style={{ width: 220, height: 220 }}>
        <svg ref={svg} width="220" height="220" viewBox="0 0 220 220" style={{ overflow: "visible", touchAction: "none" }} aria-hidden="true">
          <circle cx="110" cy="110" r={r} fill="none" stroke="var(--track)" strokeWidth="10" />
          <circle cx="110" cy="110" r={r} fill="none" stroke={cor} strokeWidth="10" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - frac)} transform="rotate(-90 110 110)" />
          <circle cx={kx} cy={ky} r="22" fill="transparent" style={{ cursor: "grab" }} onPointerDown={inicioArraste} onPointerMove={moverArraste} onPointerUp={() => (arraste.current = null)} />
          <circle cx={kx} cy={ky} r="11" fill="#F5F1E6" stroke="var(--line2)" strokeWidth="1" pointerEvents="none" />
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <div style={{ fontSize: 56, fontWeight: 300, letterSpacing: 1, color: "var(--fg)", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{fmt(restante)}</div>
          <div style={{ marginTop: 10, fontSize: 12, letterSpacing: 2.5, color: "var(--muted)" }}>{e.modo === "foco" ? "FOCO" : "PAUSA"} · {Math.round(e.duracao[e.modo] / 60)} MIN</div>
        </div>
        <input type="range" min={1} max={60} value={Math.round(e.duracao[e.modo] / 60)} onChange={(ev) => { pararSeNaTela(); ajustarMinutos(Number(ev.target.value)); }} aria-label="Ajustar tempo em minutos" className="sr-only" />
      </div>

      <div className="relative flex items-center gap-4">
        <button style={{ ...IB, width: 48, height: 48 }} aria-label="Reiniciar" onClick={reiniciarTela}><Icone nome="reset" tamanho={18} /></button>
        <button aria-label={rodando ? "Pausar" : "Iniciar"} onClick={() => (rodando ? parar() : iniciar())} className="flex items-center justify-center rounded-full" style={{ width: 68, height: 68, background: cor, color: "#0A0A0A", boxShadow: `0 0 28px ${e.modo === "foco" ? "rgba(232,176,20,.45)" : "rgba(77,163,255,.45)"}` }}>
          {rodando ? <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><path d="M9 5v14M15 5v14" /></svg> : <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5l12 7-12 7z" /></svg>}
        </button>
        <button style={{ ...IB, width: 48, height: 48 }} aria-label={e.modo === "foco" ? "Pular para a pausa" : "Pular para o foco"} onClick={pular}><Icone nome="timer" tamanho={18} /></button>
      </div>
      {stats && <Estatisticas fechar={() => setStats(false)} />}
    </div>
  );
}

/* ---------- estatísticas: só o tempo de foco real, salvo neste navegador ---------- */
const MES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
function Estatisticas({ fechar }: { fechar: () => void }) {
  const [vista, setVista] = useState<"semana" | "mes" | "ano">("mes");
  const [off, setOff] = useState(0);
  const [dados, setDados] = useState<Record<string, number>>({});
  useEffect(() => { try { setDados(JSON.parse(localStorage.getItem("onialFocus") || "{}")); } catch {} }, []);
  useEffect(() => { const f = (ev: KeyboardEvent) => ev.key === "Escape" && fechar(); window.addEventListener("keydown", f); return () => window.removeEventListener("keydown", f); }, [fechar]);
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const min = (d: Date) => Math.floor((dados[d.toLocaleDateString("en-CA")] || 0) / 60);
  function periodo(o: number) {
    const pts: (number | null)[] = []; const rot: string[] = []; let titulo = "";
    if (vista === "semana") {
      const ini = new Date(hoje); ini.setDate(ini.getDate() - ((ini.getDay() + 6) % 7) + o * 7);
      for (let i = 0; i < 7; i++) { const d = new Date(ini); d.setDate(ini.getDate() + i); pts.push(d > hoje ? null : min(d)); rot.push(["SEG", "TER", "QUA", "QUI", "SEX", "SÁB", "DOM"][i]); }
      titulo = `${ini.getDate()} ${MES[ini.getMonth()]} – ${new Date(ini.getTime() + 6 * 864e5).getDate()} ${MES[new Date(ini.getTime() + 6 * 864e5).getMonth()]}`;
    } else if (vista === "mes") {
      const m = new Date(hoje.getFullYear(), hoje.getMonth() + o, 1); const n = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
      for (let i = 1; i <= n; i++) { const d = new Date(m.getFullYear(), m.getMonth(), i); pts.push(d > hoje ? null : min(d)); rot.push([1, 5, 10, 15, 20, 25, n].includes(i) ? String(i) : ""); }
      titulo = `${MES[m.getMonth()]} ${m.getFullYear()}`;
    } else {
      const y = hoje.getFullYear() + o;
      for (let mo = 0; mo < 12; mo++) { if (new Date(y, mo, 1) > hoje) { pts.push(null); rot.push(MES[mo][0]); continue; } let s = 0; const n = new Date(y, mo + 1, 0).getDate(); for (let i = 1; i <= n; i++) { const d = new Date(y, mo, i); if (d > hoje) break; s += min(d); } pts.push(s); rot.push(MES[mo][0]); }
      titulo = String(y);
    }
    return { pts, rot, titulo };
  }
  const p = periodo(off), ant = periodo(off - 1);
  const vals = p.pts.filter((v): v is number => v !== null), total = vals.reduce((a, b) => a + b, 0);
  const totAnt = ant.pts.filter((v): v is number => v !== null).reduce((a, b) => a + b, 0);
  const hm = (m: number) => `${Math.floor(m / 60)}h ${Math.round(m % 60)}m`;
  const W = 360, H = 150, PB = 24, PT = 10, n = p.pts.length, mx = Math.max(60, ...vals) * 1.1;
  const X = (i: number) => 4 + (W - 8) * (n === 1 ? 0 : i / (n - 1)), Y = (v: number) => PT + (H - PT - PB) * (1 - v / mx);
  const P = p.pts.map((v, i) => (v === null ? null : [X(i), Y(v)])).filter(Boolean) as number[][];
  const linha = P.map((q, i) => `${i ? "L" : "M"}${q[0].toFixed(1)},${q[1].toFixed(1)}`).join(" ");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,.6)" }} onClick={(ev) => ev.target === ev.currentTarget && fechar()}>
      <div role="dialog" aria-modal="true" aria-labelledby="estatTitulo" className="relative flex w-full flex-col gap-4" style={{ maxWidth: 420, padding: 24, borderRadius: 18, background: "var(--panel)", border: "1px solid var(--line)" }}>
        <h3 id="estatTitulo" style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Estatísticas</h3>
        <button aria-label="Fechar" onClick={fechar} className="absolute flex items-center justify-center" style={{ right: 14, top: 14, width: 40, height: 40, color: "var(--muted)" }}><Icone nome="x" tamanho={18} /></button>
        <div className="grid grid-cols-3 gap-1 rounded-xl" style={{ padding: 4, background: "var(--chip)", border: "1px solid var(--line)" }}>
          {(["semana", "mes", "ano"] as const).map((v) => <button key={v} aria-pressed={vista === v} onClick={() => { setVista(v); setOff(0); }} style={{ minHeight: 36, borderRadius: 9, fontWeight: 600, fontSize: 13, background: vista === v ? OURO : "transparent", color: vista === v ? "#0A0A0A" : "var(--muted)" }}>{v === "semana" ? "Semana" : v === "mes" ? "Mês" : "Ano"}</button>)}
        </div>
        <div className="flex items-center justify-center gap-4" style={{ color: "var(--muted)", fontSize: 13 }}>
          <button aria-label="Período anterior" onClick={() => setOff(off - 1)} style={{ width: 36, height: 36 }}>‹</button>
          <span>{p.titulo}</span>
          <button aria-label="Próximo período" disabled={off >= 0} onClick={() => setOff(off + 1)} style={{ width: 36, height: 36, opacity: off >= 0 ? 0.3 : 1 }}>›</button>
        </div>
        <div className="text-center" style={{ fontSize: 40, fontWeight: 600, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{hm(total)}</div>
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Tempo de foco no período" style={{ width: "100%", height: "auto" }}>
          <line x1="4" x2={W - 4} y1={H - PB} y2={H - PB} stroke="var(--line)" />
          {P.length > 0 && <><path d={`${linha} L${P[P.length - 1][0]},${H - PB} L${P[0][0]},${H - PB} Z`} fill="rgba(232,176,20,.18)" /><path d={linha} fill="none" stroke={OURO} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></>}
          {p.rot.map((t, i) => t && <text key={i} x={X(i)} y={H - 6} textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"} fontSize="10" fill="var(--muted)">{t}</text>)}
        </svg>
        <div className="grid grid-cols-3 gap-2">
          {[[totAnt ? `${total >= totAnt ? "+" : ""}${Math.round(((total - totAnt) / totAnt) * 100)}%` : "-", "VS ANTERIOR"], [hm(vals.length ? total / vals.length : 0), "MÉDIA/DIA"], [hm(total), "TOTAL"]].map(([v, l]) => (
            <div key={l} className="text-center" style={{ padding: "12px 8px", borderRadius: 10, background: "var(--chip)", border: "1px solid var(--line)" }}><b style={{ display: "block", fontSize: 17 }}>{v}</b><span style={{ fontSize: 10, letterSpacing: 1, color: "var(--muted)" }}>{l}</span></div>
          ))}
        </div>
        <p style={{ margin: 0, textAlign: "center", color: "var(--muted)", fontSize: 11 }}>Conta o tempo de foco usado neste navegador.</p>
      </div>
    </div>
  );
}
