import { redirect } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { Cabecalho, TituloCard } from "@/components/Blocos";
import Link from "next/link";
import { avaliarEntrega, criarExtra, editarExtra, encerrarExtra } from "@/app/acoes/extras";
import { usuarioAtual } from "@/lib/dados";
import { hojeBrasil, somarDias } from "@/lib/datas";
import { formatarReais } from "@/lib/pagamento";
import { janelaExtra } from "@/lib/prazo";
import { Regras } from "@/components/RegrasExtra";
import { AbasGestor, Retorno } from "../comum";

const diaBr = (d: string) => d.split("-").reverse().join("/");

export default async function ExtrasGestor({ searchParams }: { searchParams: Promise<{ ok?: string; erro?: string; duplicar?: string }> }) {
  const { sb, perfil } = await usuarioAtual();
  if (perfil.papel !== "gestor") redirect("/");
  const { ok, erro, duplicar } = await searchParams;
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

      <form id="novo" key={base?.id ?? "novo"} action={criarExtra} className="card flex flex-col gap-3" style={base ? { borderColor: "#E8B014" } : undefined}>
        <TituloCard icone="plus" direita={base ? <Link href="/gestor/extras" style={{ color: "var(--muted)", fontSize: 13, textDecoration: "underline" }}>Limpar</Link> : undefined}>{base ? `Duplicando: ${base.titulo}` : "Novo vídeo extra"}</TituloCard>
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))" }}>
          <label className="flex flex-col gap-1.5" style={{ gridColumn: "span 2" }}><span className="label">TÍTULO</span><input className="input" name="titulo" maxLength={120} defaultValue={base?.titulo ?? ""} placeholder="Ex.: Short mostrando o farm de XP do 1v1" required /></label>
          <label className="flex flex-col gap-1.5"><span className="label">VALOR (R$)</span><input className="input" name="valor" inputMode="decimal" defaultValue={base ? reais(base.valor_centavos) : ""} placeholder="25,00" required /></label>
          <label className="flex flex-col gap-1.5"><span className="label">DIA DO VÍDEO (VALE SÓ NESSE DIA, 24H)</span><input className="input" type="date" name="prazo" min={hoje} defaultValue={somarDias(hoje, 1)} required /></label>
        </div>
        <label className="flex flex-col gap-1.5"><span className="label">DESCRIÇÃO</span><textarea className="input" name="descricao" rows={3} maxLength={1000} defaultValue={base?.descricao ?? ""} placeholder="O que precisa ter no vídeo, link de referência..." style={{ paddingTop: 10, resize: "vertical" }} /></label>
        <label className="flex flex-col gap-1.5"><span className="label">REGRAS</span><textarea className="input" name="regras" rows={4} maxLength={2000} defaultValue={base?.regras ?? ""} placeholder={"Uma regra por linha. Ex.:\nPostar no YouTube, TikTok e Instagram\nFalar o código do mapa no vídeo\nMínimo de 30 segundos"} style={{ paddingTop: 10, resize: "vertical" }} /></label>
        <p style={{ margin: 0, color: "var(--muted)", fontSize: 13 }}>Todos os criadores recebem uma notificação agora e outra no dia. O extra vale só no dia escolhido, das 00:00 às 23:59. Cada um que postar nesse dia e for aprovado ganha o valor.</p>
        <button className="btn-gold" type="submit" style={{ alignSelf: "flex-start" }}>{base ? "Criar cópia" : "Criar extra"}</button>
      </form>

      <section className="card flex flex-col gap-4">
        <TituloCard icone="wallet" direita={esperando ? `${esperando} para aprovar` : undefined}>Extras e entregas</TituloCard>
        {(extras ?? []).length === 0 && <p style={{ margin: 0, color: "var(--muted)" }}>Nenhum extra criado ainda.</p>}
        {(extras ?? []).map((x) => {
          const doExtra = (entregas ?? []).filter((e) => e.extra_id === x.id);
          const aberto = x.ativo && x.prazo >= hoje;
          return (
            <div key={x.id} className="flex flex-col gap-3" style={{ padding: 14, borderRadius: 8, background: "var(--bg)", border: `1px solid ${aberto ? "var(--line2)" : "var(--line)"}`, opacity: aberto ? 1 : 0.75 }}>
              <div className="flex flex-wrap items-start gap-3">
                <div className="min-w-0 flex-1">
                  <b style={{ color: "var(--strong)", fontSize: 16 }}>{x.titulo}</b>
                  <div className="flex flex-wrap items-center gap-2" style={{ marginTop: 6 }}>
                    <span style={{ padding: "4px 9px", borderRadius: 6, fontSize: 13, fontWeight: 700, background: !aberto ? "var(--chip)" : janelaExtra(x.prazo, hoje).fase === "hoje" ? "var(--ok)" : "#E8B014", color: aberto ? "#0A0A0A" : "var(--muted)" }}>⏰ {x.ativo ? janelaExtra(x.prazo, hoje).texto : `Encerrado (dia ${diaBr(x.prazo)})`}</span>
                    {aberto && <span style={{ fontSize: 13, color: "var(--muted)" }}>{janelaExtra(x.prazo, hoje).detalhe}</span>}
                  </div>
                </div>
                <span className="num" style={{ fontSize: 22, color: "var(--ok)" }}>{formatarReais(x.valor_centavos)}</span>
                <form action={encerrarExtra}><input type="hidden" name="extra" value={x.id} /><input type="hidden" name="ativo" value={x.ativo ? "0" : "1"} /><button className="btn-line" type="submit" style={{ minHeight: 34, fontSize: 13 }}>{x.ativo ? "Encerrar" : "Reabrir"}</button></form>
              </div>
              {x.descricao && <p style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: 14, lineHeight: 1.45 }}>{x.descricao}</p>}
              {x.regras && <Regras texto={x.regras} />}
              <div className="flex flex-wrap items-start gap-3" style={{ fontSize: 13 }}>
                <Link href={`/gestor/extras?duplicar=${x.id}#novo`} className="btn-line" style={{ minHeight: 34, fontSize: 13 }}>Duplicar</Link>
                <details className="flex-1" style={{ minWidth: 240 }}>
                  <summary className="btn-line" style={{ minHeight: 34, fontSize: 13, display: "inline-flex", cursor: "pointer", listStyle: "none" }}>Editar</summary>
                  <form action={editarExtra} className="flex flex-col gap-2" style={{ marginTop: 10 }}>
                    <input type="hidden" name="extra" value={x.id} />
                    <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))" }}>
                      <label className="flex flex-col gap-1" style={{ gridColumn: "1 / -1" }}><span className="label">TÍTULO</span><input className="input" name="titulo" maxLength={120} defaultValue={x.titulo} required /></label>
                      <label className="flex flex-col gap-1"><span className="label">VALOR (R$)</span><input className="input" name="valor" inputMode="decimal" defaultValue={reais(x.valor_centavos)} readOnly={doExtra.some((e) => e.status === "aprovado")} title={doExtra.some((e) => e.status === "aprovado") ? "Já tem vídeo aprovado: o valor não muda" : undefined} required /></label>
                      <label className="flex flex-col gap-1"><span className="label">DIA DO VÍDEO</span><input className="input" type="date" name="prazo" defaultValue={x.prazo} required /></label>
                    </div>
                    <label className="flex flex-col gap-1"><span className="label">DESCRIÇÃO</span><textarea className="input" name="descricao" rows={2} maxLength={1000} defaultValue={x.descricao} style={{ paddingTop: 8, resize: "vertical" }} /></label>
                    <label className="flex flex-col gap-1"><span className="label">REGRAS (UMA POR LINHA)</span><textarea className="input" name="regras" rows={4} maxLength={2000} defaultValue={x.regras ?? ""} style={{ paddingTop: 8, resize: "vertical" }} /></label>
                    <button className="btn-gold" type="submit" style={{ alignSelf: "flex-start", minHeight: 36 }}>Salvar alterações</button>
                  </form>
                </details>
              </div>
              {doExtra.length === 0 ? <span style={{ color: "var(--muted)", fontSize: 13 }}>Ninguém mandou ainda.</span> : doExtra.map((e) => {
                const p = pessoa.get(e.criador_id);
                return (
                  <div key={e.criador_id} className="flex flex-wrap items-center gap-3" style={{ paddingTop: 10, borderTop: "1px solid var(--line)" }}>
                    <Avatar foto={p?.foto_url ?? null} nome={p?.nome ?? "?"} tamanho={30} />
                    <span className="min-w-0 flex-1" style={{ minWidth: 180 }}>
                      <b style={{ color: "var(--strong)" }}>{p?.nome ?? "?"}</b>{" "}
                      <a href={e.link} target="_blank" rel="noreferrer" style={{ color: "var(--accent-text)", textDecoration: "underline", fontSize: 13, wordBreak: "break-all" }}>ver vídeo</a>
                    </span>
                    {e.status === "enviado" ? (
                      <span className="flex flex-wrap gap-2">
                        <form action={avaliarEntrega}><input type="hidden" name="extra" value={x.id} /><input type="hidden" name="criador" value={e.criador_id} /><input type="hidden" name="aprovar" value="1" /><button className="btn-gold" type="submit" style={{ minHeight: 34, fontSize: 13 }}>Aprovar {formatarReais(x.valor_centavos)}</button></form>
                        <form action={avaliarEntrega} className="flex gap-2"><input type="hidden" name="extra" value={x.id} /><input type="hidden" name="criador" value={e.criador_id} /><input type="hidden" name="aprovar" value="0" /><input className="input" name="motivo" placeholder="Motivo (opcional)" style={{ minHeight: 34, width: 160 }} /><button className="btn-line" type="submit" style={{ minHeight: 34, fontSize: 13 }}>Recusar</button></form>
                      </span>
                    ) : e.status === "aprovado" ? <span className="pill-ok">Aprovado{e.mes ? ` · entra em ${e.mes.split("-").reverse().join("/")}` : ""}</span> : <span className="pill-warn">Recusado</span>}
                  </div>
                );
              })}
            </div>
          );
        })}
      </section>
    </>
  );
}
