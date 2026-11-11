import Link from "next/link";
import { formatarNumero, formatarReais, inicioDaSemana as inicioDaSemanaHoje } from "@/lib/pagamento";
import { DIAS_CURTOS, diaDaSemana, proximaColeta, quandoFoi } from "@/lib/datas";
import type { DiaCalendario, LinhaRanking, ResumoMes } from "@/lib/dados";
import { Avatar } from "./Avatar";
import { Icone } from "./Icone";

/** Cores de medalha do 1º, 2º e 3º lugar: fixas, não mudam com o tema escolhido em Configurações. */
export const COR_POSICAO = ["var(--ouro-texto)", "var(--prata-texto)", "var(--bronze-texto)"];

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

/** gestor = quem está vendo é o gestor: o total aparece em dourado (para o criador, em verde). */
export function CardsGanho({ r, gestor = false }: { r: ResumoMes; gestor?: boolean }) {
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
          {!r.meta ? "O gestor ainda não definiu sua meta" : p.bateuMeta ? "Meta batida! O bônus já entrou no total ✅" : `Libera ao bater ${formatarNumero(r.meta)} views`}
        </div>
        {r.meta ? (() => {
          const pct = Math.min(100, (r.views / r.meta) * 100);
          return (
            <div style={{ marginTop: 12 }}>
              <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.floor(pct)} aria-label="Progresso da meta de views" style={{ height: 10, borderRadius: 5, background: "var(--track)", overflow: "hidden" }}>
                <div style={{ width: `${pct}%`, height: "100%", borderRadius: 5, background: p.bateuMeta ? "var(--ok)" : "linear-gradient(90deg,color-mix(in srgb, var(--gold) 72%, #000),var(--gold))", transition: "width .4s" }} />
              </div>
              <div className="flex justify-between" style={{ marginTop: 6, fontSize: 12, color: "var(--muted)" }}>
                <span className="num" style={{ fontSize: 14, color: p.bateuMeta ? "var(--ok)" : "var(--ouro-texto)" }}>{Math.floor(pct)}%</span>
                <span>{p.bateuMeta ? `${formatarNumero(r.views)} views` : `faltam ${formatarNumero(Math.max(0, r.meta - r.views))} views`}</span>
              </div>
            </div>
          );
        })() : null}
      </div>
      <div className="card" style={{ padding: 22 }}>
        <div className="flex items-center gap-2" style={{ color: "var(--muted)" }}><Icone nome="trophy" />Total do mês até agora</div>
        <div className="num" style={{ fontSize: 34, marginTop: 8, color: gestor ? "var(--ouro-texto)" : "var(--ok)" }}>{formatarReais(p.totalCentavos)}</div>
        <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 6 }}>{p.bateuMeta || !r.meta ? "Bruto + bônus conquistados" : `Sem o bônus de meta: +${formatarReais(Math.round(r.meta / 10))} quando bater`}</div>
        {p.bonusExtraCentavos > 0 && <div style={{ color: "var(--text2)", fontSize: 13, marginTop: 4, fontWeight: 600 }}>Inclui {formatarReais(p.bonusExtraCentavos)} de vídeos extras</div>}
        {p.ajudas > 0 && <div style={{ color: "var(--text2)", fontSize: 13, marginTop: 4, fontWeight: 600 }}>Inclui {formatarReais(p.bonusAjudaCentavos)} de {p.ajudas} {p.ajudas === 1 ? "gravação ajudada" : "gravações ajudadas"}</div>}
      </div>
    </section>
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
      {["hoje", "a_postar", "a_repor"].includes(d.status) && <span className="truncate" title="Mínimo de 1 vídeo neste dia. Um 2º vídeo repõe uma falta da semana (vídeo extra não conta)." style={{ fontSize: 11, color: d.status === "hoje" ? "var(--accent-text)" : "var(--muted)" }}>🎬 mín. 1<span className="cal-l"> vídeo</span></span>}
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


export function EmBreve({ icone, titulo, texto, fase }: { icone: string; titulo: string; texto: string; fase: string }) {
  return (
    <div className="flex flex-1 items-center justify-center" style={{ minHeight: "70vh" }}>
      <div className="flex flex-col items-center gap-4 text-center" style={{ maxWidth: 460 }}>
        <div className="flex items-center justify-center rounded-full" style={{ width: 84, height: 84, background: "var(--tint)", border: "1px solid var(--line2)", color: "var(--accent-text)", boxShadow: "0 0 40px color-mix(in srgb, var(--gold) 25%, transparent)" }}><Icone nome={icone} tamanho={40} /></div>
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

/** Dashboard (modelo A): meta do mês em poucas linhas. */
export function MetaCompacta({ r, restam }: { r: ResumoMes; restam: number }) {
  const pct = r.meta ? Math.min(100, (r.views / r.meta) * 100) : 0;
  const bateu = r.pagamento.bateuMeta;
  return (
    <section className="card flex flex-col" style={{ gap: 12 }}>
      <TituloCard icone="target">Meta de views</TituloCard>
      {!r.meta ? (
        <p style={{ margin: 0, color: "var(--muted)", fontSize: 14 }}>O gestor ainda não definiu sua meta deste mês.</p>
      ) : (
        <>
          <span className="num" style={{ fontSize: 30, color: "var(--strong)", lineHeight: 1 }}>
            {Math.floor(pct)}% <span style={{ fontSize: 16, color: "var(--muted)" }}>de {formatarNumero(r.meta)}</span>
          </span>
          <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.floor(pct)} aria-label="Progresso da meta de views" className="bar" style={{ height: 10 }}>
            <span style={{ width: `${pct}%`, background: bateu ? "var(--ok)" : "var(--gold)" }} />
          </div>
          <span style={{ fontSize: 13, color: bateu ? "var(--ok)" : "var(--muted)" }}>
            {bateu
              ? `Meta batida! +${formatarReais(r.pagamento.bonusMetaCentavos)} já entraram no total`
              : `Faltam ${formatarNumero(r.meta - r.views)} · cerca de ${formatarNumero(Math.ceil((r.meta - r.views) / Math.max(1, restam)))} por dia · bônus de ${formatarReais(Math.round(r.meta / 10))}`}
          </span>
        </>
      )}
    </section>
  );
}

/** Dashboard (modelo A): a semana em 7 bolinhas. */
/** Semana em bolinhas (pedido do dono): cinza = folga, amarelo = dia de postar, vermelho com X = falta, verde = feito. Cores fixas. */
const BOLA: Record<DiaCalendario["status"], string> = {
  postado: "bola-ok", reposto: "bola-ok", nao_postado: "bola-falta", a_repor: "bola-falta", folga: "bola-folga", hoje: "bola-postar-hoje", a_postar: "bola-postar",
};

export function SemanaBolinhas({ dias, hoje }: { dias: DiaCalendario[]; hoje: string }) {
  const seg = inicioDaSemanaHoje(hoje);
  const semana = dias.filter((d) => d.data >= seg).slice(0, 7);
  const deHoje = semana.find((d) => d.data === hoje)?.status;
  const frase = deHoje === "hoje" ? "Hoje é dia de postar" : deHoje === "folga" ? "Hoje é folga" : deHoje === "postado" || deHoje === "reposto" ? "Hoje já está postado" : "Sua semana";
  return (
    <section className="card flex flex-col" style={{ gap: 14 }}>
      <TituloCard icone="cal">Esta semana</TituloCard>
      <div className="grid gap-1.5" style={{ gridTemplateColumns: "repeat(7, minmax(0, 1fr))" }}>
        {semana.map((d) => (
          <div key={d.data} className="flex flex-col items-center gap-1.5" title={`${DIAS_CURTOS[diaDaSemana(d.data) - 1]} ${Number(d.data.slice(8))}: ${ROTULO[d.status]}`}>
            <span style={{ fontSize: 11, color: d.data === hoje ? "var(--accent-text)" : "var(--muted)", fontWeight: d.data === hoje ? 700 : 400 }}>{DIAS_CURTOS[diaDaSemana(d.data) - 1]}</span>
            <span className={`bola ${BOLA[d.status]}`} aria-label={ROTULO[d.status]}>
              {(d.status === "postado" || d.status === "reposto") && <Icone nome="check" tamanho={14} />}
              {(d.status === "nao_postado" || d.status === "a_repor") && <Icone nome="x" tamanho={14} />}
            </span>
          </div>
        ))}
      </div>
      <span style={{ fontSize: 13, color: "var(--muted)" }}>{frase} · cinza = folga · amarelo = postar · vermelho = falta · {semana.filter((d) => d.status === "postado" || d.status === "reposto").length} dias feitos</span>
    </section>
  );
}

/** Dashboard (modelo A): top 3 do ranking com a foto e o nome de cada criador; se você não estiver no top 3, aparece embaixo. */
export function RankingTop3({ linhas, meuId }: { linhas: LinhaRanking[]; meuId: string }) {
  const minha = linhas.findIndex((l) => l.criadorId === meuId);
  const mostrar = linhas.slice(0, 3).map((l, i) => ({ l, i }));
  if (minha >= 3) mostrar.push({ l: linhas[minha], i: minha });
  return (
    <section className="card flex flex-col" style={{ gap: 8 }}>
      <TituloCard icone="trophy">Ranking do mês</TituloCard>
      {mostrar.length === 0 && <p style={{ margin: 0, color: "var(--muted)", fontSize: 14 }}>Ninguém tem views neste mês ainda.</p>}
      {mostrar.map(({ l, i }) => {
        const eu = l.criadorId === meuId;
        return (
          <div key={l.criadorId} className="flex items-center gap-2.5" style={{ padding: "6px 8px", borderRadius: 8, background: eu ? "var(--tint)" : undefined, border: `1px solid ${eu ? "var(--gold)" : "transparent"}`, marginTop: i >= 3 ? 6 : 0 }}>
            <span className="num" style={{ width: 26, fontSize: 18, color: COR_POSICAO[i] ?? "var(--muted)" }}>{i + 1}º</span>
            <Avatar foto={l.foto} nome={l.nome} tamanho={34} borda={i === 0 ? "var(--ouro)" : undefined} />
            <span className="min-w-0 flex-1 truncate" style={{ color: "var(--strong)", fontWeight: eu ? 700 : 600, fontSize: 14 }}>{eu ? "Você" : l.nome.split(" ")[0]}</span>
            <span className="num" style={{ fontSize: 17, color: eu ? "var(--strong)" : "var(--text2)" }}>{formatarNumero(l.views)}</span>
          </div>
        );
      })}
      <Link href="/ranking" style={{ marginTop: "auto", paddingTop: 4, color: "var(--accent-text)", fontSize: 13 }}>Ver ranking completo</Link>
    </section>
  );
}
