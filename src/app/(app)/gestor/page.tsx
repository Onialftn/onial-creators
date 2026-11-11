import Link from "next/link";
import { redirect } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { Cabecalho, TituloCard } from "@/components/Blocos";
import { GraficoEquipe } from "@/components/GraficoMes";
import { Icone, LogoPlataforma, NOME_PLATAFORMA } from "@/components/Icone";
import { REDES } from "@/lib/coleta/redes";
import { resumoDoMes, usuarioAtual, viewsPorDia } from "@/lib/dados";
import { diasNoMes, hojeBrasil, mesAnterior, mesDe, nomeMes, quandoFoi } from "@/lib/datas";
import { inicioDoMes } from "@/lib/ia/uso";
import { formatarNumero, formatarReais } from "@/lib/pagamento";
import { coletarAgora } from "./acoes";
import { AbasGestor, Retorno } from "./comum";

export const maxDuration = 300;

export default async function PainelGestor({ searchParams }: { searchParams: Promise<{ ok?: string; erro?: string }> }) {
  const { sb, perfil } = await usuarioAtual();
  if (perfil.papel !== "gestor") redirect("/");
  const { ok, erro } = await searchParams;
  const hoje = hojeBrasil();
  const mes = mesDe(hoje);

  const { data: criadores } = await sb.from("perfis").select("id, nome, foto_url, recebe").eq("papel", "criador").order("nome");
  const lista = criadores ?? [];
  const antes = mesAnterior(mes);
  const [resumos, diasCriadores, diasAntes, { data: contas }, { data: mapas }, { data: pags }, { data: usoIa }, ultima, { data: libs }, { count: extrasEsperando }] = await Promise.all([
    Promise.all(lista.map((cr) => resumoDoMes(sb, cr.id, mes))),
    Promise.all(lista.map((cr) => viewsPorDia(sb, cr.id, mes))),
    Promise.all(lista.map((cr) => viewsPorDia(sb, cr.id, antes))),
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

  // views da equipe em cada dia (o dia de hoje só entra quando já tem views) e o mesmo período do mês passado
  const somaDia = (d: { por: Record<string, number> }) => d.por.tiktok + d.por.youtube + d.por.instagram;
  const porDia = new Map<string, number>();
  for (const dc of diasCriadores) for (const d of dc) porDia.set(d.dia, (porDia.get(d.dia) ?? 0) + somaDia(d));
  const diasGrafico = [...porDia.entries()].sort(([a], [b]) => a.localeCompare(b)).filter(([dia, v]) => dia < hoje || (dia === hoje && v > 0));
  const diaHoje = Number(hoje.slice(8));
  const viewsAntes = diasAntes.flat().filter((d) => Number(d.dia.slice(8)) <= diaHoje).reduce((a, d) => a + somaDia(d), 0);
  const deltaEquipe = viewsAntes > 0 ? Math.round(((viewsEquipe - viewsAntes) / viewsAntes) * 100) : null;
  const restam = diasNoMes(mes) - diaHoje;

  // de onde vem o dinheiro do mês (só quem recebe; a conta da Onial fica fora)
  const somaPag = (f: (p: (typeof resumos)[number]["pagamento"]) => number) => resumos.reduce((a, r, i) => a + (recebe(lista[i].id) ? f(r.pagamento) : 0), 0);
  const partes = [
    { nome: "Bruto (views)", valor: somaPag((p) => p.brutoCentavos), cor: "var(--cat-1)" },
    { nome: "Constância", valor: somaPag((p) => p.constanciaCentavos), cor: "var(--cat-2)" },
    { nome: "Metas batidas", valor: somaPag((p) => p.bonusMetaCentavos), cor: "var(--cat-3)" },
    { nome: "Gravações", valor: somaPag((p) => p.bonusAjudaCentavos), cor: "var(--cat-4)" },
    { nome: "Vídeos extras", valor: somaPag((p) => p.bonusExtraCentavos), cor: "var(--cat-5)" },
  ];

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
      <Cabecalho icone="crown" titulo="Painel do gestor" sub={`${nomeMes(mes)} · o mês fecha em ${restam} ${restam === 1 ? "dia" : "dias"} · ${lista.length} ${lista.length === 1 ? "criador" : "criadores"}${ultima.data ? ` · views atualizadas ${quandoFoi(String(ultima.data.ultima_coleta))}` : ""}`}
        direita={<form action={coletarAgora}><button className="btn-line" type="submit"><Icone nome="reset" tamanho={16} />Coletar views agora</button></form>} />
      <AbasGestor ativa="geral" />
      <Retorno ok={ok} erro={erro} />

      {atencao.length === 0 ? (
        <div className="pill-ok" style={{ padding: "10px 14px", fontSize: 14 }}><Icone nome="check" tamanho={16} />Tudo em dia, nenhum aviso.</div>
      ) : (
        <section aria-label="Avisos" className="flex flex-wrap items-center gap-2" style={{ padding: "10px 14px", borderRadius: 12, background: "var(--warn-bg)", border: "1px solid var(--warn-line)" }}>
          <span style={{ fontWeight: 700, fontSize: 13, color: "var(--warn)", marginRight: 4 }}>{atencao.length} {atencao.length === 1 ? "aviso" : "avisos"}:</span>
          {atencao.map((a) => (
            <Link key={a.texto} href={a.link} className="flex items-center gap-1.5" style={{ minHeight: 32, padding: "0 12px", borderRadius: 999, background: "var(--bg)", border: `1px solid ${a.nivel === "warn" ? "var(--warn-line)" : "var(--line)"}`, fontSize: 13, color: a.nivel === "warn" ? "var(--fg)" : "var(--text2)" }}>
              {a.nivel === "warn" && <span style={{ width: 7, height: 7, borderRadius: 4, background: "var(--warn)" }} />}{a.texto}
            </Link>
          ))}
        </section>
      )}

      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,420px),1fr))" }}>
        <GraficoEquipe dias={diasGrafico.map(([d]) => d)} valores={diasGrafico.map(([, v]) => v)} total={viewsEquipe} delta={deltaEquipe} nomeMesAnterior={nomeMes(antes).split(" ")[0].toLowerCase()} />

        <section className="card flex flex-col" style={{ gap: 14 }}>
          <div className="flex flex-col" style={{ gap: 4 }}>
            <span style={{ fontSize: 13, color: "var(--muted)" }}>Dinheiro do mês (até agora)</span>
            <span className="num" style={{ fontSize: 40, color: "var(--ouro-texto)", lineHeight: 1 }}>{formatarReais(totalMes)}</span>
            {lista.some((c) => c.recebe === false) && <span style={{ fontSize: 12, color: "var(--muted)" }}>sem a conta da Onial</span>}
          </div>
          {totalMes > 0 && (
            <div className="flex" style={{ gap: 2, height: 18 }} role="img" aria-label={`De onde vem o dinheiro: ${partes.filter((x) => x.valor).map((x) => `${x.nome} ${formatarReais(x.valor)}`).join(", ")}`}>
              {partes.filter((x) => x.valor > 0).map((x, i, arr) => (
                <span key={x.nome} title={`${x.nome}: ${formatarReais(x.valor)}`} style={{ flex: x.valor, background: x.cor, borderRadius: `${i === 0 ? 5 : 0}px ${i === arr.length - 1 ? 5 : 0}px ${i === arr.length - 1 ? 5 : 0}px ${i === 0 ? 5 : 0}px` }} />
              ))}
            </div>
          )}
          <div className="flex flex-col" style={{ gap: 8, fontSize: 13 }}>
            {partes.map((x) => (
              <div key={x.nome} className="flex justify-between gap-3">
                <span className="flex items-center gap-2" style={{ color: "var(--muted)" }}><span style={{ width: 10, height: 10, borderRadius: 3, background: x.cor, flex: "none" }} />{x.nome}</span>
                <span style={{ color: x.valor ? "var(--strong)" : "var(--muted)", fontWeight: x.valor ? 600 : 400 }}>{formatarReais(x.valor)}</span>
              </div>
            ))}
            <div className="flex justify-between gap-3" style={{ paddingTop: 8, borderTop: "1px solid var(--line)" }}>
              <span style={{ color: "var(--muted)" }}>Meses fechados a pagar{pagsReais.length ? ` (${pagsReais.length})` : ""}</span>
              <span style={{ color: aPagar ? "var(--warn)" : "var(--muted)", fontWeight: 700 }}>{formatarReais(aPagar)}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span style={{ color: "var(--muted)" }}>Gasto com ferramentas (IA)</span>
              <span style={{ color: "var(--text2)" }}>US$ {custoIa.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>
        </section>
      </div>

      <section className="card flex flex-col gap-2">
        <TituloCard icone="users" direita={<span className="flex flex-wrap items-center gap-3" style={{ fontSize: 12 }}><span style={{ color: "var(--muted)" }}>barra cheia = meta batida</span><Link href="/gestor/config#cadastrar" style={{ color: "var(--accent-text)", fontSize: 14 }}>+ Cadastrar criador</Link></span>}>Criadores</TituloCard>
        {lista.length === 0 && <p style={{ margin: 0, color: "var(--muted)" }}>Nenhum criador ainda. <Link href="/gestor/config#cadastrar" style={{ color: "var(--accent-text)" }}>Cadastre o primeiro</Link>.</p>}
        <div className="flex flex-col">
          {lista.map((cr, i) => {
            const r = resumos[i];
            const bateu = r.meta !== null && r.views >= r.meta;
            return (
              <Link key={cr.id} href={`/gestor/criador/${cr.id}`} className="linha-criador" aria-label={`Abrir ${cr.nome}`}>
                <span className="flex min-w-0 items-center gap-2.5">
                  <Avatar foto={cr.foto_url} nome={cr.nome} tamanho={32} />
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate" style={{ color: "var(--strong)", fontWeight: 600 }}>{cr.nome}</span>
                    <span className="flex items-center gap-1">
                      {REDES.map((rede) => {
                        const c = contaDe(cr.id, rede);
                        return <span key={rede} title={`${NOME_PLATAFORMA[rede]}: ${!c ? "não conectado" : c.erro ? "com problema" : "conectado"}`} style={{ opacity: c ? 1 : 0.25, position: "relative", display: "flex" }}><LogoPlataforma p={rede} tamanho={14} />{c?.erro && <span style={{ position: "absolute", right: -2, top: -2, width: 6, height: 6, borderRadius: 3, background: "var(--warn)" }} />}</span>;
                      })}
                    </span>
                  </span>
                </span>
                <span className="trilho-meta" title={r.meta ? `${formatarNumero(r.views)} de ${formatarNumero(r.meta)} (${Math.round((r.views / r.meta) * 100)}%)` : "Sem meta"}>
                  <span style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${r.meta ? Math.min(r.views / r.meta, 1) * 100 : 0}%`, borderRadius: 4, background: bateu ? "var(--ok)" : "var(--gold)" }} />
                </span>
                <span className="flex flex-col items-end">
                  <span className="num" style={{ fontSize: 17, color: "var(--strong)" }}>{formatarNumero(r.views)}</span>
                  <span style={{ fontSize: 11, color: r.meta ? (bateu ? "var(--ok)" : "var(--muted)") : "var(--warn)" }}>{r.meta ? `${Math.round((r.views / r.meta) * 100)}% da meta` : "sem meta"}</span>
                </span>
                <span>{r.faltas === 0 ? <span className="pill-ok">{r.aRepor ? `${r.aRepor} a repor` : "Em dia"}</span> : <span className="pill-warn">{r.faltas} {r.faltas === 1 ? "falta" : "faltas"}</span>}</span>
                <span className="num" style={{ fontSize: 17, textAlign: "right", color: cr.recebe === false ? "var(--muted)" : "var(--ouro-texto)" }}>{cr.recebe === false ? <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12 }}>Conta da Onial</span> : formatarReais(r.pagamento.totalCentavos)}</span>
              </Link>
            );
          })}
        </div>
      </section>
    </>
  );
}
