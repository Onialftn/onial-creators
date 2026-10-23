import Link from "next/link";
import { redirect } from "next/navigation";
import { Cabecalho, Calendario, TituloCard } from "@/components/Blocos";
import { Icone, NOME_PLATAFORMA } from "@/components/Icone";
import { PLATAFORMAS, resumoDoMes, usuarioAtual } from "@/lib/dados";
import { DIAS_NOMES, hojeBrasil, mesAnterior, mesDe, nomeMes } from "@/lib/datas";
import { formatarNumero, formatarReais } from "@/lib/pagamento";
import { adicionarCanal, coletarAgora, criarCriador, gerarAvisosAgora, removerCanal, fecharMes, lancarViews, marcarPago, registrarDia, salvarAgenda, salvarMapaSemana, salvarMeta } from "./acoes";
import webpush from "web-push";
import { pushConfigurado } from "@/lib/notificacoes";
import { inicioDaSemana } from "@/lib/pagamento";
import { somarDias } from "@/lib/datas";
import { LogoPlataforma } from "@/components/Icone";
import { REDES, redeConfigurada } from "@/lib/coleta/redes";
import { iaConfigurada } from "@/lib/ia/claude";
import { MAPAS } from "@/lib/ia/mapas";
import { LIMITE_MES, inicioDoMes } from "@/lib/ia/uso";

export const maxDuration = 300;

export default async function PainelGestor({ searchParams }: { searchParams: Promise<{ c?: string; ok?: string; erro?: string }> }) {
  const { sb, perfil } = await usuarioAtual();
  if (perfil.papel !== "gestor") redirect("/");
  const { c, ok, erro } = await searchParams;
  const hoje = hojeBrasil();
  const mes = mesDe(hoje);
  const { data: criadores } = await sb.from("perfis").select("id, nome").eq("papel", "criador").order("nome");
  const lista = criadores ?? [];
  const resumos = await Promise.all(lista.map((cr) => resumoDoMes(sb, cr.id, mes)));
  const sel = lista.find((x) => x.id === c);
  const rSel = sel ? resumos[lista.indexOf(sel)] : null;
  const [{ data: agenda }, { data: pags }] = sel
    ? await Promise.all([sb.from("agenda_postagem").select("dia_semana").eq("criador_id", sel.id), sb.from("pagamentos").select("*").eq("criador_id", sel.id).order("mes", { ascending: false })])
    : [{ data: null }, { data: null }];
  const semanaAtual = inicioDaSemana(hoje);
  const proximaSemana = somarDias(semanaAtual, 7);
  const { data: mapasSel } = sel ? await sb.from("mapa_semana").select("semana, mapa").eq("criador_id", sel.id).in("semana", [semanaAtual, proximaSemana]) : { data: [] };
  const dmy = (d: string) => `${d.slice(8)}/${d.slice(5, 7)}`;
  // chaves para os avisos no celular (só aparecem enquanto não estiverem configuradas na Vercel)
  const novasChaves = pushConfigurado() ? null : webpush.generateVAPIDKeys();
  const dias = new Set((agenda ?? []).map((a) => a.dia_semana as number));
  const custoMes = resumos.reduce((s, r) => s + r.pagamento.totalCentavos, 0);
  const { data: contasRede } = await sb.from("contas_plataforma").select("criador_id, plataforma, nome_conta, ultima_coleta, erro");
  const { data: usoIa } = await sb.from("uso_ia").select("criador_id, tipo, custo_usd").gte("criado_em", inicioDoMes()).limit(5000);
  const pessoasIa = [...lista, { id: perfil.id, nome: `${perfil.nome} (gestor)` }];
  const usoDe = (id: string, tipo?: string) => (usoIa ?? []).filter((u) => u.criador_id === id && (!tipo || u.tipo === tipo));
  const dolar = (v: number) => `US$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const { data: refs } = await sb.from("canais_referencia").select("id, mapa, tema, nome, foto_url, canal_id").order("criado_em");
  const custoIa = (usoIa ?? []).reduce((a, u) => a + Number(u.custo_usd), 0);

  return (
    <>
      <Cabecalho icone="gear" titulo="Painel do gestor" sub={`${nomeMes(mes)} · ${lista.length} ${lista.length === 1 ? "criador" : "criadores"} · custo do mês até agora ${formatarReais(custoMes)}`} />
      {ok && <div role="status" className="pill-ok" style={{ padding: "10px 14px", fontSize: 14 }}><Icone nome="check" tamanho={16} />{ok}</div>}
      {erro && <div role="alert" className="pill-warn" style={{ padding: "10px 14px", fontSize: 14 }}>{erro}</div>}

      <section className="card">
        <TituloCard icone="users">Criadores</TituloCard>
        <div className="overflow-x-auto" style={{ marginTop: 14 }}>
          <table className="table" style={{ minWidth: 680 }}>
            <thead><tr>{["CRIADOR", "VIEWS", "META", "FALTAS", "A REPOR", "TOTAL DO MÊS", ""].map((h) => <th key={h} scope="col">{h}</th>)}</tr></thead>
            <tbody>
              {lista.map((cr, i) => {
                const r = resumos[i];
                return (
                  <tr key={cr.id} style={cr.id === c ? { background: "var(--tint)" } : undefined}>
                    <td style={{ color: "var(--strong)", fontWeight: 600 }}>{cr.nome}</td>
                    <td style={{ fontVariantNumeric: "tabular-nums" }}>{formatarNumero(r.views)}</td>
                    <td style={{ fontVariantNumeric: "tabular-nums" }}>{r.meta ? `${Math.round((r.views / r.meta) * 100)}% de ${formatarNumero(r.meta)}` : <span style={{ color: "var(--warn)" }}>Sem meta</span>}</td>
                    <td style={{ color: r.faltas ? "var(--warn)" : undefined }}>{r.faltas}</td>
                    <td style={{ color: r.aRepor ? "var(--warn)" : undefined }}>{r.aRepor}</td>
                    <td style={{ color: "var(--strong)", fontWeight: 600 }}>{formatarReais(r.pagamento.totalCentavos)}</td>
                    <td><Link className="btn-line" href={`/gestor?c=${cr.id}`} style={{ minHeight: 36 }}>Abrir</Link></td>
                  </tr>
                );
              })}
              {lista.length === 0 && <tr><td colSpan={7} style={{ color: "var(--muted)" }}>Nenhum criador ainda. Cadastre o primeiro abaixo.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card flex flex-col gap-4">
        <TituloCard icone="zap" direita={REDES.map((r) => `${NOME_PLATAFORMA[r]}: ${redeConfigurada(r) ? "configurado" : "falta configurar"}`).join(" · ")}>Redes conectadas</TituloCard>
        <div className="overflow-x-auto">
          <table className="table" style={{ minWidth: 560 }}>
            <thead><tr><th scope="col">CRIADOR</th>{REDES.map((r) => <th key={r} scope="col"><span className="flex items-center gap-1.5"><LogoPlataforma p={r} tamanho={20} />{NOME_PLATAFORMA[r].toUpperCase()}</span></th>)}</tr></thead>
            <tbody>
              {lista.map((cr) => (
                <tr key={cr.id}>
                  <td style={{ color: "var(--strong)", fontWeight: 600 }}>{cr.nome}</td>
                  {REDES.map((r) => {
                    const c = (contasRede ?? []).find((x) => x.criador_id === cr.id && x.plataforma === r);
                    return <td key={r} style={{ color: !c ? "var(--muted)" : c.erro ? "var(--warn)" : "var(--ok)", fontSize: 13 }}>{!c ? "Não conectado" : c.erro ? <details><summary style={{ cursor: "pointer" }}>Com problema</summary><code style={{ color: "var(--muted)", fontSize: 11, wordBreak: "break-word" }}>{c.erro}</code></details> : c.nome_conta}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <form action={coletarAgora}><button className="btn-line" type="submit">Coletar views agora</button></form>
        <p style={{ margin: 0, color: "var(--muted)", fontSize: 13 }}>A coleta roda sozinha todo dia às 6h. Cada criador conecta as próprias contas na aba Minhas redes.</p>
      </section>

      <section className="card flex flex-col gap-4">
        <TituloCard icone="bulb" direita={iaConfigurada() ? `Gasto no mês: ${dolar(custoIa)}` : "IA ainda não configurada (falta ANTHROPIC_API_KEY na Vercel)"}>Uso da IA no mês</TituloCard>
        <div className="overflow-x-auto">
          <table className="table" style={{ minWidth: 560 }}>
            <thead><tr><th scope="col">PESSOA</th><th scope="col">ROTEIROS</th><th scope="col">IDEIAS</th><th scope="col">AVALIAÇÕES</th><th scope="col">GASTO</th></tr></thead>
            <tbody>
              {pessoasIa.map((pp) => (
                <tr key={pp.id}>
                  <td style={{ color: "var(--strong)", fontWeight: 600 }}>{pp.nome}</td>
                  {(["roteiro", "ideia", "avaliacao"] as const).map((t) => <td key={t} style={{ fontVariantNumeric: "tabular-nums" }}>{usoDe(pp.id, t).length}{pp.id === perfil.id ? "" : <span style={{ color: "var(--muted)" }}> / {LIMITE_MES[t]}</span>}</td>)}
                  <td style={{ fontVariantNumeric: "tabular-nums" }}>{dolar(usoDe(pp.id).reduce((a, u) => a + Number(u.custo_usd), 0))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ margin: 0, color: "var(--muted)", fontSize: 13 }}>Gasto estimado pelo site. O valor cobrado de verdade aparece no console da Anthropic. Os limites zeram todo dia 1º.</p>
      </section>

      <section className="card flex flex-col gap-3">
        <TituloCard icone="zap" direita={pushConfigurado() ? "Avisos no celular: ligados" : "Avisos no celular: falta configurar"}>Avisos</TituloCard>
        <p style={{ margin: 0, color: "var(--muted)", fontSize: 13 }}>Todo dia, depois da coleta das 6h, cada criador recebe: dia de postar com o mapa da semana, dias para repor, faltas, marcos da meta (50%, 75%, 90%, batida), vídeo bombando (2× a média dele) e subida no ranking. Rede desconectada, mês fechado e pagamento feito avisam na hora.</p>
        {novasChaves && (
          <div className="tile flex flex-col gap-2" style={{ fontSize: 13 }}>
            <b style={{ color: "var(--strong)" }}>Para ligar os avisos no celular, crie estas 2 variáveis na Vercel (Settings → Environment Variables) e faça Redeploy:</b>
            <div><span className="label">VAPID_PUBLIC_KEY</span><code style={{ display: "block", wordBreak: "break-all", userSelect: "all", color: "var(--fg)" }}>{novasChaves.publicKey}</code></div>
            <div><span className="label">VAPID_PRIVATE_KEY (secreta: só na Vercel)</span><code style={{ display: "block", wordBreak: "break-all", userSelect: "all", color: "var(--fg)" }}>{novasChaves.privateKey}</code></div>
            <span style={{ color: "var(--muted)" }}>Use as duas desta mesma tela juntas (elas mudam se você recarregar a página).</span>
          </div>
        )}
        <form action={gerarAvisosAgora}><button className="btn-line" type="submit">Gerar os avisos de hoje agora</button></form>
      </section>

      <section id="referencias" className="card flex flex-col gap-4">
        <TituloCard icone="bulb">Canais de referência (Ideias de vídeos)</TituloCard>
        <p style={{ margin: 0, color: "var(--muted)", fontSize: 13 }}>Os Shorts desses canais aparecem na aba Ideias de vídeos, separados por mapa e tema. Precisa ter pelo menos uma conta do YouTube conectada no site.</p>
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))" }}>
          {MAPAS.flatMap((m) => m.temas.map((t) => {
            const lista = (refs ?? []).filter((r) => r.mapa === m.id && r.tema === t);
            return (
              <div key={m.id + t} className="tile flex flex-col gap-2">
                <div style={{ color: "var(--strong)", fontWeight: 600 }}>{m.emoji} {t} <span style={{ color: "var(--muted)", fontWeight: 400, fontSize: 12 }}>· {m.nome.replace("Onial ", "")}</span></div>
                {lista.length === 0 && <div style={{ color: "var(--muted)", fontSize: 13 }}>Nenhum canal ainda.</div>}
                {lista.map((r) => (
                  <form key={r.id} action={removerCanal} className="flex items-center gap-2" style={{ fontSize: 14 }}>
                    <input type="hidden" name="id" value={r.id} />
                    <a href={`https://www.youtube.com/channel/${r.canal_id}`} target="_blank" rel="noreferrer" className="flex-1 truncate">{r.nome}</a>
                    <button type="submit" aria-label={`Remover ${r.nome}`} style={{ color: "var(--muted)", width: 32, height: 32 }} className="flex items-center justify-center"><Icone nome="x" tamanho={14} /></button>
                  </form>
                ))}
                <form action={adicionarCanal} className="flex gap-2">
                  <input type="hidden" name="mapa" value={m.id} /><input type="hidden" name="tema" value={t} />
                  <input className="input" name="canal" placeholder="youtube.com/@canal" aria-label={`Link do canal para ${t}`} style={{ minHeight: 38 }} required />
                  <button className="btn-line" type="submit" style={{ minHeight: 38 }}>Adicionar</button>
                </form>
              </div>
            );
          }))}
        </div>
      </section>

      {sel && rSel && (
        <>
          <h2 className="h2 m-0" style={{ fontSize: 26 }}>{sel.nome}</h2>
          <section className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))" }}>
            <form action={salvarMeta} className="card flex flex-col gap-3">
              <TituloCard icone="target">Meta de {nomeMes(mes).split(" ")[0]}</TituloCard>
              <input type="hidden" name="criador" value={sel.id} /><input type="hidden" name="mes" value={mes} />
              <label className="flex flex-col gap-1.5"><span className="label">Meta em views</span><input className="input" name="meta" inputMode="numeric" defaultValue={rSel.meta ?? ""} placeholder="700000" /></label>
              <button className="btn-gold" type="submit">Salvar meta</button>
            </form>
            <form action={salvarAgenda} className="card flex flex-col gap-3">
              <TituloCard icone="cal">Dias de postagem</TituloCard>
              <input type="hidden" name="criador" value={sel.id} />
              <div className="flex flex-wrap gap-2">
                {DIAS_NOMES.map((n, i) => (
                  <label key={n} className="tile flex items-center gap-2" style={{ padding: "8px 12px", cursor: "pointer" }}>
                    <input type="checkbox" name="dia" value={i + 1} defaultChecked={dias.has(i + 1)} />{n}
                  </label>
                ))}
              </div>
              <button className="btn-gold" type="submit">Salvar dias (escolha 5)</button>
            </form>
            <div className="card flex flex-col gap-3">
              <TituloCard icone="bulb">Mapa da semana</TituloCard>
              <p style={{ margin: 0, color: "var(--muted)", fontSize: 13 }}>Aparece no aviso &quot;Hoje é dia de postar&quot; das 6h e abre a aba Ideias nesse mapa.</p>
              {[[semanaAtual, "Esta semana"], [proximaSemana, "Próxima semana"]].map(([sem, rot]) => (
                <form key={sem} action={salvarMapaSemana} className="flex flex-wrap items-end gap-2">
                  <input type="hidden" name="criador" value={sel.id} /><input type="hidden" name="semana" value={sem} />
                  <label className="flex min-w-0 flex-1 flex-col gap-1.5"><span className="label">{rot} ({dmy(sem)} a {dmy(somarDias(sem, 6))})</span>
                    <select className="input" name="mapa" defaultValue={mapasSel?.find((x) => x.semana === sem)?.mapa ?? ""}>
                      <option value="">Sem mapa definido</option>
                      {MAPAS.map((m) => <option key={m.id} value={m.id}>{m.emoji} {m.nome}</option>)}
                    </select>
                  </label>
                  <button className="btn-line" type="submit">Salvar</button>
                </form>
              ))}
            </div>
          </section>

          <section className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))" }}>
            <form action={lancarViews} className="card flex flex-col gap-3">
              <TituloCard icone="eye">Lançar views de um vídeo</TituloCard>
              <p style={{ margin: 0, color: "var(--muted)", fontSize: 13 }}>Para TikTok e Instagram (o YouTube será automático). Lance as views <b>ganhas naquele dia</b>.</p>
              <input type="hidden" name="criador" value={sel.id} />
              <select className="input" name="plataforma" defaultValue="tiktok" aria-label="Plataforma">{PLATAFORMAS.map((p) => <option key={p} value={p}>{NOME_PLATAFORMA[p]}</option>)}</select>
              <input className="input" name="titulo" placeholder="Título do vídeo" aria-label="Título do vídeo" />
              <input className="input" name="url" placeholder="Link do vídeo (opcional)" aria-label="Link do vídeo" />
              <div className="grid grid-cols-2 gap-2">
                <label className="flex flex-col gap-1"><span className="label">Postado em</span><input className="input" type="date" name="postado_em" defaultValue={hoje} /></label>
                <label className="flex flex-col gap-1"><span className="label">Dia das views</span><input className="input" type="date" name="dia" defaultValue={hoje} /></label>
              </div>
              <input className="input" name="views" inputMode="numeric" placeholder="Views ganhas no dia" aria-label="Views ganhas no dia" />
              <button className="btn-gold" type="submit">Lançar views</button>
            </form>
            <form action={registrarDia} className="card flex flex-col gap-3">
              <TituloCard icone="check">Registrar postagens do dia</TituloCard>
              <p style={{ margin: 0, color: "var(--muted)", fontSize: 13 }}>Quantos vídeos {sel.nome.split(" ")[0]} postou no dia. Postar num dia de folga (ou 2 vídeos num dia) repõe um dia perdido da mesma semana.</p>
              <input type="hidden" name="criador" value={sel.id} />
              <div className="grid grid-cols-2 gap-2">
                <label className="flex flex-col gap-1"><span className="label">Dia</span><input className="input" type="date" name="dia" defaultValue={hoje} /></label>
                <label className="flex flex-col gap-1"><span className="label">Vídeos postados</span><input className="input" name="postagens" inputMode="numeric" defaultValue="1" /></label>
              </div>
              <button className="btn-gold" type="submit">Registrar</button>
            </form>
          </section>

          <section className="card flex flex-col gap-4">
            <TituloCard icone="cal" direita={`${rSel.diasCumpridos} de ${rSel.diasAgendados} dias cumpridos · ${rSel.faltas} ${rSel.faltas === 1 ? "falta" : "faltas"}`}>Calendário de {nomeMes(mes).split(" ")[0]}</TituloCard>
            <Calendario dias={rSel.calendario} />
          </section>

          <section className="card flex flex-col gap-4">
            <TituloCard icone="wallet">Pagamentos</TituloCard>
            <div className="flex flex-wrap gap-2">
              {[mesAnterior(mes), mes].map((m) => (
                <form key={m} action={fecharMes}>
                  <input type="hidden" name="criador" value={sel.id} /><input type="hidden" name="mes" value={m} />
                  <button className="btn-line" type="submit">Fechar {nomeMes(m)}</button>
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
                      <td>{p.status !== "pago" && <form action={marcarPago}><input type="hidden" name="criador" value={sel.id} /><input type="hidden" name="pagamento" value={p.id} /><button className="btn-gold" type="submit" style={{ minHeight: 36 }}>Marcar como pago</button></form>}</td>
                    </tr>
                  ))}
                  {(pags ?? []).length === 0 && <tr><td colSpan={6} style={{ color: "var(--muted)" }}>Nenhum mês fechado ainda. Feche o mês depois que ele terminar para registrar o valor.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      <form action={criarCriador} className="card flex flex-col gap-3" style={{ maxWidth: 520 }}>
        <TituloCard icone="plus">Cadastrar criador</TituloCard>
        <input className="input" name="nome" placeholder="Nome" aria-label="Nome" />
        <input className="input" name="email" type="email" placeholder="E-mail" aria-label="E-mail" />
        <input className="input" name="senha" type="text" placeholder="Senha inicial (mínimo 8 caracteres)" aria-label="Senha inicial" autoComplete="off" />
        <p style={{ margin: 0, color: "var(--muted)", fontSize: 13 }}>Os dias de postagem começam de segunda a sexta. Envie o e-mail e a senha para o criador entrar.</p>
        <button className="btn-gold" type="submit">Cadastrar</button>
      </form>
    </>
  );
}
