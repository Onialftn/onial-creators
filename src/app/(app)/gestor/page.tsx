import Link from "next/link";
import { redirect } from "next/navigation";
import { Cabecalho, Calendario, TituloCard } from "@/components/Blocos";
import { Icone, NOME_PLATAFORMA } from "@/components/Icone";
import { PLATAFORMAS, resumoDoMes, usuarioAtual } from "@/lib/dados";
import { DIAS_NOMES, hojeBrasil, mesAnterior, mesDe, nomeMes } from "@/lib/datas";
import { formatarNumero, formatarReais } from "@/lib/pagamento";
import { coletarAgora, criarCriador, fecharMes, lancarViews, marcarPago, registrarDia, salvarAgenda, salvarMeta } from "./acoes";
import { LogoPlataforma } from "@/components/Icone";
import { REDES, redeConfigurada } from "@/lib/coleta/redes";

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
  const dias = new Set((agenda ?? []).map((a) => a.dia_semana as number));
  const custoMes = resumos.reduce((s, r) => s + r.pagamento.totalCentavos, 0);
  const { data: contasRede } = await sb.from("contas_plataforma").select("criador_id, plataforma, nome_conta, ultima_coleta, erro");

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
