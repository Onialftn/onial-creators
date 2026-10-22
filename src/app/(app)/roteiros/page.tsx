import { Cabecalho } from "@/components/Blocos";
import { Roteiros, type RoteiroSalvo } from "@/components/Roteiros";
import { usuarioAtual } from "@/lib/dados";
import { iaConfigurada } from "@/lib/ia/claude";
import { LIMITE_MES, usadosNoMes } from "@/lib/ia/uso";

export default async function Pagina() {
  const { sb, perfil } = await usuarioAtual();
  const [{ data: salvos }, usados] = await Promise.all([
    sb.from("roteiros").select("id, titulo, mapa, tema, duracao, original, resultado, criado_em").eq("criador_id", perfil.id).order("criado_em", { ascending: false }).limit(20),
    usadosNoMes(perfil.id, "roteiro"),
  ]);
  return (
    <>
      <Cabecalho icone="script" titulo="Roteiros" sub="Cole o roteiro do vídeo gringo que te inspirou e a IA adapta e melhora para o público brasileiro." />
      <Roteiros salvos={(salvos ?? []) as RoteiroSalvo[]} usados={usados} limite={perfil.papel === "gestor" ? null : LIMITE_MES.roteiro} pronta={iaConfigurada()} />
    </>
  );
}
