import { MenuLateral } from "@/components/MenuLateral";
import type { Notificacao } from "@/components/Sino";
import { usuarioAtual } from "@/lib/dados";

export const dynamic = "force-dynamic";

export default async function LayoutApp({ children }: { children: React.ReactNode }) {
  const { sb, perfil } = await usuarioAtual();
  const { data: avisos } = await sb.from("notificacoes").select("id, tipo, titulo, texto, link, lida, criado_em").eq("criador_id", perfil.id).order("criado_em", { ascending: false }).limit(30);
  return (
    <div className="app">
      <MenuLateral nome={perfil.nome} papel={perfil.papel} foto={perfil.foto_url} avisos={(avisos ?? []) as Notificacao[]} chavePush={process.env.VAPID_PUBLIC_KEY?.trim() || null} />
      <main className="conteudo">{children}</main>
    </div>
  );
}
