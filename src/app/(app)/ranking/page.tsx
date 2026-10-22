import { Avatar } from "@/components/Avatar";
import { Cabecalho } from "@/components/Blocos";
import { Icone, LogoPlataforma, NOME_PLATAFORMA } from "@/components/Icone";
import { PLATAFORMAS, rankingDoMes, usuarioAtual, type LinhaRanking } from "@/lib/dados";
import { hojeBrasil, mesDe, nomeMes } from "@/lib/datas";
import { formatarNumero } from "@/lib/pagamento";

function Podio({ pos, l, altura, cor, eu }: { pos: number; l?: LinhaRanking; altura: number; cor: string; eu: boolean }) {
  if (!l) return <div style={{ flex: "1 1 160px" }} />;
  return (
    <div className="flex flex-col items-center gap-2.5" style={{ flex: "1 1 160px" }}>
      {pos === 1 ? <span style={{ color: "var(--accent-text)" }}><Icone nome="crown" tamanho={28} /></span> : <span style={{ height: 28 }} />}
      <Avatar foto={l.foto} nome={l.nome} tamanho={pos === 1 ? 84 : 68} borda={cor} />
      <div className="text-center">
        <div style={{ color: "var(--strong)", fontWeight: 700 }}>{eu ? "Você" : l.nome}</div>
        <div className="num" style={{ fontSize: 22, color: eu ? "var(--accent-text)" : "var(--strong)" }}>{formatarNumero(l.views)}</div>
        <div style={{ color: "var(--muted)", fontSize: 12 }}>views no mês</div>
      </div>
      <div className="num flex w-full justify-center" style={{ height: altura, borderRadius: "6px 6px 0 0", background: `linear-gradient(180deg,${cor},#2A2208)`, paddingTop: 12, fontSize: 40, color: pos === 1 ? "#0A0A0A" : "#fff" }}>{pos}</div>
    </div>
  );
}

export default async function Ranking() {
  const { sb, perfil } = await usuarioAtual();
  const mes = mesDe(hojeBrasil());
  const linhas = await rankingDoMes(sb, mes);
  const minhaPos = linhas.findIndex((l) => l.criadorId === perfil.id);
  const acima = minhaPos > 0 ? linhas[minhaPos - 1] : null;

  return (
    <>
      <Cabecalho icone="trophy" titulo="Ranking do mês" sub={`Quem mais gerou views na equipe em ${nomeMes(mes).toLowerCase()}. Só views, sem valores.`} />
      <section className="card flex flex-wrap items-end justify-center gap-4" style={{ paddingTop: 28 }}>
        <Podio pos={2} l={linhas[1]} altura={120} cor="#9AA4B5" eu={linhas[1]?.criadorId === perfil.id} />
        <Podio pos={1} l={linhas[0]} altura={170} cor="#E8B014" eu={linhas[0]?.criadorId === perfil.id} />
        <Podio pos={3} l={linhas[2]} altura={90} cor="#C26A3A" eu={linhas[2]?.criadorId === perfil.id} />
      </section>
      {acima && (
        <section className="card flex flex-wrap items-center gap-4" style={{ borderColor: "#E8B014" }}>
          <span className="flex items-center justify-center" style={{ width: 48, height: 48, borderRadius: 6, background: "#E8B014", color: "#0A0A0A" }}><Icone nome="target" tamanho={24} /></span>
          <div className="flex-1" style={{ color: "var(--strong)", fontWeight: 600, fontSize: 16 }}>Faltam {formatarNumero(acima.views - linhas[minhaPos].views + 1)} views para você passar o {minhaPos}º lugar</div>
        </section>
      )}
      <section className="card">
        <div className="overflow-x-auto">
          <table className="table" style={{ minWidth: 640 }}>
            <thead><tr><th scope="col">#</th><th scope="col">CRIADOR</th><th scope="col">VIEWS TOTAIS</th>{PLATAFORMAS.map((p) => <th key={p} scope="col"><span className="flex items-center gap-1.5"><LogoPlataforma p={p} tamanho={20} />{NOME_PLATAFORMA[p].toUpperCase()}</span></th>)}</tr></thead>
            <tbody>
              {linhas.map((l, i) => {
                const eu = l.criadorId === perfil.id;
                return (
                  <tr key={l.criadorId} style={eu ? { background: "var(--tint)", boxShadow: "inset 3px 0 0 #E8B014" } : undefined}>
                    <td className="num" style={{ fontSize: 20, color: i < 3 ? "var(--accent-text)" : "var(--muted)" }}>{i + 1}</td>
                    <td style={{ color: "var(--strong)", fontWeight: 600 }}><span className="flex items-center gap-2.5"><Avatar foto={l.foto} nome={l.nome} tamanho={36} />{eu ? `${l.nome} (você)` : l.nome}</span></td>
                    <td className="num" style={{ fontSize: 18, color: "var(--strong)" }}>{formatarNumero(l.views)}</td>
                    {PLATAFORMAS.map((p) => <td key={p} style={{ color: "var(--text2)", fontVariantNumeric: "tabular-nums" }}>{formatarNumero(l.porPlataforma[p])}</td>)}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
