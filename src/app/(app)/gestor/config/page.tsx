import { redirect } from "next/navigation";
import webpush from "web-push";
import { Cabecalho, TituloCard } from "@/components/Blocos";
import { Icone, LogoPlataforma, NOME_PLATAFORMA } from "@/components/Icone";
import { REDES, redeConfigurada } from "@/lib/coleta/redes";
import { usuarioAtual } from "@/lib/dados";
import { iaConfigurada } from "@/lib/ia/claude";
import { geminiConfigurado } from "@/lib/ia/gemini";
import { MAPAS } from "@/lib/ia/mapas";
import { LIMITE_MES, inicioDoMes } from "@/lib/ia/uso";
import { pushConfigurado } from "@/lib/notificacoes";
import { adicionarCanal, criarCriador, gerarAvisosAgora, removerCanal } from "../acoes";
import { AbasGestor, Retorno } from "../comum";

export const maxDuration = 300;

function Status({ ok, sim = "Funcionando", nao = "Falta configurar" }: { ok: boolean; sim?: string; nao?: string }) {
  return ok ? <span className="pill-ok"><Icone nome="check" tamanho={12} />{sim}</span> : <span className="pill-warn">{nao}</span>;
}

export default async function ConfigGestor({ searchParams }: { searchParams: Promise<{ ok?: string; erro?: string }> }) {
  const { sb, perfil } = await usuarioAtual();
  if (perfil.papel !== "gestor") redirect("/");
  const { ok, erro } = await searchParams;
  const [{ data: criadores }, { data: usoIa }, { data: refs }] = await Promise.all([
    sb.from("perfis").select("id, nome").eq("papel", "criador").order("nome"),
    sb.from("uso_ia").select("criador_id, tipo, custo_usd").gte("criado_em", inicioDoMes()).limit(5000),
    sb.from("canais_referencia").select("id, mapa, tema, nome, canal_id").order("criado_em"),
  ]);
  const pessoas = [...(criadores ?? []), { id: perfil.id, nome: `${perfil.nome} (gestor)` }];
  const usoDe = (id: string, tipo?: string) => (usoIa ?? []).filter((u) => u.criador_id === id && (!tipo || u.tipo === tipo));
  const dolar = (v: number) => `US$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  // chaves para as notificações no celular: só aparecem enquanto não estiverem na Vercel
  const novasChaves = pushConfigurado() ? null : webpush.generateVAPIDKeys();

  return (
    <>
      <Cabecalho icone="gear" titulo="Painel do gestor" sub="Configurações do site: redes, IA, notificações, canais de referência e criadores." />
      <AbasGestor ativa="config" />
      <Retorno ok={ok} erro={erro} />

      <section className="card flex flex-col gap-3">
        <TituloCard icone="zap">Serviços do site</TituloCard>
        <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))" }}>
          {REDES.map((r) => (
            <div key={r} className="tile flex items-center gap-3"><LogoPlataforma p={r} tamanho={26} /><span className="flex-1">Coleta do {NOME_PLATAFORMA[r]}</span><Status ok={redeConfigurada(r)} /></div>
          ))}
          <div className="tile flex items-center gap-3"><Icone nome="script" /><span className="flex-1">Tradução de roteiro (Claude)</span><Status ok={iaConfigurada()} /></div>
          <div className="tile flex items-center gap-3"><Icone nome="video" /><span className="flex-1">Transcrição automática (Gemini)</span><Status ok={geminiConfigurado()} /></div>
          <div className="tile flex items-center gap-3"><Icone nome="zap" /><span className="flex-1">Notificações no celular</span><Status ok={pushConfigurado()} /></div>
        </div>
        <p style={{ margin: 0, color: "var(--muted)", fontSize: 13 }}>A coleta de views roda sozinha todo dia às 6h. O TikTok segue no modo de teste (Sandbox) até a aprovação.</p>
      </section>

      <section className="card flex flex-col gap-3">
        <TituloCard icone="bell" direita={<form action={gerarAvisosAgora}><button className="btn-line" type="submit" style={{ minHeight: 36 }}>Gerar as notificações de hoje agora</button></form>}>Notificações</TituloCard>
        <p style={{ margin: 0, color: "var(--muted)", fontSize: 13 }}>Todo dia, depois da coleta das 6h: dia de postar com o mapa da semana, dias para repor, faltas, marcos da meta, vídeo bombando (2× a média do criador) e subida no ranking. Rede com problema, mês fechado e pagamento feito avisam na hora.</p>
        {novasChaves && (
          <div className="tile flex flex-col gap-2" style={{ fontSize: 13 }}>
            <b style={{ color: "var(--strong)" }}>Para ligar as notificações no celular, crie estas 2 variáveis na Vercel e faça Redeploy:</b>
            <div><span className="label">VAPID_PUBLIC_KEY</span><code style={{ display: "block", wordBreak: "break-all", userSelect: "all", color: "var(--fg)" }}>{novasChaves.publicKey}</code></div>
            <div><span className="label">VAPID_PRIVATE_KEY (secreta: só na Vercel)</span><code style={{ display: "block", wordBreak: "break-all", userSelect: "all", color: "var(--fg)" }}>{novasChaves.privateKey}</code></div>
            <span style={{ color: "var(--muted)" }}>Use as duas desta mesma tela juntas (elas mudam se você recarregar a página).</span>
          </div>
        )}
      </section>

      <section className="card flex flex-col gap-4">
        <TituloCard icone="bulb" direita={`Gasto no mês: ${dolar((usoIa ?? []).reduce((a, u) => a + Number(u.custo_usd), 0))}`}>Uso da IA no mês</TituloCard>
        <div className="overflow-x-auto">
          <table className="table" style={{ minWidth: 420 }}>
            <thead><tr><th scope="col">PESSOA</th><th scope="col">ROTEIROS TRADUZIDOS</th><th scope="col">GASTO</th></tr></thead>
            <tbody>
              {pessoas.map((pp) => (
                <tr key={pp.id}>
                  <td style={{ color: "var(--strong)", fontWeight: 600 }}>{pp.nome}</td>
                  <td style={{ fontVariantNumeric: "tabular-nums" }}>{usoDe(pp.id, "roteiro").length}{pp.id === perfil.id ? "" : <span style={{ color: "var(--muted)" }}> / {LIMITE_MES.roteiro}</span>}</td>
                  <td style={{ fontVariantNumeric: "tabular-nums" }}>{dolar(usoDe(pp.id).reduce((a, u) => a + Number(u.custo_usd), 0))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ margin: 0, color: "var(--muted)", fontSize: 13 }}>Estimativa do site; o valor cobrado de verdade fica no console da Anthropic. Roteiros já traduzidos por alguém não contam de novo. Os limites zeram todo dia 1º.</p>
      </section>

      <section id="referencias" className="card flex flex-col gap-4">
        <TituloCard icone="bulb">Canais de referência (Ideias de vídeos)</TituloCard>
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))" }}>
          {MAPAS.flatMap((m) => m.temas.map((t) => {
            const lista = (refs ?? []).filter((r) => r.mapa === m.id && r.tema === t);
            return (
              <div key={m.id + t} className="tile flex flex-col gap-2">
                <div style={{ color: "var(--strong)", fontWeight: 600 }}>{m.emoji} {t} <span style={{ color: "var(--muted)", fontWeight: 400, fontSize: 12 }}>· {m.nome.replace("Onial ", "")} · {lista.length} {lista.length === 1 ? "canal" : "canais"}</span></div>
                {lista.map((r) => (
                  <form key={r.id} action={removerCanal} className="flex items-center gap-2" style={{ fontSize: 14 }}>
                    <input type="hidden" name="id" value={r.id} />
                    <a href={String(r.canal_id).startsWith("@") ? `https://www.youtube.com/${r.canal_id}` : `https://www.youtube.com/channel/${r.canal_id}`} target="_blank" rel="noreferrer" className="flex-1 truncate">{r.nome}</a>
                    <button type="submit" aria-label={`Remover ${r.nome}`} style={{ color: "var(--muted)", width: 32, height: 32 }} className="flex items-center justify-center"><Icone nome="x" tamanho={14} /></button>
                  </form>
                ))}
                <form action={adicionarCanal} className="flex gap-2">
                  <input type="hidden" name="mapa" value={m.id} /><input type="hidden" name="tema" value={t} />
                  <input className="input" name="canal" placeholder="youtube.com/@canal" aria-label={`Link do canal para ${t}`} style={{ minHeight: 38 }} required />
                  <button className="btn-line" type="submit" style={{ minHeight: 38 }}>Adicionar</button>
                </form>
              </div>
            );
          }))}
        </div>
      </section>

      <form id="cadastrar" action={criarCriador} className="card flex flex-col gap-3" style={{ maxWidth: 560 }}>
        <TituloCard icone="plus">Cadastrar criador</TituloCard>
        <input className="input" name="nome" placeholder="Nome" aria-label="Nome" />
        <input className="input" name="email" type="email" placeholder="E-mail" aria-label="E-mail" />
        <input className="input" name="senha" type="text" placeholder="Senha inicial (mínimo 8 caracteres)" aria-label="Senha inicial" autoComplete="off" />
        <p style={{ margin: 0, color: "var(--muted)", fontSize: 13 }}>Os dias de postagem começam de segunda a sexta. Envie o e-mail e a senha para o criador. Depois ele conecta as redes em Minhas redes (Instagram precisa ser conta profissional e testador do app; TikTok precisa estar na lista do Sandbox até a aprovação).</p>
        <button className="btn-gold" type="submit">Cadastrar</button>
      </form>
    </>
  );
}
