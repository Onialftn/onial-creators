import Link from "next/link";
import { redirect } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { Cabecalho, TituloCard } from "@/components/Blocos";
import { Icone, LogoPlataforma, NOME_PLATAFORMA } from "@/components/Icone";
import { REDES } from "@/lib/coleta/redes";
import { resumoDoMes, usuarioAtual } from "@/lib/dados";
import { hojeBrasil, mesDe, nomeMes, quandoFoi } from "@/lib/datas";
import { inicioDoMes } from "@/lib/ia/uso";
import { formatarNumero, formatarReais } from "@/lib/pagamento";
import { coletarAgora } from "./acoes";
import { AbasGestor, Numero, Retorno } from "./comum";

export const maxDuration = 300;

export default async function PainelGestor({ searchParams }: { searchParams: Promise<{ ok?: string; erro?: string }> }) {
  const { sb, perfil } = await usuarioAtual();
  if (perfil.papel !== "gestor") redirect("/");
  const { ok, erro } = await searchParams;
  const hoje = hojeBrasil();
  const mes = mesDe(hoje);

  const { data: criadores } = await sb.from("perfis").select("id, nome, foto_url, recebe").eq("papel", "criador").order("nome");
  const lista = criadores ?? [];
  const [resumos, { data: contas }, { data: mapas }, { data: pags }, { data: usoIa }, ultima, { data: libs }, { count: extrasEsperando }] = await Promise.all([
    Promise.all(lista.map((cr) => resumoDoMes(sb, cr.id, mes))),
    sb.from("contas_plataforma").select("criador_id, plataforma, erro"),
    sb.from("mapa_dia").select("criador_id"),
    sb.from("pagamentos").select("criador_id, mes, total_centavos").eq("status", "em_aberto"),
    sb.from("uso_ia").select("custo_usd").gte("criado_em", inicioDoMes()).limit(5000),
    sb.from("contas_plataforma").select("ultima_coleta").not("ultima_coleta", "is", null).order("ultima_coleta", { ascending: false }).limit(1).maybeSingle(),
    sb.from("liberacoes").select("criador_id, rede, usuario").eq("liberado", false),
    sb.from("entregas_extra").select("extra_id", { count: "exact", head: true }).eq("status", "enviado"),
  ]);

  const viewsEquipe = resumos.reduce((a, r) => a + r.views, 0);
  // contas da própria Onial não recebem: ficam fora dos totais a pagar (o gasto com ferramentas continua contando)
  const recebe = (id: string) => lista.find((c) => c.id === id)?.recebe !== false;
  const totalMes = resumos.reduce((a, r, i) => a + (recebe(lista[i].id) ? r.pagamento.totalCentavos : 0), 0);
  const pagsReais = (pags ?? []).filter((p) => recebe(p.criador_id));
  const aPagar = pagsReais.reduce((a, p) => a + Number(p.total_centavos), 0);
  const custoIa = (usoIa ?? []).reduce((a, u) => a + Number(u.custo_usd), 0);
  const contaDe = (id: string, r: string) => (contas ?? []).find((c) => c.criador_id === id && c.plataforma === r);

  // o que precisa da atenção do gestor
  const atencao: { texto: string; link: string; nivel: "warn" | "info" }[] = [];
  lista.forEach((cr, i) => {
    const r = resumos[i];
    const primeiro = cr.nome.split(" ")[0];
    for (const rede of REDES) if (contaDe(cr.id, rede)?.erro) atencao.push({ texto: `${primeiro}: ${NOME_PLATAFORMA[rede]} com problema na coleta`, link: `/gestor/criador/${cr.id}`, nivel: "warn" });
    if (!r.meta) atencao.push({ texto: `${primeiro} está sem meta em ${nomeMes(mes).split(" ")[0].toLowerCase()}`, link: `/gestor/criador/${cr.id}#meta`, nivel: "warn" });
    if (!(mapas ?? []).some((m) => m.criador_id === cr.id)) atencao.push({ texto: `${primeiro} está sem mapa dos dias`, link: `/gestor/criador/${cr.id}#mapa`, nivel: "info" });
    if (r.aRepor > 0) atencao.push({ texto: `${primeiro} tem ${r.aRepor} ${r.aRepor === 1 ? "dia" : "dias"} para repor até domingo`, link: `/gestor/criador/${cr.id}#calendario`, nivel: "info" });
    if (!REDES.some((rede) => contaDe(cr.id, rede))) atencao.push({ texto: `${primeiro} ainda não conectou nenhuma rede`, link: `/gestor/criador/${cr.id}`, nivel: "info" });
  });
  if (extrasEsperando) atencao.unshift({ texto: `${extrasEsperando} ${extrasEsperando === 1 ? "vídeo extra" : "vídeos extras"} para aprovar`, link: "/gestor/extras", nivel: "warn" });
  for (const l of libs ?? []) {
    const cr = lista.find((x) => x.id === l.criador_id);
    atencao.unshift({ texto: `Liberar o ${l.rede === "instagram" ? "Instagram" : "TikTok"} de ${cr?.nome.split(" ")[0] ?? "um criador"} (@${l.usuario})`, link: "/gestor/config#liberar", nivel: "warn" });
  }
  for (const p of pagsReais) {
    const cr = lista.find((x) => x.id === p.criador_id);
    if (cr) atencao.push({ texto: `Pagar ${cr.nome.split(" ")[0]}: ${formatarReais(Number(p.total_centavos))} de ${nomeMes(String(p.mes)).toLowerCase()}`, link: `/gestor/criador/${cr.id}#pagamentos`, nivel: "warn" });
  }

  return (
    <>
      <Cabecalho icone="gear" titulo="Painel do gestor" sub={`${nomeMes(mes)} · ${lista.length} ${lista.length === 1 ? "criador" : "criadores"}${ultima.data ? ` · views atualizadas ${quandoFoi(String(ultima.data.ultima_coleta))}` : ""}`}
        direita={<form action={coletarAgora}><button className="btn-line" type="submit"><Icone nome="reset" tamanho={16} />Coletar views agora</button></form>} />
      <AbasGestor ativa="geral" />
      <Retorno ok={ok} erro={erro} />

      <section className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))" }}>
        <Numero rotulo="Views da equipe no mês" valor={formatarNumero(viewsEquipe)} sub="TikTok + YouTube + Instagram" />
        <Numero rotulo="Total a pagar no mês (até agora)" valor={formatarReais(totalMes)} sub={lista.some((c) => c.recebe === false) ? "Bruto + bônus (sem a conta da Onial)" : "Bruto + bônus de cada criador"} cor="var(--ok)" />
        <Numero rotulo="Meses fechados a pagar" valor={formatarReais(aPagar)} sub={pagsReais.length ? `${pagsReais.length} pagamento(s) em aberto` : "Nada em aberto"} cor={aPagar ? "var(--warn)" : undefined} />
        <Numero rotulo="Gasto com ferramentas no mês" valor={`US$ ${custoIa.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} sub="IA de toda a equipe, inclusive a Onial" />
      </section>

      <section className="card flex flex-col gap-3">
        <TituloCard icone="zap" direita={atencao.length ? `${atencao.length} ${atencao.length === 1 ? "item" : "itens"}` : undefined}>Precisa de atenção</TituloCard>
        {atencao.length === 0 ? (
          <p style={{ margin: 0, color: "var(--ok)" }}>Tudo em dia. 👌</p>
        ) : (
          <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))" }}>
            {atencao.map((a) => (
              <Link key={a.texto} href={a.link} className="flex items-center gap-2.5" style={{ padding: "10px 12px", borderRadius: 6, background: "var(--bg)", border: `1px solid ${a.nivel === "warn" ? "var(--warn)" : "var(--line)"}`, fontSize: 14 }}>
                <span style={{ width: 8, height: 8, borderRadius: 4, flex: "none", background: a.nivel === "warn" ? "var(--warn)" : "var(--accent-text)" }} />
                <span className="flex-1">{a.texto}</span>
                <span style={{ color: "var(--muted)" }}>›</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="card flex flex-col gap-4">
        <TituloCard icone="users" direita={<Link href="/gestor/config#cadastrar" style={{ color: "var(--accent-text)" }}>+ Cadastrar criador</Link>}>Criadores</TituloCard>
        <div className="overflow-x-auto">
          <table className="table" style={{ minWidth: 760 }}>
            <thead><tr>{["CRIADOR", "VIEWS", "META", "CONSTÂNCIA", "REDES", "TOTAL DO MÊS", ""].map((h) => <th key={h} scope="col">{h}</th>)}</tr></thead>
            <tbody>
              {lista.map((cr, i) => {
                const r = resumos[i];
                const pct = r.meta ? Math.min(100, Math.round((r.views / r.meta) * 100)) : null;
                return (
                  <tr key={cr.id}>
                    <td><Link href={`/gestor/criador/${cr.id}`} className="flex items-center gap-2.5" style={{ color: "var(--strong)", fontWeight: 600 }}><Avatar foto={cr.foto_url} nome={cr.nome} tamanho={32} />{cr.nome}</Link></td>
                    <td className="num" style={{ fontSize: 16, color: "var(--strong)" }}>{formatarNumero(r.views)}</td>
                    <td style={{ minWidth: 150 }}>
                      {pct === null ? <span style={{ color: "var(--warn)" }}>Sem meta</span> : (
                        <>
                          <div style={{ fontSize: 13 }}>{pct}% de {formatarNumero(r.meta!)}</div>
                          <div className="bar" style={{ height: 5, marginTop: 4 }}><span style={{ width: `${pct}%`, background: pct >= 100 ? "var(--ok)" : "#E8B014" }} /></div>
                        </>
                      )}
                    </td>
                    <td style={{ fontSize: 13 }}>
                      {r.faltas === 0 ? <span className="pill-ok">{r.aRepor ? `${r.aRepor} a repor` : "Em dia"}</span> : <span className="pill-warn">{r.faltas} {r.faltas === 1 ? "falta" : "faltas"}</span>}
                    </td>
                    <td>
                      <span className="flex items-center gap-1.5">
                        {REDES.map((rede) => {
                          const c = contaDe(cr.id, rede);
                          return <span key={rede} title={`${NOME_PLATAFORMA[rede]}: ${!c ? "não conectado" : c.erro ? "com problema" : "conectado"}`} style={{ opacity: c ? 1 : 0.25, position: "relative", display: "flex" }}><LogoPlataforma p={rede} tamanho={22} />{c?.erro && <span style={{ position: "absolute", right: -3, top: -3, width: 9, height: 9, borderRadius: 5, background: "var(--warn)", border: "2px solid var(--panel)" }} />}</span>;
                        })}
                      </span>
                    </td>
                    <td className="num" style={{ fontSize: 16, color: "var(--strong)" }}>{cr.recebe === false ? <span title="Conta da Onial: não entra no total a pagar" style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "var(--muted)", fontWeight: 400 }}>Conta da Onial</span> : formatarReais(r.pagamento.totalCentavos)}</td>
                    <td><Link className="btn-line" href={`/gestor/criador/${cr.id}`} style={{ minHeight: 36 }}>Abrir</Link></td>
                  </tr>
                );
              })}
              {lista.length === 0 && <tr><td colSpan={7} style={{ color: "var(--muted)" }}>Nenhum criador ainda. <Link href="/gestor/config#cadastrar" style={{ color: "var(--accent-text)" }}>Cadastre o primeiro</Link>.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
