import Link from "next/link";
import { Cabecalho, TituloCard } from "@/components/Blocos";
import { Icone } from "@/components/Icone";
import { IdeiasVideos } from "@/components/IdeiasVideos";
import { usuarioAtual } from "@/lib/dados";
import { iaConfigurada } from "@/lib/ia/claude";
import { geminiConfigurado } from "@/lib/ia/gemini";
import { MAPAS } from "@/lib/ia/mapas";
import { videosDosCanais, type VideoRef } from "@/lib/ideias";

export const maxDuration = 60;

export default async function Ideias({ searchParams }: { searchParams: Promise<{ mapa?: string; tema?: string; aba?: string }> }) {
  const { sb, perfil } = await usuarioAtual();
  const q = await searchParams;
  const mapa = MAPAS.find((m) => m.id === q.mapa) ?? MAPAS[0];
  const tema = (mapa.temas as readonly string[]).find((t) => t === q.tema) ?? mapa.temas[0];
  const aba = q.aba === "curtidos" ? "curtidos" : "explorar";
  const { data: curtidosDb } = await sb.from("curtidos").select("video").eq("criador_id", perfil.id).order("criado_em", { ascending: false }).limit(200);
  const curtidos = (curtidosDb ?? []).map((c) => c.video as VideoRef);
  const { data: canais } = await sb.from("canais_referencia").select("canal_id, nome").eq("mapa", mapa.id).eq("tema", tema);
  let videos: VideoRef[] = [];
  let erro = "";
  if (aba === "explorar") try { videos = await videosDosCanais((canais ?? []).map((c) => c.canal_id as string)); } catch (e) { erro = e instanceof Error ? e.message : "Não consegui buscar os vídeos agora."; }

  const semana = Date.now() - 7 * 86_400_000;
  // melhores = os que mais crescem: views por dia desde que foram postados (mínimo de 6 horas, para não exagerar vídeos recém-postados)
  const porDia = (v: VideoRef) => v.views / Math.max(0.25, (Date.now() - new Date(v.publicado).getTime()) / 86_400_000);
  const melhores = videos.filter((v) => new Date(v.publicado).getTime() >= semana).map((v) => ({ ...v, porDia: Math.round(porDia(v)) })).sort((a, b) => b.porDia - a.porDia).slice(0, 10);

  const ids = [...new Set([...melhores, ...videos.slice(0, 50)].map((v) => v.id))];
  const { data: prontas } = ids.length ? await sb.from("traducoes").select("video_id, falas, mapa_citado").eq("mapa", mapa.id).in("video_id", ids) : { data: [] };
  const traduzidos = Object.fromEntries((prontas ?? []).map((t) => [t.video_id as string, { falas: t.falas as string[], mapa_citado: t.mapa_citado as string }]));
  const idsC = curtidos.map((v) => v.id);
  const { data: prontasC } = aba === "curtidos" && idsC.length ? await sb.from("traducoes").select("video_id, falas, mapa_citado").eq("mapa", mapa.id).in("video_id", idsC) : { data: [] };
  const traduzidosCurtidos = Object.fromEntries((prontasC ?? []).map((t) => [t.video_id as string, { falas: t.falas as string[], mapa_citado: t.mapa_citado as string }]));

  return (
    <>
      <Cabecalho icone="bulb" titulo="Ideias & roteiros" sub="Escolha o mapa e o tema. Veja os melhores vídeos novos dos canais de referência e copie o roteiro em português." />

      <nav className="flex flex-wrap gap-2" aria-label="Abas de Ideias & roteiros">
        <Link href={`/ideias?mapa=${mapa.id}&tema=${encodeURIComponent(tema)}`} className={aba === "explorar" ? "btn-gold" : "btn-line"} aria-current={aba === "explorar" ? "page" : undefined} style={{ minHeight: 40 }}><Icone nome="bulb" tamanho={16} />Explorar</Link>
        <Link href={`/ideias?mapa=${mapa.id}&aba=curtidos`} className={aba === "curtidos" ? "btn-gold" : "btn-line"} aria-current={aba === "curtidos" ? "page" : undefined} style={{ minHeight: 40 }}>❤️ Curtidos{curtidos.length ? ` (${curtidos.length})` : ""}</Link>
      </nav>

      <section className="card flex flex-col gap-4">
        <TituloCard icone="target">{aba === "curtidos" ? "Para qual mapa é o roteiro?" : "1. Qual mapa você vai divulgar?"}</TituloCard>
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))" }}>
          {MAPAS.map((m, i) => {
            const ativo = m.id === mapa.id;
            return (
              <Link key={m.id} href={`/ideias?mapa=${m.id}${aba === "curtidos" ? "&aba=curtidos" : ""}`} aria-current={ativo ? "true" : undefined} className="flex items-center gap-3" style={{ minHeight: 64, padding: "12px 16px", borderRadius: 8, border: `1px solid ${ativo ? "#E8B014" : "var(--line)"}`, background: ativo ? "var(--tint)" : "var(--bg)" }}>
                <span style={{ fontSize: 24 }}>{m.emoji}</span>
                <span className="flex flex-col"><span className="label">Opção {i + 1}</span><span style={{ color: "var(--strong)", fontWeight: 600 }}>{m.nome}</span></span>
                {ativo && <span style={{ marginLeft: "auto", color: "var(--accent-text)", display: "flex" }}><Icone nome="check" /></span>}
              </Link>
            );
          })}
        </div>
      </section>

      {aba === "curtidos" ? (
        <IdeiasVideos mapa={mapa.id} tema={tema} melhores={[]} recentes={[]} iaPronta={iaConfigurada()} automatico={geminiConfigurado()} traduzidos={traduzidosCurtidos} curtidos={curtidos} soCurtidos />
      ) : <>
      <section className="card flex flex-col gap-4">
        <TituloCard icone="bulb">2. Qual o tema do vídeo?</TituloCard>
        <div className="flex flex-wrap gap-2">
          {mapa.temas.map((t) => (
            <Link key={t} href={`/ideias?mapa=${mapa.id}&tema=${encodeURIComponent(t)}`} className={t === tema ? "btn-gold" : "btn-line"} aria-current={t === tema ? "true" : undefined}>{t}</Link>
          ))}
        </div>
      </section>

      {!canais?.length ? (
        <section className="card" style={{ color: "var(--muted)" }}>
          {perfil.papel === "gestor" ? <>Nenhum canal de referência para <b style={{ color: "var(--fg)" }}>{tema}</b> ainda. Cadastre em <Link href="/gestor/config#referencias" style={{ color: "var(--accent-text)" }}>Painel do gestor → Canais de referência</Link>.</> : <>O gestor ainda não cadastrou os canais de referência de <b style={{ color: "var(--fg)" }}>{tema}</b>.</>}
        </section>
      ) : erro ? (
        <section className="card pill-warn" style={{ padding: "14px 16px" }}>{erro}</section>
      ) : (
        <IdeiasVideos mapa={mapa.id} tema={tema} melhores={melhores} recentes={videos.slice(0, 50)} iaPronta={iaConfigurada()} automatico={geminiConfigurado()} traduzidos={traduzidos} curtidos={curtidos} />
      )}
      </>}
    </>
  );
}
