import { Cabecalho, Calendario, TituloCard } from "@/components/Blocos";
import { resumoDoMes, usuarioAtual } from "@/lib/dados";
import Link from "next/link";
import { CapaVideo } from "@/components/CapaVideo";
import { diaDaSemana, hojeBrasil, mesDe, nomeMes } from "@/lib/datas";
import { MAPAS, NOME_CURTO, mapasDasOpcoes } from "@/lib/ia/mapas";
import { maisCrescem, videosDosCanais, type VideoRef } from "@/lib/ideias";

export const maxDuration = 60;

const mil = (v: number) => (v >= 1e6 ? `${(v / 1e6).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mi` : v >= 1e3 ? `${Math.round(v / 1e3)} mil` : String(v));

export default async function DiasDePostagem() {
  const { sb, perfil } = await usuarioAtual();
  const mes = mesDe(hojeBrasil());
  const hoje = hojeBrasil();
  const [r, { data: mapaHoje }] = await Promise.all([
    resumoDoMes(sb, perfil.id, mes),
    sb.from("mapa_dia").select("mapa").eq("criador_id", perfil.id).eq("dia_semana", diaDaSemana(hoje)).maybeSingle(),
  ]);
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
