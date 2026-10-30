import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { Cabecalho, Calendario, CardsGanho, TituloCard } from "@/components/Blocos";
import { Icone, LogoPlataforma, NOME_PLATAFORMA } from "@/components/Icone";
import { REDES } from "@/lib/coleta/redes";
import { PLATAFORMAS, resumoDoMes, usuarioAtual } from "@/lib/dados";
import { DIAS_NOMES, hojeBrasil, mesAnterior, mesDe, nomeMes, quandoFoi } from "@/lib/datas";
import { MAPAS } from "@/lib/ia/mapas";
import { ultimosVideos } from "@/lib/seo-canal";
import { formatarNumero, formatarReais } from "@/lib/pagamento";
import { fecharMes, lancarViews, marcarPago, registrarDia, salvarAgenda, salvarMapasDia, salvarMeta, salvarRecebe, renomearCriador, zerarRede } from "../../acoes";
import { AbasGestor, Retorno } from "../../comum";

export const maxDuration = 60;

/** "qui, 30/10 às 18:05" (horário de Brasília) */
const quandoPostou = (iso: string) => {
  const d = new Date(iso);
  const dia = d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" }).replace(".", "");
  const hora = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
  return `Postado ${dia} às ${hora}`;
};


export default async function CriadorGestor({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; erro?: string }> }) {
  const { sb, perfil } = await usuarioAtual();
  if (perfil.papel !== "gestor") redirect("/");
  const { id } = await params;
  const { ok, erro } = await searchParams;
  const { data: cr } = await sb.from("perfis").select("id, nome, foto_url, canal_youtube, recebe").eq("id", id).eq("papel", "criador").maybeSingle();
  if (!cr) notFound();

  const hoje = hojeBrasil();
  const mes = mesDe(hoje);
  const [r, { data: agenda }, { data: pags }, { data: mapas }, { data: contas }] = await Promise.all([
    resumoDoMes(sb, id, mes),
    sb.from("agenda_postagem").select("dia_semana").eq("criador_id", id),
    sb.from("pagamentos").select("*").eq("criador_id", id).order("mes", { ascending: false }),
    sb.from("mapa_dia").select("dia_semana, mapa").eq("criador_id", id),
    sb.from("contas_plataforma").select("plataforma, nome_conta, ultima_coleta, erro").eq("criador_id", id),
  ]);
  const recentes = await ultimosVideos(id).catch(() => "erro" as const);
  const dias = new Set((agenda ?? []).map((a) => a.dia_semana as number));
  const fechados = new Set((pags ?? []).map((p) => p.mes as string));

  return (
    <>
      <Link href="/gestor" style={{ color: "var(--muted)", fontSize: 14 }}>‹ Voltar para a visão geral</Link>
      <Cabecalho titulo={cr.nome} sub={`${nomeMes(mes)} · ${cr.canal_youtube ? `canal ${cr.canal_youtube}` : "Criador de conteúdo"}`} direita={<Avatar foto={cr.foto_url} nome={cr.nome} tamanho={56} />} />
      <details style={{ fontSize: 13 }}>
        <summary style={{ cursor: "pointer", color: "var(--accent-text)", width: "fit-content" }}>Corrigir nome</summary>
        <form action={renomearCriador} className="flex flex-wrap items-center gap-2" style={{ marginTop: 8 }}>
          <input type="hidden" name="criador" value={id} />
          <input className="input" name="nome" defaultValue={cr.nome} maxLength={60} aria-label="Nome do criador" style={{ minHeight: 38, maxWidth: 260 }} required />
          <button className="btn-gold" type="submit" style={{ minHeight: 38 }}>Salvar nome</button>
        </form>
      </details>
      <form action={salvarRecebe} className="flex flex-wrap items-center gap-3" style={{ fontSize: 13, color: "var(--muted)" }}>
        <input type="hidden" name="criador" value={id} /><input type="hidden" name="propria" value={cr.recebe === false ? "0" : "1"} />
        {cr.recebe === false ? <span className="pill-tint">Conta da Onial · não entra no total a pagar</span> : <span>Recebe pagamento normalmente.</span>}
        <button type="submit" style={{ textDecoration: "underline", color: "var(--text2)" }}>{cr.recebe === false ? "Voltar a pagar esta conta" : "Marcar como conta da Onial (não recebe)"}</button>
      </form>
      <AbasGestor ativa="criador" />
      <Retorno ok={ok} erro={erro} />

      <CardsGanho r={r} />

      <section className="card flex flex-col gap-3">
        <TituloCard icone="video" direita={<span style={{ fontSize: 12 }}>YouTube · atualiza a cada 30 min</span>}>Últimos vídeos</TituloCard>
        {recentes === null && <p style={{ margin: 0, color: "var(--muted)" }}>O YouTube dele não está conectado.</p>}
        {recentes === "erro" && <p style={{ margin: 0, color: "var(--muted)" }}>Não consegui ler o canal agora. Tente de novo mais tarde.</p>}
        {Array.isArray(recentes) && recentes.length === 0 && <p style={{ margin: 0, color: "var(--muted)" }}>Nenhum vídeo no canal ainda.</p>}
        {Array.isArray(recentes) && recentes.length > 0 && (
          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))" }}>
            {recentes.map((v) => (
              <a key={v.id} href={`https://www.youtube.com/shorts/${v.id}`} target="_blank" rel="noreferrer" className="tile flex gap-3" style={{ alignItems: "flex-start" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={v.capa} alt="" width={72} height={96} style={{ width: 72, height: 96, objectFit: "cover", borderRadius: 6, flex: "none", background: "var(--bg)" }} />
                <div className="min-w-0 flex flex-col gap-1.5">
                  <div style={{ color: "var(--strong)", fontWeight: 600, fontSize: 14, lineHeight: 1.3, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{v.titulo}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>{quandoPostou(v.publicadoEm)}</div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 num" style={{ fontSize: 15, color: "var(--fg)" }}>
                    <span title="Views">👁 {formatarNumero(v.views)}</span>
                    <span title="Likes">❤️ {formatarNumero(v.likes)}</span>
                    <span title="Comentários">💬 {formatarNumero(v.comentarios)}</span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
        <details style={{ fontSize: 13 }}>
          <summary style={{ cursor: "pointer", color: "var(--accent-text)", width: "fit-content" }}>Redes conectadas e views do mês</summary>
          <div style={{ marginTop: 10 }}>
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))" }}>
          {REDES.map((rede) => {
            const c = (contas ?? []).find((x) => x.plataforma === rede);
            return (
              <div key={rede} className="tile flex items-center gap-3">
                <LogoPlataforma p={rede} tamanho={32} />
                <div className="min-w-0 flex-1">
                  <div style={{ color: "var(--strong)", fontWeight: 600 }}>{NOME_PLATAFORMA[rede]} <span className="num" style={{ color: "var(--text2)", fontWeight: 400 }}>· {formatarNumero(r.viewsPorPlataforma[rede])} views</span></div>
                  <div className="truncate" style={{ fontSize: 12, color: !c ? "var(--muted)" : c.erro ? "var(--warn)" : "var(--muted)" }}>
                    {!c ? "Não conectado" : c.erro ? <details><summary style={{ cursor: "pointer" }}>Com problema na coleta</summary><code style={{ fontSize: 11, wordBreak: "break-word" }}>{c.erro}</code></details> : `${c.nome_conta}${c.ultima_coleta ? ` · ${quandoFoi(String(c.ultima_coleta))}` : ""}`}
                  </div>
                  {c && rede !== "youtube" && (
                    <details style={{ fontSize: 12, marginTop: 4 }}>
                      <summary style={{ cursor: "pointer", color: "var(--accent-text)", width: "fit-content" }}>Zerar e começar de hoje</summary>
                      <form action={zerarRede} className="flex flex-col gap-2" style={{ marginTop: 6 }}>
                        <input type="hidden" name="criador" value={id} /><input type="hidden" name="rede" value={rede} />
                        <span style={{ color: "var(--muted)" }}>Apaga todas as views de {NOME_PLATAFORMA[rede]} dele e usa o total de hoje como ponto de partida. Não dá para desfazer.</span>
                        <div className="flex gap-2">
                          <input className="input" name="confirma" placeholder="Digite ZERAR" aria-label="Digite ZERAR para confirmar" style={{ minHeight: 34, maxWidth: 140 }} required />
                          <button className="btn-line" type="submit" style={{ minHeight: 34, color: "var(--warn)" }}>Zerar</button>
                        </div>
                      </form>
                    </details>
                  )}
                </div>
              </div>
            );
          })}
        </div>
          </div>
        </details>
      </section>

      <section className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))" }}>
        <form id="meta" action={salvarMeta} className="card flex flex-col gap-3">
          <TituloCard icone="target">Meta de {nomeMes(mes).split(" ")[0]}</TituloCard>
          <input type="hidden" name="criador" value={id} /><input type="hidden" name="mes" value={mes} />
          <label className="flex flex-col gap-1.5"><span className="label">Meta em views</span><input className="input" name="meta" inputMode="numeric" defaultValue={r.meta ?? ""} placeholder="700000" /></label>
          {r.meta && <p style={{ margin: 0, color: "var(--muted)", fontSize: 13 }}>{Math.round((r.views / r.meta) * 100)}% feito · bônus de {formatarReais(Math.round(r.meta / 10))} se bater</p>}
          <button className="btn-gold" type="submit">Salvar meta</button>
        </form>
        <form action={salvarAgenda} className="card flex flex-col gap-3">
          <TituloCard icone="cal">Dias de postagem</TituloCard>
          <input type="hidden" name="criador" value={id} />
          <div className="flex flex-wrap gap-2">
            {DIAS_NOMES.map((n, i) => (
              <label key={n} className="tile flex items-center gap-2" style={{ padding: "8px 12px", cursor: "pointer" }}>
                <input type="checkbox" name="dia" value={i + 1} defaultChecked={dias.has(i + 1)} />{n}
              </label>
            ))}
          </div>
          <button className="btn-gold" type="submit">Salvar dias (escolha de 3 a 5)</button>
        </form>
        <div id="mapa" className="card flex flex-col gap-3">
          <TituloCard icone="bulb">Mapa de cada dia</TituloCard>
          <p style={{ margin: 0, color: "var(--muted)", fontSize: 13 }}>Vale toda semana até você trocar. Vai na notificação &quot;Hoje é dia de postar&quot; das 6h e abre a aba Ideias nesse mapa.</p>
          <form action={salvarMapasDia} className="flex flex-col gap-2">
            <input type="hidden" name="criador" value={id} />
            {DIAS_NOMES.map((n, i) => (
              <label key={n} className="flex items-center gap-3">
                <span style={{ width: 92, flex: "none", color: dias.has(i + 1) ? "var(--strong)" : "var(--muted)", fontWeight: 600, fontSize: 14 }}>{n}{!dias.has(i + 1) && <span style={{ display: "block", fontWeight: 400, fontSize: 11 }}>folga</span>}</span>
                <select className="input" name={`mapa_${i + 1}`} defaultValue={(mapas ?? []).find((m) => m.dia_semana === i + 1)?.mapa ?? ""} style={{ minHeight: 40 }}>
                  <option value="">Sem mapa</option>
                  {MAPAS.map((m) => <option key={m.id} value={m.id}>{m.emoji} {m.nome}</option>)}
                </select>
              </label>
            ))}
            <button className="btn-gold" type="submit" style={{ alignSelf: "flex-start" }}>Salvar mapas</button>
          </form>
        </div>
      </section>

      <section id="calendario" className="card flex flex-col gap-4">
        <TituloCard icone="cal" direita={`${r.diasCumpridos} de ${r.diasAgendados} dias cumpridos · ${r.faltas} ${r.faltas === 1 ? "falta" : "faltas"}`}>Calendário de {nomeMes(mes).split(" ")[0]}</TituloCard>
        <Calendario dias={r.calendario} mapas={Object.fromEntries((mapas ?? []).map((m) => [m.dia_semana as number, m.mapa as string]))} />
        <p style={{ margin: 0, color: "var(--muted)", fontSize: 13 }}>Os dias são marcados sozinhos pelos vídeos postados nas redes conectadas.</p>
      </section>

      <section id="pagamentos" className="card flex flex-col gap-4">
        <TituloCard icone="wallet">Pagamentos</TituloCard>
        <div className="flex flex-wrap gap-2">
          {[mesAnterior(mes), mes].map((m) => (
            <form key={m} action={fecharMes}>
              <input type="hidden" name="criador" value={id} /><input type="hidden" name="mes" value={m} />
              <button className="btn-line" type="submit">{fechados.has(m) ? "Recalcular" : "Fechar"} {nomeMes(m)}</button>
            </form>
          ))}
        </div>
        <div className="overflow-x-auto">
          <table className="table" style={{ minWidth: 560 }}>
            <thead><tr>{["MÊS", "VIEWS", "FALTAS", "TOTAL", "STATUS", ""].map((h) => <th key={h} scope="col">{h}</th>)}</tr></thead>
            <tbody>
              {(pags ?? []).map((p) => (
                <tr key={p.id}>
                  <td style={{ color: "var(--strong)", fontWeight: 600 }}>{nomeMes(p.mes)}</td>
                  <td>{formatarNumero(Number(p.views))}</td>
                  <td>{p.faltas}</td>
                  <td style={{ color: "var(--strong)", fontWeight: 600 }}>{formatarReais(Number(p.total_centavos))}</td>
                  <td>{p.status === "pago" ? <span className="pill-ok">Pago</span> : <span className="pill-warn">A pagar</span>}</td>
                  <td>{p.status !== "pago" && <form action={marcarPago}><input type="hidden" name="criador" value={id} /><input type="hidden" name="pagamento" value={p.id} /><button className="btn-gold" type="submit" style={{ minHeight: 36 }}>Marcar como pago</button></form>}</td>
                </tr>
              ))}
              {(pags ?? []).length === 0 && <tr><td colSpan={6} style={{ color: "var(--muted)" }}>Nenhum mês fechado ainda. Feche o mês depois que ele terminar para registrar o valor.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <details className="card">
        <summary className="flex cursor-pointer items-center gap-2.5" style={{ listStyle: "none" }}>
          <span style={{ color: "var(--accent-text)", display: "flex" }}><Icone nome="gear" /></span>
          <span className="h2 m-0" style={{ fontSize: 18 }}>Correções manuais</span>
          <span style={{ marginLeft: "auto", color: "var(--muted)", fontSize: 13 }}>Só se precisar · clique para abrir</span>
        </summary>
        <p style={{ color: "var(--muted)", fontSize: 13 }}>As views e os dias de postagem são automáticos. Use isto só para redes que ainda não estão conectadas (ex.: TikTok antes de conectar) ou para corrigir um dia.</p>
        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))" }}>
          <form action={lancarViews} className="tile flex flex-col gap-3">
            <TituloCard icone="eye">Lançar views</TituloCard>
            <input type="hidden" name="criador" value={id} />
            <select className="input" name="plataforma" defaultValue="tiktok" aria-label="Plataforma">{PLATAFORMAS.map((p) => <option key={p} value={p}>{NOME_PLATAFORMA[p]}</option>)}</select>
            <input className="input" name="titulo" placeholder="Título (ex.: Views de outubro antes da conexão)" aria-label="Título" />
            <input className="input" name="url" placeholder="Link do vídeo (opcional)" aria-label="Link do vídeo" />
            <div className="grid grid-cols-2 gap-2">
              <label className="flex flex-col gap-1"><span className="label">Postado em</span><input className="input" type="date" name="postado_em" defaultValue={hoje} /></label>
              <label className="flex flex-col gap-1"><span className="label">Dia das views</span><input className="input" type="date" name="dia" defaultValue={hoje} /></label>
            </div>
            <input className="input" name="views" inputMode="numeric" placeholder="Views ganhas" aria-label="Views ganhas" />
            <button className="btn-line" type="submit">Lançar views</button>
          </form>
          <form action={registrarDia} className="tile flex flex-col gap-3">
            <TituloCard icone="check">Registrar postagens de um dia</TituloCard>
            <input type="hidden" name="criador" value={id} />
            <div className="grid grid-cols-2 gap-2">
              <label className="flex flex-col gap-1"><span className="label">Dia</span><input className="input" type="date" name="dia" defaultValue={hoje} /></label>
              <label className="flex flex-col gap-1"><span className="label">Vídeos postados</span><input className="input" name="postagens" inputMode="numeric" defaultValue="1" /></label>
            </div>
            <p style={{ margin: 0, color: "var(--muted)", fontSize: 12 }}>Vale o maior entre o que as redes mostram e o que você registrar.</p>
            <button className="btn-line" type="submit">Registrar</button>
          </form>
        </div>
      </details>
    </>
  );
}
