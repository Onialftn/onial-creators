import { Cabecalho } from "@/components/Blocos";
import { Icone, LogoPlataforma } from "@/components/Icone";
import { NOME_REDE, REDES, redeConfigurada } from "@/lib/coleta/redes";
import { usuarioAtual } from "@/lib/dados";
import { pedirLiberacao } from "@/app/acoes/liberacao";

type Liberacao = { rede: string; usuario: string; liberado: boolean };

function Passo({ n, feito, titulo, children }: { n: number; feito?: boolean; titulo: string; children?: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="num flex flex-none items-center justify-center" style={{ width: 24, height: 24, borderRadius: 12, fontSize: 13, background: feito ? "var(--ok)" : "var(--chip)", color: feito ? "#0A0A0A" : "var(--fg)", border: feito ? "none" : "1px solid var(--line2)" }}>{feito ? "✓" : n}</span>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5" style={{ fontSize: 13, lineHeight: 1.45 }}>
        <b style={{ color: feito ? "var(--muted)" : "var(--strong)", fontSize: 14 }}>{titulo}</b>
        {children}
      </div>
    </li>
  );
}

/** Formulário do @ que vai para o gestor liberar. */
function PedirLiberacao({ rede, lib }: { rede: "instagram" | "tiktok"; lib?: Liberacao }) {
  return (
    <>
      {lib && <span style={{ color: lib.liberado ? "var(--ok)" : "var(--accent-text)" }}>{lib.liberado ? `@${lib.usuario} liberado pelo gestor.` : `@${lib.usuario}: esperando o gestor liberar.`}</span>}
      {!lib?.liberado && (
        <form action={pedirLiberacao} className="flex gap-2">
          <input type="hidden" name="rede" value={rede} />
          <input className="input" name="usuario" defaultValue={lib?.usuario ?? ""} placeholder="@seuusuario" aria-label={`Seu usuário do ${rede === "instagram" ? "Instagram" : "TikTok"}`} style={{ minHeight: 38 }} required />
          <button className="btn-line" type="submit" style={{ minHeight: 38, whiteSpace: "nowrap" }}>{lib ? "Reenviar" : "Pedir liberação"}</button>
        </form>
      )}
    </>
  );
}

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
  const [{ data: contas }, { data: libs }] = await Promise.all([
    sb.from("contas_plataforma").select("plataforma, nome_conta, ultima_coleta, erro").eq("criador_id", perfil.id),
    sb.from("liberacoes").select("rede, usuario, liberado").eq("criador_id", perfil.id),
  ]);
  const lib = (r: string) => (libs ?? []).find((l) => l.rede === r) as Liberacao | undefined;
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
              {c?.erro && <details style={{ color: "var(--muted)", fontSize: 12 }}><summary style={{ cursor: "pointer" }}>Detalhe do erro</summary><code style={{ wordBreak: "break-word" }}>{c.erro}</code></details>}
              {pronta && (r === "instagram" || r === "tiktok") && !(c && !c.erro) ? (
                <ol className="flex flex-col gap-3" style={{ margin: 0, padding: 0, listStyle: "none" }}>
                  {r === "instagram" ? (
                    <>
                      <Passo n={1} titulo="Deixe a conta como profissional">
                        <span style={{ color: "var(--muted)" }}>No Instagram: Configurações → <b>Tipo de conta e ferramentas</b> → <b>Mudar para conta profissional</b> → Criador. É grátis e não muda nada no seu perfil.</span>
                      </Passo>
                      <Passo n={2} feito={lib("instagram")?.liberado} titulo="Peça a liberação ao gestor">
                        <PedirLiberacao rede="instagram" lib={lib("instagram")} />
                      </Passo>
                      <Passo n={3} titulo="Aceite o convite de testador">
                        <span style={{ color: "var(--muted)" }}>Depois que o gestor liberar, abra <a href="https://www.instagram.com/accounts/manage_access/" target="_blank" rel="noreferrer" style={{ color: "var(--accent-text)", textDecoration: "underline" }}>instagram.com/accounts/manage_access</a> (logado na sua conta), vá na aba <b>Convites de testador</b> e toque em <b>Aceitar</b>.</span>
                      </Passo>
                      <Passo n={4} titulo="Conecte aqui embaixo" />
                    </>
                  ) : (
                    <>
                      <Passo n={1} feito={lib("tiktok")?.liberado} titulo="Peça a liberação ao gestor">
                        <PedirLiberacao rede="tiktok" lib={lib("tiktok")} />
                      </Passo>
                      <Passo n={2} titulo="Conecte aqui embaixo">
                        <span style={{ color: "var(--muted)" }}>Entre com a mesma conta do TikTok que você mandou para o gestor e autorize.</span>
                      </Passo>
                    </>
                  )}
                </ol>
              ) : (
                <p style={{ margin: 0, color: "var(--muted)", fontSize: 13 }}>{pronta ? AJUDA[r] : "O gestor ainda está configurando essa rede. Enquanto isso, ele lança as views no painel."}</p>
              )}
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
