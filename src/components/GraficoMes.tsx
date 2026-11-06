"use client";
import { useEffect, useRef, useState } from "react";
import { COR_PLATAFORMA, Icone, LogoPlataforma, NOME_PLATAFORMA } from "./Icone";
import { formatarNumero, formatarReais } from "@/lib/pagamento";

type Plat = "tiktok" | "youtube" | "instagram";
export type DiaGrafico = { dia: string; tiktok: number; youtube: number; instagram: number };
/** uma linha da conta do valor do mês (ex.: "Constância 10%" → "+ R$ 207,90") */
export type LinhaConta = { rotulo: string; valor: string; apagado?: boolean };

/**
 * Topo da Dashboard (modelo A, escolhido pelo dono): valor do mês com a conta dele à esquerda,
 * gráfico do ganho bruto de cada dia à direita e, embaixo, as views de cada rede.
 */
export function GraficoMes({ dias, hoje, totalCentavos, conta, anterior, nomeMesAnterior }: {
  /** todos os dias do mês, com as views ganhas em cada plataforma */
  dias: DiaGrafico[];
  hoje: string;
  /** total do mês até agora, com bônus */
  totalCentavos: number;
  conta: LinhaConta[];
  /** soma do mesmo período do mês passado (dia 1 até o dia de hoje), para comparar */
  anterior: Record<Plat, number>;
  nomeMesAnterior: string;
}) {
  // hoje só entra no gráfico quando já tem views (a coleta da madrugada traz o dia anterior)
  const ate = dias.filter((d) => d.dia < hoje || (d.dia === hoje && d.tiktok + d.youtube + d.instagram > 0));
  const soma = (p: Plat) => ate.reduce((a, d) => a + d[p], 0);
  const views = { tiktok: soma("tiktok"), youtube: soma("youtube"), instagram: soma("instagram") };
  const totalViews = views.tiktok + views.youtube + views.instagram;
  const totalAnterior = anterior.tiktok + anterior.youtube + anterior.instagram;
  const variacao = (agora: number, antes: number) => (antes > 0 ? Math.round(((agora - antes) / antes) * 100) : null);
  // o gráfico mostra o ganho bruto de cada dia (R$ 5 a cada 1.000 views = meio centavo por view); os bônus só fecham no fim do mês
  const serie = ate.map((d) => Math.round((d.tiktok + d.youtube + d.instagram) / 2));
  const delta = variacao(totalViews, totalAnterior);

  return (
    <>
      <section className="card painel-mes">
        <div className="flex flex-col" style={{ gap: 12 }}>
          <span style={{ fontSize: 13, color: "var(--muted)" }}>Valor do mês até agora</span>
          <span className="num" style={{ fontSize: 54, color: "var(--ok)", lineHeight: 1 }}>{formatarReais(totalCentavos)}</span>
          <Variacao delta={delta} nomeMesAnterior={nomeMesAnterior} />
          <div className="flex flex-col" style={{ gap: 8, marginTop: 6, paddingTop: 14, borderTop: "1px solid var(--line)", fontSize: 13 }}>
            {conta.map((l) => (
              <div key={l.rotulo} className="flex justify-between gap-3">
                <span style={{ color: "var(--muted)" }}>{l.rotulo}</span>
                <span style={{ color: l.apagado ? "var(--muted)" : "var(--strong)", fontWeight: l.apagado ? 400 : 600, textAlign: "right" }}>{l.valor}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="flex min-w-0 flex-col" style={{ gap: 8 }}>
          <span style={{ fontSize: 13, color: "var(--muted)" }}>Ganho bruto de cada dia · {formatarNumero(totalViews)} views no mês</span>
          <Linha
            dias={ate.map((d) => d.dia)}
            valores={serie}
            cor="var(--ok)"
            formatar={(v) => formatarReais(v)}
            formatarEixo={(v) => `R$ ${formatarNumero(Math.round(v / 100))}`}
            rotulo="Ganho bruto de cada dia"
          />
          <p style={{ margin: 0, color: "var(--muted)", fontSize: 12 }}>
            O gráfico soma TikTok, YouTube e Instagram. O YouTube entrega as views com 2 a 3 dias de atraso, então os últimos dias ainda vão subir.
          </p>
        </div>
      </section>

      <section className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))" }}>
        {(["tiktok", "youtube", "instagram"] as Plat[]).map((p) => {
          const parte = totalViews ? Math.round((views[p] / totalViews) * 100) : 0;
          return (
            <div key={p} className="card flex flex-col" style={{ padding: "18px 20px", gap: 10 }}>
              <div className="flex items-center justify-between gap-2" style={{ fontSize: 13, color: "var(--muted)" }}>
                <span className="flex items-center gap-2"><LogoPlataforma p={p} tamanho={20} />{NOME_PLATAFORMA[p]}</span>
                <span>{parte}% das views</span>
              </div>
              <span className="num" style={{ fontSize: 30, color: "var(--strong)", lineHeight: 1 }}>{formatarNumero(views[p])}</span>
              <div className="bar" style={{ height: 6 }}><span style={{ width: `${parte}%`, background: COR_PLATAFORMA[p] }} /></div>
              <span style={{ fontSize: 12, color: "var(--muted)" }}><Variacao delta={variacao(views[p], anterior[p])} nomeMesAnterior={nomeMesAnterior} curto /></span>
            </div>
          );
        })}
      </section>
    </>
  );
}

function Variacao({ delta, nomeMesAnterior, curto = false }: { delta: number | null; nomeMesAnterior: string; curto?: boolean }) {
  if (delta === null) return <span style={{ fontSize: curto ? 12 : 13, color: "var(--muted)" }}>sem dados do mês passado</span>;
  return (
    <span className="inline-flex items-center gap-1" style={{ fontSize: curto ? 12 : 13, color: "var(--text2)" }}>
      <span style={{ color: delta >= 0 ? "var(--ok)" : "var(--warn)", display: "inline-flex" }}><Icone nome={delta >= 0 ? "up" : "down"} tamanho={curto ? 11 : 13} /></span>
      {delta > 999 ? ">999" : `${delta >= 0 ? "+" : ""}${formatarNumero(delta)}`}% vs. {curto ? nomeMesAnterior : `mesmo período de ${nomeMesAnterior}`}
    </span>
  );
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

  const altura = 210;
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
  // a linha ocupa a largura toda com os dias que já passaram (como no YouTube); até 7 dias mostra todas as datas, depois 5 espalhadas
  const n = dias.length;
  const indicesX = n <= 7 ? dias.map((_, i) => i) : [...new Set([0, 1, 2, 3, 4].map((k) => Math.round((k * (n - 1)) / 4)))];
  const rotulosX = indicesX.map((i) => ({ d: dias[i], i }));
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
