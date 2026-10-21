import { Cabecalho, Calendario, TituloCard } from "@/components/Blocos";
import { resumoDoMes, usuarioAtual } from "@/lib/dados";
import { hojeBrasil, mesDe, nomeMes } from "@/lib/datas";

export default async function DiasDePostagem() {
  const { sb, perfil } = await usuarioAtual();
  const mes = mesDe(hojeBrasil());
  const r = await resumoDoMes(sb, perfil.id, mes);
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
