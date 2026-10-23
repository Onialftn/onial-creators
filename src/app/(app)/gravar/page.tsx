import { Cabecalho } from "@/components/Blocos";
import { GravarJuntos } from "@/components/GravarJuntos";
import { usuarioAtual } from "@/lib/dados";
import { hojeBrasil, mesDe, primeiroDia, ultimoDia } from "@/lib/datas";
import type { Ajuda, Pedido } from "@/lib/gravar";

export default async function Pagina({ searchParams }: { searchParams: Promise<{ mes?: string; dia?: string }> }) {
  const { sb, perfil } = await usuarioAtual();
  const q = await searchParams;
  const hoje = hojeBrasil();
  const dia = /^\d{4}-\d{2}-\d{2}$/.test(q.dia ?? "") ? q.dia! : null;
  const mes = /^\d{4}-\d{2}$/.test(q.mes ?? "") ? q.mes! : dia ? mesDe(dia) : mesDe(hoje);
  const { data: pedidos } = await sb.from("pedidos_ajuda").select("id, criador_id, dia, hora, duracao_min, vagas, mapa, descricao, status").gte("dia", primeiroDia(mes)).lte("dia", ultimoDia(mes)).order("hora");
  const ids = (pedidos ?? []).map((p) => p.id);
  const [{ data: ajudas }, { data: pessoas }] = await Promise.all([
    ids.length ? sb.from("ajudas").select("pedido_id, ajudante_id, presente").in("pedido_id", ids) : Promise.resolve({ data: [] }),
    sb.from("perfis").select("id, nome, foto_url"),
  ]);
  return (
    <>
      <Cabecalho icone="users" titulo="Gravar juntos" sub="Escolha um dia e peça ajuda da equipe para gravar. Quem ajudar ganha R$ 25 por gravação, depois que você confirmar." />
      <GravarJuntos mes={mes} hoje={hoje} diaInicial={dia} eu={{ id: perfil.id, gestor: perfil.papel === "gestor" }}
        pedidos={(pedidos ?? []) as Pedido[]} ajudas={(ajudas ?? []) as Ajuda[]} pessoas={pessoas ?? []} />
    </>
  );
}
