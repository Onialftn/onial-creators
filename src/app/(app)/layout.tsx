import { MenuLateral } from "@/components/MenuLateral";
import type { Notificacao } from "@/components/Sino";
import { usuarioAtual } from "@/lib/dados";
import { hojeBrasil } from "@/lib/datas";
import { podeAceitar, type Ajuda, type Pedido } from "@/lib/gravar";

export const dynamic = "force-dynamic";

export default async function LayoutApp({ children }: { children: React.ReactNode }) {
  const { sb, perfil } = await usuarioAtual();
  const [{ data: avisos }, { data: pedidos }] = await Promise.all([
    sb.from("notificacoes").select("id, tipo, titulo, texto, link, lida, criado_em").eq("criador_id", perfil.id).eq("oculta", false).order("criado_em", { ascending: false }).limit(30),
    sb.from("pedidos_ajuda").select("id, criador_id, dia, hora, duracao_min, vagas, mapa, descricao, status").eq("status", "aberto").gte("dia", hojeBrasil()).neq("criador_id", perfil.id),
  ]);
  // bolinha amarela em Gravações: alguém precisa de ajuda e você ainda pode aceitar
  const ids = (pedidos ?? []).map((p) => p.id);
  const { data: ajudas } = ids.length ? await sb.from("ajudas").select("pedido_id, ajudante_id, presente").in("pedido_id", ids) : { data: [] };
  const precisamAjuda = ((pedidos ?? []) as Pedido[]).filter((p) => podeAceitar(p, (ajudas ?? []) as Ajuda[], perfil.id)).length;
  return (
    <div className="app">
      <MenuLateral nome={perfil.nome} papel={perfil.papel} foto={perfil.foto_url} avisos={(avisos ?? []) as Notificacao[]} chavePush={process.env.VAPID_PUBLIC_KEY?.trim() || null} precisamAjuda={precisamAjuda} />
      <main className="conteudo">{children}</main>
    </div>
  );
}
