"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Avatar } from "./Avatar";
import { Icone } from "./Icone";
import { Sino, type Notificacao } from "./Sino";

type Item = { href: string; rotulo: string; icone: string; emBreve?: boolean };
const GRUPOS: { titulo: string; icone: string; itens: Item[]; soGestor?: boolean }[] = [
  {
    titulo: "Principal",
    icone: "dash",
    itens: [
      { href: "/", rotulo: "Dashboard", icone: "dash" },
      { href: "/dias", rotulo: "Dias de postagem", icone: "cal" },
      { href: "/metas", rotulo: "Metas de views", icone: "target" },
      { href: "/gravar", rotulo: "Gravações", icone: "users" },
      { href: "/ranking", rotulo: "Ranking do mês", icone: "trophy" },
    ],
  },
  {
    titulo: "Otimizações",
    icone: "zap",
    itens: [
      { href: "/ideias", rotulo: "Ideias & roteiros", icone: "bulb" },
      { href: "/audio", rotulo: "Limpar narração", icone: "wave" },
      { href: "/avaliar", rotulo: "Avaliar vídeo", icone: "video" },
      { href: "/seo", rotulo: "SEO para vídeos", icone: "hash" },
      { href: "/pomodoro", rotulo: "Pomodoro", icone: "timer" },
    ],
  },
  {
    titulo: "Informações",
    icone: "stats",
    itens: [
      { href: "/pagamentos", rotulo: "Pagamentos", icone: "wallet" },
      { href: "/redes", rotulo: "Minhas redes", icone: "zap" },
    ],
  },
  { titulo: "Em breve", icone: "timer", itens: [{ href: "/coletiva", rotulo: "Meta coletiva", icone: "users", emBreve: true }] },
  { titulo: "Gestão", icone: "gear", soGestor: true, itens: [{ href: "/gestor", rotulo: "Painel do gestor", icone: "gear" }] },
];

/** No pé do menu, acima do botão de modo claro/escuro (pedido do dono). */
const CONFIG: Item = { href: "/configuracoes", rotulo: "Configurações", icone: "ajustes" };

/** Logo abaixo de Notificações. */
const EXTRAS: Item[] = [
  { href: "/novidades", rotulo: "Novidades", icone: "megafone" },
  { href: "/sugestoes", rotulo: "Sugestões", icone: "bulb" },
];

export function MenuLateral({ nome, papel, foto = null, avisos = [], chavePush = null, precisamAjuda = 0, novidades = [] }: { nome: string; papel: "criador" | "gestor"; foto?: string | null; avisos?: Notificacao[]; chavePush?: string | null; precisamAjuda?: number; novidades?: string[] }) {
  const rota = usePathname();
  const [claro, setClaro] = useState(false);
  useEffect(() => {
    const ler = () => setClaro(document.documentElement.getAttribute("data-mode") === "light");
    ler();
    // a aba Configurações também muda o modo
    window.addEventListener("preferencias", ler);
    return () => window.removeEventListener("preferencias", ler);
  }, []);
  function alternarTema() {
    const novo = !claro;
    setClaro(novo);
    if (novo) document.documentElement.setAttribute("data-mode", "light");
    else document.documentElement.removeAttribute("data-mode");
    try {
      localStorage.setItem("onialMode", novo ? "light" : "dark");
    } catch {}
  }
  // número em "Novidades": novidades publicadas depois da última vez que a pessoa abriu a aba (guardado neste aparelho)
  const [vistas, setVistas] = useState<string | null>(null);
  useEffect(() => {
    const ler = () => { try { setVistas(localStorage.getItem("onialNovidadesVistas") ?? ""); } catch { setVistas(""); } };
    ler();
    window.addEventListener("novidades-vistas", ler);
    return () => window.removeEventListener("novidades-vistas", ler);
  }, []);
  const novasNovidades = novidades.filter((d) => vistas !== null && new Date(d).getTime() > (vistas ? Number(vistas) : 0)).length;
  const ativo = (href: string) => (href === "/" ? rota === "/" : rota.startsWith(href));
  // celular: o menu abre pela lateral (botão ☰) e fecha ao trocar de aba, tocar fora ou apertar Esc
  const [aberto, setAberto] = useState(false);
  useEffect(() => setAberto(false), [rota]);
  useEffect(() => {
    if (!aberto) return;
    const f = (e: KeyboardEvent) => e.key === "Escape" && setAberto(false);
    window.addEventListener("keydown", f);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", f); document.body.style.overflow = ""; };
  }, [aberto]);
  const atual = [...EXTRAS, CONFIG, ...GRUPOS.flatMap((g) => g.itens)].find((i) => ativo(i.href));
  // pastas do menu: Principal e a pasta da aba atual ficam abertas; as outras abrem com um clique no título
  const pastaAtual = GRUPOS.find((g) => g.itens.some((i) => ativo(i.href)))?.titulo;
  const inicio = () => [...new Set(["Principal", ...(pastaAtual ? [pastaAtual] : [])])];
  const [abertas, setAbertas] = useState<string[]>(inicio);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setAbertas(inicio()), [pastaAtual]);
  const alternarPasta = (titulo: string) => setAbertas((a) => (a.includes(titulo) ? a.filter((t) => t !== titulo) : [...a, titulo]));

  return (
    <>
    <header className="topo-movel">
      <Link href="/" className="flex items-center gap-2" aria-label="Início">
        <Image src="/logo.png" alt="Logo Onial" width={34} height={34} className="rounded-lg" />
        <span title="Site em desenvolvimento" style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.2, padding: "2px 6px", borderRadius: 4, background: "var(--gold)", color: "#0A0A0A" }}>BETA</span>
      </Link>
      <span className="display truncate" style={{ flex: 1, fontSize: 18, letterSpacing: 0.5, color: "var(--strong)", textAlign: "center" }}>{atual?.rotulo ?? "Onial Creators"}</span>
      <Sino itens={avisos} chavePublica={chavePush} compacto />
      <button type="button" onClick={() => setAberto(true)} aria-label="Abrir menu" aria-expanded={aberto} aria-controls="menu-principal" className="relative flex items-center justify-center" style={{ width: 44, height: 44, borderRadius: 8, border: "1px solid var(--line)", background: "var(--panel)", color: "var(--fg)" }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
        {precisamAjuda > 0 && <span className="bolinha-ajuda" style={{ position: "absolute", top: -4, right: -4 }} aria-label="Alguém precisa de ajuda para gravar" />}
        {novasNovidades > 0 && <span style={{ position: "absolute", top: -4, left: -4, width: 12, height: 12, borderRadius: 6, background: "#FF5C5C", border: "2px solid var(--side)" }} aria-label="Tem novidade nova" />}
      </button>
    </header>
    <div className={`menu-fundo ${aberto ? "menu-fundo-on" : ""}`} onClick={() => setAberto(false)} aria-hidden="true" />
    <aside id="menu-principal" className={`menu ${aberto ? "menu-aberto" : ""}`}>
      <button type="button" className="menu-fechar" onClick={() => setAberto(false)} aria-label="Fechar menu"><Icone nome="x" tamanho={18} /></button>
      <Link href="/" className="flex items-center gap-2.5 px-2">
        <Image src="/logo.png" alt="Logo Onial" width={44} height={44} className="rounded-lg" style={{ boxShadow: "0 0 18px color-mix(in srgb, var(--gold) 35%, transparent)" }} priority />
        <span className="menu-marca flex flex-col items-start" style={{ gap: 3 }}>
          <span className="display" style={{ fontSize: 18, letterSpacing: 1, whiteSpace: "nowrap", lineHeight: 1 }}>ONIAL CREATORS</span>
          <span title="Site em desenvolvimento" style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, padding: "2px 7px", borderRadius: 4, background: "var(--gold)", color: "#0A0A0A", lineHeight: 1.3 }}>BETA</span>
        </span>
      </Link>
      <nav className="menu-atalhos" aria-label="Notificações, novidades e sugestões">
        <div className="menu-sino"><Sino itens={avisos} chavePublica={chavePush} bloco /></div>
        {EXTRAS.map((i) => (
          <Link key={i.href} href={i.href} className={`menu-atalho ${ativo(i.href) ? "menu-atalho-on" : ""}`} aria-current={ativo(i.href) ? "page" : undefined}>
            <Icone nome={i.icone} tamanho={20} />
            <span className="menu-atalho-nome">{i.rotulo}</span>
            {i.href === "/novidades" && novasNovidades > 0 && <span className="num menu-atalho-num" aria-label={`${novasNovidades} ${novasNovidades === 1 ? "novidade nova" : "novidades novas"}`}>{novasNovidades > 9 ? "9+" : novasNovidades}</span>}
          </Link>
        ))}
      </nav>
      <div className="menu-pastas">
      {GRUPOS.filter((g) => !g.soGestor || papel === "gestor").map((g) => {
        const estaAberta = abertas.includes(g.titulo);
        const idLista = `pasta-${g.titulo.toLowerCase().replace(/\s+/g, "-")}`;
        const temAjuda = g.itens.some((i) => i.href === "/gravar") && precisamAjuda > 0;
        return (
        <nav key={g.titulo} className="menu-grupo" aria-label={g.titulo}>
          <button type="button" className={`menu-pasta ${estaAberta ? "menu-pasta-on" : ""}`} onClick={() => alternarPasta(g.titulo)} aria-expanded={estaAberta} aria-controls={idLista}>
            <span className="menu-pasta-icone"><Icone nome={g.icone} tamanho={16} /></span>
            <span className="flex-1 truncate">{g.titulo}</span>
            {!estaAberta && temAjuda && <span className="bolinha-ajuda" aria-label="Alguém precisa de ajuda para gravar" />}
            <span className="menu-pasta-conta" aria-hidden="true">{g.itens.length}</span>
            <svg className={`menu-seta ${estaAberta ? "menu-seta-on" : ""}`} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
          </button>
          <div id={idLista} className="menu-itens" hidden={!estaAberta}>
          {g.itens.map((i) => (
            <Link key={i.href} href={i.href} className={`menu-item ${ativo(i.href) ? "menu-ativo" : ""}`} aria-current={ativo(i.href) ? "page" : undefined}>
              <Icone nome={i.icone} />
              {i.rotulo}
              {i.emBreve && <span className="menu-selo">EM BREVE</span>}
              {i.href === "/gravar" && precisamAjuda > 0 && <span className="bolinha-ajuda" style={{ marginLeft: 2 }} title={`${precisamAjuda} ${precisamAjuda === 1 ? "pedido precisa" : "pedidos precisam"} de ajuda`} aria-label={`${precisamAjuda} ${precisamAjuda === 1 ? "pedido precisa" : "pedidos precisam"} de ajuda`} />}
            </Link>
          ))}
          </div>
        </nav>
        );
      })}
      </div>
      <div className="menu-rodape">
      <Link href={CONFIG.href} className={`menu-tema ${ativo(CONFIG.href) ? "menu-ativo" : ""}`} aria-current={ativo(CONFIG.href) ? "page" : undefined}>
        <Icone nome={CONFIG.icone} tamanho={18} />
        <span>{CONFIG.rotulo}</span>
      </Link>
      <button type="button" onClick={alternarTema} className="menu-tema" aria-label={claro ? "Mudar para modo escuro" : "Mudar para modo claro"}>
        <Icone nome={claro ? "moon" : "sun"} tamanho={18} />
        <span>{claro ? "Modo escuro" : "Modo claro"}</span>
      </button>
      </div>
      <div className="menu-perfil">
        <Avatar foto={foto} nome={nome} tamanho={36} />
        <div className="min-w-0">
          <div className="truncate" style={{ color: "var(--fg)" }}>{nome}</div>
          <div style={{ color: "var(--muted)", fontSize: 12 }}>{papel === "gestor" ? "Gestor" : "Criador de conteúdo"}</div>
          <form action="/auth/sair" method="post">
            <button type="submit" style={{ color: "var(--accent-text)", fontSize: 12, marginTop: 4 }}>Sair</button>
          </form>
        </div>
      </div>
    </aside>
    </>
  );
}
