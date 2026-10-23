import { Cabecalho } from "@/components/Blocos";
import { resumoDoMes, usuarioAtual } from "@/lib/dados";
import { hojeBrasil, mesDe, nomeMes } from "@/lib/datas";
import { formatarNumero, formatarReais } from "@/lib/pagamento";

export default async function Pagamentos() {
  const { sb, perfil } = await usuarioAtual();
  const mes = mesDe(hojeBrasil());
  const [{ data }, atual] = await Promise.all([
    sb.from("pagamentos").select("*").eq("criador_id", perfil.id).order("mes", { ascending: false }),
    resumoDoMes(sb, perfil.id, mes),
  ]);
  const fechados = (data ?? []).filter((p) => p.mes !== mes);
  const linhas = [
    { mes, views: atual.views, bruto: atual.pagamento.brutoCentavos, constancia: atual.pagamento.constanciaCentavos, meta: atual.pagamento.bonusMetaCentavos, ajuda: atual.pagamento.bonusAjudaCentavos, total: atual.pagamento.totalCentavos, status: "andamento" as const },
    ...fechados.map((p) => ({ mes: p.mes as string, views: Number(p.views), bruto: Number(p.bruto_centavos), constancia: Number(p.constancia_centavos), meta: Number(p.bonus_meta_centavos), ajuda: Number(p.bonus_ajuda_centavos ?? 0), total: Number(p.total_centavos), status: p.status as "em_aberto" | "pago" })),
  ];
  const pill = (s: (typeof linhas)[number]["status"]) => (s === "pago" ? <span className="pill-ok">Pago</span> : s === "em_aberto" ? <span className="pill-warn">A pagar</span> : <span className="pill-tint">Mês em andamento</span>);

  return (
    <>
      <Cabecalho icone="wallet" titulo="Pagamentos" sub="Seu extrato mês a mês. O mês atual muda conforme as views chegam; o gestor fecha o valor depois do fim do mês." />
      <section className="card">
        <div className="overflow-x-auto">
          <table className="table" style={{ minWidth: 760 }}>
            <thead><tr>{["MÊS", "VIEWS", "BRUTO", "CONSTÂNCIA", "META", "AJUDA", "TOTAL", "STATUS"].map((h) => <th key={h} scope="col">{h}</th>)}</tr></thead>
            <tbody>
              {linhas.map((l) => (
                <tr key={l.mes} style={{ fontVariantNumeric: "tabular-nums" }}>
                  <td style={{ color: "var(--strong)", fontWeight: 600, whiteSpace: "nowrap" }}>{nomeMes(l.mes)}</td>
                  <td>{formatarNumero(l.views)}</td>
                  <td>{formatarReais(l.bruto)}</td>
                  <td>{l.constancia ? formatarReais(l.constancia) : "—"}</td>
                  <td>{l.meta ? formatarReais(l.meta) : "—"}</td>
                  <td>{l.ajuda ? formatarReais(l.ajuda) : "—"}</td>
                  <td style={{ color: "var(--strong)", fontWeight: 600 }}>{formatarReais(l.total)}</td>
                  <td>{pill(l.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
