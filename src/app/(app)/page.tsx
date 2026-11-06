import { redirect } from "next/navigation";
import { AvisoAtualizacao, Cabecalho, MetaCompacta, RankingTop3, SemanaBolinhas } from "@/components/Blocos";
import { GraficoMes, type LinhaConta } from "@/components/GraficoMes";
import { rankingDoMes, resumoDoMes, ultimaColeta, usuarioAtual, viewsPorDia } from "@/lib/dados";
import { diasNoMes, hojeBrasil, mesAnterior, mesDe, nomeMes } from "@/lib/datas";
import { formatarNumero, formatarReais } from "@/lib/pagamento";

/** Dashboard do criador: modelo A (escolhido pelo dono). Só informações rápidas. */
export default async function Dashboard() {
  const { sb, perfil } = await usuarioAtual();
  if (perfil.papel === "gestor") redirect("/gestor");
  const mes = mesDe(hojeBrasil());
  const antes = mesAnterior(mes);
  const [r, ranking, ultima, dias, diasAntes] = await Promise.all([resumoDoMes(sb, perfil.id, mes), rankingDoMes(sb, mes), ultimaColeta(sb, perfil.id), viewsPorDia(sb, perfil.id, mes), viewsPorDia(sb, perfil.id, antes)]);
  const diaHoje = Number(r.hoje.slice(8));
  const restam = diasNoMes(mes) - diaHoje;
  // mesmo período do mês passado (dia 1 até o dia de hoje), para as comparações
  const periodoAntes = diasAntes.filter((d) => Number(d.dia.slice(8)) <= diaHoje);
  const somaAntes = (p: "tiktok" | "youtube" | "instagram") => periodoAntes.reduce((a, d) => a + d.por[p], 0);

  // a conta do valor do mês, linha por linha
  const p = r.pagamento;
  const conta: LinhaConta[] = [
    { rotulo: "Bruto (R$ 5 a cada mil views)", valor: formatarReais(p.brutoCentavos) },
    { rotulo: `Constância ${Math.round(p.percentualConstancia * 100)}%`, valor: `+ ${formatarReais(p.constanciaCentavos)}`, apagado: p.constanciaCentavos === 0 },
    r.meta
      ? p.bateuMeta
        ? { rotulo: "Bônus de meta", valor: `+ ${formatarReais(p.bonusMetaCentavos)}` }
        : { rotulo: "Bônus de meta", valor: `ao bater ${formatarNumero(r.meta)}`, apagado: true }
      : { rotulo: "Bônus de meta", valor: "sem meta ainda", apagado: true },
    ...(p.bonusAjudaCentavos ? [{ rotulo: `Gravações (${p.ajudas})`, valor: `+ ${formatarReais(p.bonusAjudaCentavos)}` }] : []),
    ...(p.bonusExtraCentavos ? [{ rotulo: "Vídeos extras", valor: `+ ${formatarReais(p.bonusExtraCentavos)}` }] : []),
  ];

  return (
    <>
      <Cabecalho titulo={`Olá, ${perfil.nome.split(" ")[0]}`} sub={`${nomeMes(mes)} · o mês fecha em ${restam} ${restam === 1 ? "dia" : "dias"}`} />
      <AvisoAtualizacao ultima={ultima} />
      <GraficoMes
        dias={dias.map((d) => ({ dia: d.dia, ...d.por }))}
        hoje={r.hoje}
        totalCentavos={p.totalCentavos}
        conta={conta}
        anterior={{ tiktok: somaAntes("tiktok"), youtube: somaAntes("youtube"), instagram: somaAntes("instagram") }}
        nomeMesAnterior={nomeMes(antes).split(" ")[0].toLowerCase()}
      />
      <section className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))" }}>
        <MetaCompacta r={r} restam={restam + 1} />
        <SemanaBolinhas dias={r.calendario} hoje={r.hoje} />
        <RankingTop3 linhas={ranking} meuId={perfil.id} />
      </section>
    </>
  );
}
