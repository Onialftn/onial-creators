"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { limparNotificacoes, marcarLidas } from "@/app/acoes/notificacoes";
import { Icone } from "./Icone";

export interface Notificacao { id: string; tipo: string; titulo: string; texto: string; link: string | null; lida: boolean; criado_em: string }

function ha(iso: string) {
  const m = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (m < 60) return `${m} min`;
  const h = Math.round(m / 60);
  return h < 24 ? `${h} h` : `${Math.round(h / 24)} d`;
}
const ICONE: Record<string, string> = { postar: "cal", constancia: "cal", meta: "target", video: "zap", ranking: "trophy", pagamento: "wallet", rede: "zap", ajuda: "users", "boas-vindas": "bell" };

function base64ParaBytes(b64: string) {
  const s = atob((b64 + "=".repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
}

type EstadoPush = "carregando" | "sem-suporte" | "iphone-instalar" | "bloqueado" | "desligado" | "ligado";

/** Botão de ligar os avisos no celular/computador deste aparelho. */
function AvisosCelular({ chavePublica }: { chavePublica: string | null }) {
  const [estado, setEstado] = useState<EstadoPush>("carregando");
  const [erro, setErro] = useState("");
  useEffect(() => {
    (async () => {
      const iphone = /iPhone|iPad|iPod/.test(navigator.userAgent);
      const instalado = window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone;
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) return setEstado(iphone && !instalado ? "iphone-instalar" : "sem-suporte");
      if (Notification.permission === "denied") return setEstado("bloqueado");
      const reg = await navigator.serviceWorker.register("/sw.js");
      setEstado((await reg.pushManager.getSubscription()) ? "ligado" : "desligado");
    })().catch(() => setEstado("sem-suporte"));
  }, []);
  async function ligar() {
    setErro("");
    try {
      if ((await Notification.requestPermission()) !== "granted") return setEstado("bloqueado");
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64ParaBytes(chavePublica!) });
      const r = await fetch("/api/push/inscrever", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(sub.toJSON()) });
      if (!r.ok) throw new Error();
      setEstado("ligado");
    } catch { setErro("Não consegui ligar as notificações neste aparelho. Tente de novo."); }
  }
  async function desligar() {
    const reg = await navigator.serviceWorker.getRegistration("/sw.js");
    const sub = await reg?.pushManager.getSubscription();
    if (sub) { await fetch("/api/push/inscrever", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) }); await sub.unsubscribe(); }
    setEstado("desligado");
  }
  if (!chavePublica || estado === "carregando" || estado === "sem-suporte") return null;
  const caixa = { padding: "10px 12px", borderRadius: 8, background: "var(--bg)", border: "1px solid var(--line)", fontSize: 13, color: "var(--text2)" } as const;
  if (estado === "iphone-instalar")
    return <div style={caixa}><b style={{ color: "var(--fg)" }}>Notificações no iPhone:</b> toque em <b>Compartilhar</b> (o quadrado com a seta) → <b>Adicionar à Tela de Início</b>. Abra o Onial pelo ícone novo e ligue as notificações aqui.</div>;
  if (estado === "bloqueado")
    return <div style={caixa}>As notificações estão bloqueadas neste aparelho. Libere nas configurações do navegador (Notificações → onial-creators.com.br) e volte aqui.</div>;
  return (
    <div className="flex flex-wrap items-center justify-between gap-2" style={caixa}>
      <span>{estado === "ligado" ? "✅ Notificações ligadas neste aparelho" : "Receba as notificações na tela do celular"}</span>
      {estado === "ligado" ? <button onClick={desligar} style={{ color: "var(--muted)", fontSize: 12, textDecoration: "underline" }}>Desligar</button> : <button className="btn-gold" onClick={ligar} style={{ minHeight: 34, padding: "0 12px", fontSize: 13 }}>Ligar notificações</button>}
      {erro && <span style={{ color: "var(--warn)", width: "100%" }}>{erro}</span>}
    </div>
  );
}

/** Sino com a lista de avisos (abre um painel pela direita). */
export function Sino({ itens: iniciais, chavePublica, compacto = false }: { itens: Notificacao[]; chavePublica: string | null; compacto?: boolean }) {
  const [aberto, setAberto] = useState(false);
  const [itens, setItens] = useState(iniciais);
  const [, iniciar] = useTransition();
  const router = useRouter();
  useEffect(() => setItens(iniciais), [iniciais]);
  // busca notificações novas a cada 1 minuto (e quando a pessoa volta para a aba), sem precisar recarregar a página
  useEffect(() => {
    if (compacto) return; // o menu tem dois sinos (computador e celular): só um busca
    const buscar = () => { if (document.visibilityState === "visible") router.refresh(); };
    const t = setInterval(buscar, 60_000);
    document.addEventListener("visibilitychange", buscar);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", buscar); };
  }, [router, compacto]);
  const naoLidas = itens.filter((i) => !i.lida).length;
  function lidas(ids?: string[]) {
    setItens((l) => l.map((i) => (!ids || ids.includes(i.id) ? { ...i, lida: true } : i)));
    iniciar(() => marcarLidas(ids));
  }
  function limpar(ids?: string[]) {
    setItens((l) => (ids ? l.filter((i) => !ids.includes(i.id)) : []));
    iniciar(() => limparNotificacoes(ids));
  }
  useEffect(() => {
    if (!aberto) return;
    const f = (e: KeyboardEvent) => e.key === "Escape" && setAberto(false);
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, [aberto]);
  function abrir() {
    setAberto(true);
  }
  return (
    <>
      <button type="button" onClick={abrir} aria-label={naoLidas ? `Notificações: ${naoLidas} novas` : "Notificações"} className={compacto ? "relative flex items-center justify-center" : "menu-item relative w-full"} style={compacto ? { width: 44, height: 44, borderRadius: 8, border: "1px solid var(--line)", background: "var(--panel)", color: "var(--fg)" } : undefined}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10 21h4" /></svg>
        {!compacto && "Notificações"}
        {naoLidas > 0 && <span className="num" style={{ position: compacto ? "absolute" : "static", top: -6, right: -6, marginLeft: compacto ? 0 : "auto", minWidth: 20, height: 20, padding: "0 6px", borderRadius: 10, background: "#FF5C5C", color: "#fff", fontSize: 12, lineHeight: "20px", textAlign: "center" }}>{naoLidas > 9 ? "9+" : naoLidas}</span>}
      </button>
      {aberto && (
        <div className="fixed inset-0 z-[60]" style={{ background: "rgba(0,0,0,.55)" }} onClick={(e) => e.target === e.currentTarget && setAberto(false)}>
          <aside role="dialog" aria-label="Notificações" className="absolute inset-y-0 right-0 flex flex-col gap-3 overflow-y-auto" style={{ width: "min(380px, 92vw)", padding: 18, background: "var(--side)", borderLeft: "1px solid var(--line)", boxShadow: "-12px 0 40px rgba(0,0,0,.5)" }}>
            <div className="flex items-center justify-between">
              <h2 className="h2 m-0" style={{ fontSize: 20 }}>Notificações</h2>
              <button aria-label="Fechar notificações" onClick={() => setAberto(false)} className="flex items-center justify-center" style={{ width: 40, height: 40, color: "var(--muted)" }}><Icone nome="x" tamanho={18} /></button>
            </div>
            <AvisosCelular chavePublica={chavePublica} />
            {itens.length > 0 && (
              <div className="flex items-center justify-between gap-2" style={{ fontSize: 13 }}>
                <button type="button" onClick={() => lidas()} disabled={!naoLidas} className="flex items-center gap-1" style={{ color: naoLidas ? "var(--accent-text)" : "var(--muted)", minHeight: 32 }}><Icone nome="check" tamanho={14} /> Marcar todas como lidas</button>
                <button type="button" onClick={() => limpar()} style={{ color: "var(--muted)", minHeight: 32 }}>Limpar tudo</button>
              </div>
            )}
            {itens.length === 0 && <p style={{ margin: 0, color: "var(--muted)" }}>Você não tem notificações ainda.</p>}
            {itens.map((n) => {
              const corpo = (
                <div className="flex gap-3" style={{ padding: 12, paddingRight: 40, borderRadius: 8, background: n.lida ? "transparent" : "var(--tint)", border: "1px solid var(--line)" }}>
                  <span style={{ color: "var(--accent-text)", display: "flex", paddingTop: 2 }}><Icone nome={ICONE[n.tipo] ?? "zap"} tamanho={18} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-start justify-between gap-2"><b style={{ color: "var(--strong)", fontSize: 14, lineHeight: 1.35 }}>{n.titulo}</b><span style={{ color: "var(--muted)", fontSize: 11, whiteSpace: "nowrap" }}>{!n.lida && <span aria-label="Nova" style={{ display: "inline-block", width: 7, height: 7, borderRadius: 4, background: "#E8B014", marginRight: 5 }} />}{ha(n.criado_em)}</span></span>
                    {n.texto && <span style={{ display: "block", color: "var(--text2)", fontSize: 13, marginTop: 3, lineHeight: 1.45 }}>{n.texto}</span>}
                  </span>
                </div>
              );
              const abrirItem = () => { if (!n.lida) lidas([n.id]); };
              return (
                <div key={n.id} className="relative">
                  {n.link ? <Link href={n.link} onClick={() => { abrirItem(); setAberto(false); }}>{corpo}</Link> : <div onClick={abrirItem}>{corpo}</div>}
                  <button type="button" aria-label="Limpar esta notificação" title="Limpar" onClick={() => limpar([n.id])} className="absolute flex items-center justify-center" style={{ right: 4, bottom: 4, width: 32, height: 32, color: "var(--muted)" }}><Icone nome="x" tamanho={14} /></button>
                </div>
              );
            })}
          </aside>
        </div>
      )}
    </>
  );
}
