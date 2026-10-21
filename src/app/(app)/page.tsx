import Link from "next/link";
import { redirect } from "next/navigation";
import { AvisoAtualizacao, CardsGanho, Cabecalho, MetaViews, RankingTabela, SemanaAtual, TituloCard } from "@/components/Blocos";
import { Pomodoro } from "@/components/Pomodoro";
import { rankingDoMes, resumoDoMes, ultimaColeta, usuarioAtual } from "@/lib/dados";
import { diasNoMes, hojeBrasil, mesDe, nomeMes } from "@/lib/datas";

export default async function Dashboard() {
  const { sb, perfil } = await usuarioAtual();
  if (perfil.papel === "gestor") redirect("/gestor");
  const mes = mesDe(hojeBrasil());
  const [r, ranking, ultima] = await Promise.all([resumoDoMes(sb, perfil.id, mes), rankingDoMes(sb, mes), ultimaColeta(sb, perfil.id)]);
  const restam = diasNoMes(mes) - Number(r.hoje.slice(8));

  return (
    <>
      <Cabecalho titulo={`Olá, ${perfil.nome.split(" ")[0]}`} sub={`${nomeMes(mes)} · o mês fecha em ${restam} ${restam === 1 ? "dia" : "dias"}`} />
      <AvisoAtualizacao ultima={ultima} />
      <CardsGanho r={r} />
      <MetaViews r={r} />
      <section className="card">
        <TituloCard icone="trophy" direita={`${nomeMes(mes)} · ordenado por views`}>Ranking do mês</TituloCard>
        <div style={{ marginTop: 16 }}><RankingTabela linhas={ranking} meuId={perfil.id} limite={5} /></div>
        <Link href="/ranking" style={{ display: "inline-block", marginTop: 12, color: "var(--accent-text)", fontSize: 13 }}>Ver ranking completo</Link>
      </section>
      <section className="card flex flex-col gap-4">
        <TituloCard icone="cal" direita={`5 dias de postagem e 2 de folga por semana · ${r.diasCumpridos} de ${r.diasAgendados} dias cumpridos no mês`}>Dias de postagem · esta semana</TituloCard>
        <SemanaAtual dias={r.calendario} hoje={r.hoje} />
      </section>
      <section className="flex justify-center"><Pomodoro /></section>
    </>
  );
}
