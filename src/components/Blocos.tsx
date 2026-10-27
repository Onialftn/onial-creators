import { formatarNumero, formatarReais, inicioDaSemana as inicioDaSemanaHoje } from "@/lib/pagamento";
import { DIAS_CURTOS, diaDaSemana, proximaColeta, quandoFoi } from "@/lib/datas";
import type { DiaCalendario, LinhaRanking, Plataforma, ResumoMes } from "@/lib/dados";
import { Avatar } from "./Avatar";
import { COR_PLATAFORMA, Icone, LogoPlataforma, NOME_PLATAFORMA } from "./Icone";

export function Cabecalho({ icone, titulo, sub, direita }: { icone?: string; titulo: string; sub?: React.ReactNode; direita?: React.ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="h1 m-0">
          {icone && <span style={{ color: "var(--accent-text)", display: "flex" }}><Icone nome={icone} tamanho={32} /></span>}
          {titulo}
        </h1>
        {sub && <div className="sub">{sub}</div>}
      </div>
      {direita}
    </header>
  );
}

export function TituloCard({ icone, children, direita }: { icone: string; children: React.ReactNode; direita?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <h2 className="h2 m-0"><span style={{ color: "var(--accent-text)", display: "flex" }}><Icone nome={icone} /></span>{children}</h2>
      {direita && <div style={{ color: "var(--muted)" }}>{direita}</div>}
    </div>
  );
}

export function CardsGanho({ r }: { r: ResumoMes }) {
  const p = r.pagamento;
  const constTxt = r.faltas === 0 ? (r.aRepor > 0 ? `${r.aRepor} dia para repor até domingo` : "Em dia: continue postando certinho") : r.faltas === 1 ? "1 falta no mês: caiu para 5%" : `${r.faltas} faltas no mês: sem bônus`;
  return (
    <section className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))" }}>
      <div className="card" style={{ padding: 22 }}>
        <div className="flex items-center gap-2" style={{ color: "var(--muted)" }}><Icone nome="wallet" />Ganho bruto (RPM R$ 5)</div>
        <div className="num" style={{ fontSize: 34, marginTop: 8, color: "var(--ok)" }}>{formatarReais(p.brutoCentavos)}</div>
        <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 6 }}>{formatarNumero(r.views)} views somadas</div>
        {r.viewsDesdeOntem !== null && (
          <div className="flex flex-wrap items-baseline gap-x-2" style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--line)", fontSize: 13 }} title="Quanto o seu ganho bruto subiu desde a última atualização de ontem, somando todas as redes. Inclui views de dias anteriores que o YouTube só entregou agora.">
            <span style={{ color: "var(--muted)" }}>Desde ontem</span>
            <span className="num" style={{ fontSize: 18, color: r.viewsDesdeOntem ? "var(--ok)" : "var(--muted)" }}>+{formatarReais(r.centavosDesdeOntem ?? 0)}</span>
            <span style={{ color: "var(--muted)" }}>· {formatarNumero(r.viewsDesdeOntem)} views</span>
          </div>
        )}
      </div>
      <div className="card" style={{ padding: 22 }}>
        <div className="flex items-center gap-2" style={{ color: "var(--muted)" }}><Icone nome="cal" />Bônus de constância ({Math.round(p.percentualConstancia * 100)}%)</div>
        <div className="num" style={{ fontSize: 34, marginTop: 8, color: "var(--strong)" }}>{formatarReais(p.constanciaCentavos)}</div>
        <div style={{ color: r.faltas || r.aRepor ? "var(--warn)" : "var(--muted)", fontSize: 13, marginTop: 6 }}>{constTxt}</div>
      </div>
      <div className="card" style={{ padding: 22 }}>
        <div className="flex items-center gap-2" style={{ color: "var(--muted)" }}><Icone nome="target" />Bônus de meta (R$ 1 / 1.000 views)</div>
        <div className="num" style={{ fontSize: 34, marginTop: 8, color: "var(--strong)" }}>{r.meta ? formatarReais(Math.round(r.meta / 10)) : "—"}</div>
        <div style={{ color: p.bateuMeta ? "var(--ok)" : "var(--muted)", fontSize: 13, marginTop: 6 }}>
          {!r.meta ? "O gestor ainda não definiu sua meta" : p.bateuMeta ? "Meta batida!" : `Libera ao bater ${formatarNumero(r.meta)} views`}
        </div>
      </div>
      <div style={{ background: "linear-gradient(135deg,#E8B014,#FFD966)", boxShadow: "0 0 28px rgba(232,176,20,.35)", borderRadius: 6, padding: 22 }}>
        <div className="flex items-center gap-2" style={{ color: "#3A2E08" }}><Icone nome="trophy" />{p.bateuMeta || !r.meta ? "Total do mês até agora" : "Estimativa total do mês"}</div>
        <div className="num" style={{ fontSize: 34, marginTop: 8, color: "#0A0A0A" }}>{formatarReais(p.bateuMeta || !r.totalSeBaterMeta ? p.totalCentavos : r.totalSeBaterMeta)}</div>
        <div style={{ color: "#3A2E08", fontSize: 13, marginTop: 6 }}>{p.bateuMeta || !r.meta ? "Bruto + bônus conquistados" : "Se bater a meta de views"}</div>
        {p.bonusExtraCentavos > 0 && <div style={{ color: "#3A2E08", fontSize: 13, marginTop: 4, fontWeight: 600 }}>Inclui {formatarReais(p.bonusExtraCentavos)} de vídeos extras</div>}
        {p.ajudas > 0 && <div style={{ color: "#3A2E08", fontSize: 13, marginTop: 4, fontWeight: 600 }}>Inclui {formatarReais(p.bonusAjudaCentavos)} de {p.ajudas} {p.ajudas === 1 ? "gravação ajudada" : "gravações ajudadas"}</div>}
      </div>
    </section>
  );
}

export function BarrasPlataforma({ por, total }: { por: Record<Plataforma, number>; total: number }) {
  // em ordem: a rede com mais views primeiro; a barra mostra quanto cada uma representa do total
  const linhas = (["tiktok", "youtube", "instagram"] as Plataforma[]).map((p) => ({ p, v: por[p] })).sort((x, y) => y.v - x.v);
  return (
    <div className="flex flex-col gap-2">
      <div className="label">Views por plataforma</div>
      <div className="overflow-x-auto">
        <table className="table" style={{ minWidth: 480 }}>
          <thead>
            <tr><th scope="col">#</th><th scope="col">PLATAFORMA</th><th scope="col">VIEWS</th><th scope="col" style={{ width: "35%" }}>% DAS SUAS VIEWS</th><th scope="col">BRUTO</th></tr>
          </thead>
          <tbody>
            {linhas.map(({ p, v }, i) => {
              const pct = total ? (v / total) * 100 : 0;
              return (
                <tr key={p}>
                  <td className="num" style={{ fontSize: 18, color: i === 0 ? "var(--accent-text)" : "var(--muted)" }}>{i + 1}</td>
                  <td><span className="flex items-center gap-2.5" style={{ color: "var(--strong)", fontWeight: 600 }}><LogoPlataforma p={p} />{NOME_PLATAFORMA[p]}</span></td>
                  <td className="num" style={{ fontSize: 18, color: "var(--strong)" }}>{formatarNumero(v)}</td>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="bar flex-1"><span style={{ width: `${pct}%`, background: COR_PLATAFORMA[p] }} /></div>
                      <span style={{ color: "var(--muted)", fontSize: 13, minWidth: 40, textAlign: "right" }}>{Math.round(pct)}%</span>
                    </div>
                  </td>
                  <td style={{ color: "var(--muted)", whiteSpace: "nowrap" }}>{formatarReais(Math.round(v / 2))}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {total === 0 && <p style={{ color: "var(--muted)", margin: 0, fontSize: 13 }}>Nenhuma view registrada neste mês ainda.</p>}
    </div>
  );
}

export function MetaViews({ r }: { r: ResumoMes }) {
  const pct = r.meta ? Math.min(100, (r.views / r.meta) * 100) : 0;
  return (
    <section className="card flex flex-col gap-5">
      <TituloCard icone="target" direita={r.meta ? (
        <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="num" style={{ fontSize: 26, color: "var(--strong)", lineHeight: 1 }}>{formatarNumero(r.views)} <span style={{ fontSize: 18, color: "var(--text2)" }}>/ {formatarNumero(r.meta)}</span></span>
          <span className="num" style={{ fontSize: 18, color: r.views >= r.meta ? "var(--ok)" : "var(--accent-text)" }}>{r.views >= r.meta ? "META BATIDA" : `faltam ${formatarNumero(r.meta - r.views)}`}</span>
        </span>
      ) : "Sem meta definida"}>Meta de views</TituloCard>
      <div className="bar" style={{ height: 14 }}><span style={{ width: `${pct}%`, background: "var(--ok)" }} /></div>
      <BarrasPlataforma por={r.viewsPorPlataforma} total={r.views} />
    </section>
  );
}

export function RankingTabela({ linhas, meuId, limite }: { linhas: LinhaRanking[]; meuId: string; limite?: number }) {
  const ls = limite ? linhas.slice(0, limite) : linhas;
  return (
    <div className="overflow-x-auto">
      <table className="table" style={{ minWidth: 420 }}>
        <thead><tr><th scope="col">#</th><th scope="col">CRIADOR</th><th scope="col">VIEWS</th></tr></thead>
        <tbody>
          {ls.map((l, i) => {
            const eu = l.criadorId === meuId;
            return (
              <tr key={l.criadorId} style={eu ? { background: "var(--tint)" } : undefined}>
                <td className="num" style={{ fontSize: 20, color: i < 3 ? "var(--accent-text)" : "var(--muted)" }}>{i + 1}</td>
                <td>
                  <span className="flex items-center gap-2.5">
                    <Avatar foto={l.foto} nome={l.nome} tamanho={36} />
                    <span style={{ color: "var(--strong)", fontWeight: 600 }}>{l.nome}</span>
                    {eu && <span className="pill" style={{ background: "var(--gold)", color: "#0A0A0A", fontSize: 10 }}>VOCÊ</span>}
                  </span>
                </td>
                <td className="num" style={{ fontSize: 18, color: "var(--strong)" }}>{formatarNumero(l.views)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const ROTULO: Record<DiaCalendario["status"], string> = {
  postado: "Postado", reposto: "Reposto", nao_postado: "Não postado", a_repor: "Repor até domingo", folga: "Folga", hoje: "Postar hoje", a_postar: "Postar",
};
const CLASSE: Record<DiaCalendario["status"], string> = {
  postado: "cal-ok", reposto: "cal-ok", nao_postado: "cal-miss", a_repor: "cal-repor", folga: "cal-folga", hoje: "cal-hoje", a_postar: "cal-next",
};
const ICONE: Partial<Record<DiaCalendario["status"], string>> = { postado: "check", reposto: "check", nao_postado: "x", a_repor: "up", folga: "zz", hoje: "up" };

/** Mapa a gravar no dia: aparece nos dias de postagem de hoje em diante (e nos que ainda dá para repor). */
const MAPA_CURTO: Record<string, { emoji: string; nome: string }> = { "1v1": { emoji: "⭐", nome: "Onial 1v1" }, aim: { emoji: "🎯", nome: "Treino" } };

function Dia({ d, comRotulo = true, mapa }: { d: DiaCalendario; comRotulo?: boolean; mapa?: string }) {
  const m = mapa && ["hoje", "a_postar", "a_repor"].includes(d.status) ? MAPA_CURTO[mapa] : undefined;
  return (
    <div className={`cal-c ${CLASSE[d.status]}`}>
      <span className="num" style={{ fontSize: 18, color: "var(--fg)", lineHeight: 1 }}>{Number(d.data.slice(8))}</span>
      <span className="flex items-center gap-1" style={{ fontSize: 12, fontWeight: 600 }}>
        {ICONE[d.status] && <Icone nome={ICONE[d.status]!} tamanho={14} />}
        {comRotulo && <span className="cal-l">{ROTULO[d.status]}</span>}
      </span>
      {m && <span className="flex items-center gap-1 truncate" title={`Mapa: ${m.nome}`} style={{ fontSize: 11, fontWeight: 700, color: d.status === "hoje" ? "var(--accent-text)" : "var(--text2)" }}>{m.emoji}<span className="cal-l truncate">{m.nome}</span></span>}
    </div>
  );
}

export function Calendario({ dias, mapas }: { dias: DiaCalendario[]; mapas?: Record<number, string> }) {
  const vazios = diaDaSemana(dias[0].data) - 1;
  return (
    <div className="overflow-x-auto">
      <div className="cal">
        {DIAS_CURTOS.map((d) => <div key={d} style={{ fontSize: 11, letterSpacing: 1.2, color: "var(--muted)", padding: "0 4px" }}>{d}</div>)}
        {Array.from({ length: vazios }, (_, i) => <div key={`v${i}`} />)}
        {dias.map((d) => <Dia key={d.data} d={d} mapa={mapas?.[diaDaSemana(d.data)]} />)}
      </div>
    </div>
  );
}

export function SemanaAtual({ dias, hoje }: { dias: DiaCalendario[]; hoje: string }) {
  const seg = inicioDaSemanaHoje(hoje);
  const semana = dias.filter((d) => d.data >= seg).slice(0, 7);
  return (
    <div className="grid gap-2.5" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(110px,1fr))" }}>
      {semana.map((d) => (
        <div key={d.data} className={`cal-c ${CLASSE[d.status]}`} style={{ minHeight: 0, padding: 14 }}>
          <span style={{ fontSize: 12, color: "var(--muted)" }}>{DIAS_CURTOS[diaDaSemana(d.data) - 1]} {Number(d.data.slice(8))}{d.data === hoje ? " · hoje" : ""}</span>
          <span className="flex items-center gap-1.5" style={{ marginTop: 6, fontWeight: 600 }}>{ICONE[d.status] && <Icone nome={ICONE[d.status]!} tamanho={16} />}{ROTULO[d.status]}</span>
        </div>
      ))}
    </div>
  );
}

export function EmBreve({ icone, titulo, texto, fase }: { icone: string; titulo: string; texto: string; fase: string }) {
  return (
    <div className="flex flex-1 items-center justify-center" style={{ minHeight: "70vh" }}>
      <div className="flex flex-col items-center gap-4 text-center" style={{ maxWidth: 460 }}>
        <div className="flex items-center justify-center rounded-full" style={{ width: 84, height: 84, background: "var(--tint)", border: "1px solid var(--line2)", color: "var(--accent-text)", boxShadow: "0 0 40px rgba(232,176,20,.25)" }}><Icone nome={icone} tamanho={40} /></div>
        <span className="pill" style={{ background: "var(--gold)", color: "#0A0A0A", letterSpacing: 1.2 }}>EM BREVE · {fase}</span>
        <h1 className="h1 m-0" style={{ fontSize: 40 }}>{titulo}</h1>
        <p style={{ color: "var(--muted)", lineHeight: 1.6, margin: 0 }}>{texto}</p>
      </div>
    </div>
  );
}

/** Linha discreta: quando as views foram atualizadas e quando atualizam de novo. */
export function AvisoAtualizacao({ ultima }: { ultima: string | null }) {
  return (
    <div className="flex items-center gap-2" style={{ color: "var(--muted)", fontSize: 13 }}>
      <span style={{ color: "var(--accent-text)", display: "flex" }}><Icone nome="reset" tamanho={15} /></span>
      <span>
        {ultima ? <>Views atualizadas <b style={{ color: "var(--fg)", fontWeight: 600 }}>{quandoFoi(ultima)}</b></> : "Views ainda não atualizadas"}
        {" · "}próxima atualização <b style={{ color: "var(--fg)", fontWeight: 600 }}>{proximaColeta()}</b>
        <span title="O YouTube libera as views com 1 a 3 dias de atraso; o site completa esses dias nas próximas atualizações."> · YouTube com até 3 dias de atraso</span>
      </span>
    </div>
  );
}
