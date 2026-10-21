import { MenuLateral } from "@/components/MenuLateral";
import { usuarioAtual } from "@/lib/dados";

export const dynamic = "force-dynamic";

export default async function LayoutApp({ children }: { children: React.ReactNode }) {
  const { perfil } = await usuarioAtual();
  return (
    <div className="app">
      <MenuLateral nome={perfil.nome} papel={perfil.papel} />
      <main className="conteudo">{children}</main>
    </div>
  );
}
