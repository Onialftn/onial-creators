import { Cabecalho, Calendario, TituloCard } from "@/components/Blocos";
import { ExtrasCriador, type EntregaCriador, type ExtraCriador } from "@/components/ExtrasCriador";
import { resumoDoMes, usuarioAtual } from "@/lib/dados";
import { hojeBrasil, mesDe, nomeMes } from "@/lib/datas";

export default async function DiasDePostagem({ searchParams }: { searchParams: Promise<{ ok?: string; erro?: string }> }) {
  const { ok, erro } = await searchParams;
  const { sb, perfil } = await usuarioAtual();
  const mes = mesDe(hojeBrasil());
  const hoje = hojeBrasil();
  const [r, { data: extras }, { data: minhas }, { data: mapasDia }] = await Promise.all([
    resumoDoMes(sb, perfil.id, mes),
    sb.from("extras").select("id, titulo, descricao, regras, valor_centavos, prazo").eq("ativo", true).gte("prazo", hoje).order("prazo"),
    sb.from("entregas_extra").select("extra_id, link, status, motivo").eq("criador_id", perfil.id),
    sb.from("mapa_dia").select("dia_semana, mapa").eq("criador_id", perfil.id),
  ]);
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

      <ExtrasCriador extras={(extras ?? []) as ExtraCriador[]} entregas={(minhas ?? []) as EntregaCriador[]} hoje={hoje} />


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
        <Calendario dias={r.calendario} mapas={mapas} />
        <div className="flex flex-wrap gap-x-5 gap-y-2" style={{ color: "var(--muted)", fontSize: 12 }}>
          <span>Verde: postado ou reposto</span><span>Laranja: não postado</span><span>Tracejado laranja: repor até domingo</span><span>Dourado: hoje</span><span>⭐ Onial 1v1 · 🎯 Mapa de treino: mapa a gravar</span><span>Tracejado: folga</span>
        </div>
        <p style={{ margin: 0, fontSize: 13, color: r.faltas ? "var(--warn)" : "var(--muted)" }}>
          {r.faltas === 0 ? "Perdeu um dia? Poste em outro dia até domingo e ele conta como reposto." : r.faltas === 1 ? "1 falta no mês: o bônus de constância caiu para 5%. Mais uma e ele zera." : `${r.faltas} faltas no mês: sem bônus de constância.`}
        </p>
      </section>
    </>
  );
}
