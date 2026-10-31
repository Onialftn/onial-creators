import { enviarExtra } from "@/app/acoes/extras";
import { DIAS_CURTOS, diaDaSemana } from "@/lib/datas";
import { extrasPorDia, janelaExtra, ordemDoExtra, quandoExtra } from "@/lib/prazo";
import { Icone } from "./Icone";

export interface ExtraCriador { id: string; titulo: string; descricao: string; regras: string | null; valor_centavos: number; prazo: string }
export interface EntregaCriador { extra_id: string; link: string; status: string; motivo: string }

const valorCurto = (c: number) => (c % 100 === 0 ? `R$ ${(c / 100).toLocaleString("pt-BR")}` : `R$ ${(c / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`);
const diaCurto = (d: string) => { const n = DIAS_CURTOS[diaDaSemana(d) - 1]; return `${n.charAt(0)}${n.slice(1).toLowerCase()} ${d.slice(8)}/${d.slice(5, 7)}`; };
const regrasEmFrase = (r: string) => { const l = r.split(/\n+/).map((x) => x.replace(/^[-•*\d.)\s]+/, "").trim()).filter(Boolean); return l.length ? `${l.join("; ")}.`.replace(/[.;]\.$/, ".") : ""; };

const svg = (d: string, t = 18) => <svg width={t} height={t} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>;
const CADEADO = "M7 11V8a5 5 0 0 1 10 0v3M5 11h14v10H5z";
const ENVIAR = "M5 12h14M13 6l6 6-6 6";

function Linha({ x, e, hoje, i, comum }: { x: ExtraCriador; e?: EntregaCriador; hoje: string; i: number; comum: boolean }) {
  const j = janelaExtra(x.prazo, hoje);
  const ordem = ordemDoExtra(x);
  const aprovado = e?.status === "aprovado";
  const situacao = aprovado ? "Aprovado ✓" : e?.status === "enviado" ? "Esperando aprovação" : e?.status === "recusado" ? "Não aprovado: mande outro link" : ordem ? `${ordem}º vídeo do dia` : j.fase === "hoje" ? "Vale hoje" : "Agendado";
  const regras = regrasEmFrase(x.regras ?? "");
  return (
    <details className="linha-extra" style={{ borderTop: i ? "1px solid var(--line)" : undefined }} open={j.fase === "hoje" && !e ? true : undefined}>
      <summary className="flex items-center gap-2.5" style={{ minHeight: 60, padding: "8px 0", cursor: "pointer", listStyle: "none" }}>
        <span className="num flex flex-none items-center justify-center" style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(232,176,20,.12)", color: "var(--accent-text)", fontSize: 16 }}>{ordem ? `${ordem}º` : i + 1}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate" style={{ color: "var(--strong)", fontWeight: 600, fontSize: 15 }}>{x.titulo}</span>
          <span className="block truncate" style={{ fontSize: 12, color: aprovado ? "var(--ok)" : e?.status === "recusado" ? "var(--warn)" : "var(--muted)" }}>{situacao}</span>
        </span>
        <span className="num flex-none" style={{ fontSize: 16, color: "var(--ok)" }}>+{valorCurto(x.valor_centavos)}</span>
        <span className="flex flex-none items-center justify-center" style={{ width: 44, height: 44, borderRadius: 10, border: `1px solid ${aprovado ? "var(--ok)" : j.fase === "hoje" ? "#E8B014" : "var(--line2)"}`, background: j.fase === "hoje" && !aprovado ? "#E8B014" : "transparent", color: aprovado ? "var(--ok)" : j.fase === "hoje" ? "#0A0A0A" : "var(--muted)" }} aria-label={aprovado ? "Aprovado" : j.fase === "hoje" ? "Mandar link" : "Envio fechado até o dia"}>
          {aprovado ? <Icone nome="check" tamanho={18} /> : svg(j.fase === "hoje" ? ENVIAR : CADEADO)}
        </span>
      </summary>
      <div className="flex flex-col gap-2.5" style={{ padding: "0 0 14px 52px" }}>
        {((!comum && x.descricao) || regras) && <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>{!comum && x.descricao && <b style={{ color: "var(--strong)" }}>{x.descricao} </b>}{regras && <span style={{ color: "var(--text2)" }}>{regras}</span>}</p>}
        {e?.status === "recusado" && e.motivo && <span style={{ fontSize: 13, color: "var(--warn)" }}>Motivo: {e.motivo}</span>}
        {aprovado ? (
          <span style={{ fontSize: 13, color: "var(--ok)" }}>O valor entrou no seu total do mês.</span>
        ) : j.fase === "antes" ? (
          <span style={{ fontSize: 13, color: "var(--muted)" }}>Poste nesse dia. O envio do link abre às 00:00 de {diaCurto(x.prazo).toLowerCase()}.</span>
        ) : (
          <form action={enviarExtra} className="flex flex-wrap gap-2">
            <input type="hidden" name="extra" value={x.id} />
            <input className="input" name="link" type="url" inputMode="url" defaultValue={e?.link ?? ""} placeholder="Link do vídeo que você postou" aria-label="Link do vídeo extra" style={{ flex: "1 1 200px", minHeight: 42 }} required />
            <button className="btn-gold" type="submit" style={{ minHeight: 42 }}>{e ? "Mandar de novo" : "Mandar link"}</button>
          </form>
        )}
      </div>
    </details>
  );
}

/** Cabeçalho de um dia: "DOM 01/11 · Amanhã · 3 extras · até R$ 300". */
function CabecaDia({ dia, hoje, extras }: { dia: string; hoje: string; extras: ExtraCriador[] }) {
  const ehHoje = dia === hoje;
  const total = extras.reduce((a, x) => a + x.valor_centavos, 0);
  return (
    <span className="flex flex-1 flex-wrap items-center gap-2">
      <span className="num" style={{ padding: "3px 10px", borderRadius: 8, fontSize: 15, background: ehHoje ? "var(--ok)" : "#E8B014", color: "#0A0A0A", letterSpacing: 0.5 }}>{diaCurto(dia).toUpperCase()}</span>
      <span style={{ fontWeight: 700, fontSize: 14, whiteSpace: "nowrap", color: ehHoje ? "var(--ok)" : "var(--accent-text)" }}>{ehHoje ? "Hoje até 23:59" : quandoExtra(dia, hoje)}</span>
      <span style={{ fontSize: 13, color: "var(--muted)", whiteSpace: "nowrap" }}>· até <b className="num" style={{ color: "var(--ok)", fontSize: 14 }}>{valorCurto(total)}</b></span>
    </span>
  );
}

/** Descrição igual em todos os extras do dia: mostra uma vez só, embaixo do dia (as regras ficam em cada extra). */
function textoComum(extras: ExtraCriador[]) {
  return extras[0].descricao && extras.every((x) => x.descricao === extras[0].descricao) ? extras[0].descricao : null;
}

function Dia({ extras, hoje, entrega }: { extras: ExtraCriador[]; hoje: string; entrega: (id: string) => EntregaCriador | undefined }) {
  const comum = textoComum(extras);
  return (
    <>
      {comum && <p style={{ margin: "8px 0 2px", fontSize: 14, lineHeight: 1.5, color: "var(--strong)", fontWeight: 600 }}>{comum}</p>}
      <div>{extras.map((x, i) => <Linha key={x.id} x={x} e={entrega(x.id)} hoje={hoje} i={i} comum={!!comum} />)}</div>
    </>
  );
}

/** Vídeos extras do criador, separados por dia: o dia mais perto aberto, os outros dias fechados (toque para abrir). */
export function ExtrasCriador({ extras, entregas, hoje }: { extras: ExtraCriador[]; entregas: EntregaCriador[]; hoje: string }) {
  if (!extras.length) return null;
  const entrega = (id: string) => entregas.find((e) => e.extra_id === id);
  const dias = extrasPorDia(extras, hoje);
  const [primeiro, ...outros] = dias;
  return (
    <section id="extras" className="flex flex-col" style={{ borderRadius: 16, border: "1px solid rgba(232,176,20,.28)", background: "var(--panel)", padding: "16px 18px 14px" }}>
      <div className="flex items-center gap-3">
        <span style={{ color: "var(--accent-text)", display: "flex" }}><Icone nome="wallet" tamanho={22} /></span>
        <h2 className="h2 m-0 flex-1" style={{ fontSize: 18 }}>VÍDEOS EXTRAS</h2>
        <span style={{ padding: "3px 10px", borderRadius: 999, border: "1px solid var(--line2)", fontSize: 12, color: "var(--text2)" }}>{extras.length} {extras.length === 1 ? "extra" : "extras"} · {dias.length} {dias.length === 1 ? "dia" : "dias"}</span>
      </div>
      <div style={{ marginTop: 14, padding: "12px 14px 4px", borderRadius: 12, background: "var(--bg)", border: "1px solid var(--line)" }}>
        <CabecaDia dia={primeiro.dia} hoje={hoje} extras={primeiro.extras} />
        <Dia extras={primeiro.extras} hoje={hoje} entrega={entrega} />
      </div>
      {outros.map((d) => (
        <details key={d.dia} className="dia-extra" style={{ marginTop: 10, borderRadius: 12, border: "1px solid var(--line)", padding: "0 14px" }}>
          <summary className="flex items-center gap-2" style={{ minHeight: 52, cursor: "pointer", listStyle: "none" }}>
            <CabecaDia dia={d.dia} hoje={hoje} extras={d.extras} />
            <span className="chev flex-none" style={{ display: "flex", color: "var(--muted)", transition: "transform .2s" }}>{svg("M6 9l6 6 6-6", 18)}</span>
          </summary>
          <div style={{ paddingBottom: 4 }}><Dia extras={d.extras} hoje={hoje} entrega={entrega} /></div>
        </details>
      ))}
      <p style={{ margin: "10px 0 0", fontSize: 12, color: "var(--muted)" }}>Cada extra vale só no seu dia (00:00 às 23:59). O envio do link libera às 00:00 desse dia.</p>
    </section>
  );
}
