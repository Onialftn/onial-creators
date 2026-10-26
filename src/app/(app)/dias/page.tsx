import { Cabecalho, Calendario, TituloCard } from "@/components/Blocos";
import { resumoDoMes, usuarioAtual } from "@/lib/dados";
import Link from "next/link";
import { CapaVideo } from "@/components/CapaVideo";
import { enviarExtra } from "@/app/acoes/extras";
import { formatarReais } from "@/lib/pagamento";
import { textoPrazo } from "@/lib/prazo";
import { diaDaSemana, hojeBrasil, mesDe, nomeMes } from "@/lib/datas";
import { MAPAS, NOME_CURTO, mapasDasOpcoes } from "@/lib/ia/mapas";
import { maisCrescem, videosDosCanais, type VideoRef } from "@/lib/ideias";

export const maxDuration = 60;

const mil = (v: number) => (v >= 1e6 ? `${(v / 1e6).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mi` : v >= 1e3 ? `${Math.round(v / 1e3)} mil` : String(v));

export default async function DiasDePostagem({ searchParams }: { searchParams: Promise<{ ok?: string; erro?: string }> }) {
  const { ok, erro } = await searchParams;
  const { sb, perfil } = await usuarioAtual();
  const mes = mesDe(hojeBrasil());
  const hoje = hojeBrasil();
  const [r, { data: mapaHoje }, { data: extras }, { data: minhas }] = await Promise.all([
    resumoDoMes(sb, perfil.id, mes),
    sb.from("mapa_dia").select("mapa").eq("criador_id", perfil.id).eq("dia_semana", diaDaSemana(hoje)).maybeSingle(),
    sb.from("extras").select("id, titulo, descricao, valor_centavos, prazo").eq("ativo", true).gte("prazo", hoje).order("prazo"),
    sb.from("entregas_extra").select("extra_id, link, status, motivo").eq("criador_id", perfil.id),
  ]);
  const entrega = (id: string) => (minhas ?? []).find((e) => e.extra_id === id);
  // 3 opções de hoje pelo mapa do dia: mapa do dia, o outro mapa e o mapa do dia de novo (vídeos que mais crescem em Ideias & roteiros)
  const hojeDePostar = ["hoje", "postado", "reposto"].includes(r.calendario.find((d) => d.data === hoje)?.status ?? "") && !!mapaHoje?.mapa && MAPAS.some((m) => m.id === mapaHoje.mapa);
  const opcoes: { mapa: string; video: VideoRef | null }[] = [];
  if (hojeDePostar) {
    const ordem = mapasDasOpcoes(mapaHoje!.mapa);
    const listas = new Map<string, VideoRef[]>();
    for (const m of new Set(ordem)) {
      const { data: canais } = await sb.from("canais_referencia").select("canal_id").eq("mapa", m);
      try { listas.set(m, maisCrescem(await videosDosCanais((canais ?? []).map((c) => c.canal_id as string)))); } catch { listas.set(m, []); }
    }
    const usados = new Map<string, number>();
    for (const m of ordem) { const i = usados.get(m) ?? 0; usados.set(m, i + 1); opcoes.push({ mapa: m, video: listas.get(m)?.[i] ?? null }); }
  }
  const conta = (s: string[]) => r.calendario.filter((d) => s.includes(d.status)).length;
  const pct = r.diasAgendados ? Math.round((r.diasCumpridos / r.diasAgendados) * 100) : 0;
  const stats = [
    { n: r.diasCumpridos, t: "postados", c: "var(--ok)" },
    { n: r.faltas, t: r.faltas === 1 ? "falta" : "faltas", c: "var(--warn)" },
    { n: conta(["hoje", "a_postar", "a_repor"]), t: "faltam", c: "var(--accent-text)" },
    { n: conta(["folga"]), t: "folgas", c: "var(--muted)" },
  ];

  return (
    <>
      <Cabecalho titulo="Dias de postagem" sub="Seu mês inteiro: o que já foi postado, o que falta e as folgas. Siga todos os dias de postagem para ganhar +10% no valor bruto." />
      {ok && <div role="status" className="pill-ok" style={{ padding: "10px 14px", fontSize: 14 }}>{ok}</div>}
      {erro && <div role="alert" className="pill-warn" style={{ padding: "10px 14px", fontSize: 14 }}>{erro}</div>}

      {(extras ?? []).length > 0 && (
        <section id="extras" className="card flex flex-col gap-3">
          <TituloCard icone="wallet" direita="Faça, mande o link e ganhe o valor">Vídeos extras</TituloCard>
          {(extras ?? []).map((x) => {
            const e = entrega(x.id);
            return (
              <div key={x.id} className="flex flex-col gap-2.5" style={{ padding: 14, borderRadius: 8, background: "var(--bg)", border: `1px solid ${e?.status === "aprovado" ? "var(--ok)" : "#E8B014"}` }}>
                <div className="flex flex-wrap items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <b style={{ color: "var(--strong)", fontSize: 16 }}>{x.titulo}</b>
                    {(() => { const p = textoPrazo(x.prazo, hoje); return (
                      <div className="flex flex-wrap items-center gap-2" style={{ marginTop: 6 }}>
                        <span className="flex items-center gap-1.5" style={{ padding: "5px 10px", borderRadius: 6, fontSize: 14, fontWeight: 700, background: p.urgente ? "var(--warn)" : "#E8B014", color: "#0A0A0A" }}>⏰ {p.texto}</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: p.urgente ? "var(--warn)" : "var(--accent-text)" }}>{p.faltam}</span>
                      </div>
                    ); })()}
                  </div>
                  <span className="num" style={{ fontSize: 24, color: "var(--ok)" }}>+{formatarReais(x.valor_centavos)}</span>
                </div>
                {x.descricao && <p style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: 14, lineHeight: 1.45 }}>{x.descricao}</p>}
                {e?.status === "aprovado" ? (
                  <span className="pill-ok" style={{ alignSelf: "flex-start" }}>Aprovado: o valor entrou no seu total do mês</span>
                ) : (
                  <>
                    {e?.status === "enviado" && <span style={{ color: "var(--accent-text)", fontSize: 13 }}>Link enviado. Esperando o gestor aprovar.</span>}
                    {e?.status === "recusado" && <span style={{ color: "var(--warn)", fontSize: 13 }}>Não aprovado{e.motivo ? `: ${e.motivo}` : ""}. Você pode mandar outro link.</span>}
                    <form action={enviarExtra} className="flex flex-wrap gap-2">
                      <input type="hidden" name="extra" value={x.id} />
                      <input className="input" name="link" type="url" inputMode="url" defaultValue={e?.link ?? ""} placeholder="Link do vídeo que você postou" aria-label="Link do vídeo extra" style={{ flex: "1 1 220px", minHeight: 40 }} required />
                      <button className="btn-gold" type="submit" style={{ minHeight: 40 }}>{e ? "Mandar de novo" : "Mandar link"}</button>
                    </form>
                  </>
                )}
              </div>
            );
          })}
        </section>
      )}

      {hojeDePostar && (
        <section className="card flex flex-col gap-4">
          <TituloCard icone="video" direita={`Hoje é dia de ${NOME_CURTO[mapaHoje!.mapa]}`}>Opções de vídeo para hoje</TituloCard>
          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))" }}>
            {opcoes.map((o, i) => {
              const m = MAPAS.find((x) => x.id === o.mapa)!;
              return (
                <div key={i} className="flex min-w-0 flex-col gap-2" style={{ padding: 10, borderRadius: 8, background: "var(--bg)", border: `1px solid ${o.mapa === mapaHoje!.mapa ? "#E8B014" : "var(--line)"}` }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--accent-text)" }}>Opção {i + 1} · {m.emoji} {NOME_CURTO[o.mapa]}</span>
                  {o.video ? (
                    <>
                      <a href={`https://youtube.com/shorts/${o.video.id}`} target="_blank" rel="noreferrer" className="relative overflow-hidden" style={{ aspectRatio: "9/16", borderRadius: 6, background: "#111", display: "block" }} aria-label={`Assistir ${o.video.titulo}`}>
                        <CapaVideo src={o.video.capa} alt="" />
                        <span className="absolute inset-0" style={{ background: "linear-gradient(180deg,transparent 60%,rgba(0,0,0,.85))" }} />
                        <span className="num absolute" style={{ left: 8, bottom: 6, fontSize: 18, color: "#fff" }}>{mil(o.video.views)}</span>
                      </a>
                      <span style={{ color: "var(--strong)", fontSize: 13, fontWeight: 600, lineHeight: 1.3, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{o.video.titulo}</span>
                      <Link href={`/ideias?mapa=${o.mapa}`} style={{ fontSize: 12, color: "var(--accent-text)", textDecoration: "underline" }}>Copiar o roteiro em Ideias & roteiros</Link>
                    </>
                  ) : (
                    <span style={{ fontSize: 13, color: "var(--muted)" }}>Sem vídeo de referência agora. Veja em <Link href={`/ideias?mapa=${o.mapa}`} style={{ color: "var(--accent-text)", textDecoration: "underline" }}>Ideias & roteiros</Link>.</span>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="card flex flex-col gap-5">
        <TituloCard icone="cal" direita="5 dias de postagem e 2 de folga por semana">{nomeMes(mes)}</TituloCard>
        <div className="grid gap-2.5" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))" }}>
          {stats.map((s) => (
            <div key={s.t} className="tile"><div className="num" style={{ fontSize: 28, color: s.c, lineHeight: 1 }}>{s.n}</div><div style={{ color: "var(--muted)", fontSize: 13 }}>{s.t}</div></div>
          ))}
        </div>
        <div>
          <div className="flex justify-between" style={{ color: "var(--muted)", fontSize: 13 }}><span>{r.diasCumpridos} de {r.diasAgendados} dias de postagem cumpridos</span><span>{pct}%</span></div>
          <div className="bar" style={{ height: 10, marginTop: 8 }}><span style={{ width: `${pct}%`, background: "var(--ok)" }} /></div>
        </div>
        <Calendario dias={r.calendario} />
        <div className="flex flex-wrap gap-x-5 gap-y-2" style={{ color: "var(--muted)", fontSize: 12 }}>
          <span>Verde: postado ou reposto</span><span>Laranja: não postado</span><span>Tracejado laranja: repor até domingo</span><span>Dourado: hoje</span><span>Tracejado: folga</span>
        </div>
        <p style={{ margin: 0, fontSize: 13, color: r.faltas ? "var(--warn)" : "var(--muted)" }}>
          {r.faltas === 0 ? "Perdeu um dia? Poste em outro dia até domingo e ele conta como reposto." : r.faltas === 1 ? "1 falta no mês: o bônus de constância caiu para 5%. Mais uma e ele zera." : `${r.faltas} faltas no mês: sem bônus de constância.`}
        </p>
      </section>
    </>
  );
}
