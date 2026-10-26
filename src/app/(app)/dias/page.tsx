import { Cabecalho, Calendario, TituloCard } from "@/components/Blocos";
import { resumoDoMes, usuarioAtual } from "@/lib/dados";
import { DIAS_NOMES, diaDaSemana, hojeBrasil, mesDe, nomeMes, somarDias } from "@/lib/datas";
import { OpcoesDoDia, type OpcaoVideo } from "@/components/VideosDoDia";

export default async function DiasDePostagem() {
  const { sb, perfil } = await usuarioAtual();
  const mes = mesDe(hojeBrasil());
  const hoje = hojeBrasil();
  const [r, { data: videos }] = await Promise.all([
    resumoDoMes(sb, perfil.id, mes),
    sb.from("videos_dia").select("dia, ordem, link, recado").eq("criador_id", perfil.id).gte("dia", hoje).lte("dia", somarDias(hoje, 13)).order("dia").order("ordem"),
  ]);
  const opcoes = (videos ?? []) as OpcaoVideo[];
  const diasComVideos = [...new Set(opcoes.map((v) => v.dia))];
  const nomeDia = (d: string) => (d === hoje ? "Hoje" : d === somarDias(hoje, 1) ? "Amanhã" : DIAS_NOMES[diaDaSemana(d) - 1]) + `, ${d.slice(8)}/${d.slice(5, 7)}`;
  const hojePosta = r.calendario.find((d) => d.data === hoje)?.status === "hoje";
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
      <section className="card flex flex-col gap-4">
        <TituloCard icone="video" direita="Escolha 1 das opções e poste">Vídeos para postar</TituloCard>
        {diasComVideos.length === 0 ? (
          <p style={{ margin: 0, color: "var(--muted)" }}>{hojePosta ? "Hoje é dia de postar, mas o gestor ainda não escolheu as opções de vídeo. Veja ideias em Ideias & roteiros." : "O gestor ainda não escolheu vídeos para os próximos dias."}</p>
        ) : (
          diasComVideos.map((d) => (
            <div key={d} className="flex flex-col gap-2.5">
              <b className="num" style={{ fontSize: 18, color: d === hoje ? "var(--accent-text)" : "var(--strong)" }}>{nomeDia(d)}</b>
              <OpcoesDoDia opcoes={opcoes.filter((o) => o.dia === d)} />
            </div>
          ))
        )}
      </section>

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
