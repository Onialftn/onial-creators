import { redirect } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { Cabecalho, TituloCard } from "@/components/Blocos";
import Link from "next/link";
import { avaliarEntrega, criarExtra, editarExtra, encerrarExtra, excluirExtra } from "@/app/acoes/extras";
import { usuarioAtual } from "@/lib/dados";
import { DIAS_CURTOS, diaDaSemana, hojeBrasil, somarDias } from "@/lib/datas";
import { formatarReais } from "@/lib/pagamento";
import { Icone } from "@/components/Icone";
import { AbasGestor, Retorno } from "../comum";

const diaCurto = (d: string) => `${DIAS_CURTOS[diaDaSemana(d) - 1].charAt(0)}${DIAS_CURTOS[diaDaSemana(d) - 1].slice(1).toLowerCase()} ${d.slice(8)}/${d.slice(5, 7)}`;
const valorCurto = (c: number) => (c % 100 === 0 ? `R$ ${(c / 100).toLocaleString("pt-BR")}` : formatarReais(c));
/** Regras (uma por linha) viram uma frase só. */
const regrasEmFrase = (r: string) => {
  const l = r.split(/\n+/).map((x) => x.replace(/^[-•*\d.)\s]+/, "").trim()).filter(Boolean);
  return l.length ? `${l.join("; ")}.`.replace(/[.;]\.$/, ".") : "";
};

export default async function ExtrasGestor({ searchParams }: { searchParams: Promise<{ ok?: string; erro?: string; duplicar?: string; novo?: string; editar?: string }> }) {
  const { sb, perfil } = await usuarioAtual();
  if (perfil.papel !== "gestor") redirect("/");
  const { ok, erro, duplicar, novo, editar } = await searchParams;
  const hoje = hojeBrasil();
  const [{ data: extras }, { data: entregas }, { data: pessoas }] = await Promise.all([
    sb.from("extras").select("*").order("criado_em", { ascending: false }).limit(30),
    sb.from("entregas_extra").select("*").order("enviado_em", { ascending: false }),
    sb.from("perfis").select("id, nome, foto_url"),
  ]);
  // "Duplicar": o formulário de novo extra já vem preenchido com o extra escolhido (dia: amanhã)
  const base = duplicar ? (extras ?? []).find((x) => x.id === duplicar) : undefined;
  const reais = (c: number) => (c / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const pessoa = new Map((pessoas ?? []).map((p) => [p.id, p]));
  const esperando = (entregas ?? []).filter((e) => e.status === "enviado").length;

  return (
    <>
      <Cabecalho icone="gear" titulo="Painel do gestor" sub="Vídeos extras: você escolhe o dia e o valor; o vídeo tem que ser postado nesse dia (vale 24h). Quem fizer manda o link, você aprova e o valor entra no total do mês do criador." />
      <AbasGestor ativa="extras" />
      <Retorno ok={ok} erro={erro} />

      {(novo || base) && <form id="novo" key={base?.id ?? "novo"} action={criarExtra} className="card flex flex-col gap-3" style={base ? { borderColor: "#E8B014" } : undefined}>
        <TituloCard icone="plus" direita={<Link href="/gestor/extras" style={{ color: "var(--muted)", fontSize: 13, textDecoration: "underline" }}>Fechar</Link>}>{base ? `Duplicando: ${base.titulo}` : "Novo vídeo extra"}</TituloCard>
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))" }}>
          <label className="flex flex-col gap-1.5" style={{ gridColumn: "span 2" }}><span className="label">TÍTULO</span><input className="input" name="titulo" maxLength={120} defaultValue={base?.titulo ?? ""} placeholder="Ex.: Short mostrando o farm de XP do 1v1" required /></label>
          <label className="flex flex-col gap-1.5"><span className="label">VALOR (R$)</span><input className="input" name="valor" inputMode="decimal" defaultValue={base ? reais(base.valor_centavos) : ""} placeholder="25,00" required /></label>
          <label className="flex flex-col gap-1.5"><span className="label">DIA DO VÍDEO (VALE SÓ NESSE DIA, 24H)</span><input className="input" type="date" name="prazo" min={hoje} defaultValue={somarDias(hoje, 1)} required /></label>
        </div>
        <label className="flex flex-col gap-1.5"><span className="label">DESCRIÇÃO</span><textarea className="input" name="descricao" rows={3} maxLength={1000} defaultValue={base?.descricao ?? ""} placeholder="O que precisa ter no vídeo, link de referência..." style={{ paddingTop: 10, resize: "vertical" }} /></label>
        <label className="flex flex-col gap-1.5"><span className="label">REGRAS</span><textarea className="input" name="regras" rows={4} maxLength={2000} defaultValue={base?.regras ?? ""} placeholder={"Uma regra por linha. Ex.:\nPostar no YouTube, TikTok e Instagram\nFalar o código do mapa no vídeo\nMínimo de 30 segundos"} style={{ paddingTop: 10, resize: "vertical" }} /></label>
        <p style={{ margin: 0, color: "var(--muted)", fontSize: 13 }}>Todos os criadores recebem uma notificação agora e outra no dia. O extra vale só no dia escolhido, das 00:00 às 23:59. Cada um que postar nesse dia e for aprovado ganha o valor.</p>
        <button className="btn-gold" type="submit" style={{ alignSelf: "flex-start" }}>{base ? "Criar cópia" : "Criar extra"}</button>
      </form>}

      <section className="flex flex-col" style={{ borderRadius: 16, border: "1px solid rgba(232,176,20,.28)", background: "var(--panel)", overflow: "hidden" }}>
        <div className="flex items-center gap-3" style={{ padding: "14px 14px 14px 18px", borderBottom: "1px solid var(--line)" }}>
          <span style={{ color: "var(--accent-text)", display: "flex" }}><Icone nome="wallet" tamanho={22} /></span>
          <h2 className="h2 m-0 flex-1" style={{ fontSize: 18 }}>EXTRAS E ENTREGAS</h2>
          {esperando > 0 && <span className="pill-warn" style={{ fontSize: 12 }}>{esperando} para aprovar</span>}
          <Link href={novo ? "/gestor/extras" : "/gestor/extras?novo=1#novo"} aria-label={novo ? "Fechar novo extra" : "Criar novo extra"} className="flex flex-none items-center justify-center" style={{ width: 44, height: 44, borderRadius: 10, background: "#E8B014", color: "#0A0A0A" }}>
            {novo ? <Icone nome="x" tamanho={20} /> : <Icone nome="plus" tamanho={22} />}
          </Link>
        </div>
        {(extras ?? []).length === 0 && <p style={{ margin: 0, padding: 18, color: "var(--muted)" }}>Nenhum extra criado ainda. Toque no + para criar.</p>}
        {(extras ?? []).map((x, i) => {
          const doExtra = (entregas ?? []).filter((e) => e.extra_id === x.id);
          const aberto = x.ativo && x.prazo >= hoje;
          const pendentes = doExtra.filter((e) => e.status === "enviado").length;
          const temAprovado = doExtra.some((e) => e.status === "aprovado");
          const editando = editar === x.id;
          const regras = regrasEmFrase(x.regras ?? "");
          return (
            <details key={x.id} id={`extra-${x.id}`} className="linha-extra" open={editando || undefined} style={{ borderTop: i ? "1px solid var(--line)" : undefined }}>
              <summary className="flex items-center gap-3" style={{ minHeight: 60, padding: "10px 16px 10px 18px", cursor: "pointer", listStyle: "none" }}>
                <span className="min-w-0 flex-1">
                  <span className="block truncate" style={{ color: aberto ? "var(--strong)" : "var(--muted)", fontWeight: 600, fontSize: 15 }}>{x.titulo}</span>
                  <span className="flex flex-wrap items-center gap-x-1.5 gap-y-1" style={{ marginTop: 3, fontSize: 12, color: "var(--muted)" }}>
                    <span style={{ padding: "1px 8px", borderRadius: 999, fontWeight: 700, fontSize: 11, background: aberto ? "rgba(232,176,20,.16)" : "var(--chip)", color: aberto ? "var(--accent-text)" : "var(--muted)" }}>{aberto ? "Agendado" : "Encerrado"}</span>
                    <span>· {diaCurto(x.prazo)} · {doExtra.length} {doExtra.length === 1 ? "envio" : "envios"}</span>
                    {pendentes > 0 && <span style={{ color: "var(--accent-text)", fontWeight: 600 }}>· {pendentes} para aprovar</span>}
                  </span>
                </span>
                <span className="num flex-none" style={{ fontSize: 18, color: aberto ? "var(--ok)" : "var(--muted)" }}>{valorCurto(x.valor_centavos)}</span>
                <span className="chev flex-none" aria-hidden="true" style={{ color: "var(--muted)", display: "flex", transition: "transform .2s" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
                </span>
              </summary>

              <div className="flex flex-col gap-3" style={{ padding: "2px 16px 16px 18px" }}>
                {(x.descricao || regras) && (
                  <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>
                    {x.descricao && <b style={{ color: "var(--strong)" }}>{x.descricao} </b>}
                    {regras && <span style={{ color: "var(--text2)" }}>Regras: {regras}</span>}
                  </p>
                )}
                <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(3,minmax(0,1fr))" }}>
                  <Link href={editando ? "/gestor/extras" : `/gestor/extras?editar=${x.id}#extra-${x.id}`} className={editando ? "btn-gold" : "btn-line"} style={{ minHeight: 40, fontSize: 13, justifyContent: "center" }}>{editando ? "Fechar" : "Editar"}</Link>
                  <Link href={`/gestor/extras?duplicar=${x.id}#novo`} className="btn-line" style={{ minHeight: 40, fontSize: 13, justifyContent: "center" }}>Duplicar</Link>
                  <form action={encerrarExtra} className="flex"><input type="hidden" name="extra" value={x.id} /><input type="hidden" name="ativo" value={x.ativo ? "0" : "1"} /><button className="btn-line w-full" type="submit" style={{ minHeight: 40, fontSize: 13, justifyContent: "center" }}>{x.ativo ? "Encerrar" : "Reabrir"}</button></form>
                </div>

                {editando && (
                  <form action={editarExtra} className="flex flex-col gap-2" style={{ padding: 12, borderRadius: 10, background: "var(--bg)", border: "1px solid var(--line2)" }}>
                    <input type="hidden" name="extra" value={x.id} />
                    <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))" }}>
                      <label className="flex flex-col gap-1" style={{ gridColumn: "1 / -1" }}><span className="label">TÍTULO</span><input className="input" name="titulo" maxLength={120} defaultValue={x.titulo} required /></label>
                      <label className="flex flex-col gap-1"><span className="label">VALOR (R$)</span><input className="input" name="valor" inputMode="decimal" defaultValue={reais(x.valor_centavos)} readOnly={temAprovado} title={temAprovado ? "Já tem vídeo aprovado: o valor não muda" : undefined} required /></label>
                      <label className="flex flex-col gap-1"><span className="label">DIA DO VÍDEO</span><input className="input" type="date" name="prazo" defaultValue={x.prazo} required /></label>
                    </div>
                    <label className="flex flex-col gap-1"><span className="label">DESCRIÇÃO</span><textarea className="input" name="descricao" rows={2} maxLength={1000} defaultValue={x.descricao} style={{ paddingTop: 8, resize: "vertical" }} /></label>
                    <label className="flex flex-col gap-1"><span className="label">REGRAS (UMA POR LINHA)</span><textarea className="input" name="regras" rows={3} maxLength={2000} defaultValue={x.regras ?? ""} style={{ paddingTop: 8, resize: "vertical" }} /></label>
                    <button className="btn-gold" type="submit" style={{ alignSelf: "flex-start", minHeight: 38 }}>Salvar alterações</button>
                  </form>
                )}

                {doExtra.length === 0 ? (
                  <div className="flex flex-wrap items-center justify-between gap-2" style={{ fontSize: 13 }}>
                    <span style={{ color: "var(--muted)" }}>Ninguém mandou ainda.</span>
                    <details>
                      <summary style={{ cursor: "pointer", listStyle: "none", color: "var(--warn)", textDecoration: "underline" }}>Excluir extra</summary>
                      <form action={excluirExtra} className="flex flex-wrap items-center gap-2" style={{ marginTop: 6 }}>
                        <input type="hidden" name="extra" value={x.id} />
                        <span style={{ color: "var(--muted)" }}>Apagar de vez?</span>
                        <button type="submit" className="btn-line" style={{ minHeight: 34, fontSize: 13, borderColor: "var(--warn)", color: "var(--warn)" }}>Sim, excluir</button>
                      </form>
                    </details>
                  </div>
                ) : doExtra.map((e) => {
                  const p = pessoa.get(e.criador_id);
                  return (
                    <div key={e.criador_id} className="flex flex-wrap items-center gap-3" style={{ paddingTop: 10, borderTop: "1px solid var(--line)" }}>
                      <Avatar foto={p?.foto_url ?? null} nome={p?.nome ?? "?"} tamanho={30} />
                      <span className="min-w-0 flex-1" style={{ minWidth: 160 }}>
                        <b style={{ color: "var(--strong)" }}>{p?.nome ?? "?"}</b>{" "}
                        <a href={e.link} target="_blank" rel="noreferrer" style={{ color: "var(--accent-text)", textDecoration: "underline", fontSize: 13 }}>ver vídeo</a>
                      </span>
                      {e.status === "enviado" ? (
                        <span className="flex flex-wrap gap-2">
                          <form action={avaliarEntrega}><input type="hidden" name="extra" value={x.id} /><input type="hidden" name="criador" value={e.criador_id} /><input type="hidden" name="aprovar" value="1" /><button className="btn-gold" type="submit" style={{ minHeight: 34, fontSize: 13 }}>Aprovar {formatarReais(x.valor_centavos)}</button></form>
                          <form action={avaliarEntrega} className="flex gap-2"><input type="hidden" name="extra" value={x.id} /><input type="hidden" name="criador" value={e.criador_id} /><input type="hidden" name="aprovar" value="0" /><input className="input" name="motivo" placeholder="Motivo (opcional)" style={{ minHeight: 34, width: 150 }} /><button className="btn-line" type="submit" style={{ minHeight: 34, fontSize: 13 }}>Recusar</button></form>
                        </span>
                      ) : e.status === "aprovado" ? <span className="pill-ok">Aprovado{e.mes ? ` · entra em ${e.mes.split("-").reverse().join("/")}` : ""}</span> : <span className="pill-warn">Recusado</span>}
                    </div>
                  );
                })}
              </div>
            </details>
          );
        })}
      </section>
    </>
  );
}
