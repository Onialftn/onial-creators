import { AvaliarVideo } from "@/components/AvaliarVideo";
import { Cabecalho } from "@/components/Blocos";
import type { Avaliacao } from "@/lib/avaliar-regras";
import { usuarioAtual } from "@/lib/dados";
import { geminiConfigurado } from "@/lib/ia/gemini";
import { LIMITE_MES, usadosNoMes } from "@/lib/ia/uso";

export const maxDuration = 300;

export default async function Pagina() {
  const { sb, perfil } = await usuarioAtual();
  const [usados, { data }] = await Promise.all([
    usadosNoMes(perfil.id, "avaliacao"),
    sb.from("avaliacoes").select("id, arquivo, nota, resultado, criado_em").eq("criador_id", perfil.id).order("criado_em", { ascending: false }).limit(20),
  ]);
  return (
    <>
      <Cabecalho icone="video" titulo="Avaliar vídeo" sub="Envie o vídeo antes de postar: a IA assiste e dá notas para gancho, vídeo, som, edição e chamada, com dicas no momento certo." />
      <AvaliarVideo pronta={geminiConfigurado()} usados={usados} limite={perfil.papel === "gestor" ? null : LIMITE_MES.avaliacao}
        historico={(data ?? []).map((a) => ({ id: a.id, arquivo: a.arquivo, nota: a.nota, resultado: a.resultado as Avaliacao, criado_em: a.criado_em }))} />
    </>
  );
}
