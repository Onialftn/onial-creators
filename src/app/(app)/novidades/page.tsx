import { Cabecalho, TituloCard } from "@/components/Blocos";
import { TextoSimples } from "@/components/TextoSimples";
import { apagarNovidade, publicarNovidade } from "@/app/acoes/novidades";
import { usuarioAtual } from "@/lib/dados";
import { MAPAS } from "@/lib/ia/mapas";
import { Retorno } from "../gestor/comum";

const quando = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Sao_Paulo" });

export default async function Novidades({ searchParams }: { searchParams: Promise<{ ok?: string; erro?: string; mapa?: string }> }) {
  const { sb, perfil } = await usuarioAtual();
  const { ok, erro, mapa: filtro } = await searchParams;
  const { data } = await sb.from("novidades").select("id, mapa, titulo, texto, criado_em").order("criado_em", { ascending: false }).limit(50);
  const lista = (data ?? []).filter((n) => !filtro || n.mapa === filtro);
  const gestor = perfil.papel === "gestor";

  return (
    <>
      <Cabecalho icone="zap" titulo="Novidades" sub="Atualizações dos mapas da Onial. Use as novidades para criar vídeos e divulgar." />
      <Retorno ok={ok} erro={erro} />

      {gestor && (
        <details className="card">
          <summary className="btn-gold" style={{ width: "fit-content", listStyle: "none", cursor: "pointer" }}>+ Publicar novidade</summary>
          <form action={publicarNovidade} className="flex flex-col gap-3" style={{ marginTop: 14 }}>
            <label className="flex flex-col gap-1.5"><span className="label">Mapa</span>
              <select className="input" name="mapa" defaultValue="">
                <option value="">Geral (sem mapa)</option>
                {MAPAS.map((m) => <option key={m.id} value={m.id}>{m.emoji} {m.nome}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1.5"><span className="label">Título</span><input className="input" name="titulo" maxLength={120} required placeholder="Atualização do mapa de XP!" /></label>
            <label className="flex flex-col gap-1.5"><span className="label">Texto</span>
              <textarea className="input" name="texto" rows={10} maxLength={5000} placeholder={"Use - no começo da linha para lista e **texto** para negrito."} style={{ padding: 12, resize: "vertical" }} />
            </label>
            <button className="btn-gold" type="submit" style={{ width: "fit-content" }}>Publicar e notificar a equipe</button>
          </form>
        </details>
      )}

      <nav className="flex flex-wrap gap-2" aria-label="Filtrar por mapa">
        <a href="/novidades" className={!filtro ? "btn-gold" : "btn-line"} style={{ minHeight: 36, fontSize: 13 }}>Todos</a>
        {MAPAS.map((m) => <a key={m.id} href={`/novidades?mapa=${m.id}`} className={filtro === m.id ? "btn-gold" : "btn-line"} style={{ minHeight: 36, fontSize: 13 }}>{m.emoji} {m.falado}</a>)}
      </nav>

      {lista.length === 0 && <div className="card" style={{ color: "var(--muted)" }}>Nenhuma novidade por aqui ainda.</div>}
      {lista.map((n, i) => {
        const m = MAPAS.find((x) => x.id === n.mapa);
        return (
          <article key={n.id} id={`n-${n.id}`} className="card flex flex-col gap-3" style={i === 0 && !filtro ? { borderColor: "#E8B014" } : undefined}>
            <div className="flex flex-wrap items-center gap-2" style={{ fontSize: 13 }}>
              <span className="pill-tint">{m ? `${m.emoji} ${m.nome}` : "Geral"}</span>
              {i === 0 && !filtro && <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.2, padding: "2px 7px", borderRadius: 4, background: "#E8B014", color: "#0A0A0A" }}>MAIS RECENTE</span>}
              <span style={{ color: "var(--muted)", marginLeft: "auto" }}>{quando(n.criado_em)}</span>
            </div>
            <TituloCard icone="zap">{n.titulo}</TituloCard>
            {n.texto && <TextoSimples texto={n.texto} />}
            {gestor && (
              <details style={{ fontSize: 12 }}>
                <summary style={{ cursor: "pointer", color: "var(--muted)", width: "fit-content" }}>Apagar novidade</summary>
                <form action={apagarNovidade} style={{ marginTop: 6 }}>
                  <input type="hidden" name="id" value={n.id} />
                  <button type="submit" className="btn-line" style={{ minHeight: 32, fontSize: 12, color: "var(--warn)" }}>Sim, apagar</button>
                </form>
              </details>
            )}
          </article>
        );
      })}
    </>
  );
}
