import { Cabecalho, TituloCard } from "@/components/Blocos";
import { enviarSugestao } from "@/app/acoes/novidades";
import { usuarioAtual } from "@/lib/dados";
import { SITUACAO } from "@/lib/sugestoes";
import { Retorno } from "../gestor/comum";

const quando = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" });

export default async function Sugestoes({ searchParams }: { searchParams: Promise<{ ok?: string; erro?: string }> }) {
  const { sb, perfil } = await usuarioAtual();
  const { ok, erro } = await searchParams;
  const { data } = await sb.from("sugestoes").select("id, texto, status, motivo, criado_em").eq("criador_id", perfil.id).order("criado_em", { ascending: false }).limit(50);

  return (
    <>
      <Cabecalho icone="bulb" titulo="Sugestões" sub="Tem uma ideia para melhorar o site? Mande aqui. O gestor lê, aprova ou recusa, e você recebe a resposta nas notificações." />
      <Retorno ok={ok} erro={erro} />
      <form action={enviarSugestao} className="card flex flex-col gap-3">
        <TituloCard icone="bulb">Nova sugestão</TituloCard>
        <textarea className="input" name="texto" rows={4} maxLength={2000} required placeholder="Ex.: colocar um aviso quando meu vídeo passar de 100 mil views" style={{ padding: 12, resize: "vertical" }} />
        <button className="btn-gold" type="submit" style={{ width: "fit-content" }}>Enviar sugestão</button>
      </form>
      <section className="card flex flex-col gap-3">
        <TituloCard icone="script">Minhas sugestões</TituloCard>
        {(data ?? []).length === 0 && <p style={{ margin: 0, color: "var(--muted)" }}>Você ainda não mandou nenhuma sugestão.</p>}
        {(data ?? []).map((s) => (
          <div key={s.id} className="tile flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2" style={{ fontSize: 12 }}>
              <span className={SITUACAO[s.status]?.classe}>{SITUACAO[s.status]?.rotulo}</span>
              <span style={{ color: "var(--muted)", marginLeft: "auto" }}>{quando(s.criado_em)}</span>
            </div>
            <p style={{ margin: 0, color: "var(--strong)", whiteSpace: "pre-wrap" }}>{s.texto}</p>
            {s.status === "recusada" && s.motivo && <p style={{ margin: 0, fontSize: 13, color: "var(--muted)" }}><b>Motivo:</b> {s.motivo}</p>}
          </div>
        ))}
      </section>
    </>
  );
}
