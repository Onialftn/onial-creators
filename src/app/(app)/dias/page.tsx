import { Cabecalho, Calendario, TituloCard } from "@/components/Blocos";
import { ReporFaltas } from "@/components/ReporFaltas";
import { ExtrasCriador, type EntregaCriador, type ExtraCriador } from "@/components/ExtrasCriador";
import { resumoDoMes, usuarioAtual } from "@/lib/dados";
import { hojeBrasil, mesDe, nomeMes, somarDias } from "@/lib/datas";

export default async function DiasDePostagem({ searchParams }: { searchParams: Promise<{ ok?: string; erro?: string }> }) {
  const { ok, erro } = await searchParams;
  const { sb, perfil } = await usuarioAtual();
  const mes = mesDe(hojeBrasil());
  const hoje = hojeBrasil();
  const [r, { data: extras }, { data: minhas }, { data: mapasDia }, { data: agenda }] = await Promise.all([
    resumoDoMes(sb, perfil.id, mes),
    sb.from("extras").select("*").eq("ativo", true).gte("prazo", somarDias(hoje, -14)).order("prazo"),
    sb.from("entregas_extra").select("*").eq("criador_id", perfil.id).order("enviado_em", { ascending: false }),
    sb.from("mapa_dia").select("dia_semana, mapa").eq("criador_id", perfil.id),
    sb.from("agenda_postagem").select("dia_semana").eq("criador_id", perfil.id),
  ]);
  // extras de hoje em diante + extras no Pix que ainda esperam a chave ou a aprovação
  const pendentePix = new Set((minhas ?? []).filter((e) => e.status !== "aprovado" && e.status !== "recusado").map((e) => e.extra_id as string));
  const extrasVisiveis = (extras ?? []).filter((x) => x.prazo >= hoje || (x.pix && pendentePix.has(x.id)));
  const mapas = Object.fromEntries((mapasDia ?? []).map((m) => [m.dia_semana as number, m.mapa as string]));
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

      <ReporFaltas faltas={r.faltasParaRepor} hoje={hoje} diasDePostagem={(agenda ?? []).map((a) => a.dia_semana as number)} />

      <ExtrasCriador extras={extrasVisiveis as ExtraCriador[]} entregas={(minhas ?? []) as EntregaCriador[]} hoje={hoje} />


      <section className="card flex flex-col gap-5">
        <TituloCard icone="cal" direita={`${r.diasPorSemana} dias de postagem e ${7 - r.diasPorSemana} de folga por semana`}>{nomeMes(mes)}</TituloCard>
        <div className="grid gap-2.5" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))" }}>
          {stats.map((s) => (
            <div key={s.t} className="tile"><div className="num" style={{ fontSize: 28, color: s.c, lineHeight: 1 }}>{s.n}</div><div style={{ color: "var(--muted)", fontSize: 13 }}>{s.t}</div></div>
          ))}
        </div>
        <div>
          <div className="flex justify-between" style={{ color: "var(--muted)", fontSize: 13 }}><span>{r.diasCumpridos} de {r.diasAgendados} dias de postagem cumpridos</span><span>{pct}%</span></div>
          <div className="bar" style={{ height: 10, marginTop: 8 }}><span style={{ width: `${pct}%`, background: "var(--ok)" }} /></div>
        </div>
        <Calendario dias={r.calendario} mapas={mapas} />
        <div className="flex flex-wrap gap-x-5 gap-y-2" style={{ color: "var(--muted)", fontSize: 12 }}>
          <span>Verde: postado ou reposto</span><span>Laranja: não postado</span><span>Tracejado laranja: falta que ainda dá para repor</span><span>🔁 dia marcado para repor</span><span>Dourado: hoje</span><span>⭐ Onial 1v1 · 🎯 Mapa de treino: mapa a gravar</span><span>🎬 mín. 1 vídeo por dia de postagem (para repor uma falta, marque o dia em Repor faltas; vídeo extra não conta)</span><span>Tracejado: folga</span>
        </div>
        <p style={{ margin: 0, fontSize: 13, color: r.faltas ? "var(--warn)" : "var(--muted)" }}>
          {r.faltas === 0 ? "Perdeu um dia? Marque em Repor faltas um dia até 7 dias depois e poste 1 vídeo a mais nele." : r.faltas === 1 ? "1 falta no mês: o bônus de constância caiu para 5%. Mais uma e ele zera." : `${r.faltas} faltas no mês: sem bônus de constância.`}
        </p>
      </section>
    </>
  );
}
