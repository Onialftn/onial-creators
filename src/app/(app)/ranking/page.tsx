import { Avatar } from "@/components/Avatar";
import { Cabecalho } from "@/components/Blocos";
import { Icone, LogoPlataforma, NOME_PLATAFORMA } from "@/components/Icone";
import { PLATAFORMAS, rankingDoMes, usuarioAtual, type LinhaRanking } from "@/lib/dados";
import { hojeBrasil, mesDe, nomeMes } from "@/lib/datas";
import { formatarNumero } from "@/lib/pagamento";

function Podio({ pos, l, altura, cor, eu }: { pos: number; l?: LinhaRanking; altura: number; cor: string; eu: boolean }) {
  if (!l) return <div style={{ flex: "1 1 0", minWidth: 0, maxWidth: 220 }} />;
  return (
    <div className="flex min-w-0 flex-col items-center gap-2" style={{ flex: "1 1 0", maxWidth: 220 }}>
      {pos === 1 ? <span style={{ color: "var(--accent-text)" }}><Icone nome="crown" tamanho={24} /></span> : <span style={{ height: 24 }} />}
      <Avatar foto={l.foto} nome={l.nome} tamanho={pos === 1 ? 72 : 56} borda={cor} />
      <div className="w-full min-w-0 text-center">
        <div className="truncate" style={{ color: "var(--strong)", fontWeight: 700, fontSize: 14 }}>{eu ? "Você" : l.nome}</div>
        <div className="num" style={{ fontSize: "clamp(15px, 4.6vw, 22px)", color: eu ? "var(--accent-text)" : "var(--strong)", lineHeight: 1.2 }}>{formatarNumero(l.views)}</div>
        <div style={{ color: "var(--muted)", fontSize: 11 }}>views no mês</div>
      </div>
      <div className="num flex w-full justify-center" style={{ height: `clamp(${Math.round(altura * 0.55)}px, ${(altura / 5).toFixed(1)}vw, ${altura}px)`, borderRadius: "6px 6px 0 0", background: `linear-gradient(180deg,${cor},#2A2208)`, paddingTop: 8, fontSize: "clamp(26px, 8vw, 40px)", color: pos === 1 ? "#0A0A0A" : "#fff" }}>{pos}</div>
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
      <section className="card flex items-end justify-center" style={{ paddingTop: 24, gap: "clamp(8px, 2.5vw, 16px)" }}>
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
