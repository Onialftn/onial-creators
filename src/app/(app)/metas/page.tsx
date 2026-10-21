import { Cabecalho, TituloCard } from "@/components/Blocos";
import { COR_PLATAFORMA, Icone, LogoPlataforma, NOME_PLATAFORMA } from "@/components/Icone";
import { PLATAFORMAS, resumoDoMes, topVideos, usuarioAtual, type Plataforma } from "@/lib/dados";
import { diasNoMes, hojeBrasil, mesAnterior, mesDe, nomeMes } from "@/lib/datas";
import { formatarNumero, formatarReais } from "@/lib/pagamento";

export default async function Metas() {
  const { sb, perfil } = await usuarioAtual();
  const mes = mesDe(hojeBrasil());
  const [r, anterior, top] = await Promise.all([resumoDoMes(sb, perfil.id, mes), resumoDoMes(sb, perfil.id, mesAnterior(mes)), topVideos(sb, perfil.id, mes, 50)]);
  const diaHoje = Number(r.hoje.slice(8));
  const restam = Math.max(1, diasNoMes(mes) - diaHoje + 1);
  const pct = r.meta ? Math.min(1, r.views / r.meta) : 0;
  const porDia = r.meta ? Math.max(0, Math.ceil((r.meta - r.views) / restam)) : 0;
  const projecao = Math.round((r.views / Math.max(1, diaHoje)) * diasNoMes(mes));
  const C = 2 * Math.PI * 70;
  const viral = PLATAFORMAS.map((p) => ({ p, v: top.find((t) => t.plataforma === p) })).filter((x) => x.v);
  const campeao = viral.reduce<typeof viral[number] | null>((a, b) => (!a || b.v!.views > a.v!.views ? b : a), null);

  return (
    <>
      <Cabecalho icone="target" titulo="Metas de views" sub={`Seus números de TikTok, YouTube e Instagram em ${nomeMes(mes).toLowerCase()}, até hoje (dia ${diaHoje}).`} />

      <section className="card flex flex-wrap items-center gap-7">
        <div className="relative flex-none" style={{ width: 180, height: 180 }}>
          <svg width="180" height="180" viewBox="0 0 180 180" aria-hidden="true">
            <circle cx="90" cy="90" r="70" fill="none" stroke="var(--track)" strokeWidth="14" />
            <circle cx="90" cy="90" r="70" fill="none" stroke="#E8B014" strokeWidth="14" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - pct)} transform="rotate(-90 90 90)" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="num" style={{ fontSize: 40, color: "var(--strong)", lineHeight: 1 }}>{r.meta ? `${Math.round(pct * 100)}%` : "—"}</div>
            <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 4 }}>da meta</div>
          </div>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-4" style={{ flexBasis: 300 }}>
          <div>
            <div className="label">Meta de {nomeMes(mes).split(" ")[0]}</div>
            <div className="num" style={{ fontSize: 40, color: "var(--strong)", lineHeight: 1.1, marginTop: 4 }}>
              {formatarNumero(r.views)} <span style={{ fontSize: 22, color: "var(--muted)" }}>/ {r.meta ? formatarNumero(r.meta) : "sem meta"} views</span>
            </div>
          </div>
          <div className="grid gap-2.5" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))" }}>
            {[
              ["Faltam", r.meta ? formatarNumero(Math.max(0, r.meta - r.views)) : "—", "var(--strong)"],
              ["Por dia até o fim do mês", r.meta ? formatarNumero(porDia) : "—", "var(--accent-text)"],
              ["Projeção no ritmo atual", formatarNumero(projecao), "var(--ok)"],
              ["Bônus ao bater a meta", r.meta ? formatarReais(Math.round(r.meta / 10)) : "—", "var(--ok)"],
            ].map(([l, v, c]) => (
              <div key={l} className="tile"><div style={{ fontSize: 12, color: "var(--muted)" }}>{l}</div><div className="num" style={{ fontSize: 24, color: c, marginTop: 2 }}>{v}</div></div>
            ))}
          </div>
        </div>
      </section>

      <section className="flex flex-wrap gap-4">
        {PLATAFORMAS.map((p: Plataforma) => {
          const v = r.viewsPorPlataforma[p];
          const va = anterior.viewsPorPlataforma[p];
          const delta = va ? Math.round(((v - va) / va) * 100) : null;
          const vids = top.filter((t) => t.plataforma === p);
          const maior = vids[0]?.views ?? 0;
          return (
            <div key={p} className="card flex min-w-0 flex-col gap-4" style={{ flex: "1 1 260px" }}>
              <div className="flex items-center gap-3">
                <LogoPlataforma p={p} tamanho={40} />
                <div className="flex-1"><div style={{ color: "var(--strong)", fontWeight: 600, fontSize: 16 }}>{NOME_PLATAFORMA[p]}</div><div style={{ color: "var(--muted)", fontSize: 12 }}>{r.views ? Math.round((v / r.views) * 100) : 0}% das suas views</div></div>
                {delta !== null && <span className={delta >= 0 ? "pill-ok" : "pill-warn"}><Icone nome={delta >= 0 ? "up" : "down"} tamanho={12} />{delta >= 0 ? "+" : ""}{delta}%</span>}
              </div>
              <div className="num" style={{ fontSize: 34, color: "var(--strong)", lineHeight: 1 }}>{formatarNumero(v)}</div>
              <div className="bar"><span style={{ width: `${r.views ? (v / r.views) * 100 : 0}%`, background: COR_PLATAFORMA[p] }} /></div>
              <div className="grid grid-cols-3 gap-2">
                {[["Vídeos", String(vids.length)], ["Média/vídeo", vids.length ? formatarNumero(Math.round(v / vids.length)) : "—"], ["Maior vídeo", maior ? formatarNumero(maior) : "—"]].map(([l, val]) => (
                  <div key={l}><div style={{ fontSize: 11, letterSpacing: 0.8, color: "var(--muted)", textTransform: "uppercase" }}>{l}</div><div className="num" style={{ fontSize: 18, color: "var(--text2)", marginTop: 2 }}>{val}</div></div>
                ))}
              </div>
              <div style={{ color: "var(--muted)", fontSize: 12 }}>{formatarReais(Math.round(v / 2))} brutos{delta !== null ? " · selo mostra a variação vs. mês passado" : ""}</div>
            </div>
          );
        })}
      </section>

      <section className="flex flex-col gap-4">
        <TituloCard icone="zap">Vídeos mais virais do mês</TituloCard>
        {viral.length === 0 ? (
          <p style={{ color: "var(--muted)", margin: 0 }}>Assim que seus vídeos tiverem views neste mês, os maiores de cada plataforma aparecem aqui.</p>
        ) : (
          <div className="overflow-x-auto">
            <div className="grid gap-3.5" style={{ gridTemplateColumns: "repeat(3,minmax(0,1fr))", minWidth: 600 }}>
              {viral.map(({ p, v }) => (
                <a key={p} href={v!.url ?? undefined} target="_blank" rel="noreferrer" className="card flex min-w-0 flex-col gap-3" style={{ padding: 14, ...(campeao?.p === p ? { borderColor: "#E8B014", boxShadow: "0 0 30px rgba(232,176,20,.25)" } : {}) }}>
                  <div className="relative" style={{ aspectRatio: "16/10", borderRadius: 6, background: "linear-gradient(160deg,#2A2208,#0A0A0A 75%)" }}>
                    {campeao?.p === p && <span className="pill absolute" style={{ left: 10, top: 10, background: "#E8B014", color: "#0A0A0A", fontSize: 11 }}><Icone nome="crown" tamanho={12} />MAIS VIRAL DO MÊS</span>}
                    <span className="absolute" style={{ right: 10, top: 10 }}><LogoPlataforma p={p} tamanho={30} /></span>
                    <span className="num absolute" style={{ left: 10, bottom: 8, fontSize: 24, color: "#fff" }}>{formatarNumero(v!.views)}</span>
                  </div>
                  <div style={{ color: "var(--strong)", fontWeight: 600, lineHeight: 1.3 }}>{v!.titulo || "Vídeo sem título"}</div>
                  <div style={{ color: "var(--muted)", fontSize: 12 }}>Maior vídeo no {NOME_PLATAFORMA[p]}</div>
                </a>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="card">
        <TituloCard icone="trophy">Top vídeos do mês</TituloCard>
        <div className="overflow-x-auto" style={{ marginTop: 14 }}>
          <table className="table" style={{ minWidth: 560 }}>
            <thead><tr><th scope="col">#</th><th scope="col">VÍDEO</th><th scope="col">PLATAFORMA</th><th scope="col">VIEWS NO MÊS</th><th scope="col">POSTADO</th></tr></thead>
            <tbody>
              {top.slice(0, 6).map((t, i) => (
                <tr key={t.id}>
                  <td className="num" style={{ fontSize: 18, color: i === 0 ? "var(--accent-text)" : "var(--muted)" }}>{i + 1}</td>
                  <td style={{ color: "var(--strong)", fontWeight: 600 }}>{t.url ? <a href={t.url} target="_blank" rel="noreferrer">{t.titulo || "Vídeo sem título"}</a> : t.titulo || "Vídeo sem título"}</td>
                  <td><span className="flex items-center gap-2"><LogoPlataforma p={t.plataforma} tamanho={24} />{NOME_PLATAFORMA[t.plataforma]}</span></td>
                  <td className="num" style={{ fontSize: 17, color: "var(--strong)" }}>{formatarNumero(t.views)}</td>
                  <td style={{ color: "var(--muted)" }}>{t.postado_em.slice(8)}/{t.postado_em.slice(5, 7)}</td>
                </tr>
              ))}
              {top.length === 0 && <tr><td colSpan={5} style={{ color: "var(--muted)" }}>Nenhum vídeo com views neste mês ainda.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
