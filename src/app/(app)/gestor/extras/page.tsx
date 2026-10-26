import { redirect } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { Cabecalho, TituloCard } from "@/components/Blocos";
import { avaliarEntrega, criarExtra, encerrarExtra } from "@/app/acoes/extras";
import { usuarioAtual } from "@/lib/dados";
import { hojeBrasil, somarDias } from "@/lib/datas";
import { formatarReais } from "@/lib/pagamento";
import { AbasGestor, Retorno } from "../comum";

const diaBr = (d: string) => d.split("-").reverse().join("/");

export default async function ExtrasGestor({ searchParams }: { searchParams: Promise<{ ok?: string; erro?: string }> }) {
  const { sb, perfil } = await usuarioAtual();
  if (perfil.papel !== "gestor") redirect("/");
  const { ok, erro } = await searchParams;
  const hoje = hojeBrasil();
  const [{ data: extras }, { data: entregas }, { data: pessoas }] = await Promise.all([
    sb.from("extras").select("*").order("criado_em", { ascending: false }).limit(30),
    sb.from("entregas_extra").select("*").order("enviado_em", { ascending: false }),
    sb.from("perfis").select("id, nome, foto_url"),
  ]);
  const pessoa = new Map((pessoas ?? []).map((p) => [p.id, p]));
  const esperando = (entregas ?? []).filter((e) => e.status === "enviado").length;

  return (
    <>
      <Cabecalho icone="gear" titulo="Painel do gestor" sub="Vídeos extras: você sugere um vídeo com valor e prazo. Quem fizer manda o link, você aprova e o valor entra no total do mês do criador." />
      <AbasGestor ativa="extras" />
      <Retorno ok={ok} erro={erro} />

      <form action={criarExtra} className="card flex flex-col gap-3">
        <TituloCard icone="plus">Novo vídeo extra</TituloCard>
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))" }}>
          <label className="flex flex-col gap-1.5" style={{ gridColumn: "span 2" }}><span className="label">TÍTULO</span><input className="input" name="titulo" maxLength={120} placeholder="Ex.: Short mostrando o farm de XP do 1v1" required /></label>
          <label className="flex flex-col gap-1.5"><span className="label">VALOR (R$)</span><input className="input" name="valor" inputMode="decimal" placeholder="25,00" required /></label>
          <label className="flex flex-col gap-1.5"><span className="label">PRAZO (POSTAR ATÉ)</span><input className="input" type="date" name="prazo" min={hoje} defaultValue={somarDias(hoje, 6)} required /></label>
        </div>
        <label className="flex flex-col gap-1.5"><span className="label">DESCRIÇÃO</span><textarea className="input" name="descricao" rows={3} maxLength={1000} placeholder="O que precisa ter no vídeo, em qual rede postar, link de referência..." style={{ paddingTop: 10, resize: "vertical" }} /></label>
        <p style={{ margin: 0, color: "var(--muted)", fontSize: 13 }}>Todos os criadores recebem uma notificação. Cada um que fizer e for aprovado ganha o valor.</p>
        <button className="btn-gold" type="submit" style={{ alignSelf: "flex-start" }}>Criar extra</button>
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
                  <div style={{ color: "var(--muted)", fontSize: 13 }}>Até {diaBr(x.prazo)} · {aberto ? "aberto" : x.ativo ? "prazo acabou" : "encerrado"}</div>
                </div>
                <span className="num" style={{ fontSize: 22, color: "var(--ok)" }}>{formatarReais(x.valor_centavos)}</span>
                <form action={encerrarExtra}><input type="hidden" name="extra" value={x.id} /><input type="hidden" name="ativo" value={x.ativo ? "0" : "1"} /><button className="btn-line" type="submit" style={{ minHeight: 34, fontSize: 13 }}>{x.ativo ? "Encerrar" : "Reabrir"}</button></form>
              </div>
              {x.descricao && <p style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: 14, lineHeight: 1.45 }}>{x.descricao}</p>}
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
