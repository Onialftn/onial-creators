"use client";
import { useEffect, useState } from "react";
import { MAPAS } from "@/lib/ia/mapas";
import { notaTitulo } from "@/lib/seo-nota";
import { Icone } from "./Icone";

const VERDE = { background: "#3DDC97", color: "#0A0A0A", borderColor: "#3DDC97" } as const;
const corNota = (x: number) => (x >= 70 ? "var(--ok)" : x >= 45 ? "#E8B014" : "var(--warn)");
const n = (v: number) => (v >= 1e6 ? `${(v / 1e6).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mi` : v >= 1e3 ? `${Math.round(v / 1e3)} mil` : String(v));

/** Botão que copia e fica verde por 2 segundos. */
function Copiar({ texto, rotulo = "Copiar" }: { texto: string; rotulo?: string }) {
  const [ok, setOk] = useState(false);
  async function copiar() {
    try { await navigator.clipboard.writeText(texto); setOk(true); setTimeout(() => setOk(false), 2000); } catch { /* sem permissão */ }
  }
  return (
    <button type="button" onClick={copiar} className="btn-line" style={{ minHeight: 34, padding: "0 12px", fontSize: 13, flex: "none", ...(ok ? VERDE : {}) }}>
      {ok ? <><Icone nome="check" tamanho={14} />Copiado!</> : rotulo}
    </button>
  );
}

/** Anel de nota 0 a 100. */
function Medidor({ nota, tamanho = 80 }: { nota: number; tamanho?: number }) {
  const r = tamanho / 2 - 8;
  const C = 2 * Math.PI * r;
  return (
    <div className="relative flex-none" style={{ width: tamanho, height: tamanho }} role="img" aria-label={`Nota ${nota} de 100`}>
      <svg width={tamanho} height={tamanho} aria-hidden="true">
        <circle cx={tamanho / 2} cy={tamanho / 2} r={r} fill="none" stroke="var(--track)" strokeWidth="8" />
        <circle cx={tamanho / 2} cy={tamanho / 2} r={r} fill="none" stroke={corNota(nota)} strokeWidth="8" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - nota / 100)} transform={`rotate(-90 ${tamanho / 2} ${tamanho / 2})`} style={{ transition: "stroke-dashoffset .4s" }} />
      </svg>
      <span className="num absolute inset-0 flex items-center justify-center" style={{ fontSize: tamanho / 3.2, color: "var(--strong)" }}>{nota}</span>
    </div>
  );
}

function Passo({ num, titulo, feito, children, direita }: { num: number; titulo: string; feito?: boolean; children: React.ReactNode; direita?: React.ReactNode }) {
  return (
    <section className="card flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <span className="num flex items-center justify-center flex-none" style={{ width: 30, height: 30, borderRadius: 15, fontSize: 16, background: feito ? "var(--ok)" : "#E8B014", color: "#0A0A0A" }}>{feito ? <Icone nome="check" tamanho={16} /> : num}</span>
        <h2 className="num flex-1" style={{ margin: 0, fontSize: 19, color: "var(--strong)" }}>{titulo}</h2>
        {direita}
      </div>
      {children}
    </section>
  );
}

const caixa = { padding: "10px 12px", borderRadius: 6, background: "var(--bg)", border: "1px solid var(--line)" } as const;

type Horarios = { analisados: number; suficiente: boolean; faixas: { faixa: string; mediana: number; videos: number }[]; dias: { dia: string; mediana: number; videos: number }[] };

export function Seo({ pronta, usados: usadosIni, limite }: { pronta: boolean; usados: number; limite: number | null }) {
  const [mapa, setMapa] = useState<string>(MAPAS[0].id);
  const [titulo, setTitulo] = useState("");
  const [sobre, setSobre] = useState("");
  const [sugestoes, setSugestoes] = useState<string[]>([]);
  const [escolhido, setEscolhido] = useState("");
  const [resto, setResto] = useState<{ descricao: string; hashtags: string[]; tags: string } | null>(null);
  const [usados, setUsados] = useState(usadosIni);
  const [carregando, setCarregando] = useState<"" | "titulos" | "resto">("");
  const [erro, setErro] = useState("");
  const [horarios, setHorarios] = useState<Horarios | null>(null);
  const [erroHorario, setErroHorario] = useState("");
  const acabou = limite !== null && usados >= limite;
  const nota = notaTitulo(titulo);

  useEffect(() => {
    fetch("/api/seo/horarios").then(async (r) => {
      const j = await r.json().catch(() => ({ erro: "Não deu para ler seu canal agora." }));
      if (r.ok) setHorarios(j); else setErroHorario(j.erro);
    }).catch(() => setErroHorario("Não deu para ler seu canal agora."));
  }, []);

  async function pedir(etapa: "titulos" | "resto", t: string) {
    setCarregando(etapa); setErro("");
    try {
      const r = await fetch("/api/ia/seo", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ etapa, mapa, titulo: t, sobre }) });
      const j = await r.json().catch(() => ({ erro: "A IA demorou demais. Tente de novo." }));
      if (!r.ok) { setErro(j.erro); return; }
      setUsados(j.usados);
      if (etapa === "titulos") { setSugestoes(j.titulos); setEscolhido(""); setResto(null); }
      else setResto({ descricao: j.descricao, hashtags: j.hashtags, tags: j.tags });
    } finally { setCarregando(""); }
  }

  function escolher(t: string) {
    setEscolhido(t); setResto(null);
    if (!acabou) void pedir("resto", t);
  }

  return (
    <>
      {!pronta && <div className="card" style={{ color: "var(--warn)" }}>A IA ainda não está configurada. Fale com o gestor.</div>}

      <Passo num={1} titulo="Título" feito={!!escolhido} direita={limite !== null && <span style={{ color: "var(--muted)", fontSize: 13 }}>{usados} / {limite} no mês</span>}>
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))" }}>
          <label className="flex flex-col gap-1"><span className="label">MAPA</span>
            <select className="input" value={mapa} onChange={(e) => setMapa(e.target.value)}>{MAPAS.map((m) => <option key={m.id} value={m.id}>{m.emoji} {m.nome}</option>)}</select>
          </label>
          <label className="flex flex-col gap-1"><span className="label">DO QUE É O VÍDEO (OPCIONAL)</span>
            <input className="input" value={sobre} onChange={(e) => setSobre(e.target.value)} maxLength={3000} placeholder="Ex.: mostro onde fica o farm de XP escondido" />
          </label>
        </div>
        <label className="flex flex-col gap-1"><span className="label">SEU TÍTULO</span>
          <input className="input" value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={150} placeholder="Escreva o título que você pensou" style={{ fontSize: 16 }} />
        </label>

        {titulo.trim() && (
          <div className="flex flex-wrap items-center gap-4" style={caixa}>
            <Medidor nota={nota.nota} />
            <ul className="flex-1 flex flex-col gap-1" style={{ margin: 0, padding: 0, listStyle: "none", fontSize: 13, minWidth: 220 }}>
              {nota.itens.map((i) => (
                <li key={i.texto} className="flex items-center gap-2" style={{ color: i.ok ? "var(--fg)" : "var(--warn)" }}>
                  <span style={{ color: i.ok ? "var(--ok)" : "var(--warn)", flex: "none" }}>{i.ok ? "✓" : "•"}</span>{i.texto}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <button className="btn-gold" type="button" disabled={!pronta || acabou || titulo.trim().length < 5 || !!carregando} onClick={() => pedir("titulos", titulo)}>
            <Icone nome="bulb" tamanho={16} />{carregando === "titulos" ? "Pensando nos títulos..." : sugestoes.length ? "Gerar outras 5 sugestões" : "Ver 5 sugestões de título"}
          </button>
          {titulo.trim().length >= 5 && <button className="btn-line" type="button" disabled={!!carregando || acabou} onClick={() => escolher(titulo.trim())}>Usar o meu título</button>}
        </div>
        {acabou && <p style={{ margin: 0, color: "var(--warn)", fontSize: 13 }}>Você já usou os {limite} pedidos de SEO deste mês.</p>}
        {erro && <p role="alert" style={{ margin: 0, color: "var(--warn)", fontSize: 14 }}>{erro}</p>}

        {sugestoes.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="label">SUGESTÕES · TOQUE EM “USAR” PARA SEGUIR</span>
            {sugestoes.map((s) => {
              const ns = notaTitulo(s).nota;
              const ativo = escolhido === s;
              return (
                <div key={s} className="flex flex-wrap items-center gap-3" style={{ ...caixa, borderColor: ativo ? "#E8B014" : "var(--line)" }}>
                  <span className="num flex-none" style={{ fontSize: 18, color: corNota(ns), width: 34 }}>{ns}</span>
                  <span className="flex-1" style={{ color: "var(--strong)", minWidth: 180 }}>{s}<span style={{ color: "var(--muted)", fontSize: 12 }}> · {s.length} letras</span></span>
                  <Copiar texto={s} />
                  <button type="button" className={ativo ? "btn-gold" : "btn-line"} style={{ minHeight: 34, fontSize: 13 }} disabled={!!carregando || acabou} onClick={() => escolher(s)}>{ativo ? "Escolhido" : "Usar"}</button>
                </div>
              );
            })}
          </div>
        )}
      </Passo>

      {escolhido && (
        <>
          {carregando === "resto" && <div className="card" style={{ color: "var(--muted)" }}>Escrevendo a descrição, as hashtags e as tags...</div>}
          {resto && (
            <>
              <Passo num={2} titulo="Descrição" feito direita={<Copiar texto={resto.descricao} />}>
                <p style={{ ...caixa, margin: 0, color: "var(--strong)", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{resto.descricao}</p>
              </Passo>
              <Passo num={3} titulo="Hashtags" feito direita={<Copiar texto={resto.hashtags.join(" ")} />}>
                <div className="flex flex-wrap gap-2">{resto.hashtags.map((h) => <span key={h} className="pill-tint" style={{ fontSize: 15 }}>{h}</span>)}</div>
              </Passo>
              <Passo num={4} titulo="Tags do YouTube" feito direita={<Copiar texto={resto.tags} />}>
                <p style={{ ...caixa, margin: 0, color: "var(--fg)", fontSize: 14, lineHeight: 1.5, wordBreak: "break-word" }}>{resto.tags.split(",").join(", ")}</p>
                <span style={{ color: "var(--muted)", fontSize: 13 }}>{resto.tags.length} de 500 caracteres · cole no campo “Tags” do YouTube Studio (em Mostrar mais).</span>
              </Passo>
            </>
          )}
        </>
      )}

      <Passo num={5} titulo="Melhor horário para postar" feito={!!horarios?.suficiente}>
        {!horarios && !erroHorario && <p style={{ margin: 0, color: "var(--muted)" }}>Lendo os vídeos do seu canal...</p>}
        {erroHorario && <p style={{ margin: 0, color: "var(--muted)" }}>{erroHorario}</p>}
        {horarios && !horarios.suficiente && <p style={{ margin: 0, color: "var(--muted)" }}>Ainda tem poucos vídeos no seu canal para saber ({horarios.analisados}). Com 8 ou mais, os seus melhores horários aparecem aqui.</p>}
        {horarios?.suficiente && (
          <>
            <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))" }}>
              {horarios.faixas.map((f, i) => (
                <div key={f.faixa} className="tile" style={i === 0 ? { borderColor: "#E8B014" } : undefined}>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>{i === 0 ? "🥇 MELHOR HORÁRIO" : `${i + 1}º HORÁRIO`}</div>
                  <div className="num" style={{ fontSize: 24, color: "var(--strong)" }}>{f.faixa}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>~{n(f.mediana)} views por vídeo · {f.videos} vídeos</div>
                </div>
              ))}
            </div>
            {horarios.dias.length > 0 && <p style={{ margin: 0, fontSize: 14 }}>Dias que mais rendem: <b style={{ color: "var(--strong)" }}>{horarios.dias.map((d) => d.dia).join(", ")}</b></p>}
            <span style={{ color: "var(--muted)", fontSize: 13 }}>Horário de Brasília, pelos seus últimos {horarios.analisados} vídeos do YouTube (views do vídeo típico postado em cada horário).</span>
          </>
        )}
      </Passo>
    </>
  );
}
