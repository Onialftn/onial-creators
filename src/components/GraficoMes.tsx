"use client";
import { useEffect, useRef, useState } from "react";
import { Icone, LogoPlataforma, NOME_PLATAFORMA } from "./Icone";
import { formatarNumero, formatarReais } from "@/lib/pagamento";

type Plat = "tiktok" | "youtube" | "instagram";
export type DiaGrafico = { dia: string; tiktok: number; youtube: number; instagram: number };
type Chave = Plat | "valor";

/**
 * Visão do mês no estilo do YouTube Studio: 4 quadros (TikTok, YouTube, Instagram e valor do mês)
 * e, embaixo, a linha de cada dia do mês do quadro escolhido.
 */
export function GraficoMes({ dias, hoje, totalCentavos, anterior, nomeMesAnterior }: {
  /** todos os dias do mês, com as views ganhas em cada plataforma */
  dias: DiaGrafico[];
  hoje: string;
  /** total do mês até agora, com bônus */
  totalCentavos: number;
  /** soma do mesmo período do mês passado (dia 1 até o dia de hoje), para comparar */
  anterior: Record<Plat, number>;
  nomeMesAnterior: string;
}) {
  const [aba, setAba] = useState<Chave>("youtube");
  const ate = dias.filter((d) => d.dia <= hoje);
  const soma = (p: Plat) => ate.reduce((a, d) => a + d[p], 0);
  const views = { tiktok: soma("tiktok"), youtube: soma("youtube"), instagram: soma("instagram") };
  const totalViews = views.tiktok + views.youtube + views.instagram;
  const totalAnterior = anterior.tiktok + anterior.youtube + anterior.instagram;
  const variacao = (agora: number, antes: number) => (antes > 0 ? Math.round(((agora - antes) / antes) * 100) : null);

  const quadros: { id: Chave; rotulo: string; valor: string; delta: number | null }[] = [
    ...(["tiktok", "youtube", "instagram"] as Plat[]).map((p) => ({ id: p, rotulo: `Views no ${NOME_PLATAFORMA[p]}`, valor: formatarNumero(views[p]), delta: variacao(views[p], anterior[p]) })),
    { id: "valor", rotulo: "Valor do mês", valor: formatarReais(totalCentavos), delta: variacao(totalViews, totalAnterior) },
  ];
  // valor: o gráfico mostra o ganho bruto de cada dia (R$ 5 a cada 1.000 views); os bônus só fecham no fim do mês
  const serie = ate.map((d) => (aba === "valor" ? Math.round((d.tiktok + d.youtube + d.instagram) / 2) : d[aba]));

  return (
    <section className="card flex flex-col" style={{ gap: 18 }}>
      <h2 className="h2 m-0 text-center" style={{ fontSize: 20 }}>
        Você teve {formatarNumero(totalViews)} views neste mês
      </h2>
      <div role="tablist" aria-label="O que mostrar no gráfico" className="quadros-mes">
        {quadros.map((q) => {
          const on = aba === q.id;
          return (
            <button key={q.id} type="button" role="tab" aria-selected={on} aria-controls="grafico-mes" onClick={() => setAba(q.id)} className={`quadro-mes ${on ? "quadro-mes-on" : ""}`}>
              <span className="flex items-center justify-center gap-1.5" style={{ fontSize: 12, color: "var(--muted)" }}>
                {q.id === "valor" ? <Icone nome="wallet" tamanho={14} /> : <LogoPlataforma p={q.id} tamanho={16} />}
                {q.rotulo}
              </span>
              <span className="num" style={{ fontSize: 26, color: "var(--strong)", lineHeight: 1.1 }}>{q.valor}</span>
              <span style={{ fontSize: 11, color: "var(--muted)" }}>
                {q.delta === null ? "sem dados do mês passado" : (
                  <span className="inline-flex items-center gap-1">
                    <span style={{ color: q.delta >= 0 ? "var(--ok)" : "var(--warn)", display: "inline-flex" }}><Icone nome={q.delta >= 0 ? "up" : "down"} tamanho={11} /></span>
                    {q.delta >= 0 ? "+" : ""}{formatarNumero(q.delta)}% vs. mesmo período de {nomeMesAnterior}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
      <div id="grafico-mes" role="tabpanel">
        <Linha
          key={aba}
          dias={dias.map((d) => d.dia)}
          valores={serie}
          cor={aba === "valor" ? "var(--ok)" : "var(--accent-text)"}
          formatar={aba === "valor" ? (v) => formatarReais(v) : (v) => `${formatarNumero(v)} views`}
          formatarEixo={aba === "valor" ? (v) => `R$ ${formatarNumero(Math.round(v / 100))}` : compacto}
          rotulo={aba === "valor" ? "Ganho bruto de cada dia" : `Views de cada dia no ${NOME_PLATAFORMA[aba]}`}
        />
        <p style={{ margin: "10px 0 0", color: "var(--muted)", fontSize: 12 }}>
          {aba === "valor"
            ? "O valor do mês já soma os bônus. O gráfico mostra o ganho bruto de cada dia (R$ 5 a cada 1.000 views)."
            : aba === "youtube"
              ? "O YouTube entrega as views de cada dia com 2 a 3 dias de atraso: os últimos dias ainda vão subir."
              : "Views ganhas em cada dia, somando todos os seus vídeos (inclusive os antigos)."}
        </p>
      </div>
    </section>
  );
}

/** "1,2 mi", "35 mil", "800" */
function compacto(v: number) {
  if (v >= 1_000_000) return `${formatarNumero(Math.round(v / 100_000) / 10)} mi`;
  if (v >= 1000) return `${formatarNumero(Math.round(v / 100) / 10)} mil`;
  return formatarNumero(Math.round(v));
}

/** degraus "redondos" para o eixo: 1, 2, 2,5 ou 5 × 10ⁿ */
function degrau(maximo: number, linhas = 3) {
  const bruto = Math.max(1, maximo) / linhas;
  const base = 10 ** Math.floor(Math.log10(bruto));
  return ([1, 2, 2.5, 5, 10].find((m) => m * base >= bruto) ?? 10) * base;
}

function Linha({ dias, valores, cor, formatar, formatarEixo, rotulo }: {
  dias: string[];
  valores: number[];
  cor: string;
  formatar: (v: number) => string;
  formatarEixo: (v: number) => string;
  rotulo: string;
}) {
  const caixa = useRef<HTMLDivElement>(null);
  const [largura, setLargura] = useState(0);
  const [foco, setFoco] = useState<number | null>(null);
  useEffect(() => {
    const el = caixa.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setLargura(Math.round(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const altura = 220;
  const m = { cima: 12, baixo: 26, esq: 4, dir: 58 };
  const w = Math.max(0, largura - m.esq - m.dir);
  const h = altura - m.cima - m.baixo;
  const passo = degrau(Math.max(0, ...valores));
  const topo = passo * Math.max(1, Math.ceil(Math.max(0, ...valores) / passo));
  const x = (i: number) => m.esq + (dias.length > 1 ? (i / (dias.length - 1)) * w : 0);
  const y = (v: number) => m.cima + h - (v / topo) * h;
  const pontos = valores.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`);
  const caminho = pontos.length ? `M${pontos.join("L")}` : "";
  const area = pontos.length ? `${caminho}L${x(valores.length - 1).toFixed(1)},${y(0)}L${x(0)},${y(0)}Z` : "";
  const marcas = Array.from({ length: Math.round(topo / passo) + 1 }, (_, i) => i * passo);
  const rotulosX = dias.map((d, i) => ({ d, i })).filter(({ i }) => i % 7 === 0 || i === dias.length - 1).filter(({ i }, k, arr) => k === arr.length - 1 || dias.length - 1 - i >= 3 || i === 0);
  const dataCurta = (d: string) => `${d.slice(8)}/${d.slice(5, 7)}`;

  function mover(e: React.PointerEvent<SVGSVGElement>) {
    if (!valores.length) return;
    const r = e.currentTarget.getBoundingClientRect();
    const i = Math.round(((e.clientX - r.left - m.esq) / Math.max(1, w)) * (dias.length - 1));
    setFoco(Math.max(0, Math.min(valores.length - 1, i)));
  }
  function teclado(e: React.KeyboardEvent) {
    if (!valores.length) return;
    const ultimo = valores.length - 1;
    if (e.key === "ArrowRight") setFoco((f) => Math.min(ultimo, (f ?? ultimo) + (f === null ? 0 : 1)));
    else if (e.key === "ArrowLeft") setFoco((f) => Math.max(0, (f ?? ultimo) - (f === null ? 0 : 1)));
    else return;
    e.preventDefault();
  }

  const fx = foco !== null ? x(foco) : 0;
  return (
    <div>
      <div ref={caixa} className="relative" style={{ height: altura }}>
        {largura > 0 && (
          <svg width={largura} height={altura} role="img" aria-label={`${rotulo}. Use as setas para ver cada dia.`} tabIndex={0} onPointerMove={mover} onPointerLeave={() => setFoco(null)} onKeyDown={teclado} onBlur={() => setFoco(null)} style={{ display: "block", touchAction: "pan-y", outline: "none" }}>
            {marcas.map((v) => (
              <g key={v}>
                <line x1={m.esq} x2={m.esq + w} y1={y(v)} y2={y(v)} stroke="var(--line)" strokeWidth={1} />
                <text x={m.esq + w + 8} y={y(v) + 4} fontSize={11} fill="var(--muted)">{formatarEixo(v)}</text>
              </g>
            ))}
            {rotulosX.map(({ d, i }) => (
              <text key={d} x={x(i)} y={altura - 6} fontSize={11} fill="var(--muted)" textAnchor={i === 0 ? "start" : i === dias.length - 1 ? "end" : "middle"}>{dataCurta(d)}</text>
            ))}
            <path d={area} fill={cor} opacity={0.1} />
            <path d={caminho} fill="none" stroke={cor} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            {valores.length > 0 && foco === null && <circle cx={x(valores.length - 1)} cy={y(valores[valores.length - 1])} r={4} fill={cor} stroke="var(--panel)" strokeWidth={2} />}
            {foco !== null && (
              <g pointerEvents="none">
                <line x1={fx} x2={fx} y1={m.cima} y2={m.cima + h} stroke="var(--muted)" strokeWidth={1} />
                <circle cx={fx} cy={y(valores[foco])} r={5} fill={cor} stroke="var(--panel)" strokeWidth={2} />
              </g>
            )}
            <rect x={0} y={0} width={largura} height={altura} fill="transparent" />
          </svg>
        )}
        {foco !== null && (
          <div role="status" className="grafico-dica" style={{ left: Math.min(Math.max(fx, 70), largura - 70), top: 0 }}>
            <div className="num" style={{ fontSize: 18, color: "var(--strong)" }}>{formatar(valores[foco])}</div>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>{dataCurta(dias[foco])}</div>
          </div>
        )}
      </div>
      <details style={{ marginTop: 6, fontSize: 13 }}>
        <summary style={{ cursor: "pointer", color: "var(--accent-text)", width: "fit-content" }}>Ver os números de cada dia</summary>
        <div className="overflow-x-auto" style={{ marginTop: 8 }}>
          <table className="table" style={{ minWidth: 260 }}>
            <thead><tr><th scope="col">DIA</th><th scope="col">{rotulo.toUpperCase()}</th></tr></thead>
            <tbody>{valores.map((v, i) => <tr key={dias[i]}><td>{dataCurta(dias[i])}</td><td className="num" style={{ fontSize: 16 }}>{formatar(v)}</td></tr>).reverse()}</tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
