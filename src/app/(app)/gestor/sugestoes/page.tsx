import { redirect } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { Cabecalho, TituloCard } from "@/components/Blocos";
import { responderSugestao } from "@/app/acoes/novidades";
import { usuarioAtual } from "@/lib/dados";
import { AbasGestor, Retorno } from "../comum";
import { SITUACAO } from "@/lib/sugestoes";

const quando = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" });

export default async function SugestoesGestor({ searchParams }: { searchParams: Promise<{ ok?: string; erro?: string }> }) {
  const { sb, perfil } = await usuarioAtual();
  if (perfil.papel !== "gestor") redirect("/");
  const { ok, erro } = await searchParams;
  const [{ data }, { data: pessoas }] = await Promise.all([
    sb.from("sugestoes").select("id, criador_id, texto, status, motivo, criado_em").order("criado_em", { ascending: false }).limit(100),
    sb.from("perfis").select("id, nome, foto_url"),
  ]);
  const pessoa = new Map((pessoas ?? []).map((p) => [p.id, p]));
  const novas = (data ?? []).filter((s) => s.status === "enviada");
  const respondidas = (data ?? []).filter((s) => s.status !== "enviada");

  return (
    <>
      <Cabecalho icone="gear" titulo="Painel do gestor" sub="Sugestões da equipe para melhorar o site. Ao aprovar ou recusar, quem mandou recebe uma notificação." />
      <AbasGestor ativa="sugestoes" />
      <Retorno ok={ok} erro={erro} />
      <section className="card flex flex-col gap-3">
        <TituloCard icone="bulb" direita={`${novas.length} esperando`}>Para responder</TituloCard>
        {novas.length === 0 && <p style={{ margin: 0, color: "var(--muted)" }}>Nenhuma sugestão esperando resposta.</p>}
        {novas.map((s) => {
          const p = pessoa.get(s.criador_id);
          return (
            <div key={s.id} className="tile flex flex-col gap-3">
              <div className="flex items-center gap-2" style={{ fontSize: 13 }}>
                <Avatar foto={p?.foto_url ?? null} nome={p?.nome ?? "?"} tamanho={26} />
                <b style={{ color: "var(--strong)" }}>{p?.nome ?? "Alguém"}</b>
                <span style={{ color: "var(--muted)", marginLeft: "auto" }}>{quando(s.criado_em)}</span>
              </div>
              <p style={{ margin: 0, color: "var(--strong)", whiteSpace: "pre-wrap" }}>{s.texto}</p>
              <div className="flex flex-wrap items-start gap-2">
                <form action={responderSugestao}>
                  <input type="hidden" name="id" value={s.id} /><input type="hidden" name="decisao" value="aprovar" />
                  <button className="btn-gold" type="submit" style={{ minHeight: 36 }}>Aprovar</button>
                </form>
                <details>
                  <summary className="btn-line" style={{ minHeight: 36, listStyle: "none", cursor: "pointer" }}>Recusar</summary>
                  <form action={responderSugestao} className="flex flex-col gap-2" style={{ marginTop: 8, minWidth: 260 }}>
                    <input type="hidden" name="id" value={s.id} /><input type="hidden" name="decisao" value="recusar" />
                    <textarea className="input" name="motivo" rows={3} maxLength={1000} placeholder="Explique o motivo (opcional)" style={{ padding: 10, resize: "vertical" }} />
                    <button className="btn-line" type="submit" style={{ minHeight: 36, color: "var(--warn)", width: "fit-content" }}>Confirmar recusa</button>
                  </form>
                </details>
              </div>
            </div>
          );
        })}
      </section>
      {respondidas.length > 0 && (
        <section className="card flex flex-col gap-2">
          <TituloCard icone="check">Respondidas</TituloCard>
          {respondidas.map((s) => (
            <div key={s.id} className="flex flex-wrap items-baseline gap-2" style={{ fontSize: 13, padding: "8px 0", borderTop: "1px solid var(--line)" }}>
              <span className={SITUACAO[s.status]?.classe} style={{ fontSize: 11 }}>{SITUACAO[s.status]?.rotulo}</span>
              <b style={{ color: "var(--strong)" }}>{pessoa.get(s.criador_id)?.nome.split(" ")[0]}</b>
              <span className="flex-1" style={{ minWidth: 200 }}>{s.texto}{s.motivo && <span style={{ color: "var(--muted)" }}> · Motivo: {s.motivo}</span>}</span>
            </div>
          ))}
        </section>
      )}
    </>
  );
}
