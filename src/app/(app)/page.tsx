import Link from "next/link";
import { redirect } from "next/navigation";
import { AvisoAtualizacao, CardsGanho, Cabecalho, MetaViews, RankingTabela, SemanaAtual, TituloCard } from "@/components/Blocos";
import { GraficoMes } from "@/components/GraficoMes";
import { Pomodoro } from "@/components/Pomodoro";
import { rankingDoMes, resumoDoMes, ultimaColeta, usuarioAtual, viewsPorDia } from "@/lib/dados";
import { diasNoMes, hojeBrasil, mesAnterior, mesDe, nomeMes } from "@/lib/datas";

export default async function Dashboard() {
  const { sb, perfil } = await usuarioAtual();
  if (perfil.papel === "gestor") redirect("/gestor");
  const mes = mesDe(hojeBrasil());
  const antes = mesAnterior(mes);
  const [r, ranking, ultima, dias, diasAntes] = await Promise.all([resumoDoMes(sb, perfil.id, mes), rankingDoMes(sb, mes), ultimaColeta(sb, perfil.id), viewsPorDia(sb, perfil.id, mes), viewsPorDia(sb, perfil.id, antes)]);
  const restam = diasNoMes(mes) - Number(r.hoje.slice(8));
  // mesmo período do mês passado (dia 1 até o dia de hoje), para a comparação dos quadros do gráfico
  const diaHoje = r.hoje.slice(8);
  const periodoAntes = diasAntes.filter((d) => d.dia.slice(8) <= diaHoje);
  const somaAntes = (p: "tiktok" | "youtube" | "instagram") => periodoAntes.reduce((a, d) => a + d.por[p], 0);

  return (
    <>
      <Cabecalho titulo={`Olá, ${perfil.nome.split(" ")[0]}`} sub={`${nomeMes(mes)} · o mês fecha em ${restam} ${restam === 1 ? "dia" : "dias"}`} />
      <AvisoAtualizacao ultima={ultima} />
      <CardsGanho r={r} />
      <GraficoMes
        dias={dias.map((d) => ({ dia: d.dia, ...d.por }))}
        hoje={r.hoje}
        totalCentavos={r.pagamento.totalCentavos}
        anterior={{ tiktok: somaAntes("tiktok"), youtube: somaAntes("youtube"), instagram: somaAntes("instagram") }}
        nomeMesAnterior={nomeMes(antes).split(" ")[0].toLowerCase()}
      />
      <MetaViews r={r} />
      <section className="card">
        <TituloCard icone="trophy" direita={`${nomeMes(mes)} · ordenado por views`}>Ranking do mês</TituloCard>
        <div style={{ marginTop: 16 }}><RankingTabela linhas={ranking} meuId={perfil.id} limite={5} /></div>
        <Link href="/ranking" style={{ display: "inline-block", marginTop: 12, color: "var(--accent-text)", fontSize: 13 }}>Ver ranking completo</Link>
      </section>
      <section className="card flex flex-col gap-4">
        <TituloCard icone="cal" direita={`${r.diasPorSemana} dias de postagem e ${7 - r.diasPorSemana} de folga por semana · ${r.diasCumpridos} de ${r.diasAgendados} dias cumpridos no mês`}>Dias de postagem · esta semana</TituloCard>
        <SemanaAtual dias={r.calendario} hoje={r.hoje} />
      </section>
      <section className="flex justify-center"><Pomodoro /></section>
    </>
  );
}
