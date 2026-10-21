import { Cabecalho } from "@/components/Blocos";
import { Icone, LogoPlataforma } from "@/components/Icone";
import { NOME_REDE, REDES, redeConfigurada } from "@/lib/coleta/redes";
import { usuarioAtual } from "@/lib/dados";

const AJUDA = {
  youtube: "Entre com a conta Google do seu canal. Pode aparecer um aviso de \"app não verificado\": clique em Avançado e em continuar.",
  tiktok: "Entre com a sua conta do TikTok e autorize a leitura dos seus vídeos.",
  instagram: "Sua conta precisa ser profissional (Criador ou Empresa) e o gestor precisa ter te adicionado como testador do app.",
} as const;

function quando(iso: string | null) {
  if (!iso) return "ainda não coletado";
  return `última coleta ${new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}`;
}

export default async function MinhasRedes({ searchParams }: { searchParams: Promise<{ ok?: string; erro?: string }> }) {
  const { sb, perfil } = await usuarioAtual();
  const { ok, erro } = await searchParams;
  const { data: contas } = await sb.from("contas_plataforma").select("plataforma, nome_conta, ultima_coleta, erro").eq("criador_id", perfil.id);
  const por = new Map((contas ?? []).map((c) => [c.plataforma as string, c]));

  return (
    <>
      <Cabecalho icone="zap" titulo="Minhas redes" sub="Conecte suas contas uma vez e o site busca suas views sozinho, todo dia de madrugada." />
      {ok && <div role="status" className="pill-ok" style={{ padding: "10px 14px", fontSize: 14 }}><Icone nome="check" tamanho={16} />{ok}</div>}
      {erro && <div role="alert" className="pill-warn" style={{ padding: "10px 14px", fontSize: 14 }}>{erro}</div>}
      <section className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))" }}>
        {REDES.map((r) => {
          const c = por.get(r);
          const pronta = redeConfigurada(r);
          return (
            <div key={r} className="card flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <LogoPlataforma p={r} tamanho={44} />
                <div className="min-w-0 flex-1">
                  <div style={{ color: "var(--strong)", fontWeight: 600, fontSize: 17 }}>{NOME_REDE[r]}</div>
                  <div className="truncate" style={{ color: "var(--muted)", fontSize: 13 }}>{c ? c.nome_conta : "Não conectado"}</div>
                </div>
                {c && !c.erro && <span className="pill-ok"><Icone nome="check" tamanho={12} />Conectado</span>}
                {c?.erro && <span className="pill-warn">Com problema</span>}
              </div>
              {c && <div style={{ color: c.erro ? "var(--warn)" : "var(--muted)", fontSize: 13 }}>{c.erro ? "A coleta falhou. Conecte de novo; se continuar, avise o gestor." : quando(c.ultima_coleta)}</div>}
              <p style={{ margin: 0, color: "var(--muted)", fontSize: 13 }}>{pronta ? AJUDA[r] : "O gestor ainda está configurando essa rede. Enquanto isso, ele lança as views no painel."}</p>
              {pronta ? (
                <a className={c ? "btn-line" : "btn-gold"} href={`/api/conectar/${r}`}>{c ? "Conectar de novo" : `Conectar ${NOME_REDE[r]}`}</a>
              ) : (
                <span className="pill-tint" style={{ alignSelf: "flex-start" }}>Em configuração</span>
              )}
            </div>
          );
        })}
      </section>
    </>
  );
}
